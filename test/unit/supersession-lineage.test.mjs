import test from 'node:test';
import assert from 'node:assert/strict';

import { inspectRecordLineage, validateSuccessor } from '../../src/protocol/record-lineage.mjs';

const DIGEST_A = `sha256:${'a'.repeat(64)}`;
const DIGEST_B = `sha256:${'b'.repeat(64)}`;

function attempt(overrides = {}) {
  return {
    review_id: 'review-root',
    record_id: 'record-root',
    root_review_id: 'review-root',
    recovery_ordinal: 0,
    predecessor_review_id: null,
    successor_review_id: 'review-next',
    recovery_id: null,
    recovery_claim_digest: null,
    reciprocal_receipt_digest: DIGEST_A,
    consumed_grant_digest: null,
    event_log_digest: DIGEST_B,
    ...overrides,
  };
}

function successor(overrides = {}) {
  return attempt({
    review_id: 'review-next',
    recovery_ordinal: 1,
    predecessor_review_id: 'review-root',
    successor_review_id: null,
    recovery_id: 'recovery-1',
    recovery_claim_digest: DIGEST_B,
    event_log_digest: DIGEST_A,
    ...overrides,
  });
}

test('validates a distinct reciprocal successor', () => {
  assert.deepEqual(validateSuccessor({ predecessor: attempt(), successor: successor() }), {
    predecessor_review_id: 'review-root',
    successor_review_id: 'review-next',
    recovery_id: 'recovery-1',
    recovery_ordinal: 1,
  });
});

test('rejects self, cross-record, and wrong-root successor authority', () => {
  const cases = [
    successor({ review_id: 'review-root' }),
    successor({ record_id: 'record-other' }),
    successor({ root_review_id: 'review-other' }),
  ];
  for (const candidate of cases) {
    assert.throws(
      () => validateSuccessor({ predecessor: attempt(), successor: candidate }),
      (error) => error.code === 'APR_LINEAGE_INVALID'
    );
  }
});

test('rejects cyclic successor authority in the complete lineage', () => {
  const inspected = inspectRecordLineage({
    schema: 'ai-peer-review.lineage-receipt/v1',
    complete: true,
    attempts: [attempt(), successor({ successor_review_id: 'review-root' })],
  });
  assert.equal(inspected.status, 'lineage-invalid');
  assert.equal(inspected.reasons.includes('cycle'), true);
});
