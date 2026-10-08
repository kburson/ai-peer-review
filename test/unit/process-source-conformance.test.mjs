// @story #170
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';

let records;
try {
  records = await import('../live/process-source/records.mjs');
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}
const H = 'sha256:' + 'a'.repeat(64);
const BOOT = '01234567-89ab-cdef-0123-456789abcdef';
// Independent canonical fixture writer; fixture signatures never confer runtime authority.
const canonical = (v) => {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (v && typeof v === 'object')
    return (
      '{' +
      Object.keys(v)
        .sort()
        .map((k) => JSON.stringify(k) + ':' + canonical(v[k]))
        .join(',') +
      '}'
    );
  return JSON.stringify(v);
};
const digest = (v) => 'sha256:' + createHash('sha256').update(canonical(v)).digest('hex');

function fixture() {
  const keys = generateKeyPairSync('ed25519');
  const publicBytes = keys.publicKey.export({ type: 'spki', format: 'der' });
  const packageReceipt = {
    schema: 'ai-peer-review.process-source-package/v1',
    sourceCommit: 'b'.repeat(40),
    tarballDigest: H,
    inventoryDigest: H,
    contractDigest: H,
  };
  const scope = {
    platform: 'linux',
    build: '6.8.0',
    architecture: 'x64',
    nodeMajor: 24,
    probe: {
      path: '/proc',
      version: 'procfs-v1',
      visibility: 'full-pid-namespace',
      errorContract: 'exact-pid-directory-v1',
    },
  };
  const registration = {
    schema: 'ai-peer-review.process-source-registration/v1',
    captureId: 'control-linux-24',
    publicKey: publicBytes.toString('base64'),
    keyId: 'sha256:' + createHash('sha256').update(publicBytes).digest('hex'),
    package: packageReceipt,
    scope,
    kinds: ['absence'],
    transitions: [],
  };
  const unsigned = {
    schema: 'ai-peer-review.process-source-conformance/v1',
    captureId: registration.captureId,
    registrationDigest: digest(registration),
    package: packageReceipt,
    scope,
    kind: 'absence',
    controls: {
      producer: { kind: 'installed-source', contractDigest: H, inventoryDigest: H },
      live: {
        pid: 111,
        nonce: 'c'.repeat(64),
        creation: { unit: 'linux-ticks:' + BOOT, lower: '100', upper: '101' },
      },
      exit: { pid: 111, exitCode: 0, signal: null },
      absence: { pid: 111, status: 'absent' },
      error: { status: 'unknown', reason: 'probe-query-error' },
      cleanup: { childExited: true, restoration: 'not-required' },
    },
    transitions: [],
    boot: { before: BOOT, after: BOOT },
  };
  const seal = (payload) => ({
    ...payload,
    signature: {
      algorithm: 'Ed25519',
      keyId: registration.keyId,
      value: sign(null, Buffer.from(canonical(payload)), keys.privateKey).toString('hex'),
    },
  });
  return { registration, packageReceipt, unsigned, receipt: seal(unsigned), seal };
}
function verify(input) {
  assert.equal(
    typeof records?.verifyProcessSourceReceiptCore,
    'function',
    'signed receipt verifier is required'
  );
  return records.verifyProcessSourceReceiptCore(input);
}
test('actual Ed25519 fixture signatures validate bound data without minting runtime authority', () => {
  const f = fixture();
  const result = verify(f);
  assert.equal(result.verified, false);
  assert.equal(result.evidenceValid, true);
  assert.equal(result.captureId, 'control-linux-24');
  assert.equal(result.kind, 'absence');
  assert.equal(result.receiptDigest, digest(f.receipt));
});
test('signature and exact registration/package/scope changes refuse even with plausible controls', () => {
  const f = fixture();
  assert.throws(
    () => verify({ ...f, receipt: { ...f.receipt, captureId: 'foreign-capture' } }),
    /registration/
  );
  assert.throws(
    () =>
      verify({
        ...f,
        receipt: { ...f.receipt, signature: { ...f.receipt.signature, value: '0'.repeat(128) } },
      }),
    /signature/
  );
  const wrongPackage = { ...f.packageReceipt, tarballDigest: 'sha256:' + 'd'.repeat(64) };
  assert.throws(() => verify({ ...f, packageReceipt: wrongPackage }), /package/);
  const wrongScope = { ...f.scope, platform: 'darwin' };
  assert.throws(
    () => verify({ ...f, receipt: f.seal({ ...f.unsigned, scope: wrongScope }) }),
    /scope/
  );
  const widened = { ...f.registration, kinds: ['absence', 'creation'] };
  assert.throws(() => verify({ ...f, registration: widened }), /registration/);
});
test('signed mocked, mismatched PID, failed exit/error/cleanup and changed boot controls refuse', () => {
  const f = fixture();
  for (const controls of [
    { ...f.unsigned.controls, producer: { ...f.unsigned.controls.producer, kind: 'fixture' } },
    { ...f.unsigned.controls, absence: { pid: 112, status: 'absent' } },
    { ...f.unsigned.controls, exit: { pid: 111, exitCode: null, signal: 'SIGKILL' } },
    { ...f.unsigned.controls, error: { status: 'absent', reason: 'probe-query-error' } },
    { ...f.unsigned.controls, cleanup: { childExited: false, restoration: 'not-required' } },
  ])
    assert.throws(
      () => verify({ ...f, receipt: f.seal({ ...f.unsigned, controls }) }),
      /controls|cleanup/
    );
  assert.throws(
    () =>
      verify({
        ...f,
        receipt: f.seal({
          ...f.unsigned,
          boot: { before: BOOT, after: 'fedcba98-7654-3210-fedc-ba9876543210' },
        }),
      }),
    /boot/
  );
});
test('unknown fields, non-Ed25519 keys and unregistered kinds cannot broaden signed scope', () => {
  const f = fixture();
  assert.throws(
    () => verify({ ...f, registration: { ...f.registration, accepted: true } }),
    /registration/
  );
  assert.throws(
    () => verify({ ...f, receipt: f.seal({ ...f.unsigned, kind: 'creation' }) }),
    /registration/
  );
  assert.throws(
    () => verify({ ...f, receipt: f.seal({ ...f.unsigned, accepted: true }) }),
    /receipt/
  );
  const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({
    type: 'spki',
    format: 'der',
  });
  const reg = {
    ...f.registration,
    publicKey: rsa.toString('base64'),
    keyId: 'sha256:' + createHash('sha256').update(rsa).digest('hex'),
  };
  assert.throws(() => verify({ ...f, registration: reg }), /registration/);
});
