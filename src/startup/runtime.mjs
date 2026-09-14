import { AprError } from '../errors.mjs';
import { PROVIDERS } from '../providers/registry.mjs';

const TRANSPORTS = new Set(['manual', 'resume-only', 'automatic-required']);
const IDENTITY_SOURCES = new Set(['runtime', 'declared']);

function unavailable(reason, details = {}) {
  throw new AprError(
    'APR_TRANSPORT_UNAVAILABLE',
    'No observed transport satisfies reviewer startup policy.',
    {
      recovery:
        'Use a declared available transport or restore a conformant exact-session native or broker adapter.',
      details: { reason, ...details },
    }
  );
}

function text(value) {
  return typeof value === 'string' && value.trim() === value && value.length > 0;
}

function requestedModes(requestedTransport, policy = {}) {
  if (requestedTransport !== null && requestedTransport !== undefined) {
    if (!TRANSPORTS.has(requestedTransport)) unavailable('invalid-requested-transport');
    return [requestedTransport];
  }
  const modes = [policy.transport_mode, ...(policy.startup_transport_preference ?? [])].filter(
    (mode) => mode !== undefined
  );
  if (!modes.length || modes.some((mode) => !TRANSPORTS.has(mode))) unavailable('invalid-policy');
  return [...new Set(modes)];
}

function assuredAuthor(author) {
  return (
    author &&
    PROVIDERS.has(author.provider) &&
    text(author.host) &&
    text(author.session_fingerprint) &&
    IDENTITY_SOURCES.has(author.identity_source)
  );
}

function compatibleNative(capabilities, selection, author, mode) {
  if (
    selection.classification !== 'SPR' ||
    author.identity_source !== 'runtime' ||
    author.provider !== selection.provider
  ) {
    return null;
  }
  return (capabilities?.native ?? []).find(
    (candidate) =>
      candidate?.exact_session === true &&
      candidate.provider === selection.provider &&
      candidate.host === selection.host &&
      candidate.transport_mode === mode &&
      text(candidate.adapter_version)
  );
}

function compatibleBroker(capabilities, mode) {
  return (capabilities?.broker ?? []).find(
    (candidate) => candidate?.transport_mode === mode && text(candidate.adapter_version)
  );
}

export function selectRuntime({
  selection,
  author,
  requestedTransport = null,
  policy = {},
  capabilities,
} = {}) {
  if (
    !selection ||
    !text(selection.provider) ||
    !text(selection.host) ||
    !['SPR', 'XPR'].includes(selection.classification)
  ) {
    unavailable('unresolved-selection');
  }
  if (!assuredAuthor(author)) unavailable('unresolved-author-assurance');
  const modes = requestedModes(requestedTransport, policy);
  for (const mode of modes) {
    const native = compatibleNative(capabilities, selection, author, mode);
    if (native) {
      return Object.freeze({
        ownership: 'native',
        transport_mode: mode,
        adapter_version: native.adapter_version,
      });
    }
    if (author?.identity_source === 'declared' && mode !== 'manual') continue;
    const broker = compatibleBroker(capabilities, mode);
    if (broker) {
      return Object.freeze({
        ownership: 'broker',
        transport_mode: mode,
        adapter_version: broker.adapter_version,
      });
    }
  }
  unavailable('no-policy-capability-intersection', { modes });
}
