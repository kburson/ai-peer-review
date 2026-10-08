// cspell:words nonrepository
// @story #186
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, realpath, rename, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { execFileSync } from 'node:child_process';
import { canonicalProjectIdentity, rootDigest } from '../../src/broker/identity.mjs';
const identity = await import('../../src/broker/identity.mjs');
const api = await import('../../src/broker/portable-platform.mjs').catch(() => ({}));
const context = () => ({
  signal: new AbortController().signal,
  deadline: performance.now() + 30000,
});
function available() {
  assert.equal(typeof api.initializePortableOperations, 'function');
  assert.equal(typeof api.isPortableOperations, 'function');
  assert.equal(typeof identity.canonicalPortableProjectIdentity, 'function');
}
async function directory(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'apr-stock-identity-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return realpath(root);
}
test('caller objects and copied operation methods never pass private membership', async (t) => {
  available();
  const input = context();
  const operations = await api.initializePortableOperations(input);
  assert.equal(api.isPortableOperations(operations), true);
  assert.equal(api.isPortableOperations({ ...operations }), false);
  const cwd = await directory(t);
  await assert.rejects(
    identity.canonicalPortableProjectIdentity({ cwd, operations: { ...operations }, ...input }),
    /operations|identity|principal/i
  );
});
test('actual stock Git identity retains the existing independently derived root tuple', async (t) => {
  available();
  const cwd = await directory(t);
  execFileSync('git', ['init', '--quiet', cwd]);
  const input = context();
  const operations = await api.initializePortableOperations(input);
  const observed = await identity.canonicalPortableProjectIdentity({ cwd, operations, ...input });
  const user =
    process.platform === 'win32'
      ? /"(S-1-[0-9-]+)"/u.exec(
          execFileSync('C:\\Windows\\System32\\whoami.exe', ['/user', '/fo', 'csv', '/nh'], {
            encoding: 'utf8',
            timeout: 5000,
          })
        )?.[1]
      : String(process.geteuid());
  assert.equal(await operations.userId(), user);
  const expected = [
    'ai-peer-review.broker-root/v1',
    cwd,
    await realpath(path.join(cwd, '.git')),
    user,
  ];
  assert.deepEqual(observed.tuple, expected);
  assert.equal(observed.digest, rootDigest(expected));
  assert.ok(Object.isFrozen(observed));
  const legacy = canonicalProjectIdentity({
    cwd,
    platform: {
      kind: process.platform,
      canonicalPath: (value) => value,
      userId: () => user,
      repository: {
        physicalLocation: () => ({ physicalRoot: expected[1], commonDirectory: expected[2] }),
      },
    },
  });
  assert.equal(observed.digest, legacy.digest);
});
test('stock nonrepository identity does not invent a common directory', async (t) => {
  available();
  const cwd = await directory(t);
  const input = context();
  const operations = await api.initializePortableOperations(input);
  const observed = await identity.canonicalPortableProjectIdentity({ cwd, operations, ...input });
  assert.equal(observed.physicalRoot, cwd);
  assert.equal(observed.commonDirectory, null);
});
test('aborted and expired original contexts refuse initialization', async () => {
  available();
  const cancelled = new AbortController();
  cancelled.abort();
  await assert.rejects(
    api.initializePortableOperations({
      signal: cancelled.signal,
      deadline: performance.now() + 1000,
    }),
    (error) => /abort|budget|deadline/i.test(error.details?.reason ?? '')
  );
  await assert.rejects(
    api.initializePortableOperations({
      signal: new AbortController().signal,
      deadline: performance.now() - 1,
    }),
    (error) => /budget|deadline/i.test(error.details?.reason ?? '')
  );
});
test('a later abort fences genuine operations rather than renewing their context', async (t) => {
  available();
  const controller = new AbortController();
  const input = { signal: controller.signal, deadline: performance.now() + 30000 };
  const operations = await api.initializePortableOperations(input);
  const cwd = await directory(t);
  controller.abort();
  await assert.rejects(
    identity.canonicalPortableProjectIdentity({ cwd, operations, ...input }),
    (error) => /abort|budget|deadline/i.test(error.details?.reason ?? '')
  );
});
test('caller context substitution cannot extend a genuine factory deadline', async (t) => {
  available();
  const cwd = await directory(t);
  const input = context();
  const operations = await api.initializePortableOperations(input);
  await assert.rejects(
    identity.canonicalPortableProjectIdentity({ cwd, operations, ...context() }),
    /context|budget|authority/i
  );
});
test('principal and adapter injection is refused at the production factory boundary', async () => {
  available();
  await assert.rejects(
    api.initializePortableOperations({ ...context(), osAdapter: { userId: () => 'forged' } }),
    /input|context|adapter/i
  );
});
test('a changed canonical path identity refuses within the original context', async (t) => {
  available();
  const cwd = await directory(t);
  const input = context();
  const operations = await api.initializePortableOperations(input);
  await operations.canonicalPath(cwd);
  const displaced = cwd + '-displaced';
  await rename(cwd, displaced);
  t.after(() => rm(displaced, { recursive: true, force: true }));
  await mkdir(cwd);
  await assert.rejects(operations.canonicalPath(cwd), /path|replaced|identity/i);
});
test(
  'an unavailable effective POSIX principal refuses instead of using an environment name',
  { skip: process.platform === 'win32' },
  async (t) => {
    available();
    t.mock.method(process, 'geteuid', () => undefined);
    await assert.rejects(api.initializePortableOperations(context()), /principal|identity/i);
  }
);
test(
  'an effective principal change fences an existing stock object',
  { skip: process.platform === 'win32' },
  async (t) => {
    available();
    const operations = await api.initializePortableOperations(context());
    const uid = process.geteuid();
    t.mock.method(process, 'geteuid', () => uid + 1);
    await assert.rejects(operations.userId(), /principal|identity/i);
  }
);
test('ordinary source observation cannot turn caller approval into a capability', async () => {
  available();
  const operations = await api.initializePortableOperations(context());
  const observed = await operations.observeSource();
  assert.equal(observed.absence.status, 'unavailable');
  assert.equal(observed.creation.status, 'unavailable');
  assert.ok(Object.isFrozen(observed));
});

