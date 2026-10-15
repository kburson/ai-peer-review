// @story #209
// Isolated test observation only. Actual open/close results are never replaced.
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
const original = fs.promises.open;
const records = [];
let discarded = 0,
  observationFailures = 0;
function observedOpen(...args) {
  const result = original.apply(this, args);
  const entry = {
    path: typeof args[0] === 'string' ? path.resolve(args[0]) : null,
    pending: true,
    opened: false,
    closing: false,
    closed: false,
    closeFailures: 0,
  };
  if (records.length === 2048) {
    records.shift();
    discarded += 1;
  }
  records.push(entry);
  void result.then(
    (file) => {
      entry.pending = false;
      entry.opened = true;
      try {
        const close = file.close;
        file.close = function (...closeArgs) {
          entry.closing = true;
          let closing;
          try {
            closing = close.apply(this, closeArgs);
          } catch (error) {
            entry.closing = false;
            entry.closeFailures += 1;
            throw error;
          }
          void closing.then(
            () => {
              entry.closing = false;
              entry.closed = true;
            },
            () => {
              entry.closing = false;
              entry.closeFailures += 1;
            }
          );
          return closing;
        };
      } catch {
        observationFailures += 1;
      }
    },
    () => {
      entry.pending = false;
    }
  );
  return result;
}
Object.defineProperties(observedOpen, Object.getOwnPropertyDescriptors(original));
fs.promises.open = observedOpen;
syncBuiltinESMExports();
export function fixtureHandleDiagnostics(roots) {
  const selected = records.filter(
    (entry) =>
      entry.path !== null &&
      roots.some((root) => {
        const relative = path.relative(root, entry.path);
        return relative === '' || (!path.isAbsolute(relative) && !relative.startsWith('..'));
      })
  );
  return {
    verified: false,
    operationalAuthority: 'unavailable',
    coverage: 'observed-fs-promises-open-close-only',
    discarded,
    observationFailures,
    pending: selected.filter((entry) => entry.pending).length,
    opened: selected.filter((entry) => entry.opened).length,
    closing: selected.filter((entry) => entry.closing).length,
    unclosed: selected.filter((entry) => entry.opened && !entry.closed).length,
    closeFailures: selected.reduce((sum, entry) => sum + entry.closeFailures, 0),
  };
}
