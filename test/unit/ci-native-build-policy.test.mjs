// cspell:ignore msvc
// @story #162
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { load } from 'js-yaml';
import { nativeBrokerSkipReason } from '../helpers/native-broker-policy.mjs';

const root = new URL('../..', import.meta.url);
const reason = 'Native broker verification suspended during JavaScript-only migration';

test('CI suspends native compilation while retaining every JavaScript receipt lane', () => {
  const workflow = load(readFileSync(new URL('.github/workflows/ci.yml', root), 'utf8'));
  assert.equal(workflow.env.APR_SKIP_NATIVE_BROKER_TESTS, '1');
  for (const key of ['node-24', 'preferred-node', 'phase-2-boundary']) {
    const steps = workflow.jobs[key].steps;
    for (const lane of ['fast', 'integration', 'mcp', 'packaging', 'smoke']) {
      const matching = steps.filter((step) => step.name === 'Verify tests: ' + lane);
      assert.equal(matching.length, 1, key + ':' + lane);
      assert.equal(matching[0].run, 'node scripts/ci/record-tests.mjs ' + lane);
    }
  }
  for (const job of Object.values(workflow.jobs)) {
    for (const step of job.steps) {
      assert.doesNotMatch(step.run ?? '', /build:broker-security|node-gyp|warm-packed-cache/);
      assert.doesNotMatch(step.uses ?? '', /setup-python|msvc-dev-cmd/);
      assert.equal(step.env?.APR_NATIVE_REQUIRED, undefined);
      assert.equal(step.env?.APR_NODEDIR_BASE, undefined);
    }
  }
});

test('CI native readiness bodies explicitly skip even when native verification was requested', () => {
  const env = {
    ...process.env,
    CI: 'true',
    APR_NATIVE_REQUIRED: '1',
    APR_SKIP_NATIVE_BROKER_TESTS: '1',
  };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(
    process.execPath,
    ['--test', '--test-reporter=tap', 'test/integration/broker-readiness.test.mjs'],
    {
      cwd: root,
      encoding: 'utf8',
      timeout: 15_000,
      env,
    }
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(result.signal, null);
  assert.equal(
    result.stdout.split('# SKIP ' + reason).length - 1,
    2,
    result.stdout + result.stderr
  );
  assert.match(result.stdout, /# skipped 2/);
});

test('native suspension preserves defaults and rejects other opt-in values', () => {
  for (const env of [
    {},
    { CI: 'true' },
    { APR_NATIVE_REQUIRED: '1' },
    ...['', '0', 'true', ' 1', '1 '].map((value) => ({ APR_SKIP_NATIVE_BROKER_TESTS: value })),
  ]) {
    assert.equal(nativeBrokerSkipReason(env), false);
  }
  assert.equal(
    nativeBrokerSkipReason({ APR_SKIP_NATIVE_BROKER_TESTS: '1', APR_NATIVE_REQUIRED: '1' }),
    reason
  );
});

for (const [file, name] of [
  [
    'test/unit/broker-build.test.mjs',
    'native broker connection distinguishes denied socket access',
  ],
  ['test/unit/broker-ownership.test.mjs', 'native ownership and authenticated IPC'],
  ['test/integration/broker-release.test.mjs', 'installed release preserves legacy recovery'],
]) {
  test('CI skips build-dependent case before setup: ' + file, () => {
    const env = {
      ...process.env,
      CI: 'true',
      APR_NATIVE_REQUIRED: '1',
      APR_SKIP_NATIVE_BROKER_TESTS: '1',
    };
    delete env.NODE_TEST_CONTEXT;
    const result = spawnSync(
      process.execPath,
      ['--test', '--test-reporter=tap', '--test-name-pattern', name, file],
      { cwd: root, encoding: 'utf8', timeout: 15_000, env }
    );
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(result.signal, null);
    assert.equal(
      result.stdout.split('# SKIP ' + reason).length - 1,
      1,
      result.stdout + result.stderr
    );
  });
}
