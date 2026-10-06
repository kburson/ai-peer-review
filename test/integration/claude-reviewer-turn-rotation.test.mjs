import {
  fixtureSelection,
  fixtureStartupDeps,
  fixtureObservation,
} from '../helpers/internal-api.mjs';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { participantIdentity } from '../../src/identity/registry.mjs';
import { buildReviewerExecutionContract } from '../../src/provider/execution-contract.mjs';
import {
  joinReview,
  startReview,
  submitAuthorTurn,
  submitReviewTurn,
} from '../helpers/internal-api.mjs';

const NOW = '2026-09-17T12:00:00.000Z';

function git(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function identity(role) {
  return participantIdentity({
    role,
    host: role === 'reviewer' ? 'claude-code' : 'codex',
    provider: role === 'reviewer' ? 'anthropic' : 'openai',
    modelId: role === 'reviewer' ? 'claude-opus-5' : 'gpt-test',
    modelDisplay: role === 'reviewer' ? 'Claude Opus 5' : 'GPT Test',
    sessionId: `turn-rotation-${role}`,
    source: 'runtime',
    joinedAt: NOW,
  });
}

function replaceSection(file, heading, content) {
  const text = readFileSync(file, 'utf8');
  const pattern = new RegExp(`(## ${heading}\\r?\\n\\r?\\n)[\\s\\S]*?(?=\\r?\\n\\r?\\n## |$)`);
  writeFileSync(file, text.replace(pattern, `$1${content}`));
}

test('current authority rotates a registered Claude reviewer to response two without another join', async (t) => {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'apr-turn-rotation-')));
  git(root, ['init', '-b', 'trunk']);
  git(root, ['config', 'user.email', 'test@example.com']);
  git(root, ['config', 'user.name', 'Test']);
  mkdirSync(path.join(root, 'docs'));
  writeFileSync(path.join(root, 'docs', 'artifact.md'), '# Artifact\n');
  mkdirSync(path.join(root, '.git', 'info'), { recursive: true });
  writeFileSync(path.join(root, '.git', 'info', 'exclude'), '.scratch/peer-review/\n');
  git(root, ['add', 'docs/artifact.md']);
  git(root, ['commit', '-m', 'fixture']);
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const author = identity('author');
  const reviewer = identity('reviewer');
  const started = await startReview(
    {
      ...fixtureSelection('claude', 'claude-opus-5', 'high'),
      cwd: root,
      artifact: 'docs/artifact.md',
      artifactKind: 'spec',
      identity: author,
      reviewId: 'review-turn-rotation',
      now: NOW,
    },
    fixtureStartupDeps
  );
  const first = buildReviewerExecutionContract({
    workspace: started.paths.workspace,
    host: 'claude',
    model: 'claude-opus-5',
    effort: 'high',
  });
  assert.equal(first.join_required, true);
  assert.match(first.response, /reviewer-response-1\.md$/u);

  const joined = await joinReview({
    runtimeObservation: fixtureObservation('anthropic', 'claude-code', 'claude-opus-5', 'high'),
    cwd: root,
    invitation: started.paths.reviewer_invitation,
    identity: reviewer,
    now: NOW,
  });
  replaceSection(joined.paths.response, 'Summary', 'One required repair.');
  replaceSection(joined.paths.response, 'Findings', '### R1-F001 — Repair\n\nFix it.');
  replaceSection(joined.paths.response, 'Required changes', '- Address R1-F001.');
  replaceSection(joined.paths.response, 'Optional suggestions', 'None.');
  replaceSection(joined.paths.response, 'Decision', 'revisions-requested');
  const handoff = await submitReviewTurn({
    cwd: root,
    workspace: started.paths.workspace,
    identity: reviewer,
    decision: 'revisions-requested',
    now: '2026-09-17T12:01:00.000Z',
  });
  writeFileSync(path.join(root, 'docs', 'artifact.md'), '# Artifact repaired\n');
  replaceSection(handoff.paths.response, 'Summary', 'Repaired.');
  replaceSection(handoff.paths.response, 'Finding dispositions', '- R1-F001: fixed');
  replaceSection(handoff.paths.response, 'Changes made', 'Updated the artifact.');
  replaceSection(handoff.paths.response, 'Declined changes and rationale', 'None.');
  replaceSection(handoff.paths.response, 'Verification', 'Reviewed exact bytes.');
  await submitAuthorTurn({
    cwd: root,
    workspace: started.paths.workspace,
    identity: author,
    now: '2026-09-17T12:02:00.000Z',
  });

  const second = buildReviewerExecutionContract({
    workspace: started.paths.workspace,
    host: 'claude',
    model: 'claude-opus-5',
    effort: 'high',
  });
  assert.equal(second.join_required, false);
  assert.equal(second.commands.join, null);
  assert.match(second.response, /reviewer-response-2\.md$/u);
  assert.equal(second.authority.reviewer_fingerprint, reviewer.session_fingerprint);
  assert.ok(second.authority.sequence > first.authority.sequence);
  assert.ok(second.authority.revision > first.authority.revision);
});
