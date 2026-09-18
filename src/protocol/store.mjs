import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { AprError } from '../errors.mjs';
import { observeProcessIdentity as defaultObserveProcessIdentity } from './process-identity.mjs';

function canonicalValue(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0)) return value;
  if (Array.isArray(value)) {
    if (ancestors.has(value)) throw new TypeError('cyclic value');
    const next = new Set(ancestors).add(value);
    return value.map((entry) => canonicalValue(entry, next));
  }
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    if (ancestors.has(value)) throw new TypeError('cyclic value');
    const next = new Set(ancestors).add(value);
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalValue(value[key], next)])
    );
  }
  throw new TypeError('unsupported value');
}

function canonicalJson(value) {
  try {
    return JSON.stringify(canonicalValue(value));
  } catch (cause) {
    const error = new AprError(
      'APR_STORE_VALUE_INVALID',
      'Value cannot be encoded as canonical JSON.',
      {
        recovery: 'Provide JSON-safe data with finite numbers, plain objects, and no cycles.',
      }
    );
    error.cause = cause;
    throw error;
  }
}

function syncDirectory(directory) {
  let descriptor;
  try {
    descriptor = openSync(directory, 'r');
    fsyncSync(descriptor);
  } catch (error) {
    const unsupported = new Set(['EINVAL', 'EISDIR', 'ENOTSUP', 'EOPNOTSUPP', 'EPERM']);
    if (!unsupported.has(error?.code)) throw error;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function digestBytes(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function reviewLockError(code, message, recovery, details = {}) {
  return new AprError(code, message, { recovery, details });
}

async function localOwnerIdentity() {
  if (process.platform === 'linux') {
    const observed = await defaultObserveProcessIdentity();
    if (observed.status === 'live') return observed;
  }
  const nowSeconds = Date.now() / 1000;
  return Object.freeze({
    status: 'live',
    host: os.hostname(),
    pid: process.pid,
    boot_id: `epoch:${Math.floor(nowSeconds - os.uptime())}`,
    process_start: `epoch:${Math.floor(nowSeconds - process.uptime())}`,
  });
}

function parseLock(bytes, lockFile) {
  let lock;
  try {
    lock = JSON.parse(bytes.toString('utf8'));
  } catch (cause) {
    const error = reviewLockError(
      'APR_REVIEW_LOCK_LIVENESS_UNKNOWN',
      'The existing review lock is malformed and its owner cannot be verified.',
      `Preserve ${lockFile} and use explicit digest-confirmed lock reclamation.`,
      { lockFile }
    );
    error.cause = cause;
    throw error;
  }
  if (
    !lock ||
    typeof lock !== 'object' ||
    !['ai-peer-review.lock/v1', 'ai-peer-review.lock/v2'].includes(lock.schema) ||
    !Number.isSafeInteger(lock.pid) ||
    lock.pid <= 0 ||
    typeof lock.token !== 'string' ||
    !lock.token
  ) {
    throw reviewLockError(
      'APR_REVIEW_LOCK_LIVENESS_UNKNOWN',
      'The existing review lock has unverifiable owner fields.',
      `Preserve ${lockFile} and use explicit digest-confirmed lock reclamation.`,
      { lockFile }
    );
  }
  return lock;
}

export async function inspectReviewLock({
  workspace,
  hostname = os.hostname(),
  observeProcessIdentity = defaultObserveProcessIdentity,
} = {}) {
  const lockFile = path.join(workspace, 'locks', 'review.lock');
  let bytes;
  try {
    bytes = readFileSync(lockFile);
  } catch (cause) {
    if (cause?.code === 'ENOENT') {
      return Object.freeze({ status: 'absent', lockFile, digest: null });
    }
    const error = reviewLockError(
      'APR_REVIEW_LOCK_LIVENESS_UNKNOWN',
      'The existing review lock could not be read.',
      `Preserve ${lockFile}, restore read access, and retry.`,
      { lockFile }
    );
    error.cause = cause;
    throw error;
  }
  const digest = digestBytes(bytes);
  const lock = parseLock(bytes, lockFile);
  const common = { lockFile, digest, bytes, lock: Object.freeze({ ...lock }) };
  if (lock.schema === 'ai-peer-review.lock/v2' && lock.host !== hostname) {
    return Object.freeze({ ...common, status: 'unknown', reason: 'foreign-host' });
  }
  let observed;
  try {
    observed = await observeProcessIdentity({ pid: lock.pid });
  } catch {
    return Object.freeze({ ...common, status: 'unknown', reason: 'probe-failed' });
  }
  if (observed?.status === 'dead') {
    return Object.freeze({ ...common, status: 'stale', reason: 'process-dead' });
  }
  if (observed?.status !== 'live') {
    return Object.freeze({
      ...common,
      status: 'unknown',
      reason: observed?.reason || 'identity-unavailable',
    });
  }
  if (lock.schema === 'ai-peer-review.lock/v1') {
    return Object.freeze({ ...common, status: 'live', reason: 'legacy-pid-live' });
  }
  if (observed.boot_id !== lock.boot_id) {
    return Object.freeze({ ...common, status: 'stale', reason: 'different-boot' });
  }
  if (observed.process_start !== lock.process_start) {
    return Object.freeze({ ...common, status: 'stale', reason: 'pid-reused' });
  }
  return Object.freeze({ ...common, status: 'live', reason: 'identity-match' });
}

function retainLock(inspection, { reason, now }) {
  const lockDirectory = path.dirname(inspection.lockFile);
  const staleDirectory = path.join(lockDirectory, 'stale');
  mkdirSync(staleDirectory, { recursive: true });
  const suffix = inspection.digest.slice('sha256:'.length);
  const retainedPath = path.join(staleDirectory, `review-lock-${suffix}-${randomUUID()}.json`);
  const current = readFileSync(inspection.lockFile);
  if (digestBytes(current) !== inspection.digest) {
    throw reviewLockError(
      'APR_REVIEW_LOCK_CHANGED',
      'The review lock changed before it could be retained.',
      'Inspect the current lock and retry with its exact digest.',
      { lockFile: inspection.lockFile }
    );
  }
  renameSync(inspection.lockFile, retainedPath);
  syncDirectory(staleDirectory);
  syncDirectory(lockDirectory);
  const receipt = Object.freeze({
    schema: 'ai-peer-review.lock-reclaim-receipt/v1',
    lock_digest: inspection.digest,
    retained_file: path.basename(retainedPath),
    reason,
    reclaimed_at: now,
  });
  const receiptPath = `${retainedPath}.receipt.json`;
  atomicWrite(receiptPath, `${canonicalJson(receipt)}\n`);
  return Object.freeze({
    ...receipt,
    retained_path: retainedPath,
    receipt_path: receiptPath,
  });
}

export async function reclaimReviewLock({
  workspace,
  lockDigest,
  reason,
  confirmReclaim,
  now = new Date().toISOString(),
} = {}) {
  if (confirmReclaim !== true) {
    throw reviewLockError(
      'APR_REVIEW_LOCK_RECLAIM_CONFIRMATION_REQUIRED',
      'Explicit review lock reclaim confirmation is required.',
      'Inspect the lock, verify its exact digest, and confirm reclamation explicitly.'
    );
  }
  const normalizedReason = typeof reason === 'string' ? reason.normalize('NFC').trim() : '';
  if (!normalizedReason || normalizedReason.length > 1000) {
    throw reviewLockError(
      'APR_REVIEW_LOCK_RECLAIM_INVALID',
      'A bounded reclamation reason is required.',
      'Provide a non-empty reason of at most 1,000 characters.'
    );
  }
  const inspection = await inspectReviewLock({ workspace });
  if (inspection.status === 'absent' || inspection.digest !== lockDigest) {
    throw reviewLockError(
      'APR_REVIEW_LOCK_CHANGED',
      'The review lock digest does not match the inspected lock.',
      'Inspect the current lock and retry with its exact digest.',
      { expected: lockDigest, actual: inspection.digest }
    );
  }
  return retainLock(inspection, { reason: normalizedReason, now: new Date(now).toISOString() });
}

export function atomicWrite(file, bytes) {
  const payload = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const directory = path.dirname(file);
  const temporary = path.join(directory, `.${path.basename(file)}.${randomUUID()}.tmp`);
  let descriptor;
  try {
    mkdirSync(directory, { recursive: true });
    descriptor = openSync(temporary, 'wx', 0o600);
    writeFileSync(descriptor, payload);
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporary, file);
    syncDirectory(directory);
  } catch (cause) {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        // Preserve the original write failure.
      }
    }
    try {
      if (existsSync(temporary)) unlinkSync(temporary);
    } catch {
      // Cleanup is best-effort and limited to this operation's random sibling.
    }
    const error = new AprError('APR_ATOMIC_WRITE_FAILED', `Atomic write failed: ${file}`, {
      recovery: 'Verify the destination is writable and retry the peer-review command.',
      details: { file },
    });
    error.cause = cause;
    throw error;
  }
}

