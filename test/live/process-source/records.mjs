// @story #170
// Signed data validation only. This module never mints an installed source capability.
import { createHash, createPublicKey, verify } from 'node:crypto';
import { assertScalarString } from '../../../src/api/canonical-json.mjs';

const HASH = /^sha256:[a-f0-9]{64}$/u;
const BOOT = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u;
const ID = /^[a-z0-9][a-z0-9-]{0,95}$/u;
const TRANSITIONS = ['clock-forward', 'clock-backward', 'timezone', 'dst'];
const fail = (code) => {
  throw new TypeError(code);
};
const exact = (v, keys) =>
  v !== null &&
  typeof v === 'object' &&
  Object.getPrototypeOf(v) === Object.prototype &&
  Reflect.ownKeys(v).length === keys.length &&
  keys.every((k) => {
    const d = Object.getOwnPropertyDescriptor(v, k);
    return d?.enumerable && Object.hasOwn(d, 'value');
  });
const text = (v, limit = 256) =>
  typeof v === 'string' && v.length > 0 && v.length <= limit && v.isWellFormed();
const same = (a, b) => canonicalProcessSourceBytes(a).equals(canonicalProcessSourceBytes(b));

// Capture data includes exit0 and signed clock offsets; API-request JSON permits only
// positive numbers. Keep that public API contract unchanged.
export function canonicalProcessSourceBytes(value) {
  const seen = new Set();
  const encode = (v, depth = 0) => {
    if (depth > 32) fail('record-depth');
    if (v === null || typeof v === 'boolean') return JSON.stringify(v);
    if (typeof v === 'string') {
      assertScalarString(v);
      return JSON.stringify(v);
    }
    if (typeof v === 'number') {
      if (!Number.isSafeInteger(v) || Object.is(v, -0)) fail('record-number');
      return String(v);
    }
    const array = Array.isArray(v);
    if (
      !v ||
      Object.getPrototypeOf(v) !== (array ? Array.prototype : Object.prototype) ||
      seen.has(v)
    )
      fail('record-value');
    const keys = Reflect.ownKeys(v);
    if (array && (keys.length !== v.length + 1 || !keys.includes('length'))) fail('record-array');
    const selected = array ? Array.from({ length: v.length }, (_, i) => String(i)) : keys.sort();
    for (const k of selected) {
      if (typeof k !== 'string') fail('record-key');
      assertScalarString(k);
      const d = Object.getOwnPropertyDescriptor(v, k);
      if (!d?.enumerable || !Object.hasOwn(d, 'value')) fail('record-accessor');
    }
    seen.add(v);
    const parts = selected.map(
      (k) => (array ? '' : JSON.stringify(k) + ':') + encode(v[k], depth + 1)
    );
    seen.delete(v);
    return (array ? '[' : '{') + parts.join(',') + (array ? ']' : '}');
  };
  const bytes = Buffer.from(encode(value));
  if (bytes.length > 1024 * 1024) fail('record-size');
  return bytes;
}
export function processSourceRecordDigest(value) {
  return 'sha256:' + createHash('sha256').update(canonicalProcessSourceBytes(value)).digest('hex');
}
export function validateProcessSourcePackage(receipt) {
  if (
    !exact(receipt, [
      'schema',
      'sourceCommit',
      'tarballDigest',
      'inventoryDigest',
      'contractDigest',
    ]) ||
    receipt.schema !== 'ai-peer-review.process-source-package/v1' ||
    !/^[a-f0-9]{40}$/u.test(receipt.sourceCommit) ||
    ['tarballDigest', 'inventoryDigest', 'contractDigest'].some((k) => !HASH.test(receipt[k]))
  )
    fail('package-invalid');
  return receipt;
}
function validateScope(scope) {
  const expected = {
    linux: ['/proc', 'full-pid-namespace', 'exact-pid-directory-v1'],
    darwin: ['/bin/ps', 'same-user-full-selection', 'exact-ps-selection-v1'],
    win32: [
      'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      'local-cim-query',
      'completed-cim-query-v1',
    ],
  };
  if (
    !exact(scope, ['platform', 'build', 'architecture', 'nodeMajor', 'probe']) ||
    !Object.hasOwn(expected, scope.platform) ||
    !text(scope.build, 128) ||
    !['x64', 'arm64'].includes(scope.architecture) ||
    !Number.isSafeInteger(scope.nodeMajor) ||
    scope.nodeMajor < 24 ||
    scope.nodeMajor > 128 ||
    !exact(scope.probe, ['path', 'version', 'visibility', 'errorContract'])
  )
    fail('scope-invalid');
  const [probePath, visibility, errorContract] = expected[scope.platform];
  const p = scope.probe;
  if (
    p.path !== probePath ||
    p.visibility !== visibility ||
    p.errorContract !== errorContract ||
    (scope.platform === 'linux' ? p.version !== 'procfs-v1' : !HASH.test(p.version))
  )
    fail('scope-probe-invalid');
}
export function validateProcessSourceRegistration(registration) {
  const r = registration;
  if (
    !exact(r, [
      'schema',
      'captureId',
      'hostId',
      'publicKey',
      'keyId',
      'package',
      'scope',
      'kinds',
      'transitions',
    ]) ||
    r.schema !== 'ai-peer-review.process-source-registration/v1' ||
    !ID.test(r.captureId) ||
    !HASH.test(r.hostId) ||
    !text(r.publicKey, 128) ||
    !HASH.test(r.keyId) ||
    !Array.isArray(r.kinds) ||
    r.kinds.length < 1 ||
    r.kinds.length > 2 ||
    r.kinds.some((k) => !['absence', 'creation'].includes(k)) ||
    new Set(r.kinds).size !== r.kinds.length ||
    !Array.isArray(r.transitions) ||
    (r.kinds.includes('creation')
      ? r.transitions.length !== 4 ||
        TRANSITIONS.some((k) => !r.transitions.includes(k)) ||
        new Set(r.transitions).size !== 4
      : r.transitions.length !== 0)
  )
    fail('registration-invalid');
  try {
    validateProcessSourcePackage(r.package);
    validateScope(r.scope);
    const bytes = Buffer.from(r.publicKey, 'base64');
    if (bytes.toString('base64') !== r.publicKey) fail('registration-key-invalid');
    const key = createPublicKey({ key: bytes, type: 'spki', format: 'der' });
    if (
      key.asymmetricKeyType !== 'ed25519' ||
      !key.export({ type: 'spki', format: 'der' }).equals(bytes) ||
      'sha256:' + createHash('sha256').update(bytes).digest('hex') !== r.keyId
    )
      fail('registration-key-invalid');
    canonicalProcessSourceBytes(r);
    return r;
  } catch {
    fail('registration-invalid');
  }
}
function validateAbsenceControls(c, receipt) {
  if (
    !exact(c, ['producer', 'live', 'exit', 'absence', 'error', 'cleanup']) ||
    !exact(c.producer, ['kind', 'contractDigest', 'inventoryDigest']) ||
    c.producer.kind !== 'installed-source' ||
    c.producer.contractDigest !== receipt.package.contractDigest ||
    c.producer.inventoryDigest !== receipt.package.inventoryDigest ||
    !exact(c.live, ['pid', 'nonce', 'creation']) ||
    !Number.isSafeInteger(c.live.pid) ||
    c.live.pid <= 0 ||
    !/^[a-f0-9]{64}$/u.test(c.live.nonce) ||
    !exact(c.live.creation, ['unit', 'lower', 'upper']) ||
    !text(c.live.creation.unit, 128) ||
    !/^(?:0|[1-9][0-9]{0,29})$/u.test(c.live.creation.lower) ||
    !/^(?:0|[1-9][0-9]{0,29})$/u.test(c.live.creation.upper) ||
    BigInt(c.live.creation.upper) <= BigInt(c.live.creation.lower) ||
    !exact(c.exit, ['pid', 'exitCode', 'signal']) ||
    c.exit.pid !== c.live.pid ||
    c.exit.exitCode !== 0 ||
    c.exit.signal !== null ||
    !exact(c.absence, ['pid', 'status']) ||
    c.absence.pid !== c.live.pid ||
    c.absence.status !== 'absent' ||
    !exact(c.error, ['status', 'reason']) ||
    c.error.status !== 'unknown' ||
    !['probe-query-error', 'probe-access-error', 'probe-aborted'].includes(c.error.reason)
  )
    fail('controls-invalid');
  if (
    !exact(c.cleanup, ['childExited', 'restoration']) ||
    c.cleanup.childExited !== true ||
    c.cleanup.restoration !== (receipt.kind === 'absence' ? 'not-required' : 'verified')
  )
    fail('cleanup-unproved');
  const width = BigInt(c.live.creation.upper) - BigInt(c.live.creation.lower);
  if (receipt.scope.platform === 'linux') {
    if (
      !BOOT.test(receipt.boot?.before) ||
      receipt.boot.before !== receipt.boot.after ||
      c.live.creation.unit !== 'linux-ticks:' + receipt.boot.before ||
      width !== 1n
    )
      fail('boot-controls-invalid');
  } else if (
    receipt.boot.before !== null ||
    receipt.boot.after !== null ||
    c.live.creation.unit !== 'utc-nanoseconds' ||
    width !== (receipt.scope.platform === 'darwin' ? 1000000000n : 100n)
  )
    fail('controls-creation-invalid');
}
function validateCreationControls(receipt, registration) {
  if (receipt.transitions.length !== 4) fail('creation-transition-missing');
  let previous = -1n;
  const original = receipt.controls.live;
  const asInteger = (value) => {
    if (typeof value !== 'string' || !/^-?(?:0|[1-9][0-9]{0,29})$/u.test(value))
      fail('creation-sample-invalid');
    return BigInt(value);
  };
  const phase = (samples) => {
    if (!Array.isArray(samples) || samples.length < 5 || samples.length > 256)
      fail('creation-window-inadequate');
    const points = [];
    for (const sample of samples) {
      if (
        !exact(sample, ['monotonicNs', 'utcNs', 'zone', 'dst', 'pid', 'nonce', 'creation']) ||
        sample.pid !== original.pid ||
        sample.nonce !== original.nonce ||
        !text(sample.zone, 128) ||
        typeof sample.dst !== 'boolean' ||
        !same(sample.creation, original.creation)
      )
        fail('creation-source-changed');
      const mono = asInteger(sample.monotonicNs);
      const utc = asInteger(sample.utcNs);
      if (mono <= previous || mono < 0n) fail('creation-monotonic-invalid');
      previous = mono;
      points.push({ mono, offset: utc - mono, zone: sample.zone, dst: sample.dst });
    }
    if (points.at(-1).mono - points[0].mono < 5000000000n) fail('creation-window-inadequate');
    const offsets = points.map((p) => p.offset);
    const low = offsets.reduce((a, b) => (a < b ? a : b));
    const high = offsets.reduce((a, b) => (a > b ? a : b));
    if (
      high - low > 500000000n ||
      points.some((p) => p.zone !== points[0].zone || p.dst !== points[0].dst)
    )
      fail('creation-window-unstable');
    return points[0];
  };
  for (let i = 0; i < 4; i += 1) {
    const transition = receipt.transitions[i];
    if (
      !exact(transition, ['kind', 'before', 'during', 'after']) ||
      transition.kind !== registration.transitions[i]
    )
      fail('creation-transition-invalid');
    const before = phase(transition.before);
    const during = phase(transition.during);
    const after = phase(transition.after);
    const difference = during.offset - before.offset;
    if (
      (transition.kind === 'clock-forward' && difference < 60000000000n) ||
      (transition.kind === 'clock-backward' && difference > -60000000000n) ||
      (transition.kind === 'timezone' &&
        (during.zone === before.zone || during.dst !== before.dst)) ||
      (transition.kind === 'dst' && (during.zone !== before.zone || during.dst === before.dst))
    )
      fail('creation-transition-unobserved');
    const restored = after.offset - before.offset;
    if (
      restored < -500000000n ||
      restored > 500000000n ||
      after.zone !== before.zone ||
      after.dst !== before.dst
    )
      fail('restoration-unproved');
  }
}

