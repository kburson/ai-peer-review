import { AprError } from '../errors.mjs';
import { digestChallenge } from '../authority/canonicalize.mjs';
import { eventAdvancesRevision, validateEvent } from './events.mjs';

export const LIFECYCLE_EVENT_TYPES = Object.freeze([
  'review-created',
  'reviewer-joined',
  'reviewer-revisions-requested',
  'reviewer-accepted',
  'author-revision-committed',
  'author-closing-round-committed',
  'finalization-started',
  'acceptance-committed',
  'acceptance-sealed-no-commit',
  'intervention-entered',
  'continued-to-reviewer',
  'continued-to-author',
  'same-session-reclaim',
  'participant-replaced',
  'override-committed',
  'override-sealed-no-commit',
  'abandoned',
]);

const TERMINAL_STATES = new Set([
  'accepted',
  'accepted-uncommitted',
  'accepted-over-objections',
  'accepted-over-objections-uncommitted',
  'abandoned',
]);

const TRANSITIONS = new Map([
  ['null|review-created', 'awaiting-reviewer'],
  ['awaiting-reviewer|reviewer-joined', 'reviewer-turn'],
  ['reviewer-turn|reviewer-revisions-requested', 'author-revision'],
  ['reviewer-turn|reviewer-accepted', 'acceptance-pending'],
  ['author-revision|author-revision-committed', 'reviewer-turn'],
  ['author-revision|author-closing-round-committed', 'intervention-required'],
  ['acceptance-pending|finalization-started', 'author-finalization'],
  ['author-finalization|acceptance-committed', 'accepted'],
  ['author-finalization|acceptance-sealed-no-commit', 'accepted-uncommitted'],
  ['reviewer-turn|intervention-entered', 'intervention-required'],
  ['author-revision|intervention-entered', 'intervention-required'],
  ['intervention-required|continued-to-reviewer', 'reviewer-turn'],
  ['intervention-required|continued-to-author', 'author-revision'],
  ['intervention-required|same-session-reclaim', 'restore'],
  ['intervention-required|participant-replaced', 'restore'],
  ['intervention-required|override-committed', 'accepted-over-objections'],
  ['intervention-required|override-sealed-no-commit', 'accepted-over-objections-uncommitted'],
  ['intervention-required|abandoned', 'abandoned'],
]);

const STATE_PRESERVING = new Set([
  'turn-claimed',
  'identity-changed',
  'challenge-requested',
  'challenge-superseded',
  'supplement-registered',
  'delivery-written',
  'delivery-acknowledged',
]);

function copy(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])])
    );
  }
  return value;
}

