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
      !['reserved', 'acknowledged'].includes(current?.status)
    )
      throw unknown(workspace);
    // A read-only reconciliation may have consumed the durable adapter receipt
    // while this original call was returning. Never overwrite that exact ack.
    if (current.status === 'acknowledged') {
      if (
        journal.stage !== 'launched' ||
        (sessionFingerprint && current.session_fingerprint !== sessionFingerprint)
      )
        throw unknown(workspace);
      status = 'acknowledged';
      return;
    }
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

// Reconcile a completed adapter acknowledgement across the journal-write crash
// window. Missing evidence remains unknown; this path never dispatches a launch.
export async function reconcileReviewerLaunch({ registration, observe } = {}) {
  const workspace = registration?.workspace;
  if (!workspace || typeof observe !== 'function')
    throw unavailable('Launch reconciliation authority is incomplete.');
  const read = () => {
    const state = inspectReview(workspace);
    const evidence = startupEvidence(workspace, state);
    const journal = evidence?.journal;
    if (
      journal?.request_digest !== registration.request_digest ||
      journal?.descriptor?.ownership !== 'broker' ||
      evidence.recovery.fenced ||
      evidence.recovery.suspending
    )
      throw stale();
    return { journal, state };
  };
  const { journal } = await withReviewLock(path.join(workspace, 'dispatch'), read);
  if (journal.stage === 'launched') return Object.freeze({ status: 'launched' });
  const operation = journal.provider_operation;
  if (
    !['launch-pending', 'outcome-unknown'].includes(journal.stage) ||
    !['reserved', 'outcome-unknown'].includes(operation?.status)
  )
    return Object.freeze({ status: 'outcome-unknown' });
  const outcome = await observe({ operationId: operation.operation_id });
  const fingerprint = outcome?.observation?.session_fingerprint;
  if (outcome?.status !== 'launched' || !/^sha256:[a-f0-9]{64}$/.test(fingerprint ?? ''))
    return Object.freeze({ status: 'outcome-unknown' });
  return withReviewLock(path.join(workspace, 'dispatch'), () => {
    const current = read();
    const latest = current.journal.provider_operation;
    if (
      latest?.operation_id !== operation.operation_id ||
      latest?.intent_digest !== operation.intent_digest ||
      !['reserved', 'outcome-unknown', 'acknowledged'].includes(latest?.status)
    )
      throw stale();
    if (
      fingerprint === current.state.participants.author.session_fingerprint ||
      (current.state.participants.reviewer &&
        fingerprint !== current.state.participants.reviewer.session_fingerprint) ||
      (latest.status === 'acknowledged' && latest.session_fingerprint !== fingerprint)
    )
      throw stale();
    save(workspace, {
      ...current.journal,
      stage: 'launched',
      provider_operation: {
        ...latest,
        status: 'acknowledged',
        session_fingerprint: fingerprint,
      },
    });
    return Object.freeze({ status: 'launched' });
  });
}
