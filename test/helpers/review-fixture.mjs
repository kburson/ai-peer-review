import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createGitRepository } from '../../src/git/repository.mjs';
import { reduceEvents } from '../../src/protocol/reducer.mjs';
import { appendEvent, atomicWrite } from '../../src/protocol/store.mjs';

export const FINGERPRINTS = Object.freeze({
  author: `sha256:${'a'.repeat(64)}`,
  reviewer: `sha256:${'b'.repeat(64)}`,
  replacement: `sha256:${'c'.repeat(64)}`,
});

export function participant(role, fingerprint = FINGERPRINTS[role]) {
  return {
    role,
    host: 'codex',
    provider: 'openai',
    model_id: 'gpt-test',
    model_display: 'GPT Test',
    session_fingerprint: fingerprint,
    identity_source: 'runtime',
    joined_at: '2026-09-08T12:00:00.000Z',
  };
}

export function claim(
  role,
  {
    claimId = `claim-${role}`,
    fingerprint = FINGERPRINTS[role],
    claimedAt = '2026-09-08T12:00:00.000Z',
    lastActivityAt = '2026-09-08T12:00:00.000Z',
    expiresAt = '2026-09-08T20:00:00.000Z',
    pid = 12345,
  } = {}
) {
  return {
    claim_id: claimId,
    role,
    session_fingerprint: fingerprint,
    host: 'codex',
    claimed_at: claimedAt,
    last_activity_at: lastActivityAt,
    expires_at: expiresAt,
    pid,
  };
}

export function attestation() {
  return {
    source: 'test-fixture',
    strength: 'unverified-test',
    signer_id: 'human:test',
    signer_fingerprint: `sha256:${'d'.repeat(64)}`,
    challenge_digest: `sha256:${'e'.repeat(64)}`,
    verified_at: '2026-09-08T12:00:00.000Z',
  };
}