export function atomicCreate(file, bytes) {
  const payload = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const directory = path.dirname(file);
  const temporary = path.join(directory, `.${path.basename(file)}.${randomUUID()}.tmp`);
  let descriptor;
  let linking = false;
  try {
    mkdirSync(directory, { recursive: true });
    descriptor = openSync(temporary, 'wx', 0o600);
    writeFileSync(descriptor, payload);
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    linking = true;
    linkSync(temporary, file);
    linking = false;
    unlinkSync(temporary);
    syncDirectory(directory);
  } catch (cause) {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        // Preserve the original failure.
      }
    }
    try {
      if (existsSync(temporary)) unlinkSync(temporary);
    } catch {
      // Cleanup is best-effort and limited to this operation's random sibling.
    }
    if (cause?.code === 'EEXIST' && linking) {
      const error = new AprError('APR_OUTPUT_COLLISION', `Output already exists: ${file}`, {
        recovery: `Preserve ${file}, inspect the collision, and choose explicit recovery.`,
        details: { file },
      });
      error.cause = cause;
      throw error;
    }
    const error = new AprError('APR_ATOMIC_WRITE_FAILED', `Atomic create failed: ${file}`, {
      recovery: 'Verify the destination is writable and retry the peer-review command.',
      details: { file },
    });
    error.cause = cause;
    throw error;
  }
}

