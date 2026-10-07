import { fixtureStartupDeps, fixtureObservation } from '../helpers/internal-api.mjs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { run } from '../helpers/operations-api.mjs';
import { fingerprintSession } from '../../src/identity/registry.mjs';
import { statusReview } from '../helpers/internal-api.mjs';
import {
  exerciseClaudeLaunchCli,
  exerciseMissingChildModelCli,
} from '../helpers/claude-launch-cli-regression.mjs';

for (const resume of [false, true]) {
  test(`actual Claude CLI attribution, resume=${resume}`, { concurrency: false }, async (t) => {
    await exerciseClaudeLaunchCli(t, { resume });
  });
}

test(
  'clean parent reaches actual Claude CLI join and submit',
  { concurrency: false },
  async (t) => {
    await exerciseClaudeLaunchCli(t, { cleanParent: true });
  }
);

test(
  'manual Claude join takes its requested model from sealed intent, not project config',
  { concurrency: false },
  async (t) => {
    await exerciseMissingChildModelCli(t, { configured: true });
  }
);

test(
  'manual Claude child joins with a session handle and sealed requested model',
  { concurrency: false },
  async (t) => {
    await exerciseMissingChildModelCli(t);
  }
);

function fixture({ configured = true } = {}) {
  const root = realpathSync.native(mkdtempSync(path.join(os.tmpdir(), 'apr-claude-identity-')));
  execFileSync('git', ['init', '-b', 'trunk'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: root });
  mkdirSync(path.join(root, 'docs'));
  writeFileSync(path.join(root, 'docs', 'artifact.md'), '# Artifact\n');
  writeFileSync(path.join(root, '.git', 'info', 'exclude'), '.scratch/peer-review/\n');
  execFileSync('git', ['add', 'docs/artifact.md'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'fixture'], { cwd: root, stdio: 'ignore' });
  if (configured) {
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
  }
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

async function runJson(argv, root, sessionId, modelId = null) {
  let stdout = '';
  let stderr = '';
  const code = await run([...argv, '--json'], {
    ...fixtureStartupDeps,
    transportCapability: 'manual',
    runtimeObservation: fixtureObservation(
      'anthropic',
      'claude-code',
      'claude-opus-5',
      'medium',
      'declared'
    ),
    cwd: root,
    env: {
      CLAUDE_CODE_SESSION_ID: sessionId,
      ...(modelId ? { CLAUDE_MODEL_ID: modelId, CLAUDE_MODEL_DISPLAY: modelId } : {}),
    },
    now: new Date('2026-09-13T14:00:00.000Z'),
    doctorContext: { skillAvailable: true },
    stdout: { write: (value) => (stdout += value) },
    stderr: { write: (value) => (stderr += value) },
  });
  return {
    code,
    stdout: stdout ? JSON.parse(stdout) : null,
    stderr: stderr ? JSON.parse(stderr) : null,
  };
}

async function runText(argv, root, sessionId) {
  let stdout = '';
  let stderr = '';
  const manualReviewer = sessionId === 'claude-reviewer';
  const code = await run(argv, {
    ...fixtureStartupDeps,
    transportCapability: 'manual',
    runtimeObservation: fixtureObservation(
      'anthropic',
      'claude-code',
      'claude-opus-5',
      'medium',
      'declared'
    ),
    cwd: root,
    env: {
      CLAUDE_CODE_SESSION_ID: sessionId,
      ...(!manualReviewer
        ? { CLAUDE_MODEL_ID: 'claude-opus-5', CLAUDE_MODEL_DISPLAY: 'Claude Opus 5' }
        : {}),
    },
    ...(manualReviewer
      ? {
          identityContext: {
            declared: {
              host: 'claude-code',
              provider: 'anthropic',
              sessionId,
              modelId: 'claude-opus-5',
              modelDisplay: 'Claude Opus 5',
            },
          },
        }
      : {}),
    now: new Date('2026-09-13T14:00:00.000Z'),
    stdout: { write: (value) => (stdout += value) },
    stderr: { write: (value) => (stderr += value) },
  });
  return { code, stdout, stderr: stderr ? JSON.parse(stderr) : null };
}

function findFile(root, basename) {
  const relative = readdirSync(root, { recursive: true }).find(
    (entry) => path.basename(String(entry)) === basename
  );
  assert.ok(relative, `expected ${basename} below ${root}`);
  return path.join(root, String(relative));
}

function replaceSection(file, heading, content) {
  const source = readFileSync(file, 'utf8');
  const pattern = new RegExp(`(## ${heading}\\r?\\n\\r?\\n)[\\s\\S]*?(?=\\r?\\n\\r?\\n## |$)`);
  assert.match(source, pattern);
  writeFileSync(file, source.replace(pattern, `$1${content}`));
}

test('doctor reports Claude session readiness without relying on project model config', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);

  const result = await runJson(
    ['doctor', '--mode', 'manual'],
    fx.root,
    'claude-session',
    'claude-opus-5-5'
  );

  assert.equal(result.code, 1, JSON.stringify(result.stderr));
  assert.equal(
    result.stdout.rows.find((row) => row.id === 'primary-registration').status,
    'unavailable'
  );
  const source = result.stdout.rows.find((row) => row.id === 'identity-source');
  assert.equal(source.status, 'session-handle');
  assert.equal(result.stdout.input.identity.model_id, undefined);
  assert.equal(
    result.stdout.input.identity.session_fingerprint,
    fingerprintSession('anthropic', 'claude-session')
  );
});