const payloads = {
  'review-created': () => ({
    commit_mode: 'normal',
    max_turns: 2,
    claim_ttl_ms: 8 * 60 * 60 * 1000,
    artifact: {
      path: 'docs/artifact.md',
      head: '1'.repeat(40),
      blob: '2'.repeat(40),
      digest: `sha256:${'3'.repeat(64)}`,
    },
    author: participant('author'),
  }),
  'reviewer-joined': () => ({ reviewer: participant('reviewer') }),
  'reviewer-revisions-requested': () => ({
    turn: 1,
    response: { path: 'reviews/reviewer-response-1.md', digest: `sha256:${'4'.repeat(64)}` },
    finding_ids: ['finding-001'],
  }),
  'reviewer-accepted': () => ({
    turn: 1,
    response: { path: 'reviews/reviewer-response-1.md', digest: `sha256:${'5'.repeat(64)}` },
    finding_ids: [],
  }),
  'author-revision-committed': () => ({
    turn: 1,
    response: { path: 'reviews/author-response-1.md', digest: `sha256:${'6'.repeat(64)}` },
    artifact: {
      path: 'docs/artifact.md',
      blob: '7'.repeat(40),
      digest: `sha256:${'8'.repeat(64)}`,
    },
    commit: '9'.repeat(40),
  }),
  'author-closing-round-committed': () => ({
    turn: 1,
    response: { path: 'reviews/author-response-1.md', digest: `sha256:${'6'.repeat(64)}` },
    artifact: {
      path: 'docs/artifact.md',
      blob: '7'.repeat(40),
      digest: `sha256:${'8'.repeat(64)}`,
    },
    commit: '9'.repeat(40),
    intervention_id: 'intervention-budget',
    reason: 'turn-budget-exhausted',
    interrupted_state: 'reviewer-turn',
  }),
  'finalization-started': () => ({}),
  'acceptance-committed': () => ({
    terminal: { commit: 'a'.repeat(40), manifest_digest: `sha256:${'b'.repeat(64)}` },
  }),
  'acceptance-sealed-no-commit': () => ({
    terminal: {
      snapshot_digest: `sha256:${'c'.repeat(64)}`,
      manifest_digest: `sha256:${'d'.repeat(64)}`,
    },
  }),
  'intervention-entered': () => ({
    intervention_id: 'intervention-stale',
    reason: 'stale-claim',
    interrupted_state: 'reviewer-turn',
  }),
  'continued-to-reviewer': () => ({
    intervention_id: 'intervention-budget',
    additional_turns: 1,
    effective_max_turns: 3,
    attestation: attestation(),
  }),
  'continued-to-author': () => ({
    intervention_id: 'intervention-budget',
    additional_turns: 1,
    effective_max_turns: 3,
    attestation: attestation(),
  }),
  'same-session-reclaim': () => ({
    intervention_id: 'intervention-stale',
    old_claim: claim('reviewer'),
    new_claim: claim('reviewer', {
      claimId: 'claim-new',
      claimedAt: '2026-09-08T12:01:00.000Z',
      lastActivityAt: '2026-09-08T12:01:00.000Z',
      expiresAt: '2026-09-08T20:01:00.000Z',
    }),
  }),
  'participant-replaced': () => ({
    intervention_id: 'intervention-loss',
    role: 'reviewer',
    outgoing_claim: claim('reviewer'),
    incoming_participant: participant('reviewer', FINGERPRINTS.replacement),
    attestation: attestation(),
  }),
  'override-committed': () => ({
    intervention_id: 'intervention-budget',
    terminal: { commit: 'a'.repeat(40), manifest_digest: `sha256:${'b'.repeat(64)}` },
    attestation: attestation(),
  }),
  'override-sealed-no-commit': () => ({
    intervention_id: 'intervention-budget',
    terminal: {
      snapshot_digest: `sha256:${'c'.repeat(64)}`,
      manifest_digest: `sha256:${'d'.repeat(64)}`,
    },
    attestation: attestation(),
  }),
  abandoned: () => ({
    intervention_id: 'intervention-budget',
    reason: 'operator ended review',
    retained_paths: [],
  }),
  'turn-claimed': () => ({
    claim: claim('reviewer'),
  }),
  'identity-changed': () => ({ role: 'reviewer', identity: participant('reviewer') }),
  'challenge-requested': () => ({
    challenge: {
      schema: 'ai-peer-review.grant-challenge/v1',
      challenge_id: 'challenge-1',
      review_id: 'review-01',
      intervention_id: 'intervention-stale-claim',
      protocol_revision: 3,
      action: 'continue',
      parameters_digest: `sha256:${'c'.repeat(64)}`,
      nonce: 'nonce-1',
      expires_at: '2026-09-09T12:00:00.000Z',
    },
  }),
  'challenge-superseded': () => ({ challenge_id: 'challenge-1' }),
  'supplement-registered': () => ({
    supplement: {
      supplement_id: 'supplement-1',
      digest: `sha256:${'e'.repeat(64)}`,
      target_role: 'reviewer',
      target_turn: 2,
      content_retention: 'scratch-only',
      attestation: attestation(),
    },
  }),
  'delivery-written': () => ({
    delivery: {
      delivery_id: 'delivery-1',
      recipient: 'reviewer',
      digest: `sha256:${'f'.repeat(64)}`,
    },
  }),
  'delivery-acknowledged': () => ({ delivery_id: 'delivery-1' }),
};

export const REVISION_NEUTRAL_TYPES = new Set([
  'same-session-reclaim',
  'turn-claimed',
  'identity-changed',
  'challenge-requested',
  'challenge-superseded',
  'delivery-written',
  'delivery-acknowledged',
]);

