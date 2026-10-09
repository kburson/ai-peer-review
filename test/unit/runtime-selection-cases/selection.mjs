// @story #187
// Preserved runtime-selection assertions; independent CI execution group.
import {
  assert,
  test,
  parseCommand,
  readFileSync,
  writeFileSync,
  symlinkSync,
  mkdirSync,
  path,
  runtimeFixture,
  helpRequest,
  performance,
  core,
} from './shared.mjs';
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

test('runtime registration has a complete offline help contract', () => {
  const contract = helpRequest('register-runtime', 'json');
  assert.ok(contract.usage.includes('register-runtime'));
  assert.ok(contract.effects.some((value) => value.includes('account')));
});

test('caller-selected foreign OS account authority refuses', {}, async (t) => {
  const { createSelectionStore } = await core();
  const f = runtimeFixture(t);
  const store = createSelectionStore({
    account: f.account,
    packageRoot: f.packageRoot,
    kind: process.platform === 'win32' ? 'linux' : 'win32',
    security: () => {
      throw new Error('helper unavailable');
    },
  });
  await assert.rejects(store.register(), { code: 'APR_RUNTIME_ACCOUNT_UNAVAILABLE' });
});

test(
  'revalidated admission preserves unrelated clone dependencies and records timing',
  {},
  async (t) => {
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
  }
);

test(
  'bounded ordinary reads reject oversized and linked files before consuming bytes',
  {},
  async (t) => {
    const inventory = await import('../../../src/startup/runtime-inventory.mjs');
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
  }
);
