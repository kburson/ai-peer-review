// @story #144
// Fixed document evidence reader. Selectors supply data, never commands or URLs.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseRawJson } from '../../src/api/canonical-json.mjs';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const exact = (v, keys) =>
  v !== null &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.keys(v).sort().join('|') === [...keys].sort().join('|');
const fail = (code) => {
  throw Error(code);
};
const REPOSITORY = 'kburson/ai-peer-review';
const ORIGINAL = '60efdbbeb60c83c1c56884491ae018eaea70d282';

function liveBodyLines(body) {
  // Match the native reviewed-scope v1 live-line boundary without importing AITM.
  // Offsets always refer to the original body; literal examples remain hashed.
  const result = [];
  let offset = 0,
    fence = null,
    comment = false;
  for (const raw of body.split('\n')) {
    const lineOffset = offset;
    offset += raw.length + 1;
    const marker = raw.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (
        marker &&
        marker[1][0] === fence[0] &&
        marker[1].length >= fence.length &&
        !marker[2].trim()
      )
        fence = null;
      continue;
    }
    if (comment) {
      const close = raw.indexOf('-->');
      if (close < 0) continue;
      comment = false;
      if (raw.slice(close + 3).trim()) fail('native-mapping-invalid');
      continue;
    }
    if (marker) {
      fence = marker[1];
      continue;
    }
    const begin = raw.indexOf('<!--');
    if (begin >= 0 && raw.indexOf('-->', begin) < 0) {
      if (raw.slice(0, begin).trim()) fail('native-mapping-invalid');
      comment = true;
      continue;
    }
    result.push({ raw, lineOffset });
  }
  if (fence || comment) fail('native-mapping-invalid');
  return result;
}

function stableScope(scope, live) {
  // Fixed compatibility with AITM reviewed-scope model/targets/record v1.
  // Native recording appends exactly one separator and a closed receipt pointer.
  // It grants no authority here; the approved record and native source still do.
  const pointerFamily = /<!--\s*aitm-reviewed-scope-evidence/;
  const pointer =
    / <!-- aitm-reviewed-scope-evidence comment="([1-9][0-9]{0,19})" sha256="([a-f0-9]{64})" lineage="([a-f0-9]{64})" -->$/;
  const verifier =
    /<!--\s*aitm-(?:verified(?:-by|-at)?|ac-evidence|dod-evidence)\b|\bvc-list\s*=|(?<![\w:])vc:[1-9][0-9]*(?![\w])/i;
  const owned = new Set([
    'agent review passed',
    'final review passed',
    'passed final human review',
    'story closed and moved to done',
    'timing data flushed to issue',
  ]);
  const comments = new Set(),
    lineages = new Set(),
    normalized = new Map();
  const { start, end, bytes } = scope;
  for (const { raw, lineOffset } of live) {
    const inScope = lineOffset >= start && lineOffset < end;
    if (inScope) normalized.set(lineOffset, raw.replace(/^(\s*[-*] )\[[ xX]\](?= )/gm, '$1[ ]'));
    if (!pointerFamily.test(raw)) continue;
    const match = raw.match(pointer);
    if (!inScope || !match) fail('native-mapping-invalid');
    const original = raw.slice(0, match.index);
    // A second, unknown or malformed pointer must never disappear with metadata.
    if (
      pointerFamily.test(original) ||
      !/^- \[[ x]\] .+$/.test(original) ||
      verifier.test(original)
    )
      fail('native-mapping-invalid');
    const label = original
      .slice(6)
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    if (
      !label ||
      owned.has(label) ||
      /^deep[- ]?dive complete$|^discussion complete$/i.test(label) ||
      comments.has(match[1]) ||
      lineages.has(match[3])
    )
      fail('native-mapping-invalid');
    comments.add(match[1]);
    lineages.add(match[3]);
    normalized.set(lineOffset, original.replace(/^(\s*[-*] )\[[ xX]\](?= )/gm, '$1[ ]'));
  }
  let scopeOffset = start;
  return bytes
    .split('\n')
    .map((line) => {
      const result = normalized.get(scopeOffset) ?? line;
      scopeOffset += line.length + 1;
      return result;
    })
    .join('\n');
}

