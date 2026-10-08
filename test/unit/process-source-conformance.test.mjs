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
    registrationRevision: 'b'.repeat(40),
    registrationIndexDigest: H,
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
  return {
    registration,
    packageReceipt,
    unsigned,
    receipt: seal(unsigned),
    seal,
    registrationRevision: unsigned.registrationRevision,
    registrationIndexDigest: unsigned.registrationIndexDigest,
  };
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
  if (process.platform === 'win32') {
    assert.equal(
      binding.privateRoot.startsWith(root),
      false,
      'private signing keys must not use the CI checkout volume'
    );
    assert.ok(binding.privateRoot.startsWith(fs.realpathSync(process.env.LOCALAPPDATA) + path.sep));
    t.after(() => fs.rmSync(binding.privateRoot, { recursive: true, force: true }));
  }
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
  const refusedReceipt = path.join(scratch, 'unreviewed-capture.json');
  const callerApproval = path.join(scratch, 'caller-approval.json');
  fs.writeFileSync(callerApproval, '{"accepted":true}\n');
  const unreviewed = call(
    'capture-absence',
    '--binding',
    bindingPath,
    '--registration-index',
    'evidence/portable-runtime/process-source/registration-index.json',
    '--approved-ref',
    callerApproval,
    '--output',
    refusedReceipt
  );
  assert.notEqual(unreviewed.status, 0);
  assert.match(unreviewed.stderr, /registration-approved-ref/);
  assert.equal(fs.existsSync(refusedReceipt), false);
  const unreviewedVerify = call(
    'verify',
    '--receipt',
    refusedReceipt,
    '--registration-index',
    'evidence/portable-runtime/process-source/registration-index.json',
    '--approved-ref',
    callerApproval
  );
  assert.notEqual(unreviewedVerify.status, 0);
  assert.match(unreviewedVerify.stderr, /registration-approved-ref/);

  const absenceApi = await import('../live/process-source/absence.mjs').catch((error) => {
    if (error.code === 'ERR_MODULE_NOT_FOUND') return null;
    throw error;
  });
  assert.equal(typeof absenceApi?.captureAbsenceControlsCore, 'function');
  const controls = await absenceApi.captureAbsenceControlsCore({
    installation: binding.installation,
    packagePath,
    signal: new AbortController().signal,
    deadline: performance.now() + 30000,
  });
  assert.equal(controls.verified, false);
  assert.equal(controls.hostId, candidate.hostId);
  assert.deepEqual(controls.scope, candidate.scope);
  assert.ok(controls.controls.live.pid > 0);
  assert.match(controls.controls.live.nonce, /^[a-f0-9]{64}$/);
  assert.deepEqual(controls.controls.exit, {
    pid: controls.controls.live.pid,
    exitCode: 0,
    signal: null,
  });
  assert.deepEqual(controls.controls.absence, {
    pid: controls.controls.live.pid,
    status: 'absent',
  });
  assert.equal(controls.controls.error.status, 'unknown');
  assert.equal(controls.controls.cleanup.childExited, true);

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

test('registration index binds exactly one closed public record per capture without granting capture authority', () => {
  const f = fixture();
  const name = 'evidence/portable-runtime/process-source/registrations/control-linux-24.json';
  const index = {
    schema: 'ai-peer-review.process-source-registration-index/v1',
    captures: [{ captureId: 'control-linux-24', path: name, digest: digest(f.registration) }],
  };
  assert.equal(typeof records?.verifyProcessSourceIndexCore, 'function');
  const result = records.verifyProcessSourceIndexCore({
    index,
    registrations: new Map([[name, f.registration]]),
  });
  assert.equal(result.verified, false);
  assert.equal(result.indexValid, true);
  assert.deepEqual(result.captureIds, ['control-linux-24']);
  for (const bad of [
    { ...index, accepted: true },
    { ...index, captures: [index.captures[0], index.captures[0]] },
    { ...index, captures: [{ ...index.captures[0], digest: 'sha256:' + 'f'.repeat(64) }] },
    { ...index, captures: [{ ...index.captures[0], path: '../outside.json' }] },
    { ...index, captures: [{ ...index.captures[0], captureId: 'foreign-capture' }] },
  ])
    assert.throws(
      () =>
        records.verifyProcessSourceIndexCore({
          index: bad,
          registrations: new Map([[name, f.registration]]),
        }),
      /registration-index/
    );
  assert.throws(
    () =>
      records.verifyProcessSourceIndexCore({
        index,
        registrations: new Map(),
      }),
    /registration-index/
  );
});

