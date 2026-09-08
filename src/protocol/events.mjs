import { AprError } from '../errors.mjs';

const definitions = {
  'review-created': {
    advancesRevision: true,
    fields: ['commit_mode', 'max_turns', 'claim_ttl_ms', 'artifact', 'author'],
  },
  'reviewer-joined': { advancesRevision: true, fields: ['reviewer'] },
  'reviewer-revisions-requested': {
    advancesRevision: true,
    fields: ['turn', 'response', 'finding_ids'],
  },
  'reviewer-accepted': { advancesRevision: true, fields: ['turn', 'response', 'finding_ids'] },
  'author-revision-committed': {
    advancesRevision: true,
    fields: ['turn', 'response', 'artifact', 'commit'],
  },
  'author-closing-round-committed': {
    advancesRevision: true,
    fields: [
      'turn',
      'response',
      'artifact',
      'commit',
      'intervention_id',
      'reason',
      'interrupted_state',
    ],
  },
  'finalization-started': { advancesRevision: true, fields: [] },
  'acceptance-committed': { advancesRevision: true, fields: ['terminal'] },
  'acceptance-sealed-no-commit': { advancesRevision: true, fields: ['terminal'] },
  'intervention-entered': {
    advancesRevision: true,
    fields: ['intervention_id', 'reason', 'interrupted_state'],
  },
  'continued-to-reviewer': {
    advancesRevision: true,
    fields: ['intervention_id', 'additional_turns', 'effective_max_turns', 'attestation'],
  },
  'continued-to-author': {
    advancesRevision: true,
    fields: ['intervention_id', 'additional_turns', 'effective_max_turns', 'attestation'],
  },
  'same-session-reclaim': {
    advancesRevision: false,
    fields: ['intervention_id', 'old_claim', 'new_claim'],
  },
  'participant-replaced': {
    advancesRevision: true,
    fields: ['intervention_id', 'role', 'outgoing_claim', 'incoming_participant', 'attestation'],
  },
  'override-committed': {
    advancesRevision: true,
    fields: ['intervention_id', 'terminal', 'attestation'],
  },
  'override-sealed-no-commit': {
    advancesRevision: true,
    fields: ['intervention_id', 'terminal', 'attestation'],
  },
  abandoned: { advancesRevision: true, fields: ['intervention_id', 'reason', 'retained_paths'] },
  'turn-claimed': { advancesRevision: false, fields: ['claim'] },
  'identity-changed': { advancesRevision: false, fields: ['role', 'identity'] },
  'challenge-requested': { advancesRevision: false, fields: ['challenge'] },
  'challenge-superseded': { advancesRevision: false, fields: ['challenge_id'] },
  'supplement-registered': { advancesRevision: true, fields: ['supplement'] },
  'delivery-written': { advancesRevision: false, fields: ['delivery'] },
  'delivery-acknowledged': { advancesRevision: false, fields: ['delivery_id'] },
};

export const EVENT_DEFINITIONS = Object.freeze(
  Object.fromEntries(
    Object.entries(definitions).map(([type, definition]) => [
      type,
      Object.freeze({ ...definition, fields: Object.freeze([...definition.fields]) }),
    ])
  )
);
export const EVENT_TYPES = Object.freeze(Object.keys(EVENT_DEFINITIONS));

const TOP_LEVEL_FIELDS = Object.freeze([
  'schema',
  'review_id',
  'sequence',
  'revision',
  'type',
  'actor',
  'at',
  'payload',
]);
const IDENTIFIER_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const FINGERPRINT_RE = /^sha256:[0-9a-f]{64}$/;
const GIT_OBJECT_RE = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const RFC3339_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function invalid(reason, details = {}) {
  return new AprError('APR_EVENT_INVALID', `Invalid peer-review event: ${reason}.`, {
    recovery:
      'Recreate the event from the current review state using the documented event contract.',
    details: { reason, ...details },
  });
}

