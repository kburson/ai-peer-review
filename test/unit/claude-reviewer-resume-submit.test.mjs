import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { run } from '../../src/cli/run.mjs';
import { fingerprintSession, participantIdentity } from '../../src/identity/registry.mjs';
import {
  buildClaudeReviewerResume,
  runClaudeReviewerLaunch,
} from '../../src/provider/claude-launch.mjs';
import { launchAuthority, launchFixture } from '../helpers/claude-launch-fixture.mjs';
import {
  fixtureObservation,
  fixtureSelection,
  fixtureStartupDeps,
  joinReview,
  startReview,
  statusReview,
  submitAuthorTurn,
  submitReviewTurn,
} from '../helpers/internal-api.mjs';

const NOW = '2026-09-17T12:00:00.000Z';

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function replaceSection(file, heading, content) {
  const source = readFileSync(file, 'utf8');
  const pattern = new RegExp(`(## ${heading}\\r?\\n\\r?\\n)[\\s\\S]*?(?=\\r?\\n\\r?\\n## |$)`);
  assert.match(source, pattern);
  writeFileSync(file, source.replace(pattern, `$1${content}`));
}

async function preparedTurnTwo(t) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'apr-claude-turn-two-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, ['init', '-b', 'trunk']);
  git(root, ['config', 'user.email', 'test@example.com']);
  git(root, ['config', 'user.name', 'Test']);
  mkdirSync(path.join(root, 'docs'));
  writeFileSync(path.join(root, 'docs', 'artifact.md'), '# Artifact\n');
  writeFileSync(path.join(root, '.git', 'info', 'exclude'), '.scratch/peer-review/\n');
  git(root, ['add', 'docs/artifact.md']);
  git(root, ['commit', '-m', 'fixture']);
  writeFileSync(
    path.join(root, '.ai-peer-review.json'),
    `${JSON.stringify({
      schema: 'ai-peer-review.config/v1',
      hosts: {
        claude: {
          identity: {
            provider: 'anthropic',
            host: 'claude-code',
            model_id: 'claude-opus-5',
            model_display: 'Claude Opus 5',
          },
        },
      },
    })}\n`
  );
  const identity = (role) =>
    participantIdentity({
      role,
      host: role === 'reviewer' ? 'claude-code' : 'codex',
      provider: role === 'reviewer' ? 'anthropic' : 'openai',
      modelId: role === 'reviewer' ? 'claude-opus-5' : 'gpt-test',
      modelDisplay: role === 'reviewer' ? 'Claude Opus 5' : 'GPT Test',
      sessionId: `turn-two-${role}`,
      source: role === 'reviewer' ? 'declared' : 'runtime',
      joinedAt: NOW,
    });
  const author = identity('author');
  const reviewer = identity('reviewer');
  const started = await startReview(
    {
      ...fixtureSelection('claude', 'claude-opus-5', 'high'),
      cwd: root,
      artifact: 'docs/artifact.md',
      artifactKind: 'spec',
      identity: author,
      reviewId: 'review-turn-two',
      now: NOW,
    },
    fixtureStartupDeps
  );
  const workspace = started.paths.workspace;
  const invitation = started.paths.reviewer_invitation;
  const joined = await joinReview({
    runtimeObservation: fixtureObservation(
      'anthropic',
      'claude-code',
      'claude-opus-5',
      'high',
      'declared'
    ),
    cwd: root,
    invitation,
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
    workspace,
    identity: reviewer,
    decision: 'revisions-requested',
    now: '2026-09-17T12:01:00.000Z',
  });
  writeFileSync(path.join(root, 'docs', 'artifact.md'), '# Artifact repaired\n');
  for (const [heading, content] of [
    ['Summary', 'Repaired.'],
    ['Finding dispositions', '- R1-F001: fixed'],
    ['Changes made', 'Updated the artifact.'],
    ['Declined changes and rationale', 'None.'],
    ['Verification', 'Reviewed exact bytes.'],
  ])
    replaceSection(handoff.paths.response, heading, content);
  await submitAuthorTurn({
    cwd: root,
    workspace,
    identity: author,
    now: '2026-09-17T12:02:00.000Z',
  });
  const pending = statusReview(workspace).paths.response;
  assert.match(pending, /reviewer-response-2\.md$/u);
  return { root, workspace, invitation, firstResponse: joined.paths.response, pending, reviewer };
}

function fillSecondReviewerResponse(file) {
  for (const [heading, content] of [
    ['Summary', 'The repair is complete.'],
    ['Findings', 'None.'],
    ['Required changes', 'None.'],
    ['Optional suggestions', 'None.'],
    ['Decision', 'accepted'],
  ])
    replaceSection(file, heading, content);
}

