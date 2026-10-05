#!/usr/bin/env node
// @story #144
// Document-only verification. This module never starts or changes a runtime.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseResponse } from '../src/collateral/responses.mjs';
import { inspectRecordLineage } from '../src/protocol/record-lineage.mjs';
import { parseRawJson } from '../src/api/canonical-json.mjs';
import { validateContract } from '../src/api/validate.mjs';
import { sealManifest } from '../src/manifest/render.mjs';

const ASSURANCES = JSON.parse(
  readFileSync(new URL('../schemas/response-v1.json', import.meta.url), 'utf8')
).properties.authority_assurance.enum.filter((strength) => strength !== 'unverified-test');
const SHA = /^[a-f0-9]{64}$/;
const OBJECT = /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/;
const OWNERS = { runtimePolicy: 102, evidence: 30, analytics: 34, telemetry: 109 };
const FIELDS = [
  'schema',
  'issue',
  ...Object.keys(OWNERS),
  'amendment',
  'amendmentReview',
  'reviewedDigests',
  'schemas',
  'decisions',
  'unresolvedConflicts',
  'activationBinding',
];
const DECISIONS = {
  runtimeInstallation: ['current-global', 'reviewed-coexistence'],
  policyAuthority: ['exclusive-primary', 'reviewed-layered-policy'],
  legacyRecovery: ['drain-before-replacement', 'reviewed-retained-runtime-recovery'],
  evidenceIntegration: ['owner30-canonical'],
  telemetryIntegration: ['exact-attempt'],
  responseCompatibility: ['contextual-schema-artifacts'],
};
const INTERFACES = [
  'assertSelectedRuntime',
  'withPrimaryAdmissionFence',
  'resolvePrimaryAuthority',
  'inspectPrimaryReviewInventory',
];
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const blob = (bytes, algorithm) =>
  createHash(algorithm)
    .update(Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes]))
    .digest('hex');
const object = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const exact = (x, keys) =>
  object(x) && Object.keys(x).sort().join('|') === [...keys].sort().join('|');
const safePath = (p) =>
  typeof p === 'string' &&
  p.length > 0 &&
  !path.posix.isAbsolute(p) &&
  !p.includes('\\') &&
  !/[\0\r\n:]/.test(p) &&
  p.split('/').every((s) => s && s !== '.' && s !== '..');
const fixturePath = (p) => /^(?:test|tests|\.scratch|node_modules)\//.test(p);