export function event(
  type,
  { sequence = 1, revision, reviewId = 'review-01', actor, payload = {} } = {}
) {
  const effectiveRevision = revision ?? (REVISION_NEUTRAL_TYPES.has(type) ? 0 : 1);
  const effectivePayload = { ...payloads[type]?.(), ...payload };
  const effectiveActor =
    actor ??
    (type === 'review-created'
      ? 'system'
      : type === 'turn-claimed'
        ? (effectivePayload.claim?.session_fingerprint ?? FINGERPRINTS.author)
        : type === 'identity-changed'
          ? (effectivePayload.identity?.session_fingerprint ?? FINGERPRINTS.author)
          : FINGERPRINTS.author);
  return {
    schema: 'ai-peer-review.event/v1',
    review_id: reviewId,
    sequence,
    revision: effectiveRevision,
    type,
    actor: effectiveActor,
    at: new Date(Date.UTC(2026, 8, 8, 12, 0, sequence)).toISOString(),
    payload: effectivePayload,
  };
}

export function sequence(types, overrides = {}) {
  let revision = 0;
  return types.map((type, index) => {
    if (!REVISION_NEUTRAL_TYPES.has(type)) revision += 1;
    return event(type, { sequence: index + 1, revision, ...(overrides[index] ?? {}) });
  });
}

export const reviewerTurnEvents = () => sequence(['review-created', 'reviewer-joined']);
export const authorRevisionEvents = () =>
  sequence(['review-created', 'reviewer-joined', 'reviewer-revisions-requested']);
export const acceptancePendingEvents = () =>
  sequence(['review-created', 'reviewer-joined', 'reviewer-accepted']);
export const interventionEvents = (reason, interruptedState = 'reviewer-turn') => {
  const prefix =
    interruptedState === 'author-revision' ? authorRevisionEvents() : reviewerTurnEvents();
  const role = interruptedState === 'author-revision' ? 'author' : 'reviewer';
  const claimed = event('turn-claimed', {
    sequence: prefix.length + 1,
    revision: prefix.at(-1).revision,
    payload: { claim: claim(role) },
  });
  let revision = claimed.revision;
  return [
    ...prefix,
    claimed,
    event('intervention-entered', {
      sequence: prefix.length + 2,
      revision: ++revision,
      payload: {
        intervention_id: `intervention-${reason}`,
        reason,
        interrupted_state: interruptedState,
      },
    }),
  ];
};

export async function createReviewWorkspace({ repository, events }) {
  const parent = mkdtempSync(path.join(tmpdir(), 'ai-peer-review-workspace-'));
  const root = path.join(parent, 'repository');
  mkdirSync(root);
  execFileSync('git', ['init', '-b', 'trunk'], { cwd: root, stdio: 'ignore', shell: false });
  const gitDirectory = execFileSync('git', ['rev-parse', '--git-common-dir'], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
  }).trim();
  writeFileSync(path.resolve(root, gitDirectory, 'info', 'exclude'), '.scratch/peer-review/\n');
  const workspace = path.join(root, '.scratch', 'peer-review', events[0]?.review_id ?? 'review-01');
  mkdirSync(workspace, { recursive: true });
  const repositoryBoundary = repository ?? createGitRepository();
  if (!repositoryBoundary.checkIgnored(root, '.scratch/peer-review/probe')) {
    throw new Error('review fixture scratch workspace is not ignored');
  }
  for (const item of events) await appendEvent(path.join(workspace, 'events.jsonl'), item);
  const state = reduceEvents(events);
  atomicWrite(
    path.join(workspace, 'protocol.json'),
    Buffer.from(`${JSON.stringify(state.protocol, null, 2)}\n`)
  );
  atomicWrite(
    path.join(workspace, 'participants.json'),
    Buffer.from(`${JSON.stringify(state.participants, null, 2)}\n`)
  );
  return {
    repository: repositoryBoundary,
    parent,
    root,
    workspace,
    events: path.join(workspace, 'events.jsonl'),
    protocol: path.join(workspace, 'protocol.json'),
    participants: path.join(workspace, 'participants.json'),
    state,
    readEvents: () => readFileSync(path.join(workspace, 'events.jsonl'), 'utf8'),
    cleanup: () => rmSync(parent, { recursive: true, force: true }),
  };
}
