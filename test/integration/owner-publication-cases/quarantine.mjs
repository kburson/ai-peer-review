// @story #175
// cspell:words hardlink readback
import assert from 'node:assert/strict';
import path from 'node:path';
import { readdir, readFile, lstat } from 'node:fs/promises';
import * as storage from '../../../src/broker/storage-protection.mjs';
import test from 'node:test';
import { owned, interceptFilesystem, reasonIs } from './fixtures.mjs';
test('[#175] quarantine destination collision preserves both exact generations', async (t) => {
  const { root, guard } = await owned(t);
  await guard.writeExclusive('fixture-owner', Buffer.from('original'));
  await guard.writeExclusive('fixture-quarantine', Buffer.from('destination-owned'));
  const expected = await guard.readSnapshot('fixture-owner');
  assert.equal(typeof guard.quarantine, 'function');
  await assert.rejects(
    guard.quarantine('fixture-owner', expected, { destination: 'fixture-quarantine' }),
    (error) => {
      assert.equal(error.code, 'APR_BROKER_STALE');
      assert.equal(error.details.reason, 'quarantine-destination-occupied');
      return true;
    }
  );
  assert.equal((await readFile(path.join(root, 'fixture-owner'))).toString(), 'original');
  assert.equal(
    (await readFile(path.join(root, 'fixture-quarantine'))).toString(),
    'destination-owned'
  );
});

test('[#175] quarantine keeps exact bytes and validates the actual renamed generation', async (t) => {
  const { root, guard } = await owned(t);
  await guard.writeExclusive('fixture-owner', Buffer.from('old'));
  const expected = await guard.readSnapshot('fixture-owner');
  assert.equal(typeof guard.quarantine, 'function');
  const result = await guard.quarantine('fixture-owner', expected, {
    destination: 'fixture-quarantine',
  });
  assert.equal(result.status, 'quarantined');
  assert.equal(result.originalName, 'fixture-owner');
  assert.equal(result.name, 'fixture-quarantine');
  assert.equal(result.identity, expected.identity);
  assert.equal(result.previousFileVersion, expected.fileVersion);
  assert.equal(result.bytes.toString(), 'old');
  assert.deepEqual(result.obligations, []);
  await assert.rejects(readFile(path.join(root, 'fixture-owner')), { code: 'ENOENT' });
  assert.equal((await readFile(path.join(root, 'fixture-quarantine'))).toString(), 'old');
});

test('[#175] displaced generation between final check and quarantine is preserved as uncertain', async (t) => {
  const { root, guard } = await owned(t);
  await guard.writeExclusive('fixture-owner', Buffer.from('old'));
  const expected = await guard.readSnapshot('fixture-owner');
  assert.equal(typeof guard.quarantine, 'function');
  await guard.writeExclusive('replacement-candidate', Buffer.from('new-owner'));
  await interceptFilesystem(t, 'rename', async (actual, from, to) => {
    if (path.basename(from) === 'fixture-owner') {
      await actual(from, path.join(root, 'preserved-old'));
      await actual(path.join(root, 'replacement-candidate'), from);
    }
    await actual(from, to);
  });
  let caught;
  await assert.rejects(
    guard.quarantine('fixture-owner', expected, { destination: 'fixture-quarantine' }),
    (error) => {
      caught = error;
      return reasonIs('quarantine-generation-changed')(error);
    }
  );
  assert.equal(caught.details.retrySafe, false);
  assert.ok(
    caught.details.obligations?.some(
      (item) => item.name === 'fixture-owner' && item.alternateName === 'fixture-quarantine'
    )
  );
  assert.equal((await readFile(path.join(root, 'preserved-old'))).toString(), 'old');
  assert.equal((await readFile(path.join(root, 'fixture-quarantine'))).toString(), 'new-owner');
  const moved = await lstat(path.join(root, 'fixture-quarantine'), { bigint: true });
  const movedIdentity = [moved.dev, moved.ino].map(String).join(':');
  const movedVersion = [moved.size, moved.mtimeNs, moved.ctimeNs].map(String).join(':');
  assert.notEqual(movedIdentity, expected.identity);
  assert.ok(
    caught.details.obligations.some(
      (item) =>
        item.name === 'fixture-quarantine' &&
        item.alternateName === 'fixture-owner' &&
        item.identity === movedIdentity &&
        item.fileVersion === movedVersion &&
        item.outcome === 'displaced-generation-retained'
    )
  );
  assert.equal(JSON.stringify(caught.details).includes('new-owner'), false);

  await assert.rejects(readFile(path.join(root, 'fixture-owner')), { code: 'ENOENT' });
});