test('capture registration refuses caller approval flags and incomplete immutable review selectors', async () => {
  let authority;
  try {
    authority = await import('../live/process-source/authority.mjs');
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  }
  assert.equal(typeof authority?.readApprovedProcessSourceIndex, 'function');
  const { spawnSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const root = fileURLToPath(new URL('../..', import.meta.url));
  const head = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).stdout.trim();
  const missing = {
    revision: head,
    path: 'evidence/portable-runtime/process-source/registration-reviews/missing.md',
    blob: 'b'.repeat(40),
    sha256: 'c'.repeat(64),
  };
  const fullMissing = {
    schema: 'ai-peer-review.process-source-approved-ref/v1',
    revision: head,
    indexDigest: H,
    producerVersion: '0.4.0',
    review: {
      reviewId: 'review-missing',
      subject: missing,
      manifest: { ...missing, path: 'docs/superpowers/peer-reviews/missing-manifest.md' },
      finalResponse: { ...missing, path: 'docs/superpowers/peer-reviews/missing-response.md' },
      finalization: { revision: head, sha256: 'd'.repeat(64) },
    },
  };
  for (const approvedRef of [
    fullMissing,
    { accepted: true },
    {
      schema: 'ai-peer-review.process-source-approved-ref/v1',
      revision: head,
      indexDigest: H,
      review: null,
    },
    {
      schema: 'ai-peer-review.process-source-approved-ref/v1',
      revision: head,
      indexDigest: H,
      producerVersion: '0.4.0',
      review: { accepted: true },
    },
    {
      schema: 'ai-peer-review.process-source-approved-ref/v1',
      revision: '--exec=anything',
      indexDigest: H,
      producerVersion: '0.4.0',
      review: {},
    },
  ])
    await assert.rejects(
      () => authority.readApprovedProcessSourceIndex({ approvedRef }),
      (error) => /^registration-(approved|review)/.test(error.message)
    );
});

test('creation conformance needs sustained real-transition-shaped windows and exact restoration', () => {
  const f = fixture();
  const registration = {
    ...f.registration,
    kinds: ['absence', 'creation'],
    transitions: ['clock-forward', 'clock-backward', 'timezone', 'dst'],
  };
  const sample = (second, offset, zone, dst) => ({
    monotonicNs: String(BigInt(second) * 1000000000n),
    utcNs: String(
      1000000000000000000n + BigInt(second) * 1000000000n + BigInt(offset) * 1000000000n
    ),
    zone,
    dst,
    pid: 111,
    nonce: f.unsigned.controls.live.nonce,
    creation: f.unsigned.controls.live.creation,
  });
  const window = (start, offset, zone = 'UTC', dst = false) =>
    [0, 1, 2, 3, 5].map((delta) => sample(start + delta, offset, zone, dst));
  const transitions = registration.transitions.map((kind, index) => ({
    kind,
    before: window(index * 20 + 1, 0),
    during: window(
      index * 20 + 7,
      kind === 'clock-forward'
        ? 120
        : kind === 'clock-backward'
          ? -120
          : kind === 'dst'
            ? 86400
            : 0,
      kind === 'timezone' ? 'America/Chicago' : 'UTC',
      kind === 'dst'
    ),
    after: window(index * 20 + 13, 0),
  }));
  const unsigned = {
    ...f.unsigned,
    registrationDigest: digest(registration),
    kind: 'creation',
    controls: { ...f.unsigned.controls, cleanup: { childExited: true, restoration: 'verified' } },
    transitions,
  };
  const valid = verify({ ...f, registration, receipt: f.seal(unsigned) });
  assert.equal(valid.verified, false);
  assert.equal(valid.evidenceValid, true);
  for (const changed of [
    transitions.slice(0, 3),
    transitions.map((v, i) => (i ? v : { ...v, during: v.before })),
    transitions.map((v, i) => (i ? v : { ...v, during: v.during.slice(0, 2) })),
    transitions.map((v, i) => (i ? v : { ...v, after: v.during })),
    transitions.map((v, i) =>
      i
        ? v
        : {
            ...v,
            during: v.during.map((s) => ({
              ...s,
              creation: { ...s.creation, lower: '200', upper: '201' },
            })),
          }
    ),
  ])
    assert.throws(
      () => verify({ ...f, registration, receipt: f.seal({ ...unsigned, transitions: changed }) }),
      /creation|restoration/
    );
});

