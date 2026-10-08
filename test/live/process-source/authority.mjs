// @story #170
// Read-only immutable repository review authority; never trusts capture-owned approval flags.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseRawJson } from '../../../src/api/canonical-json.mjs';
import {
  checkNormalRuntimeReview,
  readRuntimeContractGitBlob,
} from '../../../scripts/check-runtime-contract-adoption.mjs';
import {
  verifyProcessSourceIndexCore,
  verifyProcessSourceReceiptCore,
  processSourceRecordDigest,
} from './records.mjs';
import { proposeProcessSourceClassCore } from './classes.mjs';
import { verifyProcessSourceClass } from '../../../src/protocol/process-source-assurance.mjs';

const ROOT = realpathSync(fileURLToPath(new URL('../../../', import.meta.url)));
const INDEX = 'evidence/portable-runtime/process-source/registration-index.json';
const OBJECT = /^[a-f0-9]{40}$/u;
const HASH = /^sha256:[a-f0-9]{64}$/u;
const SHA = /^[a-f0-9]{64}$/u;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fail = (code) => {
  throw new Error(code);
};
const exact = (v, keys) =>
  v &&
  Object.getPrototypeOf(v) === Object.prototype &&
  Reflect.ownKeys(v).length === keys.length &&
  keys.every((k) => {
    const d = Object.getOwnPropertyDescriptor(v, k);
    return d?.enumerable && Object.hasOwn(d, 'value');
  });
const safePath = (v) =>
  typeof v === 'string' &&
  v.length <= 512 &&
  /^(?:evidence\/portable-runtime\/process-source|docs\/superpowers\/peer-reviews)\/[a-zA-Z0-9/._-]+$/u.test(
    v
  ) &&
  !v.split('/').some((p) => !p || p === '.' || p === '..');