export async function withReviewLock(workspace, operation, options = {}) {
  const lockDirectory = path.join(workspace, 'locks');
  const lockFile = path.join(lockDirectory, 'review.lock');
  const token = randomUUID();
  const ownerIdentity = options.ownerIdentity || (await localOwnerIdentity());
  const observeProcessIdentity = options.observeProcessIdentity || defaultObserveProcessIdentity;
  let descriptor;
  let created = false;
  for (let attempt = 0; attempt < 3 && !created; attempt += 1) {
    let attemptedOpen = false;
    try {
      mkdirSync(lockDirectory, { recursive: true });
      attemptedOpen = true;
      descriptor = openSync(lockFile, 'wx', 0o600);
      created = true;
      writeFileSync(
        descriptor,
        `${canonicalJson({ schema: 'ai-peer-review.lock/v2', token, pid: ownerIdentity.pid, host: ownerIdentity.host, boot_id: ownerIdentity.boot_id, process_start: ownerIdentity.process_start, acquired_at: new Date().toISOString() })}\n`
      );
      fsyncSync(descriptor);
      closeSync(descriptor);
      descriptor = undefined;
      syncDirectory(lockDirectory);
    } catch (cause) {
      if (descriptor !== undefined) {
        try {
          closeSync(descriptor);
        } catch {
          // Preserve the acquisition failure.
        }
        descriptor = undefined;
      }
      if (created) {
        try {
          unlinkSync(lockFile);
        } catch {
          // Cleanup is limited to the lock file this acquisition created.
        }
        created = false;
      }
      if (cause?.code !== 'EEXIST' || !attemptedOpen) {
        const error = reviewLockError(
          'APR_REVIEW_LOCK_FAILED',
          'The review lock could not be acquired.',
          'Verify the scratch workspace is writable and retry.',
          { lockFile }
        );
        error.cause = cause;
        throw error;
      }
      const inspection = await inspectReviewLock({
        workspace,
        hostname: ownerIdentity.host,
        observeProcessIdentity,
      });
      if (inspection.status === 'stale') {
        retainLock(inspection, {
          reason: `automatic-${inspection.reason}`,
          now: new Date().toISOString(),
        });
        continue;
      }
      if (inspection.status === 'live') {
        throw reviewLockError(
          'APR_REVIEW_LOCKED',
          'The review is locked by another live operation.',
          `Wait for the owner recorded in ${lockFile} to finish, then retry.`,
          { lockFile, lockDigest: inspection.digest }
        );
      }
      throw reviewLockError(
        'APR_REVIEW_LOCK_LIVENESS_UNKNOWN',
        'The review lock owner cannot be proven live or dead.',
        `Preserve ${lockFile}, inspect its owner, and use explicit digest-confirmed reclamation if authorized.`,
        { lockFile, lockDigest: inspection.digest, reason: inspection.reason }
      );
    }
  }
  if (!created) {
    throw reviewLockError(
      'APR_REVIEW_LOCK_FAILED',
      'The review lock could not be acquired after retaining stale owners.',
      'Inspect concurrent lock activity and retry.',
      { lockFile }
    );
  }

  try {
    return await operation(Object.freeze({ lockFile, token }));
  } finally {
    try {
      const owner = JSON.parse(readFileSync(lockFile, 'utf8'));
      if (owner?.token === token) unlinkSync(lockFile);
    } catch (cause) {
      if (cause?.code !== 'ENOENT') {
        // A missing, malformed, or foreign lock is preserved for explicit recovery.
      }
    }
  }
}

