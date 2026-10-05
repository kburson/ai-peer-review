// @story #144
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { verifyRuntimeReviewLineage } from '../../scripts/lib/runtime-review-lineage-proof.mjs';
const r = {
  revision: 'a'.repeat(40),
  path: 'docs/artifact.md',
  blob: 'b'.repeat(40),
  sha256: 'c'.repeat(64),
};
const reviewReference = {
  reviewId: 'review-invalid-original',
  subject: r,
  manifest: r,
  finalResponse: r,
  finalization: { revision: 'd'.repeat(40), sha256: 'e'.repeat(64) },
};
for (const [name, write, want] of [
  ['truncated original journal', (p) => writeFileSync(p, '{}'), /event-log-corrupt/],
  [
    'duplicate original envelope key',
    (p) => writeFileSync(p, '{"schema":"first","schema":"second"}\n'),
    /duplicate/,
  ],
  ['non-regular original journal', (p) => mkdirSync(p), /private-source-file-unsafe/],
])
  test('[#144] actual-workspace verifier refuses ' + name, () => {
    const base = path.join(process.cwd(), '.scratch');
    mkdirSync(base, { recursive: true });
    const workspace = mkdtempSync(path.join(base, 'lineage-proof-test-'));
    try {
      write(path.join(workspace, 'events.jsonl'));
      assert.throws(
        () => verifyRuntimeReviewLineage({ workspace, reviewReference, producerProfile: '0.4.1' }),
        want
      );
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
