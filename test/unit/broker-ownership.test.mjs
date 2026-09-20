import assert from 'node:assert/strict';
import test from 'node:test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  chmodSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { acquireBrokerOwnership } from '../../src/broker/ownership.mjs';

const identity = {
  tuple: ['ai-peer-review.broker-root/v1', '/project', null, '501'],
  userId: '501',
};
const paths = {
  directory: '/cache',
  lock: '/cache/broker.lock',
  metadata: '/cache/broker.json',
  endpoint: '/cache/broker.sock',
};
const versions = { package_version: '0.2.2', broker_protocol_version: 1, node_major: 26 };

function fixture() {
  let valid = true,
    locked = false,
    metadata = null,
    released = 0,
    abandoned = 0;
  const platform = {
    userId: () => '501',
    openPrivateDirectory() {
      return {
        verify: () => valid,
        read: () => metadata,
        create: (_name, bytes) => {
          metadata = bytes;
        },
        close() {},
      };
    },
    acquireExclusive(_path, values) {
      if (locked) throw Object.assign(new Error('owned'), { code: 'APR_BROKER_OWNED' });
      locked = true;
      return {
        ...values,
        fresh: true,
        verify: () => valid,
        release: () => {
          released++;
          locked = false;
          return valid;
        },
        abandon: () => {
          abandoned++;
          locked = false;
        },
      };
    },
    listenPrivate() {
      return { verify: () => valid, close() {} };
    },
  };
  return {
    platform,
    invalidate: () => {
      valid = false;
    },
    tamper: () => {
      metadata = Buffer.from('{}');
    },
    released: () => released,
    abandoned: () => abandoned,
  };
}

test('live OS ownership defeats dead-looking discovery and a second instance', () => {
  const f = fixture();
  const owner = acquireBrokerOwnership(
    { identity, paths, versions, reconcile: () => true },
    f.platform
  );
  assert.equal(owner.verify(), true);
  assert.throws(
    () => acquireBrokerOwnership({ identity, paths, versions, reconcile: () => true }, f.platform),
    { code: 'APR_BROKER_OWNED' }
  );
  assert.equal(f.released(), 0);
  assert.equal(owner.release(), true);
});

test('missing cache evidence requires explicit registry and provider reconciliation', () => {
  const f = fixture();
  assert.throws(() => acquireBrokerOwnership({ identity, paths, versions }, f.platform), {
    code: 'APR_BROKER_STALE',
  });
  assert.equal(f.released(), 0);
  assert.equal(f.abandoned(), 1);
});

for (const observation of ['symlink', 'reparse-point', 'foreign-owner', 'permissive-directory']) {
  test(`refuses hostile ${observation} observations without authenticating or deleting`, () => {
    const f = fixture();
    f.platform.openPrivateDirectory = () => {
      throw Object.assign(new Error(observation), { code: 'APR_BROKER_STALE' });
    };
    assert.throws(
      () =>
        acquireBrokerOwnership({ identity, paths, versions, reconcile: () => true }, f.platform),
      { code: 'APR_BROKER_STALE' }
    );
    assert.equal(f.released(), 0);
  });
}

test('replacement or unlink permanently fences owner and refuses destructive release', () => {
  const f = fixture();
  const owner = acquireBrokerOwnership(
    { identity, paths, versions, reconcile: () => true },
    f.platform
  );
  f.invalidate();
  assert.equal(owner.verify(), false);
  assert.equal(owner.release(), false);
});

test('tampered metadata fences an otherwise live retained lock', () => {
  const f = fixture();
  const owner = acquireBrokerOwnership(
    { identity, paths, versions, reconcile: () => true },
    f.platform
  );
  f.tamper();
  assert.equal(owner.verify(), false);
  assert.equal(owner.release(), false);
});

const nativeAvailable = existsSync(
  new URL('../../native/broker-security/build/Release/broker_security.node', import.meta.url)
);
test(
  'native retained lock rejects contention and replacement and enforces private resources',
  { skip: !nativeAvailable && !process.env.CI && !process.env.APR_NATIVE_REQUIRED },
  async (t) => {
    if (
      !existsSync(
        new URL('../../native/broker-security/build/Release/broker_security.node', import.meta.url)
      )
    ) {
      const executableDirectory = path.dirname(process.execPath);
      const nodeDevelopmentRoot = [executableDirectory, path.dirname(executableDirectory)].find(
        (candidate) => existsSync(path.join(candidate, 'include', 'node', 'node_api.h'))
      );
      assert.ok(nodeDevelopmentRoot, 'hosted CI must expose the setup-node development tree');
      const build = spawnSync(
        process.execPath,
        [
          new URL('../../scripts/build-broker-security.mjs', import.meta.url).pathname,
          '--nodedir',
          nodeDevelopmentRoot,
        ],
        { encoding: 'utf8', shell: false }
      );
      assert.equal(build.status, 0, `${build.stdout}\n${build.stderr}`);
    }
    const { platformSecurity } = await import('../../src/broker/platform.mjs');
    const security = platformSecurity();
    const scratch = new URL('../../.scratch/test/', import.meta.url);
    mkdirSync(scratch, { recursive: true });
    const directory = mkdtempSync(new URL('broker-native-', scratch).pathname);
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const privatePath = path.join(directory, 'private');
    const ownedDirectory = security.openPrivateDirectory(privatePath);
    assert.equal(ownedDirectory.verify(), true);
    ownedDirectory.create('data', Buffer.from('private'));
    assert.equal(ownedDirectory.read('data').toString(), 'private');
    const target = path.join(privatePath, 'broker.lock');
    const lock = security.acquireExclusive(target, {
      instanceId: 'a'.repeat(64),
      nonce: 'b'.repeat(64),
    });
    assert.equal(lock.verify(), true);
    const child = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import {platformSecurity} from ${JSON.stringify(new URL('../../src/broker/platform.mjs', import.meta.url).href)}; try { platformSecurity().acquireExclusive(process.argv[1], {instanceId:'c'.repeat(64),nonce:'d'.repeat(64)}); process.exit(2); } catch(e) { console.log(e.code); }`,
        target,
      ],
      { encoding: 'utf8', shell: false }
    );
    assert.equal(child.status, 0);
    assert.match(child.stdout, /APR_BROKER_OWNED/);
    if (process.platform !== 'win32') {
      renameSync(target, `${target}.held`);
      writeFileSync(target, 'foreign', { mode: 0o600 });
      assert.equal(lock.verify(), false);
      assert.equal(lock.release(), false);
      assert.equal(existsSync(target), true);
      const alias = path.join(directory, 'alias');
      symlinkSync(privatePath, alias);
      assert.throws(() => security.openPrivateDirectory(alias), { code: 'APR_BROKER_STALE' });
      chmodSync(privatePath, 0o755);
      assert.throws(() => security.openPrivateDirectory(privatePath), { code: 'APR_BROKER_STALE' });
    } else assert.equal(lock.release(), true);
    ownedDirectory.close();
  }
);
