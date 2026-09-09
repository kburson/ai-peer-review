import { createHash, createPrivateKey, createPublicKey } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  canonicalChallengeBytes,
  digestChallenge,
  digestGrantParameters,
} from '../authority/canonicalize.mjs';
import { requestGrant } from '../authority/challenge.mjs';
import { verifyAndConsumeGrant } from '../authority/verify.mjs';
import { resolveReviewPaths } from '../collateral/paths.mjs';
import { createResponseDraft, reserveCollateral } from '../collateral/responses.mjs';
import { AprError } from '../errors.mjs';
import { createGitRepository } from '../git/repository.mjs';
import {
  assertDistinctParticipants,
  claimRole,
  deriveClaimStatus,
  resolveIdentity,
} from '../identity/registry.mjs';
import { eventAdvancesRevision, validateEvent } from '../protocol/events.mjs';
import {
  canonicalProjection,
  initializeReview,
  inspectReview,
  mutateReview,
} from '../protocol/service.mjs';
import { atomicCreate } from '../protocol/store.mjs';
import { hydrateTemplate } from '../templates/index.mjs';
import { explainError, helpRequest, nextActionCommand } from './help-data.mjs';
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
  return Object.freeze({
    schema: 'ai-peer-review.cli-result/v1',
    command,
    review_id: state.protocol.review_id,
    state: state.protocol.state,
    next_action: state.protocol.next_action,
    review: Object.freeze(review),
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

function startupVariables(root, artifact, paths, reviewId) {
  const startup = trackedStartupPaths(paths);
  return {
    startup,
    variables: {
      review_id: reviewId,
      artifact_absolute: path.join(root, artifact.path),
      workspace_absolute: paths.scratch.absolute,
      response_absolute: paths.reviewerResponse(1).absolute,
      invitation_absolute: startup.reviewer_invitation,
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
    const { startup, variables } = startupVariables(root, artifact, paths, reviewId);
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
    reserveCollateral({ ...state, paths });
    ensureExactFile(contextFile(paths.scratch.absolute), contextBytes);
    ensureExactFile(startup.author_startup, authorStartupBytes);
    ensureExactFile(startup.reviewer_invitation, reviewerInvitationBytes);
    return startResult(state, paths, startup);
  }

  const context = requestedContext;
  const contextBytes = Buffer.from(canonicalProjection(context));
  const { startup, variables } = startupVariables(root, artifact, paths, reviewId);
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
  const value = (label) => text.match(new RegExp(`^- ${label}: ` + '`([^`]+)`$', 'm'))?.[1];
  const reviewId = text.match(/^Review: `([^`]+)`$/m)?.[1];
  const values = {
    reviewId,
    artifact: value('Artifact'),
    workspace: value('Workspace'),
    response: value('Response'),
  };
  if (Object.values(values).some((entry) => typeof entry !== 'string' || !entry)) {
    fail(
      'APR_INVITATION_INVALID',
      'Reviewer invitation fields are incomplete.',
      'Regenerate the invitation from the authoritative review.'
    );
  }
  return values;
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
    startupVariables(root, state.protocol.artifact, paths, state.protocol.review_id).variables
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
  const joinedEvent = eventFor(
    state,
    'reviewer-joined',
    input.identity.session_fingerprint,
    { reviewer: input.identity, transport_capability: reviewerCapability },
    input.now ?? new Date()
  );
  const joined = await mutateReview(values.workspace, expected(state), (current) => {
    validateJoinAuthority({ state: current, root, invitation, values });
    return joinedEvent;
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
  return Object.freeze({
    ...result('status', effectiveState, operationalPaths, {}),
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
        : status.claim.status === 'stale'
          ? `Reclaim the stale ${role} claim, then resume from event authority: ${status.next_action.command}`
          : role === 'reviewer'
            ? `Open the current reviewer response ${status.paths.response} and then run: ${status.next_action.command}`
            : role === 'author'
              ? `Open the current author response ${status.paths.response} and then run: ${status.next_action.command}`
              : `Follow the human intervention shown by: ${status.next_action.command}`,
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
