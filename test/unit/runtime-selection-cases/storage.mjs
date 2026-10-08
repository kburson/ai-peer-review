// @story #187
// Preserved runtime-selection assertions; independent CI execution group.
import {
  assert,
  test,
  chmodSync,
  readFileSync,
  writeFileSync,
  path,
  runtimeFixture,
  randomUUID,
  core,
} from './shared.mjs';
test('one account selection is shared by clones and ignores caller environment', {}, async (t) => {
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
    path.join(
      f.home,
      process.platform === 'win32'
        ? 'AppData/Local/ai-peer-review/runtime-selection.json'
        : '.config/ai-peer-review/runtime-selection.json'
    )
  );
});

test('unavailable account and unsafe selection bytes refuse', {}, async (t) => {
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
  if (process.platform === 'win32') writeFileSync(await store.location(), 'x'.repeat(8193));
  else chmodSync(await store.location(), 0o644);
  await assert.rejects(store.read(), { code: 'APR_RUNTIME_SELECTION_INVALID' });
});

test('Node below 24 and unknown selection schema refuse without registration', {}, async (t) => {
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

test(
  'selection generation changes fence the process without caller observations',
  {},
  async (t) => {
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
  }
);

test('replacement during final async account lookup fences admission', {}, async (t) => {
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
