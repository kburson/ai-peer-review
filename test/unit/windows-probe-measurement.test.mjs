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
