// @story #166
import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
const runner = new URL('../helpers/run-suite.mjs', import.meta.url);
function fixture(t, fail = '') {
  const root = mkdtempSync(path.join(tmpdir(), 'apr-ci-schedule-166-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, 'test', 'integration'), { recursive: true });
  copyFileSync(runner, path.join(root, 'runner.mjs'));
  for (const [group, file, other] of [
    ['primary', 'primary.test.mjs', 'portable'],
    ['portable', 'storage-protection.test.mjs', 'primary'],
  ])
    writeFileSync(
      path.join(root, 'test', 'integration', file),
      "import test from 'node:test';import assert from 'node:assert/strict';import{writeFileSync,existsSync}from'node:fs';import{setTimeout}from'node:timers/promises';" +
        'test(' +
        JSON.stringify(
          group === 'portable'
            ? 'portable broker test executes without the legacy filter'
            : 'primary partition makes progress'
        ) +
        ',async()=>{' +
        'writeFileSync(' +
        JSON.stringify(group + '-ready') +
        ",'ready');const stop=Date.now()+4000;" +
        'while(!existsSync(' +
        JSON.stringify(other + '-ready') +
        ')&&Date.now()<stop)await setTimeout(20);' +
        'assert.ok(existsSync(' +
        JSON.stringify(other + '-ready') +
        "),'independent partition must run before this partition exits');" +
        'assert.notEqual(process.env.APR_FIXTURE_FAILURE,' +
        JSON.stringify(group) +
        ');});'
    );
  const env = { ...process.env, CI: 'true', GITHUB_ACTIONS: 'true', APR_FIXTURE_FAILURE: fail };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ['runner.mjs', 'integration'], {
    cwd: root,
    env,
    encoding: 'utf8',
    timeout: 15000,
  });
  return { root, result };
}
test('[#166] hosted integration partitions run concurrently and preserve unfiltered portable cases', (t) => {
  const { root, result } = fixture(t);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(result.signal, null);
  assert.equal(existsSync(path.join(root, 'primary-ready')), true);
  assert.equal(existsSync(path.join(root, 'portable-ready')), true);
});
for (const group of ['primary', 'portable'])
  test('[#166] hosted partition failure propagates from ' + group, (t) => {
    const { root, result } = fixture(t, group);
    assert.notEqual(result.status, 0);
    assert.equal(result.signal, null);
    assert.equal(existsSync(path.join(root, 'primary-ready')), true);
    assert.equal(existsSync(path.join(root, 'portable-ready')), true);
  });

test('[#175] explicit hosted baseline selector omits only separately recorded owner cases', (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'apr-ci-owner-shard-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, 'test/integration'), { recursive: true });
  copyFileSync(runner, path.join(root, 'runner.mjs'));
  for (const [file, marker] of [
    ['ordinary.test.mjs', 'baseline-executed'],
    ['owner-publication.test.mjs', 'owners-executed'],
  ])
    writeFileSync(
      path.join(root, 'test/integration', file),
      "import test from 'node:test';import {writeFileSync} from 'node:fs';test('actual shard case',()=>writeFileSync(" +
        JSON.stringify(marker) +
        ",'yes'));"
    );
  const env = { ...process.env, CI: 'true', GITHUB_ACTIONS: 'true' };
  delete env.NODE_TEST_CONTEXT;
  const invoke = (args) =>
    spawnSync(process.execPath, ['runner.mjs', 'integration', ...args], {
      cwd: root,
      env,
      encoding: 'utf8',
      timeout: 15000,
    });
  const baseline = invoke(['--exclude-owner-publication']);
  assert.equal(baseline.status, 0, baseline.stdout + baseline.stderr);
  assert.equal(existsSync(path.join(root, 'baseline-executed')), true);
  assert.equal(existsSync(path.join(root, 'owners-executed')), false);
  const full = invoke([]);
  assert.equal(full.status, 0, full.stdout + full.stderr);
  assert.equal(existsSync(path.join(root, 'owners-executed')), true);
});
