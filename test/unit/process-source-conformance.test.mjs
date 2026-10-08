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
    hostId: H,
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
    hostId: H,
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
  assert.throws(
    () => verify({ ...f, receipt: f.seal({ ...f.unsigned, hostId: 'sha256:' + 'e'.repeat(64) }) }),
    /host/
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

// The real candidate path uses actual npm-packed bytes and installed source hashes.
// It catches a pack/bind implementation that substitutes the source tree, changes
// package bytes, leaks a key, or bypasses C1 protection.
test('pack and bind preserve exact actual runtime bytes and emit only a public key candidate', async (t) => {
  const { spawnSync } = await import('node:child_process');
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = fileURLToPath(new URL('../..', import.meta.url));
  const parent = path.join(root, '.scratch/peer-review');
  fs.mkdirSync(parent, { recursive: true });
  const scratch = fs.mkdtempSync(path.join(parent, 'source package '));
  t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
  const packagePath = path.join(scratch, 'portable-candidate.tgz');
  const bindingPath = path.join(scratch, 'process-source-binding.json');
  const call = (...args) =>
    spawnSync(process.execPath, ['test/live/process-source-conformance.mjs', ...args], {
      cwd: root,
      encoding: 'utf8',
      timeout: 120000,
      env: { ...process.env, APR_SKIP_NATIVE_BROKER_TESTS: '1' },
    });
  const packed = call('pack', '--output', packagePath);
  assert.equal(packed.status, 0, 'candidate pack must execute successfully: ' + packed.stderr);
  const packageReceipt = JSON.parse(fs.readFileSync(packagePath + '.receipt.json', 'utf8'));
  assert.equal(
    packageReceipt.tarballDigest,
    'sha256:' + createHash('sha256').update(fs.readFileSync(packagePath)).digest('hex')
  );
  assert.equal(
    packageReceipt.sourceCommit,
    spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim()
  );
  const bound = call('bind', '--package', packagePath, '--binding', bindingPath);
  assert.equal(
    bound.status,
    0,
    'actual candidate binding must execute successfully: ' + bound.stderr
  );
  const binding = JSON.parse(fs.readFileSync(bindingPath, 'utf8'));
  const candidateBytes = fs.readFileSync(bindingPath + '.registration.json', 'utf8');
  const candidate = JSON.parse(candidateBytes);
  assert.deepEqual(candidate.package, packageReceipt);
  assert.equal(candidate.scope.platform, process.platform);
  assert.equal(candidate.scope.architecture, process.arch);
  assert.equal(candidate.scope.nodeMajor, Number(process.versions.node.split('.')[0]));
  assert.equal(candidateBytes.includes('PRIVATE KEY'), false);
  assert.equal(bound.stdout.includes('PRIVATE KEY'), false);
  assert.equal(binding.verified, false);
  assert.equal(binding.runtimeAuthority, 'unavailable');
  const sourceIdentity = await import('../../src/protocol/process-identity.mjs');
  assert.equal(candidate.hostId, await sourceIdentity.observeExecutionHostIdentity());
  assert.equal(
    candidate.keyId,
    'sha256:' +
      createHash('sha256').update(Buffer.from(candidate.publicKey, 'base64')).digest('hex')
  );
  const protection = await import('../../src/broker/storage-protection.mjs');
  const context = { signal: new AbortController().signal, deadline: performance.now() + 30000 };
  const observed = await protection.observeStorageProtection({
    root: binding.privateRoot,
    ...context,
  });
  assert.equal(observed.verified, true);
  const guard = await protection.openProtectedRoot({ receipt: observed, ...context });
  try {
    const key = await guard.read(binding.privateKeyName);
    assert.equal(key.toString('utf8').includes('BEGIN PRIVATE KEY'), true);
  } finally {
    await guard.close();
  }
  const packageApi = await import('../live/process-source/package.mjs');
  assert.equal(typeof packageApi.inspectInstalledCandidateSource, 'function');
  assert.equal(
    packageApi.inspectInstalledCandidateSource({ packagePath, installation: binding.installation })
      .verified,
    false
  );
  const installedSource = path.join(binding.installation, 'src/startup/runtime-inventory.mjs');
  const retainedSource = fs.readFileSync(installedSource);
  try {
    fs.writeFileSync(installedSource, 'throw new Error("INSTALLED_CANDIDATE_EXECUTED");\n');
    assert.throws(
      () =>
        packageApi.inspectInstalledCandidateSource({
          packagePath,
          installation: binding.installation,
        }),
      /package-installed-source-mismatch/
    );
  } finally {
    fs.writeFileSync(installedSource, retainedSource);
  }

  // A caller can recompute an archive digest. Known Git source must be checked
  // before importing candidate code, not by that candidate after it has executed.
  const zlib = await import('node:zlib');
  const tar = zlib.gunzipSync(fs.readFileSync(packagePath));
  let cursor = 0,
    substituted = false,
    substitutedDigest;
  while (cursor + 512 <= tar.length) {
    const header = tar.subarray(cursor, cursor + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = header.subarray(0, 100).toString('utf8').split('\0')[0];
    const size = Number.parseInt(
      header.subarray(124, 136).toString('ascii').replaceAll('\0', '').trim(),
      8
    );
    const start = cursor + 512;
    if (name === 'package/src/startup/runtime-inventory.mjs') {
      const end = tar.indexOf(10, start + 50) + 1;
      const payload = Buffer.from('throw new Error("CANDIDATE_EXECUTED");\n');
      assert.ok(end - start >= payload.length);
      tar.fill(32, start, end);
      payload.copy(tar, start);
      substitutedDigest = createHash('sha256')
        .update(tar.subarray(start, start + size))
        .digest('hex');
      substituted = true;
      break;
    }
    cursor = start + Math.ceil(size / 512) * 512;
  }
  assert.equal(substituted, true);
  let forgedInventoryDigest;
  cursor = 0;
  while (cursor + 512 <= tar.length) {
    const header = tar.subarray(cursor, cursor + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = header.subarray(0, 100).toString('utf8').split('\0')[0];
    const size = Number.parseInt(
      header.subarray(124, 136).toString('ascii').replaceAll('\0', '').trim(),
      8
    );
    const start = cursor + 512;
    if (name === 'package/runtime-inventory.json') {
      const originalInventoryText = tar.subarray(start, start + size).toString('utf8');
      const forgedInventory = JSON.parse(originalInventoryText);
      const entry = forgedInventory.files.find(
        (file) => file.path === 'src/startup/runtime-inventory.mjs'
      );
      const old = entry.sha256;
      entry.sha256 = substitutedDigest;
      const replacement = originalInventoryText.replace(old, entry.sha256);
      assert.equal(Buffer.byteLength(replacement), size);
      Buffer.from(replacement).copy(tar, start);
      forgedInventoryDigest =
        'sha256:' + createHash('sha256').update(JSON.stringify(forgedInventory)).digest('hex');
      break;
    }
    cursor = start + Math.ceil(size / 512) * 512;
  }
  assert.match(forgedInventoryDigest, /^sha256:[a-f0-9]{64}$/);

  const forged = path.join(scratch, 'forged-candidate.tgz');
  const forgedBytes = zlib.gzipSync(tar);
  fs.writeFileSync(forged, forgedBytes);
  fs.writeFileSync(
    forged + '.receipt.json',
    JSON.stringify({
      ...packageReceipt,
      inventoryDigest: forgedInventoryDigest,
      tarballDigest: 'sha256:' + createHash('sha256').update(forgedBytes).digest('hex'),
    })
  );
  const forgedBinding = path.join(scratch, 'forged-binding.json');
  const foreign = call('bind', '--package', forged, '--binding', forgedBinding);
  assert.notEqual(foreign.status, 0);
  assert.match(foreign.stderr, /package-source-mismatch/);
  assert.equal(fs.existsSync(forgedBinding), false);

  // A modified archive must refuse before creating another binding/key.
  fs.appendFileSync(packagePath, 'substitute');
  const wrongBinding = path.join(scratch, 'wrong-binding.json');
  const rejected = call('bind', '--package', packagePath, '--binding', wrongBinding);
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /package-digest/);
  assert.equal(fs.existsSync(wrongBinding), false);
});

test('a scratch alias refuses before creating directories in its foreign target', async (t) => {
  const { spawnSync } = await import('node:child_process');
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = fileURLToPath(new URL('../..', import.meta.url));
  const parent = path.join(root, '.scratch/peer-review');
  fs.mkdirSync(parent, { recursive: true });
  const scratch = fs.mkdtempSync(path.join(parent, 'source-alias-'));
  t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
  const foreign = path.join(scratch, 'foreign');
  fs.mkdirSync(foreign);
  const alias = path.join(scratch, 'alias');
  fs.symlinkSync(foreign, alias, process.platform === 'win32' ? 'junction' : 'dir');
  const output = path.join(alias, 'new-directory', 'candidate.tgz');
  const result = spawnSync(
    process.execPath,
    ['test/live/process-source-conformance.mjs', 'pack', '--output', output],
    {
      cwd: root,
      encoding: 'utf8',
      timeout: 30000,
    }
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /capture-scratch-alias/);
  assert.equal(fs.existsSync(path.join(foreign, 'new-directory')), false);
});