function nativeVerificationTail(tail) {
  if (tail === '') return true;
  // Native Test owns this annotation; it is excluded from the command identity,
  // never interpreted as approval or verification authority by this reader.
  const marker = tail.match(/^ <!-- aitm-verified((?: [a-z][a-z-]*="[^"\n]*")+) -->$/);
  if (!marker) return false;
  const names = [...marker[1].matchAll(/ ([a-z][a-z-]*)="/g)].map((match) => match[1]);
  const allowed = new Set([
    'cmd',
    'exit',
    'sha',
    'ts',
    'evidence',
    'key',
    'vc-list',
    'worktree',
    'branch',
    'bound-issue',
  ]);
  return (
    new Set(names).size === names.length &&
    names.every((name) => allowed.has(name)) &&
    ['cmd', 'exit', 'sha', 'ts'].every((name) => names.includes(name))
  );
}

export function extractRuntimeContractMapping(body) {
  if (typeof body !== 'string') fail('native-mapping-invalid');
  const live = liveBodyLines(body);
  const section = (name) => {
    const matches = live.filter(({ raw }) => raw === '## ' + name);
    if (matches.length !== 1) fail('native-mapping-invalid');
    const start = matches[0].lineOffset;
    const end =
      live.find(({ raw, lineOffset }) => lineOffset > start && /^## /.test(raw))?.lineOffset ??
      body.length;
    return { start, end, bytes: body.slice(start, end) };
  };
  const plan = section('Plan Metadata'),
    scope = section('Scope'),
    commands = section('Verification Commands');
  const originals = [...plan.bytes.matchAll(/^- \*\*Source-plan-commit\*\*: ([a-f0-9]+)$/gm)];
  const vc = [...commands.bytes.matchAll(/^- \[[ xX]\] `([^\n]+)` <!-- id=1 -->([^\n]*)$/gm)];
  if (
    originals.length !== 1 ||
    originals[0][1] !== ORIGINAL ||
    vc.length !== 1 ||
    !nativeVerificationTail(vc[0][2])
  )
    fail('native-mapping-invalid');
  return {
    repository: REPOSITORY,
    issue: 144,
    originalSourcePlanCommit: ORIGINAL,
    planMetadataSha256: hash(plan.bytes),
    scopeSha256: hash(stableScope(scope, live)),
    vc1Sha256: hash(vc[0][1]),
  };
}
function descriptorValid(t) {
  return (
    exact(t, [
      'kind',
      'repository',
      'issue',
      'ownedCommentKey',
      'commentDatabaseId',
      'commentNodeId',
      'url',
      'authoredBy',
      'body',
      'bodySha256',
      'publishedAt',
      'observedAt',
    ]) &&
    t.kind === 'aitm-owned-comment' &&
    t.repository === REPOSITORY &&
    t.issue === 144 &&
    /^runtime-contract-approved-evidence\.review-[A-Za-z0-9._-]+$/.test(t.ownedCommentKey) &&
    Number.isSafeInteger(t.commentDatabaseId) &&
    t.commentDatabaseId > 0 &&
    typeof t.commentNodeId === 'string' &&
    /^IC_[A-Za-z0-9_-]+$/.test(t.commentNodeId) &&
    t.url ===
      'https://github.com/' + REPOSITORY + '/issues/144#issuecomment-' + t.commentDatabaseId &&
    typeof t.authoredBy === 'string' &&
    /^[A-Za-z0-9-]+$/.test(t.authoredBy) &&
    exact(t.body, ['revision', 'path', 'blob', 'sha256']) &&
    /^[a-f0-9]{40}([a-f0-9]{24})?$/.test(t.body.revision) &&
    /^[a-f0-9]{40}([a-f0-9]{24})?$/.test(t.body.blob) &&
    /^evidence\/portable-runtime\/contracts\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(
      t.body.path
    ) &&
    /^[a-f0-9]{64}$/.test(t.bodySha256) &&
    t.body.sha256 === t.bodySha256 &&
    [t.publishedAt, t.observedAt].every(
      (x) => typeof x === 'string' && Number.isFinite(Date.parse(x))
    ) &&
    Date.parse(t.observedAt) >= Date.parse(t.publishedAt)
  );
}
export function validateNativeApprovalDescriptor(value) {
  return descriptorValid(value);
}
export function validateNativeApprovalSource({ transaction: t, retainedBody, source } = {}) {
  const c = source?.comment,
    marker = '<!-- aitm-owned-comment key="' + t?.ownedCommentKey + '" -->';
  if (
    !descriptorValid(t) ||
    !Buffer.isBuffer(retainedBody) ||
    hash(retainedBody) !== t.bodySha256 ||
    !exact(source?.authentication, ['kind', 'host', 'repository', 'repositoryId']) ||
    source.authentication.kind !== 'github-api-credential' ||
    source.authentication.host !== 'github.com' ||
    source.authentication.repository !== REPOSITORY ||
    !Number.isSafeInteger(source.authentication.repositoryId) ||
    source.authentication.repositoryId <= 0 ||
    c?.id !== t.commentDatabaseId ||
    c?.node_id !== t.commentNodeId ||
    c?.html_url !== t.url ||
    c?.issue_url !== 'https://api.github.com/repos/' + REPOSITORY + '/issues/144' ||
    c?.user?.login !== t.authoredBy ||
    c?.created_at !== t.publishedAt ||
    typeof c?.body !== 'string' ||
    !Buffer.from(c.body).equals(retainedBody) ||
    c.body.split(marker).length !== 2
  )
    fail('approved-evidence-source-invalid');
  return true;
}
export function readNativeContractSource(transaction) {
  if (!descriptorValid(transaction)) fail('approved-evidence-source-invalid');
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([k]) => !['GH_HOST', 'GH_REPO', 'GH_DEBUG', 'GITHUB_API_URL'].includes(k)
    )
  );
  env.GH_HOST = 'github.com';
  const read = (endpoint) =>
    parseRawJson(
      execFileSync('gh', ['api', '--hostname', 'github.com', endpoint], {
        env,
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
        timeout: 30000,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    );
  try {
    // Resolve the same credential used by gh api, without persisting or exposing
    // its bytes. A successful authenticated fixed repository read works for both
    // user and Actions installation tokens; neither implies a human reader.
    const credential = execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], {
      env,
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    if (!credential || /[\r\n]/.test(credential)) fail('approved-evidence-source-unavailable');
    const repository = read('repos/' + REPOSITORY);
    if (
      repository?.full_name !== REPOSITORY ||
      !Number.isSafeInteger(repository.id) ||
      repository.id <= 0
    )
      fail('approved-evidence-source-unavailable');
    return {
      authentication: {
        kind: 'github-api-credential',
        host: 'github.com',
        repository: REPOSITORY,
        repositoryId: repository.id,
      },
      comment: read('repos/' + REPOSITORY + '/issues/comments/' + transaction.commentDatabaseId),
      issue: read('repos/' + REPOSITORY + '/issues/144'),
    };
  } catch {
    fail('approved-evidence-source-unavailable');
  }
}

import { validateRuntimeLineageProof } from './runtime-review-lineage-proof.mjs';
import {
  checkNormalRuntimeReview,
  validateRuntimeContractRecord,
  validateRuntimeContractEvidenceApproval,
  readRuntimeContractGitBlob,
} from '../check-runtime-contract-adoption.mjs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const equal = (a, b) => {
  const canonical = (v) =>
    Array.isArray(v)
      ? v.map(canonical)
      : v !== null && typeof v === 'object'
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, canonical(v[k])])
          )
        : v;
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
};
function pinned(ref, artifacts) {
  if (
    !exact(ref, ['revision', 'path', 'blob', 'sha256']) ||
    !/^[a-f0-9]{40}([a-f0-9]{24})?$/.test(ref.revision ?? '') ||
    !/^[a-f0-9]{40}([a-f0-9]{24})?$/.test(ref.blob ?? '') ||
    !/^[a-f0-9]{64}$/.test(ref.sha256 ?? '') ||
    typeof ref.path !== 'string' ||
    !/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(ref.path) ||
    /^(?:test|tests|node_modules|\.scratch)\//.test(ref.path)
  )
    return null;
  const bytes = artifacts instanceof Map ? artifacts.get(ref.revision + ':' + ref.path) : null;
  if (!Buffer.isBuffer(bytes) || hash(bytes) !== ref.sha256) return null;
  const blob = createHash(ref.blob.length === 64 ? 'sha256' : 'sha1')
    .update(Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes]))
    .digest('hex');
  return blob === ref.blob ? bytes : null;
}
// This is retained local-verification evidence, never private journal replay on CI.
export function checkRetainedLineageProof({
  receipt,
  reviewReference,
  artifacts,
  approvedVerifierReference,
} = {}) {
  const blockers = [];
  if (!validateRuntimeLineageProof(receipt))
    return {
      receiptCoherent: false,
      verifierPinned: false,
      adoptionAuthority: false,
      blockers: ['lineage-proof-invalid'],
      originalPrivateReplay: 'unavailable',
    };
  const block = (x) => blockers.push(x);
  if (!equal(receipt.reviewReference, reviewReference)) block('lineage-proof-review-mismatch');
  const normal = checkNormalRuntimeReview({
    proof: reviewReference,
    artifacts,
    producerVersion: '0.4.1',
  });
  if (!normal.collateralComplete) {
    block('lineage-proof-normal-collateral-incomplete');
    return {
      receiptCoherent: false,
      verifierPinned: false,
      adoptionAuthority: false,
      blockers: [...new Set(blockers)].sort(),
      originalPrivateReplay: 'unavailable',
    };
  }
  const bytes = pinned(reviewReference?.manifest, artifacts);
  let manifest;
  try {
    const text = bytes?.toString('utf8');
    manifest = parseRawJson(
      text?.startsWith('{') ? text : text.match(/^`{3}json\r?\n([\s\S]*?)^`{3}\s*$/m)[1]
    );
  } catch {
    block('lineage-proof-manifest-unavailable');
  }
  if (manifest) {
    const attempt = manifest.lineage_receipt?.attempts?.at(-1);
    if (
      manifest.lineage_receipt?.attempts?.length !== 1 ||
      attempt?.review_id !== receipt.reviewId ||
      attempt?.event_log_digest !== receipt.attempt.canonicalEventDigest
    )
      block('lineage-proof-canonical-receipt-mismatch');
    if (
      manifest.participants?.author?.session_fingerprint !== receipt.identities.authorFingerprint ||
      manifest.participants?.reviewer?.session_fingerprint !==
        receipt.identities.reviewerFingerprint ||
      manifest.authority_assurance !== receipt.identities.authorityAssurance ||
      !equal(manifest.runtime?.author ?? null, receipt.identities.requestedAuthor) ||
      !equal(manifest.runtime?.reviewer, receipt.identities.requestedReviewer)
    )
      block('lineage-proof-identity-mismatch');
    const required = (manifest.artifact_history ?? []).map((x) => ({
      revision: x.commit,
      path: x.path,
      blob: x.blob,
      sha256: x.digest?.slice(7),
    }));
    for (const turn of manifest.turns ?? [])
      for (const x of [turn.author_response, turn.reviewer_response].filter(Boolean)) {
        const matches = receipt.members.filter(
          (r) =>
            r.revision === reviewReference.finalization.revision &&
            r.path === x.path &&
            r.sha256 === x.digest?.slice(7)
        );
        if (matches.length !== 1) block('lineage-proof-member-set-incomplete');
      }
    if (required.some((x) => receipt.members.filter((r) => equal(r, x)).length !== 1))
      block('lineage-proof-member-set-incomplete');
  }
  const memberKeys = new Set();
  for (const ref of receipt.members) {
    const key = ref.revision + ':' + ref.path;
    if (memberKeys.has(key) || !pinned(ref, artifacts)) block('lineage-proof-member-bytes-invalid');
    memberKeys.add(key);
  }
  const sourceKeys = new Set();
  for (const ref of receipt.verifier.sources) {
    if (
      sourceKeys.has(ref.path) ||
      ref.revision !== receipt.verifier.revision ||
      !pinned(ref, artifacts)
    )
      block('lineage-proof-verifier-bytes-invalid');
    sourceKeys.add(ref.path);
  }
  const receiptCoherent = blockers.length === 0;
  // This exact source set must come from a separately normally reviewed record or
  // genuine governed post-finalization approval. Passing data here checks
  // coherence only; this helper never supplies that independent authority.
  const verifierPinned =
    receiptCoherent &&
    exact(approvedVerifierReference, ['revision', 'sources']) &&
    equal(approvedVerifierReference, receipt.verifier);
  if (!verifierPinned) block('lineage-proof-approved-verifier-mismatch');

  return {
    receiptCoherent,
    verifierPinned,
    adoptionAuthority: false,
    blockers: [...new Set(blockers)].sort(),
    originalPrivateReplay: 'unavailable',
  };
}

