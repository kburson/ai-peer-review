// cspell:ignore hidepid statfs nosuid nodev noexec relatime
// @story 167
import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeRequestCanonical } from '../../src/api/canonical-json.mjs';

const api = await import('../../src/protocol/process-source-assurance.mjs').catch(() => ({}));
const identity = await import('../../src/protocol/process-identity.mjs');
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const digest = 'sha256:' + 'a'.repeat(64);
const evidenceDigest = 'sha256:' + 'b'.repeat(64);
const reviewDigest = 'sha256:' + 'c'.repeat(64);
const host = { platform: 'linux', build: '6.8.0-fixture', architecture: 'x64', nodeMajor: 24 };
const probe = {
  path: '/proc',
  version: 'procfs-v1',
  visibility: 'full-pid-namespace',
  errorContract: 'exact-pid-directory-v1',
};
function fixtureClass(capability = 'absence') {
  const record = {
    schema: 'ai-peer-review.process-source-class/v1',
    classId: 'fixture-linux-' + capability,
    capability,
    scope: {
      platform: 'linux',
      builds: ['6.8.0-fixture'],
      architectures: ['x64'],
      nodeMajors: [24],
      probe,
    },
    contractDigest: digest,
    semantics: capability === 'absence' ? 'linux-pid-directory-v1' : 'linux-start-ticks-v1',
    precision: capability === 'absence' ? 'not-applicable' : 'one-tick',
    acceptance: { status: 'accepted', evidenceDigest, reviewDigest },
  };
  record.approvalDigest =
    'sha256:' + createHash('sha256').update(encodeRequestCanonical(record)).digest('hex');
  return record;
}
const ledger = (classes) => ({ schema: 'ai-peer-review.process-source-ledger/v1', classes });
const verify = (record, overrides = {}) =>
  api.verifyProcessSourceClass({
    ledger: ledger([record]),
    host,
    adapterHashes: { contractDigest: digest },
    probeObservation: probe,
    ...overrides,
  });

test('closed installed ledger keeps both capabilities unavailable without capture keys', async () => {
  assert.equal(typeof api.loadProcessSourceAssurance, 'function');
  const assurance = await api.loadProcessSourceAssurance({ installation: ROOT });
  assert.equal(assurance.absence.status, 'unavailable');
  assert.equal(assurance.creation.status, 'unavailable');
  assert.equal(assurance.absence.reason, 'source-class-unavailable');
  assert.equal(assurance.creation.reason, 'creation-stamp-unavailable');
  assert.ok(Object.isFrozen(assurance));
});

test('fixture classes can match structure but never grant production permission', async () => {
  assert.equal(typeof api.verifyProcessSourceClass, 'function');
  const structural = verify(fixtureClass());
  assert.equal(structural.absence.status, 'matched');
  assert.equal(structural.verified, false);
  const operational = await api.loadProcessSourceAssurance({
    installation: ROOT,
    ledger: ledger([fixtureClass()]),
    host,
    probe,
    approved: true,
  });
  assert.equal(operational.absence.status, 'unavailable');
  assert.equal(operational.creation.status, 'unavailable');
});

test('modified approvals, unknown properties and widened finite scope refuse structural admission', () => {
  assert.equal(typeof api.verifyProcessSourceClass, 'function');
  for (const mutate of [
    (r) => {
      r.scope.builds.push('6.9.0');
    },
    (r) => {
      r.acceptance.status = 'proposed';
    },
    (r) => {
      r.verified = true;
    },
    (r) => {
      r.approvalDigest = evidenceDigest;
    },
    (r) => {
      r.scope.builds = ['*'];
    },
    (r) => {
      r.scope.nodeMajors = [];
    },
  ]) {
    const record = fixtureClass();
    mutate(record);
    assert.equal(verify(record).absence.status, 'unavailable');
  }
});

