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

import { run } from '../../src/cli/run.mjs';
import { fingerprintSession } from '../../src/identity/registry.mjs';
import { createClaudeAdapter } from '../../src/providers/claude.mjs';
import {
  createClaudeStreamRecorder,
  readClaudeStreamObservation,
} from '../../src/providers/claude-stream.mjs';
import { fixtureObservation, fixtureStartupDeps, statusReview } from './internal-api.mjs';

const PROVIDER_KEYS = [
  'CODEX_SESSION_ID',
  'CODEX_THREAD_ID',
  'CODEX_MODEL_ID',
  'CODEX_MODEL_DISPLAY',
  'CLAUDE_CODE_SESSION_ID',
  'CLAUDE_SESSION_ID',
  'CLAUDE_MODEL_ID',
  'CLAUDE_MODEL_DISPLAY',
  'GROK_SESSION_ID',
  'GROK_MODEL_ID',
];
const NOW = new Date('2026-09-13T14:00:00.000Z');
const AUTHOR_SESSION = 'fixture-codex-author';
const REVIEWER_SESSION = 'fixture-claude-session';

export function isolateClaudeCliFixture(t, { configured = true } = {}) {
  const root = realpathSync.native(mkdtempSync(path.join(os.tmpdir(), 'apr-claude-cli-')));
  const original = new Map(
    [...PROVIDER_KEYS, 'XDG_CONFIG_HOME', 'APPDATA'].map((key) => [key, process.env[key]])
  );
  t.after(() => {
    for (const [key, value] of original) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(root, { recursive: true, force: true });
  });
  for (const key of PROVIDER_KEYS) delete process.env[key];
  const configHome = path.join(root, 'empty-config');
  mkdirSync(configHome);
  const claudeAdapter = createClaudeAdapter({
    surface: {
      available: async () => true,
      version: async () => '2.1.278',
      observeCurrentSession: readClaudeStreamObservation,
    },
  });
  const adapters = { ...fixtureStartupDeps.adapters, claude: claudeAdapter };
  execFileSync('git', ['init', '-b', 'trunk'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: root });
  mkdirSync(path.join(root, 'docs'));
  writeFileSync(path.join(root, 'docs', 'artifact.md'), '# Fixture artifact\n');
  writeFileSync(path.join(root, '.git', 'info', 'exclude'), '.scratch/peer-review/\n');
  execFileSync('git', ['add', 'docs/artifact.md'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'fixture'], { cwd: root, stdio: 'ignore' });
  if (configured)
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
  const parentEnvironment = {
    ...process.env,
    XDG_CONFIG_HOME: configHome,
    APPDATA: configHome,
    CODEX_SESSION_ID: AUTHOR_SESSION,
    CODEX_MODEL_ID: 'gpt-test',
    CODEX_MODEL_DISPLAY: 'GPT Test',
  };
  for (const key of PROVIDER_KEYS) delete parentEnvironment[key];
  Object.assign(parentEnvironment, {
    CODEX_SESSION_ID: AUTHOR_SESSION,
    CODEX_MODEL_ID: 'gpt-test',
    CODEX_MODEL_DISPLAY: 'GPT Test',
    CLAUDE_CODE_SESSION_ID: 'inherited-claude-session',
    CLAUDE_MODEL_ID: 'claude-opus-5',
    CLAUDE_MODEL_DISPLAY: 'Claude Opus 5',
  });
  Object.assign(process.env, {
    CODEX_SESSION_ID: AUTHOR_SESSION,
    CODEX_MODEL_ID: 'gpt-test',
    CODEX_MODEL_DISPLAY: 'GPT Test',
    XDG_CONFIG_HOME: configHome,
    APPDATA: configHome,
  });
  return { root, configHome, parentEnvironment, adapters };
}

export function cliCall(argv, { root, env, execFile, startup = false, adapters } = {}) {
  let stdout = '';
  let stderr = '';
  const io = {
    ...(startup ? fixtureStartupDeps : {}),
    ...(adapters ? { adapters } : {}),
    transportCapability: 'manual',
    runtimeObservation: fixtureObservation('openai', 'codex', 'gpt-test'),
    cwd: root,
    env,
    now: NOW,
    stdout: {
      write: (value) => {
        stdout += value;
      },
    },
    stderr: {
      write: (value) => {
        stderr += value;
      },
    },
    ...(execFile ? { execFile } : {}),
  };
  return run(argv, io).then((code) => ({ code, stdout, stderr }));
}

