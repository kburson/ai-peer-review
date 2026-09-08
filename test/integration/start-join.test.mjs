import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { joinReview, startReview } from '../../src/cli/run.mjs';
import { participantIdentity } from '../../src/identity/registry.mjs';

const NOW = '2026-09-08T12:00:00.000Z';

function repositoryFixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'apr-start-'));
  execFileSync('git', ['init', '-b', 'trunk'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: root });
  mkdirSync(path.join(root, 'docs'));
  writeFileSync(path.join(root, 'docs/example.md'), '# Example\n');
  writeFileSync(path.join(root, '.git/info/exclude'), '.scratch/peer-review/\n');
  execFileSync('git', ['add', 'docs/example.md'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'fixture'], { cwd: root, stdio: 'ignore' });
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

function identity(role, session) {
  return participantIdentity({
    role,
    host: 'codex',
    provider: 'openai',
    modelId: 'gpt-test',
    modelDisplay: 'GPT Test',
    sessionId: session,
    source: 'runtime',
    joinedAt: NOW,
  });
}

test('start performs preflight checks before mutation and writes default event-first collateral', async (t) => {
  const fx = repositoryFixture();
  t.after(fx.cleanup);
  writeFileSync(path.join(fx.root, 'docs/example.md'), '# Dirty\n');
  await assert.rejects(
    startReview({
      cwd: fx.root,
      artifact: 'docs/example.md',
      artifactKind: 'spec',
      identity: identity('author', 'author-session'),
      reviewId: 'review-dirty',
      now: NOW,
    }),
    (error) => error.code === 'APR_ARTIFACT_DIRTY'
  );
  assert.equal(
    readFileSync(path.join(fx.root, '.git/info/exclude'), 'utf8'),
    '.scratch/peer-review/\n'
  );
  assert.throws(() =>
    readFileSync(path.join(fx.root, '.scratch/peer-review/review-dirty/events.jsonl'))
  );

  writeFileSync(path.join(fx.root, 'docs/example.md'), '# Example\n');
  const started = await startReview({
    cwd: fx.root,
    artifact: 'docs/example.md',
    artifactKind: 'spec',
    identity: identity('author', 'author-session'),
    reviewId: 'review-01',
    now: NOW,
  });
  assert.equal(started.schema, 'ai-peer-review.cli-result/v1');
  assert.equal(started.command, 'start');
  assert.equal(started.state, 'awaiting-reviewer');
  assert.equal(started.review.max_turns, 10);
  assert.equal(started.review.claim_ttl_ms, 8 * 60 * 60 * 1000);
  assert.equal(started.review.commit_mode, 'normal');
  assert.equal(started.review.authority.authority_policy, 'unavailable');
  assert.equal(readFileSync(started.paths.events, 'utf8').trim().split('\n').length, 1);
  assert.match(readFileSync(started.paths.author_startup, 'utf8'), /# Author startup/);
  assert.match(readFileSync(started.paths.reviewer_invitation, 'utf8'), /# Reviewer invitation/);
  const retried = await startReview({
    cwd: fx.root,
    artifact: 'docs/example.md',
    artifactKind: 'spec',
    identity: identity('author', 'author-session'),
    reviewId: 'review-01',
    now: '2026-09-08T13:00:00.000Z',
  });
  assert.equal(retried.paths.events, started.paths.events);
  assert.equal(readFileSync(started.paths.events, 'utf8').trim().split('\n').length, 1);
});

test('start refuses unsafe scratch and tracked collisions without creating authority', async (t) => {
  const unignored = repositoryFixture();
  t.after(unignored.cleanup);
  writeFileSync(path.join(unignored.root, '.git/info/exclude'), '');
  await assert.rejects(
    startReview({
      cwd: unignored.root,
      artifact: 'docs/example.md',
      artifactKind: 'spec',
      identity: identity('author', 'author-session'),
      reviewId: 'review-unignored',
      now: NOW,
    }),
    (error) => error.code === 'APR_SCRATCH_NOT_IGNORED'
  );

  const occupied = repositoryFixture();
  t.after(occupied.cleanup);
  const output = path.join(
    occupied.root,
    'docs/peer-reviews/spec/2026-09-08-example-review-occupied/author-startup.md'
  );
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, 'foreign bytes');
  await assert.rejects(
    startReview({
      cwd: occupied.root,
      artifact: 'docs/example.md',
      artifactKind: 'spec',
      identity: identity('author', 'author-session'),
      reviewId: 'review-occupied',
      now: NOW,
    }),
    (error) => error.code === 'APR_OUTPUT_COLLISION'
  );
  assert.equal(readFileSync(output, 'utf8'), 'foreign bytes');
  assert.throws(() =>
    readFileSync(path.join(occupied.root, '.scratch/peer-review/review-occupied/events.jsonl'))
  );
});

test('join binds the same physical worktree and a distinct reviewer before drafting', async (t) => {
  const fx = repositoryFixture();
  t.after(fx.cleanup);
  const author = identity('author', 'author-session');
  const started = await startReview({
    cwd: fx.root,
    artifact: 'docs/example.md',
    artifactKind: 'plan',
    identity: author,
    reviewId: 'review-join',
    now: NOW,
  });
  await assert.rejects(
    joinReview({
      cwd: fx.root,
      invitation: started.paths.reviewer_invitation,
      identity: { ...author, role: 'reviewer' },
      now: NOW,
    }),
    (error) => error.code === 'APR_IDENTITY_CONFLICT'
  );

  const joined = await joinReview({
    cwd: fx.root,
    invitation: started.paths.reviewer_invitation,
    identity: identity('reviewer', 'reviewer-session'),
    now: NOW,
  });
  assert.equal(joined.state, 'reviewer-turn');
  assert.equal(joined.next_action, 'reviewer-submit');
  assert.equal(joined.review.claim.role, 'reviewer');
  assert.match(readFileSync(joined.paths.response, 'utf8'), /role: "reviewer"/);
  assert.equal(readFileSync(started.paths.events, 'utf8').trim().split('\n').length, 3);
  const retried = await joinReview({
    cwd: fx.root,
    invitation: started.paths.reviewer_invitation,
    identity: identity('reviewer', 'reviewer-session'),
    now: '2026-09-08T13:00:00.000Z',
  });
  assert.equal(retried.paths.response, joined.paths.response);
  assert.equal(readFileSync(started.paths.events, 'utf8').trim().split('\n').length, 3);
});
