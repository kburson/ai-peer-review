// @story #178
import { createHash } from 'node:crypto';
import { encodeRequestCanonical, parseRawJson } from '../api/canonical-json.mjs';
import { AsyncLocalStorage } from 'node:async_hooks';
import { performance } from 'node:perf_hooks';
import { boundedOwnershipError } from './portable-ownership.mjs';
const transaction = new AsyncLocalStorage();

// Explicit protocol core only. Injected ports and resulting owners remain unverified.
export async function acquirePortableOwnerCore({ ports, budget } = {}) {
  if (transaction.getStore()) throw boundedOwnershipError('nested-owner-transaction');
  const original = Object.freeze({ signal: budget?.signal, deadline: budget?.deadline });
  const now = typeof budget?.clock === 'function' ? budget.clock : () => performance.now();
  function check(context = original) {
    const current = now();
    if (
      !(context.signal instanceof AbortSignal) ||
      !Number.isFinite(context.deadline) ||
      !Number.isFinite(current) ||
      context.deadline - current > 30000
    )
      throw boundedOwnershipError('operation-budget-unproved');
    if (context.signal.aborted || current >= context.deadline)
      throw boundedOwnershipError(
        context.signal.aborted ? 'operation-aborted' : 'operation-deadline'
      );
  }
  check();
  if (
    !ports ||
    ![
      'elect',
      'readState',
      'observeProcess',
      'observeEndpoint',
      'reconcile',
      'quarantine',
      'create',
      'ready',
      'publishEndpoint',
      'lifecycle',
    ].every((key) => typeof ports[key] === 'function')
  )
    throw boundedOwnershipError('transaction-ports-unproved');
  let lease,
    joinedClient,
    candidate,
    lifecycle,
    quarantined = [],
    phase = 'idle',
    fenced = false,
    retired = false;
  const obligations = () => {
    try {
      return [
        ...quarantined.map((item) => ({ ...item, outcome: 'quarantined-generation-retained' })),
        ...(ports.outstandingObligations?.() || []),
        ...(lease?.retainedGeneration?.() ? [lease.retainedGeneration()] : []),
      ];
    } catch {
      return [{ outcome: 'retained-obligations-unavailable' }];
    }
  };
  const report = (error) =>
    boundedOwnershipError(error?.details?.reason || 'owner-effect-unproved', {
      mutationOccurred: !!lease || !!candidate || error?.details?.mutationOccurred === true,
      outstandingObligations: [
        ...(error?.details?.outstandingObligations || error?.details?.obligations || []),
        ...obligations(),
      ],
    });
  const checked = async (context, effect) => {
    check(context);
    const result = await effect();
    check(context);
    return result;
  };
  const operate = async (name, context, effect) => {
    if (transaction.getStore())
      throw boundedOwnershipError('nested-owner-transaction', {
        outstandingObligations: obligations(),
      });
    if (phase !== 'idle' || fenced || retired)
      throw boundedOwnershipError(
        phase !== 'idle' ? 'owner-transaction-busy' : retired ? 'owner-retired' : 'owner-fenced',
        { outstandingObligations: obligations() }
      );
    phase = name; // Reserve before the first await, including failed admission.
    try {
      return await transaction.run({ context }, async () => {
        check(context);
        return await effect(context);
      });
    } catch (error) {
      fenced = true;
      throw report(error);
    } finally {
      phase = 'idle';
    }
  };
  await operate('acquire', original, async (context) => {
    const elected = await checked(context, () => ports.elect(context));
    if (elected?.kind === 'owner-live') {
      if (
        elected.withdrawal?.status !== 'withdrawn' ||
        elected.withdrawal.obligations?.length ||
        elected.obligations?.length ||
        !elected.owner ||
        typeof ports.join !== 'function'
      )
        throw boundedOwnershipError('owner-live-withdrawal-unproved', elected);
      joinedClient = await checked(context, () => ports.join(elected.owner, context));
      if (!joinedClient || joinedClient.verified !== false)
        throw boundedOwnershipError('unverified-client-required');
      return;
    }
    if (elected?.kind !== 'won' || !elected.lease)
      throw boundedOwnershipError(elected?.reason || 'owner-election-unproved', elected || {});
    lease = elected.lease;
    await checked(context, () => lease.assert(context));
    const state = await checked(context, () => ports.readState(context));
    const empty = (value) =>
      value && ['owner', 'endpoint', 'credential'].every((key) => value[key] === null);
    const same = (left, right) => {
      if (!left || !right) return left === right;
      return (
        ['name', 'root', 'identity', 'fileVersion', 'rootIdentity', 'parentIdentity'].every(
          (key) => left[key] === right[key]
        ) &&
        Buffer.isBuffer(left.bytes) &&
        Buffer.isBuffer(right.bytes) &&
        left.bytes.equals(right.bytes)
      );
    };
    const unchanged = (left, right) =>
      right &&
      ['owner', 'credential', 'endpoint'].every(
        (key) =>
          Object.hasOwn(left, key) && Object.hasOwn(right, key) && same(left[key], right[key])
      );
    if (!state || !['owner', 'credential', 'endpoint'].every((key) => Object.hasOwn(state, key)))
      throw boundedOwnershipError('owner-state-unproved');
    let processObservation = null,
      endpointObservation = null;
    if (state.owner) {
      processObservation = await checked(context, () => ports.observeProcess(state, context));
      endpointObservation = await checked(context, () => ports.observeEndpoint(state, context));
      if (
        ['core-live', 'verified-live', 'authenticated-live'].includes(endpointObservation?.kind) ||
        endpointObservation?.status === 'authenticated-live'
      )
        throw boundedOwnershipError('conflicting-owner-evidence');
      if (
        processObservation?.status !== 'dead' ||
        processObservation.scope !== 'original-process-only' ||
        !state.original ||
        processObservation.host !== state.original.host ||
        processObservation.pid !== state.original.pid
      )
        throw boundedOwnershipError('original-process-death-unproved');
      if (endpointObservation?.kind !== 'absent')
        throw boundedOwnershipError('endpoint-evidence-unproved');
    } else if (!empty(state)) throw boundedOwnershipError('orphan-owner-state');
    const reconciled = await checked(context, () =>
      ports.reconcile({ state, processObservation, endpointObservation, context })
    );
    if (
      reconciled?.status !== 'clear' ||
      !Array.isArray(reconciled.outstandingObligations) ||
      reconciled.outstandingObligations.length
    )
      throw boundedOwnershipError('owner-reconciliation-unproved', reconciled || {});
    const reread = await checked(context, () => ports.readState(context));
    if (!unchanged(state, reread)) throw boundedOwnershipError('owner-generation-changed');
    if (state.owner) {
      const receipt = await checked(context, () => ports.quarantine(state, context));
      quarantined = Array.isArray(receipt?.receipts) ? receipt.receipts : [];
      const expected = [state.owner, state.credential, state.endpoint].filter(Boolean);
      if (
        receipt?.status !== 'quarantined' ||
        quarantined.length !== expected.length ||
        !expected.every((item) => {
          const matches = quarantined.filter(
            (x) =>
              x.name === item.name &&
              x.originalLocator === item.location &&
              x.identity === item.identity &&
              Buffer.isBuffer(x.bytes) &&
              x.bytes.equals(item.bytes) &&
              typeof x.quarantineLocator === 'string' &&
              x.quarantineLocator !== item.location
          );
          return matches.length === 1;
        })
      )
        throw boundedOwnershipError('owner-quarantine-unproved', { obligations: quarantined });
      const after = await checked(context, () => ports.readState(context));
      if (!empty(after))
        throw boundedOwnershipError('owner-generation-changed', { obligations: quarantined });
    }
    candidate = await checked(context, () => ports.create(context, lease));
    if (!candidate) throw boundedOwnershipError('owner-creation-unproved');
  });
  if (joinedClient) return Object.freeze({ ...joinedClient, verified: false });
  return Object.freeze({
    verified: false,
    publish: () =>
      operate('publish', original, async (context) => {
        if (lifecycle) throw boundedOwnershipError('startup-already-completed');
        const ready = await checked(context, () => ports.ready(candidate, context));
        if (!ready) throw boundedOwnershipError('owner-readiness-unproved');
        await checked(context, () => ports.publishEndpoint(candidate, ready, context));
        lifecycle = await checked(context, () => ports.lifecycle(candidate, context));
        if (!lifecycle || lifecycle.verified !== false)
          throw boundedOwnershipError('protocol-lifecycle-required');
        await checked(context, () => lifecycle.publish());
      }),
    verify: (context = original) =>
      operate('verify', context, async (admitted) => {
        if (!lifecycle) throw boundedOwnershipError('startup-incomplete');
        return checked(admitted, () => lifecycle.verify(admitted));
      }),
    release: (context = original) =>
      operate('release', context, async (admitted) => {
        if (!lifecycle) throw boundedOwnershipError('startup-incomplete');
        const result = await checked(admitted, () => lifecycle.release(admitted));
        if (result?.released !== true || result.outstandingObligations?.length)
          throw boundedOwnershipError('owner-release-unproved', result || {});
        retired = true;
        return result;
      }),
  });
}

