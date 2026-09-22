import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { inspectPlatformSecurity, platformSecurity } from '../../src/broker/platform.mjs';

// cspell:ignore beginthreadex DONTWAIT NOWAIT
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
  const builderSource = readFileSync(builder, 'utf8');
  const ownershipTestSource = readFileSync(
    path.join(root, 'test/unit/broker-ownership.test.mjs'),
    'utf8'
  );
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
  assert.match(
    builderSource,
    /path\.join\(options\['--nodedir'\], 'Release', 'node\.lib'\)/,
    'explicit Windows nodedir validation must match node-gyp configure lookup'
  );
  assert.doesNotMatch(
    builderSource,
    /target_arch/,
    'the architecture-neutral POSIX header archive cannot prove the target architecture'
  );
  assert.match(builderSource, /`--arch=\$\{process\.arch\}`/);
  assert.match(
    ownershipTestSource,
    /fileURLToPath\(new URL\('\.\.\/\.\.\/scripts\/build-broker-security\.mjs'/
  );
  assert.doesNotMatch(ownershipTestSource, /\.pathname/);
});

test('native ownership release preserves lock evidence and IPC waits are bounded', () => {
  const posix = readFileSync(path.join(root, 'native/broker-security/posix.cc'), 'utf8');
  const windows = readFileSync(path.join(root, 'native/broker-security/windows.cc'), 'utf8');
  const posixRelease = posix.match(/bool ReleaseExclusive[\s\S]*?\n}/)?.[0] ?? '';
  const windowsRelease = windows.match(/bool ReleaseExclusive[\s\S]*?\n}/)?.[0] ?? '';
  const posixWrite = posix.match(/bool SendAll[\s\S]*?\n}/)?.[0] ?? '';
  const windowsRead = windows.match(/bool ReadExact[\s\S]*?\n}/)?.[0] ?? '';
  const windowsPipeThread =
    windows.match(/unsigned __stdcall WritePipeThread[\s\S]*?\n}/)?.[0] ?? '';
  const windowsBoundedWrite = windows.match(/bool WritePipeBounded[\s\S]*?\n}/)?.[0] ?? '';
  const windowsServerWrite = windows.match(/bool WriteServerReply[\s\S]*?\n}/)?.[0] ?? '';
  const windowsFence = windows.match(/void FenceConnection[\s\S]*?\n}/)?.[0] ?? '';
  const windowsConnectionRead = windows.match(/bool ConnectionRead[\s\S]*?\n}/)?.[0] ?? '';
  const windowsWrite = windows.match(/bool ConnectionWrite[\s\S]*?\n}/)?.[0] ?? '';
  const windowsClose = windows.match(/void CloseConnection[\s\S]*?\n}/)?.[0] ?? '';

  assert.doesNotMatch(posixRelease, /unlink/);
  assert.doesNotMatch(windowsRelease, /DeleteFileW|FileDisposition/);
  assert.match(posix, /kIpcTimeoutMilliseconds/);
  assert.match(posix, /poll\(/);
  assert.match(posixWrite, /MSG_DONTWAIT/);
  assert.match(windows, /kIpcTimeoutMilliseconds/);
  assert.doesNotMatch(
    windowsRead,
    /PeekNamedPipe|PIPE_NOWAIT|SetNamedPipeHandleState|GetTickCount64/
  );
  assert.match(windows, /struct PipeReadRequest/);
  assert.match(windows, /unsigned __stdcall ReadPipeThread\(void\* value\)/);
  assert.match(windowsRead, /DuplicateHandle\(/);
  assert.match(windowsRead, /_beginthreadex\(/);
  assert.match(windowsRead, /WaitForSingleObject\(thread, kIpcTimeoutMilliseconds\)/);
  assert.match(windowsRead, /CancelSynchronousIo\(thread\)/);
  assert.match(windows, /struct PipeWriteRequest/);
  assert.match(windows, /unsigned __stdcall WritePipeThread\(void\* value\)/);
  assert.match(windowsBoundedWrite, /DuplicateHandle\(/);
  assert.match(windowsBoundedWrite, /_beginthreadex\(/);
  assert.doesNotMatch(windowsBoundedWrite, /CreateThread\(/);
  assert.match(windowsBoundedWrite, /WaitForSingleObject\(thread, kIpcTimeoutMilliseconds\)/);
  assert.match(windowsBoundedWrite, /CancelSynchronousIo\(thread\)/);
  assert.match(windowsBoundedWrite, /PipeWriteRequest\{duplicate, bytes, nullptr, flush\}/);
  assert.match(
    windows,
    /struct PipeWriteRequest \{ HANDLE handle; std::vector<unsigned char> bytes; HANDLE written; bool flush; \};/
  );
  assert.match(windows, /SetEvent\(request->written\)/);
  assert.match(windows, /request->flush && !FlushFileBuffers\(request->handle\)/);
  assert.doesNotMatch(windowsPipeThread, /DisconnectNamedPipe/);
  assert.match(windowsServerWrite, /CreateEventW\(/);
  assert.match(windowsServerWrite, /WaitForMultipleObjects\(/);
  assert.match(windowsServerWrite, /SupervisePipeWrite/);
  assert.match(windows, /struct Connection \{ HANDLE handle; bool server_side; bool fenced; \};/);
  assert.match(windowsFence, /connection->fenced = true/);
  assert.match(windowsFence, /DisconnectNamedPipe\(connection->handle\)/);
  assert.match(windowsConnectionRead, /connection->fenced/);
  assert.match(windowsConnectionRead, /FenceConnection\(connection\)/);
  assert.match(windowsWrite, /drain \? WritePipeBounded\(connection->handle, bytes, true\)/);
  assert.match(windowsWrite, /WriteServerReply\(connection->handle, bytes\)/);
  assert.match(windowsWrite, /WritePipeBounded\(connection->handle, bytes, false\)/);
  assert.match(windowsWrite, /connection->fenced/);
  assert.match(windowsWrite, /FenceConnection\(connection\)/);
  assert.doesNotMatch(windowsWrite, /PIPE_NOWAIT|SetNamedPipeHandleState|GetTickCount64/);
  assert.doesNotMatch(windowsClose, /DisconnectNamedPipe/);
  assert.match(
    windows,
    /const DWORD createError = handle == INVALID_HANDLE_VALUE \? GetLastError\(\) : ERROR_SUCCESS;[\s\S]*LocalFree\(descriptor\);/
  );
  assert.doesNotMatch(windows, /bool FlushServerBounded\(HANDLE handle\)/);
  assert.match(windows, /DuplicateHandle\(/);
  assert.match(windows, /CancelSynchronousIo\(/);
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
  let nextConnection = 5;
  const failedReads = new Set();
  const failedWrites = new Set();
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
    reclaimStaleEndpoint(handle, value) {
      calls.push(['reclaimStaleEndpoint', handle, value]);
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
    acceptPrivate(handle) {
      calls.push(['acceptPrivate', handle]);
      return 4;
    },
    connectPrivate(value) {
      calls.push(['connectPrivate', value]);
      return nextConnection++;
    },
    connectionRead(handle, maximum) {
      calls.push(['connectionRead', handle, maximum]);
      if (failedReads.has(handle)) throw new Error('native read failed');
      return Buffer.from('response');
    },
    connectionWrite(handle, bytes, drain) {
      calls.push(['connectionWrite', handle, bytes.toString(), drain]);
      if (failedWrites.has(handle)) throw new Error('native write failed');
    },
    closeConnection(handle) {
      calls.push(['closeConnection', handle]);
    },
    peerUser(handle) {
      calls.push(['peerUser', handle]);
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
  platform.reclaimStaleEndpoint('/private/broker.sock', lock);
  assert.ok(calls.some((call) => call[0] === 'reclaimStaleEndpoint' && call[1] === 2));
  assert.equal(lock.release(), true);
  assert.throws(() => platform.reclaimStaleEndpoint('/private/broker.sock', lock), {
    code: 'APR_BROKER_STALE',
  });
  const endpoint = platform.listenPrivate('/private/broker.sock');
  assert.equal(endpoint.verify(), true);
  const accepted = endpoint.accept();
  assert.equal(platform.peerUser(accepted), '501');
  assert.equal(accepted.readFrame().toString(), 'response');
  accepted.write(Buffer.from('reply'), { drain: true });
  assert.ok(calls.some((call) => call[0] === 'connectionWrite' && call[3] === true));
  accepted.close();
  assert.throws(() => platform.peerUser(accepted), { code: 'APR_BROKER_AUTH_FAILED' });
  const client = platform.connectPrivate('/private/broker.sock');
  assert.equal(client.exchange(Buffer.from('request')).toString(), 'response');
  client.close();
  const failedRead = platform.connectPrivate('/private/broker.sock');
  failedReads.add(6);
  assert.throws(() => failedRead.readFrame(), /native read failed/);
  assert.throws(() => failedRead.readFrame(), { code: 'APR_BROKER_STALE' });
  failedRead.close();
  assert.equal(
    calls.filter(([name, handle]) => name === 'closeConnection' && handle === 6).length,
    1
  );
  const failedWrite = platform.connectPrivate('/private/broker.sock');
  failedWrites.add(7);
  assert.throws(() => failedWrite.write(Buffer.from('request')), /native write failed/);
  assert.throws(() => failedWrite.write(Buffer.from('retry')), { code: 'APR_BROKER_STALE' });
  failedWrite.close();
  assert.equal(
    calls.filter(([name, handle]) => name === 'closeConnection' && handle === 7).length,
    1
  );
  endpoint.close();
  directory.close();
  assert.deepEqual(
    calls.map(([name]) => name),
    [
      'openPrivateDirectory',
      'create',
      'acquireExclusive',
      'reclaimStaleEndpoint',
      'listenPrivate',
      'acceptPrivate',
      'peerUser',
      'connectionRead',
      'connectionWrite',
      'closeConnection',
      'connectPrivate',
      'connectionWrite',
      'connectionRead',
      'closeConnection',
      'connectPrivate',
      'connectionRead',
      'closeConnection',
      'connectPrivate',
      'connectionWrite',
      'closeConnection',
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
