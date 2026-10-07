// cspell:ignore usec
// @story 167
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  observeProcessIdentity,
  observeProcessIdentityCore,
} from '../../src/protocol/process-identity.mjs';

const bootId = '11111111-2222-4333-8444-555555555555';
const linuxProbe = {
  path: '/proc',
  version: 'procfs-v1',
  visibility: 'full-pid-namespace',
  errorContract: 'exact-pid-directory-v1',
};
const darwinProbe = {
  path: '/bin/ps',
  version: 'fixture-stock',
  visibility: 'same-user-full-selection',
  errorContract: 'exact-ps-selection-v1',
};
const directory = () => ({ isDirectory: () => true, isSymbolicLink: () => false });

test('explicit Linux core parses direct boot UUID and start ticks as unverified data without a subprocess', async () => {
  const reads = [];
  const identity = await observeProcessIdentityCore({
    pid: 42,
    platform: 'linux',
    hostname: 'host-a',
    probeObservation: linuxProbe,
    lstat: directory,
    readFile(file) {
      reads.push(file);
      return file.endsWith('/boot_id')
        ? bootId
        : '42 (node worker) S 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 4242 0\n';
    },
    async execFile() {
      throw new Error('must not execute');
    },
  });
  assert.deepEqual(identity, {
    status: 'live',
    host: 'host-a',
    pid: 42,
    boot_id: bootId,
    process_start: '4242',
    creation: { unit: 'linux-ticks:' + bootId, lower: '4242', upper: '4243' },
    verified: false,
  });
  assert.deepEqual(reads, ['/proc/sys/kernel/random/boot_id', '/proc/42/stat']);
});

test('Linux missing live PID subfile and unreadable boot identity remain unknown', async () => {
  for (const code of ['ENOENT', 'ESRCH', 'EACCES']) {
    const observed = await observeProcessIdentityCore({
      pid: 99,
      platform: 'linux',
      hostname: 'host-a',
      probeObservation: linuxProbe,
      lstat: directory,
      readFile(file) {
        if (file.endsWith('/boot_id')) return bootId;
        throw Object.assign(new Error('failed'), { code });
      },
    });
    assert.equal(observed.status, 'unknown');
  }
  const denied = await observeProcessIdentityCore({
    pid: 99,
    platform: 'linux',
    hostname: 'host-a',
    probeObservation: linuxProbe,
    lstat: directory,
    readFile() {
      throw Object.assign(new Error('denied'), { code: 'EACCES' });
    },
  });
  assert.equal(denied.status, 'unknown');
});

test('explicit macOS core parses fixed-locale UTC ps output without clock-derived boot identity', async () => {
  const calls = [];
  const identity = await observeProcessIdentityCore({
    pid: 7,
    platform: 'darwin',
    hostname: 'host-a',
    probeObservation: darwinProbe,
    lstat: () => ({ isFile: () => true, isSymbolicLink: () => false }),
    async execFile(file, args, options) {
      calls.push({ file, args, options });
      return { stdout: '    7 Thu Jan  1 00:00:00 2026\n', stderr: '' };
    },
  });
  assert.deepEqual(identity, {
    status: 'live',
    host: 'host-a',
    pid: 7,
    creation: {
      unit: 'utc-nanoseconds',
      lower: '1767225600000000000',
      upper: '1767225601000000000',
    },
    verified: false,
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].file, '/bin/ps');
  assert.deepEqual(calls[0].args, ['-p', '7', '-o', 'pid=,lstart=']);
  assert.equal(calls[0].options.shell, false);
  assert.equal(calls[0].options.env.TZ, 'UTC');
  assert.equal(calls[0].options.env.LC_ALL, 'C');
});

test('noncanonical macOS core probe refuses before subprocess execution', async () => {
  let executions = 0;
  const identity = await observeProcessIdentityCore({
    pid: 7,
    platform: 'darwin',
    hostname: 'host-a',
    probeObservation: darwinProbe,
    lstat: () => ({ isFile: () => true, isSymbolicLink: () => true }),
    async execFile() {
      executions++;
    },
  });
  assert.equal(identity.status, 'unknown');
  assert.equal(identity.reason, 'probe-unavailable');
  assert.equal(executions, 0);
});
test('unclassified Linux subfile errors and malformed boot identity never prove death', async () => {
  for (const code of ['ENOENT', 'ESRCH', 'EACCES']) {
    const observed = await observeProcessIdentity({
      pid: 91,
      platform: 'linux',
      hostname: 'host-a',
      readFile(file) {
        if (file.endsWith('/boot_id')) return '11111111-2222-4333-8444-555555555555\n';
        throw Object.assign(new Error('unclassified'), { code });
      },
    });
    assert.equal(observed.status, 'unknown', code);
  }
  const malformed = await observeProcessIdentity({
    pid: 91,
    platform: 'linux',
    hostname: 'host-a',
    readFile(file) {
      return file.endsWith('/boot_id')
        ? 'not-a-boot-uuid'
        : '91 (node) S ' + Array(18).fill('0').join(' ') + ' 23 0';
    },
  });
  assert.equal(malformed.status, 'unknown');
});

test('macOS empty selection and generic failed probes are not absence authority', async () => {
  for (const failure of [null, 'ENOENT', 'ESRCH', 1]) {
    const observed = await observeProcessIdentity({
      pid: 91,
      platform: 'darwin',
      hostname: 'host-a',
      lstat: () => ({ isFile: () => true, isSymbolicLink: () => false }),
      async execFile(file) {
        if (file.endsWith('sysctl')) return { stdout: '{ sec = 100, usec = 0 }' };
        if (failure !== null)
          throw Object.assign(new Error('probe failed'), { code: failure, stdout: '', stderr: '' });
        return { stdout: '', stderr: '' };
      },
    });
    assert.equal(observed.status, 'unknown', String(failure));
  }
});

test('Windows failed CIM queries and incidental exit 3 never prove death', async () => {
  const observed = await observeProcessIdentity({
    pid: 91,
    platform: 'win32',
    hostname: 'host-a',
    lstat: () => ({ isFile: () => true, isSymbolicLink: () => false }),
    async execFile() {
      throw Object.assign(new Error('provider denied'), { code: 3, stdout: '', stderr: '' });
    },
  });
  assert.equal(observed.status, 'unknown');
});

test('injected stock probe fixtures cannot grant production identity or death', async () => {
  const observed = await observeProcessIdentity({
    pid: 91,
    platform: 'linux',
    hostname: 'host-a',
    readFile(file) {
      return file.endsWith('/boot_id')
        ? '11111111-2222-4333-8444-555555555555'
        : '91 (node) S ' + Array(18).fill('0').join(' ') + ' 23 0';
    },
  });
  assert.equal(observed.status, 'unknown');
  assert.equal(observed.reason, 'source-class-unavailable');
});
