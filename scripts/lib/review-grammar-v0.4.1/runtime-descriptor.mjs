// @story #144
// Pure closed runtime descriptor from exact0.4.1 startup source, no startup side effects.
import { AprError } from '../../../src/errors.mjs';
const PROVIDERS = new Set(['openai', 'anthropic', 'xai']);
const TRANSPORTS = new Set(['manual', 'resume-only', 'automatic-required']);
const CLASSIFICATIONS = new Set(['SPR', 'XPR']);
const OWNERSHIPS = new Set(['native', 'broker']);
const SELECTOR_IDENTITY = Object.freeze({
  codex: Object.freeze({ provider: 'openai', host: 'codex' }),
  claude: Object.freeze({ provider: 'anthropic', host: 'claude-code' }),
  grok: Object.freeze({ provider: 'xai', host: 'grok' }),
});

function text(value) {
  return typeof value === 'string' && value.trim() === value && value.length > 0;
}

function usage(message, details = {}) {
  throw new AprError('APR_USAGE', message, {
    recovery: 'Provide the complete closed runtime descriptor for the requested reviewer.',
    details,
  });
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) usage(`${label} is invalid.`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    usage(`${label} must use the closed descriptor fields.`, { fields: actual });
  }
}

export function validateRuntimeDescriptor(value) {
  exactKeys(
    value,
    [
      'schema',
      'classification',
      'ownership',
      'transport_mode',
      ...(value?.author === undefined ? [] : ['author']),
      'reviewer',
      'adapter_version',
      'project_root_digest',
    ],
    'Runtime descriptor'
  );
  if (value.schema !== 'ai-peer-review.runtime/v1') usage('Runtime descriptor schema is invalid.');
  if (!CLASSIFICATIONS.has(value.classification))
    usage('Runtime descriptor classification is invalid.');
  if (!OWNERSHIPS.has(value.ownership)) usage('Runtime descriptor ownership is invalid.');
  if (!TRANSPORTS.has(value.transport_mode)) usage('Runtime descriptor transport mode is invalid.');
  if (value.author !== undefined) {
    exactKeys(
      value.author,
      ['provider', 'host', 'model_id', 'model_display', 'effort'],
      'Runtime descriptor author'
    );
    if (
      !PROVIDERS.has(value.author.provider) ||
      !text(value.author.host) ||
      !text(value.author.model_id) ||
      !text(value.author.model_display) ||
      !text(value.author.effort)
    )
      usage('Runtime descriptor author selection is invalid.');
  }
  exactKeys(
    value.reviewer,
    ['selector', 'provider', 'host', 'model_id', 'model_display', 'effort'],
    'Runtime descriptor reviewer'
  );
  const selected = SELECTOR_IDENTITY[value.reviewer.selector];
  if (
    !selected ||
    selected.provider !== value.reviewer.provider ||
    selected.host !== value.reviewer.host
  ) {
    usage('Runtime descriptor reviewer selector, provider, and host disagree.');
  }
  if (!text(value.reviewer.model_id) || !text(value.reviewer.model_display))
    usage('Runtime descriptor reviewer model is invalid.');
  if (!text(value.reviewer.effort)) usage('Runtime descriptor reviewer effort is invalid.');
  if (!text(value.adapter_version)) usage('Runtime descriptor adapter version is invalid.');
  if (
    typeof value.project_root_digest !== 'string' ||
    !/^[0-9a-f]{64}$/.test(value.project_root_digest)
  )
    usage('Runtime descriptor project root digest is invalid.');
  return value;
}
