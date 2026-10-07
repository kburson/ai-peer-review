// @story #166
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
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
