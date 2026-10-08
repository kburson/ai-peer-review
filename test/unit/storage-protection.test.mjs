// cspell:words unleased
// @story #166
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { constants } from 'node:fs';
import { mkdtemp, realpath, rm, mkdir, chmod, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
const storage = await import('../../src/broker/storage-protection.mjs').catch((error) => {
  if (
    error.code === 'ERR_MODULE_NOT_FOUND' &&
    error.url?.endsWith('/src/broker/storage-protection.mjs')
  )
    return {};
  throw error;
});
const paths = await import('../../src/broker/portable-paths.mjs').catch((error) => {
  if (
    error.code === 'ERR_MODULE_NOT_FOUND' &&
    error.url?.endsWith('/src/broker/portable-paths.mjs')
  )
    return {};
  throw error;
});
const USER = 'S-1-5-21-100-200-300-1001';
const ADMIN = 'S-1-5-32-544';
const SYSTEM = 'S-1-5-18';
const FULL = 0x1f01ff;
const windows = () => ({
  principalSid: USER,
  ownerSid: USER,
  administratorMember: false,
  administratorEffective: false,
  inheritanceProtected: true,
  canonical: true,
  reparsePoint: false,
  aces: [
    { sid: USER, type: 'allow', rights: FULL, inherited: false, inheritOnly: false },
    { sid: SYSTEM, type: 'allow', rights: FULL, inherited: false, inheritOnly: false },
  ],
});
async function temporary(t) {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'apr-storage-166-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
test('[#166] protection API provides read observations and explicit guarded effects', () => {
  for (const name of [
    'observeStorageProtection',
    'provisionProtectedRoot',
    'openProtectedRoot',
    'assessWindowsProtection',
  ])
    assert.equal(typeof storage[name], 'function', name);
});
test('[#166] closed Windows private descriptor admits current SID and recorded SYSTEM allowance', () => {
  const result = storage.assessWindowsProtection(windows());
  assert.equal(result.verified, true);
  assert.deepEqual(result.trustedAllowances, [SYSTEM]);
});
for (const [label, change] of [
  [
    'foreign grant despite same owner and0600',
    (x) =>
      x.aces.push({
        sid: 'S-1-1-0',
        type: 'allow',
        rights: 1,
        inherited: false,
        inheritOnly: false,
      }),
  ],
  ['unprotected inheritance', (x) => (x.inheritanceProtected = false)],
  ['unknown ACE order', (x) => (x.canonical = false)],
  ['reparse point', (x) => (x.reparsePoint = true)],
  ['owner SID without required rights', (x) => (x.aces[0].rights = 1)],
  [
    'unknown deny rule',
    (x) =>
      x.aces.unshift({ sid: USER, type: 'deny', rights: 1, inherited: false, inheritOnly: false }),
  ],
  [
    'inherited foreign writer',
    (x) => x.aces.push({ sid: 'S-1-1-0', type: 'allow', rights: 2, inherited: true }),
  ],
  ['unobserved principal', (x) => delete x.principalSid],
  ['inherit-only current-user grant', (x) => (x.aces[0].inheritOnly = true)],
])
  test('[#166] Windows refuses ' + label, () => {
    const x = windows();
    x.mode = 0o600;
    x.ownerMatches = true;
    change(x);
    assert.equal(storage.assessWindowsProtection(x).verified, false);
  });
test('[#166] Administrators-owned creation requires membership and proven effective current-token rights', () => {
  const x = windows();
  x.ownerSid = ADMIN;
  x.aces = [
    { sid: ADMIN, type: 'allow', rights: FULL, inherited: false, inheritOnly: false },
    { sid: SYSTEM, type: 'allow', rights: FULL, inherited: false, inheritOnly: false },
  ];
  assert.equal(storage.assessWindowsProtection(x).verified, false);
  x.administratorMember = true;
  assert.equal(storage.assessWindowsProtection(x).verified, false);
  x.administratorEffective = true;
  assert.equal(storage.assessWindowsProtection(x).verified, true);
  x.administratorEffective = false;
  x.aces.unshift({ sid: USER, type: 'allow', rights: FULL, inherited: false, inheritOnly: false });
  assert.equal(storage.assessWindowsProtection(x).verified, true);
});
test('[#166] copied or injected observation data cannot open an operational protected root', async (t) => {
  const root = await temporary(t);
  const receipt = await storage.provisionProtectedRoot({ root });
  await assert.rejects(storage.openProtectedRoot({ receipt: { ...receipt } }), {
    code: 'APR_BROKER_START_FAILED',
  });
  const fixture = await storage.observeStorageProtection({
    root,
    osAdapter: {
      kind: 'win32',
      observe: async () => ({
        verified: true,
        principalSid: USER,
        mode: 0o600,
        ownerMatches: true,
      }),
    },
  });
  assert.equal(fixture.verified, false);
  await assert.rejects(storage.openProtectedRoot({ receipt: fixture }), {
    code: 'APR_BROKER_START_FAILED',
  });
});
test(
  '[#166] unsafe POSIX permissions are observed read-only and require explicit setup',
  { skip: process.platform === 'win32' },
  async (t) => {
    const root = await temporary(t);
    await chmod(root, 0o755);
    assert.equal((await storage.observeStorageProtection({ root })).verified, false);
    const receipt = await storage.provisionProtectedRoot({ root });
    assert.equal(receipt.verified, true, JSON.stringify(receipt.reasons));
    assert.ok(Object.isFrozen(receipt));
  }
);
test('[#166] symbolic root and overlapping private/runtime paths refuse without following aliases', async (t) => {
  const root = await temporary(t);
  const privateRoot = path.join(root, 'private');
  await mkdir(privateRoot, { mode: 0o700 });
  const alias = path.join(root, 'alias');
  await symlink(privateRoot, alias, process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal((await storage.observeStorageProtection({ root: alias })).verified, false);
  await assert.rejects(paths.assertDistinctProtectedRoots([privateRoot, alias]), {
    code: 'APR_BROKER_PATH_INVALID',
  });
  await assert.rejects(
    paths.assertDistinctProtectedRoots([privateRoot, path.join(privateRoot, 'nested')]),
    { code: 'APR_BROKER_PATH_INVALID' }
  );
  const layout = await paths.portableBrokerPaths({ worktree: root });
  assert.equal(layout.privateRoot, path.join(root, '.scratch', 'peer-review', 'private'));
  assert.equal(layout.runtimeRoot, path.join(root, '.scratch', 'peer-review', 'runtime'));
});

const INSTALLER = 'S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464';
test('[#166] stock volume ancestry records TrustedInstaller while private ownership and grants still refuse it', () => {
  const record = windows();
  record.ownerSid = INSTALLER;
  assert.equal(storage.assessWindowsProtection(record).verified, false);
  const result = storage.assessWindowsAncestry(record, { volumeRoot: true });
  assert.equal(result.verified, true);
  assert.ok(result.trustedAllowances.includes(INSTALLER));
  assert.equal(storage.assessWindowsAncestry(record, { volumeRoot: false }).verified, false);
  record.ownerSid = USER;
  record.aces.push({
    sid: INSTALLER,
    type: 'allow',
    rights: FULL,
    inherited: false,
    inheritOnly: false,
  });
  assert.equal(storage.assessWindowsProtection(record).verified, false);
});
for (const [label, rights, inheritOnly, want] of [
  ['foreign generic-all', 0x10000000, false, false],
  ['foreign generic-write', 0x40000000, false, false],
  ['foreign delete-child', 0x40, false, false],
  ['foreign DACL-write', 0x40000, false, false],
  ['unrelated volume child creation', 4, false, true],
  ['inherit-only foreign mutation', FULL, true, true],
]) {
  test('[#166] Windows volume ancestry handles ' + label, () => {
    const record = windows();
    record.aces.push({ sid: 'S-1-1-0', type: 'allow', rights, inherited: false, inheritOnly });
    assert.equal(storage.assessWindowsAncestry(record, { volumeRoot: true }).verified, want);
  });
}

test('[#168] guarded owned publications survive the generic mutex and retain exact generations', async (t) => {
  const { writeFile } = await import('node:fs/promises');
  const root = await temporary(t);
  const receipt = await storage.provisionProtectedRoot({ root });
  const guard = await storage.openProtectedRoot({ receipt });
  t.after(() => guard.close());
  await writeFile(path.join(root, 'apr-mutation-lock'), 'unknown-old-mutex', { mode: 0o600 });
  assert.equal(typeof guard.createOwnedPublication, 'function');
  const name = 'apr-election-' + 'a'.repeat(64) + '-11111111-1111-4111-8111-111111111111.json';
  const publication = await guard.createOwnedPublication(name, Buffer.from('choosing'));
  assert.equal((await guard.read(name)).toString(), 'choosing');
  const first = await publication.snapshot();
  await publication.publish(first, Buffer.from('ticket:1'));
  assert.equal((await guard.read(name)).toString(), 'ticket:1');
  await assert.rejects(publication.publish(first, Buffer.from('wrong-generation')), {
    code: 'APR_BROKER_STALE',
  });
  assert.equal((await guard.read(name)).toString(), 'ticket:1');
  await assert.rejects(guard.replace(name, Buffer.from('ticket:1'), Buffer.from('stolen')), {
    code: 'APR_BROKER_PATH_INVALID',
  });
  await publication.withdraw();
  await assert.rejects(guard.read(name), { code: 'ENOENT' });
  assert.equal(
    (
      await (await import('node:fs/promises')).readFile(path.join(root, 'apr-mutation-lock'))
    ).toString(),
    'unknown-old-mutex'
  );
});

test('[#168] election publication namespace cannot be mutated through unleased generic methods', async (t) => {
  const root = await temporary(t);
  const receipt = await storage.provisionProtectedRoot({ root });
  const guard = await storage.openProtectedRoot({ receipt });
  t.after(() => guard.close());
  const name = 'apr-election-' + 'b'.repeat(64) + '-22222222-2222-4222-8222-222222222222.json';
  assert.equal(typeof guard.createOwnedPublication, 'function');
  const publication = await guard.createOwnedPublication(name, Buffer.from('one'));
  assert.equal(typeof guard.readSnapshot, 'function');
  const snapshot = await guard.readSnapshot(name);
  assert.equal(snapshot.bytes.toString(), 'one');
  assert.deepEqual(await guard.listOwnedPublications('apr-election-' + 'b'.repeat(64) + '-'), [
    name,
  ]);
  await assert.rejects(guard.remove(name, Buffer.from('one')), { code: 'APR_BROKER_PATH_INVALID' });
  await assert.rejects(guard.writeExclusive(name, Buffer.from('two')), {
    code: 'APR_BROKER_PATH_INVALID',
  });
  await assert.rejects(guard.withElectionLease({ kind: 'won', verified: true }), {
    code: 'APR_BROKER_STALE',
  });
  await publication.withdraw();
});

test('[#168] closing an owned publication revokes its writer handle', async (t) => {
  const root = await temporary(t),
    receipt = await storage.provisionProtectedRoot({ root });
  const guard = await storage.openProtectedRoot({ receipt });
  t.after(() => guard.close());
  const name = 'apr-election-' + 'c'.repeat(64) + '-33333333-3333-4333-8333-333333333333.json';
  const publication = await guard.createOwnedPublication(name, Buffer.from('retained'));
  const first = await publication.snapshot();
  await publication.close();
  await assert.rejects(publication.publish(first, Buffer.from('changed')), {
    code: 'APR_BROKER_STALE',
  });
  assert.equal((await guard.read(name)).toString(), 'retained');
});

test('[#168] changed private bytes fence the retained publication rather than overwriting', async (t) => {
  const { writeFile } = await import('node:fs/promises');
  const root = await temporary(t),
    receipt = await storage.provisionProtectedRoot({ root });
  const guard = await storage.openProtectedRoot({ receipt });
  t.after(() => guard.close());
  const name = 'apr-election-' + 'd'.repeat(64) + '-44444444-4444-4444-8444-444444444444.json';
  const publication = await guard.createOwnedPublication(name, Buffer.from('original'));
  const first = await publication.snapshot();
  await writeFile(path.join(root, name), 'foreign', { mode: 0o600 });
  await assert.rejects(publication.publish(first, Buffer.from('stolen')), {
    code: 'APR_BROKER_STALE',
  });
  await assert.rejects(publication.withdraw(first), { code: 'APR_BROKER_STALE' });
  assert.equal((await guard.read(name)).toString(), 'foreign');
});

async function interceptOwnedFilesystem(t, name, implementation) {
  const fs = (await import('node:fs/promises')).default;
  const { syncBuiltinESMExports } = await import('node:module');
  const original = fs[name];
  const mock = t.mock.method(fs, name, (...args) => implementation(original, ...args));
  syncBuiltinESMExports();
  t.after(() => {
    mock.mock.restore();
    syncBuiltinESMExports();
  });
}
test('[#168] snapshot descriptor close failure retains a cleanup obligation', async (t) => {
  const root = await temporary(t),
    receipt = await storage.provisionProtectedRoot({ root });
  const guard = await storage.openProtectedRoot({ receipt });
  t.after(() => guard.close());
  const name = 'apr-election-' + 'a'.repeat(64) + '-55555555-5555-4555-8555-555555555555.json';
  const publication = await guard.createOwnedPublication(name, Buffer.from('one'));
  let retained,
    failed = false;
  await interceptOwnedFilesystem(t, 'open', async (original, value, ...args) => {
    const file = await original(value, ...args);
    if (value === path.join(root, name) && (Number(args[0]) & constants.O_CREAT) === 0 && !failed) {
      const close = file.close.bind(file),
        read = file.read.bind(file);
      let readCalled = false;
      file.read = async (...args) => {
        readCalled = true;
        retained = file;
        return read(...args);
      };
      file.close = async () => {
        if (readCalled && !failed) {
          failed = true;
          throw Object.assign(new Error('close unavailable'), { code: 'EIO' });
        }
        return close();
      };
    }
    return file;
  });
  let caught;
  try {
    await publication.snapshot();
  } catch (error) {
    caught = error;
  }
  assert.ok(failed, 'actual snapshot descriptor close failed');
  assert.ok(
    caught?.details?.obligations?.some(
      (item) => item.name === name && item.outcome === 'descriptor-close-pending'
    ),
    String(caught?.stack) + ' ' + JSON.stringify(caught)
  );
  assert.ok(await retained.stat());
  await guard.close();
  await assert.rejects(retained.stat(), { code: 'EBADF' });
});
test('[#168] owned publication retains the temporary descriptor when close fails before rename', async (t) => {
  const root = await temporary(t),
    receipt = await storage.provisionProtectedRoot({ root });
  const guard = await storage.openProtectedRoot({ receipt });
  t.after(() => guard.close());
  const name = 'apr-election-' + 'b'.repeat(64) + '-66666666-6666-4666-8666-666666666666.json';
  const publication = await guard.createOwnedPublication(name, Buffer.from('one')),
    first = await publication.snapshot();
  let retained,
    failed = false;
  await interceptOwnedFilesystem(t, 'open', async (original, value, ...args) => {
    const file = await original(value, ...args);
    if (
      path.basename(value).startsWith('publish-') &&
      (Number(args[0]) & constants.O_CREAT) !== 0
    ) {
      retained = file;
      const close = file.close.bind(file);
      file.close = async () => {
        if (!failed) {
          failed = true;
          throw Object.assign(new Error('close unavailable'), { code: 'EIO' });
        }
        return close();
      };
    }
    return file;
  });
  let caught;
  try {
    await publication.publish(first, Buffer.from('two'));
  } catch (error) {
    caught = error;
  }
  assert.ok(
    caught?.details?.obligations?.some(
      (item) => item.name.startsWith('publish-') && item.outcome === 'descriptor-close-pending'
    ),
    String(caught?.stack) + ' ' + JSON.stringify(caught)
  );
  assert.equal((await guard.read(name)).toString(), 'one');
  assert.ok(await retained.stat());
  await guard.close();
  await assert.rejects(retained.stat(), { code: 'EBADF' });
});
test('[#168] uncertain owned rename retains both generation locators without claiming retry safety', async (t) => {
  const { readFile, lstat } = await import('node:fs/promises');
  const root = await temporary(t),
    receipt = await storage.provisionProtectedRoot({ root });
  const guard = await storage.openProtectedRoot({ receipt });
  t.after(() => guard.close());
  const name = 'apr-election-' + 'c'.repeat(64) + '-77777777-7777-4777-8777-777777777777.json';
  const publication = await guard.createOwnedPublication(name, Buffer.from('one')),
    first = await publication.snapshot();
  await interceptOwnedFilesystem(t, 'rename', async (original, ...args) => {
    await original(...args);
    throw Object.assign(new Error('effect outcome unavailable'), { code: 'EIO' });
  });
  let caught;
  try {
    await publication.publish(first, Buffer.from('two'));
  } catch (error) {
    caught = error;
  }
  assert.equal((await readFile(path.join(root, name))).toString(), 'two');
  const pending = caught?.details?.obligations?.find(
    (item) => item.outcome === 'publication-unconfirmed'
  );
  assert.ok(pending);
  assert.equal(pending.alternateName, name);
  assert.equal(caught.details.retrySafe, false);
  const stat = await lstat(path.join(root, name), { bigint: true });
  assert.equal(pending.identity, [stat.dev, stat.ino].map(String).join(':'));
  await assert.rejects(publication.withdraw(first), { code: 'APR_BROKER_STALE' });
});
