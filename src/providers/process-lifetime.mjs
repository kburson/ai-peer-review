// cspell:words taskkill
import { execFileSync, spawn } from 'node:child_process';
import { AprError } from '../errors.mjs';

function expired() {
  return new AprError('APR_WAKE_OUTCOME_UNKNOWN', 'The bounded provider execution window ended.', {
    recovery: 'Preserve the operation and reconcile its outcome without retrying the provider.',
  });
}

// An inherited deadline can only shorten execution. It supplies no identity or
// acknowledgment evidence, and every later launch uses the same absolute value.
export function remainingProviderTime(env = process.env, maximum = 30_000) {
  const value = env.APR_PROVIDER_DEADLINE_MS;
  if (value === undefined) return maximum;
  const deadline = Number(value);
  const remaining = deadline - Date.now();
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(deadline) || remaining <= 0) throw expired();
  return Math.min(remaining, maximum);
}

export function spawnProviderProcess(file, args, options = {}, spawnProcess = spawn) {
  const env = options.env ?? process.env;
  const bounded = env.APR_PROVIDER_DEADLINE_MS !== undefined;
  const remaining = remainingProviderTime(env, 2 ** 31 - 1);
  const child = spawnProcess(file, args, {
    ...options,
    env,
    ...(bounded && process.platform !== 'win32' ? { detached: true } : {}),
  });
  let failure;
  let stopped = false;
  let didClose = false;
  let timer;
  const closed = new Promise((resolve) => {
    child.once('error', (error) => {
      failure ??= error;
    });
    child.once('close', (code) => {
      didClose = true;
      clearTimeout(timer);
      resolve(code);
    });
  });
  const stop = () => {
    if (stopped || didClose || !child.pid) return;
    stopped = true;
    if (bounded && process.platform === 'win32') {
      try {
        execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
          windowsHide: true,
          stdio: 'ignore',
          timeout: 2000,
        });
      } catch {
        child.kill('SIGKILL');
      }
    } else if (bounded) {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch (error) {
        if (error.code !== 'ESRCH') child.kill('SIGKILL');
      }
    } else child.kill('SIGKILL');
  };
  if (bounded)
    timer = setTimeout(() => {
      failure = expired();
      stop();
    }, remaining);
  return Object.freeze({
    child,
    async wait() {
      const code = await closed;
      if (failure) throw failure;
      return code;
    },
    async stop() {
      stop();
      await closed;
    },
  });
}
