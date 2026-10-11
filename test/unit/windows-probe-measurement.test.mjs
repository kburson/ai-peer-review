// @story #198
import test from 'node:test';
import assert from 'node:assert/strict';
import { open, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createProbeMeasurement } from '../helpers/windows-probe-measurement-core.mjs';

async function withHandles(run) {
  const dir = await mkdtemp(path.join(tmpdir(), 'apr-probe-'));
  const a = await open(path.join(dir, 'a'), 'w+');
  const b = await open(path.join(dir, 'b'), 'w+');
  try {
    await run(a, b);
  } finally {
    await a.close();
    await b.close();
    await rm(dir, { recursive: true });
  }
}
function observe(m, signal, handle, { kind = 'observe', success = true, checked = true } = {}) {
  const call = m.begin({ signal, kind });
  m.complete(call, { success, elapsedMs: 350 });
  if (checked) m.checkGuard(handle, { success: true });
}
test('only successful serial repeats on the same real guard and signal are removable', async () => {
  await withHandles(async (a) => {
    const m = createProbeMeasurement(),
      signal = new AbortController().signal;
    m.registerGuard(a);
    observe(m, signal, a);
    observe(m, signal, a);
    observe(m, signal, a);
    const r = m.report({ elapsedMs: 30250 });
    assert.deepEqual(r.counts, { total: 3, first: 1, removable: 2, outside: 0 });
    assert.equal(r.guaranteedSavedMs, 0);
    assert.equal(r.decision, 'insufficient-evidence');
    assert.equal(r.requiredSavingPerRepeatMs, 125);
    assert.equal(r.verified, false);
    assert.equal(r.operationalAuthority, 'unavailable');
  });
});
test('separate guards and original signals retain separate first starts', async () => {
  await withHandles(async (a, b) => {
    const m = createProbeMeasurement(),
      s = new AbortController().signal,
      t = new AbortController().signal;
    m.registerGuard(a);
    m.registerGuard(b);
    observe(m, s, a);
    observe(m, s, b);
    observe(m, t, a);
    observe(m, t, a);
    assert.deepEqual(m.report().counts, { total: 4, first: 3, removable: 1, outside: 0 });
  });
});
test('overlap and reverse completion cannot borrow another guard check', async () => {
  await withHandles(async (a) => {
    const m = createProbeMeasurement(),
      signal = new AbortController().signal;
    m.registerGuard(a);
    const x = m.begin({ signal, kind: 'observe' }),
      y = m.begin({ signal, kind: 'observe' });
    m.complete(y, { success: true, elapsedMs: 350 });
    m.complete(x, { success: true, elapsedMs: 350 });
    m.checkGuard(a, { success: true });
    assert.deepEqual(m.report().counts, { total: 2, first: 0, removable: 0, outside: 2 });
  });
});
test('query failure, failed check, missing signal and provisioning never save starts', async () => {
  await withHandles(async (a) => {
    const m = createProbeMeasurement(),
      signal = new AbortController().signal;
    m.registerGuard(a);
    observe(m, signal, a, { success: false });
    const c = m.begin({ signal, kind: 'observe' });
    m.complete(c, { success: true, elapsedMs: 300 });
    m.checkGuard(a, { success: false });
    observe(m, null, a);
    observe(m, signal, a, { kind: 'provision' });
    observe(m, signal, a, { kind: 'replacement' });
    assert.deepEqual(m.report().counts, { total: 5, first: 0, removable: 0, outside: 5 });
  });
});
test('closed guard and missed checks leave calls unclassified', async () => {
  await withHandles(async (a) => {
    const m = createProbeMeasurement(),
      signal = new AbortController().signal;
    m.registerGuard(a);
    observe(m, signal, a);
    m.closeGuard(a);
    observe(m, signal, a);
    const c = m.begin({ signal, kind: 'observe' });
    m.complete(c, { success: true, elapsedMs: 500 });
    assert.deepEqual(m.report().counts, { total: 3, first: 1, removable: 0, outside: 2 });
  });
});
test('bounded overflow poisons attribution and reports dropped starts honestly', async () => {
  await withHandles(async (a) => {
    const m = createProbeMeasurement({ limit: 2 }),
      signal = new AbortController().signal;
    m.registerGuard(a);
    observe(m, signal, a);
    observe(m, signal, a);
    observe(m, signal, a);
    const r = m.report();
    assert.deepEqual(r.counts, { total: 3, first: 0, removable: 0, outside: 3 });
    assert.equal(r.truncated, true);
    assert.equal(r.dropped, 1);
  });
});
test('projection contains opaque numbers and categories only', async () => {
  await withHandles(async (a) => {
    const m = createProbeMeasurement(),
      signal = new AbortController().signal;
    m.registerGuard(a);
    observe(m, signal, a);
    const r = m.report();
    assert.deepEqual(
      Object.keys(r.calls[0]).sort(),
      ['category', 'context', 'elapsedMs', 'guard', 'id', 'kind', 'success'].sort()
    );
    assert.equal(typeof r.calls[0].guard, 'number');
    assert.equal(typeof r.calls[0].context, 'number');
    assert.equal(JSON.stringify(r).includes('apr-probe-'), false);
    assert.equal(JSON.stringify(r).includes('S-1-'), false);
  });
});