export function verifyProcessSourceReceiptCore({
  receipt,
  registration,
  packageReceipt,
  registrationRevision,
  registrationIndexDigest,
} = {}) {
  validateProcessSourceRegistration(registration);
  validateProcessSourcePackage(packageReceipt);
  if (!same(registration.package, packageReceipt)) fail('package-mismatch');
  if (
    !exact(receipt, [
      'schema',
      'captureId',
      'hostId',
      'registrationDigest',
      'registrationRevision',
      'registrationIndexDigest',
      'package',
      'scope',
      'kind',
      'controls',
      'transitions',
      'boot',
      'signature',
    ]) ||
    receipt.schema !== 'ai-peer-review.process-source-conformance/v1'
  )
    fail('receipt-invalid');
  if (
    receipt.captureId !== registration.captureId ||
    receipt.registrationDigest !== processSourceRecordDigest(registration) ||
    !registration.kinds.includes(receipt.kind)
  )
    fail('registration-mismatch');
  if (
    !/^[a-f0-9]{40}$/u.test(registrationRevision ?? '') ||
    !HASH.test(registrationIndexDigest ?? '') ||
    receipt.registrationRevision !== registrationRevision ||
    receipt.registrationIndexDigest !== registrationIndexDigest
  )
    fail('registration-context-mismatch');
  if (receipt.hostId !== registration.hostId) fail('host-mismatch');
  if (!same(receipt.package, packageReceipt)) fail('package-mismatch');
  if (!same(receipt.scope, registration.scope)) fail('scope-mismatch');
  const s = receipt.signature;
  if (
    !exact(s, ['algorithm', 'keyId', 'value']) ||
    s.algorithm !== 'Ed25519' ||
    s.keyId !== registration.keyId ||
    !/^[a-f0-9]{128}$/u.test(s.value)
  )
    fail('signature-invalid');
  const unsigned = { ...receipt };
  delete unsigned.signature;
  const key = createPublicKey({
    key: Buffer.from(registration.publicKey, 'base64'),
    type: 'spki',
    format: 'der',
  });
  if (!verify(null, canonicalProcessSourceBytes(unsigned), key, Buffer.from(s.value, 'hex')))
    fail('signature-invalid');
  if (!exact(receipt.boot, ['before', 'after']) || !Array.isArray(receipt.transitions))
    fail('controls-invalid');
  validateAbsenceControls(receipt.controls, receipt);
  if (receipt.kind === 'absence') {
    if (receipt.transitions.length) fail('controls-unregistered-transitions');
  } else validateCreationControls(receipt, registration);
  return Object.freeze({
    verified: false,
    evidenceValid: true,
    captureId: receipt.captureId,
    kind: receipt.kind,
    registrationDigest: receipt.registrationDigest,
    receiptDigest: processSourceRecordDigest(receipt),
  });
}

