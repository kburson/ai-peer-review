// @story #175
// cspell:words hardlink readback
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { owned, interceptFilesystem, reasonIs } from './fixtures.mjs';
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
