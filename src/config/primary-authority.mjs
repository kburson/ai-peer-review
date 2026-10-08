import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { initializePortableSystem } from '../broker/portable-system.mjs';
import { assertProtectedSnapshotUnchanged } from '../broker/storage-protection.mjs';
import { performance } from 'node:perf_hooks';
import { AprError } from '../errors.mjs';

import { validatePrimaryStore } from './load.mjs';

// cspell:ignore filemode

export const PRIMARY_CONFIG_PATH = '.ai-peer-review/config.json';
export const PRIMARY_SKILL_PATH = '.ai-peer-review/skills/peer-review/SKILL.md';
export const PRIMARY_ACTIVATION_SCHEMA = 'ai-peer-review.primary-activation/v1';

function unavailable(message, details = {}, cause) {
  const error = new AprError('APR_PRIMARY_AUTHORITY_UNAVAILABLE', message, {
    recovery:
      'Inspect the registered primary; commit clean owned files, then run primary-only activation after an active-review inventory.',
    details,
  });
  error.cause = cause;
  throw error;
}

function closed(value, keys, label) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !keys.includes(key)) ||
    keys.some((key) => !Object.hasOwn(value, key))
  )
    unavailable(`${label} has an unknown or incomplete schema.`);
}

export function primaryRegistrationPath(commonDir) {
  return path.join(commonDir, 'ai-peer-review', 'primary-activation.json');
}

export function validatePrimaryActivation(record) {
  closed(
    record,
    [
      'schema',
      'primary_root',
      'common_dir',
      'primary_initialized',
      'integration_contract',
      'owned_blobs',
    ],
    'Primary activation'
  );
  if (
    record.schema !== PRIMARY_ACTIVATION_SCHEMA ||
    typeof record.primary_initialized !== 'boolean'
  )
    unavailable('Primary activation schema is unsupported.');
  for (const field of ['primary_root', 'common_dir'])
    if (
      typeof record[field] !== 'string' ||
      !path.isAbsolute(record[field]) ||
      path.normalize(record[field]) !== record[field]
    )
      unavailable('Primary activation paths must be canonical absolute paths.');
  if (!record.primary_initialized) {
    if (record.owned_blobs !== null || record.integration_contract !== null)
      unavailable('Uninitialized registration cannot contain activated policy.');
    return record;
  }
  if (typeof record.integration_contract !== 'string' || !record.integration_contract)
    unavailable('Initialized activation requires an integration contract.');
  closed(record.owned_blobs, ['config', 'skill'], 'Activated owned blobs');
  for (const [name, expected] of [
    ['config', PRIMARY_CONFIG_PATH],
    ['skill', PRIMARY_SKILL_PATH],
  ]) {
    const entry = record.owned_blobs[name];
    closed(entry, ['path', 'blob'], `Activated ${name}`);
    if (
      entry.path !== expected ||
      typeof entry.blob !== 'string' ||
      !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(entry.blob)
    )
      unavailable(`Activated ${name} path or blob is invalid.`);
  }
  return record;
}

function ordinaryFile(root, relative) {
  const segments = relative.split('/');
  let file = root;
  for (let index = 0; index < segments.length; index += 1) {
    file = path.join(file, segments[index]);
    const stat = lstatSync(file);
    if (stat.size > 1024 * 1024) unavailable('Primary registration exceeds its byte bound.');
    if (
      stat.isSymbolicLink() ||
      (index === segments.length - 1 ? !stat.isFile() : !stat.isDirectory())
    )
      unavailable('Owned authority paths must be ordinary non-symlink paths.', { path: relative });
  }
  if (realpathSync(file) !== file)
    unavailable('Owned authority path has a noncanonical location.', { path: relative });
  return file;
}

function primaryContext(options = {}) {
  const context = Object.freeze({
    signal: options.signal ?? new AbortController().signal,
    deadline: options.deadline ?? performance.now() + 30000,
  });
  if (!(context.signal instanceof AbortSignal) || !Number.isFinite(context.deadline))
    unavailable('Invalid primary operation context.');
  if (context.signal.aborted || performance.now() >= context.deadline)
    unavailable('Primary operation aborted or deadline expired.');
  return context;
}
const registrationGenerations = new WeakMap();
const authorityGenerations = new WeakMap();
const sameRegistrationGeneration = (a, b) =>
  a &&
  b &&
  ['location', 'identity', 'fileVersion', 'rootIdentity', 'parentIdentity'].every(
    (key) => a[key] === b[key]
  );
