import { createHash, createPrivateKey, createPublicKey } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync, realpathSync, unlinkSync } from 'node:fs';
import path from 'node:path';

import {
  canonicalChallengeBytes,
  digestChallenge,
  digestGrantParameters,
} from '../authority/canonicalize.mjs';
import { requestGrant } from '../authority/challenge.mjs';
import { verifyAndConsumeGrant } from '../authority/verify.mjs';
import { resolveReviewPaths } from '../collateral/paths.mjs';
import {
  createResponseDraft,
  parseResponse,
  reserveCollateral,
  sealResponse,
} from '../collateral/responses.mjs';
import { AprError } from '../errors.mjs';
import { createGitRepository } from '../git/repository.mjs';
import { commitExactPaths, createGitTransactionRepository } from '../git/transaction.mjs';
import {
  assertDistinctParticipants,
  claimRole,
  deriveClaimStatus,
  enterStaleClaimIntervention,
  identityChangeEvent,
  reclaimRole,
  resolveIdentity,
} from '../identity/registry.mjs';
import { eventAdvancesRevision, validateEvent } from '../protocol/events.mjs';
import {
  canonicalProjection,
  initializeReview,
  inspectReview,
  inspectReviewAuthority,
  mutateReview,
  mutateProtectedReview,
  readReview,
  repairReview,
  sealNoCommitHandoff,
} from '../protocol/service.mjs';
import { atomicCreate } from '../protocol/store.mjs';
import { hydrateTemplate } from '../templates/index.mjs';
import {
  explainError,
  helpRequest,
  markdownCodeSpan,
  nextActionCommand,
  renderCommand,
} from './help-data.mjs';
import { parseCommand } from './parse.mjs';

const DEFAULT_AUTHORITY = Object.freeze({
  authority_policy: 'unavailable',
  challenge_ttl_ms: 15 * 60 * 1000,
  verifier: null,
});

function fail(code, message, recovery, details = {}) {
  throw new AprError(code, message, { recovery, details });
}

function timestamp(value) {
  const parsed = value instanceof Date ? new Date(value.valueOf()) : new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    fail('APR_RESPONSE_INVALID', 'Command time is invalid.', 'Use a valid clock instant.');
  }
  return parsed.toISOString();
}

function eventFor(review, type, actor, payload, now) {
  const protocol = review?.protocol;
  const eventPayload = { ...payload };
  const reviewId = protocol?.review_id ?? eventPayload.review_id;
  delete eventPayload.review_id;
  const event = {
    schema: 'ai-peer-review.event/v1',
    review_id: reviewId,
    sequence: (protocol?.sequence ?? 0) + 1,
    revision: (protocol?.revision ?? 0) + (eventAdvancesRevision(type) ? 1 : 0),
    type,
    actor,
    at: timestamp(now),
    payload: eventPayload,
  };
  validateEvent(event);
  return Object.freeze(event);
}

function entryExists(file) {
  try {
    lstatSync(file);
    return true;
  } catch (cause) {
    if (cause?.code === 'ENOENT') return false;
    throw cause;
  }
}

function collision(file) {
  fail(
    'APR_OUTPUT_COLLISION',
    'A peer-review output path is already occupied.',
    `Preserve ${file}, inspect the collision, and choose explicit recovery.`,
    { file }
  );
}

function expected(review) {
  return {
    reviewId: review.protocol.review_id,
    revision: review.protocol.revision,
    sequence: review.protocol.sequence,
    actor: review.protocol.current_actor,
  };
}

function result(command, state, paths = {}, review = {}) {
  const assurance = state.protocol.authority?.verifier?.signer_strength ?? 'unavailable';
  const modeNotice =
    state.protocol.commit_mode === 'no-commit'
      ? `NO-COMMIT TEST MODE — authority assurance: ${assurance}`
      : 'NORMAL COMMIT MODE';
  return Object.freeze({
    schema: 'ai-peer-review.cli-result/v1',
    command,
    review_id: state.protocol.review_id,
    state: state.protocol.state,
    next_action: state.protocol.next_action,
    review: Object.freeze({
      commit_mode: state.protocol.commit_mode,
      authority_assurance: assurance,
      mode_notice: modeNotice,
      ...review,
    }),
    paths: Object.freeze(paths),
  });
}

function contextFile(workspace) {
  return path.join(workspace, 'review-context.json');
}

function trackedStartupPaths(paths) {
  return {
    author_startup: path.join(paths.destination.absolute, 'author-startup.md'),
    reviewer_invitation: path.join(paths.destination.absolute, 'reviewer-invitation.md'),
  };
}

function everyReservedPath(paths, maximum) {
  const values = [];
  for (let turn = 1; turn <= maximum; turn += 1) {
    values.push(paths.reviewerResponse(turn).absolute, paths.authorResponse(turn).absolute);
  }
  values.push(paths.humanDecision.absolute, paths.manifest.absolute);
  return values;
}

function safePositive(value, fallback, label) {
  const selected = value ?? fallback;
  if (!Number.isSafeInteger(selected) || selected <= 0) {
    fail('APR_USAGE', `${label} must be a safe positive integer.`, 'Run peer-review help start.');
  }
  return selected;
}

function sameValue(left, right) {
  return canonicalProjection(left) === canonicalProjection(right);
}

function noCommitOwnedChangedPaths(state) {
  const { context, paths } = sealedPaths(state);
  return new Set(
    [
      ...Object.values(trackedStartupPaths(paths)),
      ...everyReservedPath(paths, state.protocol.max_turns),
    ].map((absolute) => path.relative(context.repository_root, absolute).split(path.sep).join('/'))
  );
}

function preservesNoCommitBaseline(baseline, observed, artifactPath, ownedPaths) {
  if (observed.head !== baseline?.head || observed.index_digest !== baseline?.index_digest) {
    return false;
  }
  const startupByPath = new Map((baseline.changed_paths ?? []).map((entry) => [entry.path, entry]));
  const currentByPath = new Map((observed.changed_paths ?? []).map((entry) => [entry.path, entry]));
  const startupPathsPreserved = (baseline.changed_paths ?? [])
    .filter((entry) => entry.path !== artifactPath)
    .every((entry) => sameValue(entry, currentByPath.get(entry.path)));
  return (
    startupPathsPreserved &&
    (observed.changed_paths ?? []).every(
      (entry) =>
        startupByPath.has(entry.path) ||
        entry.path === artifactPath ||
        (ownedPaths.has(entry.path) && entry.status === '??' && entry.source_path === null)
    )
  );
}

function sameParticipant(left, right) {
  const stable = (participant) =>
    participant
      ? Object.fromEntries(Object.entries(participant).filter(([key]) => key !== 'joined_at'))
      : participant;
  return sameValue(stable(left), stable(right));
}

function exactFile(file, bytes) {
  try {
    return readFileSync(file).equals(Buffer.from(bytes));
  } catch {
    return false;
  }
}

function exactRegularDigest(file, expectedDigest) {
  try {
    return lstatSync(file).isFile() && sha256(readFileSync(file)) === expectedDigest;
  } catch {
    return false;
  }
}

function sha256(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function ensureExactFile(file, bytes) {
  if (entryExists(file)) {
    if (!exactFile(file, bytes)) collision(file);
    return;
  }
  atomicCreate(file, bytes);
}

function validateExactFile(file, bytes) {
  if (entryExists(file) && !exactFile(file, bytes)) collision(file);
}

function configuredTransport(input) {
  const mode = input.transportMode ?? 'manual';
  if (!['manual', 'resume-only'].includes(mode)) {
    fail(
      'APR_TRANSPORT_UNAVAILABLE',
      'The requested Phase 1 transport mode is unavailable.',
      'Use manual transport or configure a validated resume-only adapter.'
    );
  }
  const capability = input.transportCapability ?? 'manual';
  if (
    !['manual', 'resume-only'].includes(capability) ||
    (mode === 'resume-only' && capability !== mode)
  ) {
    fail(
      'APR_TRANSPORT_UNAVAILABLE',
      'The current author session cannot satisfy the requested transport mode.',
      'Use manual transport or configure a validated resume-only adapter.'
    );
  }
  return Object.freeze({ mode, capability });
}

function configuredAuthority(root, explicit) {
  if (explicit !== undefined) return explicit;
  const file = path.join(root, '.ai-peer-review.json');
  try {
    const config = JSON.parse(readFileSync(file, 'utf8'));
    if (config?.schema !== 'ai-peer-review.config/v1' || !config.authority) {
      fail(
        'APR_AUTHORITY_REQUIRED',
        'Project authority configuration is invalid.',
        `Repair ${file} or remove it for consensus-only startup.`
      );
    }
    return config.authority;
  } catch (cause) {
    if (cause?.code === 'ENOENT') return DEFAULT_AUTHORITY;
    if (cause instanceof AprError) throw cause;
    fail(
      'APR_AUTHORITY_REQUIRED',
      'Project authority configuration cannot be read.',
      `Repair ${file} or remove it for consensus-only startup.`
    );
  }
}

function pinVerifierParameters({ authority, artifact, context, maximum, commitMode }) {
  return {
    verifier_fingerprint: authority.verifier?.verifier_fingerprint,
    assurance_grade: authority.verifier?.assurance_grade,
    authority_policy: authority.authority_policy,
    artifact_path: artifact.path,
    artifact_kind: context.artifact_kind,
    reviews_root: context.reviews_root,
    path_template: context.review_path_template,
    issue_id: context.issue,
    maximum_turns: maximum,
    commit_mode: commitMode,
  };
}

function readGrant(file, root) {
  const absolute = path.isAbsolute(file) ? file : path.resolve(root, file);
  try {
    return JSON.parse(readFileSync(absolute, 'utf8'));
  } catch (cause) {
    const error = new AprError('APR_GRANT_INVALID', 'Bootstrap grant cannot be read.', {
      recovery: 'Use the exact signed pin-verifier grant JSON file.',
      details: { file: absolute },
    });
    error.cause = cause;
    throw error;
  }
}

function operationalGrant(value, root) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  return readGrant(value, root);
}

function stableConflict(message) {
  fail(
    'APR_IDEMPOTENCY_CONFLICT',
    message,
    'Retry with the exact original protected action inputs or request a new challenge.'
  );
}

function detectionWarning(attestation) {
  return ['hardware-presence', 'host-verified', 'cryptographic-external'].includes(
    attestation.strength
  )
    ? null
    : `Human Authority was detection-grade (${attestation.strength}); verify the retained attestation.`;
}

function normalizedSupplement(bytes) {
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    fail(
      'APR_SUPPLEMENT_INVALID',
      'Supplement content is not valid UTF-8 text.',
      'Provide a valid UTF-8 Markdown supplement.'
    );
  }
  return Buffer.from(text.normalize('NFC').replaceAll('\r\n', '\n').replaceAll('\r', '\n'));
}

function regularInputFile(file, code = 'APR_SUPPLEMENT_INVALID') {
  try {
    if (!lstatSync(file).isFile()) throw new Error('not a regular file');
    return readFileSync(file);
  } catch (cause) {
    const error = new AprError(code, 'Input must be an existing regular file.', {
      recovery: 'Use an existing regular file and retry.',
      details: { file },
    });
    error.cause = cause;
    throw error;
  }
}

function supplementPath(workspace, supplementId) {
  return path.join(workspace, 'supplements', `${supplementId}.md`);
}

function validateNewResponseDraft(workspace, state, role) {
  const { paths } = sealedPaths(state);
  const turn = role === 'reviewer' ? state.protocol.turns_used + 1 : state.protocol.turns_used;
  const response = paths[`${role}Response`](turn).absolute;
  const registry = path.join(workspace, 'responses', `${role}-${turn}.json`);
  if (entryExists(response)) collision(response);
  if (entryExists(registry)) collision(registry);
}

function actionRetry(events, grant, types) {
  let digest;
  try {
    digest = digestChallenge(grant.challenge);
  } catch {
    return null;
  }
  return [...events]
    .reverse()
    .find(
      (event) =>
        types.includes(event.type) &&
        (event.payload.attestation ?? event.payload.supplement?.attestation)?.challenge_digest ===
          digest
    );
}