export function createJoinedBrokerClientCore({ connection, credential, context, handshake } = {}) {
  if (
    !connection ||
    !credential ||
    typeof connection.request !== 'function' ||
    typeof connection.close !== 'function' ||
    typeof credential.verify !== 'function' ||
    typeof credential.close !== 'function'
  )
    throw boundedOwnershipError('joined-client-resources-unproved');
  const original = Object.freeze({ signal: context?.signal, deadline: context?.deadline });
  let phase = 'idle',
    retired = false,
    fenced = false;
  const check = (input, expiry = true) => {
    if (
      !(input?.signal instanceof AbortSignal) ||
      input.signal !== original.signal ||
      input.deadline !== original.deadline ||
      !Number.isFinite(input.deadline)
    )
      throw boundedOwnershipError('joined-client-budget-mismatch');
    if (expiry && (input.signal.aborted || performance.now() >= input.deadline))
      throw boundedOwnershipError('operation-deadline');
  };
  check(original);
  const admit = (input) => {
    check(input);
    if (retired || fenced || phase !== 'idle')
      throw boundedOwnershipError(
        retired ? 'joined-client-closed' : fenced ? 'joined-client-fenced' : 'joined-client-busy'
      );
    phase = 'request';
  };
  return Object.freeze({
    verified: false,
    handshake: Object.freeze({
      instance_id: handshake?.instance_id,
      versions: Object.freeze({ ...handshake?.versions }),
    }),
    async request(input) {
      admit(input);
      try {
        if ((await credential.verify(original)) !== true)
          throw boundedOwnershipError('credential-observation-unproved');
        return await connection.request(input);
      } catch (error) {
        fenced = true;
        throw boundedOwnershipError(
          error?.details?.reason || 'joined-client-unproved',
          error?.details || {}
        );
      } finally {
        phase = 'idle';
      }
    },
    async *wait(input) {
      admit(input);
      try {
        if ((await credential.verify(original)) !== true)
          throw boundedOwnershipError('credential-observation-unproved');
        yield* connection.wait(input);
      } catch (error) {
        fenced = true;
        throw boundedOwnershipError(
          error?.details?.reason || 'joined-client-unproved',
          error?.details || {}
        );
      } finally {
        phase = 'idle';
      }
    },
    async close(input) {
      check(input, false);
      if (phase !== 'idle') throw boundedOwnershipError('joined-client-busy');
      if (retired)
        return Object.freeze({ closed: true, outstandingObligations: Object.freeze([]) });
      phase = 'close';
      try {
        try {
          await closeOwnerObservationCore({ connection, credential, context: original });
        } catch (error) {
          fenced = true;
          throw boundedOwnershipError('joined-client-close-unproved', error.details || {});
        }
        retired = true;
        return Object.freeze({ closed: true, outstandingObligations: Object.freeze([]) });
      } finally {
        phase = 'idle';
      }
    },
  });
}

