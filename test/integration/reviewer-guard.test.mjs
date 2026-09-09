import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { deriveReviewerGuard } from '../../src/config/guards.mjs';

function fixture() {
  const repositoryRoot = mkdtempSync(path.join(os.tmpdir(), 'apr-guard-'));
  const workspace = path.join(repositoryRoot, '.scratch', 'peer-review', 'review-1');
  const response = path.join(repositoryRoot, 'docs', 'reviewer-1.md');
  mkdirSync(workspace, { recursive: true });
  mkdirSync(path.dirname(response), { recursive: true });
  writeFileSync(response, '# Review\n');
  return {
    repositoryRoot,
    status: {
      review_id: 'review-1',
      state: 'reviewer-turn',
      paths: { workspace, response },
      participant: { session_fingerprint: 'sha256:reviewer' },
    },
  };
}

test('reviewer guard permits only closed package commands for exact authority', () => {
  const { repositoryRoot, status } = fixture();
  const guard = deriveReviewerGuard(status, {
    repositoryRoot,
    worktreeRoot: repositoryRoot,
    sessionFingerprint: 'sha256:reviewer',
  });
  assert.equal(guard.check(['peer-review', 'status', status.paths.workspace, '--json']), true);
  assert.equal(guard.check(['peer-review', 'resume', status.paths.workspace]), true);
  assert.equal(
    guard.check(['peer-review', 'submit', status.paths.workspace, '--decision', 'accepted']),
    true
  );
  assert.equal(guard.checkOperation({ kind: 'write', path: status.paths.response }), true);
  assert.throws(
    () => guard.checkOperation({ kind: 'write', path: path.join(repositoryRoot, 'design.md') }),
    { code: 'APR_REVIEWER_GUARD' }
  );
});

for (const [name, argv] of [
  ['git', ['git', 'commit', '-am', 'review']],
  [
    'artifact write',
    (status) => ['tee', path.join(path.dirname(status.paths.response), 'design.md')],
  ],
  [
    'shell composition',
    (status) => ['peer-review', 'resume', `${status.paths.workspace};git status`],
  ],
  ['unknown flag', (status) => ['peer-review', 'resume', status.paths.workspace, '--force']],
  ['wrong workspace', () => ['peer-review', 'resume', '/other']],
]) {
  test(`reviewer guard rejects ${name}`, () => {
    const { repositoryRoot, status } = fixture();
    const guard = deriveReviewerGuard(status, {
      repositoryRoot,
      worktreeRoot: repositoryRoot,
      sessionFingerprint: 'sha256:reviewer',
    });
    const command = typeof argv === 'function' ? argv(status) : argv;
    assert.throws(() => guard.check(command), { code: 'APR_REVIEWER_GUARD' });
  });
}

test('reviewer guard fails closed for mismatched session or worktree', () => {
  const { repositoryRoot, status } = fixture();
  const other = mkdtempSync(path.join(os.tmpdir(), 'apr-guard-other-'));
  assert.throws(
    () =>
      deriveReviewerGuard(status, {
        repositoryRoot,
        worktreeRoot: other,
        sessionFingerprint: 'sha256:reviewer',
      }),
    { code: 'APR_REVIEWER_GUARD' }
  );
  assert.throws(
    () =>
      deriveReviewerGuard(status, {
        repositoryRoot,
        worktreeRoot: repositoryRoot,
        sessionFingerprint: 'sha256:other',
      }),
    { code: 'APR_REVIEWER_GUARD' }
  );
});