export function verifyProcessSourceIndexCore({ index, registrations } = {}) {
  if (
    !exact(index, ['schema', 'captures']) ||
    index.schema !== 'ai-peer-review.process-source-registration-index/v1' ||
    !Array.isArray(index.captures) ||
    index.captures.length > 512 ||
    !(registrations instanceof Map) ||
    registrations.size !== index.captures.length
  )
    fail('registration-index-invalid');
  const ids = new Set();
  let prior = '';
  for (const entry of index.captures) {
    if (
      !exact(entry, ['captureId', 'path', 'digest']) ||
      !ID.test(entry.captureId) ||
      entry.captureId <= prior ||
      ids.has(entry.captureId) ||
      !HASH.test(entry.digest) ||
      entry.path !==
        'evidence/portable-runtime/process-source/registrations/' + entry.captureId + '.json'
    )
      fail('registration-index-entry-invalid');
    prior = entry.captureId;
    ids.add(entry.captureId);
    const registration = registrations.get(entry.path);
    try {
      validateProcessSourceRegistration(registration);
    } catch {
      fail('registration-index-record-invalid');
    }
    if (
      registration.captureId !== entry.captureId ||
      processSourceRecordDigest(registration) !== entry.digest
    )
      fail('registration-index-record-mismatch');
  }
  return Object.freeze({
    verified: false,
    indexValid: true,
    contentDigest: processSourceRecordDigest(index),
    captureIds: Object.freeze([...ids]),
  });
}

