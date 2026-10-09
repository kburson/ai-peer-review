// @story #188
// Manual recovery owns an independent election, including when a broker is live.
import path from 'node:path';
import { createHash } from 'node:crypto';
import { lstat } from 'node:fs/promises';
import {
  currentOperationAuthorityContext,
  currentProviderOperationAdmission,
} from '../startup/authority-fence.mjs';
import { initializePortableOperations } from './portable-platform.mjs';
import { provisionProtectedRoot } from './storage-protection.mjs';
import {
  bindOwnerElectionPaths,
  acquireOwnerElection,
  withProviderElectionOperation,
} from './ownership-election.mjs';
import { AprError } from '../errors.mjs';
const retained = new Map();
const uncertain = new Set();
function refusal(reason, obligations = []) {
  return new AprError('APR_BROKER_START_FAILED', 'Manual recovery exclusion is unavailable.', {
    recovery:
      'Preserve the independent manual election and reconcile the exact review before retrying.',
    details: { reason, outstandingObligations: obligations },
  });
}
export async function acquireManualRecoveryResource({ workspace, authority, evidence }) {
  const current = await currentOperationAuthorityContext();
  const operations = await initializePortableOperations(current);
  const userId = await operations.userId();
  const reviewId = authority.state.protocol.review_id;
  const requestDigest = evidence.recovery.request_digest;
  const key = createHash('sha256')
    .update(
      JSON.stringify([
        'ai-peer-review.manual-resource/v1',
        userId,
        workspace,
        reviewId,
        requestDigest,
      ])
    )
    .digest('hex');
  const existing = retained.get(key);
  if (existing) {
    await existing.handle.verify();
    return existing.handle;
  }
  const home = await operations.accountHome();
  const root = path.join(home, '.cache', 'ai-peer-review', 'manual-resources', key);
  let receipt = await operations.observeProtection({ root });
  if (!receipt.verified) {
    try {
      await lstat(root);
      throw refusal('existing-manual-protection-unavailable');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    receipt = await provisionProtectedRoot({ root, ...current });
  }
  const paths = await bindOwnerElectionPaths({
    receipt,
    resource: { kind: 'provider-resource', id: 'sha256:' + key },
    ...current,
  });
  const result = await acquireOwnerElection({ paths, ...current });
  if (result.kind !== 'won' || !result.verified) {
    await paths.close();
    throw refusal(result.reason, result.obligations);
  }
  const election = result.lease;
  let guard;
  const name = 'apr-resource-' + paths.resourceKey + '.json';
  let snapshot,
    attempted = false,
    released = false;
  const obligation = () => ({
    name: 'manual-suspension',
    root,
    record: name,
    identity: snapshot?.identity,
    fileVersion: snapshot?.fileVersion,
    generation: election.retainedGeneration(),
    outcome: 'retained-exclusion',
  });
  const record = { election, guard: null, paths, handle: null };
  async function verify() {
    if (released) throw refusal('manual-lease-released');
    await election.assert();
    const observed = await guard.readSnapshot(name);
    if (
      !snapshot ||
      observed.identity !== snapshot.identity ||
      observed.fileVersion !== snapshot.fileVersion ||
      !observed.bytes.equals(snapshot.bytes)
    )
      throw refusal('manual-record-generation-changed', [obligation()]);
    await election.assert();
    return true;
  }
  try {
    guard = await operations.openProtectedRoot({ receipt });
    record.guard = guard;
    try {
      await guard.readSnapshot(name);
      throw refusal('prior-manual-effects-unreconciled', [obligation()]);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    attempted = true;
    await guard.writeExclusive(
      name,
      Buffer.from(
        JSON.stringify({
          schema: 'ai-peer-review.manual-resource/v1',
          review_id: reviewId,
          request_digest: requestDigest,
          workspace,
          contender_id: election.contenderId,
        })
      ),
      election
    );
    snapshot = await guard.readSnapshot(name);
    await verify();
  } catch (error) {
    if (attempted) {
      uncertain.add(record);
      error.details = { ...error.details, outstandingObligations: [obligation()] };
    } else {
      try {
        const withdrawal = await election.release();
        if (withdrawal.status !== 'withdrawn' || withdrawal.obligations.length) {
          uncertain.add(record);
          error.details = {
            ...error.details,
            outstandingObligations: [obligation(), ...withdrawal.obligations],
          };
        } else {
          await guard?.close();
          await paths.close();
        }
      } catch (cleanup) {
        uncertain.add(record);
        error.cause = cleanup;
        error.details = {
          ...error.details,
          outstandingObligations: [obligation(), ...(cleanup.details?.obligations ?? [])],
        };
      }
    }
    throw error;
  }
  const handle = Object.freeze({
    verified: true,
    verify: async () =>
      withProviderElectionOperation(election, verify, await currentProviderOperationAdmission()),
    get outstandingObligations() {
      return released ? [] : [obligation()];
    },
    async retain() {
      retained.set(key, record);
    },
    release: async () =>
      withProviderElectionOperation(
        election,
        async () => {
          // A durable same-review fence, not death or a successful connect, proves
          // the manual exclusion can retire. Observe its protected generation again.
          await verify();
          const context = await currentOperationAuthorityContext();
          const fresh = await initializePortableOperations(context);
          const reviewReceipt = await fresh.observeProtection({ root: workspace });
          const reviewGuard = await fresh.openProtectedRoot({ receipt: reviewReceipt });
          try {
            const fence = await reviewGuard.readSnapshot('manual-fence.json');
            const value = JSON.parse(fence.bytes.toString('utf8'));
            if (
              value.schema !== 'ai-peer-review.manual-fence/v1' ||
              value.review_id !== reviewId ||
              value.request_digest !== requestDigest ||
              value.event_revision !== authority.state.protocol.revision
            )
              throw refusal('durable-manual-fence-unproved', [obligation()]);
            await verify();
            // Keep durable manual exclusion even if election withdrawal becomes
            // uncertain. A later process never infers completion from process death.
            const settled = JSON.stringify({
              schema: 'ai-peer-review.manual-resource/v1',
              review_id: reviewId,
              request_digest: requestDigest,
              workspace,
              contender_id: election.contenderId,
              durable_fence_digest: createHash('sha256').update(fence.bytes).digest('hex'),
            });
            await guard.replace(name, snapshot, Buffer.from(settled), election);
            snapshot = await guard.readSnapshot(name);
            const withdrawal = await election.release();
            if (withdrawal.status !== 'withdrawn' || withdrawal.obligations.length)
              throw refusal('manual-withdrawal-unproved', [
                obligation(),
                ...withdrawal.obligations,
              ]);
            released = true;
            await guard.close();
            await paths.close();
            retained.delete(key);
          } catch (error) {
            retained.set(key, record);
            throw error;
          } finally {
            await reviewGuard.close();
          }
        },
        await currentProviderOperationAdmission()
      ),
  });
  record.handle = handle;
  return handle;
}
