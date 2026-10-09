// @story #189
import path from 'node:path';
import { AprError } from '../errors.mjs';
import { startupEvidence } from './registry.mjs';
import { inspectReviewAuthority, canonicalProjection } from '../protocol/service.mjs';
import {
  atomicCreate as rawAtomicCreate,
  withReviewLock as rawWithReviewLock,
} from '../protocol/store.mjs';
import { allWakeOperations, latestWakeOperation } from '../coordinator/ledger.mjs';
import { manualLaunchProvesNonSubmission } from '../provider/manual-launch-ledger.mjs';
export function createManualRecoveryOperations({
  performCurrentOperationEffect,
  acquireManualRecoveryResource,
  authenticateManualOwnerConnection,
  connectManualOwner,
  closeManualOwner,
  requestBroker,
}) {
  const pendingManualCleanup = new Set();
  const atomicCreate = async (...args) =>
    await performCurrentOperationEffect(() => rawAtomicCreate(...args));
  const withReviewLock = (workspace, callback, options = {}) =>
    rawWithReviewLock(
      workspace,
      async (...args) => {
        await performCurrentOperationEffect(() => {});
        const result = await callback(...args);
        await performCurrentOperationEffect(() => {});
        return result;
      },
      { ...options, effect: async (operation) => await performCurrentOperationEffect(operation) }
    );
  const dispatch = async (operation) => {
    const result = await performCurrentOperationEffect(operation);
    await performCurrentOperationEffect(() => {});
    return result;
  };

  function startFailure(cause, details = {}) {
    return new AprError('APR_BROKER_START_FAILED', 'Manual broker recovery is unproved.', {
      details,
      recovery: 'Preserve exact recovery obligations and reconcile before retrying.',
    });
  }
  async function fenceManualRecovery(workspace, deps = {}) {
    const authority = inspectReviewAuthority(workspace);
    const evidence = startupEvidence(workspace, authority.state);
    if (!evidence || evidence.recovery.fenced) return evidence?.recovery ?? null;
    if (authority.state.protocol.startup.runtime.ownership !== 'broker') return null;
    const unknown = () =>
      new AprError(
        'APR_WAKE_OUTCOME_UNKNOWN',
        'Provider outcome must be reconciled before manual recovery.',
        { recovery: evidence.recovery.reconciliation_command }
      );
    let client, ownership;
    let disconnected = false,
      durableFence = false;
    try {
      ownership = await performCurrentOperationEffect(() =>
        acquireManualRecoveryResource({ workspace, authority, evidence, deps })
      );
      if (!(await performCurrentOperationEffect(() => ownership?.verify?.())))
        throw startFailure(null, { reason: 'recovery-ownership-unproven' });
      try {
        client = await connectManualOwner(
          authority.state.protocol.startup.context.repository_root,
          deps
        );
      } catch (error) {
        if (!['ENOENT', 'ECONNREFUSED', 'APR_BROKER_STALE'].includes(error?.code)) throw error;
        disconnected = true;
      }
      // Persist exclusion before asking the broker to remove its current worker.
      // Replacements must see it even if suspension/publication is interrupted.
      await withReviewLock(path.join(workspace, 'dispatch'), () =>
        withReviewLock(workspace, async () => {
          const fresh = inspectReviewAuthority(workspace);
          const current = startupEvidence(workspace, fresh.state);
          if (current.recovery.fenced || current.recovery.suspending) return;
          await atomicCreate(
            path.join(workspace, 'manual-suspension.json'),
            `${JSON.stringify({
              schema: 'ai-peer-review.manual-suspension/v1',
              review_id: fresh.state.protocol.review_id,
              request_digest: current.recovery.request_digest,
              event_revision: fresh.state.protocol.revision,
            })}\n`
          );
        })
      );
      if (client) {
        if (!(await authenticateManualOwnerConnection(client)))
          throw startFailure(null, { reason: 'manual-owner-connection-unproved' });
        await performCurrentOperationEffect(() => ownership.verify());
        const settled = await requestBroker(client, 'suspend', workspace);
        if (!['recovery-only', 'terminal'].includes(settled?.status))
          throw startFailure(null, { reason: 'suspension-unsettled' });
      }
      return await withReviewLock(path.join(workspace, 'dispatch'), async () => {
        const observed = startupEvidence(workspace, inspectReviewAuthority(workspace).state);
        const operation = latestWakeOperation(workspace);
        const wakeOperations = allWakeOperations(workspace);
        const manualNotSubmitted = manualLaunchProvesNonSubmission(workspace, {
          reviewId: observed.journal.review_id,
          requestDigest: observed.journal.request_digest,
        });
        const definitelyNotSubmitted =
          ['authority', 'manual', 'registered'].includes(observed.journal.stage) &&
          (!observed.journal.provider_operation ||
            observed.journal.provider_operation.status === 'not-submitted') &&
          wakeOperations.every((entry) => ['not-submitted', 'refused'].includes(entry.status)) &&
          manualNotSubmitted;
        if (!manualNotSubmitted) throw unknown();
        if (wakeOperations.some((entry) => ['reserved', 'outcome-unknown'].includes(entry.status)))
          throw unknown();
        if (disconnected && !definitelyNotSubmitted) {
          const outcome = await dispatch(() =>
            deps.reconcileProvider?.({
              workspace,
              journal: observed.journal,
              operation,
            })
          );
          if (!['acknowledged', 'not-submitted', 'refused'].includes(outcome?.status))
            throw unknown();
        } else if (
          ['launch-pending', 'outcome-unknown'].includes(observed.journal.stage) ||
          ['reserved', 'outcome-unknown'].includes(operation?.status)
        )
          throw unknown();
        return await withReviewLock(workspace, async () => {
          const fresh = inspectReviewAuthority(workspace);
          const current = startupEvidence(workspace, fresh.state);
          if (current.recovery.fenced) {
            durableFence = true;
            return current.recovery;
          }
          if (
            canonicalProjection(allWakeOperations(workspace)) !==
            canonicalProjection(wakeOperations)
          )
            throw unknown();
          if (current.journal.stage !== observed.journal.stage) throw unknown();
          if (!(await performCurrentOperationEffect(() => ownership.verify())))
            throw startFailure(null, { reason: 'recovery-ownership-lost' });
          if (fresh.state.protocol.revision !== authority.state.protocol.revision)
            throw new AprError(
              'APR_BROKER_STALE',
              'Review changed while suspending automatic delivery.',
              { recovery: evidence.recovery.reconciliation_command }
            );
          await atomicCreate(
            path.join(workspace, 'manual-fence.json'),
            `${JSON.stringify({ schema: 'ai-peer-review.manual-fence/v1', review_id: fresh.state.protocol.review_id, request_digest: current.recovery.request_digest, event_revision: fresh.state.protocol.revision })}\n`
          );
          durableFence = true;
          return { ...current.recovery, fenced: true, suspending: false };
        });
      });
    } finally {
      try {
        if (ownership) {
          if (durableFence) await performCurrentOperationEffect(() => ownership.release());
          else await ownership.retain?.();
        }
      } finally {
        const cleanup = await Promise.allSettled([
          Promise.resolve().then(() => closeManualOwner(client)),
        ]);
        const failures = cleanup.filter((result) => result.status === 'rejected');
        if (failures.length) {
          pendingManualCleanup.add({ workspace, client, ownership });
          const error = failures[0].reason;
          error.details = {
            ...error.details,
            outstandingObligations: [
              ...(error.details?.outstandingObligations ?? []),
              { name: 'manual-owner-connection', workspace, outcome: 'close-unproved' },
            ],
          };
          throw error;
        }
      }
    }
  }

  return { fenceManualRecovery };
}