test('current source, OS, architecture, Node and every probe field must match', () => {
  assert.equal(typeof api.verifyProcessSourceClass, 'function');
  for (const override of [
    { adapterHashes: { contractDigest: evidenceDigest } },
    { host: { ...host, platform: 'darwin' } },
    { host: { ...host, build: '6.9.0' } },
    { host: { ...host, architecture: 'arm64' } },
    { host: { ...host, nodeMajor: 25 } },
    ...Object.keys(probe).map((key) => ({ probeObservation: { ...probe, [key]: 'wrong' } })),
  ])
    assert.equal(verify(fixtureClass(), override).absence.status, 'unavailable');
  assert.equal(verify(fixtureClass('creation')).absence.status, 'unavailable');
  assert.equal(verify(fixtureClass()).creation.status, 'unavailable');
});

test('source contract includes all production parser validators but excludes ledger and unrelated package bytes', async (t) => {
  assert.equal(typeof api.processSourceContractDigest, 'function');
  const root = mkdtempSync(path.join(tmpdir(), 'apr-source-contract-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const file of [
    'src/broker/platform.mjs',
    'src/config/runtime-selection.mjs',
    'src/config/runtime-selection-core.mjs',
    'src/errors.mjs',
    'src/installed/dependency-closure.mjs',
    'src/startup/runtime-inventory.mjs',
    'src/protocol/process-identity.mjs',
    'src/protocol/process-source-assurance.mjs',
    'src/api/canonical-json.mjs',
    'schemas/process-source-class-v1.json',
  ]) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    cpSync(path.join(ROOT, file), path.join(root, file));
  }
  const original = await api.processSourceContractDigest({ installation: root });
  writeFileSync(
    path.join(root, 'src/protocol/process-source-contracts.json'),
    '{"classes":["unrelated approvals"]}'
  );
  writeFileSync(path.join(root, 'package.json'), '{"unrelated":true}');
  assert.equal(await api.processSourceContractDigest({ installation: root }), original);
  writeFileSync(
    path.join(root, 'src/api/canonical-json.mjs'),
    readFileSync(path.join(root, 'src/api/canonical-json.mjs'), 'utf8') + '\n// changed parser\n'
  );
  assert.notEqual(await api.processSourceContractDigest({ installation: root }), original);
});

test('canonical creation intervals preserve declared UTC precision and reject locale guesses', () => {
  assert.equal(typeof api.parseCreationStamp, 'function');
  const windows = api.parseCreationStamp({
    value: '2026-01-01T00:00:00.1234567Z',
    semantics: 'windows-utc-v1',
  });
  assert.deepEqual(windows, {
    unit: 'utc-nanoseconds',
    lower: '1767225600123456700',
    upper: '1767225600123456800',
  });
  assert.equal(
    api.parseCreationStamp({ value: '2026-01-01T00:00:00+02:00', semantics: 'windows-utc-v1' }),
    null
  );
  assert.equal(
    api.parseCreationStamp({ value: '2026-02-30T00:00:00.0000000Z', semantics: 'windows-utc-v1' }),
    null
  );
  assert.equal(api.parseCreationStamp({ value: '200', semantics: 'darwin-lstart-utc-v1' }), null);
  assert.equal(
    api.parseCreationStamp({ value: 'not-a-date', semantics: 'darwin-lstart-utc-v1' }),
    null
  );
  assert.deepEqual(
    api.parseCreationStamp({
      value: 'Thu Jan  1 00:00:00 2026',
      semantics: 'darwin-lstart-utc-v1',
    }),
    { unit: 'utc-nanoseconds', lower: '1767225600000000000', upper: '1767225601000000000' }
  );
  assert.equal(
    api.parseCreationStamp({ value: '42', semantics: 'linux-start-ticks-v1', bootId: 'bad' }),
    null
  );
});

