// @story #168
// @story #175
import { createHash, randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import path from 'node:path';
import { setTimeout as waitFor } from 'node:timers/promises';
import { openProtectedRoot } from './storage-protection.mjs';
import { assertDistinctProtectedRoots } from './portable-paths.mjs';
import { encodeRequestCanonical, parseRawJson } from '../api/canonical-json.mjs';
import { observeOriginalProcess, reconcileOriginalProcess } from '../protocol/process-identity.mjs';
import {
  isInstalledProcessSourceAssurance,
  revalidateInstalledProcessSourceAssurance,
} from '../protocol/process-source-assurance.mjs';
import { sameProcessOwnerFacts } from './owner-lifecycle-core.mjs';
import { portableOwnerOperation, portableOwnerRootOperation } from './portable-owner-lifecycle.mjs';
import { AprError } from '../errors.mjs';

const pathBindings = new WeakMap();
const productionLeases = new WeakMap();
const coreProductionLeases = new WeakMap();
const heldContext = new AsyncLocalStorage();
const recordSchema = 'ai-peer-review.election-slot/v1';
function stale(reason) {
  return new AprError('APR_BROKER_STALE', 'Resource election could not be established.', {
    recovery:
      'Preserve unresolved slots and obligations; inspect actual protection and process-source support before retrying.',
    details: { reason },
  });
}
function unavailable(reason, extra = {}) {
  return Object.freeze({
    kind: 'indeterminate',
    verified: false,
    reason,
    obligations: [],
    ...extra,
  });
}
function sameSnapshot(a, b) {
  return a && b && a.version === b.version && JSON.stringify(a.record) === JSON.stringify(b.record);
}
function validIdentity(value) {
  return (
    value &&
    typeof value.host === 'string' &&
    value.host.length > 0 &&
    value.host.length <= 256 &&
    Number.isSafeInteger(value.pid) &&
    value.pid > 0
  );
}
function validRecord(snapshot, resourceKey) {
  const r = snapshot?.record;
  return (
    r &&
    Object.keys(r).sort().join(',') === 'choosing,contenderId,identity,resourceKey,schema,ticket' &&
    r.schema === recordSchema &&
    r.resourceKey === resourceKey &&
    r.contenderId === snapshot.id &&
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/u.test(r.contenderId) &&
    validIdentity(r.identity) &&
    typeof r.choosing === 'boolean' &&
    (r.choosing
      ? r.ticket === null
      : typeof r.ticket === 'string' && /^[1-9]\d{0,29}$/u.test(r.ticket))
  );
}
function coreBudget({ signal, deadline, clock = performance }) {
  const now = typeof clock === 'function' ? clock : () => clock.now();
  const budget = Object.freeze({ signal, deadline, clock });
  const check = () => {
    const value = now();
    if (signal?.aborted) throw stale('operation-aborted');
    if (!Number.isFinite(value) || !Number.isFinite(deadline))
      throw stale('operation-budget-unproved');
    if (value >= deadline) throw stale('operation-deadline');
    return deadline - value;
  };
  return { budget, check };
}
function exactDeath(observed, original) {
  return (
    observed?.status === 'dead' &&
    observed.scope === 'original-process-only' &&
    observed.host === original.host &&
    observed.pid === original.pid
  );
}

// Explicit test/protocol core. Its lease and owner-live records are unverified;
// they are never added to the operational lease registry.
export async function acquireOwnerElectionCore({
  store,
  resourceKey,
  contenderId,
  contenderIdentity,
  observeProcessIdentity,
  observeOwner = async () => null,
  signal,
  deadline,
  clock = performance,
  platform = process.platform,
  wait = async (ms, budget) => waitFor(ms, undefined, { signal: budget.signal }),
  onTransition = async () => {},
} = {}) {
  if (
    !store ||
    typeof resourceKey !== 'string' ||
    !resourceKey ||
    !validIdentity(contenderIdentity) ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/u.test(contenderId)
  )
    return unavailable('election-input-invalid');
  const context = heldContext.getStore();
  if (context?.resourceKey === resourceKey) return unavailable('nested-resource-acquisition');
  const initial = coreBudget({ signal, deadline, clock });
  let budget = initial.budget;
  let heldLease;
  const check = () => {
    const genuine = heldLease && coreProductionLeases.get(heldLease);
    const admitted = genuine && portableOwnerOperation(genuine);
    budget = admitted || initial.budget;
    return admitted ? coreBudget({ ...admitted, clock }).check() : initial.check();
  };
  let own = null,
    winning = false,
    creationAttempted = false;
  const transition = async (name) => {
    check();
    await onTransition(name, budget);
    check();
  };
  const sharing = async (operation) => {
    const attempts = platform === 'win32' ? 3 : 1;
    for (let count = 1; count <= attempts; count++) {
      check();
      try {
        return await operation();
      } catch (error) {
        if (
          count === attempts ||
          !['EPERM', 'EBUSY'].includes(error.code) ||
          error.retrySafe !== true
        )
          throw error;
      }
    }
    throw stale('sharing-exhausted');
  };
  const retained = () => {
    try {
      const entries = store.ownedObligations?.() || [];
      if (!Array.isArray(entries) || entries.length > 1)
        throw stale('retained-generation-unavailable');
      return entries;
    } catch {
      return [{ contenderId, resourceKey, reason: 'retained-generation-unavailable' }];
    }
  };
  const withdraw = async () => {
    if (!own)
      return creationAttempted
        ? {
            status: 'unresolved',
            obligations: [
              ...retained(),
              { contenderId, resourceKey, reason: 'own-publication-unconfirmed' },
            ],
          }
        : { status: 'not-created', obligations: [] };
    try {
      check();
      await store.assertBound(budget);
      const current = await sharing(() => store.read(contenderId, budget));
      if (!sameSnapshot(own, current)) throw stale('own-slot-generation-changed');
      await sharing(() => store.remove(contenderId, current, budget));
      own = null;
      creationAttempted = false;
      return { status: 'withdrawn', obligations: [] };
    } catch (error) {
      return {
        status: 'unresolved',
        obligations: [
          ...(error.details?.obligations || []),
          ...retained(),
          {
            contenderId,
            resourceKey,
            version: own.version,
            reason: error.details?.reason || error.code || 'withdrawal-unproved',
          },
        ],
      };
    }
  };
  try {
    check();
    await store.assertBound(budget);
    await transition('before-choosing');
    const choosing = {
      schema: recordSchema,
      resourceKey,
      contenderId,
      identity: structuredClone(contenderIdentity),
      choosing: true,
      ticket: null,
    };
    try {
      own = await sharing(() => {
        creationAttempted = true;
        return store.create(contenderId, choosing, budget);
      });
    } catch (error) {
      if (error.code === 'EEXIST') creationAttempted = false;
      throw error;
    }
    await transition('choosing-published');
    const initial = await sharing(() => store.list(budget));
    if (!Array.isArray(initial) || initial.length > 4096) throw stale('slot-count-unproved');
    let maximum = 0n;
    for (const item of initial) {
      if (!validRecord(item, resourceKey)) throw stale('slot-record-unproved');
      if (!item.record.choosing)
        maximum = maximum > BigInt(item.record.ticket) ? maximum : BigInt(item.record.ticket);
    }
    const ticket = String(maximum + 1n);
    if (ticket.length > 30) throw stale('ticket-range-unproved');
    await transition('before-ticket');
    own = await sharing(() =>
      store.publish(contenderId, own, { ...choosing, choosing: false, ticket }, budget)
    );
    await transition('ticket-published');
    for (let rounds = 0; rounds < 10000; rounds++) {
      check();
      await store.assertBound(budget);
      const current = await sharing(() => store.read(contenderId, budget));
      if (!sameSnapshot(current, own)) throw stale('own-slot-generation-changed');
      const owner = await observeOwner(budget);
      if (owner?.status === 'authenticated-live') {
        const withdrawal = await withdraw();
        if (withdrawal.status !== 'withdrawn')
          return unavailable('withdrawal-unproved', {
            withdrawal,
            obligations: withdrawal.obligations,
          });
        return Object.freeze({
          kind: 'owner-live',
          verified: false,
          owner,
          withdrawal,
          obligations: [],
        });
      }
      if (owner?.status === 'unknown') throw stale('owner-authentication-unavailable');
      const entries = await sharing(() => store.list(budget));
      if (!Array.isArray(entries) || entries.length > 4096) throw stale('slot-count-unproved');
      const dead = [];
      let waiting = false;
      for (const entry of entries) {
        if (!validRecord(entry, resourceKey)) throw stale('slot-record-unproved');
        if (entry.id === contenderId) continue;
        const observed = await observeProcessIdentity({
          pid: entry.record.identity.pid,
          original: entry.record.identity,
          signal,
          deadline,
          clock,
        });
        check();
        if (exactDeath(observed, entry.record.identity)) {
          dead.push(entry);
          continue;
        }
        if (observed?.status !== 'live') throw stale('process-observation-unknown');
        if (
          entry.record.choosing ||
          BigInt(entry.record.ticket) < BigInt(ticket) ||
          (entry.record.ticket === ticket && entry.id < contenderId)
        )
          waiting = true;
      }
      if (waiting) {
        await transition('waiting');
        await wait(Math.min(10, Math.max(1, check())), budget);
        continue;
      }
      await transition('before-win');
      winning = true;
      const assertCurrent = async () => {
        check();
        if (!winning || !own) throw stale('lease-released');
        await store.assertBound(budget);
        const snapshot = await sharing(() => store.read(contenderId, budget));
        if (!sameSnapshot(snapshot, own)) throw stale('held-slot-generation-changed');
        check();
      };
      let activity = 'idle';
      const lease = Object.freeze({
        resourceKey,
        contenderId,
        verified: false,
        assert: assertCurrent,
        retainedGeneration: () =>
          Object.freeze({
            contenderId,
            resourceKey,
            version: own?.version,
            outcome: own ? 'held-election-slot' : 'withdrawn',
          }),
        async run(effect) {
          if (activity !== 'idle') throw stale('lease-effect-busy');
          activity = 'effect';
          try {
            await assertCurrent();
            return await heldContext.run({ store, resourceKey }, async () => {
              const result = await effect(budget);
              await assertCurrent();
              return result;
            });
          } finally {
            activity = 'idle';
          }
        },
        async release() {
          if (activity !== 'idle') throw stale('lease-effect-busy');
          if (!own) return Object.freeze({ status: 'withdrawn', obligations: [] });
          activity = 'release';
          winning = false;
          try {
            return Object.freeze(await withdraw());
          } finally {
            activity = 'idle';
          }
        },
      });
      heldLease = lease;
      if (store.beginWinningTransaction) await store.beginWinningTransaction(lease, budget);
      const finalOwner = await observeOwner(budget);
      check();
      if (finalOwner?.status === 'authenticated-live') {
        const withdrawal = await withdraw();
        winning = false;
        if (withdrawal.status !== 'withdrawn')
          return unavailable('withdrawal-unproved', {
            withdrawal,
            obligations: withdrawal.obligations,
          });
        return Object.freeze({
          kind: 'owner-live',
          verified: false,
          owner: finalOwner,
          withdrawal,
          obligations: [],
        });
      }
      if (finalOwner?.status === 'unknown') throw stale('owner-authentication-unavailable');
      for (const entry of dead) {
        const fresh = await sharing(() => store.read(entry.id, budget));
        if (!sameSnapshot(entry, fresh)) throw stale('dead-slot-generation-changed');
        const observed = await observeProcessIdentity({
          pid: fresh.record.identity.pid,
          original: fresh.record.identity,
          signal,
          deadline,
          clock,
        });
        if (!exactDeath(observed, fresh.record.identity)) throw stale('dead-slot-unproved');
        check();
        await sharing(() => store.remove(entry.id, fresh, budget));
      }
      await assertCurrent();
      return Object.freeze({ kind: 'won', verified: false, lease, obligations: [], ticket });
    }
    throw stale('election-transition-limit');
  } catch (error) {
    winning = false;
    const withdrawal = await withdraw();
    const obligations = [...(error.details?.obligations || []), ...withdrawal.obligations];

    return unavailable(error.details?.reason || error.code || 'election-unproved', {
      withdrawal,
      obligations,
    });
  }
}

function resourceBinding(root, resource) {
  if (
    !resource ||
    !['broker-owner', 'provider-resource', 'primary-admission'].includes(resource.kind)
  )
    throw stale('resource-kind-invalid');
  const keys = Object.keys(resource).sort().join(',');
  if (
    resource.kind === 'provider-resource'
      ? keys !== 'id,kind' || !/^sha256:[a-f0-9]{64}$/u.test(resource.id)
      : keys !== 'kind'
  )
    throw stale('resource-key-invalid');
  const key = createHash('sha256').update(encodeRequestCanonical({ root, resource })).digest('hex');
  return { resourceKey: key, resourceKind: resource.kind, prefix: 'apr-election-' + key + '-' };
}
export async function bindOwnerElectionPaths({
  receipt,
  resource,
  effectReceipts = [],
  signal,
  deadline,
} = {}) {
  if (!Array.isArray(effectReceipts) || effectReceipts.length > 16)
    throw stale('resource-roots-invalid');
  if (
    effectReceipts.length &&
    (resource?.kind !== 'broker-owner' ||
      effectReceipts.length !== 1 ||
      path.basename(receipt?.root || '') !== 'private' ||
      path.basename(effectReceipts[0]?.root || '') !== 'runtime' ||
      path.dirname(receipt.root) !== path.dirname(effectReceipts[0].root))
  )
    throw new AprError(
      'APR_BROKER_PATH_INVALID',
      'Election effects must stay in the bound private/runtime siblings.',
      { recovery: 'Bind only the verified private/runtime siblings for this worktree.' }
    );
  const all = [receipt, ...effectReceipts];
  if (all.length > 1) await assertDistinctProtectedRoots(all.map((item) => item?.root));
  const guards = new Map();
  let closed = false;
  async function close() {
    closed = true;
    const entries = [...guards];
    const outcomes = await Promise.allSettled(entries.map(([, item]) => item.guard.close()));
    const obligations = outcomes.flatMap((result, index) => {
      if (result.status === 'fulfilled') return [];
      const [root, item] = entries[index];
      return [
        ...(result.reason?.details?.obligations ||
          result.reason?.details?.outstandingObligations ||
          []),
        { root, identity: item.identity, outcome: 'root-descriptor-close-pending' },
      ];
    });
    if (obligations.length)
      throw new AprError('APR_BROKER_STALE', 'Protected root descriptors could not be closed.', {
        recovery:
          'Preserve each exact protected root descriptor and reconcile closure before retrying.',
        details: { reason: 'binding-close-unproved', obligations },
      });
  }
  try {
    for (const item of all) {
      const guard = await openProtectedRoot({ receipt: item, signal, deadline });
      guards.set(item.root, { guard, identity: item.identity, receipt: item });
    }
    const binding = resourceBinding(receipt.root, resource);
    const paths = Object.freeze({
      resourceKey: binding.resourceKey,
      resourceKind: binding.resourceKind,
      close,
    });
    pathBindings.set(paths, {
      ...binding,
      budget: Object.freeze({ signal, deadline }),
      root: receipt.root,
      guard: guards.get(receipt.root).guard,
      guards,
      isClosed: () => closed,
    });
    return paths;
  } catch (error) {
    try {
      await close();
    } catch (cleanup) {
      throw new AprError(
        'APR_BROKER_STALE',
        'Protected election binding could not be established.',
        {
          recovery:
            'Preserve descriptor-close obligations and retry after restoring verified protection.',
          details: {
            reason: error.details?.reason || 'binding-unproved',
            obligations: cleanup.details?.obligations || [{ outcome: 'descriptor-close-pending' }],
          },
        }
      );
    }
    throw error;
  }
}
export function isOwnerElectionLeaseFor(lease, { identity, source, signal, deadline } = {}) {
  const record = productionLeases.get(lease);
  return (
    !!record &&
    record.binding.resourceKind === 'broker-owner' &&
    record.assurance === source &&
    record.budget.signal === signal &&
    record.budget.deadline === deadline &&
    sameProcessOwnerFacts(record.identity, identity)
  );
}
export function isOwnerElectionLease(lease) {
  return productionLeases.has(lease);
}
export async function inspectOwnerElectionLease(input = {}) {
  const record = productionLeases.get(input.lease);
  if (
    !record ||
    record.binding.resourceKind !== 'broker-owner' ||
    Object.keys(input).sort().join(',') !== 'deadline,lease,signal'
  )
    throw stale('genuine-election-lease-required');
  const current = portableOwnerOperation(input.lease) || record.budget;
  if (
    !(input.signal instanceof AbortSignal) ||
    input.signal !== current.signal ||
    input.deadline !== current.deadline ||
    !Number.isFinite(input.deadline)
  )
    throw stale('owner-lease-budget-mismatch');
  await assertOwnerElectionLease(input.lease);
  return Object.freeze({ identity: record.identity, source: record.assurance });
}
export async function assertOwnerElectionLease(lease, { root, name, quarantineOf } = {}) {
  const record = productionLeases.get(lease);
  if (!record) throw stale('genuine-election-lease-required');
  await record.core.assert();
  if (
    !(await revalidateInstalledProcessSourceAssurance(
      record.assurance,
      portableOwnerOperation(lease) || record.budget
    ))
  )
    throw stale('source-class-unavailable');
  if (root && !record.binding.guards.has(root)) throw stale('lease-root-mismatch');
  if (name) {
    const binding = record.binding;
    const ownSlot = name.startsWith(binding.prefix);
    const effectName =
      binding.resourceKind === 'provider-resource'
        ? name === 'apr-resource-' + binding.resourceKey + '.json'
        : (binding.resourceKind === 'broker-owner'
            ? [
                'owner.json',
                'credential',
                'endpoint.json',
                'registry.json',
                'manual-suspension.json',
              ]
            : [
                'primary.json',
                'primary-activation.json',
                'primary-retirement.json',
                'runtime-selection.json',
              ]
          ).includes(name);
    const quarantineName =
      binding.resourceKind === 'broker-owner' &&
      name.startsWith('apr-owner-quarantine-' + binding.resourceKey + '-') &&
      /^apr-owner-quarantine-[a-f0-9]{64}-[a-f0-9-]{36}\.json$/u.test(name);
    if (!ownSlot && !effectName && !quarantineName) throw stale('lease-resource-mismatch');
    if (ownSlot && root && root !== binding.root) throw stale('lease-root-mismatch');
    if (
      binding.guards.size > 1 &&
      !ownSlot &&
      !ownerPublicationRootMatchesCore({ root, privateRoot: binding.root, name, quarantineOf })
    )
      throw stale('lease-root-mismatch');
  }
  return true;
}
export async function acquireOwnerElection(options = {}) {
  const binding = pathBindings.get(options.paths);
  if (!binding || binding.isClosed()) return unavailable('unverified-paths');
  if (options.observeProcessIdentity !== undefined || options.clock !== undefined)
    return unavailable('fixture-observation-unavailable');
  if (
    !(options.signal instanceof AbortSignal) ||
    !Number.isFinite(options.deadline) ||
    options.deadline - performance.now() > 30000
  )
    return unavailable('operation-budget-unproved');
  const budget = Object.freeze({ signal: options.signal, deadline: options.deadline });
  let transaction, operationalLease;
  const close = async () => {
    if (!transaction) return [];
    const results = await Promise.allSettled(
      [...transaction.guards.values()].map((item) => item.guard.close())
    );
    return results.flatMap((result) =>
      result.status === 'rejected'
        ? result.reason.details?.obligations || [{ outcome: 'descriptor-close-pending' }]
        : []
    );
  };
  try {
    const { check } = coreBudget(budget);
    check();
    if (heldContext.getStore()?.resourceKey === binding.resourceKey)
      return unavailable('nested-resource-acquisition');
    const guards = new Map();
    transaction = { ...binding, guards };
    for (const [root, item] of binding.guards) {
      check();
      const guard = await openProtectedRoot({ receipt: item.receipt, ...budget });
      guards.set(root, { ...item, guard });
    }
    transaction.guard = guards.get(binding.root).guard;
    const current = await observeOriginalProcess(budget);
    if (current.status !== 'live' || !isInstalledProcessSourceAssurance(current.assurance)) {
      const obligations = await close();
      return unavailable('source-class-unavailable', { obligations });
    }
    if (
      options.contenderIdentity &&
      (options.contenderIdentity.pid !== current.pid ||
        options.contenderIdentity.host !== current.host)
    ) {
      const obligations = await close();
      return unavailable('contender-identity-mismatch', { obligations });
    }
    const contenderId = randomUUID();
    const lift = (core) => {
      if (operationalLease) throw stale('winning-transaction-already-held');
      const lease = Object.freeze({
        resourceKey: binding.resourceKey,
        contenderId,
        assert: (scope) => assertOwnerElectionLease(lease, scope),
        retainedGeneration: core.retainedGeneration,
        run: async (effect) => {
          await assertOwnerElectionLease(lease);
          return core.run(effect);
        },
        async release() {
          portableOwnerOperation(lease);
          const withdrawal = await core.release();
          productionLeases.delete(lease);
          const obligations = [...withdrawal.obligations, ...(await close())];
          return Object.freeze({
            ...withdrawal,
            obligations,
            status: obligations.length ? 'unresolved' : withdrawal.status,
          });
        },
      });
      productionLeases.set(lease, {
        core,
        binding: transaction,
        assurance: current.assurance,
        identity: current,
        budget,
      });
      coreProductionLeases.set(core, lease);
      operationalLease = lease;
      return lease;
    };
    const store = protectedStore(transaction, contenderId, lift, () => operationalLease);
    const outcome = await acquireOwnerElectionCore({
      store,
      resourceKey: binding.resourceKey,
      contenderId,
      contenderIdentity: {
        host: current.host,
        pid: current.pid,
        ...(current.creation ? { creation: current.creation } : {}),
        ...(current.creationSource ? { creationSource: current.creationSource } : {}),
      },
      ...budget,
      observeProcessIdentity: async ({ pid, original }) => {
        const observed = await observeOriginalProcess({ pid, ...budget });
        return reconcileOriginalProcess({ original, observation: observed });
      },
      observeOwner: () => observeOwner(transaction, options),
    });
    if (outcome.kind === 'won') {
      await assertOwnerElectionLease(operationalLease);
      return Object.freeze({ ...outcome, verified: true, lease: operationalLease });
    }
    if (operationalLease) productionLeases.delete(operationalLease);
    return Object.freeze({ ...outcome, obligations: [...outcome.obligations, ...(await close())] });
  } catch (error) {
    let withdrawal;
    if (operationalLease) {
      withdrawal = await operationalLease.release();
      productionLeases.delete(operationalLease);
    }
    return unavailable(error.details?.reason || 'election-unproved', {
      withdrawal,
      obligations: [
        ...(error.details?.obligations || []),
        ...(withdrawal?.obligations || []),
        ...(await close()),
      ],
    });
  }
}
export async function ownerElectionBudget(lease, { root } = {}) {
  await assertOwnerElectionLease(lease, { root });
  return portableOwnerOperation(lease) || productionLeases.get(lease).budget;
}
function protectedStore(binding, ownId, lift, heldLease) {
  const name = (id) => binding.prefix + id + '.json';
  const publications = new Map();
  const snapshot = async (id) => {
    try {
      const observed = await binding.guard.readSnapshot(name(id));
      if (observed.bytes.length > 8192) throw stale('slot-size-unproved');
      return {
        id,
        record: parseRawJson(observed.bytes.toString('utf8')),
        version: observed.identity + ':' + observed.fileVersion,
        storage: observed,
      };
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  };
  return {
    resourceKey: binding.resourceKey,
    ownedObligations: () =>
      [...publications.values()].map((publication) => publication.retainedGeneration()),
    beginWinningTransaction: async (core) => {
      const lease = lift(core);
      await assertOwnerElectionLease(lease);
    },
    assertBound: () => binding.guard.verify(),
    async create(id, record) {
      const publication = await binding.guard.createOwnedPublication(
        name(id),
        encodeRequestCanonical(record)
      );
      publications.set(id, publication);
      return snapshot(id);
    },
    read: snapshot,
    async list() {
      const names = await binding.guard.listOwnedPublications(binding.prefix);
      const entries = [];
      for (const file of names) entries.push(await snapshot(file.slice(binding.prefix.length, -5)));
      return entries;
    },
    async publish(id, expected, record) {
      if (id !== ownId || !publications.has(id)) throw stale('foreign-publication');
      await publications.get(id).publish(expected.storage, encodeRequestCanonical(record));
      return snapshot(id);
    },
    async remove(id, expected) {
      if (id === ownId) {
        await publications.get(id).withdraw(expected.storage);
        publications.delete(id);
        return;
      }
      // Only a winning core transaction reaches this path; exact death and
      // the original generation were rechecked immediately above.
      await binding.guard.removeRetiredPublication(name(id), expected.storage, heldLease());
    },
  };
}
async function observeOwner(binding, options) {
  if (binding.resourceKind !== 'broker-owner') return null;
  try {
    await binding.guard.read('owner.json');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  try {
    const owner = await import('./portable-ownership.mjs');
    const observation = await owner.observeAuthenticatedOwner({
      paths: options.paths,
      signal: options.signal,
      deadline: options.deadline,
    });
    return owner.isAuthenticatedOwnerObservation(observation) ? observation : { status: 'unknown' };
  } catch {
    return { status: 'unknown' };
  }
}

export async function inspectOwnerElectionPaths({ paths, signal, deadline } = {}) {
  const binding = pathBindings.get(paths);
  if (
    !binding ||
    binding.isClosed() ||
    binding.resourceKind !== 'broker-owner' ||
    binding.guards.size !== 2
  )
    throw stale('unverified-owner-paths');
  const current = portableOwnerRootOperation(binding.root, binding.budget) || binding.budget;
  if (
    !(signal instanceof AbortSignal) ||
    signal.aborted ||
    !Number.isFinite(deadline) ||
    deadline <= performance.now() ||
    deadline - performance.now() > 30000 ||
    signal !== current.signal ||
    deadline !== current.deadline
  )
    throw stale('owner-path-budget-mismatch');
  const runtimeRoot = [...binding.guards.keys()].find((root) => root !== binding.root);
  if (
    path.basename(binding.root) !== 'private' ||
    path.basename(runtimeRoot) !== 'runtime' ||
    path.dirname(binding.root) !== path.dirname(runtimeRoot)
  )
    throw stale('owner-path-roots-unproved');
  for (const entry of binding.guards.values()) await entry.guard.verify();
  return Object.freeze({
    resourceKey: binding.resourceKey,
    privateRoot: binding.root,
    runtimeRoot,
    privateGuard: binding.guard,
    runtimeGuard: binding.guards.get(runtimeRoot).guard,
  });
}
// Pure root-policy comparison; this cannot mint a lease or authorize an effect.
export function ownerPublicationRootMatchesCore({ root, privateRoot, name, quarantineOf } = {}) {
  const names = [
    'owner.json',
    'credential',
    'endpoint.json',
    'registry.json',
    'manual-suspension.json',
  ];
  const quarantine = /^apr-owner-quarantine-[a-f0-9]{64}-[a-f0-9-]{36}\.json$/u.test(name ?? '');
  const source = quarantine ? quarantineOf : name;
  if (
    typeof root !== 'string' ||
    typeof privateRoot !== 'string' ||
    !names.includes(source) ||
    (quarantineOf !== undefined && !quarantine)
  )
    return false;
  return source === 'endpoint.json' ? root !== privateRoot : root === privateRoot;
}