function interventionTurn(state, role) {
  const turn = state.protocol.turns_used + 1;
  if (!['author', 'reviewer'].includes(role) || !Number.isSafeInteger(turn) || turn <= 0) {
    fail(
      'APR_INVALID_TRANSITION',
      'Supplement target cannot be derived from current intervention authority.',
      'Read current status and target author or reviewer during intervention.'
    );
  }
  return turn;
}

function verifyBootstrapInput({
  input,
  root,
  authority,
  artifact,
  context,
  maximum,
  commitMode,
  reviewId,
  now,
  hostVerifier,
}) {
  const grant = readGrant(input.bootstrapGrant, root);
  const parameters = pinVerifierParameters({ authority, artifact, context, maximum, commitMode });
  const challenge = grant.challenge;
  const protocol = {
    review_id: reviewId,
    revision: 0,
    intervention: { intervention_id: null },
    authority,
    commit_mode: commitMode,
    challenges: [{ ...challenge, consumed_at: null, superseded_at: null }],
  };
  const attestation = verifyAndConsumeGrant({ protocol }, grant, {
    action: 'pin-verifier',
    parameters,
    now,
    hostVerifier,
  });
  if (
    !['hardware-presence', 'host-verified', 'cryptographic-external'].includes(attestation.strength)
  ) {
    fail(
      'APR_AUTHORITY_POLICY',
      'Bootstrap verifier pinning requires prevention-grade authority.',
      'Use a hardware-presence, host-verified, or cryptographic-external signer boundary.'
    );
  }
  return { authority, evidence: { challenge, parameters, attestation } };
}

function testAuthorityEvidence({
  fixtureId,
  artifact,
  context,
  maximum,
  commitMode,
  reviewId,
  now,
}) {
  const seed = createHash('sha256')
    .update(`ai-peer-review.test-authority/v1\n${fixtureId}`)
    .digest();
  const privateKey = createPrivateKey({
    key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]),
    format: 'der',
    type: 'pkcs8',
  });
  const publicKey = createPublicKey(privateKey);
  const fingerprint = `sha256:${createHash('sha256')
    .update(publicKey.export({ type: 'spki', format: 'der' }))
    .digest('hex')}`;
  const authority = {
    authority_policy: 'detection-allowed',
    challenge_ttl_ms: 15 * 60 * 1000,
    verifier: {
      kind: 'ed25519',
      verifier_id: `test:${fixtureId}`,
      verifier_fingerprint: fingerprint,
      public_key: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
      assurance_grade: 'test-fixture',
      signer_strength: 'unverified-test',
    },
  };
  const parameters = pinVerifierParameters({ authority, artifact, context, maximum, commitMode });
  const at = new Date(now);
  const challenge = {
    schema: 'ai-peer-review.grant-challenge/v1',
    challenge_id: `challenge-test-${createHash('sha256').update(fixtureId).digest('hex').slice(0, 16)}`,
    review_id: reviewId,
    intervention_id: null,
    protocol_revision: 0,
    action: 'pin-verifier',
    parameters_digest: digestGrantParameters('pin-verifier', parameters),
    nonce: createHash('sha256').update(`nonce\n${fixtureId}`).digest('base64url'),
    expires_at: new Date(at.valueOf() + authority.challenge_ttl_ms).toISOString(),
  };
  const attestation = {
    source: 'test-fixture',
    strength: 'unverified-test',
    signer_id: authority.verifier.verifier_id,
    signer_fingerprint: fingerprint,
    challenge_digest: digestChallenge(challenge),
    verified_at: at.toISOString(),
  };
  return { authority, evidence: { challenge, parameters, attestation } };
}

function deterministicReviewId(input) {
  const bytes = Buffer.from(canonicalProjection(input));
  return `review-${createHash('sha256').update(bytes).digest('hex').slice(0, 32)}`;
}

function startupVariables(
  root,
  artifact,
  paths,
  reviewId,
  commitMode = 'normal',
  authorityAssurance = 'unavailable'
) {
  const startup = trackedStartupPaths(paths);
  const artifactAbsolute = path.join(root, artifact.path);
  const workspaceAbsolute = paths.scratch.absolute;
  const responseAbsolute = paths.reviewerResponse(1).absolute;
  const invitationAbsolute = startup.reviewer_invitation;
  const invitationPayload = {
    schema: 'ai-peer-review.invitation-routing/v1',
    review_id: reviewId,
    artifact: artifactAbsolute,
    workspace: workspaceAbsolute,
    response: responseAbsolute,
  };
  return {
    startup,
    variables: {
      review_id: reviewId,
      mode_banner:
        commitMode === 'no-commit'
          ? `> **NO-COMMIT TEST MODE** — authority assurance: \`${authorityAssurance}\``
          : 'Mode: `normal`',
      artifact_absolute: artifactAbsolute,
      workspace_absolute: workspaceAbsolute,
      response_absolute: responseAbsolute,
      invitation_absolute: invitationAbsolute,
      artifact_display: markdownCodeSpan(artifactAbsolute),
      workspace_display: markdownCodeSpan(workspaceAbsolute),
      response_display: markdownCodeSpan(responseAbsolute),
      invitation_display: markdownCodeSpan(invitationAbsolute),
      invitation_payload: Buffer.from(canonicalProjection(invitationPayload)).toString('base64url'),
      installed_join_display: markdownCodeSpan(
        renderCommand(['peer-review', 'join', invitationAbsolute])
      ),
      zero_install_join_display: markdownCodeSpan(
        renderCommand(['npx', '--yes', 'ai-peer-review@0.1.0', 'join', invitationAbsolute])
      ),
      recovery_display: markdownCodeSpan(
        renderCommand(['peer-review', 'resume', workspaceAbsolute])
      ),
    },
  };
}

function startResult(state, paths, startup) {
  return result(
    'start',
    state,
    {
      workspace: paths.scratch.absolute,
      events: path.join(paths.scratch.absolute, 'events.jsonl'),
      ...startup,
    },
    {
      max_turns: state.protocol.max_turns,
      claim_ttl_ms: state.protocol.claim_ttl_ms,
      commit_mode: state.protocol.commit_mode,
      authority: state.protocol.authority,
      transport_mode: state.protocol.startup.transport_mode,
      author_transport_capability: state.protocol.startup.author_transport_capability,
      no_commit_baseline: state.protocol.startup.no_commit_baseline,
      bootstrap: state.protocol.startup.bootstrap,
    }
  );
}

export async function startReview(input, deps = {}) {
  const repository = deps.repository ?? createGitRepository();
  const root = repository.root(input.cwd);
  const relativeArtifact = path.isAbsolute(input.artifact)
    ? path.relative(root, input.artifact)
    : input.artifact;
  const artifact = repository.artifactState(root, relativeArtifact);
  if (!artifact.clean) {
    fail(
      'APR_ARTIFACT_DIRTY',
      'The tracked artifact differs from HEAD.',
      `Commit or restore ${artifact.path}, then retry peer-review start.`,
      { path: artifact.path }
    );
  }
  if (!['spec', 'plan'].includes(input.artifactKind)) {
    fail(
      'APR_USAGE',
      'start requires an explicit spec or plan artifact kind.',
      'Run peer-review help start.'
    );
  }
  if (input.identity?.role !== 'author') {
    fail(
      'APR_IDENTITY_REQUIRED',
      'Start requires an author identity.',
      'Resolve the author identity and retry.'
    );
  }
  const now = timestamp(input.now ?? new Date());
  const maximum = safePositive(input.maxTurns, 10, 'maximum turns');
  const claimTtlMs = safePositive(input.claimTtlMs, 8 * 60 * 60 * 1000, 'claim TTL');
  const commitMode = input.noCommit ? 'no-commit' : 'normal';
  if (input.testHumanAuthority && commitMode !== 'no-commit') {
    fail(
      'APR_AUTHORITY_POLICY',
      'Test-only authority is forbidden in normal commit mode.',
      'Use --no-commit with --test-human-authority.'
    );
  }
  const transport = configuredTransport(input);
  const requestedAuthority = configuredAuthority(root, input.authority);
  const startupAssurance = input.testHumanAuthority
    ? 'unverified-test'
    : (requestedAuthority.verifier?.signer_strength ?? 'unavailable');
  const reviewId =
    input.reviewId ??
    deterministicReviewId({
      repository_root: root,
      artifact_path: artifact.path,
      artifact_head: artifact.head,
      artifact_kind: input.artifactKind,
      reviews_root: input.reviewsRoot ?? 'docs/peer-reviews',
      review_path_template: input.reviewPathTemplate ?? '<kind>/<date>-<name>-<review-id>',
      issue: input.issue ?? null,
      maximum,
      claim_ttl_ms: claimTtlMs,
      commit_mode: commitMode,
      author_fingerprint: input.identity.session_fingerprint,
      authority: requestedAuthority,
      transport_mode: transport.mode,
    });
  const date = now.slice(0, 10);
  const name = path.basename(artifact.path, path.extname(artifact.path));
  let paths = resolveReviewPaths({
    root,
    reviewsRoot: input.reviewsRoot,
    reviewPathTemplate: input.reviewPathTemplate,
    issue: input.issue ?? null,
    kind: input.artifactKind,
    name,
    date,
    reviewId,
  });
  if (!repository.checkIgnored(root, paths.scratch.relative)) {
    fail(
      'APR_SCRATCH_NOT_IGNORED',
      'The peer-review scratch workspace is not ignored by Git.',
      `Add ${paths.scratch.relative} to a repository-local exclude and retry.`,
      { path: paths.scratch.relative }
    );
  }
  const requestedContext = {
    schema: 'ai-peer-review.context/v1',
    review_id: reviewId,
    repository_root: root,
    artifact_kind: input.artifactKind,
    artifact_name: name,
    review_date: date,
    reviews_root: paths.reviewsRoot.relative,
    review_path_template: input.reviewPathTemplate ?? '<kind>/<date>-<name>-<review-id>',
    issue: input.issue ?? null,
  };
  const eventsFile = path.join(paths.scratch.absolute, 'events.jsonl');

  if (entryExists(eventsFile)) {
    const state = inspectReview(paths.scratch.absolute);
    const sealed = state.protocol.startup;
    if (!sealed?.context) collision(eventsFile);
    const context = sealed.context;
    paths = pathsForContext(context);
    const { startup, variables } = startupVariables(
      root,
      artifact,
      paths,
      reviewId,
      commitMode,
      startupAssurance
    );
    const contextBytes = Buffer.from(canonicalProjection(context));
    const authorStartupBytes = hydrateTemplate('author-startup', variables);
    const reviewerInvitationBytes = hydrateTemplate('reviewer-invitation', variables);
    const authorityRetryMatches = (() => {
      if (input.bootstrapGrant) {
        const grant = readGrant(input.bootstrapGrant, root);
        return (
          sealed.bootstrap !== null &&
          sameValue(state.protocol.authority, requestedAuthority) &&
          sameValue(grant.challenge, sealed.bootstrap.challenge) &&
          sameValue(grant.parameters, sealed.bootstrap.parameters)
        );
      }
      if (input.testHumanAuthority) {
        const expectedTest = testAuthorityEvidence({
          fixtureId: input.testHumanAuthority,
          artifact,
          context,
          maximum,
          commitMode,
          reviewId,
          now,
        });
        return (
          sealed.bootstrap?.attestation.signer_id === `test:${input.testHumanAuthority}` &&
          sameValue(state.protocol.authority, expectedTest.authority) &&
          sameValue(sealed.bootstrap.parameters, expectedTest.evidence.parameters)
        );
      }
      return sealed.bootstrap === null && sameValue(state.protocol.authority, requestedAuthority);
    })();
    const exactRetry =
      state.protocol.state === 'awaiting-reviewer' &&
      state.protocol.review_id === reviewId &&
      state.protocol.max_turns === maximum &&
      state.protocol.claim_ttl_ms === claimTtlMs &&
      state.protocol.commit_mode === commitMode &&
      sameValue(state.protocol.artifact, {
        path: artifact.path,
        head: artifact.head,
        blob: artifact.blob,
        digest: `sha256:${artifact.worktreeDigest}`,
      }) &&
      sameParticipant(state.participants.author, input.identity) &&
      context.repository_root === root &&
      context.artifact_kind === input.artifactKind &&
      context.artifact_name === name &&
      context.reviews_root === requestedContext.reviews_root &&
      context.review_path_template === requestedContext.review_path_template &&
      context.issue === requestedContext.issue &&
      sealed.context_digest === sha256(contextBytes) &&
      sealed.destination === paths.destination.relative &&
      sealed.author_startup_digest === sha256(authorStartupBytes) &&
      sealed.reviewer_invitation_digest === sha256(reviewerInvitationBytes) &&
      sealed.transport_mode === transport.mode &&
      sealed.author_transport_capability === transport.capability &&
      authorityRetryMatches;
    if (!exactRetry) collision(eventsFile);
    const repaired = await repairReview(paths.scratch.absolute, expected(state), {
      preflight: (current) => {
        reserveCollateral({ ...current, paths }, { write: false });
        validateExactFile(contextFile(paths.scratch.absolute), contextBytes);
        validateExactFile(startup.author_startup, authorStartupBytes);
        validateExactFile(startup.reviewer_invitation, reviewerInvitationBytes);
      },
      repair: (current) => {
        reserveCollateral({ ...current, paths });
        ensureExactFile(contextFile(paths.scratch.absolute), contextBytes);
        ensureExactFile(startup.author_startup, authorStartupBytes);
        ensureExactFile(startup.reviewer_invitation, reviewerInvitationBytes);
      },
    });
    return startResult(repaired, paths, startup);
  }

  const context = requestedContext;
  const contextBytes = Buffer.from(canonicalProjection(context));
  const { startup, variables } = startupVariables(
    root,
    artifact,
    paths,
    reviewId,
    commitMode,
    startupAssurance
  );
  const authorStartupBytes = hydrateTemplate('author-startup', variables);
  const reviewerInvitationBytes = hydrateTemplate('reviewer-invitation', variables);

  for (const file of [
    contextFile(paths.scratch.absolute),
    path.join(paths.scratch.absolute, 'protocol.json'),
    path.join(paths.scratch.absolute, 'participants.json'),
    path.join(paths.scratch.absolute, 'next-action.json'),
    path.join(paths.scratch.absolute, 'collateral-reservation.json'),
    ...Object.values(startup),
    ...everyReservedPath(paths, maximum),
  ]) {
    if (entryExists(file)) collision(file);
  }
  const noCommitBaseline = commitMode === 'no-commit' ? repository.baseline(root) : null;
  let authority = requestedAuthority;
  let bootstrap = null;
  const authorityRequest = input.bootstrapGrant ?? input.testHumanAuthority;
  if (authorityRequest) {
    const verifier = input.bootstrapGrant
      ? (deps.verifyBootstrapGrant ?? verifyBootstrapInput)
      : (deps.verifyTestHumanAuthority ??
        ((details) => testAuthorityEvidence({ ...details, fixtureId: input.testHumanAuthority })));
    const verified = await verifier({
      input,
      root,
      authority: requestedAuthority,
      artifact,
      context,
      maximum,
      commitMode,
      paths,
      reviewId,
      now,
      hostVerifier: deps.hostVerifier,
    });
    if (!verified?.authority || !verified?.evidence) {
      fail(
        'APR_AUTHORITY_REQUIRED',
        'Startup authority verification did not return complete evidence.',
        'Use a verifier that returns exact authority and bootstrap evidence.'
      );
    }
    authority = verified.authority;
    bootstrap = verified.evidence;
  }
  const startupAuthority = {
    context,
    context_digest: sha256(contextBytes),
    destination: paths.destination.relative,
    author_startup_digest: sha256(authorStartupBytes),
    reviewer_invitation_digest: sha256(reviewerInvitationBytes),
    transport_mode: transport.mode,
    author_transport_capability: transport.capability,
    no_commit_baseline: noCommitBaseline,
    bootstrap,
  };
  const initial = eventFor(
    null,
    'review-created',
    'system',
    {
      review_id: reviewId,
      commit_mode: commitMode,
      max_turns: maximum,
      claim_ttl_ms: claimTtlMs,
      authority,
      artifact: {
        path: artifact.path,
        head: artifact.head,
        blob: artifact.blob,
        digest: `sha256:${artifact.worktreeDigest}`,
      },
      author: input.identity,
      startup: startupAuthority,
    },
    now
  );
  const state = await initializeReview(paths.scratch.absolute, initial);
  reserveCollateral({ ...state, paths });
  atomicCreate(contextFile(paths.scratch.absolute), contextBytes);
  atomicCreate(startup.author_startup, authorStartupBytes);
  atomicCreate(startup.reviewer_invitation, reviewerInvitationBytes);
  return startResult(state, paths, startup);
}

