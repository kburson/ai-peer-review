import { createHash } from 'node:crypto';
import path from 'node:path';

import { AprError } from '../errors.mjs';
import { inspectReview } from '../protocol/service.mjs';
import { atomicWrite, withReviewLock } from '../protocol/store.mjs';
import { readStartupJournal, startupEvidence } from './registry.mjs';

const NOT_SUBMITTED = new Set(['APR_PROVIDER_QUOTA', 'APR_PROVIDER_RESOURCE_BUSY']);

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

function unknown(workspace) {
  return new AprError('APR_WAKE_OUTCOME_UNKNOWN', 'Reviewer launch outcome is unknown.', {
    recovery: `peer-review broker reconcile '${workspace.replaceAll("'", "'\\''")}'`,
  });
}

function unavailable(message) {
  return new AprError('APR_TRANSPORT_UNAVAILABLE', message, {
    recovery: 'Restore an eligible broker worker and reconcile the exact launch intent.',
  });
}

function stale() {
  return new AprError('APR_BROKER_STALE', 'Broker launch authority is fenced or changed.', {
    recovery: 'Preserve the reserved launch and reconcile exact review authority.',
  });
}

function save(workspace, journal) {
  atomicWrite(path.join(workspace, 'startup-request.json'), `${JSON.stringify(journal)}\n`);
}

export async function reserveReviewerLaunch({ registration, worker } = {}) {
  if (!registration?.workspace || typeof worker?.launchReviewer !== 'function')
    throw unavailable('Broker worker has no validated reviewer launch capability.');
  const workspace = registration.workspace;
  return withReviewLock(path.join(workspace, 'dispatch'), () => {
    const state = inspectReview(workspace);
    const evidence = startupEvidence(workspace, state);
    const journal = evidence?.journal;
    if (
      !journal ||
      journal.request_digest !== registration.request_digest ||
      journal.descriptor?.ownership !== 'broker'
    )
      throw unavailable('Broker launch authority is missing.');
    if (evidence.recovery.fenced || evidence.recovery.suspending) throw stale();
    if (journal.stage === 'launched') return null;
    if (['launch-pending', 'outcome-unknown'].includes(journal.stage)) throw unknown(workspace);
    if (journal.stage !== 'registered') throw unavailable('Reviewer launch is not registered.');
    const operationId = `launch:${digest(`${journal.request_digest}\nreviewer`)}`;
    const intentDigest = `sha256:${digest(`${journal.request_digest}\n${journal.review_id}\n${state.protocol.revision}`)}`;
    const prior = journal.provider_operation;
    if (prior && prior.status !== 'not-submitted') throw unknown(workspace);
    const next = {
      ...journal,
      stage: 'launch-pending',
      provider_operation: {
        operation_id: operationId,
        intent_digest: intentDigest,
        status: 'reserved',
        session_fingerprint: null,
      },
    };
    save(workspace, next);
    return next.provider_operation;
  });
}

export async function settleReservedReviewerLaunch({
  registration,
  worker,
  operation,
  timeoutMs = 120_000,
} = {}) {
  if (
    !registration?.workspace ||
    typeof worker?.launchReviewer !== 'function' ||
    !operation?.operation_id ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs <= 0
  )
    throw unavailable('Broker reviewer launch reservation is incomplete.');
  const workspace = registration.workspace;

  let outcome;
  let failure;
  let timer;
  try {
    outcome = await Promise.race([
      worker.launchReviewer({
        operationId: operation.operation_id,
        intentDigest: operation.intent_digest,
      }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(unknown(workspace)), timeoutMs);
      }),
    ]);
  } catch (cause) {
    failure = cause;
  } finally {
    clearTimeout(timer);
  }

  let status =
    outcome?.status === 'launched'
      ? 'acknowledged'
      : outcome?.status === 'definitely-not-submitted' || NOT_SUBMITTED.has(failure?.code)
        ? 'not-submitted'
        : 'outcome-unknown';
  const sessionFingerprint =
    outcome?.observation?.session_fingerprint ?? outcome?.session_fingerprint ?? null;
  await withReviewLock(path.join(workspace, 'dispatch'), () => {
    const journal = readStartupJournal(workspace);
    const state = inspectReview(workspace);
    const current = journal?.provider_operation;
    if (
      journal?.request_digest !== registration.request_digest ||
      current?.operation_id !== operation.operation_id ||
      current?.intent_digest !== operation.intent_digest ||
      current?.status !== 'reserved'
    )
      throw unknown(workspace);
    if (
      status === 'acknowledged' &&
      state.participants.reviewer &&
      (!sessionFingerprint ||
        sessionFingerprint !== state.participants.reviewer.session_fingerprint)
    )
      status = 'outcome-unknown';
    save(workspace, {
      ...journal,
      stage:
        status === 'acknowledged'
          ? 'launched'
          : status === 'not-submitted'
            ? 'registered'
            : 'outcome-unknown',
      provider_operation: {
        ...current,
        status,
        session_fingerprint: status === 'acknowledged' ? sessionFingerprint : null,
      },
    });
  });
  if (status === 'not-submitted') {
    if (failure) throw failure;
    throw new AprError('APR_WAKE_NOT_SUBMITTED', 'Reviewer launch was not submitted.', {
      recovery: 'Retry the exact registered startup request after provider recovery.',
    });
  }
  if (status !== 'acknowledged') throw unknown(workspace);
  return Object.freeze({ status: 'launched' });
}

export async function launchReviewerOperation(input = {}) {
  const operation = await reserveReviewerLaunch(input);
  if (operation === null) return Object.freeze({ status: 'launched' });
  return settleReservedReviewerLaunch({ ...input, operation });
}
