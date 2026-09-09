import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { joinReview, resumeReview, startReview, statusReview } from '../../src/cli/run.mjs';
import { participantIdentity } from '../../src/identity/registry.mjs';

const NOW = '2026-09-08T12:00:00.000Z';

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

async function joinedFixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'apr-status-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-b', 'trunk'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: root });
  mkdirSync(path.join(root, 'docs'));
  writeFileSync(path.join(root, 'docs/example.md'), '# Example\n');
  writeFileSync(path.join(root, '.git/info/exclude'), '.scratch/peer-review/\n');
  execFileSync('git', ['add', 'docs/example.md'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'fixture'], { cwd: root, stdio: 'ignore' });
  const started = await startReview({
    cwd: root,
    artifact: 'docs/example.md',
    artifactKind: 'spec',
    identity: identity('author', 'author-session'),
    reviewId: 'review-status',
    now: NOW,
  });
  await joinReview({
    cwd: root,
    invitation: started.paths.reviewer_invitation,
    identity: identity('reviewer', 'reviewer-session'),
    now: NOW,
  });
  return started;
}

test('status before join names the exact sealed invitation path', async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'apr-status-invite-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-b', 'trunk'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: root });
  mkdirSync(path.join(root, 'docs'));
  writeFileSync(path.join(root, 'docs/example.md'), '# Example\n');
  writeFileSync(path.join(root, '.git/info/exclude'), '.scratch/peer-review/\n');
  execFileSync('git', ['add', 'docs/example.md'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'fixture'], { cwd: root, stdio: 'ignore' });
  const started = await startReview({
    cwd: root,
    artifact: 'docs/example.md',
    artifactKind: 'spec',
    identity: identity('author', 'author-session'),
    reviewId: 'review-status-invite',
    now: NOW,
  });
  const status = statusReview(started.paths.workspace, { now: NOW });
  assert.equal(status.next_action.command, `peer-review join ${started.paths.reviewer_invitation}`);
  assert.equal(status.paths.invitation, started.paths.reviewer_invitation);
});

test('status is event-derived, read-only, redacted, and returns one exact next action', async (t) => {
  const started = await joinedFixture(t);
  const beforeEvents = readFileSync(started.paths.events);
  const beforeProtocol = readFileSync(path.join(started.paths.workspace, 'protocol.json'));
  const status = statusReview(started.paths.workspace, { now: NOW });
  assert.equal(status.schema, 'ai-peer-review.cli-result/v1');
  assert.equal(status.state, 'reviewer-turn');
  assert.deepEqual(status.next_action, {
    action: 'reviewer-submit',
    command: `peer-review submit ${started.paths.workspace}`,
  });
  assert.equal(status.claim.status, 'active');
  assert.equal(JSON.stringify(status).includes('session_fingerprint'), false);
  assert.equal(JSON.stringify(status).includes('claim_id'), false);
  assert.equal(JSON.stringify(status).includes('"pid"'), false);
  assert.deepEqual(readFileSync(started.paths.events), beforeEvents);
  assert.deepEqual(
    readFileSync(path.join(started.paths.workspace, 'protocol.json')),
    beforeProtocol
  );
  assert.equal(
    statusReview(started.paths.workspace, { now: '2026-09-09T00:00:01.000Z' }).claim.status,
    'stale'
  );
});

test('resume returns current actor instructions without polling or mutation', async (t) => {
  const started = await joinedFixture(t);
  const before = readFileSync(started.paths.events);
  const resumed = resumeReview(started.paths.workspace, { now: NOW });
  assert.equal(resumed.command, 'resume');
  assert.equal(resumed.role, 'reviewer');
  assert.match(resumed.instructions, /reviewer response/i);
  assert.equal(resumed.paths.response.endsWith('reviewer-response-1.md'), true);
  assert.match(resumed.instructions, new RegExp(resumed.paths.response.replaceAll('/', '\\/')));
  assert.deepEqual(readFileSync(started.paths.events), before);
});