function git(args, encoding) {
  return execFileSync('git', ['-C', ROOT, ...args], {
    encoding,
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 30000,
    maxBuffer: 16 * 1024 * 1024,
  });
}
function reference(ref) {
  if (
    !exact(ref, ['revision', 'path', 'blob', 'sha256']) ||
    !OBJECT.test(ref.revision) ||
    !OBJECT.test(ref.blob) ||
    !SHA.test(ref.sha256) ||
    !safePath(ref.path)
  )
    fail('registration-review-reference-invalid');
  const oid = git(['rev-parse', '--verify', ref.revision + ':' + ref.path], 'utf8').trim();
  if (oid !== ref.blob) fail('registration-review-reference-mismatch');
  const bytes = readRuntimeContractGitBlob(git, ref.revision, ref.path);
  if (hash(bytes) !== ref.sha256) fail('registration-review-reference-mismatch');
  return bytes;
}
function ancestor(before, after) {
  if (!OBJECT.test(before) || !OBJECT.test(after)) fail('registration-review-revision-invalid');
  try {
    git(['merge-base', '--is-ancestor', before, after]);
  } catch {
    fail('registration-review-revision-unreachable');
  }
}
async function readApprovedIndex({ approvedRef } = {}) {
  const a = approvedRef;
  if (
    !exact(a, ['schema', 'revision', 'indexDigest', 'producerVersion', 'review']) ||
    a.schema !== 'ai-peer-review.process-source-approved-ref/v1' ||
    !OBJECT.test(a.revision) ||
    !HASH.test(a.indexDigest) ||
    !['0.4.0', '0.4.1'].includes(a.producerVersion) ||
    !exact(a.review, ['reviewId', 'subject', 'manifest', 'finalResponse', 'finalization'])
  )
    fail('registration-approved-ref-invalid');
  const p = a.review;
  if (
    !/^evidence\/portable-runtime\/process-source\/registration-reviews\/[a-z0-9][a-z0-9-]{0,95}\.md$/u.test(
      p.subject?.path ?? ''
    ) ||
    !exact(p.finalization, ['revision', 'sha256']) ||
    !OBJECT.test(p.finalization.revision) ||
    !SHA.test(p.finalization.sha256)
  )
    fail('registration-review-invalid');
  const artifacts = new Map();
  for (const ref of [p.subject, p.manifest, p.finalResponse]) {
    const bytes = reference(ref);
    artifacts.set(ref.revision + ':' + ref.path, bytes);
  }
  const final = p.finalization.revision;
  for (const ref of [p.manifest, p.finalResponse])
    artifacts.set(
      'tree:' + final + ':' + ref.path,
      readRuntimeContractGitBlob(git, final, ref.path)
    );
  artifacts.set('commit:' + final, git(['show', '-s', '--format=%B', final]));
  artifacts.set('parent:' + final, git(['show', '-s', '--format=%P', final], 'utf8').trim());
  const review = checkNormalRuntimeReview({
    proof: p,
    artifacts,
    producerVersion: a.producerVersion,
  });
  if (!review.collateralComplete)
    fail('registration-review-incomplete:' + review.blockers.join(','));
  const subject = artifacts.get(p.subject.revision + ':' + p.subject.path).toString('utf8');
  const blocks = [...subject.matchAll(/^\x60{3}json\r?\n([\s\S]*?)^\x60{3}\s*$/gm)];
  if (blocks.length !== 1) fail('registration-review-subject-invalid');
  const declared = parseRawJson(blocks[0][1]);
  if (
    !exact(declared, ['schema', 'index', 'captures']) ||
    declared.schema !== 'ai-peer-review.process-source-registration-review/v1' ||
    !Array.isArray(declared.captures) ||
    declared.captures.length > 512 ||
    declared.index?.revision !== a.revision ||
    declared.index?.path !== INDEX ||
    'sha256:' + declared.index?.sha256 !== a.indexDigest
  )
    fail('registration-review-index-mismatch');
  const indexBytes = reference(declared.index);
  const index = parseRawJson(indexBytes.toString('utf8'));
  if (!Array.isArray(index.captures) || index.captures.length !== declared.captures.length)
    fail('registration-review-capture-mismatch');
  const registrations = new Map();
  for (let i = 0; i < declared.captures.length; i += 1) {
    const ref = declared.captures[i];
    if (ref.revision !== a.revision || ref.path !== index.captures[i].path)
      fail('registration-review-capture-mismatch');
    const bytes = reference(ref);
    registrations.set(ref.path, parseRawJson(bytes.toString('utf8')));
  }
  verifyProcessSourceIndexCore({ index, registrations });
  ancestor(a.revision, p.subject.revision);
  ancestor(p.subject.revision, final);
  ancestor(final, git(['rev-parse', 'HEAD'], 'utf8').trim());
  return Object.freeze({
    verified: false,
    registrationAuthority: 'reviewed',
    revision: a.revision,
    indexDigest: a.indexDigest,
    index,
    registrations,
    reviewAssurance: review.assurance,
    privateEventReplay: review.privateEventReplay,
  });
}

export async function readApprovedProcessSourceIndex(options = {}) {
  try {
    return await readApprovedIndex(options);
  } catch (error) {
    if (/^registration-(approved|review|index)/u.test(error.message)) throw error;
    fail('registration-review-unavailable');
  }
}

