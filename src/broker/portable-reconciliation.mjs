// @story #178
import path from 'node:path';
import { inspectOwnerElectionPaths, inspectOwnerElectionLease } from './ownership-election.mjs';
import { boundedOwnershipError } from './portable-ownership.mjs';
import {
  observeReconciliationInventory,
  assertReconciliationInventory,
} from './portable-reconciliation-inventory.mjs';
import { readPortableReconciliationProjection } from './portable-reconciliation-projection.mjs';
import { reconcilePortableExistingEffects } from './portable-existing-effect-reconciliation.mjs';

// Preparation is privately bound to the won election and its original context. The wired
// owner path below stays non-clear until every publication/restoration guard is installed.
const observations = new WeakMap();
const retained = new Set();
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
export async function assertPortableReconciliation(input = {}) {
  const record = observationRecord(input);
  await inspectOwnerElectionLease({
    lease: record.lease,
    paths: record.paths,
    signal: record.signal,
    deadline: record.deadline,
  });
  await assertReconciliationInventory({
    observation: record.inventory,
    paths: record.paths,
    signal: record.signal,
    deadline: record.deadline,
  });
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
  // One existing effect per capture. Re-enumeration never changes the startup budget.
  for (let transitions = 0; transitions <= 4096; transitions++) {
    const inventory = await observeReconciliationInventory({ paths, signal, deadline });
    let transferred = false;
    try {
      const effects = await reconcilePortableExistingEffects({
        inventory,
        paths,
        lease,
        signal,
        deadline,
      });
      if (effects.status === 'changed') continue;
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
        closing: false,
        closed: false,
      };
      const observed = Object.freeze({
        verified: false,
        status: classification.status,
        reason: classification.reason,
        outstandingObligations: classification.outstandingObligations,
        async close() {
          record.closing = true;
          await inventory.close();
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
      if (!transferred) await inventory.close();
    }
  }
  throw boundedOwnershipError('reconciliation-inventory-overflow');
}
// Observation only. Existing legacy reconciliation is not portable authority;
// C6 must supply the actual registry/manual/wake/provider discharge producers.
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
  for (const name of [
    'registry-reconciliation',
    'manual-reconciliation',
    'wake-reconciliation',
    'provider-reconciliation',
  ])
    outstandingObligations.push({ name, outcome: 'producer-unavailable' });
  await inspectOwnerElectionPaths(input);
  return Object.freeze({
    status: 'unknown',
    verified: false,
    reason: 'guarded-reconciliation-unavailable',
    outstandingObligations: Object.freeze(outstandingObligations),
  });
}