const manifestSchemas = new Map();
function schemaDocument(name, producerVersion = '0.4.0') {
  const cacheKey = producerVersion + ':' + name;
  if (!manifestSchemas.has(cacheKey)) {
    const file = name.startsWith('ai-peer-review.')
      ? name.slice('ai-peer-review.'.length).replace('/', '-') + '.json'
      : name;
    if (!/^[a-z0-9-]+\.json$/.test(file)) throw Error('manifest-schema-reference-invalid');
    const document = JSON.parse(
      readFileSync(
        new URL(
          producerVersion === '0.4.1' && file === 'runtime-v1.json'
            ? './lib/review-grammar-v0.4.1/runtime-v1.json'
            : '../schemas/' + file,
          import.meta.url
        ),
        'utf8'
      )
    );
    manifestSchemas.set(cacheKey, document);
  }
  return manifestSchemas.get(cacheKey);
}
// Interpret only the checked-in document schema vocabulary. Unknown schema
// keywords or unresolved references refuse rather than silently dropping rules.
function documentValid(schema, value, root, depth = 0, producerVersion = '0.4.0') {
  if (depth > 128 || !object(schema)) return false;
  const vocabulary = [
    '$schema',
    '$id',
    '$defs',
    '$ref',
    'title',
    'description',
    'type',
    'const',
    'enum',
    'required',
    'properties',
    'additionalProperties',
    'items',
    'minItems',
    'maxItems',
    'uniqueItems',
    'minLength',
    'maxLength',
    'pattern',
    'minimum',
    'maximum',
    'format',
    'anyOf',
    'oneOf',
    'allOf',
    'if',
    'then',
    'else',
    'contains',
  ];
  if (Object.keys(schema).some((key) => !vocabulary.includes(key))) return false;
  if (schema.$ref) {
    const [name, fragment = ''] = schema.$ref.split('#');
    const targetRoot = name ? schemaDocument(name, producerVersion) : root;
    let target = targetRoot;
    for (const key of fragment.split('/').slice(1))
      target = target?.[key.replaceAll('~1', '/').replaceAll('~0', '~')];
    if (!documentValid(target, value, targetRoot, depth + 1, producerVersion)) return false;
  }
  if (
    schema.anyOf &&
    !schema.anyOf.some((s) => documentValid(s, value, root, depth + 1, producerVersion))
  )
    return false;
  if (
    schema.oneOf &&
    schema.oneOf.filter((s) => documentValid(s, value, root, depth + 1, producerVersion)).length !==
      1
  )
    return false;
  const leaf = { ...schema };
  for (const key of [
    '$ref',
    'anyOf',
    'oneOf',
    'allOf',
    'if',
    'then',
    'else',
    'contains',
    'properties',
    'items',
    'additionalProperties',
  ])
    delete leaf[key];
  if (validateContract(leaf, value).length) return false;
  if (schema.format !== undefined) {
    if (
      schema.format !== 'date-time' ||
      typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
      !Number.isFinite(Date.parse(value))
    )
      return false;
  }
  if (Array.isArray(value)) {
    if (
      schema.items &&
      !value.every((v) => documentValid(schema.items, v, root, depth + 1, producerVersion))
    )
      return false;
    if (
      schema.contains &&
      !value.some((v) => documentValid(schema.contains, v, root, depth + 1, producerVersion))
    )
      return false;
  } else if (object(value)) {
    for (const [key, member] of Object.entries(value)) {
      if (Object.hasOwn(schema.properties ?? {}, key)) {
        if (!documentValid(schema.properties[key], member, root, depth + 1, producerVersion))
          return false;
      } else if (schema.additionalProperties === false) return false;
      else if (
        object(schema.additionalProperties) &&
        !documentValid(schema.additionalProperties, member, root, depth + 1, producerVersion)
      )
        return false;
    }
  }
  for (const clause of schema.allOf ?? [])
    if (!documentValid(clause, value, root, depth + 1, producerVersion)) return false;
  if (schema.if) {
    const branch = documentValid(schema.if, value, root, depth + 1, producerVersion)
      ? schema.then
      : schema.else;
    if (branch && !documentValid(branch, value, root, depth + 1, producerVersion)) return false;
  }
  return true;
}
export function validateRuntimeReviewManifest(model, producerVersion = '0.4.0') {
  try {
    if (!['0.4.0', '0.4.1'].includes(producerVersion)) return false;
    const schema = schemaDocument('manifest-v1.json', producerVersion);
    if (!documentValid(schema, model, schema, 0, producerVersion)) return false;
    sealManifest(model); // Canonical normal-mode terminal coherence, not event lineage.
    return true;
  } catch {
    return false;
  }
}

