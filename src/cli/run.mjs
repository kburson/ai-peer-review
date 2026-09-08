import { randomUUID } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { canonicalChallengeBytes } from '../authority/canonicalize.mjs';
import { requestGrant } from '../authority/challenge.mjs';
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
  const reviewId = input.reviewId ?? `review-${randomUUID()}`;
  const now = timestamp(input.now ?? new Date());
  const maximum = safePositive(input.maxTurns, 10, 'maximum turns');
  const claimTtlMs = safePositive(input.claimTtlMs, 8 * 60 * 60 * 1000, 'claim TTL');
  const date = now.slice(0, 10);
  const name = path.basename(artifact.path, path.extname(artifact.path));
  const paths = resolveReviewPaths({
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
  let authority = input.authority ?? DEFAULT_AUTHORITY;
  if (input.bootstrapGrant) {
    if (typeof deps.verifyBootstrapGrant !== 'function') {
      fail(
        'APR_AUTHORITY_REQUIRED',
        'A bootstrap grant requires a configured prevention-grade verifier.',
        'Configure the verifier or omit --bootstrap-grant for consensus-only startup.'
      );
    }
    authority = await deps.verifyBootstrapGrant({ ...input, root, artifact, paths, reviewId });
  }
  const startup = trackedStartupPaths(paths);
  const context = {
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
  const contextBytes = Buffer.from(canonicalProjection(context));
  const variables = {
    review_id: reviewId,
    artifact_absolute: path.join(root, artifact.path),
    workspace_absolute: paths.scratch.absolute,
    response_absolute: paths.reviewerResponse(1).absolute,
  };
  const authorStartupBytes = hydrateTemplate('author-startup', variables);
  const reviewerInvitationBytes = hydrateTemplate('reviewer-invitation', variables);
  const eventsFile = path.join(paths.scratch.absolute, 'events.jsonl');

  if (entryExists(eventsFile)) {
    if (!exactFile(contextFile(paths.scratch.absolute), contextBytes)) {
      collision(contextFile(paths.scratch.absolute));
    }
    const state = inspectReview(paths.scratch.absolute);
    const existingContext = readContext(paths.scratch.absolute);
    const exactRetry =
      state.protocol.state === 'awaiting-reviewer' &&
      state.protocol.review_id === reviewId &&
      state.protocol.max_turns === maximum &&
      state.protocol.claim_ttl_ms === claimTtlMs &&
      state.protocol.commit_mode === (input.noCommit ? 'no-commit' : 'normal') &&
      sameValue(state.protocol.authority, authority) &&
      sameValue(state.protocol.artifact, {
        path: artifact.path,
        head: artifact.head,
        blob: artifact.blob,
        digest: `sha256:${artifact.worktreeDigest}`,
      }) &&
      sameParticipant(state.participants.author, input.identity) &&
      sameValue(existingContext, context) &&
      exactFile(startup.author_startup, authorStartupBytes) &&
      exactFile(startup.reviewer_invitation, reviewerInvitationBytes);
    if (!exactRetry) collision(eventsFile);
    reserveCollateral({ ...state, paths });
    return startResult(state, paths, startup);
  }

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
  const initial = eventFor(
    null,
    'review-created',
    'system',
    {
      review_id: reviewId,
      commit_mode: input.noCommit ? 'no-commit' : 'normal',
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

function readContext(workspace) {
  try {
    const value = JSON.parse(readFileSync(contextFile(workspace), 'utf8'));
    if (value?.schema !== 'ai-peer-review.context/v1') throw new Error('context schema');
    return value;
  } catch (cause) {
    const error = new AprError('APR_INVITATION_INVALID', 'Review context is unavailable.', {
      recovery: 'Restore the generated scratch review-context.json and retry join.',
      details: { workspace },
    });
    error.cause = cause;
    throw error;
  }
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

export async function joinReview(input, deps = {}) {
  const repository = deps.repository ?? createGitRepository();
  const invitation = path.resolve(input.invitation);
  const values = invitationValues(invitation);
  const state = inspectReview(values.workspace);
  const context = readContext(values.workspace);
  const root = repository.root(input.cwd);
  const paths = pathsForContext(context);
  if (
    root !== context.repository_root ||
    values.reviewId !== state.protocol.review_id ||
    values.workspace !== paths.scratch.absolute ||
    values.artifact !== path.join(root, state.protocol.artifact.path) ||
    values.response !== paths.reviewerResponse(1).absolute ||
    invitation !== trackedStartupPaths(paths).reviewer_invitation
  ) {
    fail(
      'APR_INVITATION_INVALID',
      'Invitation does not match current review and physical worktree authority.',
      'Join from the generated invitation inside its original physical worktree.'
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
    if (sameParticipant(registered, input.identity) && !claim) {
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
    { reviewer: input.identity },
    input.now ?? new Date()
  );
  const joined = await mutateReview(values.workspace, expected(state), () => joinedEvent);
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
  const role = ['author', 'reviewer'].includes(state.protocol.current_actor)
    ? state.protocol.current_actor
    : null;
  const observed = role
    ? deriveClaimStatus(state, role, now)
    : { status: 'not-applicable', claim: null };
  return Object.freeze({
    ...result('status', state, { workspace: absolute }, {}),
    next_action: Object.freeze({
      action: state.protocol.next_action,
      command: nextActionCommand(absolute, state.protocol.next_action),
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
      role === 'reviewer'
        ? `Open the current reviewer response and then run: ${status.next_action.command}`
        : role === 'author'
          ? `Open the current author response and then run: ${status.next_action.command}`
          : `Follow the human intervention shown by: ${status.next_action.command}`,
  });
}

function writeJson(stream, value) {
  stream.write(`${JSON.stringify(value)}\n`);
}

function writeResult(stream, value) {
  stream.write(
    `Review ${value.review_id}: ${value.state}\nNext: ${value.next_action.command ?? value.next_action}\n`
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
      response = await startReview({
        cwd: io.cwd,
        artifact: parsed.args[0],
        artifactKind: parsed.options.artifactKind,
        identity: resolveIdentity({ role: 'author', env: io.env, ...(io.identityContext ?? {}) }),
        now: io.now ?? new Date(),
        ...parsed.options,
      });
    } else if (parsed.command === 'join') {
      response = await joinReview({
        cwd: io.cwd,
        invitation: path.resolve(io.cwd, parsed.args[0]),
        identity: resolveIdentity({ role: 'reviewer', env: io.env, ...(io.identityContext ?? {}) }),
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
