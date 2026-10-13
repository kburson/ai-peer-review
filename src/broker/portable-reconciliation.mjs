// @story #178
import path from 'node:path';
import { inspectOwnerElectionPaths, inspectOwnerElectionLease } from './ownership-election.mjs';
import { boundedOwnershipError } from './portable-ownership.mjs';
import {
  observeReconciliationInventory,
  assertReconciliationInventory,
  readReconciliationInventory,
  retainReconciliationTransitionAnchors,
} from './portable-reconciliation-inventory.mjs';
import { readPortableReconciliationProjection } from './portable-reconciliation-projection.mjs';
import {
  reconcilePortableExistingEffects,
  readPortableExistingEffectTransition,
} from './portable-existing-effect-reconciliation.mjs';
import {
  inspectPortableWorkerRestorationReceipt,
  inspectPortableWorkerRestorationResources,
} from './worker-factory.mjs';
import {
  comparePortableRestorationTransitionCore,
  nextPortableRestorationStageCore,
  normalizePortableForeignScopeCore,
  comparePortableForeignResourceTransitionCore,
} from './portable-restoration-transition.mjs';
import { classifyPortableReconciliationCore } from './portable-reconciliation-policy.mjs';
import { canonicalProjection } from '../protocol/canonical-projection.mjs';

