// @story #178
import path from 'node:path';
import { inspectOwnerElectionPaths } from './ownership-election.mjs';
import { boundedOwnershipError } from './portable-ownership.mjs';
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
