// @story #175
// cspell:words hardlink readback
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
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

export async function failOneMutationFlush(t, root) {
  const probe = await open(path.join(root, 'probe'), 'wx', 0o600);
  const prototype = Object.getPrototypeOf(probe);
  await probe.close();
  const sync = prototype.sync;
  let failed = false,
    mutated = false;
  for (const effect of ['rename', 'unlink']) {
    await interceptFilesystem(t, effect, async (actual, ...args) => {
      const result = await actual(...args);
      if (effect === 'rename' || path.basename(args[0]) === 'fixture-owner') mutated = true;
      return result;
    });
  }
  if (process.platform === 'win32')
    await observePublicationReplacement(t, {
      after: () => {
        mutated = true;
      },
    });
  t.mock.method(prototype, 'sync', async function () {
    const stat = await this.stat();
    if (mutated && !failed && (process.platform === 'win32' ? stat.isFile() : stat.isDirectory())) {
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

export function alterWindowsRootProtection(root) {
  const script = String.raw`
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$env:PSModulePath='C:\Windows\System32\WindowsPowerShell\v1.0\Modules'
$p=[Console]::In.ReadToEnd()|ConvertFrom-Json
$a=Get-Acl -LiteralPath $p.path -ErrorAction Stop
$a.SetAccessRuleProtection($false, $true)
Set-Acl -LiteralPath $p.path -AclObject $a -ErrorAction Stop
`;
  execFileSync(
    'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-EncodedCommand',
      Buffer.from(script, 'utf16le').toString('base64'),
    ],
    {
      input: JSON.stringify({ path: root }),
      encoding: 'utf8',
      timeout: 15000,
      env: {
        ...process.env,
        PSModulePath: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules',
      },
    }
  );
}

export async function observePublicationReplacement(t, { before, after } = {}) {
  if (process.platform !== 'win32') {
    return interceptFilesystem(t, 'rename', async (actual, from, to) => {
      await before?.(from, to);
      const result = await actual(from, to);
      await after?.(from, to);
      return result;
    });
  }
  const cp = (await import('node:child_process')).default;
  const { syncBuiltinESMExports } = await import('node:module');
  const original = cp.execFile;
  const mocked = t.mock.method(cp, 'execFile', (executable, args, options, callback) => {
    const encoded = args?.at(-1);
    const script =
      typeof encoded === 'string' ? Buffer.from(encoded, 'base64').toString('utf16le') : '';
    if (!script.includes('apr.windows-owner-replacement/v1'))
      return original(executable, args, options, callback);
    let payload,
      settled = false;
    const finish = async (error, stdout, stderr) => {
      if (settled) return;
      settled = true;
      try {
        if (!error) await after?.(payload.source, payload.target);
      } catch (caught) {
        error = caught;
      }
      callback(error, stdout, stderr);
    };
    const child = original(executable, args, options, finish);
    const end = child.stdin.end;
    child.stdin.end = function (value, ...rest) {
      payload = JSON.parse(value);
      Promise.resolve()
        .then(() => before?.(payload.source, payload.target))
        .then(() => end.call(this, value, ...rest))
        .catch((error) => {
          child.kill();
          finish(error, '', '');
        });
      return this;
    };
    return child;
  });
  syncBuiltinESMExports();
  t.after(() => {
    mocked.mock.restore();
    syncBuiltinESMExports();
  });
}