test('clock observation uses actual system zone and monotonic time without caller substitutes', async () => {
  let clock;
  try {
    clock = await import('../live/process-source/clock.mjs');
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  }
  assert.equal(typeof clock?.observeSystemClockCore, 'function');
  const before = process.hrtime.bigint();
  const value = await clock.observeSystemClockCore();
  const after = process.hrtime.bigint();
  assert.equal(value.verified, false);
  assert.ok(BigInt(value.monotonicNs) >= before && BigInt(value.monotonicNs) <= after);
  assert.ok(BigInt(value.utcNs) > 0n);
  assert.equal(typeof value.dst, 'boolean');
  assert.equal(typeof value.zone, 'string');
  assert.ok(value.zone.length > 0);
  await assert.rejects(
    () => clock.observeSystemClockCore({ clock: () => 0, zone: 'UTC' }),
    /clock-observation-options/
  );
});

test('creation capture rejects expired original deadlines and caller-supplied clock evidence before effects', async () => {
  let capture;
  try {
    capture = await import('../live/process-source/creation.mjs');
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  }
  assert.equal(typeof capture?.captureCreationControlsCore, 'function');
  await assert.rejects(
    () =>
      capture.captureCreationControlsCore({
        signal: new AbortController().signal,
        deadline: performance.now() - 1,
      }),
    /source-capture-budget/
  );
  await assert.rejects(
    () =>
      capture.captureCreationControlsCore({
        signal: new AbortController().signal,
        deadline: performance.now() + 1000,
        clock: () => 0,
        transitions: [],
        restored: true,
      }),
    /source-capture-options/
  );
});

test('owned capture child uses the original bounded lifetime and nonce acknowledgements', async () => {
  const { fork } = await import('node:child_process');
  const child = fork(new URL('../helpers/process-source-child.mjs', import.meta.url), [], {
    execPath: process.execPath,
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });
  const nonce = 'd'.repeat(64);
  const exit = new Promise((resolve) =>
    child.once('exit', (code, signal) => resolve({ code, signal }))
  );
  const ready = new Promise((resolve) => child.once('message', resolve));
  child.send({ op: 'start', nonce, lifetimeMs: 100 });
  assert.deepEqual(await ready, { event: 'ready', nonce, pid: child.pid });
  const ping = new Promise((resolve) => child.once('message', resolve));
  child.send({ op: 'ping', nonce, sequence: 1 });
  assert.deepEqual(await ping, { event: 'alive', nonce, pid: child.pid, sequence: 1 });
  assert.deepEqual(await exit, { code: 2, signal: null });
});

test('finite class proposals verify signatures and retain historical package without accepting themselves', async () => {
  let classes;
  try {
    classes = await import('../live/process-source/classes.mjs');
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  }
  assert.equal(typeof classes?.proposeProcessSourceClassCore, 'function');
  const f = fixture();
  const input = {
    receipts: [f.receipt],
    registrations: [f.registration],
    registrationRevision: 'b'.repeat(40),
    registrationIndexDigest: H,
  };
  const proposal = classes.proposeProcessSourceClassCore(input);
  assert.equal(proposal.verified, false);
  assert.equal(proposal.classAdmitted, false);
  assert.equal(proposal.proposal.capability, 'absence');
  assert.deepEqual(proposal.proposal.scope.builds, ['6.8.0']);
  assert.deepEqual(proposal.proposal.scope.architectures, ['x64']);
  assert.deepEqual(proposal.proposal.scope.nodeMajors, [24]);
  assert.deepEqual(proposal.proposal.packageProvenance, [f.packageReceipt]);
  assert.equal(Object.hasOwn(proposal.proposal, 'acceptance'), false);
  assert.throws(
    () =>
      classes.proposeProcessSourceClassCore({
        ...input,
        receipts: [f.receipt, f.receipt],
        registrations: [f.registration, f.registration],
      }),
    /duplicate/
  );
  assert.throws(
    () =>
      classes.proposeProcessSourceClassCore({
        ...input,
        receipts: [{ ...f.receipt, hostId: 'sha256:' + 'f'.repeat(64) }],
      }),
    /host|signature/
  );
  assert.throws(
    () => classes.proposeProcessSourceClassCore({ ...input, accepted: true }),
    /proposal-options/
  );
});

