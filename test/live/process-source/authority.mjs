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
import { verifyProcessSourceIndexCore } from './records.mjs';

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