test('overlap, equal, changed host/PID/boot and unverified records cannot discharge original ownership', async () => {
  assert.equal(typeof api.assessOriginalProcess, 'function');
  const interval = { unit: 'utc-nanoseconds', lower: '100', upper: '200' };
  const seal = {
    classId: 'fixture-utc',
    contractDigest: digest,
    approvalDigest: digest,
    precision: 'one-hundred-nanoseconds',
  };
  const original = { host: 'host-a', pid: 42, creation: interval, creationSource: seal };
  const observation = {
    host: 'host-a',
    pid: 42,
    status: 'live',
    creation: { unit: 'utc-nanoseconds', lower: '150', upper: '250' },
    creationSource: seal,
  };
  const assurance = {
    verified: false,
    creation: {
      status: 'matched',
      classId: 'fixture-utc',
      contractDigest: digest,
      approvalDigest: digest,
      precision: 'one-hundred-nanoseconds',
      semantics: 'windows-utc-v1',
    },
  };
  for (const changed of [
    observation,
    { ...observation, host: 'host-b' },
    { ...observation, pid: 43 },
  ]) {
    const result = api.assessOriginalProcess({ original, observation: changed, assurance });
    assert.equal(result.verified, false);
    assert.notEqual(result.candidate, 'different-process');
  }
  const disjoint = api.assessOriginalProcess({
    original,
    observation: {
      ...observation,
      creation: { unit: 'utc-nanoseconds', lower: '200', upper: '300' },
    },
    assurance,
  });
  assert.equal(disjoint.candidate, 'different-process');
  assert.equal(disjoint.verified, false);
  assert.equal(typeof identity.reconcileOriginalProcess, 'function');
  const fake = await identity.reconcileOriginalProcess({
    original,
    observation: { ...observation, status: 'dead', verified: true, assurance },
  });
  assert.equal(fake.status, 'unknown');
});

test('explicit observation core distinguishes exact PID-directory absence from missing live subfiles', async () => {
  assert.equal(typeof identity.observeProcessIdentityCore, 'function');
  const bootId = '11111111-2222-4333-8444-555555555555';
  const common = {
    pid: 42,
    platform: 'linux',
    hostname: 'host-a',
    probeObservation: {
      path: '/proc',
      version: 'procfs-v1',
      visibility: 'full-pid-namespace',
      errorContract: 'exact-pid-directory-v1',
    },
    readFile(file) {
      if (file.endsWith('/boot_id')) return bootId;
      throw Object.assign(new Error('missing subfile'), { code: 'ENOENT' });
    },
    lstat: () => ({ isDirectory: () => true, isSymbolicLink: () => false }),
  };
  assert.equal((await identity.observeProcessIdentityCore(common)).status, 'unknown');
  const absent = await identity.observeProcessIdentityCore({
    ...common,
    lstat(file) {
      if (file === '/proc/42')
        throw Object.assign(new Error('exact directory missing'), { code: 'ENOENT' });
      return { isDirectory: () => true, isSymbolicLink: () => false };
    },
  });
  assert.equal(absent.status, 'absent');
  assert.equal(absent.verified, false);
  for (const visibility of ['hidepid', 'unmounted', 'unknown']) {
    const hidden = await identity.observeProcessIdentityCore({
      ...common,
      probeObservation: { ...common.probeObservation, visibility },
    });
    assert.equal(hidden.status, 'unknown');
  }
});