function invitationValues(file) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (cause) {
    const error = new AprError('APR_INVITATION_INVALID', 'Reviewer invitation cannot be read.', {
      recovery: 'Use the absolute generated reviewer-invitation.md path.',
      details: { file },
    });
    error.cause = cause;
    throw error;
  }
  const encoded = text.match(/^<!-- ai-peer-review-invitation data="([A-Za-z0-9_-]+)" -->$/m)?.[1];
  let routing;
  try {
    if (!encoded || Buffer.from(encoded, 'base64url').toString('base64url') !== encoded) {
      throw new Error('non-canonical invitation payload');
    }
    routing = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    fail(
      'APR_INVITATION_INVALID',
      'Reviewer invitation routing is incomplete.',
      'Use the complete generated reviewer invitation.'
    );
  }
  if (
    !routing ||
    typeof routing !== 'object' ||
    Array.isArray(routing) ||
    Object.keys(routing).sort().join('\n') !==
      ['artifact', 'response', 'review_id', 'schema', 'workspace'].sort().join('\n') ||
    routing.schema !== 'ai-peer-review.invitation-routing/v1' ||
    [routing.review_id, routing.artifact, routing.workspace, routing.response].some(
      (entry) => typeof entry !== 'string' || !entry
    )
  ) {
    fail(
      'APR_INVITATION_INVALID',
      'Reviewer invitation routing is invalid.',
      'Use the complete generated reviewer invitation.'
    );
  }
  return {
    reviewId: routing.review_id,
    artifact: routing.artifact,
    workspace: routing.workspace,
    response: routing.response,
  };
}

function pathsForContext(context) {
  return resolveReviewPaths({
    root: context.repository_root,
    reviewsRoot: context.reviews_root,
    reviewPathTemplate: context.review_path_template,
    issue: context.issue,
    kind: context.artifact_kind,
    name: context.artifact_name,
    date: context.review_date,
    reviewId: context.review_id,
  });
}

function sealedPaths(state) {
  const startup = state.protocol.startup;
  const context = startup?.context;
  if (!context || sha256(Buffer.from(canonicalProjection(context))) !== startup.context_digest) {
    fail(
      'APR_INVITATION_INVALID',
      'Review startup routing authority is invalid.',
      'Recover the review from its intact event authority before continuing.'
    );
  }
  const paths = pathsForContext(context);
  if (paths.destination.relative !== startup.destination) {
    fail(
      'APR_INVITATION_INVALID',
      'Review destination differs from sealed startup authority.',
      'Recover the review from its intact event authority before continuing.'
    );
  }
  return { startup, context, paths };
}

function validateJoinAuthority({ state, root, invitation, values }) {
  const { startup, context, paths } = sealedPaths(state);
  const contextBytes = Buffer.from(canonicalProjection(context));
  const expectedInvitation = hydrateTemplate(
    'reviewer-invitation',
    startupVariables(
      root,
      state.protocol.artifact,
      paths,
      state.protocol.review_id,
      state.protocol.commit_mode,
      state.protocol.authority?.verifier?.signer_strength ?? 'unavailable'
    ).variables
  );
  if (
    root !== context.repository_root ||
    values.reviewId !== state.protocol.review_id ||
    values.workspace !== paths.scratch.absolute ||
    values.artifact !== path.join(root, state.protocol.artifact.path) ||
    values.response !== paths.reviewerResponse(1).absolute ||
    invitation !== trackedStartupPaths(paths).reviewer_invitation ||
    !exactFile(contextFile(paths.scratch.absolute), contextBytes) ||
    sha256(expectedInvitation) !== startup.reviewer_invitation_digest ||
    !exactFile(invitation, expectedInvitation)
  ) {
    fail(
      'APR_INVITATION_INVALID',
      'Invitation does not match sealed review and physical worktree authority.',
      'Join from the exact generated invitation inside its original physical worktree.'
    );
  }
  return paths;
}

export async function joinReview(input, deps = {}) {
  const repository = deps.repository ?? createGitRepository();
  const invitation = path.resolve(input.invitation);
  const values = invitationValues(invitation);
  const state = inspectReview(values.workspace);
  const root = repository.root(input.cwd);
  const paths = validateJoinAuthority({ state, root, invitation, values });
  const reviewerCapability = input.transportCapability ?? 'manual';
  if (
    !['manual', 'resume-only'].includes(reviewerCapability) ||
    (state.protocol.startup.transport_mode === 'resume-only' &&
      reviewerCapability !== 'resume-only')
  ) {
    fail(
      'APR_TRANSPORT_UNAVAILABLE',
      'The reviewer session cannot satisfy the startup-pinned transport mode.',
      'Join from a validated resume-only adapter or start a manual review.'
    );
  }
  if (input.identity?.role !== 'reviewer') {
    fail(
      'APR_IDENTITY_REQUIRED',
      'Join requires a reviewer identity.',
      'Resolve reviewer identity and retry.'
    );
  }
  assertDistinctParticipants(state.participants.author, input.identity);
  if (state.protocol.state === 'reviewer-turn') {
    const registered = state.participants.reviewer;
    const claim = state.protocol.claims.reviewer;
    if (
      sameParticipant(registered, input.identity) &&
      state.protocol.transports.reviewer === reviewerCapability &&
      !claim
    ) {
      const claimed = await mutateReview(values.workspace, expected(state), (current) =>
        claimRole(current, registered, input.now ?? new Date())
      );
      const draft = createResponseDraft({ ...claimed, paths }, 'reviewer', 1);
      return result(
        'join',
        claimed,
        { workspace: values.workspace, response: draft.path },
        {
          claim: {
            role: claimed.protocol.claims.reviewer.role,
            host: claimed.protocol.claims.reviewer.host,
            expires_at: claimed.protocol.claims.reviewer.expires_at,
          },
        }
      );
    }
    if (
      sameParticipant(registered, input.identity) &&
      state.protocol.transports.reviewer === reviewerCapability &&
      claim?.session_fingerprint === input.identity.session_fingerprint
    ) {
      const draft = createResponseDraft({ ...state, paths }, 'reviewer', 1);
      return result(
        'join',
        state,
        { workspace: values.workspace, response: draft.path },
        {
          claim: {
            role: claim.role,
            host: claim.host,
            expires_at: claim.expires_at,
          },
        }
      );
    }
    fail(
      'APR_IDENTITY_CONFLICT',
      'The reviewer role is already registered to another participant.',
      'Resume from the registered reviewer session or use the governed replacement flow.'
    );
  }
  if (state.protocol.state !== 'awaiting-reviewer') {
    fail(
      'APR_INVITATION_INVALID',
      'Invitation does not match the current review state.',
      'Run peer-review status and follow its exact next action.'
    );
  }
  const joined = await mutateReview(values.workspace, expected(state), (current) => {
    const currentPaths = validateJoinAuthority({ state: current, root, invitation, values });
    const repositoryBoundary = repository.reviewerBoundary(
      root,
      currentPaths.reviewerResponse(1).relative
    );
    return eventFor(
      current,
      'reviewer-joined',
      input.identity.session_fingerprint,
      {
        reviewer: input.identity,
        transport_capability: reviewerCapability,
        repository_boundary: repositoryBoundary,
      },
      input.now ?? new Date()
    );
  });
  const claimed = await mutateReview(values.workspace, expected(joined), (current) =>
    claimRole(current, input.identity, input.now ?? new Date())
  );
  const draft = createResponseDraft({ ...claimed, paths }, 'reviewer', 1);
  return result(
    'join',
    claimed,
    { workspace: values.workspace, response: draft.path },
    {
      claim: {
        role: claimed.protocol.claims.reviewer.role,
        host: claimed.protocol.claims.reviewer.host,
        expires_at: claimed.protocol.claims.reviewer.expires_at,
      },
    }
  );
}

