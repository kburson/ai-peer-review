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
childProcess.execFileSync = function (...args) {
  const operation = operationFor(args[0], args[1]);
  const started = performance.now();
  try {
    return original.apply(this, args);
  } catch (error) {
    if (operation) {
      const stderr = String(error.stderr ?? '');
      const http = /HTTP ([1-5][0-9]{2})/u.exec(stderr);
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
        commandOutputPresent: (error.stdout?.length ?? 0) > 0,
        jsonOutputComplete,
        code: codes.has(error.code) ? error.code : 'other',
        status:
          Number.isInteger(error.status) && error.status >= 0 && error.status <= 255
            ? error.status
            : null,
        signal: error.signal == null ? null : signals.has(error.signal) ? error.signal : 'other',
        httpStatus: http ? Number(http[1]) : null,
        connectionFailure:
          /error connecting to api\.github\.com|no such host|TLS handshake timeout/u.test(stderr),
        elapsedMs: Math.max(0, Math.round(performance.now() - started)),
      };
      process.stderr.write('contract-transport-diagnostic ' + JSON.stringify(evidence) + '\n');
    }
    throw error;
  }
};
syncBuiltinESMExports();
