// @story #170
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { realpathSync, lstatSync, readdirSync, writeFileSync } from 'node:fs';
import { parseRawJson } from '../../../src/api/canonical-json.mjs';
import { readBoundedOrdinaryFile } from '../../../src/startup/runtime-inventory.mjs';
import { readApprovedProcessSourceIndex, readReviewedProcessSourceClasses } from './authority.mjs';
import { inspectInstalledCandidateSource } from './package.mjs';
import { proposeProcessSourceClassCore, verifyProcessSourceProposalCore } from './classes.mjs';
import { processSourceRecordDigest } from './records.mjs';
const ROOT = realpathSync(fileURLToPath(new URL('../../../', import.meta.url)));
const INDEX = 'evidence/portable-runtime/process-source/registration-index.json';
const fail = (code) => {
  throw Error(code);
};
const json = (file) =>
  parseRawJson(readBoundedOrdinaryFile(path.resolve(file), 1048576).toString('utf8'));
async function evidence(options) {
  if (
    typeof options.registrationIndex !== 'string' ||
    path.resolve(options.registrationIndex) !== path.join(ROOT, INDEX)
  )
    fail('registration-approved-index-path');
  const authority = await readApprovedProcessSourceIndex({
    approvedRef: json(options.approvedRef),
  });
  const root = path.resolve(options.receiptRoot);
  if (realpathSync(root) !== root || !lstatSync(root).isDirectory())
    fail('source-verification-alias');
  const ids = new Set(authority.index.captures.map((v) => v.captureId));
  const reserved = new Set(['registrations', 'registration-reviews', 'classes', 'class-reviews']);
  for (const name of readdirSync(root)) {
    if (ids.has(name) || reserved.has(name) || name === 'registration-index.json') continue;
    fail('source-verification-foreign-capture');
  }
  if (!ids.size) fail('registration-index-empty');
  const groups = new Map();
  for (const entry of authority.index.captures) {
    const folder = path.join(root, entry.captureId);
    if (lstatSync(folder).isSymbolicLink() || realpathSync(folder) !== folder)
      fail('source-verification-alias');
    const receipt = json(path.join(folder, 'receipt.json'));
    if (receipt.captureId !== entry.captureId) fail('source-verification-duplicate-capture');
    const key = processSourceRecordDigest({
      kind: receipt.kind,
      platform: receipt.scope?.platform,
      probe: receipt.scope?.probe,
      contract: receipt.package?.contractDigest,
    });
    const group = groups.get(key) ?? {
      receipts: [],
      registrations: [],
      registrationRevision: authority.revision,
      registrationIndexDigest: authority.indexDigest,
    };
    group.receipts.push(receipt);
    group.registrations.push(authority.registrations.get(entry.path));
    groups.set(key, group);
  }
  return [...groups.values()].map((input) => ({
    input,
    proposal: proposeProcessSourceClassCore(input).proposal,
  }));
}
export async function reviewProcessSourceClasses(options) {
  const groups = await evidence(options);
  const output = path.resolve(options.output);
  if (
    !output.startsWith(path.join(ROOT, '.scratch/peer-review') + path.sep) ||
    realpathSync(path.dirname(output)) !== path.dirname(output)
  )
    fail('source-class-output-path');
  const proposal = {
    schema: 'ai-peer-review.process-source-class-proposals/v1',
    proposals: groups.map((g) => g.proposal).sort((a, b) => a.classId.localeCompare(b.classId)),
  };
  writeFileSync(output, JSON.stringify(proposal, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return {
    verified: false,
    classAdmitted: false,
    ordinaryClassReview: 'required',
    output,
    proposalDigest: processSourceRecordDigest(proposal),
  };
}
export async function verifyProposedSourceClass(options) {
  const groups = await evidence(options);
  const accepted = options.approvedClassRef
    ? await readReviewedProcessSourceClasses({ approvedClassRef: json(options.approvedClassRef) })
    : null;
  if (
    accepted &&
    processSourceRecordDigest(accepted.registrationApproval) !==
      processSourceRecordDigest(json(options.approvedRef))
  )
    fail('class-review-registration-mismatch');
  const proposed = json(options.classFile);
  if (
    proposed.schema !== 'ai-peer-review.process-source-class-proposals/v1' ||
    Object.keys(proposed).sort().join(',') !== 'proposals,schema' ||
    !Array.isArray(proposed.proposals) ||
    proposed.proposals.length !== groups.length
  )
    fail('proposal-mismatch');
  const inspected = inspectInstalledCandidateSource({
    installation: options.installation,
    packagePath: options.packagePath,
  });
  const identity = await import(
    pathToFileURL(path.join(options.installation, 'src/protocol/process-identity.mjs')).href
  );
  const context = { signal: new AbortController().signal, deadline: performance.now() + 30000 };
  const probe = await identity.observeProcessSourceContext(context);
  if (!probe) fail('source-class-current-probe-unavailable');
  const current = {
    contractDigest: inspected.package.contractDigest,
    scope: {
      platform: process.platform,
      build: os.release(),
      architecture: process.arch,
      nodeMajor: Number(process.versions.node.split('.')[0]),
      probe,
    },
  };
  const results = groups.map((group) => {
    const selected = proposed.proposals.filter((p) => p.classId === group.proposal.classId);
    if (selected.length !== 1) fail('proposal-mismatch');
    return verifyProcessSourceProposalCore({ ...group.input, proposal: selected[0], current });
  });
  inspectInstalledCandidateSource({
    installation: options.installation,
    packagePath: options.packagePath,
  });
  if (!accepted)
    return { verified: false, classAdmitted: false, ordinaryClassReview: 'required', results };
  if (processSourceRecordDigest(accepted.proposals) !== processSourceRecordDigest(proposed))
    fail('class-review-proposal-mismatch');
  const ledger = json(
    path.join(options.installation, 'src/protocol/process-source-contracts.json')
  );
  if (
    ledger.schema !== 'ai-peer-review.process-source-ledger/v1' ||
    Object.keys(ledger).sort().join(',') !== 'classes,schema' ||
    !Array.isArray(ledger.classes)
  )
    fail('class-review-installed-ledger-invalid');
  const shipped = accepted.classes.every(
    (c) =>
      ledger.classes.filter(
        (v) =>
          v.classId === c.classId && processSourceRecordDigest(v) === processSourceRecordDigest(c)
      ).length === 1
  );
  return {
    verified: false,
    classAdmitted: shipped,
    ordinaryClassReview: 'accepted',
    installedClass: shipped ? 'present' : 'missing',
    operationalAuthority: 'unavailable',
    results,
  };
}
