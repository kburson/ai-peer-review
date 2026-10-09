// @story #187
// Preserved runtime-selection assertions; independent CI execution group.
import { assert, test, writeFileSync, renameSync, path, runtimeFixture, core } from './shared.mjs';
test(
  'relocation requires explicit update and rejects stale generation or forged caller paths',
  {},
  async (t) => {
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
  }
);

test(
  'one Node-manager relocation updates both clones through the account generation',
  {},
  async (t) => {
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
  }
);

for (const [name, lookup, dryRun] of [
  ['dry-run planning', 1, true],
  ['registration read back', 2, false],
]) {
  test(`replacement during ${name} refuses an old registration process`, {}, async (t) => {
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

test(
  'removing the loaded selected installation refuses with a runtime diagnostic',
  {},
  async (t) => {
    const { createSelectionStore } = await core();
    const f = runtimeFixture(t);
    const store = createSelectionStore({ account: f.account, packageRoot: f.packageRoot });
    await store.register({ dryRun: false });
    await store.assertSelected();
    const moved = f.packageRoot + '-removed';
    renameSync(f.packageRoot, moved);
    try {
      await assert.rejects(store.assertSelected(), { code: 'APR_RUNTIME_CHANGED' });
    } finally {
      renameSync(moved, f.packageRoot);
    }
  }
);
