// @story #209
// Isolated test preload: preserve actual CLI calls/results; log only closed failure facts.
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';

const original = childProcess.execFileSync;
const codes = new Set([
  'ETIMEDOUT',
  'ENOENT',
  'EACCES',
  'ENOBUFS',
  'ECONNRESET',
  'ECONNREFUSED',
  'EPIPE',
]);
const signals = new Set(['SIGTERM', 'SIGKILL', 'SIGABRT']);
function operationFor(command, args) {
  if (command !== 'gh' || !Array.isArray(args)) return null;
  if (args.join('\0') === 'auth\0token\0--hostname\0github.com') return 'credential';
  if (
    args.length === 4 &&
    args[0] === 'api' &&
    args[1] === '--hostname' &&
    args[2] === 'github.com'
  ) {
    if (args[3] === 'repos/kburson/ai-peer-review') return 'repository';
    if (args[3] === 'repos/kburson/ai-peer-review/issues/144') return 'issue';
    if (/^repos\/kburson\/ai-peer-review\/issues\/comments\/[1-9][0-9]*$/u.test(args[3]))
      return 'approval-comment';
  }
  return 'other-gh';
}
export function contractTransportTrace(stderr, endpoint) {
  const traceTruncated = stderr.length > 65536;
  const unknown = {
    requestObserved: false,
    responseHeadersObserved: false,
    httpStatus: null,
    traceTruncated,
  };
  if (
    traceTruncated ||
    !['repository', 'issue', 'approval-comment'].includes(
      operationFor('gh', ['api', '--hostname', 'github.com', endpoint])
    )
  )
    return unknown;
  const lines = stderr.slice(0, 65536).split(/\r?\n/u);
  let cursor = lines.findIndex((line) => line.startsWith('* Request at '));
  if (
    cursor < 0 ||
    lines[++cursor] !== '* Request to https://api.github.com/' + endpoint ||
    !lines[++cursor]?.startsWith('> GET /' + endpoint + ' HTTP/') ||
    !/^> GET \S+ HTTP\/[0-9.]+$/u.test(lines[cursor])
  )
    return unknown;
  let hostObserved = false;
  while (lines[++cursor]?.startsWith('> ')) {
    if (!/^> [A-Za-z0-9-]+: /u.test(lines[cursor])) return unknown;
    hostObserved ||= lines[cursor] === '> Host: api.github.com';
  }
  if (lines[cursor] !== '' || !hostObserved) return unknown;
  const request = { ...unknown, requestObserved: true };
  while (lines[cursor] === '') cursor += 1;
  const status = /^< HTTP\/[0-9.]+ ([1-5][0-9]{2})(?: [^\r\n]*)?$/u.exec(lines[cursor] ?? '');
  return status
    ? { ...request, responseHeadersObserved: true, httpStatus: Number(status[1]) }
    : request;
}
childProcess.execFileSync = function (...args) {
  const operation = operationFor(args[0], args[1]);
  const traceEnabled =
    process.env.APR_CONTRACT_TRANSPORT_TRACE === '1' &&
    ['repository', 'issue', 'approval-comment'].includes(operation);
  if (traceEnabled)
    args[2] = { ...args[2], env: { ...(args[2]?.env ?? process.env), GH_DEBUG: 'api' } };
  const started = performance.now();
  try {
    return original.apply(this, args);
  } catch (error) {
    if (operation) {
      const stderr = String(error.stderr ?? '');
      const trace = traceEnabled ? contractTransportTrace(stderr, args[1][3]) : null;
      const http = traceEnabled ? null : /HTTP ([1-5][0-9]{2})/u.exec(stderr);
      let jsonOutputComplete = false;
      if (operation !== 'credential')
        try {
          const value = JSON.parse(String(error.stdout ?? ''));
          jsonOutputComplete = value !== null && typeof value === 'object' && !Array.isArray(value);
        } catch {
          // No output contents leave this failed command; this never supplies authority.
        }
      const evidence = {
        verified: false,
        operation,
        traceEnabled,
        ...(trace ?? {}),
        commandOutputPresent: (error.stdout?.length ?? 0) > 0,
        jsonOutputComplete,
        code: codes.has(error.code) ? error.code : 'other',
        status:
          Number.isInteger(error.status) && error.status >= 0 && error.status <= 255
            ? error.status
            : null,
        signal: error.signal == null ? null : signals.has(error.signal) ? error.signal : 'other',
        httpStatus: trace?.httpStatus ?? (http ? Number(http[1]) : null),
        connectionFailure:
          !traceEnabled &&
          /error connecting to api\.github\.com|no such host|TLS handshake timeout/u.test(stderr),
        elapsedMs: Math.max(0, Math.round(performance.now() - started)),
      };
      process.stderr.write('contract-transport-diagnostic ' + JSON.stringify(evidence) + '\n');
    }
    throw error;
  }
};
syncBuiltinESMExports();
