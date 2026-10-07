// @story #175
// cspell:words hardlink readback
import assert from 'node:assert/strict';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtemp, realpath, rm, open } from 'node:fs/promises';
import * as storage from '../../../src/broker/storage-protection.mjs';
export async function owned(t, options = {}) {
  const base = await realpath(await mkdtemp(path.join(tmpdir(), 'apr-owner-publication-175-')));
  t.after(() => rm(base, { recursive: true, force: true }));
  const root = path.join(base, 'private');
  const controller = new AbortController();
  const signal = controller.signal;
  const deadline =
    options.deadline ?? performance.now() + (process.platform === 'win32' ? 180000 : 30000);
  const context = { signal, deadline, ...(options.clock ? { clock: options.clock } : {}) };
  const receipt = await storage.provisionProtectedRoot({ root, ...context });
  const guard = await storage.openProtectedRoot({ receipt, ...context });
  t.after(() => guard.close());
  return { root, guard, context, controller };
}

export async function interceptFilesystem(t, name, effect) {
  const fs = (await import('node:fs/promises')).default;
  const { syncBuiltinESMExports } = await import('node:module');
  const original = fs[name];
  const mocked = t.mock.method(fs, name, (...args) => effect(original, ...args));
  syncBuiltinESMExports();
  t.after(() => {
    mocked.mock.restore();
    syncBuiltinESMExports();
  });
}

export const reasonIs = (reason) => (error) => {
  assert.equal(error.code, 'APR_BROKER_STALE');
  assert.equal(error.details.reason, reason);
  return true;
};

export async function failOneDirectoryFlush(t, root) {
  const probe = await open(path.join(root, 'probe'), 'wx', 0o600);
  const prototype = Object.getPrototypeOf(probe);
  await probe.close();
  const sync = prototype.sync;
  let failed = false;
  t.mock.method(prototype, 'sync', async function () {
    if (!failed && (await this.stat()).isDirectory()) {
      failed = true;
      throw Object.assign(new Error('durability unproved'), { code: 'EIO' });
    }
    return sync.call(this);
  });
}

export async function realCore(t, { afterCreate, afterReplace, beforeReplace } = {}) {
  const fixture = await owned(t);
  let handle;
  const store = {
    createExclusive: async (name, bytes) => {
      handle = await fixture.guard.createRetainedPublication(name, bytes);
      await afterCreate?.(fixture, handle);
      return handle;
    },
    read: () => handle.snapshot(),
    replace: async (expected, bytes) => {
      await beforeReplace?.();
      const result = await handle.publish(expected, bytes);
      await afterReplace?.(fixture, handle);
      return result;
    },
    unlink: (expected) => handle.withdraw(expected),
    close: () => handle.close(),
  };
  return {
    ...fixture,
    store,
    create: () =>
      storage.createHeldPrivatePublicationCore({
        store,
        name: 'fixture-owner',
        bytes: Buffer.from('old'),
        budget: fixture.context,
      }),
  };
}
