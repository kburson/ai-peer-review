// @story #190
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { runtimeFixture } from '../helpers/runtime-selection-fixture.mjs';
import { createSelectionStore } from '../../src/config/runtime-selection-core.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const require = createRequire(import.meta.url);

// Observe genuine C1 FileHandles; no substituted protection observation or
// constructor capability. This interception supplies diagnostic counts only.
function observeDescriptors(t, directory) {
  const fs = require('node:fs/promises'),
    original = fs.open,
    records = [];
  fs.open = function (...args) {
    const retained =
      args[0] === directory &&
      /\bat openProtectedRoot \([^\n]*storage-protection\.mjs:/.test(new Error().stack);
    const result = Reflect.apply(original, this, args);
    if (retained)
      result.then(
        (handle) => {
          const record = { closed: false };
          records.push(record);
          const close = handle.close;
          handle.close = function (...values) {
            const closing = Reflect.apply(close, this, values);
            closing.then(
              () => {
                record.closed = handle.fd === -1;
              },
              () => {}
            );
            return closing;
          };
        },
        () => {}
      );
    return result;
  };
  syncBuiltinESMExports();
  t.after(() => {
    fs.open = original;
    syncBuiltinESMExports();
  });
  return records;
}
const directory = (f) =>
  path.join(
    f.home,
    process.platform === 'win32' ? 'AppData/Local/ai-peer-review' : '.config/ai-peer-review'
  );
const context = () => ({
  signal: new AbortController().signal,
  deadline: performance.now() + 30000,
});
test('two fresh selection reads retain one descriptor only within each bounded admission', async (t) => {
  const f = runtimeFixture(t),
    store = createSelectionStore({ account: f.account, packageRoot: f.packageRoot });
  const selected = await store.register();
  const records = observeDescriptors(t, directory(f));
  assert.equal((await store.assertSelected(context())).selection_id, selected.selection_id);
  assert.equal(records.length, 1, 'one genuine descriptor spans the two fresh snapshots');
  assert.equal(
    records.every((record) => record.closed),
    true,
    'descriptor exit is observed before admission returns'
  );
  assert.equal((await store.assertSelected(context())).selection_id, selected.selection_id);
  assert.equal(records.length, 2, 'a later admission opens its own descriptor');
  assert.equal(
    records.every((record) => record.closed),
    true
  );
});
test('abort on the second fresh account lookup closes the retained descriptor', async (t) => {
  const f = runtimeFixture(t),
    controller = new AbortController();
  let armed = false,
    calls = 0;
  const store = createSelectionStore({
    packageRoot: f.packageRoot,
    account() {
      if (armed && ++calls === 2) controller.abort();
      return f.account();
    },
  });
  await store.register();
  const records = observeDescriptors(t, directory(f));
  armed = true;
  await assert.rejects(
    store.assertSelected({ signal: controller.signal, deadline: performance.now() + 30000 }),
    { code: 'APR_RUNTIME_SELECTION_INVALID' }
  );
  assert.equal(calls, 2, 'the second account lookup is still performed');
  assert.equal(records.length, 1);
  assert.equal(
    records.every((record) => record.closed),
    true
  );
});
test('a changed selection between snapshots refuses and closes the shared descriptor', async (t) => {
  const f = runtimeFixture(t);
  let armed = false,
    calls = 0;
  const store = createSelectionStore({
    packageRoot: f.packageRoot,
    account() {
      if (armed && ++calls === 2) {
        const value = JSON.parse(readFileSync(file));
        value.selection_id = randomUUID();
        writeFileSync(file, JSON.stringify(value));
      }
      return f.account();
    },
  });
  await store.register();
  const file = await store.location();
  const records = observeDescriptors(t, directory(f));
  armed = true;
  await assert.rejects(store.assertSelected(context()), { code: 'APR_RUNTIME_CHANGED' });
  assert.equal(records.length, 1);
  assert.equal(
    records.every((record) => record.closed),
    true
  );
});
test('a different account location cannot borrow the earlier protected descriptor', async (t) => {
  const f = runtimeFixture(t),
    other = runtimeFixture(t);
  let armed = false,
    calls = 0;
  const store = createSelectionStore({
    packageRoot: f.packageRoot,
    account() {
      return armed && ++calls === 2 ? other.account() : f.account();
    },
  });
  await store.register();
  const records = observeDescriptors(t, directory(f));
  armed = true;
  await assert.rejects(store.assertSelected(context()), { code: 'APR_RUNTIME_CHANGED' });
  assert.equal(records.length, 1);
  assert.equal(
    records.every((record) => record.closed),
    true
  );
});
