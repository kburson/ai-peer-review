// @story #175
// cspell:words hardlink readback
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { mkdtemp, realpath, rm, open, readdir, readFile, writeFile } from 'node:fs/promises';
import * as storage from '../../src/broker/storage-protection.mjs';

async function owned(t, options = {}) {
  const base = await realpath(await mkdtemp(path.join(tmpdir(), 'apr-owner-publication-175-')));
  t.after(() => rm(base, { recursive: true, force: true }));
  const root = path.join(base, 'private');
  const controller = new AbortController();
  const signal = controller.signal;
  const deadline = options.deadline ?? performance.now() + 30000;
  const context = { signal, deadline, ...(options.clock ? { clock: options.clock } : {}) };
  const receipt = await storage.provisionProtectedRoot({ root, ...context });
  const guard = await storage.openProtectedRoot({ receipt, ...context });
  t.after(() => guard.close());
  return { root, guard, context, controller };
}

test('[#175] retained ordinary publication keeps its actual creation descriptor until close', async (t) => {
  const { root, guard } = await owned(t);
  const probe = await open(path.join(root, 'probe'), 'wx', 0o600);
  const prototype = Object.getPrototypeOf(probe);
  await probe.close();
  const actualWrite = prototype.writeFile;
  let creator;
  t.mock.method(prototype, 'writeFile', async function (bytes, ...rest) {
    const result = await actualWrite.call(this, bytes, ...rest);
    if (Buffer.isBuffer(bytes) && bytes.toString() === 'held-descriptor-175') creator = this;
    return result;
  });
  assert.equal(typeof guard.createRetainedPublication, 'function');
  const publication = await guard.createRetainedPublication(
    'fixture-owner',
    Buffer.from('held-descriptor-175')
  );
  assert.ok(creator);
  assert.ok(creator.fd >= 0);
  const snapshot = await publication.snapshot();
  assert.equal(snapshot.bytes.toString(), 'held-descriptor-175');
  assert.ok(creator.fd >= 0);
  await publication.close();
  assert.equal(creator.fd, -1);
  assert.equal(
    (await readFile(path.join(root, 'fixture-owner'))).toString(),
    'held-descriptor-175'
  );
  await assert.rejects(publication.snapshot(), { code: 'APR_BROKER_STALE' });
});

test('[#175] stale exact bytes refuse replacement without changing the protected file', async (t) => {
  const { root, guard } = await owned(t);
  assert.equal(typeof guard.createRetainedPublication, 'function');
  const publication = await guard.createRetainedPublication(
    'fixture-owner',
    Buffer.from('original')
  );
  const snapshot = await publication.snapshot();
  const stale = { ...snapshot, bytes: Buffer.from('not-original') };
  await assert.rejects(publication.publish(stale, Buffer.from('stolen')), (error) => {
    assert.equal(error.code, 'APR_BROKER_STALE');
    assert.equal(error.details.reason, 'owned-publication-generation-changed');
    return true;
  });
  assert.equal((await readFile(path.join(root, 'fixture-owner'))).toString(), 'original');
  await publication.withdraw(snapshot);
  await assert.rejects(readFile(path.join(root, 'fixture-owner')), { code: 'ENOENT' });
});

test('[#175] close cannot revoke a descriptor while an earlier publication effect is pending', async (t) => {
  const { root, guard } = await owned(t);
  assert.equal(typeof guard.createRetainedPublication, 'function');
  const publication = await guard.createRetainedPublication('fixture-owner', Buffer.from('before'));
  const snapshot = await publication.snapshot();
  const changing = publication.publish(snapshot, Buffer.from('after'));
  const closing = publication.close();
  const [change, close] = await Promise.allSettled([changing, closing]);
  assert.equal(change.status, 'fulfilled');
  assert.equal(close.status, 'rejected');
  assert.equal(close.reason.code, 'APR_BROKER_STALE');
  assert.equal(close.reason.details.reason, 'owned-publication-busy');
  assert.equal((await readFile(path.join(root, 'fixture-owner'))).toString(), 'after');
  await publication.withdraw();
});

test('[#175] production owner publication refuses copied leases before reserved-file effects', async (t) => {
  const { root, guard, context } = await owned(t);
  assert.equal(typeof storage.createHeldPrivatePublication, 'function');
  assert.equal(typeof storage.isHeldPrivatePublication, 'function');
  assert.equal(storage.isHeldPrivatePublication({ verified: true }), false);
  await assert.rejects(
    storage.createHeldPrivatePublication({
      guard,
      name: 'owner.json',
      bytes: Buffer.from('forged-owner'),
      lease: { kind: 'won', verified: true },
      ...context,
    }),
    (error) => {
      assert.equal(error.code, 'APR_BROKER_STALE');
      assert.equal(error.details.reason, 'genuine-election-lease-required');
      return true;
    }
  );
  assert.deepEqual(await readdir(root), []);
});

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