test('preload preserves real file operations, callback exec and promisified exec', async () => {
  const { spawnSync } = await import('node:child_process');
  const script = `
    import {open,mkdtemp,rm} from 'node:fs/promises';
    import {tmpdir} from 'node:os';import path from 'node:path';
    import {execFile} from 'node:child_process';import {promisify} from 'node:util';
    const dir=await mkdtemp(path.join(tmpdir(),'apr-forward-'));
    const f=await open(path.join(dir,'value'),'w+');await f.writeFile('real data');
    const size=(await f.stat()).size;await f.close();await rm(dir,{recursive:true});
    const callback=await new Promise((resolve,reject)=>execFile(process.execPath,['-e','process.stdout.write("callback")'],(err,out)=>err?reject(err):resolve(out)));
    const promised=await promisify(execFile)(process.execPath,['-e','process.stdout.write("promise")']);
    console.log(JSON.stringify({size,callback,promised:promised.stdout}));
  `;
  const r = spawnSync(
    process.execPath,
    [
      '--import',
      new URL('../helpers/windows-probe-measurement-preload.mjs', import.meta.url).href,
      '--input-type=module',
      '-e',
      script,
    ],
    { encoding: 'utf8' }
  );
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), { size: 9, callback: 'callback', promised: 'promise' });
  const projection = JSON.parse(r.stderr.trim());
  assert.equal(projection.diagnostic, 'windows-probe-measurement');
  assert.deepEqual(projection.counts, { total: 0, first: 0, removable: 0, outside: 0 });
});

test('download validation rejects private fields, wrong source and invented saved time', async () => {
  const { validateMeasurementReport } =
    await import('../helpers/windows-probe-measurement-report.mjs');
  const producer = '1'.repeat(40);
  const fixture = {
    schema: 'ai-peer-review.windows-probe-measurement/v1',
    candidate: '40a3e279d551719416eb750974fe30d011d6a37a',
    producer,
    runId: '123',
    runAttempt: '1',
    job: 'probe',
    node: '24.20.0',
    platform: 'win32',
    release: '10.0.26100',
    token: 'ordinary',
    collectionComplete: true,
    status: 'primary-refused',
    code: 'APR_BROKER_STALE',
    cleanup: 'retained-unproved',
    measurement: {
      verified: false,
      operationalAuthority: 'unavailable',
      calls: [],
      counts: { total: 0, first: 0, removable: 0, outside: 0 },
      truncated: false,
      dropped: 0,
      originalBudgetMs: 30000,
      elapsedMs: 30250,
      residualStarts: 0,
      guaranteedSavedMs: 0,
      requiredSavingPerRepeatMs: null,
      decision: 'insufficient-evidence',
    },
  };
  const expected = { producer, runId: '123', runAttempt: '1', token: 'ordinary', node: '24' };
  assert.doesNotThrow(() => validateMeasurementReport(fixture, expected));
  for (const mutate of [
    (r) => (r.path = 'secret'),
    (r) => (r.candidate = '2'.repeat(40)),
    (r) => (r.producer = '3'.repeat(40)),
    (r) => (r.measurement.guaranteedSavedMs = 300),
    (r) => (r.measurement.operationalAuthority = 'available'),
    (r) => (r.measurement.counts.removable = 1),
    (r) => (r.collectionComplete = false),
    (r) => (r.node = '26.0.0'),
  ]) {
    const bad = structuredClone(fixture);
    mutate(bad);
    assert.throws(() => validateMeasurementReport(bad, expected));
  }
});

test('an observation before the retained guard exists remains outside', async () => {
  await withHandles(async (a) => {
    const m = createProbeMeasurement(),
      signal = new AbortController().signal;
    const c = m.begin({ signal, kind: 'observe' });
    m.complete(c, { success: true, elapsedMs: 350 });
    m.registerGuard(a);
    m.checkGuard(a, { success: true });
    observe(m, signal, a);
    observe(m, signal, a);
    assert.deepEqual(m.report().counts, { total: 3, first: 1, removable: 1, outside: 1 });
  });
});

test('actual collection provenance refuses missing, duplicate and failed workers', async () => {
  const { validateMeasurementProvenance } =
    await import('../helpers/windows-probe-measurement-report.mjs');
  const producer = '1'.repeat(40);
  const names = [
    'Windows probes / Node 24 / ordinary',
    'Windows probes / Node 24 / limited',
    'Windows probes / Node 26 / ordinary',
    'Windows probes / Node 26 / limited',
  ];
  const value = {
    run: {
      id: 123,
      run_attempt: 1,
      head_sha: producer,
      status: 'completed',
      conclusion: 'success',
      path: '.github/workflows/windows-probe-measurement.yml',
      event: 'push',
      head_branch: 'codex/198-draft',
      repository: { full_name: 'kburson/ai-peer-review' },
    },
    jobs: {
      total_count: 4,
      jobs: names.map((name, i) => ({
        id: i + 1,
        name,
        status: 'completed',
        conclusion: 'success',
        run_id: 123,
        run_attempt: 1,
      })),
    },
    artifacts: {
      total_count: 4,
      artifacts: ['24-ordinary', '24-limited', '26-ordinary', '26-limited'].map((key, i) => ({
        id: i + 1,
        name: 'windows-probes-' + key + '-1',
        expired: false,
      })),
    },
  };
  assert.doesNotThrow(() => validateMeasurementProvenance(value, producer));
  for (const mutate of [
    (r) => r.jobs.jobs.pop(),
    (r) => (r.jobs.jobs[1].name = r.jobs.jobs[0].name),
    (r) => (r.jobs.jobs[0].conclusion = 'failure'),
    (r) => (r.run.head_sha = '2'.repeat(40)),
    (r) => (r.artifacts.artifacts[0].expired = true),
    (r) => (r.run.path = '.github/workflows/other.yml'),
    (r) => (r.jobs.jobs[0].run_id = 124),
  ]) {
    const bad = structuredClone(value);
    mutate(bad);
    assert.throws(() => validateMeasurementProvenance(bad, producer));
  }
});