export async function appendEvent(file, event) {
  const workspace = path.dirname(file);
  return withReviewLock(workspace, async () => {
    const prior = existsSync(file) ? readFileSync(file) : Buffer.alloc(0);
    if (prior.length > 0 && prior.at(-1) !== 0x0a) {
      throw new AprError('APR_EVENT_LOG_CORRUPT', 'The event log ends with a torn record.', {
        recovery: 'Restore events.jsonl from its last complete newline-terminated record.',
        details: { file },
      });
    }
    return appendLockedEvents(file, prior, [event]);
  });
}

export function appendLockedEvents(file, priorBytes, events) {
  if (!Array.isArray(events) || events.length === 0) {
    throw new AprError('APR_STORE_VALUE_INVALID', 'A non-empty event batch is required.', {
      recovery: 'Provide one or more validated events for the locked append.',
      details: { file },
    });
  }
  const prior = Buffer.isBuffer(priorBytes) ? priorBytes : Buffer.from(priorBytes, 'utf8');
  if (prior.length > 0 && prior.at(-1) !== 0x0a) {
    throw new AprError('APR_EVENT_LOG_CORRUPT', 'The event log ends with a torn record.', {
      recovery: 'Restore events.jsonl from its last complete newline-terminated record.',
      details: { file },
    });
  }
  const records = Buffer.from(events.map((event) => `${canonicalJson(event)}\n`).join(''), 'utf8');
  atomicWrite(file, Buffer.concat([prior, records]));
  return Object.freeze({ file, bytes: records.length });
}