// Preparation is privately bound to the won election and its original context.
// Only the fixed ownership facade consumes its private assertion/publication path.
const observations = new WeakMap();
const retained = new Set();
function foreignRoots(data, projection) {
  const roots = [];
  for (const resource of projection.resources) {
    const foreign =
      resource.kind === 'provider-resources'
        ? resource.record.owner_project_root_digest !== data.project.digest
        : resource.association?.project_digest !== data.project.digest;
    if (
      !foreign ||
      classifyPortableReconciliationCore({
        project: data.project,
        reviews: [],
        registrations: [],
        resources: [resource],
      }).status !== 'clear'
    )
      continue;
    const namespace = data.namespaces.find(
      (entry) => entry.kind === resource.kind && path.basename(entry.root) === resource.key
    );
    if (!namespace) throw boundedOwnershipError('resource-association-unproved');
    roots.push(namespace.root);
    if (resource.kind === 'manual-resources') roots.push(resource.association.workspace);
  }
  return roots;
}
function withoutOwnedResources(projection, workers) {
  const owned = [...workers]
    .flatMap((worker) => worker.resources)
    .filter((resource) => !resource.concurrent && !resource.released);
  return projection.resources.filter(
    (resource) =>
      !owned.some(
        (lease) =>
          resource.kind === 'provider-resources' &&
          resource.key === lease.resourceDigest &&
          canonicalProjection(resource.record) === canonicalProjection(lease.record)
      )
  );
}
async function observeFreshForeignChanges(record) {
  let next,
    transferred = false;
  try {
    next = await observeReconciliationInventory({
      paths: record.paths,
      signal: record.signal,
      deadline: record.deadline,
    });
    await retainReconciliationTransitionAnchors({
      before: record.inventory,
      after: next,
      paths: record.paths,
      signal: record.signal,
      deadline: record.deadline,
    });
    const data = await readReconciliationInventory({
      observation: next,
      paths: record.paths,
      signal: record.signal,
      deadline: record.deadline,
    });
    const projection = await readPortableReconciliationProjection({
      inventory: next,
      paths: record.paths,
      signal: record.signal,
      deadline: record.deadline,
    });
    if (projection.preservationObligations.length)
      throw boundedOwnershipError('owner-reconciliation-unproved', projection.classification);
    const disposition = classifyPortableReconciliationCore({
      project: projection.project,
      reviews: projection.reviews,
      registrations: projection.registrations,
      resources: withoutOwnedResources(projection, record.workers?.values() ?? []),
    });
    if (disposition.status !== 'clear')
      throw boundedOwnershipError('owner-reconciliation-unproved', disposition);
    const compared = comparePortableForeignResourceTransitionCore({
      before: record.data,
      after: data,
      foreignRoots: [
        ...new Set([
          ...foreignRoots(record.data, record.projection),
          ...foreignRoots(data, projection),
        ]),
      ],
    });
    if (compared.status !== 'transition')
      throw boundedOwnershipError('reconciliation-generation-changed');
    await inspectOwnerElectionLease({
      lease: record.lease,
      paths: record.paths,
      signal: record.signal,
      deadline: record.deadline,
    });
    await record.inventory.close();
    record.inventory = next;
    record.data = data;
    record.projection = projection;
    transferred = true;
  } finally {
    if (next && !transferred) await next.close();
  }
}
export async function readPortableRestorationBaseline(input = {}) {
  const record = observationRecord(input);
  await assertPortableReconciliation(input);
  const data = await readReconciliationInventory({ ...input, observation: record.inventory });
  return Object.freeze({
    inventory: record.inventory,
    data,
    registrations: structuredClone(record.initialRegistrations ?? record.projection.registrations),
  });
}
export async function acceptPortableRestorationReceipt(input = {}) {
  if (Object.keys(input).sort().join(',') !== 'deadline,observation,owner,paths,receipt,signal')
    throw boundedOwnershipError('reconciliation-context-unproved');
  const record = observationRecord({
    observation: input.observation,
    paths: input.paths,
    signal: input.signal,
    deadline: input.deadline,
  });
  const receipt = await inspectPortableWorkerRestorationReceipt({
    owner: input.owner,
    receipt: input.receipt,
    signal: input.signal,
    deadline: input.deadline,
  });
  if (
    receipt.before.inventory !== record.inventory ||
    !(record.initialRegistrations ?? record.projection.registrations).some(
      (registration) =>
        canonicalProjection(registration) === canonicalProjection(receipt.registration)
    )
  )
    throw boundedOwnershipError('reconciliation-generation-changed');
  const previous = record.workers?.get(receipt.registration.workspace);
  if (
    !nextPortableRestorationStageCore(previous?.stage ?? null, receipt.stage) ||
    (previous && previous.worker !== receipt.worker)
  )
    throw boundedOwnershipError('reconciliation-generation-changed');
  await inspectOwnerElectionLease({
    lease: record.lease,
    paths: record.paths,
    signal: record.signal,
    deadline: record.deadline,
  });
  const after = await readReconciliationInventory({
    observation: receipt.after,
    paths: record.paths,
    signal: record.signal,
    deadline: record.deadline,
  });
  const projection = await readPortableReconciliationProjection({
    inventory: receipt.after,
    paths: record.paths,
    signal: record.signal,
    deadline: record.deadline,
  });
  const normalized = normalizePortableForeignScopeCore({
    before: receipt.before.data,
    after,
    foreignRoots: [
      ...new Set([
        ...foreignRoots(receipt.before.data, record.projection),
        ...foreignRoots(after, projection),
      ]),
    ],
  });
  const compared = comparePortableRestorationTransitionCore({
    before: normalized.before,
    after: normalized.after,
    registration: receipt.registration,
    stage: receipt.stage,
    protocolState: receipt.protocolState,
    resources: receipt.resources,
  });
  if (!['unchanged', 'transition'].includes(compared.status))
    throw boundedOwnershipError('reconciliation-generation-changed', compared);
  const held = [...(record.workers?.values() ?? [])].filter(
    (worker) => worker.registration.workspace !== receipt.registration.workspace
  );
  held.push(receipt);
  const owned = held
    .flatMap((worker) => worker.resources)
    .filter((resource) => !resource.concurrent && !resource.released);
  const resources = projection.resources.filter(
    (resource) =>
      !owned.some(
        (lease) =>
          resource.kind === 'provider-resources' &&
          resource.key === lease.resourceDigest &&
          canonicalProjection(resource.record) === canonicalProjection(lease.record)
      )
  );
  // The policy input is closed; project/review/registration facts come only from the new fixed projection.
  if (projection.preservationObligations.length)
    throw boundedOwnershipError('owner-reconciliation-unproved', projection.classification);
  const disposition = classifyPortableReconciliationCore({
    project: projection.project,
    reviews: projection.reviews,
    registrations: projection.registrations,
    resources,
  });
  if (disposition.status !== 'clear')
    throw boundedOwnershipError('owner-reconciliation-unproved', disposition);
  await record.inventory.close();
  record.initialRegistrations ??= structuredClone(record.projection.registrations);
  record.inventory = receipt.after;
  record.data = after;
  record.projection = projection;
  record.workers ??= new Map();
  record.workers.set(receipt.registration.workspace, { ...receipt, receipt: input.receipt });
  await assertPortableReconciliation({
    observation: input.observation,
    paths: input.paths,
    signal: input.signal,
    deadline: input.deadline,
  });
  return true;
}
function observationRecord(input) {
  if (Object.keys(input).sort().join(',') !== 'deadline,observation,paths,signal')
    throw boundedOwnershipError('reconciliation-context-unproved');
  const record = observations.get(input.observation);
  if (!record || record.closed || record.closing)
    throw boundedOwnershipError('reconciliation-observation-unproved');
  if (
    input.paths !== record.paths ||
    input.signal !== record.signal ||
    input.deadline !== record.deadline
  )
    throw boundedOwnershipError('reconciliation-context-unproved');
  return record;
}
export function isPortableReconciliationObservation(value) {
  const record = observations.get(value);
  return !!record && !record.closed && !record.closing;
}
export async function assertPortableReconciliationPublication(input = {}) {
  const record = observationRecord(input);
  await assertPortableReconciliation(input);
  for (const registration of record.initialRegistrations ?? record.projection.registrations) {
    const worker = record.workers?.get(registration.workspace);
    if (!worker || !['start', 'close'].includes(worker.stage))
      throw boundedOwnershipError('owner-reconciliation-unproved');
    const fresh = await inspectPortableWorkerRestorationResources({
      receipt: worker.receipt,
      owner: worker.owner,
      signal: record.signal,
      deadline: record.deadline,
    });
    if (worker.stage === 'start' && ['terminal', 'recovery-only'].includes(fresh.workState))
      throw boundedOwnershipError('owner-reconciliation-unproved');
  }
  await assertPortableReconciliation(input);
  return true;
}
export async function assertPortableReconciliation(input = {}) {
  const record = observationRecord(input);
  const assertResources = async () => {
    for (const worker of record.workers?.values() ?? []) {
      const fresh = await inspectPortableWorkerRestorationResources({
        receipt: worker.receipt,
        owner: worker.owner,
        signal: record.signal,
        deadline: record.deadline,
      });
      if (canonicalProjection(fresh.resources) !== canonicalProjection(worker.resources))
        throw boundedOwnershipError('provider-resource-retained');
    }
  };
  await inspectOwnerElectionLease({
    lease: record.lease,
    paths: record.paths,
    signal: record.signal,
    deadline: record.deadline,
  });
  await assertResources();
  try {
    await assertReconciliationInventory({
      observation: record.inventory,
      paths: record.paths,
      signal: record.signal,
      deadline: record.deadline,
    });
  } catch {
    await observeFreshForeignChanges(record);
  }
  await assertResources();
  await inspectOwnerElectionLease({
    lease: record.lease,
    paths: record.paths,
    signal: record.signal,
    deadline: record.deadline,
  });
  return true;
}
export async function preparePortableReconciliation(input = {}) {
  if (Object.keys(input).sort().join(',') !== 'deadline,lease,paths,signal')
    throw boundedOwnershipError('reconciliation-context-unproved');
  const { paths, lease, signal, deadline } = input;
  await inspectOwnerElectionLease({ lease, paths, signal, deadline });
  let adopted;
  // One existing effect per capture. Re-enumeration never changes the startup budget.
  for (let transitions = 0; transitions <= 4096; transitions++) {
    const inventory =
      adopted ?? (await observeReconciliationInventory({ paths, signal, deadline }));
    adopted = null;
    let transferred = false,
      preparedRecord;
    try {
      const effects = await reconcilePortableExistingEffects({
        inventory,
        paths,
        lease,
        signal,
        deadline,
      });
      if (effects.status === 'changed') {
        adopted = await readPortableExistingEffectTransition({
          result: effects,
          inventory,
          paths,
          lease,
          signal,
          deadline,
        });
        continue;
      }
      const projection = await readPortableReconciliationProjection({
        inventory,
        paths,
        signal,
        deadline,
      });
      const classification = effects.status === 'unknown' ? effects : projection.classification;
      const record = {
        paths,
        lease,
        signal,
        deadline,
        inventory,
        projection,
        data: await readReconciliationInventory({
          observation: inventory,
          paths,
          signal,
          deadline,
        }),
        closing: false,
        closed: false,
      };
      preparedRecord = record;
      const observed = Object.freeze({
        verified: false,
        status: classification.status,
        reason: classification.reason,
        outstandingObligations: classification.outstandingObligations,
        async close() {
          record.closing = true;
          await record.inventory.close();
          record.closed = true;
          retained.delete(record);
        },
      });
      observations.set(observed, record);
      retained.add(record);
      await assertPortableReconciliation({ observation: observed, paths, signal, deadline });
      transferred = true;
      return observed;
    } finally {
      if (!transferred) {
        await inventory.close();
        if (preparedRecord) {
          preparedRecord.closed = true;
          retained.delete(preparedRecord);
        }
      }
    }
  }
  throw boundedOwnershipError('reconciliation-inventory-overflow');
}
// The lease-free compatibility observation cannot grant clearance. Production
// ownership uses the separately bound preparation and private effect assertions.
export async function observePortableReconciliation(input = {}) {
  if (!input || Object.keys(input).sort().join(',') !== 'deadline,paths,signal')
    throw boundedOwnershipError('reconciliation-options-invalid');
  const view = await inspectOwnerElectionPaths(input),
    outstandingObligations = [];
  for (const name of ['registry.json', 'manual-suspension.json']) {
    try {
      const snapshot = await view.privateGuard.readSnapshot(name);
      outstandingObligations.push({
        name,
        root: view.privateRoot,
        originalLocator: path.join(view.privateRoot, name),
        identity: snapshot.identity,
        fileVersion: snapshot.fileVersion,
        rootIdentity: snapshot.rootIdentity,
        parentIdentity: snapshot.parentIdentity,
        outcome: 'guarded-generation-unreconciled',
      });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  outstandingObligations.push({
    name: 'owner-reconciliation-unproved',
    outcome: 'won-election-required',
  });
  await inspectOwnerElectionPaths(input);
  return Object.freeze({
    status: 'unknown',
    verified: false,
    reason: 'owner-reconciliation-unproved',
    outstandingObligations: Object.freeze(outstandingObligations),
  });
}
