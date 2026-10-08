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
      assert.doesNotMatch(step.run ?? '', /build:broker-security|node-gyp/);
      assert.doesNotMatch(step.uses ?? '', /setup-python|msvc-dev-cmd/);
      assert.equal(step.env?.APR_NATIVE_REQUIRED, undefined);
      assert.equal(step.env?.APR_NODEDIR_BASE, undefined);
    }
  }
  const cacheWarm = readFileSync(new URL('test/helpers/warm-packed-cache.mjs', root), 'utf8');
  assert.doesNotMatch(cacheWarm, /build:broker-security|node-gyp|APR_NATIVE_REQUIRED/);
  assert.match(cacheWarm, /--ignore-scripts/);
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
    10,
    result.stdout + result.stderr
  );
  assert.match(result.stdout, /# skipped 11/);
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
  ['test/integration/broker-release.test.mjs', 'installed release preserves legacy evidence'],
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

test('[#187] Windows selection shares serialized portable probes without losing or duplicating active files', async () => {
  const policy = await import('../helpers/suite-plan.mjs').catch(() => ({}));
  assert.equal(typeof policy.classifySuiteFiles, 'function');
  const input = [
    'test/unit/runtime-selection.test.mjs',
    'test/unit/portable-authority-fences.test.mjs',
    'test/unit/storage-protection.test.mjs',
    'test/unit/regular.test.mjs',
    'test/unit/broker-ownership.test.mjs',
  ];
  const { groups, excluded } = policy.classifySuiteFiles(input);
  assert.deepEqual(excluded, ['test/unit/broker-ownership.test.mjs']);
  const all = groups.flatMap((group) => group.files);
  assert.equal(new Set(all).size, all.length);
  assert.deepEqual(all.slice().sort(), input.filter((file) => !excluded.includes(file)).sort());
  const selection = groups.find((group) =>
    group.files.includes('test/unit/runtime-selection.test.mjs')
  );
  assert.equal(selection.filtered, false);
  const args = policy.suiteCommandArguments(selection, {
    suite: 'unit',
    platform: 'win32',
    hosted: true,
  });
  assert.ok(args.includes('--test-concurrency=1'));
  assert.equal(
    args.some((arg) => arg.startsWith('--test-skip-pattern')),
    false
  );
  for (const file of selection.files) assert.equal(args.filter((arg) => arg === file).length, 1);
  const ordinary = groups.find((group) => group.files.includes('test/unit/regular.test.mjs'));
  assert.equal(ordinary.filtered, true);
  assert.equal(
    policy
      .suiteCommandArguments(selection, { suite: 'unit', platform: 'darwin', hosted: true })
      .includes('--test-concurrency=1'),
    false
  );
});

test('[#187] actual suite runner executes each active disposable fixture once', async (t) => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const fixture = mkdtempSync(path.join(tmpdir(), 'apr-suite-policy-'));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  mkdirSync(path.join(fixture, 'test/unit'), { recursive: true });
  const log = path.join(fixture, 'executed.jsonl');
  for (const name of [
    'regular',
    'runtime-selection',
    'portable-authority-fences',
    'broker-ownership',
  ]) {
    writeFileSync(
      path.join(fixture, 'test/unit/' + name + '.test.mjs'),
      `import test from 'node:test'; import {appendFileSync} from 'node:fs'; test('fixture ${name}',()=>appendFileSync(${JSON.stringify(log)},${JSON.stringify(name + '\n')}));\n`
    );
  }
  const env = { ...process.env, CI: 'true', GITHUB_ACTIONS: 'true' };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL('test/helpers/run-suite.mjs', root)), 'unit'],
    { cwd: fixture, env, encoding: 'utf8', timeout: 15000 }
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(readFileSync(log, 'utf8').trim().split('\n').sort(), [
    'portable-authority-fences',
    'regular',
    'runtime-selection',
  ]);
});
