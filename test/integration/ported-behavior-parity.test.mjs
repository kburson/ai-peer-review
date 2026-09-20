import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ledger = JSON.parse(
  readFileSync(path.join(root, 'test/fixtures/legacy-behavior-parity.json'), 'utf8')
);

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' });
}

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(absolute) : [absolute];
  });
}

function namedTests(source) {
  return [...source.matchAll(/(^|[^.\w])test\s*\(\s*([`'"])([\s\S]*?)\2/g)].map(
    (match) => match[3]
  );
}

test('every immutable legacy test behavior has an exact standalone parity owner', () => {
  assert.equal(ledger.schema, 'ai-peer-review.legacy-test-parity/v1');
  const legacyTestFiles = git('ls-tree', '-r', '--name-only', ledger.legacy_commit, 'scripts/tests')
    .trim()
    .split('\n')
    .filter((file) => file.endsWith('.test.mjs'))
    .sort();
  assert.deepEqual(ledger.legacy_test_files, legacyTestFiles);

  const behaviorSources = git(
    'grep',
    '-l',
    '-E',
    '(^|[^A-Za-z])test\\(',
    ledger.legacy_commit,
    '--',
    'scripts/tests'
  )
    .trim()
    .split('\n')
    .map((entry) => entry.slice(entry.indexOf(':') + 1));
  const extracted = behaviorSources.flatMap((source) =>
    namedTests(git('show', `${ledger.legacy_commit}:${source}`)).map((behavior) => ({
      source,
      behavior,
    }))
  );
  assert.deepEqual(
    ledger.entries.map(({ source, behavior }) => ({ source, behavior })),
    extracted,
    'the ledger must name every immutable legacy test behavior in source order'
  );

  const currentTestCorpus = filesUnder(path.join(root, 'test'))
    .filter(
      (file) => file.endsWith('.mjs') && path.basename(file) !== 'ported-behavior-parity.test.mjs'
    )
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
  const currentNames = new Set(namedTests(currentTestCorpus));
  const keys = new Set();
  for (const entry of ledger.entries) {
    assert.ok(['ported', 'intentionally-replaced'].includes(entry.disposition), entry.behavior);
    assert.ok(entry.rationale.length >= 40, entry.behavior);
    assert.ok(entry.owners.length > 0, entry.behavior);
    for (const owner of entry.owners)
      assert.equal(currentNames.has(owner), true, `${entry.behavior} -> ${owner}`);
    const key = `${entry.source}\0${entry.behavior}`;
    assert.equal(keys.has(key), false, key);
    keys.add(key);
  }
  assert.equal(keys.size, extracted.length);
});

test('publishable HEAD contains no parity-gated legacy path', () => {
  for (const legacy of ['scripts/review', 'scripts/providers', 'scripts/tests']) {
    const target = path.join(root, legacy);
    const files = existsSync(target)
      ? readdirSync(target, { recursive: true, withFileTypes: true }).filter((entry) =>
          entry.isFile()
        )
      : [];
    assert.deepEqual(files, [], legacy);
  }
  // `docs/superpowers/{specs,plans}` is this repository's own spec and plan
  // layout, mandated by the superpowers skill. The gate was never the directory
  // name: it is that the inherited AITM co-review documents deleted at release
  // commit 9b43eff must not return. Assert those exact paths rather than the
  // namespace, so the repository can use the layout the skill requires. The
  // list is the `docs/superpowers` subset of the extraction manifest's frozen
  // retained inventory, so it cannot drift from the extraction record.
  const inheritedDocs = JSON.parse(
    readFileSync(path.join(root, 'provenance/extraction-manifest.json'), 'utf8')
  ).retained_path_inventory.paths.filter((pathname) => pathname.startsWith('docs/superpowers/'));
  assert.equal(inheritedDocs.length, 18, 'inherited AITM co-review document inventory');
  const present = inheritedDocs.filter((pathname) => existsSync(path.join(root, pathname)));
  assert.deepEqual(present, [], 'inherited AITM co-review documents');
});
