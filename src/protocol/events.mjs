import { AprError } from '../errors.mjs';

const definitions = {
  'review-created': {
    advancesRevision: true,
    fields: ['commit_mode', 'max_turns', 'artifact', 'author'],
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

export function eventAdvancesRevision(type) {
  const definition = EVENT_DEFINITIONS[type];
  if (!definition) throw invalid('unknown type', { type });
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
  if (!EVENT_DEFINITIONS[value.type]) throw invalid('unknown type', { type: value.type });
  if (value.actor !== 'system' && !FINGERPRINT_RE.test(value.actor)) throw invalid('actor');
  if (
    typeof value.at !== 'string' ||
    !RFC3339_RE.test(value.at) ||
    Number.isNaN(Date.parse(value.at))
  ) {
    throw invalid('at');
  }
  exactKeys(value.payload, EVENT_DEFINITIONS[value.type].fields, `${value.type} payload`);
  assertJsonValue(value.payload);
  return true;
}
