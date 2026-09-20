import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { inspectPlatformSecurity, platformSecurity } from '../../src/broker/platform.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const builder = path.join(root, 'scripts/build-broker-security.mjs');

test('explicit builder refuses absent, relative, extra and missing local development arguments', () => {
  for (const args of [
    [],
    ['--nodedir', 'relative'],
    ['--download'],
    ['--nodedir', path.join(root, 'missing-headers')],
    ['--nodedir', root, '--python', 'relative'],
  ]) {
    const result = spawnSync(process.execPath, [builder, ...args], {
      encoding: 'utf8',
      shell: false,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /APR_BROKER_BUILD_FAILED/);
    assert.doesNotMatch(result.stderr, /gyp http|https?:\/\//);
  }
});

test('native build is explicit and package includes only the five owned build sources', () => {
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json')));
  assert.equal(pkg.dependencies['node-gyp'], '12.4.0');
  assert.equal(pkg.scripts['build:broker-security'], 'node scripts/build-broker-security.mjs');
  for (const event of ['preinstall', 'install', 'postinstall', 'prepare'])
    assert.equal(pkg.scripts[event], undefined);
  for (const file of [
    'native/broker-security/binding.gyp',
    'native/broker-security/addon.cc',
    'native/broker-security/posix.cc',
    'native/broker-security/windows.cc',
    'scripts/build-broker-security.mjs',
  ]) {
    assert.ok(pkg.files.includes(file));
    assert.ok(existsSync(path.join(root, file)));
  }
  assert.ok(!pkg.files.includes('native/'));
});

test('missing or mismatched native helper fails with the installation-specific offline build command', (t) => {
  const installationRoot = mkdtempSync(path.join(os.tmpdir(), 'apr-broker-install-'));
  t.after(() => rmSync(installationRoot, { recursive: true, force: true }));
  const missing = inspectPlatformSecurity({ root: installationRoot });
  assert.equal(missing.healthy, false);
  assert.match(missing.build_command, /^npm --prefix /);
  assert.match(missing.build_command, /run build:broker-security -- --nodedir/);
  assert.throws(() => platformSecurity({ root: installationRoot }), {
    code: 'APR_BROKER_START_FAILED',
  });
});

test('platform wrapper retains native handles and never reaches the builder implicitly', () => {
  const calls = [];
  const binding = {
    canonicalPath(value) {
      calls.push(['canonicalPath', value]);
      return value;
    },
    userId() {
      return '501';
    },
    openPrivateDirectory(value) {
      calls.push(['openPrivateDirectory', value]);
      return 1;
    },
    verifyDirectory(handle) {
      return handle === 1;
    },
    directoryRead() {
      return null;
    },
    directoryCreate(_handle, name, bytes) {
      calls.push(['create', name, bytes.toString()]);
    },
    directoryRemove() {
      return true;
    },
    closeDirectory() {
      calls.push(['closeDirectory']);
    },
    acquireExclusive(value, bytes) {
      calls.push(['acquireExclusive', value, bytes.toString()]);
      return 2;
    },
    verifyExclusive(handle) {
      return handle === 2;
    },
    releaseExclusive() {
      return true;
    },
    abandonExclusive() {
      calls.push(['abandonExclusive']);
    },
    listenPrivate(value) {
      calls.push(['listenPrivate', value]);
      return 3;
    },
    verifyEndpoint(handle) {
      return handle === 3;
    },
    closeEndpoint() {
      calls.push(['closeEndpoint']);
      return true;
    },
    peerUser() {
      return '501';
    },
  };
  const platform = platformSecurity({ binding, kind: 'darwin' });
  const directory = platform.openPrivateDirectory('/private');
  assert.equal(directory.verify(), true);
  directory.create('broker.json', Buffer.from('evidence'));
  const lock = platform.acquireExclusive('/private/broker.lock', {
    instanceId: 'a'.repeat(64),
    nonce: 'b'.repeat(64),
  });
  assert.equal(lock.verify(), true);
  assert.equal(lock.release(), true);
  const endpoint = platform.listenPrivate('/private/broker.sock');
  assert.equal(endpoint.verify(), true);
  endpoint.close();
  directory.close();
  assert.deepEqual(
    calls.map(([name]) => name),
    [
      'openPrivateDirectory',
      'create',
      'acquireExclusive',
      'listenPrivate',
      'closeEndpoint',
      'closeDirectory',
    ]
  );
});

test('platform wrapper rejects an incomplete native contract with a stable startup error', () => {
  assert.throws(() => platformSecurity({ binding: {}, kind: 'linux' }), {
    code: 'APR_BROKER_START_FAILED',
    details: { missing: 'canonicalPath' },
  });
});
