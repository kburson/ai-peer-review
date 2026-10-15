// @story #209
// Isolated test instrumentation: observe actual process exits, never replace results.
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
const original = childProcess.execFile;
const records = [];
let discarded = 0;
function observedExecFile(...args) {
  const name = typeof args[0] === 'string' ? path.basename(args[0]).toLowerCase() : '';
  const command = {
    'powershell.exe': 'powershell',
    'whoami.exe': 'whoami',
    git: 'git',
    'git.exe': 'git',
    node: 'node',
    'node.exe': 'node',
  }[name];
  const started = performance.now();
  const child = original.apply(this, args);
  if (command)
    child.once('exit', (status, signal) => {
      if (records.length === 128) {
        records.shift();
        discarded += 1;
      }
      records.push({
        command,
        started,
        elapsedMs: Math.max(0, Math.round(performance.now() - started)),
        status: Number.isInteger(status) && status >= 0 && status <= 255 ? status : null,
        signalled: signal !== null,
      });
    });
  return child;
}
// Preserve the native custom promisifier and every original function property.
Object.defineProperties(observedExecFile, Object.getOwnPropertyDescriptors(original));
childProcess.execFile = observedExecFile;
syncBuiltinESMExports();
export function stockCommandTimings(since) {
  return {
    verified: false,
    discarded,
    commands: records
      .filter((entry) => entry.started >= since)
      .map(({ started, ...entry }) => ({ ...entry, startMs: Math.round(started - since) })),
  };
}
