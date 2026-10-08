// @story #187
// Primary exclusion has its own protected root and genuine source-bound election.
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { initializePortableSystem } from '../broker/portable-system.mjs';
import { AprError } from '../errors.mjs';
const records = new WeakMap();
const retained = new Set();
function refuse(message, details = {}) {
  return new AprError('APR_PRIMARY_AUTHORITY_UNAVAILABLE', message, {
    details,
    recovery:
      'Preserve the exact primary election generation and reconcile outstanding withdrawal or descriptor obligations before retrying.',
  });
}
export function primaryAdmissionRoot(commonDir) {
  return path.join(commonDir, 'ai-peer-review-primary-admission');
}
function context(options = {}) {
  const value = Object.freeze({
    signal: options.signal ?? new AbortController().signal,
    deadline: options.deadline ?? performance.now() + 30000,
  });
  if (!(value.signal instanceof AbortSignal) || !Number.isFinite(value.deadline))
    throw refuse('Invalid primary admission context.');
  if (value.signal.aborted || performance.now() >= value.deadline)
    throw refuse('Primary admission aborted or deadline expired.');
  return value;
}
export async function assertPrimaryAdmissionFence(fence, options) {
  const record = records.get(fence);
  if (!record || record.released)
    throw refuse('Primary admission is not an authenticated held generation.');
  if (
    options &&
    (options.signal !== record.context.signal || options.deadline !== record.context.deadline)
  )
    throw refuse('Primary admission original context changed.');
  context(record.context);
  if (record.lease.contenderId !== record.nonce) throw refuse('Primary admission nonce changed.');
  await record.lease.assert();
  context(record.context);
  return fence;
}
async function withdraw(record) {
  if (record.released) return;
  const result = await record.lease.release();
  record.withdrawal = result;
  if (result.status !== 'withdrawn' || result.obligations?.length) {
    retained.add(record);
    throw refuse('Primary admission withdrawal remains unresolved.', {
      session_id: record.sessionId,
      nonce: record.nonce,
      root: record.root,
      generation: record.lease.retainedGeneration(),
      obligations: result.obligations ?? [],
    });
  }
  record.released = true;
  try {
    await record.paths.close();
    retained.delete(record);
  } catch (error) {
    retained.add(record);
    throw error;
  }
}
export async function retryPrimaryAdmissionCleanup() {
  for (const record of retained) {
    if (record.released) {
      await record.paths.close();
      retained.delete(record);
    } else await withdraw(record);
  }
}
export async function withPrimaryAdmissionFence(options = {}, operation) {
  if (typeof operation !== 'function')
    throw refuse('Primary admission requires an awaited operation.');
  const original = context(options);
  const system = await initializePortableSystem(original);
  const commonDir = await system.canonicalPath(options.commonDir);
  if (commonDir !== options.commonDir) throw refuse('Clone admission directory is not canonical.');
  const root = primaryAdmissionRoot(commonDir);
  const { provisionProtectedRoot } = await import('../broker/storage-protection.mjs');
  // First-use provisioning is explicit maintenance, never an implicit repair.
  let receipt = await system.observeProtection({ root });
  if (!receipt.verified) {
    const { lstat } = await import('node:fs/promises');
    try {
      await lstat(root);
      throw refuse('Existing primary admission protection is unavailable.');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (options.dryRun)
      throw refuse('Primary admission root is absent; dry-run will not provision it.');
    receipt = await provisionProtectedRoot({ root, ...original });
  }
  const { bindOwnerElectionPaths, acquireOwnerElection } =
    await import('../broker/ownership-election.mjs');
  const paths = await bindOwnerElectionPaths({
    receipt,
    resource: { kind: 'primary-admission' },
    ...original,
  });
  let record, primaryError;
  try {
    const outcome = await acquireOwnerElection({ paths, ...original });
    if (outcome.kind !== 'won' || outcome.verified !== true) {
      throw refuse('Primary admission election refused: ' + outcome.reason, {
        root,
        obligations: outcome.obligations ?? [],
      });
    }
    const fence = Object.freeze({ root, resource: 'primary-admission' });
    record = {
      context: original,
      root,
      paths,
      lease: outcome.lease,
      nonce: outcome.lease.contenderId,
      sessionId: randomUUID(),
      released: false,
    };
    records.set(fence, record);
    await assertPrimaryAdmissionFence(fence, original);
    const result = await record.lease.run(async () => {
      await assertPrimaryAdmissionFence(fence, original);
      const result = await operation(fence, original);
      await assertPrimaryAdmissionFence(fence, original);
      return result;
    });
    return result;
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    try {
      if (record) await withdraw(record);
      else await paths.close();
    } catch (cleanup) {
      if (record) retained.add(record);
      if (primaryError) {
        primaryError.cause = cleanup;
        primaryError.details = {
          ...primaryError.details,
          obligations:
            cleanup.details?.obligations ?? cleanup.details?.outstandingObligations ?? [],
        };
      } else throw cleanup;
    }
  }
}
// Retained public name; its result must be awaited like every primary admission.
export async function withPrimaryAdmissionFenceSync(options, operation) {
  return withPrimaryAdmissionFence(options, operation);
}
