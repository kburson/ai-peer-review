// @story #202
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  lstatSync,
  realpathSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
} from 'node:fs';
import { platformSecurity } from '../broker/platform.mjs';
import { snapshotReviewHistory, historyUnavailable as refuse } from './review-history-snapshot.mjs';
import { reviewHistoryAncestry } from './review-history-ancestry.mjs';
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
  if (directory && process.platform === 'win32') {
    const h = platformSecurity().openPrivateDirectory(file);
    try {
      if (!h.verify()) refuse('History directory ownership changed.');
    } finally {
      h.close();
    }
  }
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
function readPrivate(file) {
  const directory = path.dirname(file);
  if (!ordinary(directory, true)) return null;
  if (!ordinary(file, false)) return null;
  if (process.platform !== 'win32') return readFileSync(file);
  const h = platformSecurity().openPrivateDirectory(directory);
  try {
    const bytes = h.read(path.basename(file));
    if (!bytes || !h.verify()) refuse('History file ownership changed.');
    return bytes;
  } finally {
    h.close();
  }
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
function readGeneration(commonDir, target, generation, verifySnapshot) {
  const p = paths(commonDir, target, generation);
  if (stat(p.directory)) ordinary(p.parent, true);
  const bytes = readPrivate(p.file);
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
    ['broker', 'runtimes', 'codex-hooks', 'claude-hooks'].includes(relative.split(path.sep)[0])
  )
    refuse('History record crosses scratch authority.');
  let released = false;
  const releaseBytes = readPrivate(p.release);
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
  return Object.freeze({ record, released, recordDigest: digest(bytes) });
}
export function readReviewPreservation(commonDir, target, { verifySnapshot = false } = {}) {
  const p = paths(commonDir, target);
  if (!stat(p.directory)) return null;
  ordinary(p.parent, true);
  ordinary(p.directory, true);
  const prefix = digest(target);
  const related = readdirSync(p.directory).filter((name) => name.startsWith(prefix));
  let last = null;
  let files = 0;
  for (let generation = 1; generation <= 128; generation++) {
    const next = readGeneration(commonDir, target, generation, false);
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
  return last ? readGeneration(commonDir, target, last.record.generation, verifySnapshot) : null;
}

// One lookup protects effects, inventory, and restoration, including enclosing containers.
export function findReviewPreservation(commonDir, target, options = {}) {
  let current = path.resolve(target),
    found = null;
  for (let depth = 0; depth < 128; depth++) {
    const value = readReviewPreservation(commonDir, current, options);
    if (value && !value.released) found ??= value;
    const parent = path.dirname(current);
    if (parent === current) return found;
    current = parent;
  }
  refuse('Review preservation ancestry exceeds its bound.');
}
function createPrivate(file, bytes) {
  const parent = path.dirname(file);
  mkdirSync(parent, { recursive: true, mode: 0o700 });
  ordinary(path.dirname(parent), true);
  ordinary(parent, true);
  if (process.platform !== 'win32') writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 });
  else {
    const h = platformSecurity().openPrivateDirectory(parent);
    try {
      if (!h.verify()) refuse('History ownership changed.');
      h.create(path.basename(file), bytes);
      if (!h.verify()) refuse('History ownership changed.');
    } finally {
      h.close();
    }
  }
  if (!readPrivate(file)?.equals(Buffer.from(bytes))) refuse('History record read-back disagrees.');
}
export function preserveReviewHistory({
  commonDir,
  worktreeRoot,
  target,
  kind,
  reason,
  dryRun = false,
}) {
  if (
    !['history', 'hold'].includes(kind) ||
    typeof reason !== 'string' ||
    !reason.trim() ||
    reason.length > 2048 ||
    /[\r\n\0]/.test(reason)
  )
    refuse('Explicit preservation kind and single-line reason are required.');
  const existing = readReviewPreservation(commonDir, target, { verifySnapshot: true });
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
    createPrivate(paths(commonDir, target, record.generation).file, stable(record));
    readReviewPreservation(commonDir, target, { verifySnapshot: true });
  }
  return Object.freeze(record);
}
export function releaseReviewHold(commonDir, target, { dryRun = false } = {}) {
  const before = readReviewPreservation(commonDir, target, { verifySnapshot: true });
  if (!before || before.record.kind !== 'hold')
    refuse('Only an explicit current-review hold can be released.');
  if (!before.released && !dryRun)
    createPrivate(
      paths(commonDir, target, before.record.generation).release,
      stable({
        schema: 'ai-peer-review.review-hold-release/v1',
        target,
        record_digest: before.recordDigest,
        released_at: new Date().toISOString(),
      })
    );
  return Object.freeze({ target, released: !dryRun || before.released });
}
export function assertReviewNotPreserved(commonDir, target) {
  const value = findReviewPreservation(commonDir, target);
  if (value)
    refuse(
      value.record.kind === 'history'
        ? 'Historical review evidence cannot execute.'
        : 'Current review is held for primary migration.',
      { target, preservedTarget: value.record.target }
    );
}
