// @story #144
// Local document evidence only: never execute a selector-selected producer.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContract } from '../../src/api/validate.mjs';
import { parseRawJson } from '../../src/api/canonical-json.mjs';
import { verifyRuntimeImage } from '../../src/broker/runtime-image.mjs';
import { readManualLaunchHistory } from '../../src/provider/manual-launch-ledger.mjs';
import { fingerprintSession } from '../../src/identity/registry.mjs';
import { checkNormalRuntimeReview } from '../check-runtime-contract-adoption.mjs';
import {
  RUNTIME_REVIEW_PRODUCER_SOURCES,
  reduceRuntimeReviewEvents,
  inspectRuntimeReviewLineage,
  assertRuntimeReviewStartupBinding,
} from './runtime-review-grammar-v0.4.1.mjs';

const hash = (b) => createHash('sha256').update(b).digest('hex');
const canonical = (v) =>
  Array.isArray(v)
    ? v.map(canonical)
    : v && typeof v === 'object'
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, canonical(v[k])])
        )
      : v;
const equal = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const exact = (v, keys) =>
  v !== null &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.keys(v).sort().join('|') === [...keys].sort().join('|');
const objectId = /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/;
const sha = /^[a-f0-9]{64}$/;
const safe = (p) =>
  typeof p === 'string' &&
  !path.posix.isAbsolute(p) &&
  !/[\\\0\r\n:]/.test(p) &&
  p.split('/').every((x) => x && x !== '.' && x !== '..');
const refValid = (r) =>
  exact(r, ['revision', 'path', 'blob', 'sha256']) &&
  objectId.test(r.revision) &&
  objectId.test(r.blob) &&
  sha.test(r.sha256) &&
  safe(r.path) &&
  !/^(?:test|tests|node_modules|\.scratch)\//.test(r.path);
const proofValid = (r) =>
  exact(r, ['reviewId', 'subject', 'manifest', 'finalResponse', 'finalization']) &&
  /^review-[a-zA-Z0-9._-]+$/.test(r.reviewId) &&
  [r.subject, r.manifest, r.finalResponse].every(refValid) &&
  exact(r.finalization, ['revision', 'sha256']) &&
  objectId.test(r.finalization.revision) &&
  sha.test(r.finalization.sha256);