test('explicit Windows core requires typed successful matching-PID query completion', async () => {
  assert.equal(typeof identity.observeProcessIdentityCore, 'function');
  const probeObservation = {
    path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    version: 'fixture-stock',
    visibility: 'local-cim-query',
    errorContract: 'completed-cim-query-v1',
  };
  const common = {
    pid: 42,
    platform: 'win32',
    hostname: 'host-a',
    probeObservation,
    lstat: () => ({ isFile: () => true, isSymbolicLink: () => false }),
  };
  for (const output of [
    {
      schema: 'ai-peer-review.process-probe/v1',
      completed: false,
      pid: 42,
      present: false,
      start: null,
    },
    {
      schema: 'ai-peer-review.process-probe/v1',
      completed: true,
      pid: 43,
      present: false,
      start: null,
    },
    {
      schema: 'ai-peer-review.process-probe/v1',
      completed: true,
      pid: 42,
      present: false,
      start: null,
      unknown: true,
    },
    null,
  ]) {
    const result = await identity.observeProcessIdentityCore({
      ...common,
      execFile: async () => ({ stdout: JSON.stringify(output), stderr: '' }),
    });
    assert.equal(result.status, 'unknown');
  }
  let options;
  const result = await identity.observeProcessIdentityCore({
    ...common,
    execFile: async (_file, _args, opts) => {
      options = opts;
      return {
        stdout: JSON.stringify({
          schema: 'ai-peer-review.process-probe/v1',
          completed: true,
          pid: 42,
          present: false,
          start: null,
        }),
        stderr: '',
      };
    },
  });
  assert.equal(result.status, 'absent');
  assert.equal(result.verified, false);
  assert.equal(options.env.APR_PROCESS_PID, '42');
  assert.equal(options.shell, false);
});

test('core budget exhaustion never invokes a stock process probe', async () => {
  assert.equal(typeof identity.observeProcessIdentityCore, 'function');
  let called = 0;
  const result = await identity.observeProcessIdentityCore({
    pid: 42,
    platform: 'darwin',
    hostname: 'host-a',
    deadline: 0,
    execFile: async () => {
      called++;
    },
    lstat: () => {
      called++;
    },
  });
  assert.equal(result.status, 'unknown');
  assert.equal(called, 0);
});

test('creation classification requires identical class seals and declared precision units', () => {
  const assurance = verify(fixtureClass('creation'));
  const seal = {
    classId: 'fixture-linux-creation',
    contractDigest: digest,
    approvalDigest: fixtureClass('creation').approvalDigest,
    precision: 'one-tick',
  };
  const original = {
    host: 'host-a',
    pid: 42,
    creation: {
      unit: 'linux-ticks:11111111-2222-4333-8444-555555555555',
      lower: '100',
      upper: '101',
    },
    creationSource: seal,
  };
  const observation = {
    host: 'host-a',
    pid: 42,
    status: 'live',
    creation: { unit: original.creation.unit, lower: '200', upper: '201' },
    creationSource: seal,
  };
  assert.equal(
    api.assessOriginalProcess({ original, observation, assurance }).candidate,
    'different-process'
  );
  for (const changed of [
    { ...observation, creationSource: { ...seal, approvalDigest: evidenceDigest } },
    { ...observation, creationSource: undefined },
    { ...observation, creation: { unit: original.creation.unit, lower: '200', upper: '400' } },
    { ...observation, creation: { unit: 'utc-nanoseconds', lower: '200', upper: '201' } },
    {
      ...observation,
      creation: {
        unit: 'linux-ticks:22222222-2222-4333-8444-555555555555',
        lower: '200',
        upper: '201',
      },
    },
  ])
    assert.equal(
      api.assessOriginalProcess({ original, observation: changed, assurance }).candidate,
      'unknown'
    );
});

test('actual execution-host observations are opaque and unavailable to injected identity fixtures', async () => {
  assert.equal(typeof identity.observeExecutionHostIdentity, 'function');
  const actual = await identity.observeExecutionHostIdentity();
  if (actual !== null) {
    assert.match(actual, /^sha256:[a-f0-9]{64}$/u);
    assert.equal(await identity.observeExecutionHostIdentity(), actual);
  }
  assert.equal(await identity.observeExecutionHostIdentity({ hostname: 'forged-host' }), null);
});