export function statusReview(workspace, { now = new Date() } = {}) {
  const absolute = path.resolve(workspace);
  const state = inspectReview(absolute);
  const { paths: resolved } = sealedPaths(state);
  const role = ['author', 'reviewer'].includes(state.protocol.current_actor)
    ? state.protocol.current_actor
    : null;
  const observed = role
    ? deriveClaimStatus(state, role, now)
    : { status: 'not-applicable', claim: null };
  const effectiveState =
    observed.status === 'stale'
      ? {
          ...state,
          protocol: {
            ...state.protocol,
            state: 'intervention-required',
            next_action: 'human-intervention',
            intervention: {
              ...(state.protocol.intervention ?? {}),
              reason: 'stale-claim',
            },
          },
        }
      : state;
  const response =
    state.protocol.state === 'reviewer-turn'
      ? resolved.reviewerResponse(state.protocol.turns_used + 1).absolute
      : state.protocol.state === 'author-revision'
        ? resolved.authorResponse(state.protocol.turns_used).absolute
        : null;
  const operationalPaths = Object.freeze({
    workspace: absolute,
    invitation: trackedStartupPaths(resolved).reviewer_invitation,
    ...(response ? { response } : {}),
  });
  const ownedPaths =
    state.protocol.commit_mode === 'no-commit'
      ? [
          ...retainedWorkspacePaths(absolute, { includeReservation: true }).map((relative) =>
            path
              .join(
                path.relative(state.protocol.startup.context.repository_root, absolute),
                relative
              )
              .split(path.sep)
              .join('/')
          ),
          ...retainedWorkspacePaths(resolved.destination.absolute).map((relative) =>
            path.join(resolved.destination.relative, relative).split(path.sep).join('/')
          ),
        ].sort()
      : [];
  return Object.freeze({
    ...result('status', effectiveState, operationalPaths, {
      ...(ownedPaths.length ? { owned_paths: Object.freeze(ownedPaths) } : {}),
    }),
    next_action: Object.freeze({
      action: effectiveState.protocol.next_action,
      command: nextActionCommand(
        operationalPaths,
        effectiveState.protocol.next_action,
        effectiveState
      ),
    }),
    claim: Object.freeze({
      role,
      status: observed.status,
      host: observed.claim?.host ?? null,
      expires_at: observed.claim?.expires_at ?? null,
    }),
  });
}

export function resumeReview(workspace, options = {}) {
  const status = statusReview(workspace, options);
  const role = status.claim.role ?? 'human';
  return Object.freeze({
    ...status,
    command: 'resume',
    role,
    instructions:
      status.next_action.command === null
        ? 'The review is terminal; there is no next action.'
        : status.state === 'awaiting-reviewer'
          ? `Join from the exact sealed invitation: ${status.next_action.command}`
          : status.claim.status === 'stale'
            ? `Reclaim the stale ${role} claim, then resume from event authority: ${status.next_action.command}`
            : role === 'reviewer'
              ? `Open the current reviewer response ${status.paths.response} and then run: ${status.next_action.command}`
              : role === 'author'
                ? `Open the current author response ${status.paths.response} and then run: ${status.next_action.command}`
                : `Follow the human intervention shown by: ${status.next_action.command}`,
  });
}

function continuedResult(state, workspace, response, event) {
  const warning = detectionWarning(event.payload.attestation);
  return result(
    'continue',
    state,
    { workspace, ...(response ? { response } : {}) },
    {
      max_turns: state.protocol.max_turns,
      additional_turns: event.payload.additional_turns,
      resume_role: event.payload.parameters.resume_role,
      focus_path: event.payload.parameters.focus_path,
      authority: event.payload.attestation,
      authority_warning: warning,
    }
  );
}

async function ensureTurnClaim(workspace, state, role, participant, now) {
  const existing = state.protocol.claims[role];
  if (!existing) {
    return mutateReview(workspace, expected(state), (current) =>
      claimRole(current, participant, now)
    );
  }
  if (existing.session_fingerprint !== participant?.session_fingerprint) {
    fail(
      'APR_CLAIM_CONFLICT',
      'Turn claim differs from participant authority.',
      'Use the governed participant recovery flow.'
    );
  }
  return state;
}

export async function continueReview(input, deps = {}) {
  const absolute = path.resolve(input.workspace);
  const authority = inspectReviewAuthority(absolute);
  const root = authority.state.protocol.startup.context.repository_root;
  const grant = operationalGrant(input.grant, input.cwd ?? root);
  const prior = actionRetry(authority.events, grant, [
    'continued-to-reviewer',
    'continued-to-author',
  ]);
  let focus = null;
  if (input.focus !== undefined && input.focus !== null) {
    const requested = path.resolve(input.cwd ?? root, input.focus);
    const physicalRoot = realpathSync(root);
    let physical;
    try {
      physical = realpathSync(requested);
    } catch (cause) {
      const error = new AprError('APR_FOCUS_INVALID', 'Continuation focus cannot be read.', {
        recovery: 'Use a regular file inside the review repository.',
        details: { file: requested },
      });
      error.cause = cause;
      throw error;
    }
    const relative = path.relative(physicalRoot, physical).split(path.sep).join('/');
    if (!relative || relative.startsWith('../') || path.isAbsolute(relative)) {
      fail(
        'APR_FOCUS_INVALID',
        'Continuation focus is outside the review repository.',
        'Use a regular repository file as the continuation focus.'
      );
    }
    const bytes = regularInputFile(physical, 'APR_FOCUS_INVALID');
    focus = { source: physical, path: relative, bytes, digest: sha256(bytes) };
  }
  if (prior) {
    if (
      !sameValue(grant.parameters, prior.payload.parameters) ||
      prior.payload.additional_turns !== (input.additionalTurns ?? 1) ||
      prior.payload.parameters.focus_path !== (focus?.path ?? null) ||
      prior.payload.parameters.focus_digest !== (focus?.digest ?? null)
    ) {
      stableConflict('Continuation retry differs from the already authorized result.');
    }
    let response = null;
    const role = prior.payload.parameters.resume_role;
    const resumed = await ensureTurnClaim(
      absolute,
      authority.state,
      role,
      authority.state.participants[role],
      input.now ?? new Date()
    );
    const { paths } = sealedPaths(resumed);
    const turn =
      role === 'reviewer' ? resumed.protocol.turns_used + 1 : resumed.protocol.turns_used;
    if (focus) {
      ensureExactFile(
        path.join(absolute, 'focus', `${focus.digest.slice('sha256:'.length)}.md`),
        focus.bytes
      );
    }
    const currentTurn =
      (role === 'reviewer' && resumed.protocol.state === 'reviewer-turn') ||
      (role === 'author' && resumed.protocol.state === 'author-revision');
    if (currentTurn) {
      response = createResponseDraft({ ...resumed, paths }, role, turn).path;
    }
    return continuedResult(resumed, absolute, response, prior);
  }
  const state = authority.state;
  if (state.protocol.state !== 'intervention-required') {
    fail(
      'APR_INVALID_TRANSITION',
      'Continuation requires an active intervention.',
      'Read status and continue only the frozen intervention.'
    );
  }
  if (state.protocol.intervention?.reason !== 'turn-budget-exhausted') {
    fail(
      'APR_INVALID_TRANSITION',
      'Budget continuation requires a turn-budget intervention.',
      'Use reclaim for stale claims or participant replacement for participant loss.'
    );
  }
  const additional = safePositive(input.additionalTurns, 1, 'additional turns');
  const resumeRole = state.protocol.intervention.interrupted_state.startsWith('reviewer')
    ? 'reviewer'
    : 'author';
  const parameters = {
    additional_turns: additional,
    resulting_effective_maximum: state.protocol.max_turns + additional,
    resume_role: resumeRole,
    focus_path: focus?.path ?? null,
    focus_digest: focus?.digest ?? null,
  };
  const continued = await mutateProtectedReview(absolute, expected(state), {
    action: 'continue',
    parameters,
    grant,
    now: input.now ?? new Date(),
    hostVerifier: deps.hostVerifier,
    preflight: (current) => {
      if (focus && sha256(regularInputFile(focus.source, 'APR_FOCUS_INVALID')) !== focus.digest) {
        fail(
          'APR_FOCUS_CHANGED',
          'Continuation focus changed while authority was being consumed.',
          'Request a new challenge for the current focus bytes.'
        );
      }
      if (focus) {
        validateExactFile(
          path.join(absolute, 'focus', `${focus.digest.slice('sha256:'.length)}.md`),
          focus.bytes
        );
      }
      validateNewResponseDraft(absolute, current, resumeRole);
    },
    createEvent: (current, attestation) => {
      return eventFor(
        current,
        `continued-to-${resumeRole}`,
        attestation.signer_fingerprint,
        {
          intervention_id: current.protocol.intervention.intervention_id,
          additional_turns: additional,
          effective_max_turns: parameters.resulting_effective_maximum,
          parameters,
          attestation,
        },
        input.now ?? new Date()
      );
    },
  });
  if (focus) {
    ensureExactFile(
      path.join(absolute, 'focus', `${focus.digest.slice('sha256:'.length)}.md`),
      focus.bytes
    );
  }
  const resumed = await ensureTurnClaim(
    absolute,
    continued,
    resumeRole,
    continued.participants[resumeRole],
    input.now ?? new Date()
  );
  const { paths } = sealedPaths(resumed);
  const turn =
    resumeRole === 'reviewer' ? resumed.protocol.turns_used + 1 : resumed.protocol.turns_used;
  const response = createResponseDraft({ ...resumed, paths }, resumeRole, turn).path;
  const event = actionRetry(inspectReviewAuthority(absolute).events, grant, [
    'continued-to-reviewer',
    'continued-to-author',
  ]);
  return continuedResult(resumed, absolute, response, event);
}

function supplementResult(state, workspace, event) {
  const supplement = event.payload.supplement;
  return result(
    'supplement',
    state,
    { workspace, supplement: supplementPath(workspace, supplement.supplement_id) },
    {
      supplement,
      authority_warning: detectionWarning(supplement.attestation),
    }
  );
}

