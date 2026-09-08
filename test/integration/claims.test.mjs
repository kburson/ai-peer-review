import test from 'node:test';
import assert from 'node:assert/strict';

import {
  claimRole,
  deriveClaimStatus,
  enterStaleClaimIntervention,
  recordStaleClaimIntervention,
  reclaimRole,
} from '../../src/identity/registry.mjs';
import { parseCommand } from '../../src/cli/parse.mjs';
import { reduceEvents } from '../../src/protocol/reducer.mjs';
import { readReview } from '../../src/protocol/service.mjs';
import {
  claim,
  createReviewWorkspace,
  event,
  FINGERPRINTS,
  participant,
  reviewerTurnEvents,
} from '../helpers/review-fixture.mjs';

const now = new Date('2026-09-08T12:00:00.000Z');

function reviewWithIdentity({ claimTtlMs } = {}) {
  return {
    ...reduceEvents(reviewerTurnEvents()),
    ...(claimTtlMs === undefined ? {} : { claimTtlMs }),
  };
}

test('claims record random authority, diagnostic PID, and default eight-hour expiry', () => {
  const review = reviewWithIdentity();
  const identity = participant('reviewer');
  const first = claimRole(review, identity, now);
  const second = claimRole(review, identity, now);
  assert.notEqual(first.payload.claim.claim_id, second.payload.claim.claim_id);
  assert.deepEqual(first.payload.claim, {
    claim_id: first.payload.claim.claim_id,
    role: 'reviewer',
    session_fingerprint: FINGERPRINTS.reviewer,
    host: 'codex',
    claimed_at: '2026-09-08T12:00:00.000Z',
    last_activity_at: '2026-09-08T12:00:00.000Z',
    expires_at: '2026-09-08T20:00:00.000Z',
    pid: process.pid,
  });
  assert.equal(first.revision, review.protocol.revision);
});

test('CLI claim TTL parses whole hours and converts exactly once', () => {
  for (const [hours, milliseconds] of [
    ['1', 60 * 60 * 1000],
    ['8', 8 * 60 * 60 * 1000],
  ]) {
    assert.equal(
      parseCommand(['start', 'docs/artifact.md', '--artifact-kind', 'spec', '--claim-ttl', hours])
        .options.claimTtlMs,
      milliseconds
    );
  }
  for (const value of ['0', '-1', '1.5', '8h']) {
    assert.throws(
      () =>
        parseCommand([
          'start',
          'docs/artifact.md',
          '--artifact-kind',
          'spec',
          '--claim-ttl',
          value,
        ]),
      (error) => error.code === 'APR_USAGE'
    );
  }
});

test('claim TTL accepts exact hour durations and rejects unsafe internal values', () => {
  const identity = participant('reviewer');
  assert.equal(
    claimRole(reviewWithIdentity({ claimTtlMs: 60 * 60 * 1000 }), identity, now).payload.claim
      .expires_at,
    '2026-09-08T13:00:00.000Z'
  );
  for (const claimTtlMs of [0, -1, 1.5, Number.MAX_SAFE_INTEGER]) {
    assert.throws(
      () => claimRole(reviewWithIdentity({ claimTtlMs }), identity, now),
      (error) => error.code === 'APR_CLAIM_INVALID'
    );
  }
});

test('claim authority must match the current actor and registered participant', () => {
  const review = reviewWithIdentity();
  assert.throws(
    () => claimRole(review, participant('author'), now),
    (error) => error.code === 'APR_CLAIM_CONFLICT'
  );
  assert.throws(
    () => claimRole(review, participant('reviewer', FINGERPRINTS.replacement), now),
    (error) => error.code === 'APR_CLAIM_CONFLICT'
  );
});

test('event authority rejects non-current, unregistered, and occupied claims', () => {
  const prefix = reviewerTurnEvents();
  const authorClaim = event('turn-claimed', {
    sequence: 3,
    revision: 2,
    payload: { claim: claim('author') },
  });
  assert.throws(
    () => reduceEvents([...prefix, authorClaim]),
    (error) => error.code === 'APR_INVALID_TRANSITION'
  );

  const reviewerClaim = event('turn-claimed', {
    sequence: 3,
    revision: 2,
    actor: FINGERPRINTS.reviewer,
    payload: { claim: claim('reviewer') },
  });
  const overwrite = event('turn-claimed', {
    sequence: 4,
    revision: 2,
    actor: FINGERPRINTS.reviewer,
    payload: { claim: claim('reviewer', { claimId: 'claim-overwrite' }) },
  });
  assert.throws(
    () => reduceEvents([...prefix, reviewerClaim, overwrite]),
    (error) => error.code === 'APR_INVALID_TRANSITION'
  );
});

test('startup-fixed claim TTL survives event reduction and reload', () => {
  const created = event('review-created', {
    payload: { claim_ttl_ms: 60 * 60 * 1000 },
  });
  const joined = event('reviewer-joined', { sequence: 2, revision: 2 });
  const serialized = JSON.parse(JSON.stringify(reduceEvents([created, joined])));
  assert.equal(serialized.protocol.claim_ttl_ms, 60 * 60 * 1000);
  assert.equal(
    claimRole(serialized, serialized.participants.reviewer, now).payload.claim.expires_at,
    '2026-09-08T13:00:00.000Z'
  );
});

