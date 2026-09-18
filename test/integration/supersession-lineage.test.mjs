import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import * as api from '../helpers/internal-api.mjs';
import { inspectRecordLineage } from '../../src/protocol/record-lineage.mjs';
import { appendEvent } from '../../src/protocol/store.mjs';
import { fixture, identity, NOW } from '../helpers/intervention-fixture.mjs';

function digest(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function receipt(predecessor, successor) {
  const reciprocal = `sha256:${'a'.repeat(64)}`;
  return {
    schema: 'ai-peer-review.lineage-receipt/v1',
    complete: true,
    attempts: [
      {
        review_id: predecessor.review_id,
        record_id: 'record-lineage',
        root_review_id: predecessor.review_id,
        recovery_ordinal: 0,
        predecessor_review_id: null,
        successor_review_id: successor.review_id,
        recovery_id: null,
        recovery_claim_digest: null,
        reciprocal_receipt_digest: reciprocal,
        consumed_grant_digest: null,
        event_log_digest: digest(readFileSync(predecessor.paths.events)),
      },
      {
        review_id: successor.review_id,
        record_id: 'record-lineage',
        root_review_id: predecessor.review_id,
        recovery_ordinal: 1,
        predecessor_review_id: predecessor.review_id,
        successor_review_id: null,
        recovery_id: 'recovery-1',
        recovery_claim_digest: `sha256:${'b'.repeat(64)}`,
        reciprocal_receipt_digest: reciprocal,
        consumed_grant_digest: null,
        event_log_digest: digest(readFileSync(successor.paths.events)),
      },
    ],
  };
}

function writeReciprocalReceipt(started, value) {
  const file = path.join(started.paths.workspace, 'lineage-receipt.json');
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

test('legacy placeholder supersession is surfaced on exact retry without rewriting history', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const author = identity('author', 'lineage-author');
  const predecessor = await api.startReview({
    cwd: fx.root,
    artifact: 'docs/artifact.md',
    artifactKind: 'spec',
    identity: author,
    reviewId: 'review-root',
    recordId: 'record-lineage',
    now: NOW,
  });
  await appendEvent(predecessor.paths.events, {
    schema: 'ai-peer-review.event/v1',
    review_id: predecessor.review_id,
    sequence: 2,
    revision: 2,
    type: 'superseded',
    actor: author.session_fingerprint,
    at: '2026-09-09T02:01:00.000Z',
    payload: {
      reason: 'Continue with the replacement attempt.',
      successor_review_id: 'review-candidate',
      retained_paths: [],
    },
  });
  const before = readFileSync(predecessor.paths.events);

  await assert.rejects(
    api.supersedeReview({
      workspace: predecessor.paths.workspace,
      identity: author,
      reason: 'Continue with the replacement attempt.',
      successorReviewId: 'review-candidate',
      now: '2026-09-09T02:02:00.000Z',
    }),
    (error) =>
      error.code === 'APR_LINEAGE_UNAVAILABLE' &&
      error.details.status === 'lineage-unavailable' &&
      error.details.missing.some((entry) => path.basename(entry) === 'review-candidate')
  );
  assert.deepEqual(readFileSync(predecessor.paths.events), before);
});

test('standalone supersession refuses absent lineage without mutating predecessor authority', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const author = identity('author', 'lineage-author');
  const predecessor = await api.startReview({
    cwd: fx.root,
    artifact: 'docs/artifact.md',
    artifactKind: 'spec',
    identity: author,
    reviewId: 'review-root',
    recordId: 'record-lineage',
    now: NOW,
  });
  await api.startReview({
    cwd: fx.root,
    artifact: 'docs/artifact.md',
    artifactKind: 'spec',
    identity: author,
    reviewId: 'review-next',
    recordId: 'record-lineage',
    now: '2026-09-09T02:01:00.000Z',
  });
  const before = readFileSync(predecessor.paths.events);
  await assert.rejects(
    api.supersedeReview({
      workspace: predecessor.paths.workspace,
      identity: author,
      reason: 'Use validated successor.',
      successorReviewId: 'review-next',
      now: '2026-09-09T02:02:00.000Z',
    }),
    (error) => error.code === 'APR_LINEAGE_UNAVAILABLE'
  );
  assert.deepEqual(readFileSync(predecessor.paths.events), before);
});

test('standalone supersession accepts an existing same-record reciprocal successor', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const author = identity('author', 'lineage-author');
  const predecessor = await api.startReview({
    cwd: fx.root,
    artifact: 'docs/artifact.md',
    artifactKind: 'spec',
    identity: author,
    reviewId: 'review-root',
    recordId: 'record-lineage',
    now: NOW,
  });
  const successor = await api.startReview({
    cwd: fx.root,
    artifact: 'docs/artifact.md',
    artifactKind: 'spec',
    identity: author,
    reviewId: 'review-next',
    recordId: 'record-lineage',
    now: '2026-09-09T02:01:00.000Z',
  });
  const value = receipt(predecessor, successor);
  writeReciprocalReceipt(predecessor, value);
  writeReciprocalReceipt(successor, value);

  const superseded = await api.supersedeReview({
    workspace: predecessor.paths.workspace,
    identity: author,
    reason: 'Use validated successor.',
    successorReviewId: successor.review_id,
    now: '2026-09-09T02:02:00.000Z',
  });
  assert.equal(superseded.state, 'superseded');
  assert.equal(superseded.review.successor_review_id, 'review-next');
  assert.equal(
    inspectRecordLineage([predecessor.paths.workspace, successor.paths.workspace]).status,
    'complete'
  );

  const after = readFileSync(predecessor.paths.events);
  const retried = await api.supersedeReview({
    workspace: predecessor.paths.workspace,
    identity: author,
    reason: 'Use validated successor.',
    successorReviewId: successor.review_id,
    now: '2026-09-09T02:03:00.000Z',
  });
  assert.equal(retried.state, 'superseded');
  assert.deepEqual(readFileSync(predecessor.paths.events), after);
  await assert.rejects(
    api.supersedeReview({
      workspace: predecessor.paths.workspace,
      identity: author,
      reason: 'Different successor reason.',
      successorReviewId: successor.review_id,
      now: '2026-09-09T02:04:00.000Z',
    }),
    (error) => error.code === 'APR_IDEMPOTENCY_CONFLICT'
  );

  unlinkSync(path.join(predecessor.paths.workspace, 'lineage-receipt.json'));
  unlinkSync(path.join(successor.paths.workspace, 'lineage-receipt.json'));
  const legacy = inspectRecordLineage([predecessor.paths.workspace, successor.paths.workspace]);
  assert.equal(legacy.status, 'complete');
  assert.equal(legacy.legacy, true);
});