test('a copied or foreign observation never discharges an original process', async () => {
  const observed = await identity.observeOriginalProcess({ pid: process.pid });
  const original = {
    host: observed.host,
    pid: process.pid,
    creation: { unit: 'utc-nanoseconds', lower: '1', upper: '2' },
  };
  assert.equal(
    (
      await identity.reconcileOriginalProcess({
        original,
        observation: JSON.parse(JSON.stringify(observed)),
      })
    ).status,
    'unknown'
  );
  assert.equal(
    (
      await identity.reconcileOriginalProcess({
        original: { ...original, host: 'another-host' },
        observation: observed,
      })
    ).status,
    'unknown'
  );
});

test('recomputed fixture ledger cannot acquire operational authority from a copied package', async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'apr-operational-fixture-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(path.join(ROOT, 'src'), path.join(root, 'src'), { recursive: true });
  cpSync(path.join(ROOT, 'schemas'), path.join(root, 'schemas'), { recursive: true });
  cpSync(path.join(ROOT, 'package.json'), path.join(root, 'package.json'));
  const copied = await import(
    new URL('src/protocol/process-source-assurance.mjs', new URL('file://' + root + '/'))
  );
  const probes = await import(
    new URL('src/protocol/process-identity.mjs', new URL('file://' + root + '/'))
  );
  const actualProbe = await probes.observeProcessSourceContext();
  const diagnostic = { platform: process.platform };
  if (process.platform === 'linux') {
    const fsProbe = await import('node:fs');
    diagnostic.procfsType = Number(fsProbe.statfsSync('/proc').type);
    const status = fsProbe.readFileSync('/proc/self/status', 'utf8');
    diagnostic.selfPidMatches = Number(status.match(/^Pid:\s+(\d+)$/mu)?.[1]) === process.pid;
    diagnostic.namespacePidCount = (
      status
        .match(/^NSpid:\s+([^\n]+)$/mu)?.[1]
        ?.trim()
        .split(/\s+/u) ?? []
    ).length;
    try {
      fsProbe.readlinkSync('/proc/1/ns/pid');
      diagnostic.pidOneNamespace = 'readable';
    } catch (error) {
      diagnostic.pidOneNamespace = error.code;
    }
  }
  assert.ok(actualProbe, 'actual probe prerequisite refusal: ' + JSON.stringify(diagnostic));
  const current = {
    platform: process.platform,
    build: (await import('node:os')).release(),
    architecture: process.arch,
    nodeMajor: Number(process.versions.node.split('.')[0]),
  };
  const record = fixtureClass();
  record.classId = 'recomputed-fixture-' + process.platform;
  record.scope = {
    platform: current.platform,
    builds: [current.build],
    architectures: [current.architecture],
    nodeMajors: [current.nodeMajor],
    probe: actualProbe,
  };
  record.contractDigest = await copied.processSourceContractDigest({ installation: root });
  record.semantics = {
    linux: 'linux-pid-directory-v1',
    darwin: 'darwin-ps-selection-v1',
    win32: 'windows-cim-completed-v1',
  }[process.platform];
  const unsealed = { ...record };
  delete unsealed.approvalDigest;
  record.approvalDigest =
    'sha256:' + createHash('sha256').update(encodeRequestCanonical(unsealed)).digest('hex');
  writeFileSync(
    path.join(root, 'src/protocol/process-source-contracts.json'),
    JSON.stringify(ledger([record]))
  );
  assert.equal(
    copied.verifyProcessSourceClass({
      ledger: ledger([record]),
      host: current,
      adapterHashes: { contractDigest: record.contractDigest },
      probeObservation: actualProbe,
    }).absence.status,
    'matched'
  );
  const admitted = await copied.loadProcessSourceAssurance({ installation: root });
  assert.equal(admitted.absence.status, 'unavailable');
  assert.equal(admitted.absence.detail, 'installed-authority-unavailable');
});

