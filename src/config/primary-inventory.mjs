// @story #134
import path from 'node:path';
import { lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { AprError } from '../errors.mjs';
import { discoverPrimaryAuthorityRepository as discoverAuthorityRepository } from './primary-authority.mjs';
import { initializePortableSystem } from '../broker/portable-system.mjs';
import { performance } from 'node:perf_hooks';
import { inspectReviewAuthority } from '../protocol/service.mjs';
import { verifyRuntimeImage } from '../broker/runtime-image.mjs';
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
export async function inspectPrimaryReviewInventory(commonDir, primaryRoot, options = {}) {
  const context = Object.freeze({
    signal: options.signal ?? new AbortController().signal,
    deadline: options.deadline ?? performance.now() + 30000,
  });
  const system = await initializePortableSystem(context);
  const records = await system.reviewWorktrees({ root: primaryRoot });
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
  function inspectHookStore(directory, provider) {
    boundTree(directory);
    const keys = [
      'command',
      'host',
      'model_id',
      'observed_at',
      'phase',
      'provider',
      'schema',
      'session_id',
      'source',
      'source_version',
      'tool_use_id',
      ...(provider === 'codex' ? ['turn_id'] : []),
    ].sort();
    for (const name of readdirSync(directory)) {
      const file = path.join(directory, name),
        stat = metadata(file);
      let record;
      try {
        if (
          !/^[a-f0-9]{32}\.json$/.test(name) ||
          !stat?.isFile() ||
          (process.platform !== 'win32' && (stat.uid !== process.getuid() || stat.mode & 0o077)) ||
          stat.size > 1024 * 1024
        )
          unavailable('Hook observation path is unsafe.', { file });
        record = JSON.parse(readFileSync(file, 'utf8'));
      } catch {
        unavailable('Hook observation cannot be inspected.', { file });
      }
      if (
        !record ||
        JSON.stringify(Object.keys(record).sort()) !== JSON.stringify(keys) ||
        Object.values(record).some(
          (value) => typeof value !== 'string' || !value || value.includes('\0')
        ) ||
        record.schema !== 'ai-peer-review.' + provider + '-hook/v1' ||
        record.source !== 'official-exact-session' ||
        record.phase !== 'tool-use' ||
        record.provider !== (provider === 'codex' ? 'openai' : 'anthropic') ||
        record.host !== (provider === 'codex' ? 'codex' : 'claude-code') ||
        !/^[A-Za-z0-9._:-]+$/.test(record.model_id) ||
        !Number.isFinite(Date.parse(record.observed_at)) ||
        (provider === 'claude' &&
          !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(record.session_id)) ||
        !/^(?:(?:npx )?(?:ai-)?peer-review|node (?:\.\/)?bin\/peer-review\.mjs) (?:start|join)(?:\s|$)/.test(
          record.command
        )
      )
        unavailable('Hook observation has an unknown or malformed record.', { file });
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
    const listedRoot = value.slice(9);
    let location;
    try {
      location = await discoverAuthorityRepository(realpathSync(listedRoot), context);
    } catch (error) {
      unavailable('A clone worktree cannot be inventoried.', {
        root: listedRoot,
        reason: error.message,
      });
    }
    const root = location.root;
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
      if (['codex-hooks', 'claude-hooks'].includes(entry.name)) {
        inspectHookStore(file, entry.name.split('-')[0]);
        continue;
      }
      if (entry.name === 'runtimes') {
        const names = readdirSync(file);
        if (names.length > 128) unavailable('Retained runtime image count exceeds its bound.');
        for (const name of names.sort()) {
          const image = path.join(file, name);
          if (!metadata(image)?.isDirectory() || !verifyRuntimeImage(image))
            unavailable('Retained runtime image cannot be verified.', { file: image });
          hash.update(image).update(readFileSync(path.join(image, 'runtime-image.json')));
        }
        continue;
      }
      if (entry.name === 'broker') {
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
  if ((await system.reviewWorktrees({ root: primaryRoot })) !== records)
    unavailable('Clone worktrees changed during inventory.');
  const result = Object.freeze({
    commonDir,
    primaryRoot,
    digest: hash.digest('hex'),
    reviews: Object.freeze(reviews),
  });
  observations.add(result);
  return result;
}
export async function assertPrimaryInventoryObservation(
  value,
  commonDir,
  primaryRoot,
  options = {}
) {
  if (
    !observations.has(value) ||
    value.commonDir !== commonDir ||
    value.primaryRoot !== primaryRoot
  )
    unavailable('Caller-provided inventory is not an authenticated observation.');
  const fresh = await inspectPrimaryReviewInventory(commonDir, primaryRoot, options);
  if (fresh.digest !== value.digest) unavailable('Review inventory changed before activation.');
  return fresh;
}
