import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildClaudeLaunchEnvironment,
  runClaudeReviewerLaunch,
} from '../../src/provider/claude-launch.mjs';
import {
  launchAuthority,
  launchFixture,
  preflightLaunchFixture,
} from '../helpers/claude-launch-fixture.mjs';

const identityKeys = [
  'CODEX_SESSION_ID',
  'CODEX_THREAD_ID',
  'CODEX_MODEL_ID',
  'CODEX_MODEL_DISPLAY',
];

test('fallback environment drops only Codex identity without mutating its input', () => {
  const parent = Object.freeze({
    PATH: '/fixture/bin',
    HOME: '/fixture/home',
    NODE_OPTIONS: '--no-warnings',
    ANTHROPIC_API_KEY: 'fixture-secret',
    CLAUDE_CODE_SESSION_ID: 'child-session',
    CLAUDE_MODEL_ID: 'claude-opus-5',
    CODEX_UNRELATED: 'keep',
    ...Object.fromEntries(identityKeys.map((key) => [key, 'author-value'])),
  });
  const child = buildClaudeLaunchEnvironment(parent);
  assert.notEqual(child, parent);
  for (const key of identityKeys) assert.equal(Object.hasOwn(child, key), false);
  for (const key of Object.keys(parent).filter((key) => !identityKeys.includes(key))) {
    assert.equal(child[key], parent[key]);
  }
  for (const key of identityKeys) assert.equal(parent[key], 'author-value');
});

test('normal launch and resume pass sanitized child environments without changing parent state', async (t) => {
  const fixture = launchFixture(t);
  const prior = new Map(identityKeys.map((key) => [key, process.env[key]]));
  t.after(() => {
    for (const [key, value] of prior) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  for (const key of identityKeys) process.env[key] = 'codex-parent-value';
  const childOptions = [];
  const execFile = async (_file, _args, options) => {
    childOptions.push(options);
    return { stdout: JSON.stringify({ session_id: 'fixture-claude-session' }), stderr: '' };
  };
  const joined = launchAuthority();
  const initialAuthorities = [launchAuthority({ joined: false, sequence: 1, revision: 0 }), joined];
  const initial = await runClaudeReviewerLaunch({
    contract: fixture.contract,
    inspectAuthority: () => initialAuthorities.shift(),
    execFile,
  });
  assert.equal(initial.status, 'outcome-unknown');
  assert.equal(
    JSON.parse(readFileSync(fixture.stateFile, 'utf8')).session_handle,
    'fixture-claude-session'
  );
  let resumeArgs;
  const resumedAuthorities = [joined, joined];
  await runClaudeReviewerLaunch({
    contract: fixture.contract,
    resume: true,
    inspectAuthority: () => resumedAuthorities.shift(),
    execFile: async (file, args, options) => {
      resumeArgs = args;
      return execFile(file, args, options);
    },
  });
  assert.deepEqual(resumeArgs.slice(0, 2), ['--resume', 'fixture-claude-session']);
  assert.equal(childOptions.length, 2);
  for (const options of childOptions) {
    assert.equal(options.shell, false);
    for (const key of identityKeys) assert.equal(Object.hasOwn(options.env, key), false);
    assert.equal(options.env.PATH, process.env.PATH);
  }
  for (const key of identityKeys) assert.equal(process.env[key], 'codex-parent-value');
});

for (const environment of [Object.freeze({ HOME: '/fixture/reviewer' }), {}]) {
  test(`preflight environment passes through by identity (${Object.keys(environment).length} keys)`, async (t) => {
    const fixture = preflightLaunchFixture(t, environment);
    assert.equal(fixture.contract.environment, environment);
    assert.equal(
      Object.getOwnPropertyDescriptor(fixture.contract, 'environment').enumerable,
      false
    );
    assert.equal(JSON.stringify(fixture.contract).includes('environment'), false);
    const authorities = [launchAuthority(), launchAuthority()];
    let captured;
    await runClaudeReviewerLaunch({
      contract: fixture.contract,
      inspectAuthority: () => authorities.shift(),
      execFile: async (_file, _args, options) => {
        captured = options.env;
        return { stdout: JSON.stringify({ session_id: 'fixture-claude-session' }), stderr: '' };
      },
    });
    assert.equal(captured, environment);
  });
}

test('a present invalid child environment fails before provider execution', async (t) => {
  const fixture = launchFixture(t);
  const invalid = Object.freeze({ ...fixture.contract, environment: null });
  let executed = false;
  await assert.rejects(
    runClaudeReviewerLaunch({
      contract: invalid,
      inspectAuthority: () => launchAuthority(),
      execFile: async () => {
        executed = true;
      },
    }),
    { code: 'APR_CLAUDE_RESULT_INVALID' }
  );
  assert.equal(executed, false);
});
