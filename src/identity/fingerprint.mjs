import { AprError } from '../errors.mjs';
const PROVIDERS = new Set(['openai', 'anthropic', 'xai', 'other']);
function fail(code, message, recovery, details = {}) {
  throw new AprError(code, message, { recovery, details });
}

function text(value, label) {
  if (
    typeof value !== 'string' ||
    !value ||
    !value.isWellFormed() ||
    value !== value.normalize('NFC')
  ) {
    fail(
      'APR_IDENTITY_INVALID',
      `Identity ${label} is invalid.`,
      'Provide complete normalized identity metadata.'
    );
  }
  return value;
}

// @story #209
import { createHash } from 'node:crypto';
export function fingerprintSession(provider, rawSessionId) {
  if (!PROVIDERS.has(provider)) {
    fail(
      'APR_IDENTITY_INVALID',
      'Identity provider is invalid.',
      'Use a documented provider name.'
    );
  }
  const normalizedProvider = text(provider, 'provider');
  const normalizedSession = text(rawSessionId, 'session');
  const digest = createHash('sha256')
    .update('ai-peer-review.session/v1\n', 'utf8')
    .update(normalizedProvider, 'utf8')
    .update('\n', 'utf8')
    .update(normalizedSession, 'utf8')
    .digest('hex');
  return `sha256:${digest}`;
}