function createReviewContext({ artifacts, block, assurance, producerVersion = '0.4.0' }) {
  const get = (key) => (artifacts instanceof Map ? artifacts.get(key) : undefined);
  const verified = (ref) => {
    if (
      !exact(ref, ['revision', 'path', 'blob', 'sha256']) ||
      !OBJECT.test(ref.revision ?? '') ||
      !OBJECT.test(ref.blob ?? '') ||
      !SHA.test(ref.sha256 ?? '') ||
      !safePath(ref.path)
    ) {
      block('artifact-reference-invalid');
      return null;
    }
    if (fixturePath(ref.path)) {
      block('fixture-authority-forbidden');
      return null;
    }
    const bytes = get(ref.revision + ':' + ref.path);
    if (!Buffer.isBuffer(bytes)) {
      block('artifact-unavailable');
      return null;
    }
    if (hash(bytes) !== ref.sha256) {
      block('artifact-digest-mismatch');
      return null;
    }
    if (blob(bytes, ref.blob.length === 64 ? 'sha256' : 'sha1') !== ref.blob) {
      block('artifact-blob-mismatch');
      return null;
    }
    return bytes;
  };
  const json = (ref) => {
    const bytes = verified(ref);
    if (!bytes) return null;
    try {
      const text = bytes.toString('utf8');
      if (ref.path.endsWith('.md')) {
        const match = text.match(/^```json\r?\n([\s\S]*?)^\`\`\`\s*$/m);
        if (!match) throw Error('manifest-json');
        return parseRawJson(match[1]);
      }
      return parseRawJson(text);
    } catch {
      block('artifact-json-invalid');
      return null;
    }
  };
  const sameSubject = (a, b) =>
    a?.path === b?.path &&
    a?.revision === b?.revision &&
    a?.blob === b?.blob &&
    a?.sha256 === b?.sha256;
  const review = (proof, subject) => {
    if (
      !exact(proof, ['reviewId', 'subject', 'manifest', 'finalResponse', 'finalization']) ||
      !sameSubject(proof.subject, subject) ||
      !proof.reviewId
    ) {
      block('review-proof-incomplete');
      return;
    }
    verified(subject);
    const manifest = json(proof.manifest),
      bytes = verified(proof.finalResponse);
    if (!manifest || !bytes) {
      block('review-proof-incomplete');
      return;
    }
    if (!validateRuntimeReviewManifest(manifest, producerVersion)) block('review-manifest-invalid');
    if (
      manifest.schema !== 'ai-peer-review.manifest/v1' ||
      manifest.review_id !== proof.reviewId ||
      manifest.status !== 'accepted' ||
      manifest.acceptance_basis !== 'reviewer-consensus'
    )
      block('review-not-accepted');
    if (manifest.commit_mode !== 'normal' || !OBJECT.test(manifest.final_commit ?? ''))
      block('review-mode-not-normal');
    const author = manifest.participants?.author?.session_fingerprint;
    const reviewer = manifest.participants?.reviewer?.session_fingerprint;
    if (
      !/^sha256:[a-f0-9]{64}$/.test(author ?? '') ||
      !/^sha256:[a-f0-9]{64}$/.test(reviewer ?? '') ||
      author === reviewer
    )
      block('review-participant-conflict');
    const history = manifest.artifact_history?.at(-1),
      turn = manifest.turns?.at(-1);
    const finalization = proof.finalization;
    const message = get('commit:' + finalization?.revision);
    if (
      !exact(finalization, ['revision', 'sha256']) ||
      !OBJECT.test(finalization.revision ?? '') ||
      !SHA.test(finalization.sha256 ?? '') ||
      !Buffer.isBuffer(message) ||
      hash(message) !== finalization.sha256
    ) {
      block('review-finalization-incomplete');
    } else {
      if (get('parent:' + finalization.revision) !== manifest.final_commit)
        block('review-finalization-parent-mismatch');
      for (const ref of [proof.manifest, proof.finalResponse]) {
        const committed = get('tree:' + finalization.revision + ':' + ref.path);
        const pinned = get(ref.revision + ':' + ref.path);
        if (!Buffer.isBuffer(committed) || !Buffer.isBuffer(pinned) || !committed.equals(pinned))
          block('review-finalization-tree-mismatch');
      }
      const trailers = {
        'Peer-Review-ID': proof.reviewId,
        'Peer-Review-Turn': String((turn?.turn ?? 0) + 1),
        'Peer-Review-Artifact-Blob': subject.blob,
        'Peer-Review-Acceptance': 'sha256:' + proof.finalResponse.sha256,
        'Peer-Review-Manifest': 'sha256:' + proof.manifest.sha256,
      };
      for (const [key, value] of Object.entries(trailers)) {
        const lines = message
          .toString('utf8')
          .split('\n')
          .filter((line) => line.startsWith(key + ': '));
        if (lines.length !== 1 || lines[0] !== key + ': ' + value)
          block('review-finalization-mismatch');
      }
    }
    if (
      manifest.artifact_path !== subject.path ||
      history?.path !== subject.path ||
      history?.commit !== subject.revision ||
      history?.blob !== subject.blob ||
      history?.digest !== 'sha256:' + subject.sha256
    )
      block('review-subject-mismatch');
    const lineage = inspectRecordLineage(manifest);
    if (lineage.status !== 'complete' || lineage.attempts.at(-1)?.review_id !== proof.reviewId)
      block('review-lineage-incomplete');
    if (
      turn?.decision !== 'accepted' ||
      turn?.reviewer_response?.path !== proof.finalResponse.path ||
      turn?.reviewer_response?.digest !== 'sha256:' + proof.finalResponse.sha256
    )
      block('review-response-mismatch');
    try {
      const response = parseResponse(bytes);
      const m = response.metadata;
      if (
        m.review_id !== proof.reviewId ||
        m.role !== 'reviewer' ||
        m.turn !== turn?.turn ||
        m.commit_mode !== 'normal' ||
        m.agent.session_fingerprint !== reviewer ||
        m.artifact_path !== subject.path ||
        m.artifact_commit !== subject.revision ||
        m.artifact_blob !== subject.blob ||
        m.artifact_digest !== 'sha256:' + subject.sha256 ||
        !Number.isFinite(Date.parse(m.submitted_at)) ||
        response.sections.find((s) => s.heading === 'Decision')?.content.trim() !== 'accepted'
      )
        block('review-response-mismatch');
      if (m.authority_assurance !== manifest.authority_assurance)
        block('review-assurance-mismatch');
    } catch {
      block('review-response-invalid');
    }
    if (!ASSURANCES.includes(manifest.authority_assurance)) block('review-assurance-invalid');
    else assurance.add(manifest.authority_assurance);
  };
  return { get, verified, json, sameSubject, review };
}

export function checkNormalRuntimeReview({ proof, artifacts, producerVersion } = {}) {
  const blockers = [],
    assurance = new Set();
  if (!['0.4.0', '0.4.1'].includes(producerVersion))
    blockers.push('review-producer-profile-unsupported');
  else
    createReviewContext({
      artifacts,
      block: (code) => blockers.push(code),
      assurance,
      producerVersion,
    }).review(proof, proof?.subject);
  return {
    collateralComplete: blockers.length === 0,
    blockers: [...new Set(blockers)].sort(),
    assurance: [...assurance].sort(),
    privateEventReplay: 'not-checked',
  };
}

export function checkRuntimeContractAdoption({
  record,
  artifacts,
  recordReference,
  approvalReview,
  activationAddendum,
  mode = 'publication',
} = {}) {
  const contractBlockers = [],
    activationBlockers = [],
    assurance = new Set();
  const block = (code) => contractBlockers.push(code);
  if (!['publication', 'adoption-only'].includes(mode)) block('verification-mode-invalid');
  const { get, verified, json, sameSubject, review } = createReviewContext({
    artifacts,
    block,
    assurance,
  });
  if (
    !exact(record, FIELDS) ||
    record.schema !== 'ai-peer-review.runtime-contract-adoption/v1' ||
    record.issue !== 144
  )
    block('record-schema-invalid');
  if (!object(record))
    return {
      mode,
      contractAdopted: false,
      activationAuthorized: false,
      publicationAllowed: false,
      contractBlockers,
      activationBlockers,
      assurance: [],
    };
  const nativeIds = new Set();
  for (const [role, issue] of Object.entries(OWNERS)) {
    const owner = record[role];
    if (
      !exact(owner, [
        'issue',
        'boundedSubsection',
        'bundle',
        'reconciliation',
        'boundedPlan',
        'planReview',
        'nativeAdoption',
        'preservedBaselines',
        'remainingObligations',
      ]) ||
      owner.issue !== issue
    ) {
      block(role + '-owner-mismatch');
      continue;
    }
    verified(owner.reconciliation);
    const planBytes = verified(owner.boundedPlan);
    review(owner.planReview, owner.boundedPlan);
    if (
      !sameSubject(owner.reconciliation, record.amendment) ||
      owner.bundle !== 'A' ||
      typeof owner.boundedSubsection !== 'string' ||
      !owner.boundedSubsection.startsWith('### #' + issue + ' — ')
    )
      block('owner-bounded-contract-invalid');
    if (
      !Array.isArray(owner.preservedBaselines) ||
      owner.preservedBaselines.length === 0 ||
      owner.preservedBaselines.some(
        (x) =>
          !exact(x, ['kind', 'status', 'reference']) ||
          typeof x.kind !== 'string' ||
          !x.kind ||
          typeof x.status !== 'string' ||
          !x.status
      )
    )
      block('owner-preserved-baselines-invalid');
    else
      for (const baseline of owner.preservedBaselines)
        if (baseline.reference !== null) verified(baseline.reference);
    if (
      !Array.isArray(owner.remainingObligations) ||
      owner.remainingObligations.length === 0 ||
      owner.remainingObligations.some((x) => typeof x !== 'string' || !x.trim())
    )
      block('owner-remaining-obligations-invalid');
    const proof = owner.nativeAdoption;
    if (
      !exact(proof, [
        'kind',
        'repository',
        'ownerIssue',
        'ownedCommentKey',
        'commentDatabaseId',
        'commentNodeId',
        'url',
        'body',
        'bodySha256',
        'nativeReceipt',
        'publishedAt',
        'observedAt',
      ])
    ) {
      block('owner-native-proof-invalid');
      continue;
    }
    const body = verified(proof.body),
      receipt = json(proof.nativeReceipt);
    const stamp = (x) => typeof x === 'string' && Number.isFinite(Date.parse(x));
    const integer = (x) => Number.isSafeInteger(x) && x > 0;
    const strings = (x, keys) =>
      keys.every((key) => typeof x?.[key] === 'string' && x[key].length > 0);
    const comment = receipt?.comment,
      native = receipt?.native,
      accepted = receipt?.acceptedOwnerPlan;
    const expectedUrl =
      'https://github.com/kburson/ai-peer-review/issues/' +
      issue +
      '#issuecomment-' +
      proof.commentDatabaseId;
    const plan = planBytes?.toString('utf8') ?? '';
    const sectionStart = plan.indexOf(owner.boundedSubsection + '\n');
    const sectionEnd =
      sectionStart < 0 ? -1 : plan.indexOf('\n### ', sectionStart + owner.boundedSubsection.length);
    const section =
      sectionStart < 0
        ? null
        : plan.slice(sectionStart, sectionEnd < 0 ? undefined : sectionEnd).trim();
    const bodyText = body?.toString('utf8') ?? '';
    if (
      proof.kind !== 'aitm-owned-comment' ||
      proof.repository !== 'kburson/ai-peer-review' ||
      proof.ownerIssue !== issue ||
      proof.ownedCommentKey !== 'runtime-contract-adoption.144-v1' ||
      !integer(proof.commentDatabaseId) ||
      !strings(proof, ['commentNodeId']) ||
      proof.url !== expectedUrl ||
      !stamp(proof.publishedAt) ||
      !stamp(proof.observedAt) ||
      Date.parse(proof.observedAt) < Date.parse(proof.publishedAt) ||
      proof.bodySha256 !== proof.body?.sha256 ||
      !SHA.test(proof.bodySha256 ?? '') ||
      !body ||
      hash(body) !== proof.bodySha256 ||
      !section ||
      !bodyText.includes(section) ||
      !bodyText.includes('<!-- aitm-owned-comment key="' + proof.ownedCommentKey + '" -->') ||
      ![
        owner.boundedPlan.path,
        owner.boundedPlan.blob,
        owner.boundedPlan.sha256,
        owner.planReview.reviewId,
        owner.reconciliation.sha256,
      ].every((value) => bodyText.includes(value)) ||
      !exact(receipt, [
        'ownerIssue',
        'repository',
        'authenticatedActor',
        'comment',
        'issueBody',
        'acceptedOwnerPlan',
        'native',
        'jointAdoptionClaim',
        'fullCanonicalPlanAndContractActivationGatesPending',
        'recordedAt',
      ]) ||
      receipt.ownerIssue !== issue ||
      receipt.repository !== proof.repository ||
      !strings(receipt, ['authenticatedActor']) ||
      !exact(comment, ['nodeId', 'id', 'url', 'ownedKey', 'sha256', 'authoredBy', 'createdAt']) ||
      comment.id !== proof.commentDatabaseId ||
      comment.nodeId !== proof.commentNodeId ||
      comment.url !== proof.url ||
      comment.ownedKey !== proof.ownedCommentKey ||
      comment.sha256 !== proof.bodySha256 ||
      comment.authoredBy !== receipt.authenticatedActor ||
      comment.createdAt !== proof.publishedAt ||
      receipt.recordedAt !== proof.observedAt ||
      !exact(receipt.issueBody, ['version', 'sha256', 'ordinaryMetadataAndMarkersPreserved']) ||
      !integer(receipt.issueBody.version) ||
      !SHA.test(receipt.issueBody.sha256 ?? '') ||
      receipt.issueBody.ordinaryMetadataAndMarkersPreserved !== true ||
      !exact(accepted, ['revision', 'blob', 'sha256', 'reviewId']) ||
      ![owner.boundedPlan.revision, owner.planReview.finalization?.revision].includes(
        accepted.revision
      ) ||
      accepted.blob !== owner.boundedPlan.blob ||
      accepted.sha256 !== owner.boundedPlan.sha256 ||
      accepted.reviewId !== owner.planReview.reviewId ||
      !exact(native, [
        'commentExit',
        'bodyExit',
        'bindingVerified',
        'role',
        'branch',
        'lifecycleStatePreserved',
        'pauseExit',
        'occupancyReleaseExit',
        'paused',
        'timerOpen',
        'activeBindingAbsent',
        'sourceAndOldCollateralPreserved',
      ]) ||
      native.commentExit !== 0 ||
      native.bodyExit !== 0 ||
      native.bindingVerified !== true ||
      native.role !== 'agent' ||
      !strings(native, ['branch', 'lifecycleStatePreserved']) ||
      native.pauseExit !== 0 ||
      native.occupancyReleaseExit !== 0 ||
      native.paused !== true ||
      native.timerOpen !== false ||
      native.activeBindingAbsent !== true ||
      native.sourceAndOldCollateralPreserved !== true ||
      receipt.jointAdoptionClaim !== false ||
      receipt.fullCanonicalPlanAndContractActivationGatesPending !== true
    )
      block('owner-native-proof-invalid');
    if (nativeIds.has(proof.commentDatabaseId)) block('owner-native-transaction-reused');
    nativeIds.add(proof.commentDatabaseId);
  }
  verified(record.amendment);
  review(record.amendmentReview, record.amendment);
  if (recordReference !== undefined || approvalReview !== undefined)
    review(approvalReview, recordReference);
  if (!Array.isArray(record.schemas) || !record.schemas.length) block('schemas-missing');
  else record.schemas.forEach(verified);
  if (
    !Array.isArray(record.reviewedDigests) ||
    !record.reviewedDigests.length ||
    record.reviewedDigests.some((d) => !SHA.test(d))
  )
    block('reviewed-digests-invalid');
  else {
    const required = [
      record.amendment,
      ...(record.schemas ?? []),
      ...Object.keys(OWNERS).flatMap((r) => [record[r]?.reconciliation, record[r]?.boundedPlan]),
    ];
    if (required.some((r) => !record.reviewedDigests.includes(r?.sha256)))
      block('reviewed-digests-incomplete');
  }
  if (
    !exact(record.decisions, Object.keys(DECISIONS)) ||
    Object.entries(DECISIONS).some(([k, values]) => !values.includes(record.decisions?.[k]))
  )
    block('decisions-incomplete');
  const coupled = [
    record.decisions?.runtimeInstallation,
    record.decisions?.policyAuthority,
    record.decisions?.legacyRecovery,
  ];
  const bundleA = ['current-global', 'exclusive-primary', 'drain-before-replacement'];
  const bundleB = [
    'reviewed-coexistence',
    'reviewed-layered-policy',
    'reviewed-retained-runtime-recovery',
  ];
  if (coupled.every((value, index) => value === bundleB[index]))
    block('coexistence-amendment-missing'); // No accepted complete B contract is registered by this amendment.
  else if (!coupled.every((value, index) => value === bundleA[index]))
    block('coupled-bundle-incomplete');
  if (!Array.isArray(record.unresolvedConflicts) || record.unresolvedConflicts.length)
    block('contract-conflicts-unresolved');
  const binding = record.activationBinding;
  if (
    !object(binding) ||
    binding.ownerIssue !== 102 ||
    !Array.isArray(binding.interfaces) ||
    INTERFACES.some((name) => !binding.interfaces.includes(name)) ||
    !Array.isArray(binding.guarantees) ||
    !['old-family-exclusion', 'pre-replacement-drain'].every((g) => binding.guarantees.includes(g))
  ) {
    block('activation-binding-missing');
  } else {
    verified(binding.source);
    verified(binding.registration);
    if (binding.release != null || (binding.conformance?.length ?? 0) > 0)
      block('contract-release-identity-forbidden');
    if (
      !Array.isArray(binding.unresolvedOverlapObligations) ||
      binding.unresolvedOverlapObligations.length
    )
      activationBlockers.push('activation-overlap-unresolved');
  }
  const operationalStart = contractBlockers.length;
  if (!activationAddendum) activationBlockers.push('activation-addendum-missing');
  else if (!exact(activationAddendum, ['record', 'ownerReviews'])) {
    activationBlockers.push('activation-addendum-invalid');
  } else {
    const document = json(activationAddendum.record);
    if (!document || document.schema !== 'ai-peer-review.runtime-activation-addendum/v1')
      activationBlockers.push('activation-addendum-invalid');
    if (!recordReference || document?.contractDigest !== recordReference.sha256)
      activationBlockers.push('activation-contract-digest-mismatch');
    const owners = activationAddendum.ownerReviews;
    if (
      !Array.isArray(owners) ||
      owners.length !== 3 ||
      [102, 107, 30].some((issue) => owners.filter((p) => p?.issue === issue).length !== 1)
    ) {
      activationBlockers.push('activation-owner-reviews-incomplete');
    } else
      for (const owner of owners) {
        if (!exact(owner, ['issue', 'review']))
          activationBlockers.push('activation-owner-reviews-incomplete');
        else review(owner.review, activationAddendum.record);
      }
    // Task 18 owns the exact accepted activation/installed-conformance schema
    // and executable operational proof. This Task 5 implementation has no such
    // reviewed profile: generic JSON assertions can never authorize publication.
    activationBlockers.push('activation-schema-owner-acceptance-pending');
  }
  activationBlockers.push(
    ...contractBlockers.splice(operationalStart).map((code) => 'activation-' + code)
  );
  const contractAdopted = contractBlockers.length === 0;
  const activationAuthorized =
    mode === 'publication' && contractAdopted && activationBlockers.length === 0;
  return {
    mode,
    contractAdopted,
    activationAuthorized,
    publicationAllowed: activationAuthorized,
    contractBlockers: [...new Set(contractBlockers)].sort(),
    activationBlockers: [...new Set(activationBlockers)].sort(),
    assurance: [...assurance].sort(),
  };
}

export function parseAdoptionArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    if (
      !['--record', '--approved-ref', '--mode'].includes(key) ||
      Object.hasOwn(result, key) ||
      typeof args[i + 1] !== 'string' ||
      args[i + 1].startsWith('--')
    )
      throw Error('usage-invalid');
    result[key] = args[i + 1];
  }
  if (!result['--record'] || !result['--approved-ref']) throw Error('usage-invalid');
  const mode = result['--mode'] ?? 'publication';
  if (!['publication', 'adoption-only'].includes(mode)) throw Error('verification-mode-invalid');
  return { record: result['--record'], approvedRef: result['--approved-ref'], mode };
}
export function validateApprovedSelector(selector, recordPath) {
  if (
    !exact(selector, ['schema', 'evidenceRevision', 'record', 'approvalReview']) ||
    selector.schema !== 'ai-peer-review.runtime-contract-approved-ref/v1' ||
    !OBJECT.test(selector.evidenceRevision ?? '') ||
    !safePath(recordPath) ||
    !recordPath.startsWith('evidence/portable-runtime/contracts/') ||
    selector.record?.path !== recordPath ||
    !OBJECT.test(selector.record?.revision ?? '') ||
    !exact(selector.approvalReview, [
      'reviewId',
      'subject',
      'manifest',
      'finalResponse',
      'finalization',
    ]) ||
    !OBJECT.test(selector.approvalReview?.finalization?.revision ?? '')
  )
    throw Error('approved-reference-incomplete');
}
export function collectConformanceReceipts(record, readPinned, collect) {
  for (const proof of record.activationBinding?.conformance ?? []) {
    const ref = proof.artifact,
      bytes = readPinned(ref);
    if (
      !Buffer.isBuffer(bytes) ||
      hash(bytes) !== ref?.sha256 ||
      blob(bytes, ref?.blob?.length === 64 ? 'sha256' : 'sha1') !== ref?.blob
    )
      continue;
    let document;
    try {
      document = parseRawJson(bytes.toString('utf8'));
    } catch {
      continue;
    }
    if (
      document?.schema !== 'ai-peer-review.activation-conformance/v1' ||
      !Array.isArray(document.observations)
    )
      continue;
    for (const observation of document.observations) collect(observation?.receipt);
  }
}
export function inspectApprovedAdoption({
  record: recordPath,
  approvedRef,
  mode = 'publication',
  cwd = process.cwd(),
}) {
  const git = (args, encoding = null) =>
    execFileSync('git', args, {
      cwd,
      encoding,
      maxBuffer: 32 * 1024 * 1024,
      env: Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_'))),
    });
  const selector = parseRawJson(readFileSync(approvedRef, 'utf8'));
  validateApprovedSelector(selector, recordPath);
  if (git(['cat-file', '-t', selector.evidenceRevision], 'utf8').trim() !== 'commit')
    throw Error('approved-reference-not-commit');
  git(['merge-base', '--is-ancestor', selector.record.revision, selector.evidenceRevision]);
  const artifacts = new Map(),
    observed = new Set();
  const collect = (x) => {
    if (!x || typeof x !== 'object') return;
    if (Object.hasOwn(x, 'revision') && Object.hasOwn(x, 'path')) {
      if (!OBJECT.test(x.revision ?? '') || !safePath(x.path) || fixturePath(x.path))
        throw Error('artifact-reference-invalid');
      if (git(['cat-file', '-t', x.revision], 'utf8').trim() !== 'commit')
        throw Error('artifact-revision-not-commit');
      const key = x.revision + ':' + x.path;
      if (!observed.has(key)) {
        artifacts.set(key, git(['show', key]));
        observed.add(key);
      }
    }
    if (exact(x, ['revision', 'sha256'])) {
      if (
        !OBJECT.test(x.revision ?? '') ||
        !SHA.test(x.sha256 ?? '') ||
        git(['cat-file', '-t', x.revision], 'utf8').trim() !== 'commit'
      )
        throw Error('finalization-reference-invalid');
      artifacts.set('commit:' + x.revision, git(['show', '--no-patch', '--format=%B', x.revision]));
    }
    if (
      exact(x, ['reviewId', 'subject', 'manifest', 'finalResponse', 'finalization']) &&
      OBJECT.test(x.finalization?.revision ?? '')
    ) {
      const revision = x.finalization.revision;
      artifacts.set(
        'parent:' + revision,
        git(['rev-list', '--parents', '-n', '1', revision], 'utf8')
          .trim()
          .split(' ')
          .slice(1)
          .join(' ')
      );
      for (const ref of [x.manifest, x.finalResponse]) {
        if (safePath(ref?.path))
          artifacts.set(
            'tree:' + revision + ':' + ref.path,
            git(['show', revision + ':' + ref.path])
          );
      }
    }
    for (const value of Object.values(x)) collect(value);
  };
  collect(selector);
  const local = readFileSync(path.resolve(cwd, recordPath));
  const pinned = artifacts.get(selector.record.revision + ':' + recordPath);
  if (!pinned?.equals(local)) throw Error('record-drift');
  if (
    hash(pinned) !== selector.record.sha256 ||
    blob(pinned, selector.record.blob?.length === 64 ? 'sha256' : 'sha1') !== selector.record.blob
  )
    throw Error('record-digest-mismatch');
  const record = parseRawJson(pinned.toString('utf8'));
  collect(record);
  collectConformanceReceipts(
    record,
    (ref) => artifacts.get(ref?.revision + ':' + ref?.path),
    collect
  );
  const tag = record.activationBinding?.release?.tag;
  if (tag && /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(tag) && !tag.includes('..'))
    artifacts.set(
      'tag:' + tag,
      git(['rev-parse', '--verify', 'refs/tags/' + tag + '^{commit}'], 'utf8').trim()
    );
  // Caller selectors choose immutable evidence; acceptance must come from the actual record review.
  git([
    'merge-base',
    '--is-ancestor',
    selector.approvalReview?.finalization?.revision,
    selector.evidenceRevision,
  ]);
  const report = checkRuntimeContractAdoption({
    record,
    artifacts,
    recordReference: selector.record,
    approvalReview: selector.approvalReview,
    mode,
  });
  return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = inspectApprovedAdoption(parseAdoptionArgs(process.argv.slice(2)));
    console.log(JSON.stringify(report));
    process.exitCode = (
      report.mode === 'adoption-only' ? report.contractAdopted : report.publicationAllowed
    )
      ? 0
      : 4;
  } catch (error) {
    console.log(
      JSON.stringify({
        contractAdopted: false,
        activationAuthorized: false,
        publicationAllowed: false,
        contractBlockers: [error.message],
        activationBlockers: [],
      })
    );
    process.exitCode = 4;
  }
}
