// @story #190
// Diagnostic timing tap only: calls original stock exec with identical inputs.
// Prints operation kind and duration, never command text, paths or credentials.
import * as childProcess from 'node:child_process';
import { syncBuiltinESMExports, createRequire } from 'node:module';
import { promisify } from 'node:util';
import { performance } from 'node:perf_hooks';
import { stockDiagnosticDetails } from './windows-stock-diagnostic-core.mjs';
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
      : /Get-CimInstance -ClassName Win32_ComputerSystemProduct/u.test(source)
        ? 'host-identity'
        : source
          ? 'acl-or-path'
          : 'other';
  return (outcome, error, stdout, stderr) =>
    process.stderr.write(
      JSON.stringify({
        diagnostic: 'stock-exec-timing',
        id,
        kind,
        elapsedMs: Math.round(performance.now() - started),
        outcome,
        timeoutMs: Number.isSafeInteger(options?.timeout) ? options.timeout : null,
        ...stockDiagnosticDetails(kind, { error, stdout, stderr }),
      }) + '\n'
    );
}
function traced(file, args, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }
  const report = timing(file, args, options);
  return original(file, args, options, (error, stdout, stderr) => {
    report(error ? 'refused' : 'completed', error, stdout, stderr);
    callback?.(error, stdout, stderr);
  });
}
traced[promisify.custom] = (...args) => {
  const report = timing(args[0], args[1], args[2]);
  const result = original[promisify.custom](...args);
  result.then(
    ({ stdout, stderr }) => report('completed', null, stdout, stderr),
    (error) => report('refused', error, error.stdout, error.stderr)
  );
  return result;
};
mutable.execFile = traced;
syncBuiltinESMExports();
