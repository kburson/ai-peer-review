// @story #198
// Passive diagnostic preload. No candidate source transformation or cache.
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { performance } from 'node:perf_hooks';
import { promisify } from 'node:util';
import { createProbeMeasurement } from './windows-probe-measurement-core.mjs';
const require = createRequire(import.meta.url);
const cp = require('node:child_process'),
  fs = require('node:fs/promises');
const measurement = createProbeMeasurement();
const originalExec = cp.execFile,
  originalOpen = fs.open;
const isStock = (file) =>
  /^C:\\Windows\\System32\\WindowsPowerShell\\v1\.0\\powershell\.exe$/i.test(file);
function tap(file, args, options) {
  if (!isStock(file)) return null;
  const at = args?.indexOf('-EncodedCommand');
  const script = at >= 0 ? Buffer.from(args[at + 1], 'base64').toString('utf16le') : '';
  const kind = script.includes('ai-peer-review.windows-protection-observation/v1')
    ? 'observe'
    : script.includes('[IO.File]::Replace')
      ? 'replacement'
      : /WindowsIdentity.*GetCurrent/.test(script)
        ? 'principal'
        : 'other';
  return {
    token: measurement.begin({ signal: options?.signal, kind }),
    started: performance.now(),
  };
}
function finished(item, success) {
  if (item)
    measurement.complete(item.token, {
      success,
      elapsedMs: Math.round(performance.now() - item.started),
    });
}
function stdinTap(child, item) {
  if (!item || !child?.stdin) return;
  const end = child.stdin.end;
  child.stdin.end = function (...args) {
    // Keep payload private. Unknown/chunked inputs remain outside the observe class.
    try {
      const payload = JSON.parse(String(args[0]));
      measurement.setKind(
        item.token,
        payload.mode === 'observe'
          ? 'observe'
          : payload.mode === 'provision'
            ? 'provision'
            : 'other'
      );
    } catch {
      measurement.setKind(item.token, 'other');
    }
    return Reflect.apply(end, this, args);
  };
}
function traced(...args) {
  const file = args[0],
    list = args[1];
  const callbackIndex = typeof args.at(-1) === 'function' ? args.length - 1 : -1;
  const options = typeof args[2] === 'object' ? args[2] : undefined;
  const item = tap(file, list, options);
  if (callbackIndex >= 0) {
    const callback = args[callbackIndex];
    args[callbackIndex] = function (...values) {
      finished(item, !values[0]);
      return Reflect.apply(callback, this, values);
    };
  }
  let child;
  try {
    child = Reflect.apply(originalExec, this, args);
  } catch (error) {
    finished(item, false);
    throw error;
  }
  if (callbackIndex < 0 && item) child.once('exit', (code) => finished(item, code === 0));
  stdinTap(child, item);
  return child;
}
traced[promisify.custom] = function (...args) {
  const item = tap(args[0], args[1], args[2]);
  let result;
  try {
    result = Reflect.apply(originalExec[promisify.custom], this, args);
  } catch (error) {
    finished(item, false);
    throw error;
  }
  result.then(
    () => finished(item, true),
    () => finished(item, false)
  );
  stdinTap(result.child, item);
  return result;
};
fs.open = function (...args) {
  const stack = new Error().stack;
  const retained =
    /\bat (?:async )?openProtectedRoot \([^\n]*[\\/]src[\\/]broker[\\/]storage-protection\.mjs:982:/.test(
      stack
    );
  const result = Reflect.apply(originalOpen, this, args);
  if (retained)
    result.then(
      (handle) => {
        measurement.registerGuard(handle);
        const stat = handle.stat,
          close = handle.close;
        handle.stat = function (...values) {
          const checkStack = new Error().stack;
          const known =
            /\bat (?:async )?(?:openProtectedRoot|verify|readObserved) \([^\n]*[\\/]src[\\/]broker[\\/]storage-protection\.mjs:/.test(
              checkStack
            );
          const check = known ? measurement.beginGuardCheck(handle) : null;
          let promise;
          try {
            promise = Reflect.apply(stat, this, values);
          } catch (error) {
            if (check) measurement.completeGuardCheck(check, { success: false });
            throw error;
          }
          if (known)
            promise.then(
              () => measurement.completeGuardCheck(check, { success: true }),
              () => measurement.completeGuardCheck(check, { success: false })
            );
          return promise;
        };
        handle.close = function (...values) {
          measurement.closeGuard(handle);
          return Reflect.apply(close, this, values);
        };
      },
      () => {}
    );
  return result;
};
cp.execFile = traced;
syncBuiltinESMExports();
process.once('exit', () =>
  process.stderr.write(
    JSON.stringify({ diagnostic: 'windows-probe-measurement', ...measurement.report() }) + '\n'
  )
);