export function assessOwnerEvidenceCore({ process, endpoint } = {}) {
  const live = ['verified-live', 'core-live'].includes(endpoint?.kind);
  if (process?.status === 'dead' && live)
    return Object.freeze({
      status: 'unknown',
      reason: 'conflicting-owner-evidence',
      verified: false,
    });
  if (
    process?.status === 'dead' &&
    process.scope === 'original-process-only' &&
    endpoint?.kind === 'absent'
  )
    return Object.freeze({ status: 'dead', reason: 'original-process-only', verified: false });
  if (process?.status === 'live' && live)
    return Object.freeze({
      status: 'authenticated-live',
      reason: 'nonce-bound-owner',
      verified: false,
    });
  return Object.freeze({
    status: 'unknown',
    reason:
      process?.status === 'unknown' ? 'original-process-unproved' : 'owner-authentication-unproved',
    verified: false,
  });
}

export async function closeOwnerObservationCore({ connection, credential, context } = {}) {
  const resources = [
    ['proved-socket', connection],
    ['credential-read-descriptor', credential],
  ].filter(([, resource]) => resource);
  const results = await Promise.allSettled(
    resources.map(([, resource]) => Promise.resolve().then(() => resource.close(context)))
  );
  const outstandingObligations = results.flatMap((result, index) => {
    if (result.status === 'fulfilled') return [];
    const [name, resource] = resources[index];
    return [
      ...(result.reason?.details?.outstandingObligations ||
        result.reason?.details?.obligations ||
        []),
      resource.retainedGeneration?.() || { name, outcome: 'descriptor-close-pending' },
    ];
  });
  if (outstandingObligations.length)
    throw boundedOwnershipError('owner-observation-close-unproved', { outstandingObligations });
  return Object.freeze({
    closed: true,
    verified: false,
    outstandingObligations: Object.freeze([]),
  });
}