export async function assertPrimaryRegistrationGeneration(previous, current) {
  if (
    !sameRegistrationGeneration(
      registrationGenerations.get(previous),
      registrationGenerations.get(current)
    )
  )
    unavailable('Primary registration physical generation changed or is not authenticated.');
  return current;
}
export async function assertPrimaryAuthorityGeneration(previous, current) {
  if (
    !sameRegistrationGeneration(
      authorityGenerations.get(previous),
      authorityGenerations.get(current)
    )
  )
    unavailable('Primary authority physical generation changed or is not authenticated.');
  return current;
}
export function assertPrimaryAuthorityUnchanged(authority) {
  try {
    assertProtectedSnapshotUnchanged(authorityGenerations.get(authority));
  } catch (cause) {
    unavailable(
      'Primary authority physical generation changed or is not authenticated.',
      {},
      cause
    );
  }
  return authority;
}
const retainedReadGuards = new Set();
export async function retryPrimaryReadCleanup() {
  for (const guard of retainedReadGuards) {
    await guard.close();
    retainedReadGuards.delete(guard);
  }
}
export async function discoverPrimaryAuthorityRepository(cwd = process.cwd(), options = {}) {
  const context = primaryContext(options);
  try {
    const system = await initializePortableSystem(context);
    return await system.authorityRepository({ cwd });
  } catch (cause) {
    const error = new AprError(
      'APR_REPOSITORY_NOT_FOUND',
      'Stock physical Git authority is unavailable.',
      {
        recovery:
          'Restore the actual stock Git executable and physical worktree before retrying primary authority.',
      }
    );
    error.cause = cause;
    throw error;
  }
}
export async function readPrimaryRegistration(location, options = {}) {
  const context = primaryContext(options);
  let guard;
  try {
    const system = await initializePortableSystem(context);
    if ((await system.canonicalPath(location.commonDir)) !== location.commonDir)
      unavailable('Clone admission directory is not canonical.');
    const file = primaryRegistrationPath(location.commonDir);
    const receipt = await system.observeProtection({ root: path.dirname(file) });
    if (!receipt.verified) unavailable('Primary registration protection cannot be proven.');
    guard = await system.openProtectedRoot({ receipt });
    const snapshot = await guard.readSnapshot(path.basename(file));
    const bytes = snapshot.bytes;
    if (bytes.length > 1024 * 1024) unavailable('Primary registration exceeds its byte bound.');
    const record = validatePrimaryActivation(JSON.parse(bytes));
    if (
      record.common_dir !== location.commonDir ||
      (location.mainRoot !== null && record.primary_root !== location.mainRoot) ||
      (await system.canonicalPath(record.primary_root)) !== record.primary_root
    )
      unavailable('Primary registration does not identify this clone’s main worktree.');
    const primary =
      location.root === record.primary_root
        ? location
        : await discoverPrimaryAuthorityRepository(record.primary_root, context);
    if (
      primary.root !== record.primary_root ||
      primary.gitDir !== primary.commonDir ||
      primary.commonDir !== location.commonDir
    )
      unavailable('Registered primary Git membership is unavailable.');
    const fresh = await guard.readSnapshot(path.basename(file));
    if (
      fresh.identity !== snapshot.identity ||
      fresh.fileVersion !== snapshot.fileVersion ||
      !fresh.bytes.equals(bytes)
    )
      unavailable('Primary registration changed during its protected observation.');
    await guard.verify();
    primaryContext(context);
    await guard.close();
    guard = null;
    const result = Object.freeze({ record, bytes });
    registrationGenerations.set(result, snapshot);
    return result;
  } catch (cause) {
    if (guard)
      try {
        await guard.close();
      } catch (cleanup) {
        retainedReadGuards.add(guard);
        cause.cause = cleanup;
      }
    if (cause instanceof AprError && cause.code === 'APR_PRIMARY_AUTHORITY_UNAVAILABLE')
      throw cause;
    unavailable('Primary registration is absent, unreadable or physically invalid.', {}, cause);
  }
}

