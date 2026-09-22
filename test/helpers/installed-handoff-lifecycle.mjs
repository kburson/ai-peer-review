import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync } from 'node:fs';
import path from 'node:path';

export function createInstalledHandoffScratch({ root, evidenceRoot }) {
  if (evidenceRoot !== undefined && !path.isAbsolute(evidenceRoot))
    throw Object.assign(new Error('Evidence parent must be absolute.'), {
      code: 'APR_LIVE_EVIDENCE_PATH_INVALID',
    });
  const privateRoot = evidenceRoot ?? path.join(root, '.scratch', 'test');
  mkdirSync(privateRoot, { recursive: true, mode: 0o700 });
  return mkdtempSync(path.join(privateRoot, 'installed-handoff-'));
}

// The broker owns provider deadline timers. It must outlive those timers rather
// than inherit a competing parent timer that can orphan detached providers.
export function spawnOwnedHandoffBroker(file, args, options) {
  const child = spawn(file, args, options);
  let failure;
  let closed = false;
  const completion = new Promise((resolve) => {
    child.once('error', (error) => {
      failure = error;
    });
    child.once('close', (code) => {
      closed = true;
      resolve(code);
    });
  });
  return {
    child,
    async wait() {
      const code = await completion;
      if (failure) throw failure;
      return code;
    },
    async stop() {
      if (!closed) child.kill('SIGKILL');
      await completion;
    },
  };
}

export async function cleanupHandoffBroker({ broker, settle, deadline, graceMs = 5_000 }) {
  const until = deadline + graceMs;
  let timer;
  let expired = false;
  const settlement = (async () => {
    while (!expired && Date.now() < until) {
      if (broker.child.exitCode !== null || broker.child.signalCode !== null) return false;
      try {
        // A successful callback confirms exact provider settlement (suspension),
        // or an empty broker accepting stop when no review was ever registered.
        await settle();
        await broker.stop();
        return true;
      } catch {
        // Launch settlement may still be in flight. Retry only cleanup commands;
        // retain the broker so its existing provider deadline timers can fire.
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(100, Math.max(0, until - Date.now())))
        );
      }
    }
    return false;
  })();
  const settled = await Promise.race([
    settlement,
    new Promise((resolve) => {
      timer = setTimeout(
        () => {
          expired = true;
          resolve(false);
        },
        Math.max(0, until - Date.now())
      );
    }),
  ]);
  expired = true;
  clearTimeout(timer);
  // If settlement was not confirmed, force only our captured broker after
  // the entire deadline plus grace. This fallback does NOT prove provider exit.
  await broker.stop();
  return { status: settled ? 'settled' : 'unproven' };
}
