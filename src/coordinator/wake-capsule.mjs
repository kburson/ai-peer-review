// @story #209
import { createHash } from 'node:crypto';
import { AprError } from '../errors.mjs';
import { canonicalProjection } from '../protocol/canonical-projection.mjs';
function fail(code, message, recovery, details = {}) {
  throw new AprError(code, message, { recovery, details });
}

function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function fingerprint(value) {
  return typeof value === 'string' && /^sha256:[0-9a-f]{64}$/.test(value);
}

export function canonicalWakeCapsule(decision) {
  if (!record(decision?.capsule)) {
    fail(
      'APR_WAKE_CAPSULE_INVALID',
      'Wake decision does not contain a pointer capsule.',
      'Recompute the wake decision from validated protocol authority.'
    );
  }
  return Buffer.from(`${canonicalProjection(decision.capsule)}\n`, 'utf8');
}

export function wakeOperationKey(decision) {
  if (
    !record(decision) ||
    !['wake', 'terminal', 'intervention'].includes(decision.kind) ||
    !fingerprint(decision.participant_fingerprint)
  ) {
    fail(
      'APR_WAKE_CAPSULE_INVALID',
      'Wake decision cannot form an operation key.',
      'Recompute the wake decision from validated protocol authority.'
    );
  }
  const input = {
    review_id: decision.capsule.review_id,
    protocol_revision: decision.capsule.expected_revision,
    target_role: decision.capsule.target_role,
    session_fingerprint: decision.participant_fingerprint,
  };
  return `sha256:${createHash('sha256').update(canonicalProjection(input)).digest('hex')}`;
}