test('[#175] rename followed by reported failure retains both quarantine locators', async (t) => {
  const { root, guard } = await owned(t);
  await guard.writeExclusive('fixture-owner', Buffer.from('old'));
  const expected = await guard.readSnapshot('fixture-owner');
  assert.equal(typeof guard.quarantine, 'function');
  await interceptFilesystem(t, 'rename', async (actual, ...args) => {
    await actual(...args);
    throw Object.assign(new Error('uncertain actual effect'), { code: 'EIO' });
  });
  let caught;
  await assert.rejects(
    guard.quarantine('fixture-owner', expected, { destination: 'fixture-quarantine' }),
    (error) => {
      caught = error;
      return error.code === 'APR_BROKER_STALE';
    }
  );
  assert.equal(caught.details.retrySafe, false);
  assert.ok(
    caught.details.obligations?.some(
      (item) => item.name === 'fixture-owner' && item.alternateName === 'fixture-quarantine'
    )
  );
  assert.equal((await readFile(path.join(root, 'fixture-quarantine'))).toString(), 'old');
});

test('[#175] copied quarantine receipt cannot authorize subsequent production ownership', async (t) => {
  const { root, guard, context } = await owned(t);
  assert.equal(typeof storage.assertQuarantineReceipt, 'function');
  assert.equal(typeof storage.quarantinePrivateFile, 'function');
  await assert.rejects(
    storage.assertQuarantineReceipt({
      guard,
      receipt: { status: 'quarantined', verified: true },
      lease: {},
      ...context,
    }),
    reasonIs('genuine-quarantine-receipt-required')
  );
  await assert.rejects(
    storage.quarantinePrivateFile({
      guard,
      name: 'owner.json',
      expected: {},
      lease: {},
      ...context,
    }),
    reasonIs('genuine-election-lease-required')
  );
  assert.deepEqual(await readdir(root), []);
});

test('[#175] quarantine mutation flush failure preserves the actual moved generation', async (t) => {
  const { root, guard } = await owned(t);
  await guard.writeExclusive('fixture-owner', Buffer.from('old'));
  const expected = await guard.readSnapshot('fixture-owner');
  let failed = false;
  await interceptFilesystem(t, 'open', async (actual, target, ...args) => {
    const file = await actual(target, ...args);
    // Every actual FileHandle shares this production prototype.
    if (!failed && path.basename(target) === 'fixture-owner') {
      const prototype = Object.getPrototypeOf(file);
      const sync = prototype.sync;
      t.mock.method(prototype, 'sync', async function () {
        const stat = await this.stat();
        if ((process.platform === 'win32' ? stat.isFile() : stat.isDirectory()) && !failed) {
          failed = true;
          throw Object.assign(new Error('directory flush unavailable'), { code: 'EIO' });
        }
        return sync.call(this);
      });
    }
    return file;
  });
  let caught;
  await assert.rejects(
    guard.quarantine('fixture-owner', expected, { destination: 'fixture-quarantine' }),
    (error) => {
      caught = error;
      return error.code === 'APR_BROKER_STALE';
    }
  );
  assert.ok(failed);
  assert.ok(
    caught.details.obligations?.some(
      (item) => item.name === 'fixture-owner' && item.alternateName === 'fixture-quarantine'
    )
  );
  assert.equal((await readFile(path.join(root, 'fixture-quarantine'))).toString(), 'old');
});

