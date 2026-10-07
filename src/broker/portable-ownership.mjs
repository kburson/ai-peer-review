// @story #178
import { AprError } from '../errors.mjs';
import { createHash } from 'node:crypto';
import { parseRawJson } from '../api/canonical-json.mjs';
import { portableBrokerPaths } from './portable-paths.mjs';
import { bindOwnerElectionPaths, inspectOwnerElectionPaths } from './ownership-election.mjs';
import { observeProtectedCredential } from './storage-protection.mjs';
import { observeLoopbackOwner, isVerifiedOwnerConnection } from './owner-connection.mjs';
import { observeOriginalProcess, reconcileOriginalProcess } from '../protocol/process-identity.mjs';
import { isInstalledProcessSourceAssurance } from '../protocol/process-source-assurance.mjs';
import { assertLifecycleBoundary } from './owner-lifecycle-core.mjs';
import {
  createJoinedBrokerClientCore,
  assessOwnerEvidenceCore,
} from './portable-ownership-core.mjs';
const observations = new WeakMap();
const bindings = new WeakMap();
const obligationFields = new Set([
  'name',
  'root',
  'identity',
  'fileVersion',
  'rootIdentity',
  'parentIdentity',
  'alternateName',
  'outcome',
  'reason',
  'resourceKey',
  'contenderId',
  'version',
  'originalLocator',
  'quarantineLocator',
  'status',
]);
function metadata(value) {
  const result = {};
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return { outcome: 'obligation-unavailable' };
  for (const key of obligationFields) {
    const item = value[key];
    if (typeof item === 'string' && item.length <= 4096) result[key] = item;
    else if (typeof item === 'number' && Number.isSafeInteger(item)) result[key] = item;
  }
  return Object.keys(result).length ? result : { outcome: 'obligation-unavailable' };
}
export function boundedOwnershipError(reason = 'ownership-unproved', evidence = {}) {
  const all = [
    ...(Array.isArray(evidence.outstandingObligations) ? evidence.outstandingObligations : []),
    ...(Array.isArray(evidence.obligations) ? evidence.obligations : []),
  ];
  const outstandingObligations = all.slice(0, 64).map(metadata);
  if (all.length > 64)
    outstandingObligations.push({
      outcome: 'additional-obligations-retained',
      version: all.length - 64,
    });
  return new AprError('APR_BROKER_STALE', 'Portable ownership could not be proved.', {
    recovery:
      'Preserve exact protected generations and reconcile outstanding obligations before retrying.',
    details: {
      reason:
        typeof reason === 'string' && /^[a-z][a-z0-9-]{0,95}$/u.test(reason)
          ? reason
          : 'ownership-unproved',
      mutationOccurred: evidence.mutationOccurred === true,
      retrySafe: false,
      outstandingObligations,
    },
  });
}
export function isAuthenticatedOwnerObservation(value) {
  return observations.has(value);
}
export async function joinVerifiedBroker({ binding, signal, deadline } = {}) {
  const record = bindings.get(binding);
  if (
    !record ||
    !(signal instanceof AbortSignal) ||
    signal.aborted ||
    !Number.isFinite(deadline) ||
    deadline <= performance.now() ||
    deadline - performance.now() > 30000
  )
    throw boundedOwnershipError('genuine-owner-binding-required');
  // Only the actual observer's private record can provide these producer operations.
  await record.reread({ signal, deadline });
  return record.connect({ signal, deadline });
}

function ownerBudget(input) {
  if (
    !(input?.signal instanceof AbortSignal) ||
    input.signal.aborted ||
    !Number.isFinite(input.deadline) ||
    input.deadline <= performance.now() ||
    input.deadline - performance.now() > 30000
  )
    throw boundedOwnershipError('operation-budget-unproved');
  return Object.freeze({ signal: input.signal, deadline: input.deadline });
}
const unknownOwner = (reason, evidence = {}) =>
  Object.freeze({
    status: 'unknown',
    reason,
    outstandingObligations: boundedOwnershipError(reason, evidence).details.outstandingObligations,
  });