export function verifyCiCaptureControlsCore({ receipt, hostControl, provenance } = {}) {
  const p = provenance,
    c = hostControl;
  if (
    !exact(p, [
      'schema',
      'verified',
      'repository',
      'runId',
      'runAttempt',
      'sourceCommit',
      'workflowPath',
      'event',
      'status',
      'conclusion',
      'jobs',
    ]) ||
    p.schema !== 'ai-peer-review.process-source-ci-provenance/v1' ||
    p.verified !== false ||
    p.repository !== 'kburson/ai-peer-review' ||
    !/^[0-9]+$/u.test(p.runId) ||
    !/^[0-9]+$/u.test(p.runAttempt) ||
    !/^[a-f0-9]{40}$/u.test(p.sourceCommit) ||
    p.sourceCommit !== receipt?.package?.sourceCommit ||
    p.workflowPath !== '.github/workflows/process-source-capture.yml' ||
    !['push', 'workflow_dispatch'].includes(p.event) ||
    p.status !== 'completed' ||
    p.conclusion !== 'success' ||
    !Array.isArray(p.jobs) ||
    !p.jobs.length ||
    p.jobs.length > 16 ||
    new Set(p.jobs.map((j) => j.id)).size !== p.jobs.length
  )
    fail('ci-control-provenance-invalid');
  for (const job of p.jobs)
    if (
      !exact(job, ['id', 'runnerOS', 'nodeMajor', 'status', 'conclusion']) ||
      !/^[0-9]+$/u.test(job.id) ||
      !['Linux', 'Windows', 'macOS'].includes(job.runnerOS) ||
      !Number.isSafeInteger(job.nodeMajor) ||
      job.nodeMajor < 24 ||
      job.nodeMajor > 128 ||
      job.status !== 'completed' ||
      job.conclusion !== 'success'
    )
      fail('ci-control-provenance-invalid');
  const os = { linux: 'Linux', win32: 'Windows', darwin: 'macOS' }[receipt?.scope?.platform];
  if (
    p.jobs.filter((j) => j.runnerOS === os && j.nodeMajor === receipt?.scope?.nodeMajor).length !==
    1
  )
    fail('ci-control-worker-mismatch');
  if (
    !exact(c, [
      'schema',
      'verified',
      'runId',
      'runAttempt',
      'codeCommit',
      'captureProducerCommit',
      'captureId',
      'kind',
      'control',
    ]) ||
    c.schema !== 'ai-peer-review.process-source-ci-control/v1' ||
    c.verified !== false ||
    c.runId !== p.runId ||
    c.runAttempt !== p.runAttempt ||
    c.codeCommit !== p.sourceCommit ||
    !/^[a-f0-9]{40}$/u.test(c.captureProducerCommit) ||
    c.captureId !== receipt.captureId ||
    c.kind !== receipt.kind
  )
    fail('ci-control-mismatch');
  if (receipt.kind === 'absence') {
    if (
      !exact(c.control, ['verified', 'clockChanges', 'restoration']) ||
      c.control.verified !== false ||
      c.control.clockChanges !== 'none' ||
      c.control.restoration !== 'not-required'
    )
      fail('ci-control-restoration-unproved');
  } else {
    if (
      !exact(c.control, ['verified', 'prerequisites', 'restoration']) ||
      c.control.verified !== false ||
      c.control.prerequisites !== 'privilege-and-restoration-observed' ||
      !exact(c.control.restoration, [
        'verified',
        'restoration',
        'zone',
        'networkTime',
        'systemZone',
      ]) ||
      c.control.restoration.verified !== false ||
      c.control.restoration.restoration !== 'verified' ||
      !['yes', 'no'].includes(c.control.restoration.networkTime) ||
      !text(c.control.restoration.zone, 128) ||
      !text(c.control.restoration.systemZone, 128)
    )
      fail('ci-control-restoration-unproved');
  }
  return Object.freeze({ verified: false, controlsValid: true });
}
