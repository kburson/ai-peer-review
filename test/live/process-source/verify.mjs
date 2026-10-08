// @story #170
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { realpathSync, lstatSync } from 'node:fs';
import { parseRawJson } from '../../../src/api/canonical-json.mjs';
import { readBoundedOrdinaryFile } from '../../../src/startup/runtime-inventory.mjs';
import { readApprovedProcessSourceIndex } from './authority.mjs';
import {
  verifyProcessSourceReceiptCore,
  processSourceRecordDigest,
  validateProcessSourcePackage,
} from './records.mjs';

const ROOT = realpathSync(fileURLToPath(new URL('../../../', import.meta.url)));
const INDEX = 'evidence/portable-runtime/process-source/registration-index.json';
const fail = (code) => {
  throw Error(code);
};
function readJson(file) {
  if (typeof file !== 'string') fail('source-verification-path');
  return parseRawJson(readBoundedOrdinaryFile(path.resolve(file), 1048576).toString('utf8'));
}
export async function verifyRegisteredProcessSources({
  receipt,
  receiptRoot,
  registrationIndex,
  approvedRef,
  packageReceipt,
} = {}) {
  if (
    typeof registrationIndex !== 'string' ||
    path.resolve(registrationIndex) !== path.join(ROOT, INDEX)
  )
    fail('registration-approved-index-path');
  const authority = await readApprovedProcessSourceIndex({ approvedRef: readJson(approvedRef) });
  if ((!receipt && !receiptRoot) || (receipt && receiptRoot)) fail('source-verification-selector');
  const expected = packageReceipt ? readJson(packageReceipt) : null;
  if (expected) validateProcessSourcePackage(expected);
  if (receiptRoot && !expected) fail('source-verification-expected-package-required');
  const verifyOne = (value) => {
    const r = authority.registrations.get(
      'evidence/portable-runtime/process-source/registrations/' + value?.captureId + '.json'
    );
    if (!r) fail('registration-capture-missing');
    if (expected && processSourceRecordDigest(r.package) !== processSourceRecordDigest(expected))
      fail('package-mismatch');
    return verifyProcessSourceReceiptCore({
      receipt: value,
      registration: r,
      packageReceipt: expected ?? r.package,
      registrationRevision: authority.revision,
      registrationIndexDigest: authority.indexDigest,
    });
  };
  if (receipt) {
    const result = verifyOne(readJson(receipt));
    return { ...result, registrationAuthority: 'reviewed', classAdmitted: false };
  }
  const root = realpathSync(path.resolve(receiptRoot));
  const results = [];
  const selected = authority.index.captures.filter(
    (entry) =>
      processSourceRecordDigest(authority.registrations.get(entry.path).package) ===
      processSourceRecordDigest(expected)
  );
  if (!selected.length) fail('registration-index-empty');
  for (const entry of selected) {
    const file = path.join(root, entry.captureId, 'receipt.json');
    if (lstatSync(path.dirname(file)).isSymbolicLink()) fail('source-verification-alias');
    results.push(verifyOne(readJson(file)));
  }
  if (new Set(results.map((value) => value.captureId)).size !== results.length)
    fail('source-verification-duplicate-capture');
  return {
    verified: false,
    evidenceValid: true,
    registrationAuthority: 'reviewed',
    captures: results,
    classAdmitted: false,
  };
}
