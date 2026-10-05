// @story #144
// Retained public facts only. Original private events are never replayed by these tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { checkRetainedLineageProof } from '../../scripts/lib/runtime-contract-evidence.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const git = (args) =>
  execFileSync('git', args, {
    cwd: root,
    maxBuffer: 32 * 1024 * 1024,
    env: Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_'))),
  });
function actual() {
  const receipt = JSON.parse(
    readFileSync(
      path.join(
        root,
        'evidence/portable-runtime/contracts/review-lineage/review-6522bc912d65661298c2b1a072c32f0b.json'
      )
    )
  );
  const artifacts = new Map(),
    p = receipt.reviewReference;
  const refs = [
    p.subject,
    p.manifest,
    p.finalResponse,
    ...receipt.members,
    ...receipt.verifier.sources,
  ];
  for (const r of refs)
    artifacts.set(r.revision + ':' + r.path, git(['show', r.revision + ':' + r.path]));
  artifacts.set(
    'commit:' + p.finalization.revision,
    git(['show', '--no-patch', '--format=%B', p.finalization.revision])
  );
  artifacts.set(
    'parent:' + p.finalization.revision,
    git(['rev-list', '--parents', '-n', '1', p.finalization.revision])
      .toString()
      .trim()
      .split(' ')
      .slice(1)
      .join(' ')
  );
  for (const r of [p.manifest, p.finalResponse])
    artifacts.set(
      'tree:' + p.finalization.revision + ':' + r.path,
      git(['show', p.finalization.revision + ':' + r.path])
    );
  return { receipt, reviewReference: p, artifacts };
}
test('[#144] actual retained canonical receipt checks all public members without claiming CI original replay', () => {
  const result = checkRetainedLineageProof(actual());
  assert.equal(result.receiptCoherent, true, JSON.stringify(result.blockers));
  assert.equal(result.originalPrivateReplay, 'unavailable');
});
for (const [label, change, blocker] of [
  [
    'canonical digest',
    (x) => {
      x.receipt.attempt.canonicalEventDigest = 'sha256:' + 'f'.repeat(64);
    },
    'lineage-proof-canonical-receipt-mismatch',
  ],
  [
    'author fingerprint',
    (x) => {
      x.receipt.identities.authorFingerprint = 'sha256:' + 'f'.repeat(64);
    },
    'lineage-proof-identity-mismatch',
  ],
  [
    'original member bytes',
    (x) => {
      const r = x.receipt.members[0];
      x.artifacts.delete(r.revision + ':' + r.path);
    },
    'lineage-proof-member-bytes-invalid',
  ],
  [
    'missing historical member',
    (x) => {
      x.receipt.members.shift();
    },
    'lineage-proof-member-set-incomplete',
  ],
  [
    'verifier source bytes',
    (x) => {
      const r = x.receipt.verifier.sources[0];
      x.artifacts.delete(r.revision + ':' + r.path);
    },
    'lineage-proof-verifier-bytes-invalid',
  ],
]) {
  test('[#144] retained canonical public proof refuses altered ' + label, () => {
    const x = actual();
    change(x);
    const result = checkRetainedLineageProof(x);
    assert.equal(result.receiptCoherent, false);
    assert.ok(result.blockers.includes(blocker), JSON.stringify(result.blockers));
  });
}