export async function registerSupplement(input, deps = {}) {
  const absolute = path.resolve(input.workspace);
  const authority = inspectReviewAuthority(absolute);
  const root = authority.state.protocol.startup.context.repository_root;
  const grant = operationalGrant(input.grant, input.cwd ?? root);
  const source = path.resolve(input.cwd ?? root, input.file);
  const bytes = normalizedSupplement(regularInputFile(source));
  const digest = sha256(bytes);
  const prior = actionRetry(authority.events, grant, ['supplement-registered']);
  if (prior) {
    const supplement = prior.payload.supplement;
    if (
      !sameValue(grant.parameters, supplement.parameters) ||
      supplement.digest !== digest ||
      supplement.target_role !== input.forRole
    ) {
      stableConflict('Supplement retry differs from the already authorized result.');
    }
    ensureExactFile(supplementPath(absolute, supplement.supplement_id), bytes);
    return supplementResult(authority.state, absolute, prior);
  }
  const state = authority.state;
  if (state.protocol.state !== 'intervention-required') {
    fail(
      'APR_INVALID_TRANSITION',
      'Supplement registration requires an active intervention.',
      'Read status and register supplements only against frozen intervention authority.'
    );
  }
  if (state.protocol.intervention?.reason !== 'turn-budget-exhausted') {
    fail(
      'APR_INVALID_TRANSITION',
      'Supplement registration requires a turn-budget intervention.',
      'Resolve stale claims or participant loss with their dedicated recovery action.'
    );
  }
  const targetTurn = interventionTurn(state, input.forRole);
  const parameters = {
    content_digest: digest,
    target_role: input.forRole,
    target_turn: targetTurn,
  };
  const supplementId = `supplement-${digest.slice('sha256:'.length, 'sha256:'.length + 16)}-${input.forRole}-${targetTurn}`;
  const registered = await mutateProtectedReview(absolute, expected(state), {
    action: 'supplement',
    parameters,
    grant,
    now: input.now ?? new Date(),
    hostVerifier: deps.hostVerifier,
    preflight: () => {
      if (sha256(normalizedSupplement(regularInputFile(source))) !== digest) {
        fail(
          'APR_SUPPLEMENT_CHANGED',
          'Supplement changed while authority was being consumed.',
          'Request a new challenge for the current normalized content.'
        );
      }
      validateExactFile(supplementPath(absolute, supplementId), bytes);
    },
    createEvent: (current, attestation) => {
      return eventFor(
        current,
        'supplement-registered',
        attestation.signer_fingerprint,
        {
          supplement: {
            supplement_id: supplementId,
            digest,
            target_role: input.forRole,
            target_turn: targetTurn,
            content_retention: 'scratch-only',
            acknowledged_at: null,
            parameters,
            attestation,
          },
        },
        input.now ?? new Date()
      );
    },
  });
  ensureExactFile(supplementPath(absolute, supplementId), bytes);
  return supplementResult(registered, absolute, inspectReviewAuthority(absolute).events.at(-1));
}

function retainedWorkspacePaths(workspace, { includeReservation = false } = {}) {
  const visit = (directory) =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(workspace, absolute).split(path.sep).join('/');
      if (
        (!includeReservation && relative === 'collateral-reservation.json') ||
        relative === 'locks/review.lock'
      )
        return [];
      return entry.isDirectory() ? visit(absolute) : [relative];
    });
  return visit(workspace).sort();
}

function releaseReservation(workspace, reviewId) {
  const file = path.join(workspace, 'collateral-reservation.json');
  if (!entryExists(file)) return;
  let record;
  try {
    record = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    collision(file);
  }
  if (
    record?.schema !== 'ai-peer-review.collateral-reservation/v1' ||
    record.review_id !== reviewId
  ) {
    collision(file);
  }
  unlinkSync(file);
}

export async function abandonReview(input) {
  const absolute = path.resolve(input.workspace);
  const authority = inspectReviewAuthority(absolute);
  const state = authority.state;
  const reason = String(input.reason ?? '').trim();
  const prior = [...authority.events].reverse().find((event) => event.type === 'abandoned');
  if (prior) {
    if (prior.actor !== input.identity?.session_fingerprint || prior.payload.reason !== reason) {
      stableConflict('Abandonment retry differs from the terminal event.');
    }
    releaseReservation(absolute, state.protocol.review_id);
    return result(
      'abandon',
      state,
      { workspace: absolute },
      {
        actor: prior.actor,
        reason,
        retained_paths: prior.payload.retained_paths,
      }
    );
  }
  if (
    state.protocol.state !== 'intervention-required' ||
    !reason ||
    !['author', 'reviewer'].some(
      (role) =>
        state.participants[role]?.session_fingerprint === input.identity?.session_fingerprint
    )
  ) {
    fail(
      'APR_INVALID_TRANSITION',
      'Abandonment requires one registered participant during intervention.',
      'Resume from the registered author or reviewer session and provide a reason.'
    );
  }
  const retainedPaths = retainedWorkspacePaths(absolute);
  const abandoned = await mutateReview(absolute, expected(state), (current) =>
    eventFor(
      current,
      'abandoned',
      input.identity.session_fingerprint,
      {
        intervention_id: current.protocol.intervention.intervention_id,
        reason,
        retained_paths: retainedPaths,
      },
      input.now ?? new Date()
    )
  );
  releaseReservation(absolute, abandoned.protocol.review_id);
  return result(
    'abandon',
    abandoned,
    { workspace: absolute },
    {
      actor: input.identity.session_fingerprint,
      reason,
      retained_paths: retainedPaths,
    }
  );
}

function recoveryResult(state, workspace, review = {}) {
  return result('recover', state, { workspace }, review);
}

export async function recoverReview(input, deps = {}) {
  const absolute = path.resolve(input.workspace);
  const authority = inspectReviewAuthority(absolute);
  let state = authority.state;
  const role = state.protocol.intervention?.interrupted_state?.startsWith('author')
    ? 'author'
    : state.protocol.intervention?.interrupted_state?.startsWith('reviewer')
      ? 'reviewer'
      : state.protocol.current_actor;
  if (!input.reclaim && !input.replaceParticipant) {
    const observed = ['author', 'reviewer'].includes(role)
      ? deriveClaimStatus(state, role, input.now ?? new Date())
      : { status: 'not-applicable', claim: null };
    return recoveryResult(state, absolute, {
      mutation: false,
      role,
      claim_status: observed.status,
      intervention: state.protocol.intervention,
      deliveries: state.protocol.deliveries,
      terminal_evidence: state.protocol.terminal_evidence,
    });
  }
  if (input.reclaim) {
    if (!['author', 'reviewer'].includes(role) || input.identity?.role !== role) {
      fail(
        'APR_CLAIM_CONFLICT',
        'Recovery identity does not match the stale role.',
        'Resume from the same registered role session.'
      );
    }
    const previous = [...authority.events]
      .reverse()
      .find(
        (event) => event.type === 'same-session-reclaim' && event.payload.new_claim.role === role
      );
    if (
      previous &&
      state.protocol.claims[role]?.claim_id === previous.payload.new_claim.claim_id &&
      previous.payload.new_claim.session_fingerprint === input.identity.session_fingerprint
    ) {
      return recoveryResult(state, absolute, {
        mutation: true,
        recovery: 'same-session-reclaim',
        claim: state.protocol.claims[role],
      });
    }
    if (state.protocol.state !== 'intervention-required') {
      state = await mutateReview(absolute, expected(state), (current) =>
        enterStaleClaimIntervention(current, role, input.now ?? new Date())
      );
    }
    state = await mutateReview(absolute, expected(state), (current) =>
      reclaimRole(current, input.identity, input.now ?? new Date())
    );
    return recoveryResult(state, absolute, {
      mutation: true,
      recovery: 'same-session-reclaim',
      claim: state.protocol.claims[role],
    });
  }
  const replacementRole = input.replaceParticipant;
  const grant = operationalGrant(
    input.grant,
    input.cwd ?? state.protocol.startup.context.repository_root
  );
  const prior = actionRetry(authority.events, grant, ['participant-replaced']);
  if (prior) {
    if (
      !sameValue(grant.parameters, prior.payload.parameters) ||
      prior.payload.role !== replacementRole ||
      prior.payload.incoming_participant.session_fingerprint !== input.identity?.session_fingerprint
    ) {
      stableConflict('Participant replacement retry differs from the authorized result.');
    }
    state = await ensureTurnClaim(
      absolute,
      state,
      replacementRole,
      input.identity,
      input.now ?? new Date()
    );
    return recoveryResult(state, absolute, {
      mutation: true,
      recovery: 'participant-replaced',
      prior_participant: prior.payload.outgoing_claim.session_fingerprint,
      participant: state.participants[replacementRole],
    });
  }
  const outgoing = state.protocol.claims[replacementRole];
  if (
    state.protocol.state !== 'intervention-required' ||
    state.protocol.intervention?.reason !== 'participant-loss' ||
    !outgoing ||
    input.identity?.role !== replacementRole
  ) {
    fail(
      'APR_CLAIM_CONFLICT',
      'Participant replacement does not match participant-loss authority.',
      'Enter participant-loss intervention and retry with the exact replacement role.'
    );
  }
  const otherRole = replacementRole === 'author' ? 'reviewer' : 'author';
  assertDistinctParticipants(input.identity, state.participants[otherRole]);
  const parameters = {
    role: replacementRole,
    outgoing_claim_id: outgoing.claim_id,
    outgoing_session_fingerprint: outgoing.session_fingerprint,
    incoming_session_fingerprint: input.identity.session_fingerprint,
  };
  state = await mutateProtectedReview(absolute, expected(state), {
    action: 'replace-participant',
    parameters,
    grant,
    now: input.now ?? new Date(),
    hostVerifier: deps.hostVerifier,
    createEvent: (current, attestation) =>
      eventFor(
        current,
        'participant-replaced',
        attestation.signer_fingerprint,
        {
          intervention_id: current.protocol.intervention.intervention_id,
          role: replacementRole,
          outgoing_claim: outgoing,
          incoming_participant: input.identity,
          parameters,
          attestation,
        },
        input.now ?? new Date()
      ),
  });
  await deps.checkpoint?.('participant-replaced');
  state = await ensureTurnClaim(
    absolute,
    state,
    replacementRole,
    input.identity,
    input.now ?? new Date()
  );
  return recoveryResult(state, absolute, {
    mutation: true,
    recovery: 'participant-replaced',
    prior_participant: outgoing.session_fingerprint,
    participant: state.participants[replacementRole],
  });
}

function submissionAuthority(workspace) {
  const absolute = path.resolve(workspace);
  const authority = inspectReviewAuthority(absolute);
  const { paths } = sealedPaths(authority.state);
  return { absolute, paths, ...authority };
}

function assertSubmissionClaim(
  state,
  role,
  identity,
  now,
  { requireCurrent = true, requireActive = true } = {}
) {
  const participant = state.participants[role];
  const claim = state.protocol.claims[role];
  if (
    (requireCurrent && state.protocol.current_actor !== role) ||
    identity?.role !== role ||
    identity?.session_fingerprint !== participant?.session_fingerprint ||
    claim?.session_fingerprint !== participant?.session_fingerprint
  ) {
    fail(
      'APR_IDENTITY_CONFLICT',
      `Submission does not match the current ${role} participant and claim.`,
      `Resume from the registered ${role} session and retry.`
    );
  }
  if (requireActive && deriveClaimStatus(state, role, now ?? new Date()).status !== 'active') {
    fail(
      'APR_CLAIM_INVALID',
      `The ${role} claim is stale and cannot submit.`,
      'Run peer-review status <workspace>, then use its exact stale-claim recovery command.'
    );
  }
}

function assertCurrentParticipant(state, role, identity, now) {
  assertSubmissionClaim(state, role, identity, now);
}

async function refreshSubmissionIdentity(
  authority,
  role,
  identity,
  now,
  { requireActive = true } = {}
) {
  const prior = authority.state.participants[role];
  const changed = identityChangeEvent(authority.state, prior, identity, now ?? new Date());
  if (!changed) return authority;
  await mutateReview(authority.absolute, expected(authority.state), (current) => {
    assertSubmissionClaim(current, role, identity, now, {
      requireCurrent: false,
      requireActive,
    });
    return identityChangeEvent(current, current.participants[role], identity, now ?? new Date());
  });
  return submissionAuthority(authority.absolute);
}

function latestHead(state, events) {
  const committed = [...events]
    .reverse()
    .find((event) =>
      ['author-revision-committed', 'author-closing-round-committed'].includes(event.type)
    );
  return committed?.payload.commit ?? events[0]?.payload.artifact.head ?? null;
}