test('finite class proposals reject unobserved build and Node cross-products', async () => {
  const { proposeProcessSourceClassCore } = await import('../live/process-source/classes.mjs');
  const f = fixture(),
    other = fixture();
  other.registration = {
    ...other.registration,
    captureId: 'control-linux-26',
    scope: { ...other.registration.scope, build: '6.9.0', nodeMajor: 26 },
  };
  const receipt = other.seal({
    ...other.unsigned,
    captureId: other.registration.captureId,
    registrationDigest: digest(other.registration),
    scope: other.registration.scope,
  });
  assert.throws(
    () =>
      proposeProcessSourceClassCore({
        receipts: [f.receipt, receipt],
        registrations: [f.registration, other.registration],
        registrationRevision: 'b'.repeat(40),
        registrationIndexDigest: H,
      }),
    /proposal-untested-scope/
  );
});

test('current class applicability separates historical package bytes from covered source changes', async () => {
  const classes = await import('../live/process-source/classes.mjs');
  assert.equal(typeof classes.verifyProcessSourceProposalCore, 'function');
  const f = fixture();
  const input = {
    receipts: [f.receipt],
    registrations: [f.registration],
    registrationRevision: 'b'.repeat(40),
    registrationIndexDigest: H,
  };
  const proposal = classes.proposeProcessSourceClassCore(input).proposal;
  const current = { contractDigest: H, scope: f.registration.scope };
  const result = classes.verifyProcessSourceProposalCore({ ...input, proposal, current });
  assert.equal(result.verified, false);
  assert.equal(result.applicable, true);
  assert.equal(result.classAdmitted, false);
  assert.deepEqual(result.historicalPackages, [f.packageReceipt]);
  for (const changed of [
    { ...current, contractDigest: 'sha256:' + 'f'.repeat(64) },
    { ...current, scope: { ...current.scope, nodeMajor: 26 } },
    { ...current, scope: { ...current.scope, build: 'untested-build' } },
    {
      ...current,
      scope: { ...current.scope, probe: { ...current.scope.probe, version: 'changed' } },
    },
  ])
    assert.equal(
      classes.verifyProcessSourceProposalCore({ ...input, proposal, current: changed }).applicable,
      false
    );
  assert.throws(
    () =>
      classes.verifyProcessSourceProposalCore({
        ...input,
        proposal: { ...proposal, acceptance: { status: 'accepted' } },
        current,
      }),
    /proposal-mismatch/
  );
});

test('public registration and capture schemas require closed signed evidence shapes', async () => {
  const { readFileSync } = await import('node:fs');
  const { AjvJsonSchemaValidator } =
    await import('@modelcontextprotocol/sdk/validation/ajv-provider.js');
  const f = fixture();
  const validator = new AjvJsonSchemaValidator();
  for (const [name, value] of [
    ['process-source-registration-v1.json', f.registration],
    ['process-source-conformance-v1.json', f.receipt],
  ]) {
    const schema = JSON.parse(readFileSync(new URL('../../schemas/' + name, import.meta.url)));
    const validate = validator.getValidator(schema);
    assert.equal(validate(value).valid, true);
    assert.equal(validate({ ...value, accepted: true }).valid, false);
    const missing = { ...value };
    delete missing.schema;
    assert.equal(validate(missing).valid, false);
    assert.equal(validate({ ...value, scope: { ...value.scope, nodeMajor: 0 } }).valid, false);
  }
});

test('class review and verification modes require ordinary registration authority before effects', async (t) => {
  const fs = await import('node:fs'),
    path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = fileURLToPath(new URL('../..', import.meta.url));
  const base = path.join(root, '.scratch/peer-review');
  fs.mkdirSync(base, { recursive: true });
  const scratch = fs.mkdtempSync(path.join(base, 'class-approval-'));
  t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
  const approvedRef = path.join(scratch, 'fake-approval.json');
  fs.writeFileSync(approvedRef, JSON.stringify({ accepted: true }));
  const { runProcessSourceConformance } = await import('../live/process-source-conformance.mjs');
  const common = {
    registrationIndex: 'evidence/portable-runtime/process-source/registration-index.json',
    approvedRef,
    receiptRoot: scratch,
  };
  for (const options of [
    { ...common, mode: 'review-class', output: path.join(scratch, 'proposal.json') },
    {
      ...common,
      mode: 'verify-class',
      classFile: path.join(scratch, 'proposal.json'),
      packagePath: path.join(scratch, 'candidate.tgz'),
      installation: path.join(scratch, 'installation'),
    },
  ])
    await assert.rejects(
      () => runProcessSourceConformance(options),
      /registration-approved-ref-invalid/
    );
  assert.equal(fs.existsSync(path.join(scratch, 'proposal.json')), false);
});

