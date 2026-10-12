// @story #209
// Closed historical parsing only. Association never proves a current provider observation.
import { createHash } from 'node:crypto';
import { fingerprintSession } from '../identity/fingerprint.mjs';
import { resolveReviewPaths } from '../collateral/paths.mjs';
import { providerEvidenceDigestCore } from '../providers/evidence.mjs';
const exact = (value, keys) =>
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const text = (value) =>
  typeof value === 'string' &&
  !!value &&
  value.trim() === value &&
  value.length <= 4096 &&
  value.isWellFormed() &&
  value.normalize('NFC') === value;
const hash = (value) => createHash('sha256').update(value).digest('hex');
const fingerprint = (value) => /^sha256:[a-f0-9]{64}$/u.test(value ?? '');
const selectors = {
  codex: ['openai', 'codex'],
  claude: ['anthropic', 'claude-code'],
  grok: ['xai', 'grok'],
};
function binding(value, role, state) {
  const participant = state.participants?.[role];
  const selected = Object.entries(selectors).find(
    ([, [provider, host]]) => provider === participant?.provider && host === participant?.host
  )?.[0];
  return (
    exact(value, [
      'schema',
      'review_id',
      'role',
      'selector',
      'provider',
      'host',
      'model_id',
      'adapter_version',
      'operation_id',
      'session_fingerprint',
      'evidence_digest',
      'tool_use_id',
      'handle_locator',
    ]) &&
    value.schema === 'ai-peer-review.participant-binding/v1' &&
    value.role === role &&
    value.review_id === state.protocol.review_id &&
    value.selector === selected &&
    value.provider === participant?.provider &&
    value.host === participant?.host &&
    value.model_id === participant?.model_id &&
    value.adapter_version === state.protocol.startup.runtime.adapter_version &&
    value.operation_id === (role === 'author' ? 'start:' : 'join:') + state.protocol.review_id &&
    value.session_fingerprint === participant?.session_fingerprint &&
    fingerprint(value.session_fingerprint) &&
    fingerprint(value.evidence_digest) &&
    text(value.tool_use_id) &&
    text(value.handle_locator) &&
    fingerprintSession(value.provider, value.handle_locator) === value.session_fingerprint
  );
}
function launchState(value, state) {
  const context = state.protocol.startup.context,
    runtime = state.protocol.startup.runtime;
  if (!context || runtime.reviewer.selector !== 'claude') return false;
  const paths = resolveReviewPaths({
    root: context.repository_root,
    reviewsRoot: context.reviews_root,
    reviewPathTemplate: context.review_path_template,
    issue: context.issue,
    kind: context.artifact_kind,
    name: context.artifact_name,
    date: context.review_date,
    reviewId: context.review_id,
    recordId: context.record_id ?? context.review_id,
  });
  const first = paths.reviewerResponse(1).absolute;
  const prefix = first.slice(0, -4);
  const turn =
    typeof value.response === 'string' &&
    value.response.startsWith(prefix) &&
    value.response.endsWith('.md')
      ? value.response.slice(prefix.length, -3)
      : '';
  return (
    exact(value, [
      'schema',
      'review_id',
      'invitation',
      'response',
      'model',
      'effort',
      'session_handle',
      'session_fingerprint',
      'protocol_revision',
    ]) &&
    value.schema === 'ai-peer-review.claude-launch-state/v1' &&
    value.review_id === state.protocol.review_id &&
    value.invitation === paths.reviewerInvitation.absolute &&
    /^[1-9][0-9]*$/u.test(turn) &&
    Number.isSafeInteger(Number(turn)) &&
    Number(turn) <= state.protocol.max_turns &&
    value.model === runtime.reviewer.model_id &&
    value.effort === runtime.reviewer.effort &&
    text(value.session_handle) &&
    /^[A-Za-z0-9._:-]+$/u.test(value.session_handle) &&
    value.session_fingerprint === fingerprintSession('anthropic', value.session_handle) &&
    (!state.participants.reviewer ||
      value.session_fingerprint === state.participants.reviewer.session_fingerprint) &&
    Number.isSafeInteger(value.protocol_revision) &&
    value.protocol_revision >= 0 &&
    value.protocol_revision <= state.protocol.revision
  );
}
function observation(value, name, state) {
  if (
    !exact(value, [
      'source',
      'source_version',
      'observed_at',
      'operation_id',
      'provider',
      'host',
      'model_id',
      'session_id',
      'phase',
      'tool_use_id',
    ])
  )
    return false;
  const role =
    value.operation_id === 'join:' + state.protocol.review_id
      ? 'reviewer'
      : value.operation_id === 'start:' + state.protocol.review_id
        ? 'author'
        : null;
  const participant = state.participants?.[role];
  const model =
    participant?.model_id ??
    (role === 'reviewer' ? state.protocol.startup.runtime.reviewer.model_id : null);
  return (
    role &&
    value.source === 'official-exact-session' &&
    text(value.source_version) &&
    text(value.tool_use_id) &&
    text(value.session_id) &&
    value.provider === 'anthropic' &&
    value.host === 'claude-code' &&
    value.model_id === model &&
    value.phase === 'tool-use' &&
    typeof value.observed_at === 'string' &&
    Number.isFinite(Date.parse(value.observed_at)) &&
    new Date(value.observed_at).toISOString() === value.observed_at &&
    (!participant ||
      fingerprintSession('anthropic', value.session_id) === participant.session_fingerprint) &&
    (name === 'provider/claude/observations/' + hash(value.operation_id) + '.json' ||
      (process.platform !== 'win32' &&
        name === 'provider/claude/observations/' + value.operation_id + '.json'))
  );
}
export function validatePortableProviderRecordsCore(input = {}) {
  const records = [];
  const result = (status) =>
    Object.freeze({
      verified: false,
      status,
      records: Object.freeze(status === 'valid' ? records : []),
      outstandingObligations: Object.freeze(
        status === 'valid'
          ? []
          : [{ name: 'review-authority-unproved', outcome: 'retained-unproved' }]
      ),
    });
  if (
    !exact(input, ['files', 'state', 'journal']) ||
    !Array.isArray(input.files) ||
    input.files.length > 4096
  )
    return result('unknown');
  try {
    const names = new Set();
    for (const file of input.files) {
      if (
        !file ||
        names.has(file.name) ||
        !Buffer.isBuffer(file.bytes) ||
        file.bytes.length > 1048576 ||
        !input.state?.protocol?.startup?.runtime
      )
        return result('unknown');
      names.add(file.name);
      const value = JSON.parse(file.bytes.toString('utf8')),
        { state, journal } = input;
      const encoded = file.bytes.toString('utf8').trim();
      if (encoded !== JSON.stringify(value) && encoded !== JSON.stringify(value, null, 2))
        return result('unknown');
      const ownerOnly =
        process.platform === 'win32' ||
        (Number.isSafeInteger(file.mode) && (file.mode & 0o077) === 0);
      const match = /^provider\/(codex|claude|grok)\/operations\/([a-f0-9]{64})\.json$/u.exec(
        file.name
      );
      let valid = false;
      if (
        file.name === 'provider/bindings/author.json' ||
        file.name === 'provider/bindings/reviewer.json'
      )
        valid =
          ownerOnly &&
          binding(value, file.name.includes('/author.') ? 'author' : 'reviewer', state);
      else if (match) {
        valid =
          exact(value, ['schema', 'selector', 'operation_id', 'handle', 'session_fingerprint']) &&
          value.schema === 'ai-peer-review.provider-operation/v1' &&
          value.selector === match[1] &&
          value.selector === state.protocol.startup.runtime.reviewer.selector &&
          value.operation_id === journal?.provider_operation?.operation_id &&
          hash(value.operation_id) === match[2] &&
          text(value.handle) &&
          fingerprint(value.session_fingerprint) &&
          fingerprintSession(selectors[match[1]][0], value.handle) === value.session_fingerprint &&
          value.session_fingerprint !== state.participants.author.session_fingerprint &&
          (!state.participants.reviewer ||
            value.session_fingerprint === state.participants.reviewer.session_fingerprint);
      } else if (file.name.startsWith('provider/claude/observations/'))
        valid = ownerOnly && observation(value, file.name, state);
      else if (file.name === 'provider/claude/launch-state.json') valid = launchState(value, state);
      if (!valid) return result('unknown');
      records.push(Object.freeze(value));
    }
    for (const bound of records.filter(
      (record) => record.schema === 'ai-peer-review.participant-binding/v1'
    )) {
      const observed = records.find(
        (record) =>
          record.source === 'official-exact-session' && record.operation_id === bound.operation_id
      );
      if (
        observed &&
        (observed.tool_use_id !== bound.tool_use_id ||
          observed.session_id !== bound.handle_locator ||
          providerEvidenceDigestCore({
            observed,
            sessionFingerprint: bound.session_fingerprint,
            adapterVersion: bound.adapter_version,
          }) !== bound.evidence_digest)
      )
        return result('unknown');
    }
    return result('valid');
  } catch {
    return result('unknown');
  }
}
