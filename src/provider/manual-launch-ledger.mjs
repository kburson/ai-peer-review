import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { AprError } from '../errors.mjs';
import { atomicCreate, atomicWrite, withReviewLock } from '../protocol/store.mjs';

const SCHEMA = 'ai-peer-review.manual-launch-history/v1';
const DIGEST = /^[a-f0-9]{64}$/;
const SHA = /^sha256:[a-f0-9]{64}$/;

function failure(message) {
  return new AprError('APR_WAKE_OUTCOME_UNKNOWN', message, {
    recovery:
      'Preserve every launch attempt and reconcile the exact provider outcome before retrying or retiring this review.',
  });
}

function fileFor(workspace) {
  return path.join(workspace, 'manual-launch-history.json');
}

function exact(value, fields) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join('\n') === fields.sort().join('\n')
  );
}

export function readManualLaunchHistory(workspace, { reviewId, requestDigest } = {}) {
  const file = fileFor(workspace);
  let status;
  try {
    status = lstatSync(file);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw failure('Manual launch history cannot be inspected.');
  }
  if (!status.isFile() || status.isSymbolicLink())
    throw failure('Manual launch history is not an owned regular file.');
  let value;
  try {
    value = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    throw failure('Manual launch history is unreadable.');
  }
  if (
    !exact(value, ['schema', 'review_id', 'request_digest', 'coverage', 'operations']) ||
    value.schema !== SCHEMA ||
    !['complete', 'legacy-unknown'].includes(value.coverage) ||
    value.review_id !== reviewId ||
    value.request_digest !== requestDigest ||
    !Array.isArray(value.operations) ||
    !value.operations.every(
      (entry) =>
        exact(entry, ['id', 'intent_digest', 'status']) &&
        /^manual:[a-f0-9-]{36}$/.test(entry.id) &&
        SHA.test(entry.intent_digest) &&
        ['reserved', 'not-submitted', 'submitted', 'outcome-unknown'].includes(entry.status)
    ) ||
    new Set(value.operations.map((entry) => entry.id)).size !== value.operations.length
  )
    throw failure('Manual launch history contradicts the sealed review request.');
  return value;
}

export function manualLaunchProvesNonSubmission(workspace, details) {
  const history = readManualLaunchHistory(workspace, details);
  if (
    !history ||
    history.coverage !== 'complete' ||
    history.operations.some((operation) => operation.status !== 'not-submitted')
  )
    return false;
  const observations = path.join(workspace, 'provider', 'claude', 'observations');
  const joinId = `join:${details.reviewId}`;
  const observed = [
    path.join(observations, `${createHash('sha256').update(joinId).digest('hex')}.json`),
    path.join(observations, `${joinId}.json`),
    path.join(workspace, 'provider', 'claude', 'launch-state.json'),
  ].some(existsSync);
  return !observed;
}

export function initializeManualLaunchHistory(workspace, { reviewId, requestDigest } = {}) {
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(reviewId ?? '') ||
    !DIGEST.test(requestDigest ?? '')
  )
    throw failure('Manual launch history identity is invalid.');
  const prior = readManualLaunchHistory(workspace, { reviewId, requestDigest });
  if (prior) return prior;
  const value = {
    schema: SCHEMA,
    review_id: reviewId,
    request_digest: requestDigest,
    coverage: 'complete',
    operations: [],
  };
  atomicCreate(fileFor(workspace), `${JSON.stringify(value)}\n`);
  return value;
}

export async function reserveManualLaunch(workspace, details, { verifyAuthority } = {}) {
  if (
    !SHA.test(details?.intentDigest ?? '') ||
    !DIGEST.test(details?.requestDigest ?? '') ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(details?.reviewId ?? '')
  )
    throw failure('Manual launch intent is invalid.');
  return withReviewLock(path.join(workspace, 'dispatch'), () => {
    verifyAuthority?.();
    let history = readManualLaunchHistory(workspace, details);
    if (!history) {
      history = {
        schema: SCHEMA,
        review_id: details.reviewId,
        request_digest: details.requestDigest,
        coverage: 'legacy-unknown',
        operations: [],
      };
      atomicCreate(fileFor(workspace), `${JSON.stringify(history)}\n`);
    }
    if (history.operations.some((entry) => ['reserved', 'outcome-unknown'].includes(entry.status)))
      throw failure('An earlier manual launch outcome is unresolved.');
    const operation = {
      id: `manual:${randomUUID()}`,
      intent_digest: details.intentDigest,
      status: 'reserved',
    };
    history.operations.push(operation);
    atomicWrite(fileFor(workspace), `${JSON.stringify(history)}\n`);
    return operation;
  });
}

export async function settleManualLaunch(workspace, details, operationId, status) {
  if (!['not-submitted', 'submitted', 'outcome-unknown'].includes(status))
    throw failure('Manual launch settlement is invalid.');
  return withReviewLock(path.join(workspace, 'dispatch'), () => {
    const history = readManualLaunchHistory(workspace, details);
    const operation = history?.operations.find((entry) => entry.id === operationId);
    if (
      !operation ||
      operation.intent_digest !== details.intentDigest ||
      operation.status !== 'reserved'
    )
      throw failure('Manual launch operation changed before settlement.');
    operation.status = status;
    atomicWrite(fileFor(workspace), `${JSON.stringify(history)}\n`);
    return operation;
  });
}