test('class admission requires its own normal reviewed subject and cannot reuse registration approval', async () => {
  const authority = await import('../live/process-source/authority.mjs');
  assert.equal(typeof authority.readReviewedProcessSourceClasses, 'function');
  await assert.rejects(
    () =>
      authority.readReviewedProcessSourceClasses({
        approvedClassRef: { accepted: true },
      }),
    /class-approved-ref-invalid/
  );
  await assert.rejects(
    () =>
      authority.readReviewedProcessSourceClasses({
        approvedClassRef: {
          schema: 'ai-peer-review.process-source-class-approved-ref/v1',
          producerVersion: '0.4.1',
          review: {
            reviewId: 'registration-review',
            subject: {
              revision: 'b'.repeat(40),
              path: 'evidence/portable-runtime/process-source/registration-reviews/local.md',
              blob: 'b'.repeat(40),
              sha256: 'c'.repeat(64),
            },
            manifest: {},
            finalResponse: {},
            finalization: {},
          },
        },
      }),
    /class-review-subject-invalid/
  );
});

test('installed class set refuses unreviewed extras and duplicate reviewed identities', async () => {
  const classes = await import('../live/process-source/classes.mjs');
  assert.equal(typeof classes.verifyReviewedInstalledClassSetCore, 'function');
  const record = { classId: 'reviewed-class', approvalDigest: H };
  const ledger = { schema: 'ai-peer-review.process-source-ledger/v1', classes: [record] };
  assert.deepEqual(
    classes.verifyReviewedInstalledClassSetCore({ ledger, reviewedClasses: [record] }),
    { verified: false, ledgerCovered: true }
  );
  for (const changed of [
    { ...ledger, classes: [record, { ...record, classId: 'unreviewed-class' }] },
    { ...ledger, classes: [record, record] },
    { ...ledger, classes: [{ ...record, approvalDigest: 'sha256:' + 'f'.repeat(64) }] },
  ])
    assert.throws(
      () =>
        classes.verifyReviewedInstalledClassSetCore({ ledger: changed, reviewedClasses: [record] }),
      /class-review-installed-ledger/
    );
});

test('genuine finalized class evidence derives an exact finite record and rejects altered review metadata', async () => {
  const fs = await import('node:fs');
  const { readReviewedProcessSourceClasses } = await import('../live/process-source/authority.mjs');
  const approvedClassRef = JSON.parse(
    fs.readFileSync(
      new URL(
        '../../evidence/portable-runtime/process-source/classes/170-local-absence-review-ref.json',
        import.meta.url
      )
    )
  );
  const accepted = await readReviewedProcessSourceClasses({ approvedClassRef });
  assert.equal(accepted.verified, false);
  assert.equal(accepted.classAuthority, 'reviewed');
  assert.equal(accepted.classes.length, 1);
  assert.equal(accepted.classes[0].classId, 'source-4e5bd382670e95bb0a76ba960b953740');
  assert.equal(accepted.classes[0].capability, 'absence');
  assert.deepEqual(accepted.classes[0].scope.builds, ['25.6.0']);
  assert.deepEqual(accepted.classes[0].scope.nodeMajors, [26]);
  assert.equal(
    accepted.classes[0].approvalDigest,
    'sha256:05866fc862c31680bd940409b76235c9509a5e26745e2854caf8d28adbf3b3d4'
  );
  await assert.rejects(
    () =>
      readReviewedProcessSourceClasses({
        approvedClassRef: {
          ...approvedClassRef,
          review: {
            ...approvedClassRef.review,
            finalization: { ...approvedClassRef.review.finalization, sha256: 'f'.repeat(64) },
          },
        },
      }),
    /class-review-incomplete/
  );
});