function isPlainObject(value) {
  return (
    value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype
  );
}

function assertJsonValue(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0)) return;
  if (Array.isArray(value)) {
    if (ancestors.has(value)) throw invalid('cyclic payload');
    const next = new Set(ancestors).add(value);
    value.forEach((entry) => assertJsonValue(entry, next));
    return;
  }
  if (isPlainObject(value)) {
    if (ancestors.has(value)) throw invalid('cyclic payload');
    const next = new Set(ancestors).add(value);
    Object.entries(value).forEach(([key, entry]) => {
      if (!key || !key.normalize('NFC').isWellFormed()) throw invalid('payload key');
      assertJsonValue(entry, next);
    });
    return;
  }
  throw invalid('non-JSON payload value');
}

function exactKeys(value, expected, label) {
  if (!isPlainObject(value)) throw invalid(`${label} object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw invalid(`${label} fields`, { actual, expected: wanted });
  }
}

function assertEnum(value, allowed, label) {
  if (!allowed.includes(value)) throw invalid(label);
}

function assertIdentifier(value, label) {
  if (typeof value !== 'string' || !IDENTIFIER_RE.test(value)) throw invalid(label);
}

function assertFingerprint(value, label) {
  if (typeof value !== 'string' || !FINGERPRINT_RE.test(value)) throw invalid(label);
}

function assertTimestamp(value, label) {
  if (typeof value !== 'string' || !RFC3339_RE.test(value)) throw invalid(label);
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) throw invalid(label);
  const canonical = new Date(parsed).toISOString();
  if (value !== canonical && value !== canonical.replace('.000Z', 'Z')) {
    throw invalid(label);
  }
}

function assertPositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) throw invalid(label);
}

function assertNonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw invalid(label);
}

function assertString(value, label) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    !value.isWellFormed() ||
    value !== value.normalize('NFC')
  ) {
    throw invalid(label);
  }
}

function assertDigest(value, label) {
  if (typeof value !== 'string' || !FINGERPRINT_RE.test(value)) throw invalid(label);
}

function assertGitObject(value, label) {
  if (typeof value !== 'string' || !GIT_OBJECT_RE.test(value)) throw invalid(label);
}

function assertPath(value, label) {
  assertString(value, label);
  if (
    value.startsWith('/') ||
    value.includes('\\') ||
    value.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    throw invalid(label);
  }
}

function assertIdentifierArray(value, label) {
  if (!Array.isArray(value)) throw invalid(label);
  value.forEach((entry) => assertIdentifier(entry, label));
  if (new Set(value).size !== value.length) throw invalid(label);
}

function assertPathArray(value, label) {
  if (!Array.isArray(value)) throw invalid(label);
  value.forEach((entry) => assertPath(entry, label));
  if (new Set(value).size !== value.length) throw invalid(label);
}

function validateParticipant(value, label) {
  exactKeys(
    value,
    [
      'role',
      'host',
      'provider',
      'model_id',
      'model_display',
      'session_fingerprint',
      'identity_source',
      'joined_at',
    ],
    label
  );
  assertEnum(value.role, ['author', 'reviewer'], `${label} role`);
  assertEnum(value.host, ['codex', 'claude-code', 'grok', 'other'], `${label} host`);
  assertEnum(value.provider, ['openai', 'anthropic', 'xai', 'other'], `${label} provider`);
  assertString(value.model_id, `${label} model_id`);
  assertString(value.model_display, `${label} model_display`);
  assertFingerprint(value.session_fingerprint, `${label} session_fingerprint`);
  assertEnum(value.identity_source, ['runtime', 'declared'], `${label} identity_source`);
  assertTimestamp(value.joined_at, `${label} joined_at`);
}

function validateArtifact(value, label, { initial = false } = {}) {
  exactKeys(
    value,
    initial ? ['path', 'head', 'blob', 'digest'] : ['path', 'blob', 'digest'],
    label
  );
  assertPath(value.path, `${label} path`);
  if (initial) assertGitObject(value.head, `${label} head`);
  assertGitObject(value.blob, `${label} blob`);
  assertDigest(value.digest, `${label} digest`);
}

function validateResponse(value, label) {
  exactKeys(value, ['path', 'digest'], label);
  assertPath(value.path, `${label} path`);
  assertDigest(value.digest, `${label} digest`);
}

function validateClaim(value, label) {
  exactKeys(
    value,
    [
      'claim_id',
      'role',
      'session_fingerprint',
      'host',
      'claimed_at',
      'last_activity_at',
      'expires_at',
      'pid',
    ],
    label
  );
  assertIdentifier(value.claim_id, `${label} claim_id`);
  assertEnum(value.role, ['author', 'reviewer'], `${label} role`);
  assertFingerprint(value.session_fingerprint, `${label} session_fingerprint`);
  assertEnum(value.host, ['codex', 'claude-code', 'grok', 'other'], `${label} host`);
  assertTimestamp(value.claimed_at, `${label} claimed_at`);
  assertTimestamp(value.last_activity_at, `${label} last_activity_at`);
  assertTimestamp(value.expires_at, `${label} expires_at`);
  assertPositiveInteger(value.pid, `${label} pid`);
  if (
    Date.parse(value.last_activity_at) < Date.parse(value.claimed_at) ||
    Date.parse(value.expires_at) <= Date.parse(value.last_activity_at)
  ) {
    throw invalid(`${label} chronology`);
  }
}

function validateAttestation(value, label) {
  exactKeys(
    value,
    ['source', 'strength', 'signer_id', 'signer_fingerprint', 'challenge_digest', 'verified_at'],
    label
  );
  assertEnum(
    value.source,
    ['detached-signature', 'host-approval', 'test-fixture'],
    `${label} source`
  );
  assertEnum(
    value.strength,
    [
      'cryptographic-external',
      'hardware-presence',
      'host-verified',
      'cryptographic-local',
      'unverified-test',
    ],
    `${label} strength`
  );
  assertString(value.signer_id, `${label} signer_id`);
  assertString(value.signer_fingerprint, `${label} signer_fingerprint`);
  assertDigest(value.challenge_digest, `${label} challenge_digest`);
  assertTimestamp(value.verified_at, `${label} verified_at`);
}

function validateTerminal(value, label, { committed }) {
  exactKeys(
    value,
    committed ? ['commit', 'manifest_digest'] : ['snapshot_digest', 'manifest_digest'],
    label
  );
  if (committed) assertGitObject(value.commit, `${label} commit`);
  else assertDigest(value.snapshot_digest, `${label} snapshot_digest`);
  assertDigest(value.manifest_digest, `${label} manifest_digest`);
}

function validateChallenge(value, label) {
  exactKeys(
    value,
    [
      'schema',
      'challenge_id',
      'review_id',
      'intervention_id',
      'protocol_revision',
      'action',
      'parameters_digest',
      'nonce',
      'expires_at',
    ],
    label
  );
  if (value.schema !== 'ai-peer-review.grant-challenge/v1') throw invalid(`${label} schema`);
  assertIdentifier(value.challenge_id, `${label} challenge_id`);
  assertIdentifier(value.review_id, `${label} review_id`);
  assertIdentifier(value.intervention_id, `${label} intervention_id`);
  assertNonNegativeInteger(value.protocol_revision, `${label} protocol_revision`);
  assertEnum(
    value.action,
    ['pin-verifier', 'continue', 'supplement', 'accept-over-objections', 'replace-participant'],
    `${label} action`
  );
  assertDigest(value.parameters_digest, `${label} parameters_digest`);
  assertIdentifier(value.nonce, `${label} nonce`);
  assertTimestamp(value.expires_at, `${label} expires_at`);
}

function validatePayload(type, payload) {
  switch (type) {
    case 'review-created':
      assertEnum(payload.commit_mode, ['normal', 'no-commit'], 'review-created commit_mode');
      assertPositiveInteger(payload.max_turns, 'review-created max_turns');
      assertPositiveInteger(payload.claim_ttl_ms, 'review-created claim_ttl_ms');
      if (payload.claim_ttl_ms % (60 * 60 * 1000) !== 0) {
        throw invalid('review-created claim_ttl_ms whole hours');
      }
      validateArtifact(payload.artifact, 'review-created artifact', { initial: true });
      validateParticipant(payload.author, 'review-created author');
      if (payload.author.role !== 'author') throw invalid('review-created author role');
      break;
    case 'reviewer-joined':
      validateParticipant(payload.reviewer, 'reviewer-joined reviewer');
      if (payload.reviewer.role !== 'reviewer') throw invalid('reviewer-joined reviewer role');
      break;
    case 'reviewer-revisions-requested':
    case 'reviewer-accepted':
      assertPositiveInteger(payload.turn, `${type} turn`);
      validateResponse(payload.response, `${type} response`);
      assertIdentifierArray(payload.finding_ids, `${type} finding_ids`);
      break;
    case 'author-revision-committed':
    case 'author-closing-round-committed':
      assertPositiveInteger(payload.turn, `${type} turn`);
      validateResponse(payload.response, `${type} response`);
      validateArtifact(payload.artifact, `${type} artifact`);
      assertGitObject(payload.commit, `${type} commit`);
      if (type === 'author-closing-round-committed') {
        assertIdentifier(payload.intervention_id, `${type} intervention_id`);
        if (payload.reason !== 'turn-budget-exhausted') throw invalid(`${type} reason`);
        if (payload.interrupted_state !== 'reviewer-turn')
          throw invalid(`${type} interrupted_state`);
      }
      break;
    case 'finalization-started':
      break;
    case 'acceptance-committed':
    case 'override-committed':
      validateTerminal(payload.terminal, `${type} terminal`, { committed: true });
      if (type === 'override-committed') {
        assertIdentifier(payload.intervention_id, `${type} intervention_id`);
        validateAttestation(payload.attestation, `${type} attestation`);
      }
      break;
    case 'acceptance-sealed-no-commit':
    case 'override-sealed-no-commit':
      validateTerminal(payload.terminal, `${type} terminal`, { committed: false });
      if (type === 'override-sealed-no-commit') {
        assertIdentifier(payload.intervention_id, `${type} intervention_id`);
        validateAttestation(payload.attestation, `${type} attestation`);
      }
      break;
    case 'intervention-entered':
      assertIdentifier(payload.intervention_id, `${type} intervention_id`);
      assertEnum(
        payload.reason,
        ['turn-budget-exhausted', 'stale-claim', 'participant-loss'],
        `${type} reason`
      );
      assertEnum(
        payload.interrupted_state,
        ['reviewer-turn', 'author-revision'],
        `${type} interrupted_state`
      );
      break;
    case 'continued-to-reviewer':
    case 'continued-to-author':
      assertIdentifier(payload.intervention_id, `${type} intervention_id`);
      assertPositiveInteger(payload.additional_turns, `${type} additional_turns`);
      assertPositiveInteger(payload.effective_max_turns, `${type} effective_max_turns`);
      validateAttestation(payload.attestation, `${type} attestation`);
      break;
    case 'same-session-reclaim':
      assertIdentifier(payload.intervention_id, `${type} intervention_id`);
      validateClaim(payload.old_claim, `${type} old_claim`);
      validateClaim(payload.new_claim, `${type} new_claim`);
      break;
    case 'participant-replaced':
      assertIdentifier(payload.intervention_id, `${type} intervention_id`);
      assertEnum(payload.role, ['author', 'reviewer'], `${type} role`);
      validateClaim(payload.outgoing_claim, `${type} outgoing_claim`);
      validateParticipant(payload.incoming_participant, `${type} incoming_participant`);
      validateAttestation(payload.attestation, `${type} attestation`);
      if (
        payload.outgoing_claim.role !== payload.role ||
        payload.incoming_participant.role !== payload.role
      ) {
        throw invalid(`${type} role binding`);
      }
      break;
    case 'abandoned':
      assertIdentifier(payload.intervention_id, `${type} intervention_id`);
      assertString(payload.reason, `${type} reason`);
      assertPathArray(payload.retained_paths, `${type} retained_paths`);
      break;
    case 'turn-claimed':
      validateClaim(payload.claim, `${type} claim`);
      break;
    case 'identity-changed':
      assertEnum(payload.role, ['author', 'reviewer'], `${type} role`);
      validateParticipant(payload.identity, `${type} identity`);
      if (payload.identity.role !== payload.role) throw invalid(`${type} role binding`);
      break;
    case 'challenge-requested':
      validateChallenge(payload.challenge, `${type} challenge`);
      break;
    case 'challenge-superseded':
    case 'delivery-acknowledged':
      assertIdentifier(
        payload[type === 'challenge-superseded' ? 'challenge_id' : 'delivery_id'],
        `${type} identifier`
      );
      break;
    case 'supplement-registered':
      exactKeys(
        payload.supplement,
        [
          'supplement_id',
          'digest',
          'target_role',
          'target_turn',
          'content_retention',
          'attestation',
        ],
        `${type} supplement`
      );
      assertIdentifier(payload.supplement.supplement_id, `${type} supplement_id`);
      assertDigest(payload.supplement.digest, `${type} digest`);
      assertEnum(payload.supplement.target_role, ['author', 'reviewer'], `${type} target_role`);
      assertPositiveInteger(payload.supplement.target_turn, `${type} target_turn`);
      if (payload.supplement.content_retention !== 'scratch-only')
        throw invalid(`${type} content_retention`);
      validateAttestation(payload.supplement.attestation, `${type} attestation`);
      break;
    case 'delivery-written':
      exactKeys(payload.delivery, ['delivery_id', 'recipient', 'digest'], `${type} delivery`);
      assertIdentifier(payload.delivery.delivery_id, `${type} delivery_id`);
      assertEnum(payload.delivery.recipient, ['author', 'reviewer'], `${type} recipient`);
      assertDigest(payload.delivery.digest, `${type} digest`);
      break;
    default:
      throw invalid('unknown type', { type });
  }
}

export function eventAdvancesRevision(type) {
  if (!Object.hasOwn(EVENT_DEFINITIONS, type)) throw invalid('unknown type', { type });
  const definition = EVENT_DEFINITIONS[type];
  return definition.advancesRevision;
}

export function validateEvent(value) {
  exactKeys(value, TOP_LEVEL_FIELDS, 'envelope');
  if (value.schema !== 'ai-peer-review.event/v1') throw invalid('schema');
  if (typeof value.review_id !== 'string' || !IDENTIFIER_RE.test(value.review_id)) {
    throw invalid('review_id');
  }
  if (!Number.isSafeInteger(value.sequence) || value.sequence <= 0) throw invalid('sequence');
  if (!Number.isSafeInteger(value.revision) || value.revision < 0) throw invalid('revision');
  if (!Object.hasOwn(EVENT_DEFINITIONS, value.type)) {
    throw invalid('unknown type', { type: value.type });
  }
  if (value.actor !== 'system' && !FINGERPRINT_RE.test(value.actor)) throw invalid('actor');
  assertTimestamp(value.at, 'at');
  exactKeys(value.payload, EVENT_DEFINITIONS[value.type].fields, `${value.type} payload`);
  assertJsonValue(value.payload);
  validatePayload(value.type, value.payload);
  return true;
}
