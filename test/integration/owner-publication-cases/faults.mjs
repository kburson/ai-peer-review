// @story #175
// cspell:words hardlink readback
import assert from 'node:assert/strict';
import path from 'node:path';
import { constants } from 'node:fs';
import { open, readFile } from 'node:fs/promises';
import test from 'node:test';
import { owned, interceptFilesystem, failOneDirectoryFlush, reasonIs } from './fixtures.mjs';
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