function assertReviewerRepository(input, state, events, repository) {
  const root = repository.root(input.cwd);
  if (root !== state.protocol.startup.context.repository_root) {
    fail(
      'APR_REVIEWER_GIT_VIOLATION',
      'Reviewer submission came from a different physical worktree.',
      'Return to the exact event-authorized worktree and retry.'
    );
  }
  const artifact = repository.artifactState(root, state.protocol.artifact.path);
  const expectedHead = latestHead(state, events);
  const response = sealedPaths(state).paths.reviewerResponse(
    state.protocol.turns_used + 1
  ).relative;
  const boundary = repository.reviewerBoundary(root, response);
  const precedingNoCommitHandoff = [...events]
    .reverse()
    .find((event) =>
      ['author-revision-sealed-no-commit', 'author-closing-round-sealed-no-commit'].includes(
        event.type
      )
    );
  const snapshotMatches =
    state.protocol.commit_mode !== 'no-commit' ||
    precedingNoCommitHandoff === undefined ||
    exactRegularDigest(
      path.join(
        sealedPaths(state).paths.scratch.absolute,
        precedingNoCommitHandoff.payload.snapshot.path
      ),
      precedingNoCommitHandoff.payload.snapshot.digest
    );
  const artifactMatches =
    state.protocol.commit_mode === 'no-commit'
      ? artifact.head === expectedHead &&
        `sha256:${artifact.worktreeDigest}` === state.protocol.artifact.digest
      : artifact.clean &&
        artifact.head === expectedHead &&
        artifact.blob === state.protocol.artifact.blob &&
        `sha256:${artifact.worktreeDigest}` === state.protocol.artifact.digest;
  if (
    !artifactMatches ||
    !snapshotMatches ||
    !sameValue(boundary, state.protocol.reviewer_boundary)
  ) {
    fail(
      'APR_REVIEWER_GIT_VIOLATION',
      'Reviewer submission detected artifact or HEAD mutation.',
      'Restore the event-authorized artifact and HEAD without discarding unrelated work.',
      {
        artifact_matches: artifactMatches,
        snapshot_matches: snapshotMatches,
        observed_boundary: boundary,
        expected_boundary: state.protocol.reviewer_boundary,
      }
    );
  }
  return root;
}

function decisionFromResponse(file) {
  return parseResponse(readFileSync(file)).sections.find(({ heading }) => heading === 'Decision')
    ?.content;
}

function deliveryEvent(state, actor, recipient, deliveryId, valueDigest, now) {
  return eventFor(
    state,
    'delivery-written',
    actor,
    { delivery: { delivery_id: deliveryId, recipient, digest: valueDigest } },
    now
  );
}

function checkpoint(deps, name) {
  deps.checkpoint?.(name);
}

function sealedReviewerFromEvent(root, event) {
  const file = path.join(root, event.payload.response.path);
  const bytes = readFileSync(file);
  if (sha256(bytes) !== event.payload.response.digest) {
    fail(
      'APR_PROTECTED_METADATA_CHANGED',
      'Event-authorized reviewer response bytes changed.',
      'Restore the exact sealed reviewer response before retrying the handoff.'
    );
  }
  const parsed = parseResponse(bytes);
  return Object.freeze({
    path: file,
    digest: event.payload.response.digest,
    role: 'reviewer',
    turn: event.payload.turn,
    submitted_at: parsed.metadata.submitted_at,
    finding_ids: Object.freeze([...event.payload.finding_ids]),
    answered_finding_ids: Object.freeze([]),
    acknowledged_supplement_ids: Object.freeze([
      ...(parsed.metadata.acknowledged_supplement_ids ?? []),
    ]),
  });
}

async function completeReviewerHandoff({ input, deps, absolute, paths, state, sealed }) {
  let current = (
    await refreshSubmissionIdentity(
      { absolute, paths, state },
      'reviewer',
      input.identity,
      input.now,
      { requireActive: false }
    )
  ).state;
  let nextResponse = null;
  if (input.decision === 'revisions-requested') {
    const author = current.participants.author;
    const claim = current.protocol.claims.author;
    if (!claim) {
      current = await mutateReview(absolute, expected(current), (locked) =>
        claimRole(locked, author, input.now ?? new Date())
      );
    } else if (claim.session_fingerprint !== author.session_fingerprint) {
      fail(
        'APR_CLAIM_CONFLICT',
        'Author handoff claim differs from participant authority.',
        'Use the governed claim recovery flow before retrying.'
      );
    }
    checkpoint(deps, 'author-claimed');
    nextResponse = createResponseDraft(
      {
        ...current,
        paths,
        pending_finding_ids: sealed.finding_ids,
        artifact_commit: latestHead(current, inspectReviewAuthority(absolute).events),
      },
      'author',
      sealed.turn
    ).path;
    checkpoint(deps, 'author-draft-created');
  }
  const deliveryId = `reviewer-turn-${sealed.turn}-to-author`;
  const prior = current.protocol.deliveries.find((delivery) => delivery.delivery_id === deliveryId);
  if (prior) {
    if (prior.recipient !== 'author' || prior.digest !== sealed.digest) {
      fail(
        'APR_DELIVERY_CONFLICT',
        'Reviewer handoff delivery conflicts with event authority.',
        'Preserve the delivery and inspect the conflict before recovery.'
      );
    }
    current = await readReview(absolute);
  } else {
    current = await mutateReview(absolute, expected(current), (locked) =>
      deliveryEvent(
        locked,
        input.identity.session_fingerprint,
        'author',
        deliveryId,
        sealed.digest,
        input.now ?? new Date()
      )
    );
  }
  checkpoint(deps, 'delivery-written');
  return result(
    'submit',
    current,
    { workspace: absolute, response: nextResponse ?? sealed.path },
    { decision: input.decision, response: sealed }
  );
}

export async function submitReviewTurn(input, deps = {}) {
  const repository = deps.repository ?? createGitRepository();
  const authority = submissionAuthority(input.workspace);
  const initialDecision = latestReviewerDecision(authority.events);
  const recoverable =
    authority.state.protocol.state !== 'reviewer-turn' &&
    initialDecision?.type ===
      (input.decision === 'accepted' ? 'reviewer-accepted' : 'reviewer-revisions-requested') &&
    initialDecision.actor === input.identity?.session_fingerprint &&
    ['author-revision', 'acceptance-pending'].includes(authority.state.protocol.state);
  if (authority.state.protocol.state !== 'reviewer-turn' && !recoverable) {
    fail(
      'APR_INVALID_TRANSITION',
      'Reviewer submission is not the current review action.',
      'Read status and follow its exact next action.'
    );
  }
  assertSubmissionClaim(authority.state, 'reviewer', input.identity, input.now, {
    requireCurrent: !recoverable,
    requireActive: !recoverable,
  });
  const { absolute, paths, events, state } = authority;
  if (state.protocol.state !== 'reviewer-turn') {
    const decision = latestReviewerDecision(events);
    const expectedType =
      input.decision === 'accepted' ? 'reviewer-accepted' : 'reviewer-revisions-requested';
    const root = state.protocol.startup.context.repository_root;
    if (
      decision?.type === expectedType &&
      decision.actor === input.identity?.session_fingerprint &&
      ['author-revision', 'acceptance-pending'].includes(state.protocol.state)
    ) {
      const sealed = sealedReviewerFromEvent(root, decision);
      return completeReviewerHandoff({ input, deps, absolute, paths, state, sealed });
    }
    fail(
      'APR_INVALID_TRANSITION',
      'Reviewer submission is not the current review action.',
      'Read status and follow its exact next action.'
    );
  }
  assertCurrentParticipant(state, 'reviewer', input.identity, input.now);
  assertReviewerRepository(input, state, events, repository);
  const responseFile = paths.reviewerResponse(state.protocol.turns_used + 1).absolute;
  const authoredDecision = decisionFromResponse(responseFile);
  if (
    !['revisions-requested', 'accepted'].includes(input.decision) ||
    authoredDecision !== input.decision
  ) {
    fail(
      'APR_RESPONSE_INVALID',
      'Reviewer decision differs from the response or command.',
      'Use the same revisions-requested or accepted decision in both places.'
    );
  }
  const priorFindingIds = events.flatMap((event) =>
    ['reviewer-revisions-requested', 'reviewer-accepted'].includes(event.type)
      ? event.payload.finding_ids
      : []
  );
  const sealed = sealResponse(
    { ...state, paths, now: input.now, prior_finding_ids: priorFindingIds },
    responseFile,
    input.identity
  );
  checkpoint(deps, 'response-sealed');
  const eventType =
    input.decision === 'accepted' ? 'reviewer-accepted' : 'reviewer-revisions-requested';
  const decided = await mutateReview(absolute, expected(state), (current) => {
    assertCurrentParticipant(current, 'reviewer', input.identity, input.now);
    assertReviewerRepository(input, current, events, repository);
    return eventFor(
      current,
      eventType,
      input.identity.session_fingerprint,
      {
        turn: sealed.turn,
        response: {
          path: path.relative(state.protocol.startup.context.repository_root, sealed.path),
          digest: sealed.digest,
        },
        finding_ids: sealed.finding_ids,
      },
      input.now ?? new Date()
    );
  });
  checkpoint(deps, 'decision-appended');
  return completeReviewerHandoff({ input, deps, absolute, paths, state: decided, sealed });
}

function latestReviewerDecision(events) {
  return [...events]
    .reverse()
    .find((event) => ['reviewer-revisions-requested', 'reviewer-accepted'].includes(event.type));
}

function relativeSealed(root, file, sealed, mode = '100644') {
  return {
    path: path.relative(root, file),
    bytes: readFileSync(file),
    digest: sealed.digest,
    mode,
  };
}

function latestAuthorSubmission(events) {
  return [...events]
    .reverse()
    .find((event) =>
      [
        'author-revision-committed',
        'author-closing-round-committed',
        'author-revision-sealed-no-commit',
        'author-closing-round-sealed-no-commit',
      ].includes(event.type)
    );
}

function sealedAuthorFromEvent(root, event) {
  const file = path.join(root, event.payload.response.path);
  const bytes = readFileSync(file);
  if (sha256(bytes) !== event.payload.response.digest) {
    fail(
      'APR_GIT_SEAL_MISMATCH',
      'Event-authorized author response bytes changed.',
      'Restore the exact sealed author response before retrying the handoff.'
    );
  }
  const metadata = parseResponse(bytes).metadata;
  return Object.freeze({
    path: file,
    digest: event.payload.response.digest,
    role: 'author',
    turn: event.payload.turn,
    submitted_at: metadata.submitted_at,
    finding_ids: Object.freeze([]),
    answered_finding_ids: Object.freeze([...metadata.answered_finding_ids]),
    acknowledged_supplement_ids: Object.freeze([...(metadata.acknowledged_supplement_ids ?? [])]),
  });
}

function authorTrailers(state, event, decision) {
  return {
    'Peer-Review-ID': state.protocol.review_id,
    'Peer-Review-Turn': String(event.payload.turn),
    'Peer-Review-Artifact-Blob': event.payload.artifact.blob,
    'Peer-Review-Reviewer-Response': decision.payload.response.digest,
    'Peer-Review-Author-Response': event.payload.response.digest,
  };
}

async function completeAuthorHandoff({
  input,
  deps,
  absolute,
  paths,
  events,
  state,
  event,
  sealedResponse,
  artifactBytes,
  commit,
  snapshot = null,
}) {
  let current = (
    await refreshSubmissionIdentity(
      { absolute, paths, state },
      'author',
      input.identity,
      input.now,
      { requireActive: false }
    )
  ).state;
  let nextResponse = null;
  if (current.protocol.state === 'reviewer-turn') {
    nextResponse = createResponseDraft(
      {
        ...current,
        paths,
        artifact_commit: event.payload.commit ?? latestHead(current, events),
      },
      'reviewer',
      event.payload.turn + 1
    ).path;
  }
  checkpoint(deps, 'reviewer-draft-created');
  const deliveryId = `author-turn-${event.payload.turn}-to-reviewer`;
  const prior = current.protocol.deliveries.find((delivery) => delivery.delivery_id === deliveryId);
  if (prior) {
    if (prior.recipient !== 'reviewer' || prior.digest !== sealedResponse.digest) {
      fail(
        'APR_DELIVERY_CONFLICT',
        'Author handoff delivery conflicts with event authority.',
        'Preserve the delivery and inspect the conflict before recovery.'
      );
    }
    current = await readReview(absolute);
  } else {
    current = await mutateReview(absolute, expected(current), (locked) =>
      deliveryEvent(
        locked,
        input.identity.session_fingerprint,
        'reviewer',
        deliveryId,
        sealedResponse.digest,
        input.now ?? new Date()
      )
    );
  }
  checkpoint(deps, 'delivery-written');
  return result(
    'submit',
    current,
    { workspace: absolute, response: nextResponse ?? sealedResponse.path },
    {
      response: sealedResponse,
      artifact: {
        path: event.payload.artifact.path,
        bytes: artifactBytes,
        digest: event.payload.artifact.digest,
      },
      commit,
      ...(snapshot ? { snapshot } : {}),
    }
  );
}