const CHECKER_SCHEMA_PATHS = [
  'schemas/runtime-contract-adoption-v1.json',
  'schemas/runtime-contract-evidence-approval-v1.json',
  'schemas/runtime-review-lineage-proof-v1.json',
];
const CHECKER_IMPORTER_PATHS = [
  'scripts/lib/runtime-review-grammar-v0.4.1.mjs',
  ...[
    'compatibility.mjs',
    'events.mjs',
    'record-lineage.mjs',
    'reducer.mjs',
    'runtime-descriptor.mjs',
    'runtime-v1.json',
  ].map((p) => 'scripts/lib/review-grammar-v0.4.1/' + p),
];
// Fixed data-only provenance: relevant versioned grammar evolution needs reviewed
// compatibility; unrelated later application/schema additions do not change it.
export function checkRuntimeContractConsumerPins({ governance, artifacts } = {}) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  try {
    return [
      [governance?.checkerSchemas, CHECKER_SCHEMA_PATHS],
      [governance?.checkerImporterSources, CHECKER_IMPORTER_PATHS],
    ].every(
      ([refs, paths]) =>
        Array.isArray(refs) &&
        refs.length === paths.length &&
        paths.every((p) => {
          const matches = refs.filter((r) => r?.path === p);
          if (matches.length !== 1) return false;
          const bytes = pinned(matches[0], artifacts);
          return bytes !== null && bytes.equals(readFileSync(path.join(root, p)));
        })
    );
  } catch {
    return false;
  }
}

