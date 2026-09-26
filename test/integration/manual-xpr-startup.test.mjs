// @story #106
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { run, startReview, statusReview } from '../../src/cli/run.mjs';
import { readStartupJournal } from '../../src/broker/registry.mjs';
import { readClaudeStreamObservation } from '../../src/providers/claude-stream.mjs';
import { fixtureStartupDeps } from '../helpers/internal-api.mjs';
import { fixture, identity, replaceSection } from '../helpers/intervention-fixture.mjs';
import { isolateClaudeCliFixture } from '../helpers/claude-launch-cli-regression.mjs';
const NOW = new Date('2026-09-13T14:00:00.000Z');
const SESSION = '106-manual-reviewer';
async function cli(argv, fx, overrides = {}) {
  let stdout = '',
    stderr = '';
  const code = await run(argv, {
    cwd: fx.root,
    env: fx.parentEnvironment,
    now: NOW,
    adapters: fx.adapters,
    stdout: { write: (value) => (stdout += value) },
    stderr: { write: (value) => (stderr += value) },
    ...overrides,
  });
  return { code, stdout, stderr };
}
async function start(fx) {
  const result = await startReview(
    {
      cwd: fx.root,
      artifact: 'docs/artifact.md',
      artifactKind: 'spec',
      identity: identity('author', '106-author', NOW.toISOString()),
      reviewerProvider: 'claude',
      reviewerModel: 'claude-opus-5',
      reviewerEffort: 'medium',
      transportMode: 'manual',
      now: NOW,
    },
    { ...fixtureStartupDeps, adapters: fx.adapters }
  );
  return { ...result, ...statusReview(result.paths.workspace) };
}
function reviewerEnv(fx) {
  const env = { ...fx.parentEnvironment };
  for (const key of Object.keys(env)) if (/^(CODEX_|CLAUDE_)/.test(key)) delete env[key];
  env.CLAUDE_CODE_SESSION_ID = SESSION;
  return env;
}
test('manual XPR registers without asking a recovery-only broker worker to launch', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const commands = [];
  const result = await startReview(
    {
      cwd: fx.root,
      artifact: 'docs/artifact.md',
      artifactKind: 'spec',
      identity: identity('author', '106-manual-author'),
      reviewerProvider: 'claude',
      reviewerModel: 'claude-opus-5',
      transportMode: 'manual',
    },
    {
      ...fixtureStartupDeps,
      adapters: { claude: { ...fixtureStartupDeps.adapters.claude, launch() {} } },
      ensureBroker: async () => ({
        close() {},
        async request(message) {
          commands.push(message.command);
          if (message.command === 'launch')
            throw new Error('manual recovery-only workers cannot launch');
          return { status: 'recovery-only' };
        },
      }),
    }
  );
  assert.deepEqual(commands, ['register']);
  assert.equal(statusReview(result.paths.workspace).state, 'awaiting-reviewer');
  assert.equal(readStartupJournal(result.paths.workspace).stage, 'manual');
});
test('manual declared join ignores an inherited official resume command', async (t) => {
  const fx = isolateClaudeCliFixture(t);
  const userConfig = path.join(fx.configHome, 'ai-peer-review');
  mkdirSync(userConfig);
  writeFileSync(
    path.join(userConfig, 'config.json'),
    JSON.stringify({
      schema: 'ai-peer-review.config/v1',
      hosts: { claude: { resume: { command: ['claude', '--resume'] } } },
    })
  );
  const review = await start(fx);
  const joined = await cli(['join', review.paths.invitation], fx, { env: reviewerEnv(fx) });
  assert.equal(joined.code, 0, joined.stderr);
  const participants = JSON.parse(
    readFileSync(path.join(review.paths.workspace, 'participants.json'))
  );
  assert.equal(participants.reviewer.identity_source, 'declared');
  assert.equal(statusReview(review.paths.workspace, { now: NOW }).state, 'reviewer-turn');
});
for (const malformed of [false, true]) {
  test(`CLI captures stream evidence before join (malformed=${malformed})`, async (t) => {
    const fx = isolateClaudeCliFixture(t, { configured: false });
    const review = await start(fx),
      workspace = review.paths.workspace;
    const originalPath = process.env.PATH;
    t.after(() => {
      process.env.PATH = originalPath;
    });
    // Prevent the pre-fix branch from contacting a real provider.
    writeFileSync(path.join(fx.configHome, 'claude'), "#!/usr/bin/env node\nconsole.log('{}');\n", {
      mode: 0o755,
    });
    writeFileSync(path.join(fx.configHome, 'claude.cmd'), '@exit /b 1\r\n');
    process.env.PATH = fx.configHome + path.delimiter + originalPath;
    let failure,
      spawned = false;
    const spawnProcess = (_file, args, options) => {
      spawned = true;
      const child = new EventEmitter();
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.pid = null;
      child.kill = () => child.emit('close', 1);
      const emit = (event) => child.stdout.write(`${JSON.stringify(event)}\n`);
      setImmediate(async () => {
        try {
          assert.equal(args[args.indexOf('--output-format') + 1], 'stream-json');
          assert.equal(options.env.CODEX_SESSION_ID, undefined);
          const prompt = args[args.indexOf('-p') + 1];
          const command = prompt.match(/Run exactly: (.*?)\. Complete/s)?.[1];
          assert.ok(command);
          emit({
            type: 'system',
            subtype: 'init',
            model: 'claude-opus-5',
            session_id: SESSION,
            claude_code_version: '2.1.278',
          });
          emit({
            type: 'assistant',
            session_id: malformed ? 'wrong-session' : SESSION,
            timestamp: NOW.toISOString(),
            message: {
              model: 'claude-opus-5',
              content: [{ type: 'tool_use', id: 'join-106', name: 'Bash', input: { command } }],
            },
          });
          await new Promise((resolve) => setImmediate(resolve));
          if (!malformed) {
            const observed = readClaudeStreamObservation({
              workspace,
              operationId: `join:${review.review_id}`,
              handleLocator: SESSION,
            });
            assert.equal(observed.source, 'official-exact-session');
            const env = { ...options.env, CLAUDE_CODE_SESSION_ID: SESSION };
            const joined = await cli(['join', review.paths.invitation], fx, { env });
            assert.equal(joined.code, 0, joined.stderr);
            const response = statusReview(workspace).paths.response;
            for (const [heading, value] of [
              ['Summary', 'Reviewed the fixture.'],
              ['Findings', 'None.'],
              ['Required changes', 'None.'],
              ['Optional suggestions', 'None.'],
              ['Decision', 'accepted'],
            ])
              replaceSection(response, heading, value);
            const submitted = await cli(['submit', workspace], fx, { env });
            assert.equal(submitted.code, 0, submitted.stderr);
          }
          emit({ type: 'result', session_id: SESSION, permission_denials: [] });
        } catch (error) {
          failure = error;
        } finally {
          child.stdout.end();
          child.stderr.end();
          child.emit('close', failure ? 1 : 0);
        }
      });
      return child;
    };
    const result = await cli(
      [
        'launch-reviewer',
        review.paths.invitation,
        '--host',
        'claude',
        '--model',
        'claude-opus-5',
        '--effort',
        'medium',
        '--json',
      ],
      fx,
      { spawnProcess }
    );
    if (failure) throw failure;
    assert.equal(spawned, true, 'CLI must use the stream-backed process boundary');
    if (malformed) {
      assert.equal(statusReview(workspace).state, 'awaiting-reviewer');
      assert.notEqual(JSON.parse(result.stdout).status, 'submitted');
    } else {
      assert.equal(result.code, 0, result.stderr);
      assert.equal(JSON.parse(result.stdout).status, 'submitted');
      assert.equal(statusReview(workspace).state, 'acceptance-pending');
    }
  });
}
