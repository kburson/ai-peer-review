// @story #133
import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCommand } from '../../src/cli/parse.mjs';

// Exercise an existing interface for RED: no missing test/module masquerades as proof.
test('runtime registration is an explicit narrow maintenance command', () => {
  const parsed = parseCommand(['register-runtime', '--dry-run', '--json']);
  assert.equal(parsed.command, 'register-runtime');
  assert.equal(parsed.options.dryRun, true);
});

test('runtime registration refuses caller-selected account and package roots', () => {
  for (const flag of ['--account-home', '--selection-file', '--package-root', '--node']) {
    assert.throws(() => parseCommand(['register-runtime', flag, '/foreign']), {
      code: 'APR_USAGE',
    });
  }
});

import { chmodSync, readFileSync, writeFileSync, symlinkSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { runtimeFixture } from '../helpers/runtime-selection-fixture.mjs';

async function core() {
  const loaded = await import('../../src/config/runtime-selection-core.mjs').catch(() => ({}));
  assert.equal(
    typeof loaded.createSelectionStore,
    'function',
    'account-bound selection store exists'
  );
  return loaded;
}

test('one account selection is shared by clones and ignores caller environment', async (t) => {
  const { createSelectionStore } = await core();
  const f = runtimeFixture(t);
  const store = createSelectionStore({ account: f.account, packageRoot: f.packageRoot });
  const registered = await store.register({ dryRun: false });
  for (const env of [
    { HOME: '/forged' },
    { USERPROFILE: '/forged' },
    { XDG_CONFIG_HOME: '/forged' },
    { APPDATA: '/forged' },
  ]) {
    assert.equal(
      (await store.read({ env, cwd: '/other-clone' })).selection_id,
      registered.selection_id
    );
  }
  assert.equal(
    await store.location(),
    path.join(f.home, '.config/ai-peer-review/runtime-selection.json')
  );
});

test('unavailable account and unsafe selection bytes refuse', async (t) => {
  const { createSelectionStore } = await core();
  const f = runtimeFixture(t);
  await assert.rejects(
    createSelectionStore({
      account: () => {
        throw new Error('unavailable');
      },
      packageRoot: f.packageRoot,
    }).read(),
    { code: 'APR_RUNTIME_ACCOUNT_UNAVAILABLE' }
  );
  const store = createSelectionStore({ account: f.account, packageRoot: f.packageRoot });
  await store.register({ dryRun: false });
  chmodSync(await store.location(), 0o644);
  await assert.rejects(store.read(), { code: 'APR_RUNTIME_SELECTION_INVALID' });
});

test('in-place upgrade keeps locator generation but fences old observations', async (t) => {
  const { createSelectionStore } = await core();
  const f = runtimeFixture(t);
  const store = createSelectionStore({ account: f.account, packageRoot: f.packageRoot });
  const first = await store.register({ dryRun: false });
  const observed = await store.assertSelected();
  writeFileSync(path.join(f.packageRoot, 'runner.mjs'), 'export const version = 2;\n');
  f.seal();
  assert.equal((await store.read()).selection_id, first.selection_id);
  await assert.rejects(store.assertSelected({ previousObservation: observed }), {
    code: 'APR_RUNTIME_CHANGED',
  });
  const fresh = await createSelectionStore({
    account: f.account,
    packageRoot: f.packageRoot,
  }).assertSelected();
  assert.notEqual(fresh.inventoryDigest, observed.inventoryDigest);
});

test('mixed replacement and unsafe declared paths refuse inventory admission', async (t) => {
  const { createSelectionStore } = await core();
  const f = runtimeFixture(t);
  const store = createSelectionStore({ account: f.account, packageRoot: f.packageRoot });
  await store.register({ dryRun: false });
  writeFileSync(path.join(f.packageRoot, 'runner.mjs'), 'mixed bytes');
  await assert.rejects(store.assertSelected(), { code: 'APR_RUNTIME_INVENTORY_INVALID' });
  f.seal();
  writeFileSync(
    path.join(f.packageRoot, 'runtime-inventory.json'),
    JSON.stringify({
      schema: 'ai-peer-review.runtime-inventory/v1',
      files: [{ path: '../escape', sha256: '0'.repeat(64) }],
    })
  );
  await assert.rejects(store.assertSelected(), { code: 'APR_RUNTIME_INVENTORY_INVALID' });
});

test('stable observation is reusable after revalidation and symlink modules refuse', async (t) => {
  const { createSelectionStore } = await core();
  const f = runtimeFixture(t);
  const store = createSelectionStore({ account: f.account, packageRoot: f.packageRoot });
  await store.register({ dryRun: false });
  const first = await store.assertSelected();
  await Promise.resolve();
  assert.equal(
    (await store.assertSelected({ previousObservation: first })).inventoryDigest,
    first.inventoryDigest
  );
  symlinkSync('runner.mjs', path.join(f.packageRoot, 'linked.mjs'));
  const manifest = JSON.parse(readFileSync(path.join(f.packageRoot, 'runtime-inventory.json')));
  manifest.files.push({ path: 'linked.mjs', sha256: manifest.files[1].sha256 });
  manifest.files.sort((a, b) => a.path.localeCompare(b.path));
  writeFileSync(path.join(f.packageRoot, 'runtime-inventory.json'), JSON.stringify(manifest));
  await assert.rejects(store.assertSelected(), { code: 'APR_RUNTIME_INVENTORY_INVALID' });
});

import { helpRequest } from '../../src/cli/help-data.mjs';
test('runtime registration has a complete offline help contract', () => {
  const contract = helpRequest('register-runtime', 'json');
  assert.ok(contract.usage.includes('register-runtime'));
  assert.ok(contract.effects.some((value) => value.includes('account')));
});

test('relocation requires explicit update and rejects stale generation or forged caller paths', async (t) => {
  const { createSelectionStore } = await core();
  const a = runtimeFixture(t),
    b = runtimeFixture(t);
  const first = createSelectionStore({ account: a.account, packageRoot: a.packageRoot });
  await first.register({ dryRun: false });
  const observed = await first.assertSelected();
  const moved = createSelectionStore({ account: a.account, packageRoot: b.packageRoot });
  await assert.rejects(moved.register({ dryRun: false }), {
    code: 'APR_RUNTIME_SELECTION_INVALID',
  });
  const changed = await moved.register({ dryRun: false, update: true });
  assert.notEqual(changed.selection_id, observed.selection_id);
  await assert.rejects(first.assertSelected({ previousObservation: observed }), {
    code: 'APR_RUNTIME_CHANGED',
  });
  await assert.rejects(moved.assertSelected({ executingPackageRoot: a.packageRoot }), {
    code: 'APR_RUNTIME_NOT_SELECTED',
  });
  await assert.rejects(moved.assertSelected({ nodeExecutable: a.packageRoot }), {
    code: 'APR_RUNTIME_NOT_SELECTED',
  });
});

test('Node below 24 and unknown selection schema refuse without registration', async (t) => {
  const { createSelectionStore } = await core();
  const f = runtimeFixture(t);
  const old = createSelectionStore({
    account: f.account,
    packageRoot: f.packageRoot,
    nodeVersion: '23.0.0',
  });
  await assert.rejects(old.register(), { code: 'APR_RUNTIME_INSTALLATION_INVALID' });
  const current = createSelectionStore({ account: f.account, packageRoot: f.packageRoot });
  await current.register();
  const file = await current.location();
  const value = JSON.parse(readFileSync(file));
  value.extra = 'foreign';
  writeFileSync(file, JSON.stringify(value));
  await assert.rejects(current.read(), { code: 'APR_RUNTIME_SELECTION_INVALID' });
});

test('extra executable files cannot hide outside the declared module inventory', async (t) => {
  const { createSelectionStore } = await core();
  const f = runtimeFixture(t);
  const store = createSelectionStore({ account: f.account, packageRoot: f.packageRoot });
  await store.register();
  writeFileSync(path.join(f.packageRoot, 'foreign.mjs'), 'export const extra = true;');
  await assert.rejects(store.assertSelected(), { code: 'APR_RUNTIME_INVENTORY_INVALID' });
});

test('Windows account authority refuses when its native ownership verifier is unavailable', async (t) => {
  const { createSelectionStore } = await core();
  const f = runtimeFixture(t);
  const store = createSelectionStore({
    account: f.account,
    packageRoot: f.packageRoot,
    kind: 'win32',
    security: () => {
      throw new Error('helper unavailable');
    },
  });
  await assert.rejects(store.register(), { code: 'APR_RUNTIME_ACCOUNT_UNAVAILABLE' });
});

test('verified Windows account uses fixed LocalAppData and private native reads', async (t) => {
  const { createSelectionStore } = await core();
  const f = runtimeFixture(t);
  let reads = 0;
  const security = () => ({
    userId: () => 'fixture-sid',
    openPrivateDirectory(directory) {
      mkdirSync(directory, { recursive: true, mode: 0o700 });
      return {
        verify: () => true,
        read: (name) => {
          reads++;
          return readFileSync(path.join(directory, name));
        },
        close() {},
      };
    },
  });
  const store = createSelectionStore({
    account: f.account,
    packageRoot: f.packageRoot,
    kind: 'win32',
    security,
  });
  await store.register();
  assert.equal(
    await store.location(),
    path.join(f.home, 'AppData/Local/ai-peer-review/runtime-selection.json')
  );
  assert.equal((await store.assertSelected()).packageRoot, f.packageRoot);
  assert.ok(reads >= 2);
});

test('an old process fences changed runtime bytes even without a caller observation', async (t) => {
  const { createSelectionStore } = await core();
  const f = runtimeFixture(t);
  const store = createSelectionStore({ account: f.account, packageRoot: f.packageRoot });
  await store.register();
  writeFileSync(path.join(f.packageRoot, 'runner.mjs'), 'export const upgraded = true;');
  f.seal();
  await assert.rejects(store.assertSelected(), { code: 'APR_RUNTIME_CHANGED' });
  assert.ok(
    await createSelectionStore({ account: f.account, packageRoot: f.packageRoot }).assertSelected()
  );
});

test('in-place Node replacement fences the old process', async (t) => {
  const { createSelectionStore } = await core();
  const f = runtimeFixture(t);
  const nodeExecutable = path.join(f.root, 'fixture-node');
  writeFileSync(nodeExecutable, 'fixture node one');
  const store = createSelectionStore({
    account: f.account,
    packageRoot: f.packageRoot,
    nodeExecutable,
  });
  await store.register();
  writeFileSync(nodeExecutable, 'fixture node two');
  await assert.rejects(store.assertSelected(), { code: 'APR_RUNTIME_CHANGED' });
});

import { randomUUID } from 'node:crypto';
test('selection generation changes fence the process without caller observations', async (t) => {
  const { createSelectionStore } = await core();
  const f = runtimeFixture(t);
  const store = createSelectionStore({ account: f.account, packageRoot: f.packageRoot });
  await store.register();
  await store.assertSelected();
  const file = await store.location();
  const value = JSON.parse(readFileSync(file));
  value.selection_id = randomUUID();
  writeFileSync(file, JSON.stringify(value));
  await assert.rejects(store.assertSelected(), { code: 'APR_RUNTIME_CHANGED' });
});

import { performance } from 'node:perf_hooks';
test('revalidated admission preserves unrelated clone dependencies and records timing', async (t) => {
  const { createSelectionStore } = await core();
  const f = runtimeFixture(t);
  const clone = path.join(f.root, 'other clone');
  mkdirSync(path.join(clone, 'node_modules'), { recursive: true });
  const sentinel = path.join(clone, 'node_modules/local-package.json');
  writeFileSync(sentinel, 'local dependency bytes');
  const before = readFileSync(sentinel);
  const start = performance.now();
  const store = createSelectionStore({ account: f.account, packageRoot: f.packageRoot });
  await store.register();
  await store.assertSelected();
  const initial = performance.now() - start;
  const repeatStart = performance.now();
  for (let i = 0; i < 25; i++) {
    await Promise.resolve();
    await store.assertSelected();
  }
  const repeated = performance.now() - repeatStart;
  assert.deepEqual(readFileSync(sentinel), before);
  t.diagnostic(
    JSON.stringify({
      fixture: 'isolated account, two-file runtime',
      initial_ms: initial,
      revalidated_25_ms: repeated,
    })
  );
});

test('bounded ordinary reads reject oversized and linked files before consuming bytes', async (t) => {
  const inventory = await import('../../src/startup/runtime-inventory.mjs');
  assert.equal(
    typeof inventory.readBoundedOrdinaryFile,
    'function',
    'bounded descriptor reader exists'
  );
  const f = runtimeFixture(t);
  const file = path.join(f.root, 'bounded');
  writeFileSync(file, '1234');
  assert.equal(inventory.readBoundedOrdinaryFile(file, 4).toString(), '1234');
  assert.throws(() => inventory.readBoundedOrdinaryFile(file, 3), {
    code: 'APR_RUNTIME_INVENTORY_INVALID',
  });
  const link = path.join(f.root, 'bounded-link');
  symlinkSync(file, link);
  assert.throws(() => inventory.readBoundedOrdinaryFile(link, 4), {
    code: 'APR_RUNTIME_INVENTORY_INVALID',
  });
});

test('one Node-manager relocation updates both clones through the account generation', async (t) => {
  const { createSelectionStore } = await core();
  const f = runtimeFixture(t);
  const oldNode = path.join(f.root, 'node manager one');
  const newNode = path.join(f.root, 'node manager two');
  writeFileSync(oldNode, 'node one');
  writeFileSync(newNode, 'node two');
  const firstClone = createSelectionStore({
    account: f.account,
    packageRoot: f.packageRoot,
    nodeExecutable: oldNode,
  });
  const secondClone = createSelectionStore({
    account: f.account,
    packageRoot: f.packageRoot,
    nodeExecutable: oldNode,
  });
  const registered = await firstClone.register();
  await secondClone.assertSelected();
  const relocated = createSelectionStore({
    account: f.account,
    packageRoot: f.packageRoot,
    nodeExecutable: newNode,
  });
  await assert.rejects(relocated.register(), { code: 'APR_RUNTIME_SELECTION_INVALID' });
  const updated = await relocated.register({ update: true });
  assert.notEqual(updated.selection_id, registered.selection_id);
  assert.equal((await firstClone.read()).nodeExecutable, newNode);
  assert.equal((await secondClone.read()).selection_id, updated.selection_id);
  await assert.rejects(firstClone.assertSelected(), { code: 'APR_RUNTIME_CHANGED' });
  await assert.rejects(secondClone.assertSelected(), { code: 'APR_RUNTIME_CHANGED' });
  assert.equal((await relocated.assertSelected()).nodeExecutable, newNode);
});

test('replacement during final async account lookup fences admission', async (t) => {
  const { createSelectionStore } = await core();
  const f = runtimeFixture(t);
  let armed = false,
    lookups = 0;
  const account = () => {
    if (armed && ++lookups === 2) {
      writeFileSync(
        path.join(f.packageRoot, 'runner.mjs'),
        'export const changedDuringAdmission = true;'
      );
      f.seal();
    }
    return f.account();
  };
  const store = createSelectionStore({ account, packageRoot: f.packageRoot });
  await store.register();
  armed = true;
  await assert.rejects(store.assertSelected(), { code: 'APR_RUNTIME_CHANGED' });
});

for (const [name, lookup, dryRun] of [
  ['dry-run planning', 1, true],
  ['registration read back', 2, false],
]) {
  test(`replacement during ${name} refuses an old registration process`, async (t) => {
    const { createSelectionStore } = await core();
    const f = runtimeFixture(t);
    let lookups = 0;
    const account = () => {
      if (++lookups === lookup) {
        writeFileSync(path.join(f.packageRoot, 'runner.mjs'), 'export const replacement = true;');
        f.seal();
      }
      return f.account();
    };
    const store = createSelectionStore({ account, packageRoot: f.packageRoot });
    await assert.rejects(store.register({ dryRun }), { code: 'APR_RUNTIME_CHANGED' });
  });
}