async function recoverAuthorHandoff({ input, deps, authority, git, transactionRepository }) {
  const { absolute, paths, events, state } = authority;
  const event = latestAuthorSubmission(events);
  const author = state.participants.author;
  if (
    !event ||
    event.actor !== input.identity?.session_fingerprint ||
    author?.session_fingerprint !== input.identity?.session_fingerprint ||
    !['reviewer-turn', 'intervention-required'].includes(state.protocol.state)
  ) {
    fail(
      'APR_INVALID_TRANSITION',
      'Author submission is not the current review action.',
      'Read status and follow its exact next action.'
    );
  }
  const root = git.root(input.cwd);
  if (root !== state.protocol.startup.context.repository_root) {
    fail(
      'APR_GIT_WORKTREE_CHANGED',
      'Author submission came from a different physical worktree.',
      'Return to the exact event-authorized worktree and retry.'
    );
  }
  const artifactFile = path.join(root, event.payload.artifact.path);
  const artifactBytes = readFileSync(artifactFile);
  if (
    sha256(artifactBytes) !== event.payload.artifact.digest ||
    transactionRepository.hashWorking(event.payload.artifact.path) !== event.payload.artifact.blob
  ) {
    fail(
      'APR_GIT_SEAL_MISMATCH',
      'Event-authorized artifact bytes changed.',
      'Restore the exact submitted artifact before retrying the handoff.'
    );
  }
  const sealedResponse = sealedAuthorFromEvent(root, event);
  const eventIndex = events.indexOf(event);
  const priorArtifact = events
    .slice(0, eventIndex)
    .reverse()
    .find((candidate) => candidate.payload.artifact)?.payload.artifact;
  const artifactChanged = priorArtifact?.digest !== event.payload.artifact.digest;
  if (artifactChanged && input.noArtifactChange) {
    fail(
      'APR_ARTIFACT_CHANGED',
      'Recovered artifact changed despite --no-artifact-change.',
      'Retry with the exact original author submission options.'
    );
  }
  if (!artifactChanged) {
    const reason = parseResponse(readFileSync(sealedResponse.path)).sections.find(
      ({ heading }) => heading === 'Declined changes and rationale'
    )?.content;
    if (
      !input.noArtifactChange ||
      !String(input.reason ?? '').trim() ||
      reason !== input.reason.trim()
    ) {
      fail(
        'APR_ARTIFACT_UNCHANGED',
        'Recovered unchanged artifact does not match the original rationale.',
        'Retry with the exact original --no-artifact-change and --reason values.'
      );
    }
  }
  let commit = null;
  let snapshot = null;
  if (event.type.endsWith('-committed')) {
    const decision = latestReviewerDecision(events);
    const reviewerFile = path.join(root, decision.payload.response.path);
    const reviewerBytes = readFileSync(reviewerFile);
    if (sha256(reviewerBytes) !== decision.payload.response.digest) {
      fail(
        'APR_GIT_SEAL_MISMATCH',
        'Event-authorized reviewer response bytes changed.',
        'Restore the exact sealed reviewer response before retrying the handoff.'
      );
    }
    const trailers = authorTrailers(state, event, decision);
    const journal = transactionRepository.readTransaction(trailers);
    if (!journal.record) {
      fail(
        'APR_GIT_RECOVERY_INVALID',
        'The committed author handoff has no durable transaction journal.',
        'Preserve the repository and restore the transaction journal before retrying.'
      );
    }
    commit = commitExactPaths(
      transactionRepository,
      {
        expected_head: journal.record.expected_head,
        paths: [
          {
            path: decision.payload.response.path,
            bytes: reviewerBytes,
            digest: decision.payload.response.digest,
            mode: journal.record.paths.find(
              (entry) => entry.path === decision.payload.response.path
            )?.mode,
          },
          {
            path: event.payload.artifact.path,
            bytes: artifactBytes,
            digest: event.payload.artifact.digest,
            mode: journal.record.paths.find((entry) => entry.path === event.payload.artifact.path)
              ?.mode,
          },
          relativeSealed(
            root,
            sealedResponse.path,
            sealedResponse,
            journal.record.paths.find(
              (entry) => entry.path === path.relative(root, sealedResponse.path)
            )?.mode
          ),
        ],
        commit_paths: journal.record.commit_paths,
      },
      journal.record.message,
      trailers
    );
    if (commit.commit !== event.payload.commit) {
      fail(
        'APR_GIT_RECOVERY_INVALID',
        'Recovered Git commit differs from protocol authority.',
        'Preserve the repository and inspect the commit and protocol event.'
      );
    }
  } else {
    const baseline = state.protocol.startup.no_commit_baseline;
    const observed = git.baseline(root);
    const snapshotFile = path.join(absolute, event.payload.snapshot.path);
    const artifactMode = transactionRepository.modeAt(
      events[0].payload.artifact.head,
      event.payload.artifact.path
    );
    if (
      !preservesNoCommitBaseline(
        baseline,
        observed,
        event.payload.artifact.path,
        noCommitOwnedChangedPaths(state)
      ) ||
      transactionRepository.workingMode(event.payload.artifact.path) !== artifactMode ||
      !exactFile(snapshotFile, artifactBytes)
    ) {
      fail(
        'APR_REVIEWER_GIT_VIOLATION',
        'No-commit handoff recovery detected repository or snapshot mutation.',
        'Restore the startup HEAD, index, and exact artifact snapshot before retrying.'
      );
    }
    snapshot = { ...event.payload.snapshot, path: snapshotFile };
  }
  return completeAuthorHandoff({
    input,
    deps,
    absolute,
    paths,
    events,
    state,
    event,
    sealedResponse,
    artifactBytes,
    commit,
    snapshot,
  });
}

export async function submitAuthorTurn(input, deps = {}) {
  const git = deps.repository ?? createGitRepository();
  const transactionRepository =
    deps.transactionRepository ?? createGitTransactionRepository(input.cwd);
  const authority = submissionAuthority(input.workspace);
  const initialSubmission = latestAuthorSubmission(authority.events);
  const recoverable =
    authority.state.protocol.state !== 'author-revision' &&
    initialSubmission?.actor === input.identity?.session_fingerprint &&
    ['reviewer-turn', 'intervention-required'].includes(authority.state.protocol.state);
  if (authority.state.protocol.state !== 'author-revision' && !recoverable) {
    fail(
      'APR_INVALID_TRANSITION',
      'Author submission is not the current review action.',
      'Read status and follow its exact next action.'
    );
  }
  assertSubmissionClaim(authority.state, 'author', input.identity, input.now, {
    requireCurrent: !recoverable,
    requireActive: !recoverable,
  });
  const { absolute, paths, events, state } = authority;
  if (state.protocol.state !== 'author-revision') {
    return recoverAuthorHandoff({ input, deps, authority, git, transactionRepository });
  }
  assertCurrentParticipant(state, 'author', input.identity, input.now);
  const root = git.root(input.cwd);
  if (root !== state.protocol.startup.context.repository_root) {
    fail(
      'APR_GIT_WORKTREE_CHANGED',
      'Author submission came from a different physical worktree.',
      'Return to the exact event-authorized worktree and retry.'
    );
  }
  const decision = latestReviewerDecision(events);
  if (!decision || decision.type !== 'reviewer-revisions-requested') {
    fail(
      'APR_INVALID_TRANSITION',
      'Author revision has no event-authorized reviewer request.',
      'Restore the exact reviewer decision event before submitting.'
    );
  }
  const turn = decision.payload.turn;
  const responseFile = paths.authorResponse(turn).absolute;
  const artifactFile = path.join(root, state.protocol.artifact.path);
  const artifactBytes = readFileSync(artifactFile);
  const artifactDigest = sha256(artifactBytes);
  const artifactChanged = artifactDigest !== state.protocol.artifact.digest;
  if (!artifactChanged && (!input.noArtifactChange || !String(input.reason ?? '').trim())) {
    fail(
      'APR_ARTIFACT_UNCHANGED',
      'Author submission did not change the artifact.',
      'Change the artifact or use --no-artifact-change with a non-empty reason.'
    );
  }
  if (artifactChanged && input.noArtifactChange) {
    fail(
      'APR_ARTIFACT_CHANGED',
      'The artifact changed despite --no-artifact-change.',
      'Remove the flag or restore the event-authorized artifact bytes.'
    );
  }
  const expectedHead = latestHead(state, events);
  const artifactMode = transactionRepository.modeAt(expectedHead, state.protocol.artifact.path);
  if (transactionRepository.workingMode(state.protocol.artifact.path) !== artifactMode) {
    fail(
      'APR_GIT_SEAL_MISMATCH',
      'Artifact mode differs from event-authorized Git mode.',
      `Restore mode ${artifactMode} for ${state.protocol.artifact.path} and retry.`
    );
  }
  const reviewerFile = path.join(root, decision.payload.response.path);
  const reviewerBytes = readFileSync(reviewerFile);
  if (sha256(reviewerBytes) !== decision.payload.response.digest) {
    fail(
      'APR_GIT_SEAL_MISMATCH',
      'The sealed reviewer response changed before author submission.',
      'Restore the exact event-authorized reviewer response bytes.'
    );
  }
  const sealedResponse = sealResponse(
    {
      ...state,
      paths,
      now: input.now,
      pending_finding_ids: decision.payload.finding_ids,
      artifact_commit: latestHead(state, events),
    },
    responseFile,
    input.identity,
    { declinedReason: input.noArtifactChange ? input.reason : null }
  );
  checkpoint(deps, 'response-sealed');
  const artifactBlob = transactionRepository.hashWorking(state.protocol.artifact.path);
  if (state.protocol.commit_mode === 'no-commit') {
    const baseline = state.protocol.startup.no_commit_baseline;
    const snapshotRelative = `artifacts/turn-${turn}.md`;
    const snapshotFile = path.join(absolute, snapshotRelative);
    const responses = [
      { digest: decision.payload.response.digest },
      { digest: sealedResponse.digest },
    ];
    const store = {
      assertBaseline() {
        const observed = git.baseline(root);
        if (
          !preservesNoCommitBaseline(
            baseline,
            observed,
            state.protocol.artifact.path,
            noCommitOwnedChangedPaths(state)
          )
        ) {
          fail(
            'APR_REVIEWER_GIT_VIOLATION',
            'No-commit submission detected HEAD, index, or pre-existing path mutation.',
            'Restore the startup HEAD, index, and unrelated changed paths without discarding protocol-owned working bytes.'
          );
        }
      },
      writeExclusiveSnapshot(reviewId, sequence, bytes) {
        if (reviewId !== state.protocol.review_id || sequence !== state.protocol.sequence + 1) {
          fail(
            'APR_STALE_REVIEW',
            'No-commit snapshot request differs from current event authority.',
            'Read current status and retry the exact author handoff.'
          );
        }
        ensureExactFile(snapshotFile, bytes);
        return { relative: snapshotRelative, digest: sha256(bytes) };
      },
    };
    const noCommitSeal = sealNoCommitHandoff({
      review: state,
      artifactBytes,
      responses,
      store,
    });
    checkpoint(deps, 'artifact-snapshotted');
    const snapshot = {
      path: noCommitSeal.snapshot_path,
      digest: noCommitSeal.snapshot_digest,
    };
    const nextReviewerPath = paths.reviewerResponse(turn + 1);
    const repositoryBoundary = git.reviewerBoundary(root, nextReviewerPath.relative);
    const eventType =
      turn >= state.protocol.max_turns
        ? 'author-closing-round-sealed-no-commit'
        : 'author-revision-sealed-no-commit';
    const sealedState = await mutateReview(absolute, expected(state), (current) => {
      assertCurrentParticipant(current, 'author', input.identity, input.now);
      const lockedSeal = sealNoCommitHandoff({
        review: current,
        artifactBytes,
        responses,
        store,
      });
      if (!sameValue(lockedSeal, noCommitSeal) || !exactFile(snapshotFile, artifactBytes)) {
        fail(
          'APR_REVIEWER_GIT_VIOLATION',
          'No-commit repository authority changed during submission.',
          'Restore the startup HEAD, index, and exact artifact snapshot before retrying.'
        );
      }
      const payload = {
        turn,
        response: {
          path: path.relative(root, sealedResponse.path),
          digest: sealedResponse.digest,
        },
        artifact: {
          path: state.protocol.artifact.path,
          blob: artifactBlob,
          digest: noCommitSeal.artifact_digest,
        },
        snapshot,
        repository_boundary: repositoryBoundary,
      };
      if (eventType === 'author-closing-round-sealed-no-commit') {
        Object.assign(payload, {
          intervention_id: `intervention-turn-budget-${turn}`,
          reason: 'turn-budget-exhausted',
          interrupted_state: 'reviewer-turn',
        });
      }
      return eventFor(
        current,
        eventType,
        input.identity.session_fingerprint,
        payload,
        input.now ?? new Date()
      );
    });
    checkpoint(deps, 'author-event-appended');
    const event = latestAuthorSubmission(inspectReviewAuthority(absolute).events);
    return completeAuthorHandoff({
      input,
      deps,
      absolute,
      paths,
      events,
      state: sealedState,
      event,
      sealedResponse,
      artifactBytes,
      commit: null,
      snapshot: { ...snapshot, path: snapshotFile },
    });
  }
  const transaction = {
    expected_head: expectedHead,
    paths: [
      {
        path: decision.payload.response.path,
        bytes: reviewerBytes,
        digest: decision.payload.response.digest,
        mode: '100644',
      },
      {
        path: state.protocol.artifact.path,
        bytes: artifactBytes,
        digest: artifactDigest,
        mode: artifactMode,
      },
      relativeSealed(root, responseFile, sealedResponse),
    ],
    commit_paths: artifactChanged
      ? [
          decision.payload.response.path,
          state.protocol.artifact.path,
          path.relative(root, responseFile),
        ]
      : [decision.payload.response.path, path.relative(root, responseFile)],
  };
  const trailers = {
    'Peer-Review-ID': state.protocol.review_id,
    'Peer-Review-Turn': String(turn),
    'Peer-Review-Artifact-Blob': artifactBlob,
    'Peer-Review-Reviewer-Response': decision.payload.response.digest,
    'Peer-Review-Author-Response': sealedResponse.digest,
  };
  const message = `Peer review revision ${turn}`;
  const commit = commitExactPaths(transactionRepository, transaction, message, trailers);
  checkpoint(deps, 'transaction-completed');
  const nextReviewerPath = paths.reviewerResponse(turn + 1);
  const repositoryBoundary = git.reviewerBoundary(root, nextReviewerPath.relative);
  const eventType =
    turn >= state.protocol.max_turns
      ? 'author-closing-round-committed'
      : 'author-revision-committed';
  const committed = await mutateReview(absolute, expected(state), (current) => {
    assertCurrentParticipant(current, 'author', input.identity, input.now);
    const retry = commitExactPaths(transactionRepository, transaction, message, trailers);
    const payload = {
      turn,
      response: {
        path: path.relative(root, sealedResponse.path),
        digest: sealedResponse.digest,
      },
      artifact: {
        path: state.protocol.artifact.path,
        blob: artifactBlob,
        digest: artifactDigest,
      },
      commit: retry.commit,
      repository_boundary: repositoryBoundary,
    };
    if (eventType === 'author-closing-round-committed') {
      Object.assign(payload, {
        intervention_id: `intervention-turn-budget-${turn}`,
        reason: 'turn-budget-exhausted',
        interrupted_state: 'reviewer-turn',
      });
    }
    return eventFor(
      current,
      eventType,
      input.identity.session_fingerprint,
      payload,
      input.now ?? new Date()
    );
  });
  checkpoint(deps, 'author-event-appended');
  const event = latestAuthorSubmission(inspectReviewAuthority(absolute).events);
  return completeAuthorHandoff({
    input,
    deps,
    absolute,
    paths,
    events,
    state: committed,
    event,
    sealedResponse,
    artifactBytes,
    commit,
  });
}