const fail = (code) => {
  throw Error(code);
};
function read(file) {
  try {
    const s = lstatSync(file);
    if (!s.isFile() || s.isSymbolicLink() || realpathSync(file) !== path.resolve(file))
      fail('private-source-file-unsafe');
    return readFileSync(file);
  } catch (error) {
    if (error.message === 'private-source-file-unsafe') throw error;
    fail('private-source-file-unavailable');
  }
}
const json = (file) => parseRawJson(read(file).toString('utf8'));
// Exact producer modules that interpret the source/launch authority inspected below.
// This bounded profile freezes the actually inspected complete package/Node closure.
// A changed Node/dependency/package image requires a separately reviewed profile.
export const LINEAGE_PRODUCER_RUNTIME_IMAGE = Object.freeze({
  digest: 'sha256:5d2225b9e75751b57bed38802b6e0fa291b5d44b0a1ce3e9aaead9fd8fe8c955',
  byteSha256: '1d9d126844149a391fed2fa27a26d6ba23dcdb5e251b37cf3ddd702ed3ac6e7a',
  fileCount: 4739,
});
export const LINEAGE_PRODUCER_SOURCES = Object.freeze({
  ...RUNTIME_REVIEW_PRODUCER_SOURCES,
  'src/broker/runtime-image.mjs':
    '6e5b465b20a28314f61e0d9ce0f3e66c06e608236ac7dc74a98cd22f506396a5',
  'src/provider/manual-launch-ledger.mjs':
    'f89f0a3a4ad6abb2c2db4ccc13e648abbe88c8d5193193a7944a3b3af1d52f8c',
  'src/provider/claude-launch.mjs':
    '2eb73957831ac35afee028cdc40918734ad55078a2b2d4f2ae5f846f432c73a5',
  'src/identity/registry.mjs': '62fa08fb4ae89a031d479954ad0de4e41e879e916d9847cbf0a64c6613bfa760',
});
function gitReader(root) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_'))
  );
  return (args, encoding = null) =>
    execFileSync('git', args, { cwd: root, env, encoding, maxBuffer: 32 * 1024 * 1024 });
}
function committedVerifier(root, git) {
  const localRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  if (realpathSync(root) !== realpathSync(localRoot)) fail('verifier-worktree-mismatch');
  const revision = git(['rev-parse', 'HEAD'], 'utf8').trim();
  // Pin the actual checked-in source closure. No caller-supplied executable reference.
  const files = git(
    [
      'ls-files',
      'scripts/check-runtime-contract-adoption.mjs',
      'scripts/lib',
      'src',
      'schemas',
      'package.json',
      'package-lock.json',
    ],
    'utf8'
  )
    .trim()
    .split('\n');
  return {
    revision,
    sources: files.map((p) => {
      const bytes = read(path.join(root, p));
      let committed;
      try {
        committed = git(['show', revision + ':' + p]);
      } catch {
        fail('verifier-source-uncommitted');
      }
      if (!bytes.equals(committed)) fail('verifier-source-uncommitted');
      return {
        revision,
        path: p,
        blob: git(['rev-parse', revision + ':' + p], 'utf8').trim(),
        sha256: hash(bytes),
      };
    }),
  };
}
export function verifyRuntimeReviewLineage({ workspace, reviewReference, producerProfile } = {}) {
  if (producerProfile !== '0.4.1') fail('producer-profile-unsupported');
  if (!proofValid(reviewReference)) fail('normal-review-reference-invalid');
  try {
    if (
      !path.isAbsolute(workspace) ||
      realpathSync(workspace) !== workspace ||
      !lstatSync(workspace).isDirectory()
    )
      fail('actual-workspace-unavailable');
  } catch {
    fail('actual-workspace-unavailable');
  }
  const eventBytes = read(path.join(workspace, 'events.jsonl'));
  if (!eventBytes.toString('utf8').endsWith('\n')) fail('event-log-corrupt');
  const events = eventBytes.toString('utf8').slice(0, -1).split('\n').map(parseRawJson);
  const state = reduceRuntimeReviewEvents(events, producerProfile),
    p = state.protocol;
  const root = p.startup.context.repository_root,
    git = gitReader(root);
  if (
    p.review_id !== reviewReference.reviewId ||
    p.state !== 'accepted' ||
    p.commit_mode !== 'normal'
  )
    fail('persisted-review-not-normal-accepted');
  const manifestBytes = git([
    'show',
    reviewReference.manifest.revision + ':' + reviewReference.manifest.path,
  ]);
  const match = manifestBytes
    .toString('utf8')
    .match(/^\x60\x60\x60json\r?\n([\s\S]*?)^\x60\x60\x60\s*$/m);
  if (!match) fail('normal-manifest-invalid');
  const manifest = parseRawJson(match[1]);
  const receipt = json(path.join(workspace, 'lineage-receipt.json'));
  // This profile emits single-attempt proof only. Recovered chains remain refused until
  // every predecessor producer/source/member has an independently supported profile.
  if (receipt.attempts?.length !== 1) fail('recovered-chain-profile-unavailable');
  const lineage = inspectRuntimeReviewLineage([workspace], producerProfile);
  if (
    lineage.status !== 'complete' ||
    !equal(manifest.lineage_receipt, receipt) ||
    !equal(lineage.attempts, receipt.attempts)
  )
    fail('persisted-lineage-incomplete');
  const journal = json(path.join(workspace, 'startup-request.json'));
  const registration = json(journal.registration_file);
  assertRuntimeReviewStartupBinding({ journal, registration, initialEvent: events[0], workspace });
  if (!verifyRuntimeImage(journal.runtime)) fail('producer-image-invalid');
  if (journal.runtime.digest !== LINEAGE_PRODUCER_RUNTIME_IMAGE.digest)
    fail('producer-image-profile-mismatch');
  const imageBytes = read(path.join(journal.runtime.root, 'runtime-image.json')),
    image = parseRawJson(imageBytes.toString('utf8'));
  if (
    image.package.name !== '@kburson/ai-peer-review' ||
    image.package.version !== producerProfile ||
    image.package.entrypoint !== 'package/bin/peer-review.mjs'
  )
    fail('producer-package-invalid');
  for (const [name, digest] of Object.entries(LINEAGE_PRODUCER_SOURCES)) {
    if (hash(read(path.join(journal.runtime.root, 'package', name))) !== digest)
      fail('producer-source-profile-mismatch');
  }
  const historyBytes = read(path.join(workspace, 'manual-launch-history.json'));
  parseRawJson(historyBytes.toString('utf8'));
  const history = readManualLaunchHistory(workspace, {
    reviewId: p.review_id,
    requestDigest: journal.request_digest,
  });
  if (
    history?.coverage !== 'complete' ||
    !history.operations.length ||
    history.operations.some((o) => o.status !== 'submitted' && o.status !== 'not-submitted')
  )
    fail('provider-launch-unreconciled');
  const launchBytes = read(path.join(workspace, 'provider', 'claude', 'launch-state.json')),
    launch = parseRawJson(launchBytes.toString('utf8'));
  const reviewer = p.startup.runtime.reviewer;
  if (
    !exact(launch, [
      'schema',
      'review_id',
      'invitation',
      'response',
      'model',
      'effort',
      'session_handle',
      'session_fingerprint',
      'protocol_revision',
    ]) ||
    launch.schema !== 'ai-peer-review.claude-launch-state/v1' ||
    launch.review_id !== p.review_id ||
    !/^[A-Za-z0-9._:-]+$/.test(launch.session_handle ?? '') ||
    launch.session_fingerprint !== fingerprintSession('anthropic', launch.session_handle) ||
    launch.session_fingerprint !== state.participants.reviewer.session_fingerprint ||
    launch.model !== reviewer.model_id ||
    launch.effort !== reviewer.effort ||
    reviewer.provider !== 'anthropic' ||
    reviewer.selector !== 'claude' ||
    !Number.isSafeInteger(launch.protocol_revision) ||
    launch.protocol_revision < 0 ||
    launch.protocol_revision > p.revision ||
    launch.invitation !==
      path.join(root, p.startup.destination, p.review_id + '-reviewer-invitation.md') ||
    launch.response !== path.join(root, reviewReference.finalResponse.path) ||
    'sha256:' + hash(read(launch.invitation)) !== p.startup.reviewer_invitation_digest
  )
    fail('provider-launch-binding-invalid');
  const artifacts = new Map();
  for (const ref of [
    reviewReference.subject,
    reviewReference.manifest,
    reviewReference.finalResponse,
  ])
    artifacts.set(ref.revision + ':' + ref.path, git(['show', ref.revision + ':' + ref.path]));
  const final = reviewReference.finalization.revision;
  artifacts.set('commit:' + final, git(['show', '-s', '--format=%B', final]));
  artifacts.set('parent:' + final, git(['rev-parse', final + '^'], 'utf8').trim());
  for (const r of [reviewReference.manifest, reviewReference.finalResponse])
    artifacts.set('tree:' + final + ':' + r.path, git(['show', final + ':' + r.path]));
  const normal = checkNormalRuntimeReview({
    proof: reviewReference,
    artifacts,
    producerVersion: producerProfile,
  });
  if (!normal.collateralComplete) fail('normal-collateral-invalid:' + normal.blockers.join(','));
  if (
    !equal(manifest.runtime, p.startup.runtime) ||
    !equal(manifest.participants, {
      author: state.participants.author,
      reviewer: state.participants.reviewer,
    }) ||
    p.artifact.head !== reviewReference.subject.revision ||
    p.artifact.blob !== reviewReference.subject.blob ||
    p.artifact.path !== reviewReference.subject.path ||
    p.artifact.digest !== 'sha256:' + reviewReference.subject.sha256 ||
    events.at(-1).type !== 'acceptance-committed' ||
    events.at(-1).payload.terminal.commit !== final ||
    events.at(-1).payload.terminal.manifest_digest !== 'sha256:' + reviewReference.manifest.sha256
  )
    fail('persisted-terminal-collateral-conflict');
  const members = [];
  for (const h of manifest.artifact_history) {
    const bytes = git(['show', h.commit + ':' + h.path]),
      blob = git(['rev-parse', h.commit + ':' + h.path], 'utf8').trim();
    if ('sha256:' + hash(bytes) !== h.digest || blob !== h.blob) fail('review-member-conflict');
    members.push({ revision: h.commit, path: h.path, blob, sha256: hash(bytes) });
  }
  for (const turn of manifest.turns)
    for (const r of [turn.reviewer_response, turn.author_response].filter(Boolean)) {
      const bytes = git(['show', final + ':' + r.path]),
        blob = git(['rev-parse', final + ':' + r.path], 'utf8').trim();
      if ('sha256:' + hash(bytes) !== r.digest) fail('review-member-conflict');
      members.push({ revision: final, path: r.path, blob, sha256: hash(bytes) });
    }
  const verifier = committedVerifier(root, git);
  if (!verifier.sources.some((s) => s.path === 'scripts/lib/runtime-review-lineage-proof.mjs'))
    fail('verifier-source-uncommitted');
  const result = {
    schema: 'ai-peer-review.runtime-review-lineage-proof/v1',
    issue: 144,
    reviewId: p.review_id,
    producerProfile,
    reviewReference,
    producer: {
      packageName: image.package.name,
      packageVersion: image.package.version,
      runtimeImageDigest: image.digest,
      runtimeImageByteSha256: hash(imageBytes),
      fileCount: image.files.length,
      nodeMajor: journal.versions.node_major,
      sources: LINEAGE_PRODUCER_SOURCES,
    },
    verifier,
    attempt: {
      reviewId: p.review_id,
      eventCount: events.length,
      sequence: p.sequence,
      revision: p.revision,
      state: p.state,
      rawEventByteSha256: hash(eventBytes),
      canonicalEventDigest: lineage.attempts[0].event_log_digest,
      lineageReceiptByteSha256: hash(read(path.join(workspace, 'lineage-receipt.json'))),
      requestDigest: journal.request_digest,
      startupRequestByteSha256: hash(read(path.join(workspace, 'startup-request.json'))),
      registrationByteSha256: hash(read(journal.registration_file)),
      manualLaunchHistoryByteSha256: hash(historyBytes),
      launchStateByteSha256: hash(launchBytes),
      launchOperations: history.operations.map(({ intent_digest, status }) => ({
        intentDigest: intent_digest,
        status,
      })),
    },
    identities: {
      authorFingerprint: state.participants.author.session_fingerprint,
      reviewerFingerprint: state.participants.reviewer.session_fingerprint,
      requestedAuthor: p.startup.runtime.author ?? null,
      requestedReviewer: reviewer,
      selectionEvidence: 'requested-declared-and-provider-ack-not-per-turn-observation',
      authorityAssurance: manifest.authority_assurance,
    },
    members,
    checks: {
      normalCollateral: true,
      persistedEvents: true,
      completeLineage: true,
      producerStartupBinding: true,
      producerImage: true,
      producerSourceProfile: true,
      providerLaunchBinding: true,
      terminalTransaction: true,
      memberBytes: true,
      committedVerifier: true,
    },
    reproducibility: {
      localOriginalEventReplay: 'complete',
      ciOriginalEventReplay: 'unavailable',
      consumerEvidence: 'retained-reviewed-local-verification',
      assurance: manifest.authority_assurance,
    },
    observedAt: new Date().toISOString(),
  };
  if (!validateRuntimeLineageProof(result)) fail('generated-proof-grammar-invalid');
  return result;
}

const proofSchema = JSON.parse(
  readFileSync(
    new URL('../../schemas/runtime-review-lineage-proof-v1.json', import.meta.url),
    'utf8'
  )
);
export function validateRuntimeLineageProof(value) {
  try {
    return (
      validateContract(proofSchema, value).length === 0 &&
      value.reviewId === value.reviewReference.reviewId &&
      value.reviewId === value.attempt.reviewId &&
      value.attempt.eventCount === value.attempt.sequence &&
      value.identities.authorFingerprint !== value.identities.reviewerFingerprint &&
      value.identities.authorityAssurance === value.reproducibility.assurance &&
      equal(value.producer.sources, LINEAGE_PRODUCER_SOURCES) &&
      value.producer.runtimeImageDigest === LINEAGE_PRODUCER_RUNTIME_IMAGE.digest &&
      value.producer.runtimeImageByteSha256 === LINEAGE_PRODUCER_RUNTIME_IMAGE.byteSha256 &&
      value.producer.fileCount === LINEAGE_PRODUCER_RUNTIME_IMAGE.fileCount
    );
  } catch {
    return false;
  }
}