export async function readReviewedProcessSourceClasses({ approvedClassRef } = {}) {
  const a = approvedClassRef;
  if (
    !exact(a, ['schema', 'producerVersion', 'review']) ||
    a.schema !== 'ai-peer-review.process-source-class-approved-ref/v1' ||
    !['0.4.0', '0.4.1'].includes(a.producerVersion) ||
    !exact(a.review, ['reviewId', 'subject', 'manifest', 'finalResponse', 'finalization'])
  )
    fail('class-approved-ref-invalid');
  const p = a.review;
  if (
    !/^evidence\/portable-runtime\/process-source\/class-reviews\/[a-z0-9][a-z0-9-]{0,95}\.md$/u.test(
      p.subject?.path ?? ''
    )
  )
    fail('class-review-subject-invalid');
  try {
    if (
      !exact(p.finalization, ['revision', 'sha256']) ||
      !OBJECT.test(p.finalization.revision) ||
      !SHA.test(p.finalization.sha256)
    )
      fail('class-review-invalid');
    const artifacts = new Map();
    for (const ref of [p.subject, p.manifest, p.finalResponse])
      artifacts.set(ref.revision + ':' + ref.path, reference(ref));
    const final = p.finalization.revision;
    for (const ref of [p.manifest, p.finalResponse])
      artifacts.set(
        'tree:' + final + ':' + ref.path,
        readRuntimeContractGitBlob(git, final, ref.path)
      );
    artifacts.set('commit:' + final, git(['show', '-s', '--format=%B', final]));
    artifacts.set('parent:' + final, git(['show', '-s', '--format=%P', final], 'utf8').trim());
    const review = checkNormalRuntimeReview({
      proof: p,
      artifacts,
      producerVersion: a.producerVersion,
    });
    if (!review.collateralComplete) fail('class-review-incomplete:' + review.blockers.join(','));
    ancestor(p.subject.revision, final);
    ancestor(final, git(['rev-parse', 'HEAD'], 'utf8').trim());
    const text = artifacts.get(p.subject.revision + ':' + p.subject.path).toString('utf8');
    const blocks = [...text.matchAll(/^\x60{3}json\r?\n([\s\S]*?)^\x60{3}\s*$/gm)];
    if (blocks.length !== 1) fail('class-review-subject-invalid');
    const declared = parseRawJson(blocks[0][1]);
    if (
      !exact(declared, ['schema', 'proposals', 'registrationApproval', 'receipts']) ||
      declared.schema !== 'ai-peer-review.process-source-class-review/v1' ||
      !Array.isArray(declared.receipts) ||
      !declared.receipts.length ||
      declared.receipts.length > 512 ||
      !/^evidence\/portable-runtime\/process-source\/classes\/[a-z0-9][a-z0-9-]{0,95}\.json$/u.test(
        declared.proposals?.path ?? ''
      )
    )
      fail('class-review-evidence-invalid');
    const registration = await readApprovedProcessSourceIndex({
      approvedRef: declared.registrationApproval,
    });
    const bundle = parseRawJson(reference(declared.proposals).toString('utf8'));
    if (
      !exact(bundle, ['schema', 'proposals']) ||
      bundle.schema !== 'ai-peer-review.process-source-class-proposals/v1' ||
      !Array.isArray(bundle.proposals) ||
      !bundle.proposals.length ||
      bundle.proposals.length > 128 ||
      new Set(bundle.proposals.map((v) => v.classId)).size !== bundle.proposals.length
    )
      fail('class-review-proposal-invalid');
    ancestor(declared.proposals.revision, p.subject.revision);
    const captures = new Map();
    for (const ref of declared.receipts) {
      if (
        !/^evidence\/portable-runtime\/process-source\/[a-z0-9][a-z0-9-]{0,95}\/receipt\.json$/u.test(
          ref.path ?? ''
        )
      )
        fail('class-review-receipt-invalid');
      ancestor(ref.revision, p.subject.revision);
      const receipt = parseRawJson(reference(ref).toString('utf8'));
      if (
        ref.path !==
          'evidence/portable-runtime/process-source/' + receipt.captureId + '/receipt.json' ||
        captures.has(receipt.captureId)
      )
        fail('class-review-duplicate-capture');
      const record = registration.registrations.get(
        'evidence/portable-runtime/process-source/registrations/' + receipt.captureId + '.json'
      );
      verifyProcessSourceReceiptCore({
        receipt,
        registration: record,
        packageReceipt: record?.package,
        registrationRevision: registration.revision,
        registrationIndexDigest: registration.indexDigest,
      });
      captures.set(receipt.captureId, { receipt, registration: record });
    }
    const used = new Set();
    const classes = bundle.proposals.map((proposal) => {
      if (!Array.isArray(proposal.evidenceDigests)) fail('class-review-proposal-invalid');
      const selected = [...captures.values()].filter((v) =>
        proposal.evidenceDigests.includes(processSourceRecordDigest(v.receipt))
      );
      for (const v of selected) {
        if (used.has(v.receipt.captureId)) fail('class-review-duplicate-capture');
        used.add(v.receipt.captureId);
      }
      const recomputed = proposeProcessSourceClassCore({
        receipts: selected.map((v) => v.receipt),
        registrations: selected.map((v) => v.registration),
        registrationRevision: registration.revision,
        registrationIndexDigest: registration.indexDigest,
      }).proposal;
      if (processSourceRecordDigest(recomputed) !== processSourceRecordDigest(proposal))
        fail('class-review-proposal-mismatch');
      const unsigned = {
        schema: 'ai-peer-review.process-source-class/v1',
        classId: proposal.classId,
        capability: proposal.capability,
        scope: proposal.scope,
        contractDigest: proposal.contractDigest,
        semantics: proposal.semantics,
        precision: proposal.precision,
        acceptance: {
          status: 'accepted',
          evidenceDigest: processSourceRecordDigest({
            receipts: proposal.evidenceDigests,
            registrationRevision: proposal.registrationRevision,
            registrationIndexDigest: proposal.registrationIndexDigest,
          }),
          reviewDigest: processSourceRecordDigest(p),
        },
      };
      const accepted = { ...unsigned, approvalDigest: processSourceRecordDigest(unsigned) };
      const scope = selected[0].receipt.scope;
      const structural = verifyProcessSourceClass({
        ledger: { schema: 'ai-peer-review.process-source-ledger/v1', classes: [accepted] },
        host: {
          platform: scope.platform,
          build: scope.build,
          architecture: scope.architecture,
          nodeMajor: scope.nodeMajor,
        },
        adapterHashes: { contractDigest: accepted.contractDigest },
        probeObservation: scope.probe,
      });
      if (structural[accepted.capability]?.status !== 'matched')
        fail('class-review-finite-scope-invalid');
      return accepted;
    });
    if (used.size !== captures.size || captures.size !== registration.index.captures.length)
      fail('class-review-evidence-coverage-invalid');
    return Object.freeze({
      verified: false,
      classAuthority: 'reviewed',
      classes,
      proposals: bundle,
      registrationApproval: declared.registrationApproval,
      assurance: review.assurance,
      privateEventReplay: review.privateEventReplay,
    });
  } catch (error) {
    if (/^class-(approved|review)/u.test(error.message)) throw error;
    fail('class-review-unavailable');
  }
}

