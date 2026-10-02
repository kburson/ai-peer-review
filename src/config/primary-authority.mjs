import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { platformSecurity } from '../broker/platform.mjs';
import { AprError } from '../errors.mjs';
import { authorityGit, discoverAuthorityRepository } from '../git/repository.mjs';
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

export function readPrimaryRegistration(location) {
  try {
    const relative = 'ai-peer-review/primary-activation.json';
    const file = ordinaryFile(location.commonDir, relative);
    const stat = lstatSync(file);
    if (stat.size > 1024 * 1024) unavailable('Primary registration exceeds its byte bound.');
    if (
      process.platform !== 'win32' &&
      ((stat.mode & 0o077) !== 0 || stat.uid !== process.getuid())
    )
      unavailable('Primary registration must be account-owned and owner-only.');
    const directoryStat = lstatSync(path.dirname(file));
    if (
      process.platform !== 'win32' &&
      ((directoryStat.mode & 0o077) !== 0 || directoryStat.uid !== process.getuid())
    )
      unavailable('Primary registration directory must be account-owned and owner-only.');
    let bytes;
    if (process.platform === 'win32') {
      // The existing native handle contract verifies the invoking account SID,
      // owner-only DACL, ordinary file and held directory identity on read.
      const directory = platformSecurity().openPrivateDirectory(path.dirname(file));
      try {
        bytes = directory.read(path.basename(file));
        if (bytes === null || !directory.verify())
          unavailable('Primary registration Windows ownership cannot be proven.');
      } finally {
        directory.close();
      }
    } else bytes = readFileSync(file);
    const record = validatePrimaryActivation(JSON.parse(bytes));
    if (
      record.common_dir !== location.commonDir ||
      (location.mainRoot !== null && record.primary_root !== location.mainRoot) ||
      realpathSync(record.primary_root) !== record.primary_root
    )
      unavailable('Primary registration does not identify this clone’s main worktree.');
    const primary =
      location.root === record.primary_root
        ? location
        : discoverAuthorityRepository(record.primary_root);
    if (
      primary.root !== record.primary_root ||
      primary.gitDir !== primary.commonDir ||
      primary.commonDir !== location.commonDir
    )
      unavailable('Registered primary Git membership is unavailable.');
    return { record, bytes };
  } catch (cause) {
    if (cause instanceof AprError && cause.code === 'APR_PRIMARY_AUTHORITY_UNAVAILABLE')
      throw cause;
    unavailable('Primary registration is absent, unreadable or physically invalid.', {}, cause);
  }
}

export function resolvePrimaryAuthoritySync({ cwd = process.cwd() } = {}) {
  try {
    const location = discoverAuthorityRepository(cwd);
    const { record, bytes } = readPrimaryRegistration(location);
    if (!record.primary_initialized)
      unavailable('Primary registration is explicitly uninitialized.');
    const owned = Object.entries(record.owned_blobs);
    const paths = owned.map(([, entry]) => entry.path);
    const tree = authorityGit(record.primary_root, ['ls-tree', '-z', 'HEAD', '--', ...paths]);
    const index = authorityGit(record.primary_root, ['ls-files', '--stage', '-z', '--', ...paths]);
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
    const batch = authorityGit(record.primary_root, ['cat-file', '--batch'], {
      buffer: true,
      input: owned.map(([, entry]) => entry.blob).join('\n') + '\n',
    });
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
    return Object.freeze({
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
  } catch (cause) {
    if (cause instanceof AprError && cause.code === 'APR_PRIMARY_AUTHORITY_UNAVAILABLE')
      throw cause;
    unavailable('Primary policy cannot be validated.', {}, cause);
  }
}

export async function resolvePrimaryAuthority(options) {
  return resolvePrimaryAuthoritySync(options);
}
