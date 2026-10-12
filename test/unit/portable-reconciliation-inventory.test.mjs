// @story #209
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { tmpdir } from 'node:os';
import fsPromises from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { mkdtemp, realpath, rm, mkdir, writeFile, rename, symlink, link } from 'node:fs/promises';
import { provisionProtectedRoot, openProtectedRoot } from '../../src/broker/storage-protection.mjs';

async function protectedDirectory(t) {
  const parent = await realpath(await mkdtemp(path.join(tmpdir(), 'apr-reconciliation-209-')));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const root = path.join(parent, 'private');
  const receipt = await provisionProtectedRoot({ root });
  const guard = await openProtectedRoot({ receipt });
  t.after(() => guard.close());
  return { root, guard };
}

test('protected reconciliation enumeration includes ordinary files and directories beyond election slots', async (t) => {
  // Dropping non-election names would falsely prove an empty obligation store.
  const { root, guard } = await protectedDirectory(t);
  await mkdir(path.join(root, 'reviews'), { mode: 0o700 });
  await writeFile(path.join(root, 'a.json'), '{}\n', { mode: 0o600 });
  assert.equal(typeof guard.listOrdinaryEntries, 'function');
  const entries = await guard.listOrdinaryEntries();
  assert.deepEqual(
    entries.map(({ name, type }) => ({ name, type })),
    [
      { name: 'a.json', type: 'file' },
      { name: 'reviews', type: 'directory' },
    ]
  );
  assert.ok(entries.every((entry) => typeof entry.identity === 'string' && entry.identity));
  assert.equal(Object.isFrozen(entries), true);
});

test('protected reconciliation enumeration refuses a replaced root', async (t) => {
  // Reopening the same pathname must not substitute a different physical root.
  const { root, guard } = await protectedDirectory(t);
  assert.equal(typeof guard.listOrdinaryEntries, 'function');
  await rename(root, root + '-original');
  await mkdir(root, { mode: 0o700 });
  await assert.rejects(() => guard.listOrdinaryEntries(), { code: 'APR_BROKER_STALE' });
});

test('protected reconciliation enumeration refuses a symbolic link child', async (t) => {
  // Following a linked child would hide an outside obligation namespace.
  const { root, guard } = await protectedDirectory(t);
  assert.equal(typeof guard.listOrdinaryEntries, 'function');
  await symlink(root, path.join(root, 'foreign'));
  await assert.rejects(() => guard.listOrdinaryEntries(), { code: 'APR_BROKER_STALE' });
});

const ordinary = await import('../../src/broker/portable-reconciliation-inventory.mjs').catch(
  (error) => {
    if (
      error.code === 'ERR_MODULE_NOT_FOUND' &&
      error.url?.endsWith('/portable-reconciliation-inventory.mjs')
    )
      return {};
    throw error;
  }
);
async function ordinaryDirectory(t) {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'apr-ordinary-209-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const controller = new AbortController();
  return { root, signal: controller.signal, deadline: performance.now() + 30000 };
}

test('ordinary reconciliation inventory observes physical files without granting protected authority', async (t) => {
  // Omitting a nested authority file would hide an orphan transaction.
  const input = await ordinaryDirectory(t);
  await mkdir(path.join(input.root, 'review'), { mode: 0o755 });
  await writeFile(path.join(input.root, 'a.json'), '{}\n');
  await writeFile(path.join(input.root, 'review', 'events.jsonl'), '{}\n');
  assert.equal(typeof ordinary.observeOrdinaryReconciliationTree, 'function');
  const observed = await ordinary.observeOrdinaryReconciliationTree(input);
  t.after(() => observed.close());
  assert.equal(observed.verified, false);
  assert.deepEqual(
    observed.entries.map((entry) => entry.relativePath),
    ['a.json', 'review', 'review/events.jsonl']
  );
  await ordinary.assertOrdinaryReconciliationTreeUnchanged(observed);
});

test('ordinary reconciliation inventory refuses new membership after observation', async (t) => {
  // A stale empty list must not authorize a later owner effect.
  const input = await ordinaryDirectory(t);
  assert.equal(typeof ordinary.observeOrdinaryReconciliationTree, 'function');
  const observed = await ordinary.observeOrdinaryReconciliationTree(input);
  t.after(() => observed.close());
  await writeFile(path.join(input.root, 'new.json'), '{}\n');
  await assert.rejects(() => ordinary.assertOrdinaryReconciliationTreeUnchanged(observed), {
    code: 'APR_BROKER_STALE',
  });
});

test('ordinary reconciliation inventory refuses replacement of an empty original root', async (t) => {
  // Equal empty child lists cannot prove that the physical root is unchanged.
  const input = await ordinaryDirectory(t);
  const observed = await ordinary.observeOrdinaryReconciliationTree(input);
  t.after(() => observed.close());
  const retained = input.root + '-original';
  t.after(() => rm(retained, { recursive: true, force: true }));
  await rename(input.root, retained);
  await mkdir(input.root);
  await assert.rejects(() => ordinary.assertOrdinaryReconciliationTreeUnchanged(observed), {
    code: 'APR_BROKER_STALE',
  });
});

