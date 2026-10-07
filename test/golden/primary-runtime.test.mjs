// @story #134
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCommand } from '../../src/cli/parse.mjs';
test('primary maintenance grammar is explicit and cannot select a foreign primary', () => {
  assert.equal(parseCommand(['primary', 'register', '--dry-run']).command, 'primary');
  assert.equal(parseCommand(['primary', 'activate', '--dry-run']).options.dryRun, true);
  assert.throws(() => parseCommand(['primary', 'activate', '--primary', 'foreign']));
  assert.throws(() => parseCommand(['primary', 'activate', '--force']));
});

test(
  'source primary maintenance dispatch refuses runtime authority before writing',
  {
    skip:
      process.platform === 'win32' &&
      'Windows native security helper verification paused for #102/#107',
  },
  async (t) => {
    const { setupHostFixture } = await import('../helpers/setup-host-fixture.mjs');
    const f = await setupHostFixture(t);
    const { run } = await import('../helpers/operations-api.mjs');
    const out = [],
      errors = [];
    const result = await run(['primary', 'register', '--dry-run', '--json'], {
      cwd: f.root,
      env: {},
      stdout: { write: (value) => out.push(value) },
      stderr: { write: (value) => errors.push(value) },
    });
    assert.equal(result, 1);
    assert.match(errors.join(''), /APR_RUNTIME_/);
    assert.equal(out.length, 0);
  }
);

// @story #136
import { run as productionRun } from '../../src/cli/run.mjs';
import { authorityInstalledFixture } from '../helpers/authority-installed-fixture.mjs';
test('doctor outside Git retains independent unavailable authority rows', async () => {
  let stdout = '',
    stderr = '';
  const result = await productionRun(['doctor', '--json', '--mode', 'installation'], {
    cwd: '/',
    env: {},
    stdout: { write: (value) => (stdout += value) },
    stderr: { write: (value) => (stderr += value) },
  });
  assert.equal(result, 1);
  const response = JSON.parse(stdout);
  assert.equal(response.schema, 'ai-peer-review.doctor/v1');
  for (const id of [
    'selected-global-runtime',
    'primary-registration',
    'primary-config',
    'integration-contract',
  ])
    assert.ok(response.rows.some((row) => row.id === id));
  assert.equal(stderr, '');
});
test(
  'dirty primary doctor still reports the selected runtime and integration independently',
  { skip: 'Native broker verification paused for #102/#107' },
  async (t) => {
    const f = await authorityInstalledFixture(t);
    const result = f.execute(
      'import {writeFileSync,readFileSync} from "node:fs";import path from "node:path";import {run} from ' +
        f.module('src/cli/run.mjs') +
        ';const config=path.join(process.cwd(),".ai-peer-review/config.json");writeFileSync(config,readFileSync(config,"utf8")+" ");let stdout="",stderr="";await run(["doctor","--json","--mode","installation"],{cwd:process.cwd(),env:{},stdout:{write:value=>stdout+=value},stderr:{write:value=>stderr+=value}});const response=JSON.parse(stdout);const rows=new Map(response.rows.map(row=>[row.id,row]));if(rows.get("selected-global-runtime")?.status!=="ok"||rows.get("primary-config")?.status!=="unavailable"||rows.get("integration-contract")?.status!=="ok")throw Error(stdout+stderr);console.log("independent");'
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), 'independent');
  }
);