test('doctor reports session readiness without model metadata while refusing an unregistered primary', async (t) => {
  const fx = fixture({ configured: false });
  t.after(fx.cleanup);

  const result = await runJson(['doctor', '--mode', 'manual'], fx.root, 'claude-session');

  assert.equal(result.code, 1, JSON.stringify(result));
  assert.equal(
    result.stdout.rows.find((row) => row.id === 'primary-registration').status,
    'unavailable'
  );
  const source = result.stdout.rows.find((row) => row.id === 'identity-source');
  assert.equal(source.status, 'session-handle');
  assert.equal(source.details, null);
});

test('workflow uses runtime author and invocation-scoped manual reviewer identity', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);

  const started = await runText(
    [
      'start',
      'docs/artifact.md',
      '--artifact-kind',
      'spec',
      '--issue',
      '117',
      '--reviewer-provider',
      'claude',
      '--reviewer-model',
      'claude-opus-5',
      '--transport-mode',
      'manual',
      '--reviewer-effort',
      'medium',
    ],
    fx.root,
    'claude-author'
  );
  assert.equal(started.code, 0, JSON.stringify(started.stderr));
  const workspace = path.dirname(findFile(fx.root, 'events.jsonl'));
  const invitation = statusReview(workspace).paths.invitation;
  let participants = JSON.parse(readFileSync(path.join(workspace, 'participants.json'), 'utf8'));
  assert.equal(participants.author.identity_source, 'runtime');

  const sameSession = await runText(['join', invitation], fx.root, 'claude-author');
  assert.equal(sameSession.code, 1);
  assert.equal(sameSession.stderr.code, 'APR_IDENTITY_CONFLICT');

  let missingSessionError = '';
  const missingSessionCode = await run(['join', invitation], {
    cwd: fx.root,
    env: {},
    now: new Date('2026-09-13T14:00:00.000Z'),
    stdout: { write: () => {} },
    stderr: {
      write: (value) => {
        missingSessionError += value;
      },
    },
  });
  assert.equal(missingSessionCode, 1);
  assert.equal(JSON.parse(missingSessionError).code, 'APR_IDENTITY_REQUIRED');

  const joined = await runText(['join', invitation], fx.root, 'claude-reviewer');
  assert.equal(joined.code, 0, JSON.stringify(joined.stderr));
  participants = JSON.parse(readFileSync(path.join(workspace, 'participants.json'), 'utf8'));
  assert.equal(participants.reviewer.identity_source, 'declared');
  assert.notEqual(
    participants.author.session_fingerprint,
    participants.reviewer.session_fingerprint
  );

  const response = statusReview(workspace).paths.response;
  replaceSection(response, 'Summary', 'The artifact is ready.');
  replaceSection(response, 'Findings', 'None.');
  replaceSection(response, 'Required changes', 'None.');
  replaceSection(response, 'Optional suggestions', 'None.');
  replaceSection(response, 'Decision', 'accepted');
  const submitted = await runText(
    ['submit', workspace, '--decision', 'accepted'],
    fx.root,
    'claude-reviewer'
  );
  assert.equal(submitted.code, 0, JSON.stringify(submitted.stderr));

  const finalized = await runText(['finalize', workspace], fx.root, 'claude-author');
  assert.equal(finalized.code, 0, JSON.stringify(finalized.stderr));
  assert.equal(statusReview(workspace).state, 'accepted');
});
