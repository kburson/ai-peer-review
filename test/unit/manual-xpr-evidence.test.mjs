// @story #106
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  evidencePath,
  verifyManualXprEvidence,
} from '../../scripts/verify-manual-xpr-evidence.mjs';

function evidenceFixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'apr-evidence-106-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const proof = JSON.parse(readFileSync(evidencePath));
  for (const relative of [evidencePath, proof.artifact.path, path.dirname(proof.manifest.path)]) {
    const target = path.join(root, relative);
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(relative, target, { recursive: true });
  }
  return { root, proof };
}

test('committed manual XPR evidence verifies accepted independent turns', () => {
  assert.deepEqual(verifyManualXprEvidence(), {
    review_id: 'review-b9a20b7ba40e0363b2cecb59a3293f6e',
    turns: 2,
    status: 'accepted',
  });
});

for (const target of ['artifact', 'accepted_response', 'manifest']) {
  test(`manual XPR verifier refuses changed ${target} bytes`, (t) => {
    const { root, proof } = evidenceFixture(t);
    writeFileSync(path.join(root, proof[target].path), 'changed');
    assert.throws(() => verifyManualXprEvidence(root));
  });
}

test('manual XPR verifier refuses an unsubmitted launch claim', (t) => {
  const { root, proof } = evidenceFixture(t);
  proof.initial_launch_status = 'outcome-unknown';
  writeFileSync(path.join(root, evidencePath), JSON.stringify(proof));
  assert.throws(() => verifyManualXprEvidence(root));
});