async function interceptFilesystem(t, name, effect) {
  const fs = (await import('node:fs/promises')).default;
  const { syncBuiltinESMExports } = await import('node:module');
  const original = fs[name];
  const mocked = t.mock.method(fs, name, (...args) => effect(original, ...args));
  syncBuiltinESMExports();
  t.after(() => {
    mocked.mock.restore();
    syncBuiltinESMExports();
  });
}
const reasonIs = (reason) => (error) => {
  assert.equal(error.code, 'APR_BROKER_STALE');
  assert.equal(error.details.reason, reason);
  return true;
};

for (const [kind, want] of [
  ['bytes', 'private-file-changed'],
  ['replacement', 'private-file-changed'],
  ['symlink', 'path-alias'],
  ['hardlink', 'storage-hardlink'],
  ['mode', 'owner-or-mode-unproved'],
  ['parent', 'root-protection-changed'],
]) {
  test(
    '[#175] retained publication fences actual ' + kind + ' substitution before effects',
    async (t) => {
      const { root, guard } = await owned(t);
      assert.equal(typeof guard.createRetainedPublication, 'function');
      const publication = await guard.createRetainedPublication(
        'fixture-owner',
        Buffer.from('old')
      );
      const before = await publication.snapshot();
      const fs = await import('node:fs/promises');
      if (kind === 'bytes') await fs.writeFile(path.join(root, 'fixture-owner'), 'foreign');
      if (kind === 'replacement') {
        await fs.rename(path.join(root, 'fixture-owner'), path.join(root, 'retained-old'));
        await fs.writeFile(path.join(root, 'fixture-owner'), 'foreign', { mode: 0o600 });
      }
      if (kind === 'symlink') {
        await fs.rename(path.join(root, 'fixture-owner'), path.join(root, 'retained-old'));
        await fs.symlink('retained-old', path.join(root, 'fixture-owner'));
      }
      if (kind === 'hardlink')
        await fs.link(path.join(root, 'fixture-owner'), path.join(root, 'alias'));
      if (kind === 'mode') {
        if (process.platform === 'win32') {
          // Actual Windows ACL substitution is covered separately; mode is no ACL proof.
          await fs.link(path.join(root, 'fixture-owner'), path.join(root, 'alias'));
        } else await fs.chmod(path.join(root, 'fixture-owner'), 0o644);
      }
      if (kind === 'parent') await fs.rename(root, root + '-moved');
      await assert.rejects(
        publication.publish(before, Buffer.from('stolen')),
        reasonIs(kind === 'mode' && process.platform === 'win32' ? 'storage-hardlink' : want)
      );
      const actualRoot = kind === 'parent' ? root + '-moved' : root;
      assert.equal(
        (await fs.readFile(path.join(actualRoot, 'fixture-owner'))).toString(),
        kind === 'bytes' || kind === 'replacement' ? 'foreign' : 'old'
      );
    }
  );
}

test('[#175] retained publication revalidates its creation descriptor after replacement', async (t) => {
  const { root, guard } = await owned(t);
  assert.equal(typeof guard.createRetainedPublication, 'function');
  const publication = await guard.createRetainedPublication('fixture-owner', Buffer.from('one'));
  const before = await publication.snapshot();
  let heldAtRename = false;
  await interceptFilesystem(t, 'rename', async (actual, from, to) => {
    // The retained engine must keep at least the original descriptor during replacement.
    const held = publication.retainedGeneration();
    assert.equal(held.identity, before.identity);
    await actual(from, to);
    heldAtRename = true;
  });
  const after = await publication.publish(before, Buffer.from('two'));
  assert.ok(heldAtRename);
  assert.notEqual(after.identity, before.identity);
  assert.equal(after.bytes.toString(), 'two');
  assert.equal((await publication.snapshot()).identity, after.identity);
  assert.equal((await readFile(path.join(root, 'fixture-owner'))).toString(), 'two');
  await publication.withdraw(after);
});

test('[#175] a retained publication rejects a renewed context before mutation', async (t) => {
  const { root, guard, context } = await owned(t);
  assert.equal(typeof guard.createRetainedPublication, 'function');
  const publication = await guard.createRetainedPublication('fixture-owner', Buffer.from('old'));
  const before = await publication.snapshot(context);
  await assert.rejects(
    publication.publish(before, Buffer.from('stolen'), {
      signal: new AbortController().signal,
      deadline: context.deadline + 1,
    }),
    reasonIs('publication-budget-mismatch')
  );
  assert.equal((await readFile(path.join(root, 'fixture-owner'))).toString(), 'old');
});