test('ordinary reconciliation inventory refuses a authority file linked from another name', async (t) => {
  // A second locator must not mutate a supposedly retained ordinary file.
  const input = await ordinaryDirectory(t);
  await writeFile(path.join(input.root, 'first.json'), '{}\n');
  await link(path.join(input.root, 'first.json'), path.join(input.root, 'second.json'));
  assert.equal(typeof ordinary.observeOrdinaryReconciliationTree, 'function');
  await assert.rejects(() => ordinary.observeOrdinaryReconciliationTree(input), {
    code: 'APR_BROKER_STALE',
  });
});

test('ordinary reconciliation inventory cannot revalidate copied observations', async (t) => {
  const input = await ordinaryDirectory(t);
  assert.equal(typeof ordinary.observeOrdinaryReconciliationTree, 'function');
  const observed = await ordinary.observeOrdinaryReconciliationTree(input);
  t.after(() => observed.close());
  await assert.rejects(() => ordinary.assertOrdinaryReconciliationTreeUnchanged({ ...observed }), {
    code: 'APR_BROKER_STALE',
  });
});

test('ordinary reconciliation inventory refuses an oversized authority file', async (t) => {
  const input = await ordinaryDirectory(t);
  await writeFile(path.join(input.root, 'events.jsonl'), Buffer.alloc(1048577, 65));
  await assert.rejects(
    () => ordinary.observeOrdinaryReconciliationTree(input),
    (error) =>
      error.code === 'APR_BROKER_STALE' &&
      error.details.reason === 'reconciliation-inventory-overflow'
  );
});

test('ordinary reconciliation inventory retains its original abort signal', async (t) => {
  const input = await ordinaryDirectory(t);
  const controller = new AbortController();
  input.signal = controller.signal;
  const observed = await ordinary.observeOrdinaryReconciliationTree(input);
  t.after(() => observed.close());
  input.signal = new AbortController().signal;
  controller.abort();
  await assert.rejects(
    () => ordinary.assertOrdinaryReconciliationTreeUnchanged(observed),
    (error) =>
      error.code === 'APR_BROKER_STALE' && error.details.reason === 'reconciliation-aborted'
  );
});

test('ordinary reconciliation inventory refuses an already expired deadline', async (t) => {
  const input = await ordinaryDirectory(t);
  input.deadline = performance.now() - 1;
  await assert.rejects(
    () => ordinary.observeOrdinaryReconciliationTree(input),
    (error) =>
      error.code === 'APR_BROKER_STALE' && error.details.reason === 'reconciliation-deadline'
  );
});

test('ordinary reconciliation inventory refuses a symbolic-link authority child', async (t) => {
  const input = await ordinaryDirectory(t);
  await symlink(input.root, path.join(input.root, 'review'));
  await assert.rejects(
    () => ordinary.observeOrdinaryReconciliationTree(input),
    (error) =>
      error.code === 'APR_BROKER_STALE' &&
      error.details.reason === 'reconciliation-namespace-unproved'
  );
});

test('ordinary reconciliation inventory rejects changed bytes after an await', async (t) => {
  const input = await ordinaryDirectory(t);
  await writeFile(path.join(input.root, 'events.jsonl'), 'first\n');
  const observed = await ordinary.observeOrdinaryReconciliationTree(input);
  t.after(() => observed.close());
  await writeFile(path.join(input.root, 'events.jsonl'), 'other\n');
  await assert.rejects(
    () => ordinary.assertOrdinaryReconciliationTreeUnchanged(observed),
    (error) =>
      error.code === 'APR_BROKER_STALE' &&
      error.details.reason === 'reconciliation-generation-changed'
  );
});

test('ordinary reconciliation cleanup retries only unresolved original descriptors', async (t) => {
  // Retrying an already closed child must not prevent closing the retained root.
  const input = await ordinaryDirectory(t);
  await mkdir(path.join(input.root, 'child'));
  const original = fsPromises.opendir;
  let refused = false;
  fsPromises.opendir = async (...args) => {
    const handle = await original(...args);
    if (args[0] === input.root) {
      const close = handle.close.bind(handle);
      handle.close = async () => {
        if (!refused) {
          refused = true;
          throw Object.assign(new Error('injected descriptor failure'), { code: 'EIO' });
        }
        return close();
      };
    }
    return handle;
  };
  syncBuiltinESMExports();
  t.after(() => {
    fsPromises.opendir = original;
    syncBuiltinESMExports();
  });
  const observed = await ordinary.observeOrdinaryReconciliationTree(input);
  t.after(() => observed.close());
  await assert.rejects(() => observed.close(), {
    code: 'APR_BROKER_STALE',
  });
  assert.equal(observed.outstandingObligations.length, 1);
  assert.equal(observed.outstandingObligations[0].root, input.root);
  await assert.rejects(() => ordinary.assertOrdinaryReconciliationTreeUnchanged(observed), {
    code: 'APR_BROKER_STALE',
  });
  await observed.close();
  assert.deepEqual(observed.outstandingObligations, []);
});
