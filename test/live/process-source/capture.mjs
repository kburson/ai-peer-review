// @story #170
import { createHash, createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { lstatSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseRawJson } from '../../../src/api/canonical-json.mjs';
import { readBoundedOrdinaryFile } from '../../../src/startup/runtime-inventory.mjs';
import { inspectInstalledCandidateSource } from './package.mjs';
import { readApprovedProcessSourceIndex } from './authority.mjs';
import { captureAbsenceControlsCore } from './absence.mjs';
import {
  canonicalProcessSourceBytes,
  processSourceRecordDigest,
  verifyProcessSourceReceiptCore,
} from './records.mjs';

const ROOT = realpathSync(fileURLToPath(new URL('../../../', import.meta.url)));
const INDEX = 'evidence/portable-runtime/process-source/registration-index.json';
const fail = (code) => {
  throw new Error(code);
};
const hash = (bytes) => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const exact = (v, keys) =>
  v &&
  Object.getPrototypeOf(v) === Object.prototype &&
  Object.keys(v).sort().join(',') === [...keys].sort().join(',');
function privatePath(value) {
  if (typeof value !== 'string') fail('source-capture-path');
  const file = path.resolve(value);
  if (
    !file.startsWith(path.join(ROOT, '.scratch/peer-review') + path.sep) ||
    realpathSync(path.dirname(file)) !== path.dirname(file)
  )
    fail('source-capture-path');
  return file;
}
export async function captureRegisteredAbsence({
  binding,
  registrationIndex,
  approvedRef,
  output,
} = {}) {
  const signal = new AbortController().signal;
  const deadline = performance.now() + 120000;
  if (
    typeof registrationIndex !== 'string' ||
    path.resolve(registrationIndex) !== path.join(ROOT, INDEX)
  )
    fail('registration-approved-index-path');
  const approved = parseRawJson(
    readBoundedOrdinaryFile(privatePath(approvedRef), 1048576).toString('utf8')
  );
  const authority = await readApprovedProcessSourceIndex({ approvedRef: approved });
  const b = parseRawJson(readBoundedOrdinaryFile(privatePath(binding), 1048576).toString('utf8'));
  if (
    !exact(b, [
      'schema',
      'verified',
      'runtimeAuthority',
      'captureId',
      'hostId',
      'package',
      'packagePath',
      'installation',
      'privateRoot',
      'privateKeyName',
      'keyGeneration',
      'registrationPath',
    ]) ||
    b.schema !== 'ai-peer-review.process-source-binding/v1' ||
    b.verified !== false ||
    b.runtimeAuthority !== 'unavailable' ||
    !/^[a-z0-9][a-z0-9-]{0,95}$/u.test(b.captureId)
  )
    fail('source-capture-binding-invalid');
  const registration = authority.registrations.get(
    'evidence/portable-runtime/process-source/registrations/' + b.captureId + '.json'
  );
  if (
    !registration ||
    !registration.kinds.includes('absence') ||
    registration.hostId !== b.hostId ||
    processSourceRecordDigest(registration.package) !== processSourceRecordDigest(b.package)
  )
    fail('source-capture-registration-mismatch');
  const destination = privatePath(output);
  try {
    lstatSync(destination);
    fail('source-capture-output-exists');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  inspectInstalledCandidateSource({ installation: b.installation, packagePath: b.packagePath });
  const protection = await import(
    pathToFileURL(path.join(b.installation, 'src/broker/storage-protection.mjs')).href
  );
  const context = { signal, deadline };
  const observed = await protection.observeStorageProtection({ root: b.privateRoot, ...context });
  if (!observed.verified) fail('source-capture-key-protection-unproved');
  const guard = await protection.openProtectedRoot({ receipt: observed, ...context });
  let receipt;
  try {
    const snapshot = await guard.readSnapshot(b.privateKeyName);
    const matches = (value) =>
      ['identity', 'fileVersion', 'rootIdentity'].every(
        (key) => value[key] === b.keyGeneration?.[key]
      );
    if (!matches(snapshot)) fail('source-capture-key-generation-changed');
    const privateKey = createPrivateKey(snapshot.bytes);
    const publicBytes = createPublicKey(privateKey).export({ type: 'spki', format: 'der' });
    if (
      privateKey.asymmetricKeyType !== 'ed25519' ||
      hash(publicBytes) !== registration.keyId ||
      publicBytes.toString('base64') !== registration.publicKey
    )
      fail('source-capture-key-mismatch');
    const actual = await captureAbsenceControlsCore({
      installation: b.installation,
      packagePath: b.packagePath,
      ...context,
    });
    if (
      actual.hostId !== registration.hostId ||
      processSourceRecordDigest(actual.scope) !== processSourceRecordDigest(registration.scope)
    )
      fail('source-capture-scope-changed');
    if (!matches(await guard.readSnapshot(b.privateKeyName)))
      fail('source-capture-key-generation-changed');
    const unsigned = {
      schema: 'ai-peer-review.process-source-conformance/v1',
      captureId: b.captureId,
      hostId: actual.hostId,
      registrationDigest: processSourceRecordDigest(registration),
      registrationRevision: authority.revision,
      registrationIndexDigest: authority.indexDigest,
      package: b.package,
      scope: actual.scope,
      kind: 'absence',
      controls: actual.controls,
      transitions: [],
      boot: actual.boot,
    };
    receipt = {
      ...unsigned,
      signature: {
        algorithm: 'Ed25519',
        keyId: registration.keyId,
        value: sign(null, canonicalProcessSourceBytes(unsigned), privateKey).toString('hex'),
      },
    };
    verifyProcessSourceReceiptCore({
      receipt,
      registration,
      packageReceipt: b.package,
      registrationRevision: authority.revision,
      registrationIndexDigest: authority.indexDigest,
    });
  } finally {
    await guard.close();
  }
  writeFileSync(destination, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return {
    verified: false,
    mode: 'captured-absence',
    output: destination,
    captureId: receipt.captureId,
    receiptDigest: processSourceRecordDigest(receipt),
    classAdmitted: false,
  };
}