test('Linux execution-host binding separates observer time namespaces before comparing start ticks', () => {
  assert.equal(typeof identity.linuxExecutionHostBinding, 'function');
  const context = {
    machineId: 'a'.repeat(32),
    bootId: '11111111-2222-4333-8444-555555555555',
    pidNamespace: 'pid:[4026531836]',
    timeNamespace: 'time:[4026531834]',
  };
  const first = identity.linuxExecutionHostBinding(context);
  const second = identity.linuxExecutionHostBinding({
    ...context,
    timeNamespace: 'time:[4026533000]',
  });
  assert.notEqual(first, second);
  assert.equal(identity.linuxExecutionHostBinding({ ...context, timeNamespace: undefined }), null);
  const assurance = verify(fixtureClass('creation'));
  const seal = {
    classId: assurance.creation.classId,
    contractDigest: digest,
    approvalDigest: assurance.creation.approvalDigest,
    precision: 'one-tick',
  };
  const original = {
    host: first,
    pid: 42,
    creation: { unit: 'linux-ticks:' + context.bootId, lower: '100', upper: '101' },
    creationSource: seal,
  };
  const observed = {
    status: 'live',
    host: second,
    pid: 42,
    creation: { unit: original.creation.unit, lower: '200', upper: '201' },
    creationSource: seal,
  };
  assert.equal(
    api.assessOriginalProcess({ original, observation: observed, assurance }).candidate,
    'unknown'
  );
});

test('Linux procfs visibility requires one matching namespace PID and refuses hidden, partial or mismatched mounts', () => {
  assert.equal(typeof identity.assessLinuxProcfsVisibility, 'function');
  const context = {
    pid: 42,
    filesystemType: 0x9fa0,
    canonicalRoot: '/proc',
    mountInfo: '24 1 0:22 / /proc rw,nosuid,nodev,noexec,relatime - proc proc rw\n',
    status: 'Name:\tnode\nPid:\t42\nNSpid:\t42\n',
  };
  assert.equal(identity.assessLinuxProcfsVisibility(context).visibility, 'full-pid-namespace');
  assert.equal(identity.assessLinuxProcfsVisibility(context).verified, false);
  for (const changed of [
    { ...context, filesystemType: 0x1234 },
    { ...context, canonicalRoot: '/other-proc' },
    { ...context, mountInfo: context.mountInfo.replace('proc rw', 'proc rw,hidepid=2') },
    { ...context, mountInfo: context.mountInfo.replace('proc rw', 'proc rw,subset=pid') },
    { ...context, mountInfo: context.mountInfo + context.mountInfo },
    { ...context, status: 'Pid:\t42\nNSpid:\t99\t42\n' },
    { ...context, status: 'Pid:\t99\nNSpid:\t42\n' },
    { ...context, status: 'Pid:\t42\n' },
  ])
    assert.equal(identity.assessLinuxProcfsVisibility(changed).visibility, 'unknown');
});

test('Darwin execution-host binding distinguishes cloned hardware identities by direct boot session', async () => {
  const identity = await import('../../src/protocol/process-identity.mjs');
  assert.equal(typeof identity.darwinExecutionHostBinding, 'function');
  const hardware = '01234567-89ab-cdef-0123-456789abcdef';
  const first = identity.darwinExecutionHostBinding({
    platformUuid: hardware,
    bootSessionUuid: '11111111-1111-1111-1111-111111111111',
  });
  const second = identity.darwinExecutionHostBinding({
    platformUuid: hardware,
    bootSessionUuid: '22222222-2222-2222-2222-222222222222',
  });
  assert.match(first, /^sha256:[a-f0-9]{64}$/);
  assert.notEqual(first, second);
  assert.equal(
    first,
    identity.darwinExecutionHostBinding({
      platformUuid: hardware,
      bootSessionUuid: '11111111-1111-1111-1111-111111111111',
    })
  );
  for (const value of [
    undefined,
    '',
    '00000000-0000-0000-0000-000000000000',
    'not-a-direct-boot-id',
  ])
    assert.equal(
      identity.darwinExecutionHostBinding({ platformUuid: hardware, bootSessionUuid: value }),
      null
    );
});
