// @story #190
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  realpathSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const api = await import('../helpers/registration-cost-coverage.mjs').catch(() => ({}));
const source = 'async function inspect() {}\nasync function openProtectedRoot() {}\n';
const sourceSha256 = createHash('sha256').update(source).digest('hex');
const coverage = () => ({
  functions: [
    {
      functionName: 'inspect',
      isBlockCoverage: true,
      ranges: [{ startOffset: 0, endOffset: 27, count: 9 }],
    },
    {
      functionName: 'openProtectedRoot',
      isBlockCoverage: true,
      ranges: [{ startOffset: 27, endOffset: source.length, count: 3 }],
    },
    { functionName: 'private-path-and-SID', ranges: [] },
  ],
});
test('real engine coverage retains function counts without executing a substituted API', () => {
  const base = realpathSync(mkdtempSync(path.join(tmpdir(), 'apr-cost-coverage-')));
  try {
    const file = path.join(base, 'fixture.mjs'),
      output = path.join(base, 'coverage');
    mkdirSync(output);
    const text =
      source + 'await inspect(); await inspect(); await inspect(); await openProtectedRoot();\n';
    writeFileSync(file, text);
    execFileSync(process.execPath, [file], {
      env: { ...process.env, NODE_V8_COVERAGE: output },
      timeout: 10000,
    });
    const files = readdirSync(output);
    assert.equal(files.length, 1);
    const raw = JSON.parse(readFileSync(path.join(output, files[0]), 'utf8'));
    const observed = raw.result.filter((item) => item.url === pathToFileURL(file).href);
    assert.equal(observed.length, 1);
    const projected = api.projectRegistrationCostCoverage({
      coverage: observed[0],
      source: text,
      expectedSourceSha256: createHash('sha256').update(text).digest('hex'),
    });
    assert.deepEqual(
      projected.counters.map(({ name, count }) => ({ name, count })),
      [
        { name: 'inspect', count: 3 },
        { name: 'openProtectedRoot', count: 1 },
      ]
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
test('precise diagnostic coverage counts calls rather than debugger async resumptions', async () => {
  const helper = new URL('../helpers/precise-function-coverage.mjs', import.meta.url).href;
  const precise = await import(helper).catch(() => ({}));
  assert.equal(typeof precise.startPreciseFunctionCoverage, 'function');
  const base = realpathSync(mkdtempSync(path.join(tmpdir(), 'apr-precise-coverage-')));
  try {
    const file = path.join(base, 'fixture.mjs');
    const output = path.join(base, 'observed.json');
    const text = `import inspector from 'node:inspector';
import {writeFileSync} from 'node:fs';
import {startPreciseFunctionCoverage} from ${JSON.stringify(helper)};
const debuggerSession=new inspector.Session();debuggerSession.connect();
await new Promise((resolve,reject)=>debuggerSession.post('Debugger.enable',{},error=>error?reject(error):resolve()));
const collector=await startPreciseFunctionCoverage();
async function inspect(){await Promise.resolve();await Promise.resolve();await Promise.resolve();}
async function openProtectedRoot(){await Promise.resolve();await Promise.resolve();}
await inspect();await inspect();await inspect();await openProtectedRoot();
writeFileSync(${JSON.stringify(output)},JSON.stringify(await collector.finish()));
debuggerSession.disconnect();
`;
    writeFileSync(file, text);
    execFileSync(process.execPath, [file], { timeout: 10000 });
    const raw = JSON.parse(readFileSync(output, 'utf8'));
    const observed = raw.result.filter((item) => item.url === pathToFileURL(file).href);
    assert.equal(observed.length, 1);
    const projected = api.projectRegistrationCostCoverage({
      coverage: observed[0],
      source: text,
      expectedSourceSha256: createHash('sha256').update(text).digest('hex'),
    });
    assert.deepEqual(
      projected.counters.map(({ name, count }) => ({ name, count })),
      [
        { name: 'inspect', count: 3 },
        { name: 'openProtectedRoot', count: 1 },
      ]
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('worker completion captures precise calls before disabling its debugger', () => {
  const helper = new URL('../helpers/selection-attribution.mjs', import.meta.url).href;
  const base = realpathSync(mkdtempSync(path.join(tmpdir(), 'apr-worker-coverage-')));
  try {
    const file = path.join(base, 'fixture.mjs');
    const output = path.join(base, 'observed.json');
    const text = `import {writeFileSync} from 'node:fs';
import {startSelectionAttribution} from ${JSON.stringify(helper)};
const observer=await startSelectionAttribution([{kind:'complete',url:import.meta.url,lineNumber:6}],{preciseCoverage:true});
async function inspect(){await Promise.resolve();await Promise.resolve();await Promise.resolve();}
async function openProtectedRoot(){await Promise.resolve();await Promise.resolve();}
await inspect();await inspect();await inspect();await openProtectedRoot();
const completed=true;
await observer.close();
writeFileSync(${JSON.stringify(output)},JSON.stringify(observer.coverage()));
`;
    writeFileSync(file, text);
    execFileSync(process.execPath, [file], { timeout: 15000 });
    const raw = JSON.parse(readFileSync(output, 'utf8'));
    const observed = raw.result.filter((item) => item.url === pathToFileURL(file).href);
    assert.equal(observed.length, 1);
    const projected = api.projectRegistrationCostCoverage({
      coverage: observed[0],
      source: text,
      expectedSourceSha256: createHash('sha256').update(text).digest('hex'),
    });
    assert.deepEqual(
      projected.counters.map(({ name, count }) => ({ name, count })),
      [
        { name: 'inspect', count: 3 },
        { name: 'openProtectedRoot', count: 1 },
      ]
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('coverage projection exposes only finite storage counters bound to exact source', () => {
  assert.equal(typeof api.projectRegistrationCostCoverage, 'function');
  const project = (value, expected = sourceSha256) =>
    api.projectRegistrationCostCoverage({
      coverage: value,
      source,
      expectedSourceSha256: expected,
    });
  assert.deepEqual(project(coverage()), {
    sourceSha256,
    counters: [
      { name: 'inspect', startOffset: 0, endOffset: 27, count: 9 },
      { name: 'openProtectedRoot', startOffset: 27, endOffset: source.length, count: 3 },
    ],
  });
  for (const change of [
    (v) => {
      v.functions[0].isBlockCoverage = false;
    },
    (v) => {
      v.functions[0].ranges[0].count = -1;
    },
    (v) => {
      v.functions[0].ranges[0].endOffset = source.length + 1;
    },
    (v) => {
      v.functions.push(v.functions[0]);
    },
    (v) => {
      v.functions[0].ranges = [];
    },
    (v) => {
      v.functions.splice(1, 1);
    },
  ]) {
    const value = coverage();
    change(value);
    assert.throws(() => project(value));
  }
  assert.throws(() => project(coverage(), 'b'.repeat(64)));
});

test('diagnostic completion requires actual complete unchanged CLI execution', () => {
  assert.equal(typeof api.validateRegistrationCostReport, 'function');
  const report = () => ({
    schema: 'ai-peer-review.registration-cost-observation/v1',
    verified: false,
    operationalAuthority: 'unavailable',
    candidate: '40a3e279d551719416eb750974fe30d011d6a37a',
    producer: 'a'.repeat(40),
    platform: 'linux',
    node: '24.21.0',
    status: 'primary-returned',
    exitCode: 0,
    childExitObserved: true,
    registrationRecordObserved: true,
    elapsedMs: 2500,
    originalBudgetMs: 30000,
    originalBudgetRenewed: false,
    completeWindowsRegistrationObserved: false,
    guaranteedStartupSavingMs: 0,
    cleanup: 'retained-unproved',
    sourceSha256,
    counters: api.projectRegistrationCostCoverage({
      coverage: coverage(),
      source,
      expectedSourceSha256: sourceSha256,
    }).counters,
  });
  assert.doesNotThrow(() => api.validateRegistrationCostReport(report()));
  for (const change of [
    (v) => {
      v.privatePath = 'private';
    },
    (v) => {
      v.verified = true;
    },
    (v) => {
      v.exitCode = 1;
    },
    (v) => {
      v.childExitObserved = false;
    },
    (v) => {
      v.registrationRecordObserved = false;
    },
    (v) => {
      v.completeWindowsRegistrationObserved = true;
    },
    (v) => {
      v.guaranteedStartupSavingMs = 1;
    },
    (v) => {
      v.originalBudgetRenewed = true;
    },
    (v) => {
      v.counters[0].name = 'private';
    },
    (v) => {
      v.counters.push(v.counters[0]);
    },
    (v) => {
      v.counters[0].privatePath = 'private';
    },
    (v) => {
      v.elapsedMs = 30000;
    },
  ]) {
    const value = report();
    change(value);
    assert.throws(() => api.validateRegistrationCostReport(value));
  }
});
