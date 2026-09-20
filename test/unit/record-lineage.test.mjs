import test from 'node:test';
import assert from 'node:assert/strict';

import { inspectRecordLineage, validateSuccessor } from '../../src/protocol/record-lineage.mjs';
import * as publicApi from '../../src/public-api.mjs';

const DIGEST_A = `sha256:${'a'.repeat(64)}`;
const DIGEST_B = `sha256:${'b'.repeat(64)}`;
const DIGEST_C = `sha256:${'c'.repeat(64)}`;

function attempt(overrides = {}) {
  return {
    review_id: 'review-root',
    record_id: 'review-root',
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

function validReceipt() {
  return {
    schema: 'ai-peer-review.lineage-receipt/v1',
    complete: true,
    attempts: [
      attempt(),
      attempt({
        review_id: 'review-next',
        recovery_ordinal: 1,
        predecessor_review_id: 'review-root',
        successor_review_id: null,
        recovery_id: 'recovery-1',
        recovery_claim_digest: DIGEST_C,
        reciprocal_receipt_digest: DIGEST_A,
        event_log_digest: DIGEST_C,
      }),
    ],
  };
}

test('exports read-only lineage inspection and successor validation', () => {
  assert.equal(publicApi.inspectRecordLineage, inspectRecordLineage);
  assert.equal(publicApi.validateSuccessor, validateSuccessor);
});

test('accepts one complete linear receipt and preserves ordered inspection evidence', () => {
  const inspected = inspectRecordLineage(validReceipt());
  assert.equal(inspected.status, 'complete');
  assert.deepEqual(
    inspected.attempts.map((entry) => [entry.review_id, entry.recovery_ordinal]),
    [
      ['review-root', 0],
      ['review-next', 1],
    ]
  );
  assert.equal(Object.isFrozen(inspected), true);
});

test('reports absent receipt evidence as lineage-unavailable without claiming contradiction', () => {
  const inspected = inspectRecordLineage({
    schema: 'ai-peer-review.lineage-receipt/v1',
    complete: false,
    attempts: [attempt({ successor_review_id: null, reciprocal_receipt_digest: null })],
    missing: ['review-next'],
  });
  assert.equal(inspected.status, 'lineage-unavailable');
  assert.deepEqual(inspected.missing, ['review-next']);
});

test('reports a legacy terminal manifest after scratch loss as incomplete-unavailable', () => {
  const inspected = inspectRecordLineage({
    schema: 'ai-peer-review.manifest/v1',
    review_id: 'legacy-review',
    status: 'accepted',
  });
  assert.equal(inspected.status, 'incomplete-unavailable');
  assert.deepEqual(inspected.missing, ['lineage_receipt:legacy-review']);
});

test('rejects cross-record, cycle, ordinal gap, grant gap, and digest conflict as lineage-invalid', () => {
  const cases = [
    ['cross-record', (receipt) => (receipt.attempts[1].record_id = 'other-record')],
    ['cycle', (receipt) => (receipt.attempts[1].successor_review_id = 'review-root')],
    ['ordinal-gap', (receipt) => (receipt.attempts[1].recovery_ordinal = 2)],
    [
      'grant-gap',
      (receipt) => {
        receipt.attempts[1].recovery_ordinal = 2;
        receipt.attempts[1].consumed_grant_digest = null;
      },
    ],
    ['digest-conflict', (receipt) => (receipt.attempts[1].reciprocal_receipt_digest = DIGEST_B)],
  ];
  for (const [reason, mutate] of cases) {
    const receipt = validReceipt();
    mutate(receipt);
    const inspected = inspectRecordLineage(receipt);
    assert.equal(inspected.status, 'lineage-invalid', reason);
    assert.equal(inspected.reasons.includes(reason), true, reason);
  }
});

test('validates a distinct reciprocal successor and refuses a self or mismatched edge', () => {
  const receipt = validReceipt();
  const valid = validateSuccessor({
    predecessor: receipt.attempts[0],
    successor: receipt.attempts[1],
  });
  assert.equal(valid.successor_review_id, 'review-next');

  assert.throws(
    () =>
      validateSuccessor({
        predecessor: receipt.attempts[0],
        successor: { ...receipt.attempts[1], predecessor_review_id: 'wrong' },
      }),
    (error) => error.code === 'APR_LINEAGE_INVALID'
  );
});

test('validates a reciprocal successor edge beyond the first recovery', () => {
  const predecessor = attempt({
    review_id: 'review-next',
    recovery_ordinal: 1,
    predecessor_review_id: 'review-root',
    successor_review_id: 'review-third',
    recovery_id: 'recovery-1',
    recovery_claim_digest: DIGEST_C,
  });
  const successor = attempt({
    review_id: 'review-third',
    recovery_ordinal: 2,
    predecessor_review_id: 'review-next',
    successor_review_id: null,
    recovery_id: 'recovery-2',
    recovery_claim_digest: DIGEST_C,
    consumed_grant_digest: DIGEST_C,
  });
  assert.equal(validateSuccessor({ predecessor, successor }).recovery_ordinal, 2);
});
