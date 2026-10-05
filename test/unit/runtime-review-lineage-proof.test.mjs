// @story #144
import test from 'node:test';
import assert from 'node:assert/strict';
const api = await import('../../scripts/lib/runtime-review-lineage-proof.mjs').catch(() => ({}));
test('[#144] local public proof refuses unknown producer without selecting executable code', () => {
  assert.throws(
    () => api.verifyRuntimeReviewLineage({ workspace: '/missing', producerProfile: '0.4.2' }),
    /producer-profile-unsupported/
  );
});
test('[#144] local public proof requires exact normal review reference before reading journals', () => {
  assert.throws(
    () =>
      api.verifyRuntimeReviewLineage({
        workspace: '/missing',
        producerProfile: '0.4.1',
        reviewReference: { reviewId: 'caller' },
      }),
    /normal-review-reference-invalid/
  );
});
test('[#144] local public proof cannot be manufactured from a missing actual workspace', () => {
  const ref = {
    revision: 'a'.repeat(40),
    path: 'docs/artifact.md',
    blob: 'b'.repeat(40),
    sha256: 'c'.repeat(64),
  };
  assert.throws(
    () =>
      api.verifyRuntimeReviewLineage({
        workspace: '/missing',
        producerProfile: '0.4.1',
        reviewReference: {
          reviewId: 'review-missing',
          subject: ref,
          manifest: ref,
          finalResponse: ref,
          finalization: { revision: 'd'.repeat(40), sha256: 'e'.repeat(64) },
        },
      }),
    /actual-workspace-unavailable/
  );
});

test('[#144] retained proof grammar refuses caller success flags, raw handles and stronger replay claims', () => {
  for (const value of [
    { schema: 'ai-peer-review.runtime-review-lineage-proof/v1', checks: { persistedEvents: true } },
    { session_handle: 'private-provider-handle' },
    { reproducibility: { ciOriginalEventReplay: 'complete' } },
  ])
    assert.equal(api.validateRuntimeLineageProof(value), false);
});
