import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const PARITY = Object.freeze([
  [
    'lifecycle and turn budget',
    ['test/integration/budget-intervention.test.mjs', 'test/unit/reducer.test.mjs'],
  ],
  [
    'supplements and good-enough intervention',
    ['test/integration/supplements.test.mjs', 'test/integration/finalization.test.mjs'],
  ],
  [
    'consistent snapshots and repository boundary',
    ['test/integration/no-commit.test.mjs', 'test/unit/repository.test.mjs'],
  ],
  [
    'manual and resume handoff',
    ['test/integration/submit.test.mjs', 'test/unit/transport.test.mjs'],
  ],
  [
    'provider session identity',
    ['test/unit/identity.test.mjs', 'test/integration/claims.test.mjs'],
  ],
  [
    'exact-path finalization and index preservation',
    ['test/integration/finalization.test.mjs', 'test/integration/git-transaction.test.mjs'],
  ],
  [
    'archive collision replaced by collision-safe collateral reservation',
    ['test/unit/responses.test.mjs'],
  ],
  ['AITM occupancy replaced by review-scoped event claims', ['test/integration/claims.test.mjs']],
  [
    'AITM archive index replaced by deterministic terminal manifest',
    ['test/unit/manifest.test.mjs', 'test/golden/manifests.test.mjs'],
  ],
]);

test('every retained legacy behavior has a named standalone parity owner', () => {
  assert.equal(new Set(PARITY.map(([behavior]) => behavior)).size, PARITY.length);
  for (const [behavior, files] of PARITY) {
    assert.ok(files.length > 0, behavior);
    for (const file of files)
      assert.equal(existsSync(path.join(root, file)), true, `${behavior}: ${file}`);
  }
});

test('publishable HEAD contains no parity-gated legacy path', () => {
  for (const legacy of [
    'scripts/review',
    'scripts/providers',
    'scripts/tests',
    'docs/superpowers',
  ]) {
    const target = path.join(root, legacy);
    const files = existsSync(target)
      ? readdirSync(target, { recursive: true, withFileTypes: true }).filter((entry) =>
          entry.isFile()
        )
      : [];
    assert.deepEqual(files, [], legacy);
  }
});