test('resumed Claude launch targets only the event-authorized second reviewer response', async (t) => {
  const fx = launchFixture(t);
  const firstAuthority = [
    launchAuthority({ joined: false, sequence: 1, revision: 0 }),
    launchAuthority({ sequence: 3, revision: 2 }),
  ];
  await runClaudeReviewerLaunch({
    contract: fx.contract,
    inspectAuthority: () => firstAuthority.shift(),
    execFile: async () => ({
      stdout: JSON.stringify({ session_id: 'fixture-claude-session' }),
      stderr: '',
    }),
  });

  const pending = path.join(path.dirname(fx.contract.response), 'reviewer-response-2.md');
  const resumed = buildClaudeReviewerResume({
    repositoryRoot: fx.contract.repository_root,
    invitation: fx.contract.invitation,
    routing: {
      schema: 'ai-peer-review.invitation-routing/v1',
      review_id: fx.contract.review_id,
      artifact: fx.contract.artifact,
      workspace: fx.workspace,
      response: pending,
    },
  });
  assert.equal(resumed.response, pending);
  assert.ok(resumed.permissions.allow.some((rule) => rule.includes('reviewer-response-2.md')));
  assert.ok(resumed.permissions.allow.every((rule) => !rule.includes('reviewer-response-1.md')));

  const turnTwo = launchAuthority({ sequence: 7, revision: 4 });
  turnTwo.state.protocol.turns_used = 1;
  const authorities = [turnTwo, turnTwo];
  const outcome = await runClaudeReviewerLaunch({
    contract: resumed,
    resume: true,
    inspectAuthority: () => authorities.shift(),
    execFile: async () => ({
      stdout: JSON.stringify({ session_id: 'fixture-claude-session' }),
      stderr: '',
    }),
  });
  assert.equal(outcome.response, pending);
  assert.equal(JSON.parse(readFileSync(fx.stateFile, 'utf8')).response, pending);
});

test('launch-reviewer --resume reads the current pending response from protocol authority', async (t) => {
  const fx = await preparedTurnTwo(t);
  const stateFile = path.join(fx.workspace, 'provider', 'claude', 'launch-state.json');
  mkdirSync(path.dirname(stateFile), { recursive: true });
  writeFileSync(
    stateFile,
    `${JSON.stringify({
      schema: 'ai-peer-review.claude-launch-state/v1',
      review_id: 'review-turn-two',
      invitation: fx.invitation,
      response: fx.firstResponse,
      model: 'claude-opus-5',
      effort: 'high',
      session_handle: 'turn-two-reviewer',
      session_fingerprint: fingerprintSession('anthropic', 'turn-two-reviewer'),
      protocol_revision: 2,
    })}\n`
  );
  let stdout = '';
  let stderr = '';
  const code = await run(
    ['launch-reviewer', fx.invitation, '--host', 'claude', '--resume', '--json'],
    {
      cwd: fx.root,
      env: {},
      now: new Date('2026-09-17T12:03:00.000Z'),
      stdout: { write: (value) => (stdout += value) },
      stderr: { write: (value) => (stderr += value) },
      execFile: async () => {
        fillSecondReviewerResponse(fx.pending);
        let submitError = '';
        const submitCode = await run(['submit', fx.workspace, '--decision', 'accepted'], {
          cwd: fx.root,
          env: {
            CLAUDE_CODE_SESSION_ID: 'turn-two-reviewer',
            CLAUDE_MODEL_ID: 'claude-opus-5',
            CLAUDE_MODEL_DISPLAY: 'Claude Opus 5',
          },
          now: new Date('2026-09-17T12:03:00.000Z'),
          stdout: { write: () => {} },
          stderr: { write: (value) => (submitError += value) },
        });
        assert.equal(submitCode, 0, submitError);
        return { stdout: JSON.stringify({ session_id: 'turn-two-reviewer' }), stderr: '' };
      },
    }
  );
  assert.equal(code, 0, stderr);
  assert.equal(JSON.parse(stdout).response, fx.pending);
  assert.equal(JSON.parse(stdout).status, 'submitted');
  assert.equal(JSON.parse(readFileSync(stateFile, 'utf8')).response, fx.pending);
});

for (const ambientModels of [true, false]) {
  test(`declared Claude reviewer submits turn two with ambient model variables ${ambientModels ? 'present' : 'unset'}`, async (t) => {
    const fx = await preparedTurnTwo(t);
    fillSecondReviewerResponse(fx.pending);
    let stdout = '';
    let stderr = '';
    const code = await run(['submit', fx.workspace, '--decision', 'accepted'], {
      cwd: fx.root,
      env: {
        CLAUDE_CODE_SESSION_ID: 'turn-two-reviewer',
        ...(ambientModels
          ? { CLAUDE_MODEL_ID: 'claude-opus-5', CLAUDE_MODEL_DISPLAY: 'Claude Opus 5' }
          : {}),
      },
      now: new Date('2026-09-17T12:03:00.000Z'),
      stdout: { write: (value) => (stdout += value) },
      stderr: { write: (value) => (stderr += value) },
    });
    assert.equal(code, 0, stderr);
    assert.equal(
      statusReview(fx.workspace, { now: new Date('2026-09-17T12:04:00.000Z') }).state,
      'acceptance-pending'
    );
  });
}

test('a different Claude session cannot submit the declared reviewer turn', async (t) => {
  const fx = await preparedTurnTwo(t);
  fillSecondReviewerResponse(fx.pending);
  let stderr = '';
  const code = await run(['submit', fx.workspace, '--decision', 'accepted'], {
    cwd: fx.root,
    env: {
      CLAUDE_CODE_SESSION_ID: 'different-reviewer',
      CLAUDE_MODEL_ID: 'claude-opus-5',
      CLAUDE_MODEL_DISPLAY: 'Claude Opus 5',
    },
    now: new Date('2026-09-17T12:03:00.000Z'),
    stdout: { write: () => {} },
    stderr: { write: (value) => (stderr += value) },
  });
  assert.equal(code, 1);
  assert.match(stderr, /APR_(?:CLAIM|IDENTITY)_CONFLICT/u);
  assert.equal(
    statusReview(fx.workspace, { now: new Date('2026-09-17T12:04:00.000Z') }).state,
    'reviewer-turn'
  );
});
