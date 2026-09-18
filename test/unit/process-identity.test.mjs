import assert from 'node:assert/strict';
import test from 'node:test';

import { observeProcessIdentity } from '../../src/protocol/process-identity.mjs';

test('Linux process identity reads boot id and proc start ticks without executing a subprocess', async () => {
  const reads = [];
  let executions = 0;
  const identity = await observeProcessIdentity({
    pid: 42,
    platform: 'linux',
    hostname: 'host-a',
    readFile(file) {
      reads.push(file);
      if (file.endsWith('/boot_id')) return 'boot-a\n';
      return '42 (node worker) S 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 4242 0\n';
    },
    async execFile() {
      executions += 1;
      throw new Error('must not execute');
    },
  });

  assert.deepEqual(identity, {
    status: 'live',
    host: 'host-a',
    pid: 42,
    boot_id: 'boot-a',
    process_start: '4242',
  });
  assert.equal(executions, 0);
  assert.deepEqual(reads, ['/proc/sys/kernel/random/boot_id', '/proc/42/stat']);
});

test('Linux missing process is proven dead while unreadable boot identity is unknown', async () => {
  const dead = await observeProcessIdentity({
    pid: 99,
    platform: 'linux',
    hostname: 'host-a',
    readFile(file) {
      if (file.endsWith('/boot_id')) return 'boot-a\n';
      const error = new Error('gone');
      error.code = 'ENOENT';
      throw error;
    },
  });
  assert.deepEqual(dead, { status: 'dead', host: 'host-a', pid: 99 });

  const unknown = await observeProcessIdentity({
    pid: 99,
    platform: 'linux',
    hostname: 'host-a',
    readFile() {
      const error = new Error('denied');
      error.code = 'EACCES';
      throw error;
    },
  });
  assert.equal(unknown.status, 'unknown');
  assert.equal(unknown.reason, 'identity-unavailable');
});

test('macOS probes only canonical regular sysctl and ps executables with shell disabled', async () => {
  const calls = [];
  const identity = await observeProcessIdentity({
    pid: 7,
    platform: 'darwin',
    hostname: 'host-a',
    lstat(file) {
      assert.ok(['/usr/sbin/sysctl', '/bin/ps'].includes(file));
      return { isFile: () => true, isSymbolicLink: () => false };
    },
    async execFile(file, args, options) {
      calls.push({ file, args, options });
      if (file === '/usr/sbin/sysctl')
        return { stdout: 'kern.boottime: { sec = 100, usec = 0 }\n' };
      return { stdout: '200\n' };
    },
  });

  assert.equal(identity.status, 'live');
  assert.equal(identity.boot_id, 'epoch:100');
  assert.equal(identity.process_start, 'epoch:200');
  assert.deepEqual(calls, [
    {
      file: '/usr/sbin/sysctl',
      args: ['-n', 'kern.boottime'],
      options: { shell: false, encoding: 'utf8' },
    },
    {
      file: '/bin/ps',
      args: ['-o', 'lstart=', '-p', '7'],
      options: { shell: false, encoding: 'utf8' },
    },
  ]);
});

test('noncanonical macOS probe paths degrade to unknown instead of searching PATH', async () => {
  let executions = 0;
  const identity = await observeProcessIdentity({
    pid: 7,
    platform: 'darwin',
    hostname: 'host-a',
    lstat() {
      return { isFile: () => true, isSymbolicLink: () => true };
    },
    async execFile() {
      executions += 1;
    },
  });
  assert.equal(identity.status, 'unknown');
  assert.equal(identity.reason, 'probe-unavailable');
  assert.equal(executions, 0);
});