function exactlyEqual(left, right) {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

function projectionError(detail) {
  return new AprError('APR_PROJECTION_DRIFT', `Event authority cannot be reduced: ${detail}.`, {
    recovery: 'Inspect events.jsonl and restore the exact contiguous authoritative event history.',
    details: { detail },
  });
}

function transitionError(state, event, detail = null) {
  return new AprError(
    'APR_INVALID_TRANSITION',
    `Event ${event.type} is invalid from ${state ?? 'uninitialized'}.`,
    {
      recovery: 'Read the current review status and submit only its documented next action.',
      details: { state, type: event.type, ...(detail ? { detail } : {}) },
    }
  );
}

function deliveryConflict(event) {
  return new AprError(
    'APR_DELIVERY_CONFLICT',
    `Delivery ID ${event.payload.delivery.delivery_id} already exists in event authority.`,
    {
      recovery: 'Create a delivery with a new collision-resistant delivery ID.',
      details: { delivery_id: event.payload.delivery.delivery_id },
    }
  );
}

function initialProjection() {
  return {
    protocol: {
      schema: 'ai-peer-review.protocol/v1',
      review_id: null,
      sequence: 0,
      revision: 0,
      state: null,
      current_actor: null,
      commit_mode: null,
      max_turns: 0,
      claim_ttl_ms: 0,
      authority: null,
      turns_used: 0,
      artifact: null,
      claims: {},
      challenges: [],
      supplements: [],
      deliveries: [],
      intervention: null,
      terminal_evidence: null,
      next_action: 'create-review',
    },
    participants: {
      schema: 'ai-peer-review.participants/v1',
      review_id: null,
      author: null,
      reviewer: null,
    },
    nextAction: 'create-review',
  };
}

function nextAction(state) {
  return (
    {
      'awaiting-reviewer': 'join-reviewer',
      'reviewer-turn': 'reviewer-submit',
      'author-revision': 'author-submit',
      'acceptance-pending': 'finalize-acceptance',
      'author-finalization': 'commit-acceptance',
      'intervention-required': 'human-intervention',
    }[state] ?? null
  );
}

function currentActor(state) {
  return (
    {
      'awaiting-reviewer': 'reviewer',
      'reviewer-turn': 'reviewer',
      'author-revision': 'author',
      'acceptance-pending': 'author',
      'author-finalization': 'author',
      'intervention-required': 'human',
    }[state] ?? null
  );
}

function hasLiveChallenge(protocol, at) {
  return protocol.challenges.some(
    (challenge) =>
      !challenge.superseded_at &&
      !challenge.consumed_at &&
      typeof challenge.expires_at === 'string' &&
      Date.parse(challenge.expires_at) > Date.parse(at)
  );
}

function challengeCore(challenge) {
  return {
    schema: challenge.schema,
    challenge_id: challenge.challenge_id,
    review_id: challenge.review_id,
    intervention_id: challenge.intervention_id,
    protocol_revision: challenge.protocol_revision,
    action: challenge.action,
    parameters_digest: challenge.parameters_digest,
    nonce: challenge.nonce,
    expires_at: challenge.expires_at,
  };
}

function registeredFingerprint(participants, fingerprint) {
  return ['author', 'reviewer'].some(
    (role) => participants[role]?.session_fingerprint === fingerprint
  );
}

function protectedAuthority(event) {
  if (event.type === 'continued-to-reviewer' || event.type === 'continued-to-author') {
    return { action: 'continue', attestation: event.payload.attestation };
  }
  if (event.type === 'participant-replaced') {
    return { action: 'replace-participant', attestation: event.payload.attestation };
  }
  if (event.type === 'override-committed' || event.type === 'override-sealed-no-commit') {
    return { action: 'accept-over-objections', attestation: event.payload.attestation };
  }
  if (event.type === 'supplement-registered') {
    return { action: 'supplement', attestation: event.payload.supplement.attestation };
  }
  return null;
}

function consumeChallenge(protocol, event) {
  const authority = protectedAuthority(event);
  if (!authority) return;
  const challenge = protocol.challenges.find(
    (candidate) =>
      digestChallenge(challengeCore(candidate)) === authority.attestation.challenge_digest
  );
  if (
    !challenge ||
    challenge.action !== authority.action ||
    challenge.review_id !== protocol.review_id ||
    challenge.protocol_revision !== protocol.revision ||
    challenge.intervention_id !== protocol.intervention?.intervention_id ||
    challenge.consumed_at ||
    challenge.superseded_at ||
    Date.parse(challenge.expires_at) <= Date.parse(event.at)
  ) {
    throw transitionError(protocol.state, event, 'protected event lacks one live bound challenge');
  }
  challenge.consumed_at = event.at;
}

function ensureStatePreservingAllowed(protocol, event) {
  if (protocol.state === null || TERMINAL_STATES.has(protocol.state)) {
    throw transitionError(protocol.state, event);
  }
  if (
    ['challenge-requested', 'challenge-superseded', 'supplement-registered'].includes(event.type) &&
    protocol.state !== 'intervention-required'
  ) {
    throw transitionError(protocol.state, event);
  }
}

function applyLifecycle(protocol, participants, event) {
  if (!LIFECYCLE_EVENT_TYPES.includes(event.type)) return protocol.state;
  if (TERMINAL_STATES.has(protocol.state)) throw transitionError(protocol.state, event);
  const target = TRANSITIONS.get(`${String(protocol.state)}|${event.type}`);
  if (!target) {
    if (event.type === 'same-session-reclaim' && protocol.state !== 'intervention-required') {
      const oldClaim = event.payload.old_claim;
      const newClaim = event.payload.new_claim;
      const current = protocol.claims[newClaim.role];
      if (current && exactlyEqual(current, oldClaim) && exactlyEqual(current, newClaim)) {
        return protocol.state;
      }
    }
    throw transitionError(protocol.state, event);
  }

  if (protocol.state === 'intervention-required') {
    if (event.payload.intervention_id !== protocol.intervention?.intervention_id) {
      throw transitionError(protocol.state, event, 'intervention ID mismatch');
    }
    if (
      ['same-session-reclaim', 'participant-replaced', 'abandoned'].includes(event.type) &&
      hasLiveChallenge(protocol, event.at)
    ) {
      throw transitionError(protocol.state, event, 'unexpired Human Authority challenge');
    }
    if (event.type === 'same-session-reclaim') {
      if (protocol.intervention?.reason !== 'stale-claim') {
        throw transitionError(protocol.state, event, 'reclaim requires stale-claim intervention');
      }
      const { old_claim: oldClaim, new_claim: newClaim } = event.payload;
      const currentClaim = protocol.claims[newClaim.role];
      if (
        !currentClaim ||
        !exactlyEqual(currentClaim, oldClaim) ||
        oldClaim.role !== newClaim.role ||
        oldClaim.session_fingerprint !== newClaim.session_fingerprint ||
        newClaim.role !== protocol.intervention.interrupted_state.replace(/-.+$/, '')
      ) {
        throw transitionError(protocol.state, event, 'conflicting reclaim');
      }
    }
    if (
      event.type === 'participant-replaced' &&
      protocol.intervention?.reason !== 'participant-loss'
    ) {
      throw transitionError(protocol.state, event, 'replacement requires participant-loss');
    }
  }

  if (event.type === 'participant-replaced') {
    participants[event.payload.role] = copy(event.payload.incoming_participant);
  }
  return target === 'restore' ? protocol.intervention.interrupted_state : target;
}

function applyProjection(state, event) {
  const protocol = state.protocol;
  const participants = state.participants;
  if (STATE_PRESERVING.has(event.type)) ensureStatePreservingAllowed(protocol, event);

  if (
    event.type === 'reviewer-joined' &&
    participants.author?.session_fingerprint === event.payload.reviewer.session_fingerprint
  ) {
    throw transitionError(protocol.state, event, 'participants must use distinct sessions');
  }
  if (event.type === 'identity-changed') {
    const current = participants[event.payload.role];
    if (
      !current ||
      current.session_fingerprint !== event.payload.identity.session_fingerprint ||
      event.actor !== current.session_fingerprint
    ) {
      throw transitionError(protocol.state, event, 'identity change must retain session authority');
    }
  }
  if (event.type === 'turn-claimed') {
    const claim = event.payload.claim;
    const participant = participants[claim.role];
    if (
      claim.role !== protocol.current_actor ||
      !participant ||
      claim.session_fingerprint !== participant.session_fingerprint ||
      event.actor !== claim.session_fingerprint ||
      protocol.claims[claim.role]
    ) {
      throw transitionError(
        protocol.state,
        event,
        'claim does not match unoccupied turn authority'
      );
    }
  }
  if (event.type === 'challenge-requested') {
    const challenge = event.payload.challenge;
    const authorityAvailable =
      protocol.authority?.authority_policy !== 'unavailable' && protocol.authority?.verifier;
    const active = protocol.challenges.some(
      (candidate) =>
        !candidate.consumed_at &&
        !candidate.superseded_at &&
        Date.parse(candidate.expires_at) > Date.parse(event.at)
    );
    if (
      !authorityAvailable ||
      !registeredFingerprint(participants, event.actor) ||
      challenge.review_id !== protocol.review_id ||
      challenge.protocol_revision !== protocol.revision ||
      challenge.intervention_id !== (protocol.intervention?.intervention_id ?? null) ||
      active
    ) {
      throw transitionError(protocol.state, event, 'challenge does not match frozen authority');
    }
  }
  if (event.type === 'challenge-superseded') {
    const challenge = protocol.challenges.find(
      (candidate) => candidate.challenge_id === event.payload.challenge_id
    );
    if (
      !challenge ||
      challenge.requested_by !== event.actor ||
      challenge.consumed_at ||
      challenge.superseded_at ||
      Date.parse(challenge.expires_at) <= Date.parse(event.at)
    ) {
      throw transitionError(protocol.state, event, 'only requester may supersede a live challenge');
    }
  }
  consumeChallenge(protocol, event);
  const lifecycle = applyLifecycle(protocol, participants, event);

  if (event.type === 'review-created') {
    protocol.review_id = event.review_id;
    participants.review_id = event.review_id;
    protocol.commit_mode = event.payload.commit_mode;
    protocol.max_turns = event.payload.max_turns;
    protocol.claim_ttl_ms = event.payload.claim_ttl_ms;
    protocol.authority = copy(event.payload.authority);
    protocol.artifact = copy(event.payload.artifact);
    participants.author = copy(event.payload.author);
  } else if (event.type === 'reviewer-joined') {
    participants.reviewer = copy(event.payload.reviewer);
  }
  if (event.type === 'reviewer-revisions-requested' || event.type === 'reviewer-accepted') {
    protocol.turns_used += 1;
  }
  if (event.payload.artifact) protocol.artifact = copy(event.payload.artifact);
  if (event.type === 'author-closing-round-committed' || event.type === 'intervention-entered') {
    protocol.intervention = {
      intervention_id: event.payload.intervention_id,
      reason: event.payload.reason,
      interrupted_state: event.payload.interrupted_state,
      entered_at: event.at,
    };
  }
  if (event.type === 'continued-to-reviewer' || event.type === 'continued-to-author') {
    protocol.max_turns = event.payload.effective_max_turns;
    protocol.intervention = null;
  }
  if (event.type === 'same-session-reclaim') {
    protocol.claims[event.payload.new_claim.role] = copy(event.payload.new_claim);
    protocol.intervention = null;
  }
  if (event.type === 'participant-replaced') {
    delete protocol.claims[event.payload.role];
    protocol.intervention = null;
  }
  if (event.type === 'turn-claimed') {
    protocol.claims[event.payload.claim.role] = copy(event.payload.claim);
  }
  if (event.type === 'identity-changed') {
    participants[event.payload.role] = copy(event.payload.identity);
  }
  if (event.type === 'challenge-requested') {
    protocol.challenges.push({
      ...copy(event.payload.challenge),
      requested_at: event.at,
      requested_by: event.actor,
      consumed_at: null,
      superseded_at: null,
    });
  }
  if (event.type === 'challenge-superseded') {
    const challenge = protocol.challenges.find(
      (candidate) => candidate.challenge_id === event.payload.challenge_id
    );
    if (!challenge) throw transitionError(protocol.state, event, 'unknown challenge');
    challenge.superseded_at = event.at;
  }
  if (event.type === 'supplement-registered') {
    protocol.supplements.push(copy(event.payload.supplement));
  }
  if (event.type === 'delivery-written') {
    if (
      protocol.deliveries.some(
        (delivery) => delivery.delivery_id === event.payload.delivery.delivery_id
      )
    ) {
      throw deliveryConflict(event);
    }
    protocol.deliveries.push(copy(event.payload.delivery));
  }
  if (event.type === 'delivery-acknowledged') {
    const delivery = protocol.deliveries.find(
      (candidate) => candidate.delivery_id === event.payload.delivery_id
    );
    if (!delivery) throw transitionError(protocol.state, event, 'unknown delivery');
    delivery.acknowledged_at = event.at;
  }
  if (
    [
      'acceptance-committed',
      'acceptance-sealed-no-commit',
      'override-committed',
      'override-sealed-no-commit',
    ].includes(event.type)
  ) {
    protocol.terminal_evidence = copy(event.payload.terminal);
  }

  protocol.state = lifecycle;
  protocol.sequence = event.sequence;
  protocol.revision = event.revision;
  protocol.current_actor = currentActor(lifecycle);
  protocol.next_action = nextAction(lifecycle);
  state.nextAction = protocol.next_action;
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

export function reduceEvents(events) {
  if (!Array.isArray(events)) throw projectionError('events must be an array');
  const state = initialProjection();
  events.forEach((event, index) => {
    validateEvent(event);
    if (event.sequence !== index + 1) throw projectionError('event sequence');
    if (state.protocol.review_id !== null && event.review_id !== state.protocol.review_id) {
      throw projectionError('review ID');
    }
    const expectedRevision = state.protocol.revision + (eventAdvancesRevision(event.type) ? 1 : 0);
    if (event.revision !== expectedRevision) throw projectionError('event revision');
    applyProjection(state, event);
  });
  return deepFreeze(state);
}
