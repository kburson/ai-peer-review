// @story #134
// Clone-wide exclusion shared by maintenance and governed effect admission.
import path from 'node:path';
import {
  mkdirSync,
  lstatSync,
  realpathSync,
  writeFileSync,
  readFileSync,
  unlinkSync,
  rmdirSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { AprError } from '../errors.mjs';
import { platformSecurity } from '../broker/platform.mjs';
function refuse(message, details = {}) {
  throw new AprError('APR_PRIMARY_AUTHORITY_UNAVAILABLE', message, {
    details,
    recovery:
      'Wait for the owning operation to finish. Inspect an orphaned admission fence before explicit recovery; never remove a live fence.',
  });
}
function acquirePrimaryAdmissionFence({ commonDir, dryRun = false }) {
  if (realpathSync(commonDir) !== commonDir) refuse('Clone admission directory is not canonical.');
  const directory = path.join(commonDir, 'ai-peer-review'),
    lock = path.join(directory, 'admission.lock');
  if (dryRun) {
    try {
      lstatSync(lock);
      refuse('Clone admission fence is already held.');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    return () => {};
  }
  mkdirSync(directory, { mode: 0o700, recursive: true });
  const parent = lstatSync(directory);
  if (
    !parent.isDirectory() ||
    parent.isSymbolicLink() ||
    (process.platform !== 'win32' && (parent.mode & 0o077 || parent.uid !== process.getuid()))
  )
    refuse('Clone admission directory is not account-private.');
  try {
    mkdirSync(lock, { mode: 0o700 });
  } catch (error) {
    if (error.code === 'EEXIST') {
      let owner;
      try {
        owner = JSON.parse(readFileSync(path.join(lock, 'owner.json'), 'utf8'));
      } catch {}
      refuse('Clone admission fence is already held.', {
        reason: 'clone-admission-held',
        owner_pid: Number.isSafeInteger(owner?.pid) && owner.pid > 0 ? owner.pid : null,
      });
    }
    throw error;
  }
  const identity = lstatSync(lock),
    bytes =
      JSON.stringify({
        schema: 'ai-peer-review.primary-admission/v1',
        token: randomUUID(),
        pid: process.pid,
      }) + '\n';
  let handle;

  if (process.platform === 'win32') {
    handle = platformSecurity().openPrivateDirectory(lock);
    if (!handle.verify()) refuse('Windows admission ownership cannot be proven.');
    handle.create('owner.json', bytes);
  } else writeFileSync(path.join(lock, 'owner.json'), bytes, { flag: 'wx', mode: 0o600 });

  return () => {
    const observed = lstatSync(lock);
    if (observed.dev !== identity.dev || observed.ino !== identity.ino || observed.isSymbolicLink())
      refuse('Clone admission fence changed during the operation.');
    if (handle) {
      try {
        if (!handle.verify() || !handle.remove('owner.json', bytes))
          refuse('Windows admission fence changed.');
      } finally {
        handle.close();
      }
    } else {
      if (readFileSync(path.join(lock, 'owner.json'), 'utf8') !== bytes)
        refuse('Clone admission proof changed during the operation.');
      try {
        unlinkSync(path.join(lock, 'owner.json'));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
    rmdirSync(lock);
  };
}
export async function withPrimaryAdmissionFence(options, operation) {
  const release = acquirePrimaryAdmissionFence(options);
  try {
    return await operation();
  } finally {
    release();
  }
}
export function withPrimaryAdmissionFenceSync(options, operation) {
  const deadline = performance.now() + 5000;
  const pause = new Int32Array(new SharedArrayBuffer(4));
  let release;
  let observedForeignOwner = false;
  for (;;) {
    try {
      release = acquirePrimaryAdmissionFence(options);
      break;
    } catch (error) {
      const owner = error?.details?.owner_pid;
      const foreignOwner = Number.isSafeInteger(owner) && owner !== process.pid;
      if (
        error?.details?.reason !== 'clone-admission-held' ||
        owner === process.pid ||
        (!foreignOwner && !observedForeignOwner) ||
        performance.now() >= deadline
      )
        throw error;
      observedForeignOwner ||= foreignOwner;
      // A known foreign owner can unpublish its proof just before removing
      // the directory. Keep the original bounded wait through that release
      // window; initial unattributed locks still refuse immediately.
      // No clone lock is owned while waiting. Effects revalidate authority
      // inside the newly acquired fence, before invoking their callback.
      Atomics.wait(pause, 0, 0, Math.min(10, deadline - performance.now()));
    }
  }
  try {
    const result = operation();
    if (result && typeof result.then === 'function')
      refuse('A bounded synchronous effect cannot retain clone authority across a wait.');
    return result;
  } finally {
    release();
  }
}
