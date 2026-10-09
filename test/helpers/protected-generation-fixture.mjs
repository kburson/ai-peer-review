// @story #187
// Disposable fixture mutation through genuine stock protection, never a capability override.
import path from 'node:path';
import { renameSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import {
  observeStorageProtection,
  openProtectedRoot,
} from '../../src/broker/storage-protection.mjs';
export async function replaceProtectedFixtureFile(location, bytes) {
  const context = { signal: new AbortController().signal, deadline: performance.now() + 30000 };
  const receipt = await observeStorageProtection({ root: path.dirname(location), ...context });
  const guard = await openProtectedRoot({ receipt, ...context });
  try {
    await guard.verify();
    renameSync(location, location + '.original');
    await guard.writeExclusive(path.basename(location), bytes);
    await guard.verify();
  } finally {
    await guard.close();
  }
}