async function readOwnerState(view) {
  const read = async (guard, name) => {
    try {
      return await guard.readSnapshot(name);
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  };
  const owner = await read(view.privateGuard, 'owner.json');
  const credential = await read(view.privateGuard, 'credential');
  const endpoint = await read(view.runtimeGuard, 'endpoint.json');
  return { owner, credential, endpoint };
}
function sameOwnerState(a, b) {
  return ['owner', 'credential', 'endpoint'].every((key) => {
    if (!a[key] || !b[key]) return a[key] === b[key];
    return (
      ['name', 'identity', 'fileVersion', 'rootIdentity'].every(
        (field) => a[key][field] === b[key][field]
      ) && a[key].bytes.equals(b[key].bytes)
    );
  });
}
export async function observeAuthenticatedOwner(input = {}) {
  let credential, connection;
  try {
    const context = ownerBudget(input);
    const view = await inspectOwnerElectionPaths({ paths: input.paths, ...context });
    const state = await readOwnerState(view);
    if (!state.owner || !state.credential || !state.endpoint)
      return unknownOwner('owner-state-incomplete');
    const owner = parseRawJson(new TextDecoder('utf-8', { fatal: true }).decode(state.owner.bytes));
    const endpoint = parseRawJson(
      new TextDecoder('utf-8', { fatal: true }).decode(state.endpoint.bytes)
    );
    const exact = (value, keys) =>
      value && Object.keys(value).sort().join(',') === keys.slice().sort().join(',');
    if (
      !exact(owner, ['schema', 'instanceId', 'worktree', 'identity', 'versions']) ||
      owner.schema !== 'ai-peer-review.portable-owner/v1' ||
      !/^[a-f0-9]{64}$/u.test(owner.instanceId) ||
      !/^[a-f0-9]{64}$/u.test(owner.worktree) ||
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
      endpoint.schema !== 'ai-peer-review.portable-endpoint/v1'
    )
      return unknownOwner('owner-state-format-unproved');
    const ownerVersion = createHash('sha256').update(state.owner.bytes).digest('hex');
    if (
      endpoint.instanceId !== owner.instanceId ||
      endpoint.worktree !== owner.worktree ||
      endpoint.ownerVersion !== ownerVersion ||
      endpoint.host !== '127.0.0.1' ||
      !Number.isInteger(endpoint.port) ||
      endpoint.port < 1 ||
      endpoint.port > 65535
    )
      return unknownOwner('owner-binding-unproved');
    const processObservation = await observeOriginalProcess({
      pid: owner.identity?.pid,
      ...context,
    });
    if (!isInstalledProcessSourceAssurance(processObservation.assurance))
      return unknownOwner('source-class-unavailable');
    const process = await reconcileOriginalProcess({
      original: owner.identity,
      observation: processObservation,
    });
    credential = await observeProtectedCredential({ guard: view.privateGuard, ...context });
    const expected = Object.freeze({
      instanceId: owner.instanceId,
      worktree: owner.worktree,
      ownerVersion,
    });
    const proof = await observeLoopbackOwner({
      endpoint: { host: endpoint.host, port: endpoint.port },
      privateBinding: credential,
      expected,
      ...context,
    });
    const decision = assessOwnerEvidenceCore({ process, endpoint: proof });
    if (decision.status === 'dead') {
      if (!sameOwnerState(state, await readOwnerState(view)))
        throw boundedOwnershipError('owner-generation-changed');
      const observed = Object.freeze({
        status: 'dead',
        scope: 'original-process-only',
        identity: owner.identity,
        outstandingObligations: Object.freeze([]),
      });
      observations.set(observed, { paths: input.paths, state, process, context });
      return observed;
    }
    if (decision.status !== 'authenticated-live') return unknownOwner(decision.reason);
    if (proof.kind !== 'verified-live' || !isVerifiedOwnerConnection(proof.connection))
      return unknownOwner('owner-authentication-unproved');
    connection = proof.connection;
    if (!sameOwnerState(state, await readOwnerState(view)))
      throw boundedOwnershipError('owner-generation-changed');
    const binding = Object.freeze({});
    const heldConnection = connection;
    const client = createJoinedBrokerClientCore({
      connection,
      credential,
      context,
      handshake: { instance_id: owner.instanceId, versions: owner.versions },
    });
    const record = {
      async reread(next) {
        await inspectOwnerElectionPaths({ paths: input.paths, ...next });
        if (!sameOwnerState(state, await readOwnerState(view)))
          throw boundedOwnershipError('owner-generation-changed');
        const current = await observeOriginalProcess({ pid: owner.identity.pid, ...next });
        if (
          (await reconcileOriginalProcess({ original: owner.identity, observation: current }))
            .status !== 'live'
        )
          throw boundedOwnershipError('original-process-unproved');
      },
      async connect(next) {
        if (
          next.signal !== context.signal ||
          next.deadline !== context.deadline ||
          !isVerifiedOwnerConnection(heldConnection)
        )
          throw boundedOwnershipError('proved-socket-lost');
        return Object.freeze({
          ...client,
          verified: true,
          async close(options) {
            const result = await client.close(options);
            bindings.delete(binding);
            return result;
          },
        });
      },
    };
    bindings.set(binding, record);
    const observed = Object.freeze({
      status: 'authenticated-live',
      owner: Object.freeze({ binding }),
      outstandingObligations: Object.freeze([]),
    });
    observations.set(observed, { paths: input.paths, state, process, binding });
    credential = null;
    connection = null; // The privately bound client now owns their cleanup.
    return observed;
  } catch (error) {
    return unknownOwner(
      error?.details?.reason || 'owner-observation-unproved',
      error?.details || {}
    );
  } finally {
    if (connection) await connection.close(input).catch(() => {});
    if (credential) await credential.close(input).catch(() => {});
  }
}
export async function acquirePortableOwner(input = {}) {
  let bound;
  try {
    assertLifecycleBoundary();
    const context = ownerBudget(input);
    if (
      !input ||
      Object.keys(input).sort().join(',') !== 'deadline,paths,protection,reconcile,signal,worktree'
    )
      throw boundedOwnershipError('owner-options-invalid');
    const canonical = await portableBrokerPaths({ worktree: input.worktree });
    if (
      !input.paths ||
      ['worktree', 'privateRoot', 'runtimeRoot', 'endpoint', 'credential'].some(
        (key) => input.paths[key] !== canonical[key]
      )
    )
      throw boundedOwnershipError('owner-paths-unproved');
    bound = await bindOwnerElectionPaths({
      receipt: input.protection?.private,
      effectReceipts: [input.protection?.runtime],
      resource: { kind: 'broker-owner' },
      ...context,
    });
    await inspectOwnerElectionPaths({ paths: bound, ...context });
    const identity = await observeOriginalProcess(context);
    if (identity.status !== 'live' || !isInstalledProcessSourceAssurance(identity.assurance))
      throw boundedOwnershipError('source-class-unavailable');
    // Portable guarded consumer recovery is a later producer. Caller callbacks
    // and absence of cached records are never its provenance or discharge proof.
    throw boundedOwnershipError('guarded-reconciliation-unavailable');
  } catch (error) {
    throw boundedOwnershipError(
      error?.details?.reason || 'owner-acquisition-unproved',
      error?.details || {}
    );
  } finally {
    if (bound) await bound.close();
  }
}
