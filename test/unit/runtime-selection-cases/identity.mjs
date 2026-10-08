// @story #187
// Preserved runtime-selection assertions; independent CI execution group.
import {
  assert,
  test,
  readFileSync,
  writeFileSync,
  symlinkSync,
  path,
  runtimeFixture,
  core,
} from './shared.mjs';
test('in-place upgrade keeps locator generation but fences old observations', {}, async (t) => {
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

test('mixed replacement and unsafe declared paths refuse inventory admission', {}, async (t) => {
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

test(
  'stable observation is reusable after revalidation and symlink modules refuse',
  {},
  async (t) => {
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
  }
);

test('extra executable files cannot hide outside the declared module inventory', {}, async (t) => {
  const { createSelectionStore } = await core();
  const f = runtimeFixture(t);
  const store = createSelectionStore({ account: f.account, packageRoot: f.packageRoot });
  await store.register();
  writeFileSync(path.join(f.packageRoot, 'foreign.mjs'), 'export const extra = true;');
  await assert.rejects(store.assertSelected(), { code: 'APR_RUNTIME_INVENTORY_INVALID' });
});

test('selection uses actual host protection and never invokes a caller native adapter', async (t) => {
  const { createSelectionStore } = await core();
  const f = runtimeFixture(t);
  let calls = 0;
  const store = createSelectionStore({
    account: f.account,
    packageRoot: f.packageRoot,
    security: () => {
      calls++;
      throw new Error('caller native adapter invoked');
    },
  });
  await store.register();
  assert.equal((await store.assertSelected()).packageRoot, f.packageRoot);
  assert.equal(
    await store.location(),
    path.join(
      f.home,
      process.platform === 'win32'
        ? 'AppData/Local/ai-peer-review/runtime-selection.json'
        : '.config/ai-peer-review/runtime-selection.json'
    )
  );
  assert.equal(calls, 0);
});

test(
  'an old process fences changed runtime bytes even without a caller observation',
  {},
  async (t) => {
    const { createSelectionStore } = await core();
    const f = runtimeFixture(t);
    const store = createSelectionStore({ account: f.account, packageRoot: f.packageRoot });
    await store.register();
    writeFileSync(path.join(f.packageRoot, 'runner.mjs'), 'export const upgraded = true;');
    f.seal();
    await assert.rejects(store.assertSelected(), { code: 'APR_RUNTIME_CHANGED' });
    assert.ok(
      await createSelectionStore({
        account: f.account,
        packageRoot: f.packageRoot,
      }).assertSelected()
    );
  }
);

test('in-place Node replacement fences the old process', {}, async (t) => {
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
