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
export function extractRuntimeContractMapping(body) {
  if (typeof body !== 'string') fail('native-mapping-invalid');
  const section = (name) => {
    const matches = [...body.matchAll(new RegExp('^## ' + name + '$', 'gm'))];
    if (matches.length !== 1) fail('native-mapping-invalid');
    const start = matches[0].index;
    const rest = body.slice(start + matches[0][0].length);
    const end = rest.search(/^## /m);
    return body.slice(start, end < 0 ? undefined : start + matches[0][0].length + end);
  };
  const plan = section('Plan Metadata'),
    scope = section('Scope'),
    commands = section('Verification Commands');
  const originals = [...plan.matchAll(/^- \*\*Source-plan-commit\*\*: ([a-f0-9]+)$/gm)];
  const vc = [...commands.matchAll(/^- \[[ xX]\] `([^\n]+)` <!-- id=1 -->$/gm)];
  if (originals.length !== 1 || originals[0][1] !== ORIGINAL || vc.length !== 1)
    fail('native-mapping-invalid');
  return {
    repository: REPOSITORY,
    issue: 144,
    originalSourcePlanCommit: ORIGINAL,
    planMetadataSha256: hash(plan),
    scopeSha256: hash(scope.replace(/^(\s*[-*] )\[[ xX]\](?= )/gm, '$1[ ]')),
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
export function validateNativeApprovalSource({ transaction: t, retainedBody, source } = {}) {
  const c = source?.comment,
    marker = '<!-- aitm-owned-comment key="' + t?.ownedCommentKey + '" -->';
  if (
    !descriptorValid(t) ||
    !Buffer.isBuffer(retainedBody) ||
    hash(retainedBody) !== t.bodySha256 ||
    typeof source?.authenticatedActor !== 'string' ||
    !source.authenticatedActor ||
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
    const actor = read('user');
    if (typeof actor?.login !== 'string' || !actor.login)
      fail('approved-evidence-source-unavailable');
    return {
      authenticatedActor: actor.login,
      comment: read('repos/' + REPOSITORY + '/issues/comments/' + transaction.commentDatabaseId),
      issue: read('repos/' + REPOSITORY + '/issues/144'),
    };
  } catch {
    fail('approved-evidence-source-unavailable');
  }
}

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRuntimeLineageProof } from './runtime-review-lineage-proof.mjs';
import { checkNormalRuntimeReview } from '../check-runtime-contract-adoption.mjs';
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
const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourcePaths = () =>
  execFileSync(
    'git',
    [
      'ls-files',
      'scripts/check-runtime-contract-adoption.mjs',
      'scripts/lib',
      'src',
      'schemas',
      'package.json',
      'package-lock.json',
    ],
    {
      cwd: sourceRoot,
      encoding: 'utf8',
      env: Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_'))),
    }
  )
    .trim()
    .split('\n');
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
export function checkRetainedLineageProof({ receipt, reviewReference, artifacts } = {}) {
  const blockers = [];
  if (!validateRuntimeLineageProof(receipt))
    return {
      receiptCoherent: false,
      verifierCurrent: false,
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
      verifierCurrent: false,
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
  let verifierCurrent = false;
  try {
    const expected = sourcePaths();
    verifierCurrent =
      sourceKeys.size === expected.length &&
      expected.every((p) => {
        const ref = receipt.verifier.sources.find((x) => x.path === p);
        return ref?.sha256 === hash(readFileSync(path.join(sourceRoot, p)));
      });
  } catch {
    /* Missing fixed verifier closure refuses. */
  }
  if (!verifierCurrent) block('lineage-proof-verifier-current-source-mismatch');
  return {
    receiptCoherent,
    verifierCurrent,
    blockers: [...new Set(blockers)].sort(),
    originalPrivateReplay: 'unavailable',
  };
}
