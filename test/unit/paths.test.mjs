import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveContainedPath, resolveReviewPaths } from '../../src/collateral/paths.mjs';

function containedFixture(t) {
  const parent = mkdtempSync(path.join(tmpdir(), 'ai-peer-review-paths-'));
  const root = path.join(parent, 'repository');
  const outside = path.join(parent, 'outside');
  mkdirSync(path.join(root, 'docs'), { recursive: true });
  mkdirSync(outside);
  symlinkSync(outside, path.join(root, 'docs', 'outside-link'));
  symlinkSync(path.join(parent, 'missing-outside'), path.join(root, 'docs', 'dangling-link'));
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  return { root: realpathSync(root), outside: realpathSync(outside) };
}

test('resolves contained future paths and returns POSIX-relative output', (t) => {
  const { root } = containedFixture(t);
  const resolved = resolveContainedPath(root, 'docs/reviews/future.md', 'response');
  assert.equal(resolved.absolute, path.join(root, 'docs', 'reviews', 'future.md'));
  assert.equal(resolved.relative, 'docs/reviews/future.md');
});

test('accepts an alternate lexical path whose physical target is inside the repository', (t) => {
  const { root } = containedFixture(t);
  const alias = path.join(path.dirname(root), 'repository-alias');
  symlinkSync(root, alias, process.platform === 'win32' ? 'junction' : 'dir');
  writeFileSync(path.join(root, 'docs', 'focus.md'), '# Focus\n');

  const resolved = resolveContainedPath(root, path.join(alias, 'docs', 'focus.md'), 'focus');

  assert.equal(resolved.absolute, path.join(root, 'docs', 'focus.md'));
  assert.equal(resolved.relative, 'docs/focus.md');
});

test('refuses traversal, the repository root, and physical symlink escapes', (t) => {
  const { root } = containedFixture(t);
  for (const candidate of ['.', '..', '../outside.md', path.dirname(root)]) {
    assert.throws(
      () => resolveContainedPath(root, candidate, 'response'),
      (error) => error.code === 'APR_PATH_OUTSIDE_REPOSITORY'
    );
  }
  assert.throws(
    () => resolveContainedPath(root, 'docs/outside-link/file.md', 'response'),
    (error) => error.code === 'APR_PATH_OUTSIDE_REPOSITORY'
  );
  assert.throws(
    () => resolveContainedPath(root, 'docs/dangling-link/future.md', 'response'),
    (error) => error.code === 'APR_PATH_OUTSIDE_REPOSITORY'
  );
});

test('builds review-scoped destinations with short filenames', (t) => {
  const { root } = containedFixture(t);
  const paths = resolveReviewPaths({
    root,
    reviewsRoot: 'docs/peer-reviews',
    reviewPathTemplate: '<kind>/<date>-<name>-<review-id>',
    issue: 1534,
    kind: 'spec',
    name: 'Repository Boundary',
    date: '2026-09-08',
    reviewId: 'review-01',
  });

  assert.equal(paths.reviewScoped, true);
  assert.equal(
    paths.destination.relative,
    'docs/peer-reviews/spec/2026-09-08-repository-boundary-review-01'
  );
  assert.equal(paths.scratch.relative, '.scratch/peer-review/review-01');
  assert.equal(paths.reviewerResponse(2).relative.endsWith('/reviewer-response-2.md'), true);
  assert.equal(paths.authorResponse(2).relative.endsWith('/author-response-2.md'), true);
  assert.equal(path.basename(paths.humanDecision.absolute), 'human-decision.md');
  assert.equal(path.basename(paths.manifest.absolute), 'review-manifest.md');
});

test('qualifies filenames when the configured destination is shared', (t) => {
  const { root } = containedFixture(t);
  const paths = resolveReviewPaths({
    root,
    reviewsRoot: 'docs/superpowers/reviews',
    reviewPathTemplate: '<issue>/<kind>',
    issue: 1534,
    kind: 'plan',
    name: 'Extraction Plan',
    date: '2026-09-08',
    reviewId: 'review-02',
  });

  assert.equal(paths.reviewScoped, false);
  assert.equal(paths.destination.relative, 'docs/superpowers/reviews/1534/plan');
  assert.equal(
    path.basename(paths.reviewerResponse(1).absolute),
    '2026-09-08-extraction-plan-review-02-reviewer-response-1.md'
  );
  assert.equal(
    path.basename(paths.manifest.absolute),
    '2026-09-08-extraction-plan-review-02-review-manifest.md'
  );
});

test('rejects unknown placeholders, missing positive issue IDs, and unsafe identifiers', (t) => {
  const { root } = containedFixture(t);
  const base = {
    root,
    reviewsRoot: 'docs/peer-reviews',
    kind: 'spec',
    name: 'Artifact',
    date: '2026-09-08',
    reviewId: 'review-03',
  };
  assert.throws(
    () => resolveReviewPaths({ ...base, reviewPathTemplate: '<issue>/<kind>' }),
    (error) => error.code === 'APR_ISSUE_REQUIRED'
  );
  assert.throws(
    () => resolveReviewPaths({ ...base, reviewPathTemplate: '<kind>/<unknown>' }),
    (error) => error.code === 'APR_PATH_TEMPLATE_INVALID'
  );
  assert.throws(
    () => resolveReviewPaths({ ...base, reviewPathTemplate: '<kind>', reviewId: '../escape' }),
    (error) => error.code === 'APR_PATH_TEMPLATE_INVALID'
  );
});
