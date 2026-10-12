// @story #190
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { runtimeFixture } from '../helpers/runtime-selection-fixture.mjs';
import { createSelectionStore } from '../../src/config/runtime-selection-core.mjs';
import { readFileSync, writeFileSync, renameSync, symlinkSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const require = createRequire(import.meta.url);

// Observe genuine C1 FileHandles; no substituted protection observation or
// constructor capability. This interception supplies diagnostic counts only.
function observeDescriptors(t, directory, onClose = () => {}) {
  const fs = require('node:fs/promises'),
    original = fs.open,
    records = [];
  records.snapshots = 0;
  fs.open = function (...args) {
    const retained =
      args[0] === directory &&
      /\bat openProtectedRoot \([^\n]*storage-protection\.mjs:/.test(new Error().stack);
    if (
      args[0] === path.join(directory, 'runtime-selection.json') &&
      /\bat readObserved \(/.test(new Error().stack)
    )
      records.snapshots++;
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
                onClose();
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

test('one original read scope retains one genuine guard across sixteen fresh admissions', async (t) => {
  const f = runtimeFixture(t),
    store = createSelectionStore({ account: f.account, packageRoot: f.packageRoot });
  await store.register();
  const records = observeDescriptors(t, directory(f)),
    original = context();
  assert.equal(typeof store.withReadScope, 'function');
  await store.withReadScope(original, async () => {
    for (let n = 0; n < 16; n++) await store.assertSelected(original);
  });
  assert.equal(records.length, 1);
  assert.equal(records.snapshots, 32, 'all two-per-admission snapshots remain fresh');
  assert.equal(
    records.every((record) => record.closed),
    true
  );
  await store.assertSelected(original);
  assert.equal(records.length, 2, 'closed-clean matching admission returns to one-shot');
});
test('read scope refuses register, update and dry run before changing selection', async (t) => {
  const f = runtimeFixture(t),
    store = createSelectionStore({ account: f.account, packageRoot: f.packageRoot });
  await store.register();
  const file = await store.location(),
    before = readFileSync(file),
    original = context();
  await store.withReadScope(original, async () => {
    await store.read(original);
    for (const options of [{}, { update: true }, { dryRun: true }, { update: true, dryRun: true }])
      await assert.rejects(store.register(options), { code: 'APR_SELECTION_SCOPE_UNAVAILABLE' });
  });
  assert.equal(readFileSync(file).equals(before), true);
});
test('a changed selection between scoped admissions refuses permanently and closes the actual guard', async (t) => {
  const f = runtimeFixture(t),
    store = createSelectionStore({ account: f.account, packageRoot: f.packageRoot });
  await store.register();
  const file = await store.location(),
    records = observeDescriptors(t, directory(f)),
    original = context();
  await assert.rejects(
    store.withReadScope(original, async () => {
      await store.assertSelected(original);
      const value = JSON.parse(readFileSync(file));
      value.selection_id = randomUUID();
      writeFileSync(file, JSON.stringify(value));
      await store.assertSelected(original);
    })
  );
  assert.equal(records.length, 1);
  assert.equal(
    records.every((record) => record.closed),
    true
  );
  await store.retryCleanup();
  await assert.rejects(store.withReadScope(original, async () => {}));
});

test('unawaited admission is tracked before asynchronous account lookup', async (t) => {
  const f = runtimeFixture(t),
    entered = Promise.withResolvers(),
    release = Promise.withResolvers();
  let armed = false;
  const store = createSelectionStore({
    packageRoot: f.packageRoot,
    account: async () => {
      if (armed) {
        entered.resolve();
        await release.promise;
      }
      return f.account();
    },
  });
  await store.register();
  armed = true;
  const original = context();
  let pending,
    completed = false;
  const completion = store
    .withReadScope(original, async () => {
      pending = store.assertSelected(original);
      void pending.catch(() => {});
    })
    .then(() => {
      completed = true;
    });
  await entered.promise;
  await new Promise((resolve) => setImmediate(resolve));
  const premature = completed;
  release.resolve();
  await pending;
  await completion;
  assert.equal(premature, false, 'a scope cannot complete before its unawaited admission');
});
test('caught account failure still poisons its original scope before any acquisition', async (t) => {
  const f = runtimeFixture(t);
  let fail = false;
  const store = createSelectionStore({
    packageRoot: f.packageRoot,
    account: () => {
      if (fail) throw new Error('private-account-failure');
      return f.account();
    },
  });
  await store.register();
  const original = context();
  await assert.rejects(
    store.withReadScope(original, async () => {
      fail = true;
      await assert.rejects(store.assertSelected(original));
      fail = false;
    })
  );
  await assert.rejects(store.withReadScope(original, async () => {}));
});

for (const changed of ['selection-generation', 'installed-source']) {
  test(`actual scope close refuses final ${changed} replacement after successful admissions`, async (t) => {
    const f = runtimeFixture(t),
      store = createSelectionStore({ packageRoot: f.packageRoot, account: f.account });
    await store.register();
    const file = await store.location(),
      original = context();
    let replaced = false;
    const records = observeDescriptors(t, directory(f), () => {
      if (replaced) return;
      replaced = true;
      if (changed === 'selection-generation') {
        renameSync(file, file + '.old');
        writeFileSync(file, readFileSync(file + '.old'), { mode: 0o600, flag: 'wx' });
      } else writeFileSync(path.join(f.packageRoot, 'runner.mjs'), 'changed-after-close');
    });
    await assert.rejects(
      store.withReadScope(original, async () => {
        await store.assertSelected(original);
      })
    );
    assert.equal(replaced, true);
    assert.equal(
      records.every((record) => record.closed),
      true
    );
    await assert.rejects(store.withReadScope(original, async () => {}));
  });
}
test('actual failed close is reachable through store cleanup and prevents resealing until exit', async (t) => {
  const f = runtimeFixture(t),
    store = createSelectionStore({ packageRoot: f.packageRoot, account: f.account });
  await store.register();
  const fs = require('node:fs/promises'),
    originalOpen = fs.open,
    root = directory(f),
    original = context();
  let closeCalls = 0,
    actualClosed = false;
  fs.open = function (...args) {
    const tapped = args[0] === root && /\bat openProtectedRoot \(/.test(new Error().stack);
    const opening = Reflect.apply(originalOpen, this, args);
    if (tapped)
      opening.then(
        (handle) => {
          const close = handle.close.bind(handle);
          handle.close = async () => {
            if (++closeCalls === 1) throw new Error('private-close-failure');
            await close();
            actualClosed = handle.fd === -1;
          };
        },
        () => {}
      );
    return opening;
  };
  syncBuiltinESMExports();
  t.after(() => {
    fs.open = originalOpen;
    syncBuiltinESMExports();
  });
  await assert.rejects(
    store.withReadScope(original, async () => {
      await store.assertSelected(original);
    })
  );
  assert.equal(actualClosed, false);
  await assert.rejects(store.register({ dryRun: true }), {
    code: 'APR_SELECTION_SCOPE_UNAVAILABLE',
  });
  await store.retryCleanup();
  assert.equal(actualClosed, true);
  assert.equal(closeCalls, 2);
  await assert.rejects(store.withReadScope(original, async () => {}));
});
for (const changed of ['file-inode', 'ancestor-link']) {
  test(`a fresh scoped admission refuses actual ${changed} replacement`, async (t) => {
    const f = runtimeFixture(t),
      store = createSelectionStore({ packageRoot: f.packageRoot, account: f.account });
    await store.register();
    const file = await store.location(),
      original = context(),
      records = observeDescriptors(t, directory(f));
    await assert.rejects(
      store.withReadScope(original, async () => {
        await store.assertSelected(original);
        if (changed === 'file-inode') {
          renameSync(file, file + '.old');
          writeFileSync(file, readFileSync(file + '.old'), { mode: 0o600, flag: 'wx' });
        } else {
          const parent = path.dirname(directory(f));
          renameSync(parent, parent + '.old');
          symlinkSync(parent + '.old', parent, process.platform === 'win32' ? 'junction' : 'dir');
        }
        await store.assertSelected(original);
      })
    );
    assert.equal(records.length, 1);
    assert.equal(
      records.every((record) => record.closed),
      true
    );
  });
}

test('post-open context failure retains the genuine portable system cleanup through the store', async (t) => {
  const f = runtimeFixture(t),
    store = createSelectionStore({ packageRoot: f.packageRoot, account: f.account });
  await store.register();
  const fs = require('node:fs/promises'),
    originalOpen = fs.open,
    root = directory(f),
    controller = new AbortController();
  const original = { signal: controller.signal, deadline: performance.now() + 30000 };
  let closeCalls = 0,
    actualClosed = false;
  fs.open = function (...args) {
    const tapped = args[0] === root && /\bat openProtectedRoot \(/.test(new Error().stack);
    const opening = Reflect.apply(originalOpen, this, args);
    if (tapped)
      opening.then(
        (handle) => {
          const stat = handle.stat.bind(handle),
            close = handle.close.bind(handle);
          handle.stat = async (...values) => {
            const value = await stat(...values);
            controller.abort();
            return value;
          };
          handle.close = async () => {
            if (++closeCalls === 1) throw new Error('private-post-open-close');
            await close();
            actualClosed = handle.fd === -1;
          };
        },
        () => {}
      );
    return opening;
  };
  syncBuiltinESMExports();
  t.after(() => {
    fs.open = originalOpen;
    syncBuiltinESMExports();
  });
  await assert.rejects(
    store.withReadScope(original, async () => {
      await store.assertSelected(original);
    })
  );
  assert.equal(actualClosed, false);
  await new Promise((resolve) => setImmediate(resolve));
  await assert.rejects(store.register({ dryRun: true }), {
    code: 'APR_SELECTION_SCOPE_UNAVAILABLE',
  });
  await store.retryCleanup();
  assert.equal(actualClosed, true);
  assert.equal(closeCalls, 2);
  await assert.rejects(store.withReadScope(original, async () => {}));
});
