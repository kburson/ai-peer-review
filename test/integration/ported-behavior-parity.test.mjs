import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const LEGACY_INVENTORY = '37a30d8ec124f831aee7974957df12ac226bacbf';

// Each immutable legacy test source maps its individual named test behaviors to
// exact standalone test names. Counts pin the full source behavior inventory.
const MIGRATIONS = Object.freeze([
  {
    source: 'scripts/tests/fixtures/co-review-budget-cases.mjs',
    behaviorCount: 12,
    targets: [
      'signed continuation adds turns and exact retry is idempotent',
      'final author turn enters intervention in commit and no-commit modes',
    ],
  },
  {
    source: 'scripts/tests/fixtures/co-review-consistency-cases.mjs',
    behaviorCount: 10,
    targets: [
      'changed no-commit snapshot blocks exact handoff retry without changing events',
      'transaction refuses changed HEAD, owned overlap, and altered sealed bytes before commit',
    ],
  },
  {
    source: 'scripts/tests/fixtures/co-review-e2e-cases.mjs',
    behaviorCount: 4,
    targets: ['consensus finalization commits only acceptance and deterministic manifest'],
  },
  {
    source: 'scripts/tests/fixtures/co-review-finalization-cases.mjs',
    behaviorCount: 48,
    targets: [
      'consensus finalization commits only acceptance and deterministic manifest',
      'normal human override recovers an exact commit after interruption',
      'terminal retry rejects a tampered retained manifest',
    ],
  },
  {
    source: 'scripts/tests/fixtures/co-review-handoff-cases.mjs',
    behaviorCount: 27,
    targets: [
      'reviewer submission resumes every interrupted handoff checkpoint exactly once',
      'author submission resumes every interrupted commit handoff checkpoint exactly once',
    ],
  },
  {
    source: 'scripts/tests/fixtures/co-review-start-cases.mjs',
    behaviorCount: 20,
    targets: [
      'start performs preflight checks before mutation and writes default event-first collateral',
      'join binds the same physical worktree and a distinct reviewer before drafting',
    ],
  },
  {
    source: 'scripts/tests/fixtures/co-review-supplement-cases.mjs',
    behaviorCount: 11,
    targets: [
      'supplement bytes are normalized, frozen, and acknowledged by the next targeted draft',
      'good-enough finalization rejects non-budget intervention authority',
    ],
  },
  {
    source: 'scripts/tests/integration/review/co-review-finalization.test.mjs',
    behaviorCount: 0,
    targets: ['consensus finalization commits only acceptance and deterministic manifest'],
  },
  {
    source: 'scripts/tests/integration/review/co-review-fixture-cost.test.mjs',
    behaviorCount: 3,
    targets: ['every transaction checkpoint can retry without consuming unrelated staged state'],
  },
  {
    source: 'scripts/tests/integration/review/co-review-provider-session.test.mjs',
    behaviorCount: 7,
    targets: [
      'resolves runtime identity for every provider and prefers it over declared identity',
      'fails closed when multiple runtime providers are active',
      'recover inspection is read-only and same-session reclaim is idempotent',
    ],
  },
  {
    source: 'scripts/tests/integration/review/co-review.test.mjs',
    behaviorCount: 30,
    targets: [
      'all offline help topics derive complete contracts from the frozen command catalog',
      'allows the complete lifecycle matrix and derives exact states',
      'stale status is derived without mutation or PID liveness probing',
    ],
  },
  {
    source: 'scripts/tests/integration/task-tracker/lib/co-review-reviewer-capability.test.mjs',
    behaviorCount: 2,
    targets: ['reviewer guard permits only closed package commands for exact authority'],
  },
  {
    source: 'scripts/tests/slow/review/co-review-boundaries.test.mjs',
    behaviorCount: 9,
    targets: [
      'discovers canonical roots and Git paths from a linked worktree',
      'reviewer submit rejects a different physical worktree',
      'transaction seals working, index, and committed Git modes',
    ],
  },
  {
    source: 'scripts/tests/unit/review/co-review-index.test.mjs',
    behaviorCount: 10,
    targets: [
      'claims record random authority, diagnostic PID, and default eight-hour expiry',
      'delivery IDs are unique authority keys',
      'manifest rendering is deterministic, ordered, and privacy bounded',
    ],
  },
]);

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
  const legacyTestFiles = git('ls-tree', '-r', '--name-only', LEGACY_INVENTORY, 'scripts/tests')
    .trim()
    .split('\n')
    .filter((file) => file.endsWith('.test.mjs'));
  const behaviorSources = git(
    'grep',
    '-l',
    '-E',
    '(^|[^A-Za-z])test\\(',
    LEGACY_INVENTORY,
    '--',
    'scripts/tests'
  )
    .trim()
    .split('\n')
    .map((entry) => entry.slice(entry.indexOf(':') + 1))
    .filter((file) => namedTests(git('show', `${LEGACY_INVENTORY}:${file}`)).length > 0);
  const expectedSources = [...new Set([...legacyTestFiles, ...behaviorSources])].sort();
  assert.deepEqual(
    MIGRATIONS.map(({ source }) => source).sort(),
    expectedSources,
    'the static ledger must cover every legacy test file and behavior source'
  );

  const currentTestCorpus = filesUnder(path.join(root, 'test'))
    .filter((file) => file.endsWith('.mjs'))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
  const currentNames = new Set(namedTests(currentTestCorpus));
  const behaviorKeys = new Set();
  for (const migration of MIGRATIONS) {
    const behaviors = namedTests(git('show', `${LEGACY_INVENTORY}:${migration.source}`));
    assert.equal(behaviors.length, migration.behaviorCount, migration.source);
    assert.ok(migration.targets.length > 0, migration.source);
    for (const target of migration.targets)
      assert.equal(currentNames.has(target), true, `${migration.source} -> ${target}`);
    for (const [index, behavior] of behaviors.entries()) {
      const key = `${migration.source}:${index + 1}:${behavior}`;
      assert.equal(behaviorKeys.has(key), false, key);
      behaviorKeys.add(key);
    }
  }
  assert.equal(
    behaviorKeys.size,
    MIGRATIONS.reduce((total, migration) => total + migration.behaviorCount, 0)
  );
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