// The executing checker is fixed local source, never selector-chosen code. This
// checks its current commit separately from each historical generator closure.
function currentCheckerCommitted() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_'))
  );
  const git = (args, encoding = null) =>
    execFileSync('git', args, {
      cwd: root,
      env,
      encoding,
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  try {
    const revision = git(['rev-parse', '--verify', 'HEAD'], 'utf8').trim();
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
    const required = [
      'scripts/check-runtime-contract-adoption.mjs',
      'scripts/lib/runtime-contract-evidence.mjs',
      'scripts/lib/runtime-review-lineage-proof.mjs',
      'scripts/lib/runtime-review-grammar-v0.4.1.mjs',
      'schemas/runtime-contract-adoption-v1.json',
      'schemas/runtime-contract-evidence-approval-v1.json',
    ];
    return (
      required.every((p) => files.includes(p)) &&
      files.every((p) =>
        readFileSync(path.join(root, p)).equals(readRuntimeContractGitBlob(git, revision, p))
      )
    );
  } catch {
    return false;
  }
}

// Compare the explicit decision to the producer's full requested identity. CLI
// selector and provider are distinct fields; no aliases or authority are inferred.
export function matchesRuntimeContractReviewSelection({ selection, requestedReviewer } = {}) {
  return (
    exact(selection, ['selector', 'provider', 'host', 'modelId', 'effort']) &&
    exact(requestedReviewer, [
      'selector',
      'provider',
      'host',
      'model_id',
      'model_display',
      'effort',
    ]) &&
    requestedReviewer.selector === selection.selector &&
    requestedReviewer.provider === selection.provider &&
    requestedReviewer.host === selection.host &&
    requestedReviewer.model_id === selection.modelId &&
    requestedReviewer.effort === selection.effort
  );
}

export function verifyGovernedRuntimeContractEvidence({
  record,
  recordReference,
  approvalReview,
  lineageProofs,
  approvedEvidenceTransaction,
  artifacts,
} = {}) {
  const blockers = [];
  const block = (x) => blockers.push(x);
  const result = () => ({
    adoptionEvidenceComplete: blockers.length === 0,
    blockers: [...new Set(blockers)].sort(),
    originalPrivateReplay: 'unavailable',
    consumedEvidence: 'retained-reviewed-local-verification',
  });
  const readJson = (ref) => {
    const bytes = pinned(ref, artifacts);
    if (!bytes) throw Error('governed-evidence-bytes-invalid');
    return parseRawJson(bytes.toString('utf8'));
  };
  if (
    !validateRuntimeContractRecord(record) ||
    !recordReference ||
    !approvalReview ||
    !Array.isArray(lineageProofs) ||
    !approvedEvidenceTransaction
  ) {
    block('governed-evidence-incomplete');
    return result();
  }
  try {
    const g = record.governance;
    if (!checkRuntimeContractConsumerPins({ governance: g, artifacts }))
      block('governed-consumer-version-provenance-invalid');
    const normal = checkNormalRuntimeReview({
      proof: approvalReview,
      artifacts,
      producerVersion: '0.4.1',
    });
    const recordBytes = pinned(recordReference, artifacts);
    if (
      !normal.collateralComplete ||
      !equal(approvalReview.subject, recordReference) ||
      !recordBytes ||
      !equal(readJson(recordReference), record)
    ) {
      block('governed-record-acceptance-invalid');
      return result();
    }
    const expectedReviews = [
      record.amendmentReview,
      record.evidence.planReview,
      g.companionPlanReview,
      g.canonicalPlanReview,
    ];
    if (
      !equal(g.canonicalPlanReview.subject, g.canonicalPlan) ||
      !equal(g.companionPlanReview.subject, g.companionPlan) ||
      expectedReviews.some((r) => g.priorLineage.filter((x) => equal(x.review, r)).length !== 1)
    )
      block('governed-prior-review-set-invalid');
    for (const ref of [g.immutableSpecification, g.canonicalPlan, g.companionPlan])
      if (!pinned(ref, artifacts)) block('governed-plan-source-invalid');
    for (const entry of g.priorLineage) {
      const receipt = readJson(entry.receipt),
        verifier = readJson(entry.verifier);
      if (
        equal(entry.review, g.canonicalPlanReview) &&
        receipt.identities.authorFingerprint !== g.expectedEvidenceApprover.authorSessionFingerprint
      )
        block('governed-root-author-fingerprint-mismatch');
      const proof = checkRetainedLineageProof({
        receipt,
        reviewReference: entry.review,
        artifacts,
        approvedVerifierReference: verifier,
      });
      if (!proof.receiptCoherent || !proof.verifierPinned) block('governed-prior-lineage-invalid');
    }
    const ids = [];
    for (const target of g.normativeTargets) {
      const bytes = pinned(target.source, artifacts),
        text = bytes?.toString('utf8');
      if (
        !equal(target.source, g.immutableSpecification) ||
        !text ||
        target.detailedSchemaFrozen !== false ||
        target.sections.some(
          (section) =>
            !text
              .split('\n')
              .some(
                (line) => /^#{1,6} /.test(line) && line.slice(line.indexOf(' ') + 1) === section
              )
        )
      )
        block('governed-normative-source-invalid');
      ids.push(...target.schemaIdentifiers);
    }
    const expectedIds = [
      'record',
      'series-index',
      'patch-chain',
      'response-envelope',
      'attempt-metrics',
      'measurement',
      'aggregate-coverage',
      'telemetry-amendment',
    ].map((x) => 'ai-peer-review.' + x + '/v1');
    if (ids.length !== 8 || expectedIds.some((id) => ids.filter((x) => x === id).length !== 1))
      block('governed-normative-targets-invalid');
    if (blockers.length) return result();
    const t = approvedEvidenceTransaction,
      body = pinned(t.body, artifacts);
    if (
      !body ||
      t.authoredBy !== g.expectedEvidenceApprover.githubLogin ||
      g.expectedEvidenceApprover.role !== 'orchestrator' ||
      t.ownedCommentKey !== 'runtime-contract-approved-evidence.' + approvalReview.reviewId
    ) {
      block('approved-evidence-root-identity-invalid');
      return result();
    }
    const blocks = [...body.toString('utf8').matchAll(/^`{3}json\r?\n([\s\S]*?)^`{3}\s*$/gm)];
    if (blocks.length !== 1) {
      block('approved-evidence-payload-invalid');
      return result();
    }
    const payload = parseRawJson(blocks[0][1]);
    if (
      !validateRuntimeContractEvidenceApproval(payload) ||
      !equal(payload.record, recordReference) ||
      !equal(payload.approvalReview, approvalReview) ||
      !equal(payload.canonicalPlanReview, g.canonicalPlanReview) ||
      !equal(payload.nativeMapping, g.nativeMapping) ||
      payload.nativeTransaction.actorSessionFingerprint !==
        g.expectedEvidenceApprover.authorSessionFingerprint ||
      !equal(payload.lineageProofs, lineageProofs) ||
      payload.nativeTransaction.ownedCommentKey !== t.ownedCommentKey ||
      payload.authorityAssurance !== normal.assurance[0] ||
      normal.assurance.length !== 1
    ) {
      block('approved-evidence-payload-invalid');
      return result();
    }
    if (
      lineageProofs.length !== 5 ||
      g.priorLineage.some((x) => lineageProofs.filter((y) => equal(x, y)).length !== 1)
    ) {
      block('approved-evidence-lineage-set-invalid');
      return result();
    }
    const own = lineageProofs.filter((x) => equal(x.review, approvalReview));
    if (
      own.length !== 1 ||
      lineageProofs.filter((x) => x.review.reviewId === approvalReview.reviewId).length !== 1
    ) {
      block('approved-evidence-own-terminal-missing');
      return result();
    }
    for (const entry of lineageProofs) {
      if (!exact(entry, ['review', 'receipt', 'verifier'])) {
        block('approved-evidence-lineage-set-invalid');
        continue;
      }
      const receipt = readJson(entry.receipt);
      if (equal(entry.review, approvalReview)) {
        const requested = receipt.identities?.requestedReviewer,
          selected = g.recordReviewSelection;
        if (
          !matchesRuntimeContractReviewSelection({
            selection: selected,
            requestedReviewer: requested,
          })
        )
          block('governed-record-review-selection-mismatch');
      }
      const proof = checkRetainedLineageProof({
        receipt,
        reviewReference: entry.review,
        artifacts,
        approvedVerifierReference: readJson(entry.verifier),
      });
      if (!proof.receiptCoherent || !proof.verifierPinned)
        block('approved-evidence-lineage-invalid');
    }
    if (
      !equal(
        payload.rootInspection.receiptReferences,
        lineageProofs.map((x) => x.receipt)
      ) ||
      !equal(
        payload.rootInspection.verifierReferences,
        lineageProofs.map((x) => x.verifier)
      ) ||
      Date.parse(payload.observedAt) > Date.parse(t.publishedAt) ||
      Date.parse(payload.nativeTransaction.observedAt) > Date.parse(t.publishedAt)
    )
      block('approved-evidence-inspection-invalid');
    if (blockers.length) return result();
    // Authenticate the actual retained root-authored native transaction. Caller
    // objects or a successful source fixture cannot replace this fixed reader.
    const source = readNativeContractSource(t);
    validateNativeApprovalSource({ transaction: t, retainedBody: body, source });
    if (
      source.issue?.number !== 144 ||
      !equal(extractRuntimeContractMapping(source.issue.body), g.nativeMapping)
    )
      block('native-mapping-current-source-mismatch');
    if (!currentCheckerCommitted()) block('current-checker-source-uncommitted');
  } catch (error) {
    block(
      error?.message === 'approved-evidence-source-unavailable'
        ? error.message
        : 'governed-evidence-invalid'
    );
  }
  return result();
}