function writeJson(stream, value) {
  stream.write(`${JSON.stringify(value)}\n`);
}

function writeResult(stream, value) {
  const lines = [
    `Review ${value.review_id}: ${value.state}`,
    `Next: ${value.next_action.command ?? value.next_action}`,
  ];
  if (value.command === 'resume') lines.push(`Instructions: ${value.instructions}`);
  stream.write(`${lines.join('\n')}\n`);
}

function commandIdentity(io, state, role = null, { allowReplacement = false } = {}) {
  const roles = role ? [role] : ['author', 'reviewer'];
  for (const candidateRole of roles) {
    const identity = resolveIdentity({
      role: candidateRole,
      env: io.env,
      ...(io.identityContext ?? {}),
    });
    if (
      allowReplacement ||
      !state?.participants?.[candidateRole] ||
      state.participants[candidateRole].session_fingerprint === identity.session_fingerprint
    ) {
      return identity;
    }
  }
  fail(
    'APR_IDENTITY_CONFLICT',
    'Current session does not match the requested review participant.',
    'Resume from the registered participant session.'
  );
}

export async function run(argv, io) {
  try {
    const parsed = parseCommand(argv);
    if (parsed.command === 'help') {
      const format = parsed.options.json ? 'json' : 'text';
      const response =
        parsed.args[0] === 'search'
          ? helpRequest(parsed.args[1], format, { search: true })
          : helpRequest(parsed.args[0] ?? null, format, { all: parsed.options.all });
      if (format === 'json') writeJson(io.stdout, response);
      else io.stdout.write(response);
      return 0;
    }
    if (parsed.command === 'explain') {
      const format = parsed.options.json ? 'json' : 'text';
      const response = explainError(parsed.args[0], format);
      if (format === 'json') writeJson(io.stdout, response);
      else io.stdout.write(response);
      return 0;
    }
    if (parsed.command === 'request-grant') {
      const workspace = path.isAbsolute(parsed.args[0])
        ? parsed.args[0]
        : path.resolve(io.cwd, parsed.args[0]);
      const requesterFingerprint =
        io.requesterFingerprint ??
        resolveIdentity({ role: 'author', env: io.env, ...(io.identityContext ?? {}) })
          .session_fingerprint;
      const challenge = await requestGrant(
        workspace,
        parsed.options.action,
        parsed.options.parameters,
        { requesterFingerprint, now: io.now ?? new Date() }
      );
      writeJson(io.stdout, {
        schema: 'ai-peer-review.request-grant-result/v1',
        challenge,
        canonical_challenge: canonicalChallengeBytes(challenge).toString('base64'),
      });
      return 0;
    }
    let response;
    if (parsed.command === 'start') {
      response = await startReview(
        {
          cwd: io.cwd,
          artifact: parsed.args[0],
          artifactKind: parsed.options.artifactKind,
          identity: resolveIdentity({ role: 'author', env: io.env, ...(io.identityContext ?? {}) }),
          now: io.now ?? new Date(),
          authority: io.authority,
          transportCapability: io.transportCapability,
          ...parsed.options,
        },
        {
          verifyBootstrapGrant: io.verifyBootstrapGrant,
          verifyTestHumanAuthority: io.verifyTestHumanAuthority,
          hostVerifier: io.hostVerifier,
        }
      );
    } else if (parsed.command === 'join') {
      response = await joinReview({
        cwd: io.cwd,
        invitation: path.resolve(io.cwd, parsed.args[0]),
        identity: resolveIdentity({ role: 'reviewer', env: io.env, ...(io.identityContext ?? {}) }),
        transportCapability: io.transportCapability,
        now: io.now ?? new Date(),
      });
    } else if (parsed.command === 'status') {
      response = statusReview(path.resolve(io.cwd, parsed.args[0]), { now: io.now ?? new Date() });
    } else if (parsed.command === 'resume') {
      response = resumeReview(path.resolve(io.cwd, parsed.args[0]), { now: io.now ?? new Date() });
    } else if (parsed.command === 'submit') {
      const workspace = path.resolve(io.cwd, parsed.args[0]);
      const active = inspectReview(workspace).protocol.current_actor;
      if (active === 'reviewer') {
        response = await submitReviewTurn({
          cwd: io.cwd,
          workspace,
          identity: resolveIdentity({
            role: 'reviewer',
            env: io.env,
            ...(io.identityContext ?? {}),
          }),
          decision: parsed.options.decision,
          now: io.now ?? new Date(),
        });
      } else if (active === 'author') {
        response = await submitAuthorTurn({
          cwd: io.cwd,
          workspace,
          identity: resolveIdentity({
            role: 'author',
            env: io.env,
            ...(io.identityContext ?? {}),
          }),
          noArtifactChange: parsed.options.noArtifactChange,
          reason: parsed.options.reason,
          now: io.now ?? new Date(),
        });
      } else {
        fail(
          'APR_INVALID_TRANSITION',
          'Submit is unavailable in the current review state.',
          'Read status and follow its exact next action.'
        );
      }
    } else if (parsed.command === 'continue') {
      response = await continueReview(
        {
          cwd: io.cwd,
          workspace: path.resolve(io.cwd, parsed.args[0]),
          additionalTurns: parsed.options.additionalTurns,
          focus: parsed.options.focus,
          grant: parsed.options.grant,
          now: io.now ?? new Date(),
        },
        { hostVerifier: io.hostVerifier }
      );
    } else if (parsed.command === 'supplement') {
      response = await registerSupplement(
        {
          cwd: io.cwd,
          workspace: path.resolve(io.cwd, parsed.args[0]),
          file: parsed.args[1],
          forRole: parsed.options.for,
          grant: parsed.options.grant,
          now: io.now ?? new Date(),
        },
        { hostVerifier: io.hostVerifier }
      );
    } else if (parsed.command === 'recover') {
      const workspace = path.resolve(io.cwd, parsed.args[0]);
      const state = inspectReview(workspace);
      const role =
        parsed.options.replaceParticipant ??
        (state.protocol.intervention?.interrupted_state?.startsWith('author')
          ? 'author'
          : state.protocol.intervention?.interrupted_state?.startsWith('reviewer')
            ? 'reviewer'
            : state.protocol.current_actor);
      response = await recoverReview(
        {
          cwd: io.cwd,
          workspace,
          reclaim: parsed.options.reclaim,
          replaceParticipant: parsed.options.replaceParticipant,
          grant: parsed.options.grant,
          identity:
            parsed.options.reclaim || parsed.options.replaceParticipant
              ? commandIdentity(io, state, role, {
                  allowReplacement: Boolean(parsed.options.replaceParticipant),
                })
              : null,
          now: io.now ?? new Date(),
        },
        { hostVerifier: io.hostVerifier }
      );
    } else if (parsed.command === 'abandon') {
      const workspace = path.resolve(io.cwd, parsed.args[0]);
      const state = inspectReview(workspace);
      response = await abandonReview({
        workspace,
        identity: commandIdentity(io, state),
        reason: parsed.options.reason,
        now: io.now ?? new Date(),
      });
    } else {
      throw new AprError('APR_NOT_IMPLEMENTED', `${parsed.command} is not implemented yet`, {
        recovery: `Run peer-review help ${parsed.command} for the planned interface.`,
        details: { command: parsed.command },
      });
    }
    if (parsed.options.json) writeJson(io.stdout, response);
    else if (parsed.command === 'status' && parsed.options.next)
      io.stdout.write(`${response.next_action.command ?? ''}\n`);
    else writeResult(io.stdout, response);
    return 0;
  } catch (error) {
    const rendered =
      error instanceof AprError
        ? error
        : new AprError('APR_INTERNAL', 'unexpected peer-review failure', {
            recovery: 'Re-run with the same arguments and report the failure if it persists.',
            details: { cause: String(error?.message ?? error) },
          });
    writeJson(io.stderr, rendered.toJSON());
    return rendered.exitCode;
  }
}
