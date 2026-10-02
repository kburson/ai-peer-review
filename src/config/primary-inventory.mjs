// @story #134
import path from 'node:path';
import { lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { AprError } from '../errors.mjs';
import { authorityGit, discoverAuthorityRepository } from '../git/repository.mjs';
import { inspectReviewAuthority } from '../protocol/service.mjs';
import { startupEvidence, readStartupJournal } from '../broker/registry.mjs';
const observations = new WeakSet();
const terminal = new Set([
  'accepted',
  'accepted-uncommitted',
  'accepted-over-objections',
  'accepted-over-objections-uncommitted',
  'abandoned',
  'superseded',
]);
function unavailable(message, details = {}) {
  throw new AprError('APR_PRIMARY_AUTHORITY_UNAVAILABLE', message, {
    recovery:
      'Inspect and settle unknown activity, or prove an owned suspension, before primary activation.',
    details,
  });
}
function metadata(file) {
  try {
    const stat = lstatSync(file);
    if (stat.isSymbolicLink()) unavailable('Review inventory contains a symbolic link.', { file });
    return stat;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
export function inspectPrimaryReviewInventory(commonDir, primaryRoot) {
  const records = authorityGit(primaryRoot, ['worktree', 'list', '--porcelain', '-z']);
  if (Buffer.byteLength(records) > 1024 * 1024)
    unavailable('Worktree inventory exceeds its bound.');
  const worktrees = records.split('\0\0').filter(Boolean);
  if (worktrees.length > 128) unavailable('Worktree inventory exceeds its bound.');
  const hash = createHash('sha256').update(records),
    reviews = [];
  let count = 0,
    total = 0;
  function boundTree(directory, depth = 0) {
    if (depth > 128) unavailable('Review inventory depth exceeds its bound.');
    const stat = metadata(directory);
    if (!stat?.isDirectory())
      unavailable('Review inventory path is not an ordinary directory.', { file: directory });
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (++count > 4096) unavailable('Review inventory file count exceeds its bound.');
      const file = path.join(directory, entry.name),
        info = metadata(file);
      if (info.isDirectory()) {
        boundTree(file, depth + 1);
        continue;
      }
      if (!info.isFile() || info.size > 16 * 1024 * 1024 || (total += info.size) > 64 * 1024 * 1024)
        unavailable('Review inventory bytes exceed their bound.', { file });
      hash.update(file).update(readFileSync(file));
    }
  }
  function inspect(workspace) {
    boundTree(workspace);
    if (!metadata(path.join(workspace, 'events.jsonl'))) {
      const journal = readStartupJournal(workspace);
      unavailable('Unknown or live startup reservation blocks activation.', {
        workspace,
        stage: journal?.stage ?? 'unknown',
      });
    }
    let state, evidence;
    try {
      state = inspectReviewAuthority(workspace).state;
      evidence = startupEvidence(workspace, state);
    } catch (error) {
      unavailable('Review authority cannot be verified.', { workspace, reason: error.message });
    }
    if (!terminal.has(state.protocol.state) && !evidence?.recovery.fenced)
      unavailable('A nonterminal review lacks a proven owned suspension.', {
        workspace,
        state: state.protocol.state,
      });
    if (
      !terminal.has(state.protocol.state) &&
      ['reserved', 'launch-pending', 'outcome-unknown'].includes(evidence?.journal.stage)
    )
      unavailable('Review launch outcome remains unknown.', { workspace });
    reviews.push(
      Object.freeze({
        workspace,
        state: state.protocol.state,
        suspended: Boolean(evidence?.recovery.fenced),
      })
    );
  }
  for (const record of worktrees) {
    const fields = record.split('\0');
    const value = fields.find((field) => field.startsWith('worktree '));
    if (!value || fields.includes('bare')) unavailable('Worktree inventory is malformed.');
    const root = value.slice(9);
    let location;
    try {
      location = discoverAuthorityRepository(realpathSync(root));
    } catch (error) {
      unavailable('A clone worktree cannot be inventoried.', { root, reason: error.message });
    }
    if (location.commonDir !== commonDir)
      unavailable('Worktree inventory crosses clone authority.', { root });
    const scratch = path.join(root, '.scratch', 'peer-review');
    if (!metadata(scratch)) continue;
    if (!metadata(scratch).isDirectory())
      unavailable('Review scratch is not a directory.', { file: scratch });
    for (const entry of readdirSync(scratch, { withFileTypes: true })) {
      const file = path.join(scratch, entry.name),
        stat = metadata(file);
      if (!stat.isDirectory())
        unavailable('Unknown review scratch entry blocks activation.', { file });
      if (['broker', 'runtimes'].includes(entry.name)) {
        boundTree(file);
        if (entry.name === 'broker') {
          const registrationRoot = path.join(file, 'registrations');
          if (metadata(registrationRoot))
            for (const name of readdirSync(registrationRoot)) {
              const registrationFile = path.join(registrationRoot, name);
              let registration;
              try {
                registration = JSON.parse(readFileSync(registrationFile, 'utf8'));
              } catch {
                unavailable('Broker registration cannot be inspected.', { file: registrationFile });
              }
              const keys = [
                'created_at',
                'project_digest',
                'project_root',
                'request_digest',
                'review_id',
                'runtime',
                'schema',
                'workspace',
              ];
              if (
                !registration ||
                JSON.stringify(Object.keys(registration).sort()) !== JSON.stringify(keys) ||
                registration.schema !== 'ai-peer-review.broker-registration/v1' ||
                registration.project_root !== root ||
                name !== registration.review_id + '.json' ||
                typeof registration.workspace !== 'string' ||
                !registration.workspace.startsWith(scratch + path.sep)
              )
                unavailable('Unknown or orphan broker registration blocks activation.', {
                  file: registrationFile,
                });
              const workspace = registration.workspace;
              if (!metadata(workspace))
                unavailable('Broker registration refers to missing review activity.', {
                  file: registrationFile,
                });
              const journal = readStartupJournal(workspace);
              if (
                !journal ||
                journal.review_id !== registration.review_id ||
                journal.request_digest !== registration.request_digest
              )
                unavailable('Broker registration contradicts review authority.', {
                  file: registrationFile,
                });
            }
        }
        continue;
      }
      if (entry.name === 'reviews') {
        for (const child of readdirSync(file)) inspect(path.join(file, child));
      } else inspect(file);
    }
  }
  const result = Object.freeze({
    commonDir,
    primaryRoot,
    digest: hash.digest('hex'),
    reviews: Object.freeze(reviews),
  });
  observations.add(result);
  return result;
}
export function assertPrimaryInventoryObservation(value, commonDir, primaryRoot) {
  if (
    !observations.has(value) ||
    value.commonDir !== commonDir ||
    value.primaryRoot !== primaryRoot
  )
    unavailable('Caller-provided inventory is not an authenticated observation.');
  const fresh = inspectPrimaryReviewInventory(commonDir, primaryRoot);
  if (fresh.digest !== value.digest) unavailable('Review inventory changed before activation.');
  return fresh;
}
