// @story #202
import path from 'node:path';
import { createHash } from 'node:crypto';
import { lstatSync, realpathSync, readFileSync, readdirSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import {
  observeStorageProtection,
  openProtectedRoot,
  provisionProtectedRoot,
} from '../broker/storage-protection.mjs';
const retainedHistoryGuards = new Set();
function historyContext(options = {}) {
  const context = {
    signal: options.signal ?? new AbortController().signal,
    deadline: options.deadline ?? performance.now() + 30000,
  };
  if (
    !(context.signal instanceof AbortSignal) ||
    !Number.isFinite(context.deadline) ||
    context.deadline - performance.now() > 30000 ||
    context.signal.aborted ||
    performance.now() >= context.deadline
  )
    refuse('History operation requires its live original bounded context.');
  return context;
}
async function closeHistoryGuard(guard, original) {
  try {
    await guard.close();
    retainedHistoryGuards.delete(guard);
  } catch (cleanup) {
    retainedHistoryGuards.add(guard);
    if (original) {
      original.cause = cleanup;
      throw original;
    }
    throw cleanup;
  }
}
export async function retryHistoryStorageCleanup() {
  for (const guard of retainedHistoryGuards) await closeHistoryGuard(guard);
}
async function withHistoryGuard(directory, context, operation) {
  historyContext(context);
  await retryHistoryStorageCleanup();
  historyContext(context);
  const receipt = await observeStorageProtection({ root: directory, ...context });
  if (!receipt.verified) refuse('History storage is not account-private.', { directory });
  const guard = await openProtectedRoot({ receipt, ...context });
  let original;
  try {
    return await operation(guard);
  } catch (error) {
    original = error;
    throw error;
  } finally {
    await closeHistoryGuard(guard, original);
  }
}
import { snapshotReviewHistory, historyUnavailable as refuse } from './review-history-snapshot.mjs';
import {
  reviewHistoryAncestry,
  isHistoryRegistrationRelative,
} from './review-history-ancestry.mjs';
export { snapshotReviewHistory } from './review-history-snapshot.mjs';
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const stable = (value) => JSON.stringify(value) + '\n';
const fields = [
  'schema',
  'common_dir',
  'worktree_root',
  'target',
  'kind',
  'reason',
  'created_at',
  'snapshot',
  'generation',
  'ancestry_digest',
];
function stat(file) {
  try {
    return lstatSync(file);
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}
function ordinary(file, directory) {
  const s = stat(file);
  if (!s) return null;
  if (
    s.isSymbolicLink() ||
    (directory ? !s.isDirectory() : !s.isFile()) ||
    (!directory && s.size > 16384) ||
    realpathSync(file) !== file
  )
    refuse('History storage is not a bounded ordinary path.', { file });
  if (process.platform !== 'win32' && (s.uid !== process.getuid() || s.mode & 0o077))
    refuse('History storage is not account-private.', { file });
  return s;
}
function paths(commonDir, target, generation = 1) {
  if (
    !path.isAbsolute(commonDir) ||
    realpathSync(commonDir) !== commonDir ||
    !path.isAbsolute(target) ||
    path.normalize(target) !== target
  )
    refuse('History locations must be canonical absolute paths.');
  const parent = path.join(commonDir, 'ai-peer-review');
  const directory = path.join(parent, 'review-history');
  const file = path.join(
    directory,
    digest(target) + (generation === 1 ? '' : '.' + generation) + '.json'
  );
  return { parent, directory, file, release: file + '.released' };
}
async function readPrivate(file, context) {
  const directory = path.dirname(file);
  if (!ordinary(directory, true)) return null;
  if (!ordinary(file, false)) return null;
  return withHistoryGuard(directory, context, async (guard) => {
    const snapshot = await guard.readSnapshot(path.basename(file), 16384);
    await guard.verify();
    historyContext(context);
    return snapshot.bytes;
  });
}

function closed(value, keys) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join('|') !== [...keys].sort().join('|')
  )
    refuse('History record has an unknown or incomplete schema.');
}
function time(value) {
  return (
    typeof value === 'string' &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}
async function readGeneration(commonDir, target, generation, verifySnapshot, context) {
  const p = paths(commonDir, target, generation);
  if (stat(p.directory)) ordinary(p.parent, true);
  const bytes = await readPrivate(p.file, context);
  if (!bytes) return null;
  let record;
  try {
    record = JSON.parse(bytes);
  } catch {
    refuse('History record cannot be read.');
  }
  closed(record, fields);
  closed(record.snapshot, ['digest', 'files', 'bytes']);
  if (
    record.schema !== 'ai-peer-review.review-preservation/v1' ||
    record.common_dir !== commonDir ||
    record.generation !== generation ||
    !/^[a-f0-9]{64}$/.test(record.ancestry_digest) ||
    record.target !== target ||
    !['history', 'hold'].includes(record.kind) ||
    typeof record.worktree_root !== 'string' ||
    !path.isAbsolute(record.worktree_root) ||
    path.normalize(record.worktree_root) !== record.worktree_root ||
    typeof record.reason !== 'string' ||
    !record.reason.trim() ||
    record.reason.length > 2048 ||
    /[\r\n\0]/.test(record.reason) ||
    !time(record.created_at) ||
    !/^[a-f0-9]{64}$/.test(record.snapshot.digest) ||
    !Number.isSafeInteger(record.snapshot.files) ||
    record.snapshot.files < 1 ||
    record.snapshot.files > 32768 ||
    !Number.isSafeInteger(record.snapshot.bytes) ||
    record.snapshot.bytes < 0 ||
    record.snapshot.bytes > 512 * 1024 * 1024
  )
    refuse('History record is malformed or belongs to another clone.');
  const relative = path.relative(path.join(record.worktree_root, '.scratch/peer-review'), target);
  if (
    !relative ||
    relative.startsWith('..' + path.sep) ||
    relative === '..' ||
    path.isAbsolute(relative) ||
    (['broker', 'runtimes', 'codex-hooks', 'claude-hooks'].includes(relative.split(path.sep)[0]) &&
      !(record.kind === 'history' && isHistoryRegistrationRelative(relative)))
  )
    refuse('History record crosses scratch authority.');
  let released = false;
  const releaseBytes = await readPrivate(p.release, context);
  if (releaseBytes) {
    let release;
    try {
      release = JSON.parse(releaseBytes);
    } catch {
      refuse('History release record cannot be read.');
    }
    closed(release, ['schema', 'target', 'record_digest', 'released_at']);
    if (
      record.kind !== 'hold' ||
      release.schema !== 'ai-peer-review.review-hold-release/v1' ||
      release.target !== target ||
      release.record_digest !== digest(bytes) ||
      !time(release.released_at)
    )
      refuse('History release contradicts its original hold.');
    released = true;
  }
  if (verifySnapshot && !released) {
    if (
      reviewHistoryAncestry(commonDir, record.worktree_root, target) !== record.ancestry_digest ||
      stable(snapshotReviewHistory(target)) !== stable(record.snapshot) ||
      reviewHistoryAncestry(commonDir, record.worktree_root, target) !== record.ancestry_digest
    )
      refuse('Preserved historical or held bytes or parents changed.', { target });
  }
  historyContext(context);
  return Object.freeze({ record, released, recordDigest: digest(bytes) });
}
export async function readReviewPreservation(commonDir, target, options = {}) {
  const context = historyContext(options);
  const { verifySnapshot = false } = options;
  const p = paths(commonDir, target);
  if (!stat(p.directory)) return null;
  ordinary(p.parent, true);
  ordinary(p.directory, true);
  const prefix = digest(target);
  const related = readdirSync(p.directory).filter((name) => name.startsWith(prefix));
  let last = null;
  let files = 0;
  for (let generation = 1; generation <= 128; generation++) {
    const next = await readGeneration(commonDir, target, generation, verifySnapshot, context);
    if (!next) break;
    if (
      last &&
      (!last.released ||
        last.record.kind !== 'hold' ||
        next.record.kind !== 'hold' ||
        last.record.worktree_root !== next.record.worktree_root)
    )
      refuse('History generations contradict their prior hold.');
    files += next.released ? 2 : 1;
    last = next;
  }
  if (related.length !== files) refuse('History generations contain gaps or unknown evidence.');
  historyContext(context);
  return last;
}

// One lookup protects effects, inventory, and restoration, including enclosing containers.
export async function findReviewPreservation(commonDir, target, options = {}) {
  const context = historyContext(options);
  let current = path.resolve(target),
    found = null;
  for (let depth = 0; depth < 128; depth++) {
    const value = await readReviewPreservation(commonDir, current, { ...options, ...context });
    if (value && !value.released) found ??= value;
    const parent = path.dirname(current);
    if (parent === current) return found;
    current = parent;
  }
  refuse('Review preservation ancestry exceeds its bound.');
}
async function createPrivate(file, bytes, context) {
  const parent = path.dirname(file);
  for (const directory of [path.dirname(parent), parent]) {
    if (!stat(directory)) await provisionProtectedRoot({ root: directory, ...context });
    ordinary(directory, true);
  }
  await withHistoryGuard(parent, context, async (guard) => {
    await guard.writeExclusive(path.basename(file), Buffer.from(bytes));
    await guard.verify();
  });
  if (!(await readPrivate(file, context))?.equals(Buffer.from(bytes)))
    refuse('History record read-back disagrees.');
}

export async function preserveReviewHistory({
  commonDir,
  worktreeRoot,
  target,
  kind,
  reason,
  dryRun = false,
  signal,
  deadline,
}) {
  const context = historyContext({ signal, deadline });
  if (
    !['history', 'hold'].includes(kind) ||
    typeof reason !== 'string' ||
    !reason.trim() ||
    reason.length > 2048 ||
    /[\r\n\0]/.test(reason)
  )
    refuse('Explicit preservation kind and single-line reason are required.');
  const existing = await readReviewPreservation(commonDir, target, {
    verifySnapshot: true,
    ...context,
  });
  if (existing) {
    if (existing.record.kind !== kind || existing.record.worktree_root !== worktreeRoot)
      refuse('Existing preservation cannot be reclassified.');
    if (!existing.released) return existing.record;
  }
  const ancestryDigest = reviewHistoryAncestry(commonDir, worktreeRoot, target);
  const snapshot = snapshotReviewHistory(target);
  const record = {
    schema: 'ai-peer-review.review-preservation/v1',
    common_dir: commonDir,
    worktree_root: worktreeRoot,
    target,
    kind,
    reason,
    created_at: new Date().toISOString(),
    snapshot,
    generation: existing ? existing.record.generation + 1 : 1,
    ancestry_digest: ancestryDigest,
  };
  if (record.generation > 128) refuse('Hold generation bound exceeded.');
  if (!dryRun) {
    if (
      reviewHistoryAncestry(commonDir, worktreeRoot, target) !== ancestryDigest ||
      stable(snapshotReviewHistory(target)) !== stable(snapshot)
    )
      refuse('History changed before preservation write.');
    await createPrivate(paths(commonDir, target, record.generation).file, stable(record), context);
    await readReviewPreservation(commonDir, target, { verifySnapshot: true, ...context });
  }
  historyContext(context);
  return Object.freeze(record);
}
export async function releaseReviewHold(commonDir, target, options = {}) {
  const context = historyContext(options);
  const { dryRun = false } = options;
  const before = await readReviewPreservation(commonDir, target, {
    verifySnapshot: true,
    ...context,
  });
  if (!before || before.record.kind !== 'hold')
    refuse('Only an explicit current-review hold can be released.');
  if (!before.released && !dryRun)
    await createPrivate(
      paths(commonDir, target, before.record.generation).release,
      stable({
        schema: 'ai-peer-review.review-hold-release/v1',
        target,
        record_digest: before.recordDigest,
        released_at: new Date().toISOString(),
      }),
      context
    );
  historyContext(context);
  return Object.freeze({ target, released: !dryRun || before.released });
}
export async function assertReviewNotPreserved(commonDir, target, options = {}) {
  const value = await findReviewPreservation(commonDir, target, options);
  if (value)
    refuse(
      value.record.kind === 'history'
        ? 'Historical review evidence cannot execute.'
        : 'Current review is held for primary migration.',
      { target, preservedTarget: value.record.target }
    );
}

const exclusions = new WeakMap();
function catalogGeneration(commonDir) {
  const parent = path.join(commonDir, 'ai-peer-review');
  const directory = path.join(parent, 'review-history');
  const entries = [commonDir, parent, directory];
  if (stat(directory)) {
    ordinary(parent, true);
    ordinary(directory, true);
    const names = readdirSync(directory).sort();
    if (names.length > 32768) refuse('History catalog exceeds its entry bound.');
    for (const name of names) entries.push(path.join(directory, name));
  }
  return stable(
    entries.map((file) => {
      let s;
      try {
        s = lstatSync(file, { bigint: true });
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      return [
        file,
        s ? [s.dev, s.ino, s.uid, s.mode, s.size, s.mtimeNs, s.ctimeNs].map(String) : null,
      ];
    })
  );
}
// Integrity adjunct for the awaited fixed reader, never an admission capability.
export async function observeReviewHistoryExclusion(commonDir, target, options = {}) {
  const context = historyContext(options);
  const generation = catalogGeneration(commonDir);
  await assertReviewNotPreserved(commonDir, target, context);
  if (catalogGeneration(commonDir) !== generation) refuse('History changed during observation.');
  const observation = Object.freeze({ verified: false });
  exclusions.set(observation, { commonDir, generation, context });
  return observation;
}
export function assertReviewHistoryExclusionUnchanged(observation) {
  const original = exclusions.get(observation);
  if (!original) refuse('History observation was not issued by the fixed reader.');
  historyContext(original.context);
  if (catalogGeneration(original.commonDir) !== original.generation)
    refuse('History changed after protected observation.');
}

// Exact registration bytes can remain history after a worktree was relocated.
export function createReviewPreservationLookup(commonDir, registrationRoot) {
  const registration = async (file, options = {}) => {
    const value = await readReviewPreservation(commonDir, file, {
      verifySnapshot: true,
      ...options,
    });
    return Boolean(value && value.record.kind === 'history' && !value.released);
  };
  const workspace = async (target, options = {}) => {
    const context = historyContext(options);
    if (await findReviewPreservation(commonDir, target, { verifySnapshot: true, ...context }))
      return true;
    const file = path.join(registrationRoot, path.basename(target) + '.json');
    if (!(await registration(file, context))) return false;
    return JSON.parse(readFileSync(file, 'utf8')).workspace === target;
  };
  return Object.freeze({ workspace, registration });
}