export async function readReviewedProcessSourceClassSet({ reviewIndex } = {}) {
  if (
    !exact(reviewIndex, ['schema', 'refs']) ||
    reviewIndex.schema !== 'ai-peer-review.process-source-class-review-index/v1' ||
    !Array.isArray(reviewIndex.refs) ||
    !reviewIndex.refs.length ||
    reviewIndex.refs.length > 128
  )
    fail('class-review-index-invalid');
  const proofs = [];
  const classes = [];
  for (const ref of reviewIndex.refs) {
    const proof = await readReviewedProcessSourceClasses({ approvedClassRef: ref });
    for (const record of proof.classes) {
      if (classes.some((c) => c.classId === record.classId)) fail('class-review-set-duplicate');
      for (const existing of classes)
        if (
          existing.capability === record.capability &&
          existing.contractDigest === record.contractDigest &&
          existing.scope.platform === record.scope.platform &&
          processSourceRecordDigest(existing.scope.probe) ===
            processSourceRecordDigest(record.scope.probe) &&
          existing.scope.builds.some((v) => record.scope.builds.includes(v)) &&
          existing.scope.architectures.some((v) => record.scope.architectures.includes(v)) &&
          existing.scope.nodeMajors.some((v) => record.scope.nodeMajors.includes(v))
        )
          fail('class-review-set-overlap');
      classes.push(record);
    }
    proofs.push(proof);
  }
  if (classes.length > 128) fail('class-review-index-invalid');
  return Object.freeze({ verified: false, classAuthority: 'reviewed', classes, proofs });
}
