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

import { readFileSync } from 'node:fs';
const actualReceipts = [
  'review-58b490491800f0c13d64191cb58071b5',
  'review-057079566301a0106537dde070ea518a',
  'review-a4157c49c11ad9d12836d7bfea0df472',
].map((id) =>
  JSON.parse(
    readFileSync(
      new URL(
        '../../evidence/portable-runtime/contracts/review-lineage/' + id + '.json',
        import.meta.url
      ),
      'utf8'
    )
  )
);
test('[#144] actual generated safe receipts retain closed grammar without granting review authority', () => {
  for (const value of actualReceipts) assert.equal(api.validateRuntimeLineageProof(value), true);
});
for (const [name, change] of [
  [
    'raw provider handle',
    (p) => {
      p.identities.session_handle = 'private';
    },
  ],
  [
    'unknown event proof field',
    (p) => {
      p.attempt.claimedProof = true;
    },
  ],
  [
    'CI replay overstatement',
    (p) => {
      p.reproducibility.ciOriginalEventReplay = 'complete';
    },
  ],
  [
    'missing member',
    (p) => {
      p.members = [];
    },
  ],
  [
    'different target',
    (p) => {
      p.reviewReference.reviewId = 'review-other';
    },
  ],
  [
    'equal participants',
    (p) => {
      p.identities.reviewerFingerprint = p.identities.authorFingerprint;
    },
  ],
  [
    'missing source interpreter',
    (p) => {
      delete p.producer.sources['src/protocol/reducer.mjs'];
    },
  ],
  [
    'different producer interpreter',
    (p) => {
      p.producer.sources['src/protocol/reducer.mjs'] = '0'.repeat(64);
    },
  ],
  [
    'uncommitted verifier omission',
    (p) => {
      p.verifier.sources = [];
    },
  ],
  [
    'incoherent event count',
    (p) => {
      p.attempt.eventCount = 1;
    },
  ],
  [
    'missing terminal proof',
    (p) => {
      delete p.checks.terminalTransaction;
    },
  ],
  [
    'failed source profile',
    (p) => {
      p.checks.producerSourceProfile = false;
    },
  ],
  [
    'stronger signer assurance',
    (p) => {
      p.identities.authorityAssurance = 'host-verified';
      p.reproducibility.assurance = 'host-verified';
    },
  ],
])
  test('[#144] retained safe proof refuses ' + name, () => {
    const p = structuredClone(actualReceipts[0]);
    change(p);
    assert.equal(api.validateRuntimeLineageProof(p), false);
  });

test('[#144] unrelated runtime closure cannot select the known producer profile', () => {
  const p = structuredClone(actualReceipts[0]);
  p.producer.runtimeImageDigest = 'sha256:' + '0'.repeat(64);
  assert.equal(api.validateRuntimeLineageProof(p), false);
});