export async function resolvePrimaryAuthoritySync({ cwd = process.cwd(), ...options } = {}) {
  const context = primaryContext(options);
  try {
    const location = await discoverPrimaryAuthorityRepository(cwd, context);
    const registration = await readPrimaryRegistration(location, context);
    const { record, bytes } = registration;
    if (!record.primary_initialized)
      unavailable('Primary registration is explicitly uninitialized.');
    const owned = Object.entries(record.owned_blobs);
    const system = await initializePortableSystem(context);
    const policy = await system.primaryPolicy({
      root: record.primary_root,
      blobs: owned.map(([, entry]) => entry.blob),
    });
    const { tree, index, batch } = policy;
    const trees = new Map(
      tree
        .split(String.fromCharCode(0))
        .filter(Boolean)
        .map((line) => [line.split('\t')[1], line])
    );
    const indexes = new Map();
    for (const line of index.split(String.fromCharCode(0)).filter(Boolean)) {
      const name = line.split('\t')[1];
      if (indexes.has(name)) unavailable('Primary owned index contains conflicting stages.');
      indexes.set(name, line);
    }
    let offset = 0;
    const committedBlobs = new Map();
    for (const [, entry] of owned) {
      const end = batch.indexOf(10, offset);
      const header =
        end >= 0
          ? /^([0-9a-f]+) blob ([0-9]+)$/.exec(batch.subarray(offset, end).toString('ascii'))
          : null;
      const size = header ? Number(header[2]) : NaN;
      if (
        !header ||
        header[1] !== entry.blob ||
        !Number.isSafeInteger(size) ||
        size > 16777216 ||
        end + 1 + size >= batch.length ||
        batch[end + 1 + size] !== 10
      )
        unavailable('Activated primary blob cannot be read completely.');
      committedBlobs.set(entry.blob, batch.subarray(end + 1, end + 1 + size));
      offset = end + 2 + size;
    }
    if (offset !== batch.length) unavailable('Primary blob batch contains unexpected output.');
    const observed = {};
    let config;
    for (const [name, entry] of owned) {
      const file = ordinaryFile(record.primary_root, entry.path);
      const match = /^(100644|100755) blob ([0-9a-f]+)\t([^\0]+)$/.exec(
        trees.get(entry.path) ?? ''
      );
      const stage = /^(100644|100755) ([0-9a-f]+) 0\t([^\0]+)$/.exec(indexes.get(entry.path) ?? '');
      const working = readFileSync(file);
      const committed = committedBlobs.get(entry.blob);
      if (
        !match ||
        !stage ||
        match[3] !== entry.path ||
        stage[3] !== entry.path ||
        match[1] !== stage[1] ||
        match[2] !== entry.blob ||
        stage[2] !== entry.blob ||
        !committed.equals(working)
      )
        unavailable('Primary owned file differs from its activated committed blob.', {
          primaryRoot: record.primary_root,
          path: entry.path,
          activatedBlob: entry.blob,
          currentBlob: match?.[2] ?? null,
          indexBlob: stage?.[2] ?? null,
          activationCommand: `cd ${JSON.stringify(record.primary_root)} && ai-peer-review primary activate --dry-run`,
        });
      // Git can hide executable-bit changes with core.filemode=false; inspect actual
      // bytes and stages here, leaving platform mode semantics to Git's tree modes.
      if (name === 'config') config = validatePrimaryStore(JSON.parse(working.toString('utf8')));
      observed[name] = Object.freeze({ ...entry });
    }
    const final = await readPrimaryRegistration(location, context);
    if (
      !final.bytes.equals(bytes) ||
      !sameRegistrationGeneration(
        registrationGenerations.get(registration),
        registrationGenerations.get(final)
      )
    )
      unavailable('Primary registration physical generation changed during policy observation.');
    primaryContext(context);
    for (const [, entry] of owned) {
      if (
        !committedBlobs
          .get(entry.blob)
          .equals(readFileSync(ordinaryFile(record.primary_root, entry.path)))
      )
        unavailable('Primary owned file changed during protected observation.', {
          path: entry.path,
        });
    }
    const finalPolicy = await system.primaryPolicy({
      root: record.primary_root,
      blobs: owned.map(([, entry]) => entry.blob),
    });
    if (
      finalPolicy.tree !== tree ||
      finalPolicy.index !== index ||
      !finalPolicy.batch.equals(batch)
    )
      unavailable('Primary Git authority changed during protected observation.');
    primaryContext(context);
    for (const [, entry] of owned) {
      if (
        !committedBlobs
          .get(entry.blob)
          .equals(readFileSync(ordinaryFile(record.primary_root, entry.path)))
      )
        unavailable('Primary working policy changed during final stock observation.', {
          path: entry.path,
        });
    }
    primaryContext(context);
    assertProtectedSnapshotUnchanged(registrationGenerations.get(final));
    const result = Object.freeze({
      root: record.primary_root,
      commonDir: location.commonDir,
      configPath: path.join(record.primary_root, PRIMARY_CONFIG_PATH),
      skillPath: path.join(record.primary_root, PRIMARY_SKILL_PATH),
      activationDigest: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
      ownedBlobs: Object.freeze(observed),
      integrationContract: record.integration_contract,
      activeWorktreeRoot: location.root,
      config,
    });
    authorityGenerations.set(result, registrationGenerations.get(final));
    return result;
  } catch (cause) {
    if (cause instanceof AprError && cause.code === 'APR_PRIMARY_AUTHORITY_UNAVAILABLE')
      throw cause;
    unavailable('Primary policy cannot be validated.', {}, cause);
  }
}

export async function resolvePrimaryAuthority(options) {
  return await resolvePrimaryAuthoritySync(options);
}