test('stale status is derived without mutation or PID liveness probing', () => {
  const review = reviewWithIdentity();
  const claimed = claimRole(review, participant('reviewer'), now);
  const state = reduceEvents([...reviewerTurnEvents(), claimed]);
  const before = JSON.stringify(state);
  assert.deepEqual(deriveClaimStatus(state, 'reviewer', new Date('2026-09-08T19:59:59Z')), {
    status: 'active',
    claim: state.protocol.claims.reviewer,
  });
  assert.deepEqual(deriveClaimStatus(state, 'reviewer', new Date('2026-09-08T20:00:00Z')), {
    status: 'stale',
    claim: state.protocol.claims.reviewer,
  });
  assert.equal(JSON.stringify(state), before);
});

test('same-session reclaim restores stale intervention without advancing revision', () => {
  const base = reviewWithIdentity();
  const claimed = claimRole(base, participant('reviewer'), now);
  const claimedEvents = [...reviewerTurnEvents(), claimed];
  const claimedState = reduceEvents(claimedEvents);
  const intervention = enterStaleClaimIntervention(
    claimedState,
    'reviewer',
    new Date('2026-09-08T20:00:00Z')
  );
  const intervenedEvents = [...claimedEvents, intervention];
  const intervened = reduceEvents(intervenedEvents);
  const reclaim = reclaimRole(
    intervened,
    participant('reviewer'),
    new Date('2026-09-08T20:01:00Z')
  );
  const recovered = reduceEvents([...intervenedEvents, reclaim]);

  assert.equal(reclaim.type, 'same-session-reclaim');
  assert.equal(reclaim.revision, intervention.revision);
  assert.equal(reclaim.payload.old_claim.claim_id, claimed.payload.claim.claim_id);
  assert.notEqual(reclaim.payload.new_claim.claim_id, claimed.payload.claim.claim_id);
  assert.equal(recovered.protocol.state, 'reviewer-turn');
});

test('stale intervention is revalidated and appended inside the review lock', async (t) => {
  const base = reviewerTurnEvents();
  const claimed = event('turn-claimed', {
    sequence: 3,
    revision: 2,
    actor: FINGERPRINTS.reviewer,
    payload: { claim: claim('reviewer') },
  });
  const fixture = await createReviewWorkspace({ repository: null, events: [...base, claimed] });
  t.after(fixture.cleanup);
  const expected = {
    reviewId: 'review-01',
    revision: 2,
    sequence: 3,
    actor: 'reviewer',
  };
  const before = fixture.readEvents();
  await assert.rejects(
    recordStaleClaimIntervention(
      fixture.workspace,
      expected,
      'reviewer',
      new Date('2026-09-08T19:59:59Z')
    ),
    (error) => error.code === 'APR_CLAIM_NOT_STALE'
  );
  assert.equal(fixture.readEvents(), before);

  const recovered = await recordStaleClaimIntervention(
    fixture.workspace,
    expected,
    'reviewer',
    new Date('2026-09-08T20:00:00Z')
  );
  assert.equal(recovered.protocol.state, 'intervention-required');
  assert.equal(recovered.protocol.intervention.reason, 'stale-claim');
  assert.equal((await readReview(fixture.workspace)).protocol.sequence, 4);
});

test('reclaim refuses a different fingerprint and an unexpired authority challenge', () => {
  const base = reviewWithIdentity();
  const claimed = claimRole(base, participant('reviewer'), now);
  const claimedEvents = [...reviewerTurnEvents(), claimed];
  const intervention = enterStaleClaimIntervention(
    reduceEvents(claimedEvents),
    'reviewer',
    new Date('2026-09-08T20:00:00Z')
  );
  const intervenedEvents = [...claimedEvents, intervention];
  const intervened = reduceEvents(intervenedEvents);

  assert.throws(
    () =>
      reclaimRole(
        intervened,
        participant('reviewer', FINGERPRINTS.replacement),
        new Date('2026-09-08T20:01:00Z')
      ),
    (error) => error.code === 'APR_CLAIM_CONFLICT'
  );

  const challenge = event('challenge-requested', {
    sequence: intervention.sequence + 1,
    revision: intervention.revision,
    payload: {
      challenge: {
        ...event('challenge-requested').payload.challenge,
        intervention_id: intervention.payload.intervention_id,
        protocol_revision: intervention.revision,
        expires_at: '2026-09-08T21:00:00.000Z',
      },
    },
  });
  const challenged = reduceEvents([...intervenedEvents, challenge]);
  assert.throws(
    () => reclaimRole(challenged, participant('reviewer'), new Date('2026-09-08T20:01:00Z')),
    (error) => error.code === 'APR_CLAIM_CHALLENGED'
  );
});