function findFile(root, basename) {
  const relative = readdirSync(root, { recursive: true }).find(
    (entry) => path.basename(String(entry)) === basename
  );
  assert.ok(relative, `expected ${basename}`);
  return path.join(root, String(relative));
}

function replaceSection(file, heading, content) {
  const source = readFileSync(file, 'utf8');
  const pattern = new RegExp(`(## ${heading}\\r?\\n\\r?\\n)[\\s\\S]*?(?=\\r?\\n\\r?\\n## |$)`);
  assert.match(source, pattern);
  writeFileSync(file, source.replace(pattern, `$1${content}`));
}

function childEnvironment(environment, { modelSource = 'runtime' } = {}) {
  return {
    ...environment,
    CLAUDE_CODE_SESSION_ID: REVIEWER_SESSION,
    ...(modelSource === 'runtime'
      ? { CLAUDE_MODEL_ID: 'claude-opus-5', CLAUDE_MODEL_DISPLAY: 'Claude Opus 5' }
      : {}),
  };
}

export async function exerciseClaudeLaunchCli(
  t,
  { resume = false, cleanParent = false, modelSource = 'runtime' } = {}
) {
  const fx = isolateClaudeCliFixture(t);
  const launchEnvironment = { ...fx.parentEnvironment };
  if (modelSource === 'configured') {
    delete launchEnvironment.CLAUDE_MODEL_ID;
    delete launchEnvironment.CLAUDE_MODEL_DISPLAY;
  }
  if (cleanParent) {
    for (const key of [
      'CODEX_SESSION_ID',
      'CODEX_THREAD_ID',
      'CODEX_MODEL_ID',
      'CODEX_MODEL_DISPLAY',
    ])
      delete launchEnvironment[key];
  }
  const started = await cliCall(
    [
      'start',
      'docs/artifact.md',
      '--artifact-kind',
      'spec',
      '--reviewer-provider',
      'claude',
      '--reviewer-model',
      'claude-opus-5',
      '--reviewer-effort',
      'high',
      '--transport-mode',
      'manual',
    ],
    { root: fx.root, env: fx.parentEnvironment, startup: true, adapters: fx.adapters }
  );
  assert.equal(started.code, 0, started.stderr);
  const workspace = path.dirname(findFile(fx.root, 'events.jsonl'));
  const invitation = statusReview(workspace).paths.invitation;
  let response;
  const reviewId = JSON.parse(
    readFileSync(path.join(workspace, 'events.jsonl'), 'utf8').split('\n')[0]
  ).review_id;
  const recorder = createClaudeStreamRecorder({
    workspace,
    operationId: `join:${reviewId}`,
    expectedCommand: `peer-review join ${invitation}`,
  });
  recorder.accept({
    type: 'system',
    subtype: 'init',
    model: 'claude-opus-5',
    session_id: REVIEWER_SESSION,
    claude_code_version: '2.1.278',
  });
  recorder.accept({
    type: 'assistant',
    session_id: REVIEWER_SESSION,
    timestamp: NOW.toISOString(),
    message: {
      model: 'claude-opus-5',
      content: [
        {
          type: 'tool_use',
          id: 'tool-join-fixture',
          name: 'Bash',
          input: { command: `peer-review join ${invitation}` },
        },
      ],
    },
  });
  const author = JSON.parse(readFileSync(path.join(workspace, 'participants.json'), 'utf8')).author;
  assert.equal(author.provider, 'openai');
  assert.equal(author.host, 'codex');

  let launchCount = 0;
  let childEnv;
  let fixtureFailure;
  async function fakeClaudeImpl(_file, args, options) {
    launchCount += 1;
    assert.equal(options.shell, false);
    assert.equal(options.env.XDG_CONFIG_HOME, fx.configHome);
    assert.equal(options.env.APPDATA, fx.configHome);
    for (const key of [
      'CODEX_SESSION_ID',
      'CODEX_THREAD_ID',
      'CODEX_MODEL_ID',
      'CODEX_MODEL_DISPLAY',
    ]) {
      assert.equal(Object.hasOwn(options.env, key), false);
    }
    childEnv = childEnvironment(options.env, { modelSource });
    if (launchCount === 1) {
      if (!cleanParent) {
        const contaminated = await cliCall(['join', invitation], {
          root: fx.root,
          env: {
            ...fx.parentEnvironment,
            ...childEnv,
            CODEX_SESSION_ID: AUTHOR_SESSION,
            CODEX_MODEL_ID: 'gpt-test',
            CODEX_MODEL_DISPLAY: 'GPT Test',
          },
          adapters: fx.adapters,
        });
        assert.equal(contaminated.code, 1);
        assert.match(contaminated.stderr, /APR_IDENTITY_CONFLICT/);
      }
      const joined = await cliCall(['join', invitation], {
        root: fx.root,
        env: childEnv,
        adapters: fx.adapters,
      });
      assert.equal(joined.code, 0, joined.stderr);
      response = statusReview(workspace).paths.response;
      assert.equal(typeof response, 'string');
      const reviewer = JSON.parse(
        readFileSync(path.join(workspace, 'participants.json'), 'utf8')
      ).reviewer;
      assert.equal(reviewer.provider, 'anthropic');
      assert.equal(reviewer.host, 'claude-code');
      assert.equal(reviewer.identity_source, modelSource === 'configured' ? 'declared' : 'runtime');
      assert.equal(reviewer.session_fingerprint, fingerprintSession('anthropic', REVIEWER_SESSION));
      assert.notEqual(reviewer.session_fingerprint, author.session_fingerprint);
      if (resume) {
        return {
          exit_code: 1,
          stderr: '',
          stdout: JSON.stringify({
            session_id: REVIEWER_SESSION,
            permission_denials: [{ tool: 'Edit', path: response }],
          }),
        };
      }
    } else {
      assert.equal(resume, true);
      assert.deepEqual(args.slice(0, 2), ['--resume', REVIEWER_SESSION]);
    }
    for (const [heading, content] of [
      ['Summary', 'The fixture artifact is ready.'],
      ['Findings', 'None.'],
      ['Required changes', 'None.'],
      ['Optional suggestions', 'None.'],
      ['Decision', 'accepted'],
    ])
      replaceSection(response, heading, content);
    const submitted = await cliCall(['submit', workspace, '--decision', 'accepted'], {
      root: fx.root,
      env: childEnv,
    });
    assert.equal(submitted.code, 0, submitted.stderr);
    return {
      exit_code: 0,
      stderr: '',
      stdout: JSON.stringify({
        session_id: REVIEWER_SESSION,
        permission_denials: [],
      }),
    };
  }
  async function fakeClaude(...args) {
    try {
      return await fakeClaudeImpl(...args);
    } catch (error) {
      fixtureFailure = error;
      throw error;
    }
  }

  const initial = await cliCall(
    [
      'launch-reviewer',
      invitation,
      '--host',
      'claude',
      '--model',
      'claude-opus-5',
      '--effort',
      'high',
      '--json',
    ],
    { root: fx.root, env: launchEnvironment, execFile: fakeClaude }
  );
  if (fixtureFailure) throw fixtureFailure;
  assert.equal(initial.code, 0, initial.stderr);
  const initialResult = JSON.parse(initial.stdout);
  if (resume) {
    assert.equal(initialResult.status, 'permission-blocked', JSON.stringify(initialResult));
    assert.ok(initialResult.recovery?.command);
    const resumed = await cliCall(
      ['launch-reviewer', invitation, '--host', 'claude', '--resume', '--json'],
      { root: fx.root, env: launchEnvironment, execFile: fakeClaude }
    );
    assert.equal(resumed.code, 0, resumed.stderr);
    assert.equal(JSON.parse(resumed.stdout).status, 'submitted');
    assert.equal(launchCount, 2);
  } else {
    assert.equal(initialResult.status, 'submitted', JSON.stringify(initialResult));
    assert.equal(launchCount, 1);
  }
  const authority = statusReview(workspace);
  assert.equal(authority.state, 'acceptance-pending');
  const events = readFileSync(path.join(workspace, 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map(JSON.parse);
  assert.equal(events.filter((event) => event.type === 'reviewer-accepted').length, 1);
  assert.equal(
    events.find((event) => event.type === 'reviewer-accepted').actor,
    fingerprintSession('anthropic', REVIEWER_SESSION)
  );
  assert.doesNotMatch(JSON.stringify(initialResult), /fixture-claude-session/);
}

export async function exerciseMissingChildModelCli(t) {
  const fx = isolateClaudeCliFixture(t, { configured: false });
  const started = await cliCall(
    [
      'start',
      'docs/artifact.md',
      '--artifact-kind',
      'spec',
      '--reviewer-provider',
      'claude',
      '--reviewer-model',
      'claude-opus-5',
      '--reviewer-effort',
      'high',
      '--transport-mode',
      'manual',
    ],
    { root: fx.root, env: fx.parentEnvironment, startup: true, adapters: fx.adapters }
  );
  assert.equal(started.code, 0, started.stderr);
  const workspace = path.dirname(findFile(fx.root, 'events.jsonl'));
  const invitation = statusReview(workspace).paths.invitation;
  const childEnv = { ...fx.parentEnvironment, CLAUDE_CODE_SESSION_ID: REVIEWER_SESSION };
  for (const key of [
    'CODEX_SESSION_ID',
    'CODEX_THREAD_ID',
    'CODEX_MODEL_ID',
    'CODEX_MODEL_DISPLAY',
    'CLAUDE_MODEL_ID',
    'CLAUDE_MODEL_DISPLAY',
  ])
    delete childEnv[key];
  const joined = await cliCall(['join', invitation], {
    root: fx.root,
    env: childEnv,
    adapters: fx.adapters,
  });
  assert.equal(joined.code, 1);
  assert.match(joined.stderr, /APR_IDENTITY_REQUIRED/);
  assert.match(joined.stderr, /hosts\.claude\.identity\.model_id/);
  assert.equal(statusReview(workspace).state, 'awaiting-reviewer');
  assert.equal(
    JSON.parse(readFileSync(path.join(workspace, 'participants.json'), 'utf8')).reviewer,
    null
  );
}

export async function exerciseClaudeLaunchDiagnostics(
  t,
  { json = false, structured = false } = {}
) {
  const fx = isolateClaudeCliFixture(t);
  const started = await cliCall(
    [
      'start',
      'docs/artifact.md',
      '--artifact-kind',
      'spec',
      '--reviewer-provider',
      'claude',
      '--reviewer-model',
      'claude-opus-5',
      '--reviewer-effort',
      'high',
      '--transport-mode',
      'manual',
    ],
    { root: fx.root, env: fx.parentEnvironment, startup: true, adapters: fx.adapters }
  );
  assert.equal(started.code, 0, started.stderr);
  const workspace = path.dirname(findFile(fx.root, 'events.jsonl'));
  const invitation = statusReview(workspace).paths.invitation;
  const privateText = 'PRIVATE-CLAUDE-ERROR';
  const result = await cliCall(
    [
      'launch-reviewer',
      invitation,
      '--host',
      'claude',
      '--model',
      'claude-opus-5',
      '--effort',
      'high',
      ...(json ? ['--json'] : []),
    ],
    {
      root: fx.root,
      env: fx.parentEnvironment,
      execFile: async () => {
        if (structured)
          return {
            exit_code: 2,
            stdout: JSON.stringify({
              error: { code: 'UNKNOWN', message: privateText },
              result: `${privateText}${'界'.repeat(1024)}`,
            }),
            stderr: privateText,
          };
        throw Object.assign(new Error(privateText), {
          code: 'ENOENT',
          stdout: privateText,
          stderr: privateText,
        });
      },
    }
  );
  assert.equal(result.code, 1, result.stderr);
  assert.equal(result.stderr, '');
  assert.doesNotMatch(result.stdout, /PRIVATE-CLAUDE-ERROR/);
  assert.doesNotMatch(result.stdout, /--resume/);
  assert.match(result.stdout, /reviewer-response-1\.md/);
  return result.stdout;
}
