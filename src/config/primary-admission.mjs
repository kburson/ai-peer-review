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
function refuse(message) {
  throw new AprError('APR_PRIMARY_AUTHORITY_UNAVAILABLE', message, {
    recovery:
      'Wait for the owning operation to finish. Inspect an orphaned admission fence before explicit recovery; never remove a live fence.',
  });
}
export async function withPrimaryAdmissionFence({ commonDir, dryRun = false }, operation) {
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
    return operation();
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
    if (error.code === 'EEXIST') refuse('Clone admission fence is already held.');
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
  try {
    if (process.platform === 'win32') {
      handle = platformSecurity().openPrivateDirectory(lock);
      if (!handle.verify()) refuse('Windows admission ownership cannot be proven.');
      handle.create('owner.json', bytes);
    } else writeFileSync(path.join(lock, 'owner.json'), bytes, { flag: 'wx', mode: 0o600 });
    return await operation();
  } finally {
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
  }
}
