// @story #189
// Diagnostic timing tap only: calls original stock exec with identical inputs.
// Prints operation kind and duration, never command text, paths or credentials.
import * as childProcess from 'node:child_process';
import { syncBuiltinESMExports, createRequire } from 'node:module';
import { promisify } from 'node:util';
import { performance } from 'node:perf_hooks';
const require = createRequire(import.meta.url);
const mutable = require('node:child_process');
const original = childProcess.execFile;
let sequence = 0;
function timing(file, args, options) {
  const id = ++sequence,
    started = performance.now();
  const encoded = args?.indexOf('-EncodedCommand');
  const source = encoded >= 0 ? Buffer.from(args[encoded + 1], 'base64').toString('utf16le') : '';
  const kind =
    (/(?:^|[\\/])whoami(?:\.exe)?$/i.test(file) || /WindowsIdentity.*GetCurrent/.test(source)) &&
    !/GetAccessControl|Get-Acl/.test(source)
      ? 'principal'
      : source
        ? 'acl-or-path'
        : 'other';
  return (outcome, error) =>
    process.stderr.write(
      JSON.stringify({
        diagnostic: 'stock-exec-timing',
        id,
        kind,
        elapsedMs: Math.round(performance.now() - started),
        outcome,
        timeoutMs: Number.isSafeInteger(options?.timeout) ? options.timeout : null,
        code:
          typeof error?.code === 'number' || /^[A-Z0-9_]{1,30}$/.test(error?.code ?? '')
            ? error.code
            : null,
        signal: /^[A-Z0-9_]{1,30}$/.test(error?.signal ?? '') ? error.signal : null,
        killed: error?.killed === true,
      }) + '\n'
    );
}
function traced(file, args, options, callback) {
  const report = timing(file, args, typeof options === 'object' ? options : null);
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }
  return original(file, args, options, (error, stdout, stderr) => {
    report(error ? 'refused' : 'completed', error);
    callback?.(error, stdout, stderr);
  });
}
traced[promisify.custom] = (...args) => {
  const report = timing(args[0], args[1], args[2]);
  const result = original[promisify.custom](...args);
  result.then(
    () => report('completed'),
    (error) => report('refused', error)
  );
  return result;
};
mutable.execFile = traced;
syncBuiltinESMExports();
