// @story #190
// Genuine C1 mechanics on owned roots; no installed admission authority.
import { mkdir } from 'node:fs/promises';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { performance } from 'node:perf_hooks';
import { userInfo } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { runtimeFixture } from './runtime-selection-fixture.mjs';
import { createSelectionReadScope } from '../../src/config/selection-read-scope.mjs';
import {
  provisionProtectedRoot,
  observeStorageProtection,
  openProtectedRoot,
  assertProtectedSnapshotUnchanged,
} from '../../src/broker/storage-protection.mjs';
const require = createRequire(import.meta.url);
export async function selectionReadScopePrototype(t) {
  const fixture = runtimeFixture(t),
    root = path.join(fixture.home, 'owned-store');
  const context = () => ({
    signal: new AbortController().signal,
    deadline: performance.now() + 30000,
  });
  const setup = context();
  await mkdir(fixture.home, { recursive: true });
  await provisionProtectedRoot({ root, ...setup });
  const acquire = async (original) =>
    openProtectedRoot({
      receipt: await observeStorageProtection({ root, ...original }),
      ...original,
    });
  const first = await acquire(setup);
  try {
    await first.writeExclusive('runtime-selection.json', Buffer.from('fixture-selection'));
  } finally {
    await first.close();
  }
  const fs = require('node:fs/promises'),
    originalOpen = fs.open,
    records = [];
  fs.open = function (...args) {
    const retained =
      args[0] === root &&
      /\bat openProtectedRoot \([^\n]*storage-protection\.mjs:/.test(new Error().stack);
    const opened = Reflect.apply(originalOpen, this, args);
    if (retained)
      opened.then(
        (handle) => {
          const record = { closed: false };
          records.push(record);
          const close = handle.close;
          handle.close = function (...values) {
            const closing = Reflect.apply(close, this, values);
            closing.then(
              () => {
                record.closed = handle.fd === -1;
              },
              () => {}
            );
            return closing;
          };
        },
        () => {}
      );
    return opened;
  };
  syncBuiltinESMExports();
  try {
    const tuple = {
      directory: root,
      home: fixture.home,
      uid: userInfo().uid,
      principal: String(userInfo().uid),
    };
    const result = { verified: false };
    for (const mode of ['unscoped', 'scoped']) {
      const original = context(),
        started = performance.now(),
        before = records.length;
      let snapshots = 0;
      const manager = createSelectionReadScope({
        finalize: (_context, _tuple, witness) => {
          assertProtectedSnapshotUnchanged(witness);
        },
      });
      const read = async (guard) => {
        const a = await guard.readSnapshot('runtime-selection.json');
        snapshots++;
        const b = await guard.readSnapshot('runtime-selection.json');
        snapshots++;
        assert.equal(a.bytes.equals(b.bytes), true);
        await guard.verify();
        if (mode === 'scoped') manager.noteWitness(original, b);
      };
      const run = async () => {
        for (let n = 0; n < 16; n++) {
          if (mode === 'scoped') await manager.use(original, tuple, acquire, read);
          else {
            const guard = await acquire(original);
            try {
              await read(guard);
            } finally {
              await guard.close();
            }
          }
        }
      };
      try {
        if (mode === 'scoped') await manager.run(original, run);
        else await run();
      } catch (error) {
        const handles = records.slice(before);
        process.stderr.write(
          JSON.stringify({
            diagnostic: 'selection-read-scope-prototype-refused',
            verified: false,
            mode,
            elapsedMs: Math.round(performance.now() - started),
            originalBudgetExceeded: performance.now() >= original.deadline,
            acquisitions: handles.length,
            snapshots,
            descriptorsClosed: handles.filter((record) => record.closed).length,
          }) + '\n'
        );
        throw error;
      }
      const handles = records.slice(before);
      result[mode] = {
        acquisitions: handles.length,
        snapshots,
        closed: handles.filter((record) => record.closed).length,
      };
    }
    return result;
  } finally {
    fs.open = originalOpen;
    syncBuiltinESMExports();
  }
}