test('[#175] abort retains a publication and its exact cleanup obligation', async (t) => {
  const { root, guard, context } = await owned(t);
  assert.equal(typeof guard.createRetainedPublication, 'function');
  const publication = await guard.createRetainedPublication('fixture-owner', Buffer.from('old'));
  const before = await publication.snapshot();
  const controller = new AbortController();
  // A distinct original signal is refused, rather than an authorization upgrade.
  controller.abort();
  await assert.rejects(
    publication.withdraw(before, { ...context, signal: controller.signal }),
    reasonIs('publication-budget-mismatch')
  );
  assert.equal((await readFile(path.join(root, 'fixture-owner'))).toString(), 'old');
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
  await interceptFilesystem(t, 'rename', async (actual, from, to) => {
    if (path.basename(from) === 'fixture-owner') {
      await actual(from, path.join(root, 'preserved-old'));
      await writeFile(from, 'new-owner', { mode: 0o600 });
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

test('[#175] unverified publication core delegates exact effects to real retained storage', async (t) => {
  const { guard, context } = await owned(t);
  assert.equal(typeof storage.createHeldPrivatePublicationCore, 'function');
  let handle;
  const core = await storage.createHeldPrivatePublicationCore({
    name: 'fixture-owner',
    bytes: Buffer.from('one'),
    budget: context,
    store: {
      createExclusive: async (name, bytes) =>
        (handle = await guard.createRetainedPublication(name, bytes)),
      read: () => handle.snapshot(),
      replace: (expected, bytes) => handle.publish(expected, bytes),
      unlink: (expected) => handle.withdraw(expected),
      close: () => handle.close(),
    },
  });
  assert.equal(core.verified, false);
  assert.equal(storage.isHeldPrivatePublication(core), false);
  const before = await core.snapshot(context);
  await assert.rejects(
    core.replace({ ...before, bytes: Buffer.from('foreign') }, Buffer.from('stolen'), context),
    reasonIs('owned-publication-generation-changed')
  );
  await core.replace(before, Buffer.from('two'), context);
  assert.equal(await core.verify(context), true);
  const after = await core.snapshot(context);
  assert.equal(after.bytes.toString(), 'two');
  await core.withdraw(after, context);
  await core.close(context);
});

test('[#175] abort of the original context retains exact publication cleanup evidence', async (t) => {
  const { root, guard, controller } = await owned(t);
  const publication = await guard.createRetainedPublication('fixture-owner', Buffer.from('old'));
  const before = await publication.snapshot();
  controller.abort();
  let caught;
  await assert.rejects(publication.withdraw(before), (error) => {
    caught = error;
    return reasonIs('operation-aborted')(error);
  });
  assert.ok(
    caught.details.obligations?.some(
      (item) => item.name === 'fixture-owner' && item.identity === before.identity
    )
  );
  assert.equal((await readFile(path.join(root, 'fixture-owner'))).toString(), 'old');
});

test('[#175] quarantine directory flush failure preserves the actual moved generation', async (t) => {
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
        if (stat.isDirectory() && !failed) {
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

test('[#175] actual creation descriptor remains held across the replacement rename', async (t) => {
  const { root, guard } = await owned(t);
  let creator;
  await interceptFilesystem(t, 'open', async (actual, target, ...args) => {
    const file = await actual(target, ...args);
    if (path.basename(target) === 'fixture-owner' && (Number(args[0]) & constants.O_CREAT) !== 0)
      creator = file;
    return file;
  });
  const publication = await guard.createRetainedPublication('fixture-owner', Buffer.from('one'));
  const first = await publication.snapshot();
  let observed = false;
  await interceptFilesystem(t, 'rename', async (actual, ...args) => {
    assert.ok(creator.fd >= 0, 'original descriptor is held before actual rename');
    assert.ok(await creator.stat());
    observed = true;
    return actual(...args);
  });
  await publication.publish(first, Buffer.from('two'));
  assert.ok(observed);
  assert.equal(creator.fd, -1, 'old descriptor closes only after replacement readback');
  assert.equal((await readFile(path.join(root, 'fixture-owner'))).toString(), 'two');
});

test('[#175] expired original storage context cannot replace or silently renew', async (t) => {
  let now = 1000;
  const clock = () => now;
  const { root, guard } = await owned(t, { deadline: 2000, clock });
  const publication = await guard.createRetainedPublication('fixture-owner', Buffer.from('old'));
  const expected = await publication.snapshot();
  now = 2001;
  await assert.rejects(
    publication.publish(expected, Buffer.from('stolen')),
    reasonIs('operation-deadline')
  );
  assert.equal((await readFile(path.join(root, 'fixture-owner'))).toString(), 'old');
});

test('[#175] failed retained descriptor close preserves the name and open-handle obligation', async (t) => {
  const { root, guard } = await owned(t);
  let retained,
    failed = false;
  await interceptFilesystem(t, 'open', async (actual, target, ...args) => {
    const file = await actual(target, ...args);
    if (path.basename(target) === 'fixture-owner' && (Number(args[0]) & constants.O_CREAT) !== 0) {
      retained = file;
      const close = file.close.bind(file);
      file.close = async () => {
        if (!failed) {
          failed = true;
          throw Object.assign(new Error('close unproved'), { code: 'EIO' });
        }
        return close();
      };
    }
    return file;
  });
  const publication = await guard.createRetainedPublication('fixture-owner', Buffer.from('old'));
  let caught;
  await assert.rejects(publication.close(), (error) => {
    caught = error;
    return error.code === 'APR_BROKER_STALE';
  });
  assert.ok(retained.fd >= 0);
  assert.ok(
    caught.details.obligations.some(
      (item) => item.name === 'fixture-owner' && item.outcome === 'descriptor-close-pending'
    )
  );
  assert.equal((await readFile(path.join(root, 'fixture-owner'))).toString(), 'old');
  await publication.close();
  assert.equal(retained.fd, -1);
});

test(
  '[#175] actual foreign ACL substitution fences retained owner bytes',
  {
    skip:
      process.platform === 'linux'
        ? 'POSIX mode boundary applies; no separate stock ACL class advertised'
        : false,
  },
  async (t) => {
    const { root, guard } = await owned(t);
    const file = path.join(root, 'fixture-owner');
    const publication = await guard.createRetainedPublication('fixture-owner', Buffer.from('old'));
    const expected = await publication.snapshot();
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execute = promisify(execFile);
    if (process.platform === 'darwin')
      await execute('/bin/chmod', ['+a', 'everyone allow read', file]);
    else await execute('icacls', [file, '/grant', '*S-1-1-0:(R)']);
    await assert.rejects(
      publication.publish(expected, Buffer.from('stolen')),
      reasonIs(
        process.platform === 'darwin' ? 'acl-positive-grant-unproved' : 'foreign-effective-grant'
      )
    );
    assert.equal((await readFile(file)).toString(), 'old');
  }
);

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
  const child = fork(new URL('../helpers/owner-quarantine-child.mjs', import.meta.url), [root], {
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

async function failOneDirectoryFlush(t, root) {
  const probe = await open(path.join(root, 'probe'), 'wx', 0o600);
  const prototype = Object.getPrototypeOf(probe);
  await probe.close();
  const sync = prototype.sync;
  let failed = false;
  t.mock.method(prototype, 'sync', async function () {
    if (!failed && (await this.stat()).isDirectory()) {
      failed = true;
      throw Object.assign(new Error('durability unproved'), { code: 'EIO' });
    }
    return sync.call(this);
  });
}

test('[#175] unconfirmed replacement remains fenced despite an exact visible new file', async (t) => {
  const { root, guard } = await owned(t);
  const publication = await guard.createRetainedPublication('fixture-owner', Buffer.from('one'));
  const first = await publication.snapshot();
  await failOneDirectoryFlush(t, root);
  await assert.rejects(publication.publish(first, Buffer.from('two')), {
    code: 'APR_BROKER_STALE',
  });
  assert.equal((await readFile(path.join(root, 'fixture-owner'))).toString(), 'two');
  await assert.rejects(publication.snapshot(), reasonIs('owned-publication-fenced'));
  await assert.rejects(publication.publish(first, Buffer.from('three')), {
    code: 'APR_BROKER_STALE',
  });
  assert.equal((await readFile(path.join(root, 'fixture-owner'))).toString(), 'two');
  await publication.close();
});

test('[#175] retry cannot relabel an unconfirmed withdrawal as successful absence', async (t) => {
  const { root, guard } = await owned(t);
  const publication = await guard.createRetainedPublication('fixture-owner', Buffer.from('one'));
  const first = await publication.snapshot();
  await failOneDirectoryFlush(t, root);
  await assert.rejects(publication.withdraw(first), { code: 'APR_BROKER_STALE' });
  await assert.rejects(readFile(path.join(root, 'fixture-owner')), { code: 'ENOENT' });
  await assert.rejects(publication.withdraw(first), reasonIs('owned-withdrawal-unproved'));
  await publication.close();
});
