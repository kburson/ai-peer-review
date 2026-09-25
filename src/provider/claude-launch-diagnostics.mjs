import { AprError } from '../errors.mjs';

const MAX_CAPTURE_BYTES = 1024 * 1024;
const SPAWN_CODES = new Set(['ENOENT', 'EACCES']);
const JOIN_CODES = new Set([
  'APR_IDENTITY_REQUIRED',
  'APR_IDENTITY_CONFLICT',
  'APR_IDENTITY_AMBIGUOUS',
]);
const COPY = Object.freeze({
  'spawn-failed': [
    'Claude could not be started.',
    'Check the Claude installation and executable access, then inspect review status.',
  ],
  'provider-failed': [
    'Claude reported a provider failure.',
    'Check provider availability and authentication, then inspect review status.',
  ],
  'join-failed': [
    'The provider reported a reviewer identity failure.',
    'Check supported Claude session and model metadata or configuration, then inspect review status.',
  ],
  'response-permission-denied': [
    'Claude was denied access to the exact reviewer response.',
    'Inspect review status; use the printed recovery command only when one is available.',
  ],
  'execution-interrupted': [
    'Claude execution ended without a definite completion result.',
    'Inspect review status before considering another launch.',
  ],
  'invalid-provider-output': [
    'Claude did not return usable structured output.',
    'Inspect review status before considering another launch.',
  ],
  'session-unavailable': [
    'The launched Claude session could not be established.',
    'Inspect review status before considering another launch.',
  ],
  'no-submission': [
    'No new reviewer submission was recorded.',
    'Inspect review status before considering another launch.',
  ],
});

function invalidDiagnostic() {
  throw new AprError('APR_CLAUDE_RESULT_INVALID', 'Claude diagnostic definition is invalid.', {
    recovery: 'Preserve the review and correct the package diagnostic definition.',
  });
}

export function normalizeClaudeExecution({ execution, error = null } = {}) {
  const source = error ?? execution ?? {};
  const rawExit = error ? error.code : source.exit_code;
  const exit_code = Number.isSafeInteger(rawExit) ? rawExit : null;
  const spawn_code = error && SPAWN_CODES.has(error.code) ? error.code : null;
  const captureOverflow = error?.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER';
  const interrupted = Boolean(
    captureOverflow ||
    source.signal ||
    source.killed ||
    source.timedOut ||
    source.timeout ||
    (error && !spawn_code && exit_code === null)
  );
  const stdout = typeof source.stdout === 'string' ? source.stdout : '';
  const stderr = typeof source.stderr === 'string' ? source.stderr : '';
  let output_issue = 'none';
  if (captureOverflow) output_issue = 'capture-overflow';
  else if (
    Buffer.byteLength(stdout, 'utf8') > MAX_CAPTURE_BYTES ||
    Buffer.byteLength(stderr, 'utf8') > MAX_CAPTURE_BYTES
  )
    output_issue = 'oversized';
  else if (!stdout) output_issue = 'empty';
  let parsed = null;
  if (output_issue === 'none') {
    try {
      parsed = JSON.parse(stdout);
    } catch {
      output_issue = 'invalid-json';
    }
    if (
      output_issue === 'none' &&
      (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    ) {
      output_issue = 'invalid-envelope';
      parsed = null;
    }
  }
  const output_valid = output_issue === 'none';
  const session_id_present = output_valid && Object.hasOwn(parsed, 'session_id');
  const permission_denials =
    output_valid && Array.isArray(parsed.permission_denials)
      ? parsed.permission_denials
          .filter(
            (entry) => entry && typeof entry.tool === 'string' && typeof entry.path === 'string'
          )
          .map(({ tool, path }) => ({ tool, path }))
      : [];
  const structuredError = output_valid && parsed.error;
  const provider_failed = Boolean(
    output_valid &&
    (parsed.is_error === true ||
      (typeof structuredError === 'string' && structuredError.trim() !== '') ||
      (structuredError &&
        typeof structuredError === 'object' &&
        !Array.isArray(structuredError) &&
        Object.keys(structuredError).length > 0))
  );
  const join_code =
    provider_failed &&
    structuredError &&
    typeof structuredError === 'object' &&
    !Array.isArray(structuredError) &&
    JOIN_CODES.has(structuredError.code)
      ? structuredError.code
      : null;
  return Object.freeze({
    exit_code,
    spawn_code,
    interrupted,
    output_valid,
    output_issue,
    session_id_present,
    session_id: session_id_present ? parsed.session_id : null,
    permission_denials,
    provider_failed,
    join_code,
  });
}

export function buildClaudeLaunchDiagnostic({ category, exit_code = null, code = null } = {}) {
  const copy = Object.hasOwn(COPY, category) ? COPY[category] : null;
  if (
    !copy ||
    (exit_code !== null && !Number.isSafeInteger(exit_code)) ||
    (code !== null &&
      !(
        (category === 'spawn-failed' && SPAWN_CODES.has(code)) ||
        (category === 'join-failed' && JOIN_CODES.has(code))
      ))
  )
    invalidDiagnostic();
  const [message, next_action] = copy;
  const diagnostic = Object.freeze({ category, exit_code, code, message, next_action });
  if (
    Buffer.byteLength(message, 'utf8') > 256 ||
    Buffer.byteLength(next_action, 'utf8') > 256 ||
    Buffer.byteLength(JSON.stringify(diagnostic), 'utf8') > 1024
  )
    invalidDiagnostic();
  return diagnostic;
}