test('production protection methods refuse caller adapters and replacement contexts', async (t) => {
  available();
  const root = await directory(t);
  const operations = await api.initializePortableOperations(context());
  await assert.rejects(
    operations.observeProtection({ root, osAdapter: { verified: true } }),
    /input|adapter|context/i
  );
});
test('a copied protection receipt cannot open a genuine guarded root through the factory', async () => {
  available();
  const operations = await api.initializePortableOperations(context());
  await assert.rejects(
    operations.openProtectedRoot({ receipt: { verified: true, root: '/forged' } }),
    /protection|receipt|guard/i
  );
});
test(
  'stock protection observations and guarded descriptors are composed on a real private root',
  { skip: process.platform === 'win32' },
  async (t) => {
    available();
    const root = await directory(t);
    const operations = await api.initializePortableOperations(context());
    const receipt = await operations.observeProtection({ root });
    assert.equal(receipt.verified, true);
    const guard = await operations.openProtectedRoot({ receipt });
    try {
      assert.equal(typeof guard.verify, 'function');
      await guard.verify();
    } finally {
      await guard.close();
    }
  }
);

test(
  'review: canonical path refuses cancellation at its final filesystem observation',
  { skip: process.platform === 'win32' },
  async (t) => {
    const { faultedPortableSystem } = await import('../helpers/portable-consumer-fixtures.mjs');
    const cwd = await directory(t);
    const controller = new AbortController();
    const key = Symbol.for('apr-186-final-path-abort');
    globalThis[key] = controller;
    t.after(() => delete globalThis[key]);
    const filesystemModule =
      'data:text/javascript;base64,' +
      Buffer.from(
        "import * as fs from 'node:fs/promises'; export const lstat = fs.lstat, readFile = fs.readFile; let calls=0; export async function realpath(value){const result=await fs.realpath(value); if(++calls===2)globalThis[Symbol.for('apr-186-final-path-abort')].abort(); return result;}"
      ).toString('base64');
    const module = await faultedPortableSystem({ filesystemModule });
    const system = await module.initializePortableSystem({
      signal: controller.signal,
      deadline: performance.now() + 30000,
    });
    await assert.rejects(
      system.canonicalPath(cwd),
      (error) => error.details?.reason === 'operation-aborted'
    );
  }
);
test(
  'review: failed post-open cleanup retains only retry authority until closure succeeds',
  { skip: process.platform === 'win32' },
  async (t) => {
    const { faultedPortableSystem } = await import('../helpers/portable-consumer-fixtures.mjs');
    const controller = new AbortController();
    const state = { controller, closed: false, attempts: 0 };
    const key = Symbol.for('apr-186-close-retry');
    globalThis[key] = state;
    t.after(() => delete globalThis[key]);
    const protectionModule =
      'data:text/javascript;base64,' +
      Buffer.from(
        "export async function openProtectedRoot(){const state=globalThis[Symbol.for('apr-186-close-retry')]; state.controller.abort(); return Object.freeze({async close(){if(++state.attempts===1)throw new Error('descriptor-close-failed'); state.closed=true;}, async verify(){throw new Error('must-not-grant-authority');}});}"
      ).toString('base64');
    const module = await faultedPortableSystem({ protectionModule });
    const system = await module.initializePortableSystem({
      signal: controller.signal,
      deadline: performance.now() + 30000,
    });
    let failure;
    try {
      await system.openProtectedRoot({ receipt: {} });
    } catch (error) {
      failure = error;
    }
    assert.equal(failure?.details?.reason, 'operation-aborted', String(failure));
    assert.equal(state.closed, false);
    assert.equal(typeof failure.retryCleanup, 'function');
    assert.equal(failure.guard, undefined);
    await failure.retryCleanup();
    assert.equal(state.closed, true);
    await failure.retryCleanup();
    assert.equal(state.attempts, 2);
    await assert.rejects(system.userId(), (error) => error.details?.reason === 'operation-aborted');
  }
);

