import test from 'node:test';
import assert from 'node:assert/strict';

import { LIFECYCLE_EVENT_TYPES, reduceEvents } from '../../src/protocol/reducer.mjs';
import {
  acceptancePendingEvents,
  authorRevisionEvents,
  claim,
  event,
  interventionEvents,
  reviewerTurnEvents,
  REVISION_NEUTRAL_TYPES,
  sequence,
} from '../helpers/review-fixture.mjs';

const cases = [
  [[], 'review-created', 'awaiting-reviewer'],
  [sequence(['review-created']), 'reviewer-joined', 'reviewer-turn'],
  [reviewerTurnEvents(), 'reviewer-revisions-requested', 'author-revision'],
  [reviewerTurnEvents(), 'reviewer-accepted', 'acceptance-pending'],
  [authorRevisionEvents(), 'author-revision-committed', 'reviewer-turn'],
  [authorRevisionEvents(), 'author-closing-round-committed', 'intervention-required'],
  [reviewerTurnEvents(), 'intervention-entered', 'intervention-required'],
  [authorRevisionEvents(), 'intervention-entered', 'intervention-required'],
  [acceptancePendingEvents(), 'finalization-started', 'author-finalization'],
  [
    sequence(['review-created', 'reviewer-joined', 'reviewer-accepted', 'finalization-started']),
    'acceptance-committed',
    'accepted',
  ],
  [
    sequence(['review-created', 'reviewer-joined', 'reviewer-accepted', 'finalization-started']),
    'acceptance-sealed-no-commit',
    'accepted-uncommitted',
  ],
  [interventionEvents('turn-budget-exhausted'), 'continued-to-reviewer', 'reviewer-turn'],
  [interventionEvents('turn-budget-exhausted'), 'continued-to-author', 'author-revision'],
  [interventionEvents('stale-claim'), 'same-session-reclaim', 'reviewer-turn'],
  [interventionEvents('participant-loss'), 'participant-replaced', 'reviewer-turn'],
  [interventionEvents('turn-budget-exhausted'), 'override-committed', 'accepted-over-objections'],
  [
    interventionEvents('turn-budget-exhausted'),
    'override-sealed-no-commit',
    'accepted-over-objections-uncommitted',
  ],
  [interventionEvents('turn-budget-exhausted'), 'abandoned', 'abandoned'],
];

test('allows the complete lifecycle matrix and derives exact states', () => {
  for (const [prefix, type, expectedState] of cases) {
    const priorRevision = prefix.at(-1)?.revision ?? 0;
    const interventionId = reduceEvents(prefix).protocol.intervention?.intervention_id;
    const next = event(type, {
      sequence: prefix.length + 1,
      revision: priorRevision + (REVISION_NEUTRAL_TYPES.has(type) ? 0 : 1),
      payload: interventionId ? { intervention_id: interventionId } : {},
    });
    assert.equal(reduceEvents([...prefix, next]).protocol.state, expectedState, type);
  }
});

test('all other reachable state and lifecycle-event pairs fail closed', () => {
  const prefixes = new Map([
    [null, []],
    ['awaiting-reviewer', sequence(['review-created'])],
    ['reviewer-turn', reviewerTurnEvents()],
    ['author-revision', authorRevisionEvents()],
    ['acceptance-pending', acceptancePendingEvents()],
    [
      'author-finalization',
      sequence(['review-created', 'reviewer-joined', 'reviewer-accepted', 'finalization-started']),
    ],
    ['intervention-required', interventionEvents('turn-budget-exhausted')],
  ]);
  const allowed = new Set(
    cases.map(([prefix, type]) => `${reduceEvents(prefix).protocol.state}|${type}`)
  );
  for (const [state, prefix] of prefixes) {
    for (const type of LIFECYCLE_EVENT_TYPES) {
      if (allowed.has(`${state}|${type}`)) continue;
      const priorRevision = prefix.at(-1)?.revision ?? 0;
      assert.throws(
        () =>
          reduceEvents([
            ...prefix,
            event(type, {
              sequence: prefix.length + 1,
              revision: priorRevision + (REVISION_NEUTRAL_TYPES.has(type) ? 0 : 1),
            }),
          ]),
        (error) => error.code === 'APR_INVALID_TRANSITION',
        `${state} -> ${type}`
      );
    }
  }
});