test('[#175] original-budget failure after quarantine action still reports moved locators', async (t) => {
  const { root, guard, controller } = await owned(t);
  await guard.writeExclusive('fixture-owner', Buffer.from('old'));
  const expected = await guard.readSnapshot('fixture-owner');
  let triggered = false;
  await interceptFilesystem(t, 'open', async (actual, target, ...args) => {
    const file = await actual(target, ...args);
    if (path.basename(target) === 'fixture-quarantine') {
      const read = file.readFile.bind(file),
        close = file.close.bind(file);
      let readCalled = false;
      file.readFile = async (...args) => {
        readCalled = true;
        return read(...args);
      };
      file.close = async () => {
        await close();
        if (readCalled && !triggered) {
          triggered = true;
          controller.abort();
        }
      };
    }
    return file;
  });
  let caught;
  await assert.rejects(
    guard.quarantine('fixture-owner', expected, { destination: 'fixture-quarantine' }),
    (error) => {
      caught = error;
      return error.code === 'APR_BROKER_STALE';
    }
  );
  assert.ok(triggered);
  assert.ok(
    caught.details.obligations?.some(
      (item) => item.name === 'fixture-owner' && item.alternateName === 'fixture-quarantine'
    )
  );
  assert.equal((await readFile(path.join(root, 'fixture-quarantine'))).toString(), 'old');
});

test('[#175] ordinary retained operations cannot become a reserved owner producer', async (t) => {
  const { root, guard } = await owned(t);
  for (const name of ['owner.json', 'credential', 'endpoint.json', 'apr-owner-quarantine-fake']) {
    await assert.rejects(guard.createRetainedPublication(name, Buffer.from('forged')), {
      code: 'APR_BROKER_PATH_INVALID',
    });
  }
  assert.deepEqual(await readdir(root), []);
});

test('[#175] quarantine bytes remain after an actual child crash before any new owner', async (t) => {
  const { root } = await owned(t);
  const { fork } = await import('node:child_process');
  const { once } = await import('node:events');
  const child = fork(new URL('../../helpers/owner-quarantine-child.mjs', import.meta.url), [root], {
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  t.after(() => {
    if (child.exitCode === null) child.kill('SIGKILL');
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  const [receipt] = await Promise.race([
    once(child, 'message'),
    once(child, 'exit').then(([code]) => {
      throw new Error('Child exited before quarantine: ' + code + ' ' + stderr);
    }),
  ]);
  assert.equal(receipt.status, 'quarantined');
  const ended = once(child, 'exit');
  child.kill('SIGKILL');
  await ended;
  assert.equal(
    (await readFile(path.join(root, 'fixture-quarantine'))).toString(),
    'retained-through-crash'
  );
  await assert.rejects(readFile(path.join(root, 'fixture-owner')), { code: 'ENOENT' });
  const { lstat } = await import('node:fs/promises');
  const actual = await lstat(path.join(root, 'fixture-quarantine'), { bigint: true });
  assert.equal([actual.dev, actual.ino].map(String).join(':'), receipt.identity);
  assert.equal(storage.isHeldPrivatePublication(receipt), false);
});

test('[#175] quarantine excludes cooperative destination creation after its final check', async (t) => {
  const { root, guard } = await owned(t);
  await guard.writeExclusive('fixture-owner', Buffer.from('source'));
  const expected = await guard.readSnapshot('fixture-owner');
  let creation, other;
  await interceptFilesystem(t, 'rename', async (actual, from, to) => {
    if (path.basename(from) === 'fixture-owner') {
      try {
        other = await guard.createRetainedPublication(
          'fixture-quarantine',
          Buffer.from('destination')
        );
      } catch (error) {
        creation = error;
      }
    }
    return actual(from, to);
  });
  const result = await guard.quarantine('fixture-owner', expected, {
    destination: 'fixture-quarantine',
  });
  assert.equal(result.status, 'quarantined');
  assert.equal(other, undefined);
  assert.equal(creation?.code, 'APR_BROKER_STALE');
  assert.equal(creation?.details.reason, 'mutation-resource-busy');
  assert.equal((await readFile(path.join(root, 'fixture-quarantine'))).toString(), 'source');
});