export function inspectOwnerRecordsCore({ state, worktree, versions } = {}) {
  const exact = (value, keys) =>
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join(',') === keys.slice().sort().join(',');
  const hex = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
  const decode = (bytes) => {
    if (!Buffer.isBuffer(bytes) || bytes.length > 8192)
      throw boundedOwnershipError('owner-state-format-unproved');
    try {
      return parseRawJson(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    } catch {
      throw boundedOwnershipError('owner-state-format-unproved');
    }
  };
  const owner = decode(state?.owner?.bytes),
    endpoint = decode(state?.endpoint?.bytes);
  const identity = owner?.identity,
    ownedVersions = owner?.versions;
  const hasCreation = identity && Object.hasOwn(identity, 'creation');
  const interval = identity?.creation,
    seal = identity?.creationSource;
  const validCreation =
    !hasCreation ||
    (exact(interval, ['unit', 'lower', 'upper']) &&
      typeof interval.unit === 'string' &&
      /^(utc-nanoseconds|linux-ticks:[a-f0-9-]{36})$/u.test(interval.unit) &&
      typeof interval.lower === 'string' &&
      typeof interval.upper === 'string' &&
      /^-?\d{1,30}$/u.test(interval.lower) &&
      /^-?\d{1,30}$/u.test(interval.upper) &&
      BigInt(interval.upper) > BigInt(interval.lower) &&
      exact(seal, ['classId', 'contractDigest', 'approvalDigest', 'precision']) &&
      typeof seal.classId === 'string' &&
      /^[a-z0-9][a-z0-9-]{0,95}$/u.test(seal.classId) &&
      typeof seal.contractDigest === 'string' &&
      /^sha256:[a-f0-9]{64}$/u.test(seal.contractDigest) &&
      typeof seal.approvalDigest === 'string' &&
      /^sha256:[a-f0-9]{64}$/u.test(seal.approvalDigest) &&
      ['one-tick', 'one-second', 'one-hundred-nanoseconds'].includes(seal.precision));
  if (
    !exact(owner, ['schema', 'instanceId', 'worktree', 'identity', 'versions']) ||
    owner.schema !== 'ai-peer-review.portable-owner/v1' ||
    !hex(owner.instanceId) ||
    !hex(worktree) ||
    owner.worktree !== worktree ||
    !exact(identity, ['host', 'pid', ...(hasCreation ? ['creation', 'creationSource'] : [])]) ||
    typeof identity.host !== 'string' ||
    !identity.host ||
    identity.host.length > 256 ||
    !Number.isSafeInteger(identity.pid) ||
    identity.pid < 1 ||
    !validCreation ||
    !exact(ownedVersions, ['package_version', 'broker_protocol_version', 'node_major']) ||
    !exact(versions, ['package_version', 'broker_protocol_version', 'node_major']) ||
    typeof ownedVersions.package_version !== 'string' ||
    !ownedVersions.package_version ||
    ownedVersions.broker_protocol_version !== 1 ||
    !Number.isSafeInteger(ownedVersions.node_major) ||
    ownedVersions.node_major < 24 ||
    !encodeRequestCanonical(ownedVersions).equals(encodeRequestCanonical(versions)) ||
    !Buffer.isBuffer(state?.credential?.bytes) ||
    state.credential.bytes.length !== 32 ||
    !exact(endpoint, [
      'schema',
      'instanceId',
      'worktree',
      'ownerVersion',
      'host',
      'port',
      'digest',
      'heartbeat',
      'versions',
    ]) ||
    endpoint.schema !== 'ai-peer-review.portable-endpoint/v1' ||
    !Number.isFinite(endpoint.heartbeat) ||
    endpoint.heartbeat < 0 ||
    endpoint.host !== '127.0.0.1' ||
    !Number.isInteger(endpoint.port) ||
    endpoint.port < 1 ||
    endpoint.port > 65535
  )
    throw boundedOwnershipError('owner-state-format-unproved');
  const ownerVersion = createHash('sha256').update(state.owner.bytes).digest('hex');
  const subject = {
    instanceId: owner.instanceId,
    worktree,
    ownerVersion,
    host: endpoint.host,
    port: endpoint.port,
    versions: ownedVersions,
  };
  if (
    endpoint.instanceId !== owner.instanceId ||
    endpoint.worktree !== worktree ||
    endpoint.ownerVersion !== ownerVersion ||
    !exact(endpoint.versions, ['package_version', 'broker_protocol_version', 'node_major']) ||
    !encodeRequestCanonical(endpoint.versions).equals(encodeRequestCanonical(ownedVersions)) ||
    endpoint.digest !== createHash('sha256').update(encodeRequestCanonical(subject)).digest('hex')
  )
    throw boundedOwnershipError('owner-binding-unproved');
  return Object.freeze({ verified: false, owner, endpoint, ownerVersion });
}