test('enforces contiguous sequence and independent revision advancement', () => {
  const valid = reviewerTurnEvents();
  assert.throws(
    () => reduceEvents([{ ...valid[0], sequence: 2 }]),
    (error) => error.code === 'APR_PROJECTION_DRIFT'
  );
  assert.throws(
    () => reduceEvents([valid[0], { ...valid[1], revision: valid[0].revision }]),
    (error) => error.code === 'APR_PROJECTION_DRIFT'
  );
  const claimed = event('turn-claimed', { sequence: 3, revision: valid[1].revision });
  assert.equal(reduceEvents([...valid, claimed]).protocol.revision, valid[1].revision);
});

test('terminal states reject every later event', () => {
  const accepted = sequence([
    'review-created',
    'reviewer-joined',
    'reviewer-accepted',
    'finalization-started',
    'acceptance-committed',
  ]);
  for (const type of [...LIFECYCLE_EVENT_TYPES, 'turn-claimed']) {
    const revision = accepted.at(-1).revision + (REVISION_NEUTRAL_TYPES.has(type) ? 0 : 1);
    assert.throws(
      () => reduceEvents([...accepted, event(type, { sequence: accepted.length + 1, revision })]),
      (error) => error.code === 'APR_INVALID_TRANSITION'
    );
  }
});

test('recovery restores the immutable interrupted role and refuses a live challenge', () => {
  const staleAuthor = interventionEvents('stale-claim', 'author-revision');
  const reclaim = event('same-session-reclaim', {
    sequence: staleAuthor.length + 1,
    revision: staleAuthor.at(-1).revision,
    payload: {
      intervention_id: 'intervention-stale-claim',
      old_claim: claim('author'),
      new_claim: claim('author', {
        claimId: 'new',
        claimedAt: '2026-09-08T12:01:00.000Z',
        lastActivityAt: '2026-09-08T12:01:00.000Z',
        expiresAt: '2026-09-08T20:01:00.000Z',
      }),
    },
  });
  assert.equal(reduceEvents([...staleAuthor, reclaim]).protocol.state, 'author-revision');

  const challenged = [
    ...staleAuthor,
    event('challenge-requested', {
      sequence: staleAuthor.length + 1,
      revision: staleAuthor.at(-1).revision,
    }),
  ];
  assert.throws(
    () => reduceEvents([...challenged, { ...reclaim, sequence: reclaim.sequence + 1 }]),
    (error) => error.code === 'APR_INVALID_TRANSITION'
  );
});

test('outside intervention, reclaim is only an exact same-claim retry', () => {
  const prefix = reviewerTurnEvents();
  const currentClaim = claim('reviewer');
  const claimed = event('turn-claimed', {
    sequence: 3,
    revision: 2,
    payload: { claim: currentClaim },
  });
  const exactRetry = event('same-session-reclaim', {
    sequence: 4,
    revision: 2,
    payload: {
      intervention_id: 'idempotent-retry',
      old_claim: currentClaim,
      new_claim: currentClaim,
    },
  });
  assert.equal(reduceEvents([...prefix, claimed, exactRetry]).protocol.state, 'reviewer-turn');

  for (const payload of [
    { ...exactRetry.payload, old_claim: claim('reviewer', { claimId: 'other' }) },
    {
      ...exactRetry.payload,
      new_claim: claim('reviewer', { expiresAt: '2026-09-08T21:00:00.000Z' }),
    },
  ]) {
    assert.throws(
      () => reduceEvents([...prefix, claimed, { ...exactRetry, payload }]),
      (error) => error.code === 'APR_INVALID_TRANSITION'
    );
  }
});

test('delivery IDs are unique authority keys', () => {
  const prefix = reviewerTurnEvents();
  const first = event('delivery-written', { sequence: 3, revision: 2 });
  const duplicate = event('delivery-written', { sequence: 4, revision: 2 });
  assert.throws(
    () => reduceEvents([...prefix, first, duplicate]),
    (error) => error.code === 'APR_DELIVERY_CONFLICT'
  );
});