test('[#187] canonical paths bracket filesystem observations with two fresh actual principals', () => {
  const result = execFileSync(
    process.execPath,
    ['test/helpers/canonical-principal-observation.mjs', 'count'],
    { encoding: 'utf8', timeout: 35000 }
  );
  assert.equal(JSON.parse(result).observations, 2);
});
test('[#187] path replacement during the final actual principal observation refuses', () => {
  const result = execFileSync(
    process.execPath,
    ['test/helpers/canonical-principal-observation.mjs', 'replacement'],
    { encoding: 'utf8', timeout: 35000 }
  );
  assert.equal(JSON.parse(result).replaced, true);
});

test('[#187] final path integrity uses the same native canonical rendering as awaited observations', () => {
  const result = execFileSync(
    process.execPath,
    ['test/helpers/canonical-principal-observation.mjs', 'rendering'],
    { encoding: 'utf8', timeout: 35000 }
  );
  assert.equal(JSON.parse(result).actualStock, true);
});

test('[#187] compound installation paths share two fresh stock principals without caching observations', () => {
  const result = execFileSync(
    process.execPath,
    ['test/helpers/canonical-principal-observation.mjs', 'batch'],
    { encoding: 'utf8', timeout: 35000 }
  );
  assert.equal(JSON.parse(result).observations, 2);
});

test('[#187] compound path generations remain current after the last stock principal await', () => {
  const result = execFileSync(
    process.execPath,
    ['test/helpers/canonical-principal-observation.mjs', 'batch-replacement'],
    { encoding: 'utf8', timeout: 35000 }
  );
  assert.equal(JSON.parse(result).replaced, true);
});
test('[#187] compound path observation refuses unbounded, sparse and malformed path inputs', async () => {
  const { initializePortableSystem } = await import('../../src/broker/portable-system.mjs');
  const system = await initializePortableSystem(context());
  for (const values of [
    [],
    Array(17).fill(process.execPath),
    Array(2),
    [null],
    [process.execPath, 'relative'],
  ])
    await assert.rejects(system.canonicalPaths(values), /identity|context|path/i);
});
