// cspell:words fsmonitor
// cspell:words NOSYSTEM
// @story #186
// cspell:words SID SIDs Win32PowerShell reparse
import { lstat, realpath, readFile } from 'node:fs/promises';
import { lstatSync, realpathSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { AprError } from '../errors.mjs';

const execute = promisify(execFile);
const members = new WeakMap();
const MAX_OUTPUT = 65536;
const SID = /^S-1-(?:[0-9]+-)+[0-9]+$/u;
const POWERSHELL = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const GIT = process.platform === 'win32' ? 'C:\\Program Files\\Git\\cmd\\git.exe' : '/usr/bin/git';
const PRINCIPAL_SCRIPT = [
  "$ErrorActionPreference='Stop'",
  "$ProgressPreference='SilentlyContinue'",
  "$env:PSModulePath='C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules'",
  '[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)',
  '$identity=[System.Security.Principal.WindowsIdentity]::GetCurrent()',
  '[Console]::Out.Write($identity.User.Value)',
].join('; ');
function refuse(reason) {
  throw new AprError(
    'APR_PORTABLE_OPERATIONS_UNAVAILABLE',
    'Stock portable identity or context is unavailable.',
    {
      recovery: 'Retry with a fresh bounded context and actual OS principal and canonical paths.',
      details: { reason },
    }
  );
}
function validateContext(value) {
  if (
    !value ||
    Object.keys(value).some((key) => !['signal', 'deadline'].includes(key)) ||
    !(value.signal instanceof AbortSignal) ||
    !Number.isFinite(value.deadline) ||
    value.deadline - performance.now() > 30000
  )
    refuse('invalid-context-input');
  if (value.signal.aborted) refuse('operation-aborted');
  if (performance.now() >= value.deadline) refuse('operation-deadline');
}
const fileIdentity = (s) =>
  [s.dev, s.ino, s.size, s.mode, s.mtimeNs, s.ctimeNs].map(String).join(':');
async function executable(file, context) {
  validateContext(context);
  const before = await lstat(file, { bigint: true });
  if (!before.isFile() || before.isSymbolicLink() || (await realpath(file)) !== file)
    refuse('stock-executable-identity');
  const bytes = await readFile(file);
  const after = await lstat(file, { bigint: true });
  if (fileIdentity(before) !== fileIdentity(after)) refuse('stock-executable-replaced');
  validateContext(context);
  return fileIdentity(after) + ':' + createHash('sha256').update(bytes).digest('hex');
}
async function run(file, args, context, options = {}, maxOutput = MAX_OUTPUT) {
  const identity = await executable(file, context);
  const { input, preserveOutput, ...executeOptions } = options;
  const pending = execute(file, args, {
    ...executeOptions,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    maxBuffer: maxOutput,
    signal: context.signal,
    timeout: Math.max(1, Math.min(5000, Math.floor(context.deadline - performance.now()))),
  });
  let inputError;
  if (input !== undefined) {
    pending.child.stdin.once('error', (error) => {
      inputError = error;
      pending.child.kill();
    });
    pending.child.stdin.end(input);
  }
  const result = await pending;
  if (inputError) throw inputError;
  if ((await executable(file, context)) !== identity) refuse('stock-executable-replaced');
  return preserveOutput === true ? result.stdout : result.stdout.trim();
}
async function principal(context) {
  validateContext(context);
  if (process.platform !== 'win32') {
    const effective = process.geteuid?.(),
      actual = process.getuid?.();
    if (!Number.isSafeInteger(effective) || effective < 0 || effective !== actual)
      refuse('effective-principal-unproved');
    return String(effective);
  }
  if (String(process.env.SystemRoot).toLowerCase() !== 'c:\\windows')
    refuse('stock-principal-probe-unavailable');
  const value = await run(
    POWERSHELL,
    [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-EncodedCommand',
      Buffer.from(PRINCIPAL_SCRIPT, 'utf16le').toString('base64'),
    ],
    context
  );
  if (!SID.test(value)) refuse('effective-principal-unproved');
  return value;
}
export async function initializePortableSystem(input = {}) {
  validateContext(input);
  const context = Object.freeze({ signal: input.signal, deadline: input.deadline });
  const originalPrincipal = await principal(context);
  const paths = new Map();
  const pendingCleanup = new Set();
  async function retryCleanup() {
    for (const guard of pendingCleanup) {
      await guard.close();
      pendingCleanup.delete(guard);
    }
  }
  async function check() {
    validateContext(context);
    if ((await principal(context)) !== originalPrincipal) refuse('effective-principal-replaced');
    validateContext(context);
  }
  async function canonicalPath(value) {
    await check();
    if (
      typeof value !== 'string' ||
      !path.isAbsolute(value) ||
      /[\u0000-\u001f\u007f]/u.test(value)
    )
      refuse('canonical-path-input');
    const resolved = await realpath(value);
    const before = await lstat(resolved, { bigint: true });
    if (before.isSymbolicLink()) refuse('canonical-path-alias');
    const after = await lstat(resolved, { bigint: true });
    if ((await realpath(value)) !== resolved || fileIdentity(before) !== fileIdentity(after))
      refuse('canonical-path-replaced');
    await check();
    // The final awaited principal probe cannot leave the path generation stale.
    // This integrity check supplies no principal or permission observation.
    if (
      realpathSync.native(value) !== resolved ||
      fileIdentity(lstatSync(resolved, { bigint: true })) !== fileIdentity(after)
    )
      refuse('canonical-path-replaced');
    validateContext(context);
    const key = path.resolve(value);
    const seen = paths.get(key);
    // Contents/mtime of a directory can change; its physical object identity cannot.
    const physical = [resolved, after.dev, after.ino, after.mode].map(String).join(':');
    if (seen !== undefined && seen !== physical) refuse('canonical-path-identity-replaced');
    paths.set(key, physical);
    return resolved;
  }
  async function physicalLocation(cwd) {
    const canonical = await canonicalPath(cwd);
    const env = { ...process.env };
    for (const key of Object.keys(env)) if (key.startsWith('GIT_')) delete env[key];
    env.GIT_CONFIG_NOSYSTEM = '1';
    env.GIT_CONFIG_GLOBAL = process.platform === 'win32' ? 'NUL' : '/dev/null';
    let root;
    try {
      root = await run(
        GIT,
        ['--no-optional-locks', '-C', canonical, 'rev-parse', '--show-toplevel'],
        context,
        { env }
      );
    } catch (error) {
      await check();
      if (
        error.code === 128 &&
        /^fatal: not a git repository(?: \(or any of the parent directories\))?:/im.test(
          error.stderr ?? ''
        )
      )
        return Object.freeze({ physicalRoot: canonical, commonDirectory: null });
      throw error;
    }
    const physicalRoot = await canonicalPath(path.resolve(root));
    const common = await run(
      GIT,
      ['--no-optional-locks', '-C', physicalRoot, 'rev-parse', '--git-common-dir'],
      context,
      { env }
    );
    const commonDirectory = await canonicalPath(path.resolve(physicalRoot, common));
    if ((await canonicalPath(cwd)) !== canonical) refuse('canonical-path-replaced');
    await check();
    return Object.freeze({ physicalRoot, commonDirectory });
  }
  const authorityEnvironment = () => {
    const env = { ...process.env };
    for (const key of Object.keys(env)) if (/^GIT_/iu.test(key)) delete env[key];
    env.GIT_CONFIG_NOSYSTEM = '1';
    env.GIT_CONFIG_GLOBAL = process.platform === 'win32' ? 'NUL' : '/dev/null';
    return env;
  };
  const gitArguments = (root, args) => [
    '--no-optional-locks',
    '-c',
    'core.fsmonitor=false',
    '-C',
    root,
    ...args,
  ];
  async function reviewWorktrees(input = {}) {
    if (!input || Object.keys(input).join(',') !== 'root') refuse('primary-worktrees-input');
    const root = await canonicalPath(input.root),
      env = authorityEnvironment();
    const records = await run(
      GIT,
      gitArguments(root, ['worktree', 'list', '--porcelain', '-z']),
      context,
      { env, preserveOutput: true }
    );
    await canonicalPath(root);
    await check();
    return records;
  }
  async function authorityRepository(input = {}) {
    if (!input || Object.keys(input).join(',') !== 'cwd') refuse('primary-topology-input');
    const cwd = await canonicalPath(input.cwd),
      env = authorityEnvironment();
    const discovery = await run(
      GIT,
      gitArguments(cwd, [
        'rev-parse',
        '--path-format=absolute',
        '--show-toplevel',
        '--absolute-git-dir',
        '--git-common-dir',
      ]),
      context,
      { env }
    );
    const root = discovery.split(/\r?\n/)[0];
    const worktrees = await run(
      GIT,
      gitArguments(root, ['worktree', 'list', '--porcelain', '-z']),
      context,
      { env, preserveOutput: true }
    );
    const { validateAuthorityMembership } = await import('../git/authority-membership.mjs');
    const result = validateAuthorityMembership({ cwd, discovery, worktrees });
    await canonicalPath(result.root);
    await canonicalPath(result.gitDir);
    await canonicalPath(result.commonDir);
    if (
      (await run(
        GIT,
        gitArguments(cwd, [
          'rev-parse',
          '--path-format=absolute',
          '--show-toplevel',
          '--absolute-git-dir',
          '--git-common-dir',
        ]),
        context,
        { env }
      )) !== discovery
    )
      refuse('primary-topology-replaced');
    await check();
    return result;
  }
  async function primaryPolicy(input = {}) {
    if (
      !input ||
      Object.keys(input).sort().join(',') !== 'blobs,root' ||
      (input.blobs !== null &&
        (!Array.isArray(input.blobs) ||
          input.blobs.length !== 2 ||
          input.blobs.some(
            (value) => typeof value !== 'string' || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(value)
          )))
    )
      refuse('primary-policy-input');
    const suppliedBlobs = input.blobs === null ? null : Object.freeze([...input.blobs]);
    const root = await canonicalPath(input.root),
      env = authorityEnvironment();
    const paths = ['.ai-peer-review/config.json', '.ai-peer-review/skills/peer-review/SKILL.md'];
    const tree = await run(
      GIT,
      gitArguments(root, ['ls-tree', '-z', 'HEAD', '--', ...paths]),
      context,
      { env, preserveOutput: true }
    );
    const index = await run(
      GIT,
      gitArguments(root, ['ls-files', '--stage', '-z', '--', ...paths]),
      context,
      { env, preserveOutput: true }
    );
    const entries = new Map(
      tree
        .split('\0')
        .filter(Boolean)
        .map((line) => {
          const match = /^(100644|100755) blob ([a-f0-9]{40}|[a-f0-9]{64})\t(.+)$/u.exec(line);
          if (!match) refuse('primary-tree-unproved');
          return [match[3], match[2]];
        })
    );
    const blobs = suppliedBlobs ?? paths.map((relative) => entries.get(relative));
    if (blobs.some((value) => typeof value !== 'string')) refuse('primary-tree-unproved');
    const batch = await run(
      GIT,
      gitArguments(root, ['cat-file', '--batch']),
      context,
      { env, preserveOutput: true, input: blobs.join('\n') + '\n' },
      2098176
    );
    await canonicalPath(root);
    await check();
    return Object.freeze({ tree, index, batch: Buffer.from(batch, 'utf8') });
  }
  const system = Object.freeze({
    kind: process.platform,
    canonicalPath,
    physicalLocation,
    authorityRepository,
    primaryPolicy,
    reviewWorktrees,
    retryCleanup,
    async userId() {
      await check();
      return originalPrincipal;
    },
    async observeProtection(input = {}) {
      if (!input || Object.keys(input).length !== 1 || !Object.hasOwn(input, 'root'))
        refuse('invalid-protection-context-input');
      const { root } = input;
      await check();
      const { observeStorageProtection } = await import('./storage-protection.mjs');
      const receipt = await observeStorageProtection({ root, ...context });
      await check();
      return receipt;
    },
    async openProtectedRoot(input = {}) {
      if (!input || Object.keys(input).length !== 1 || !Object.hasOwn(input, 'receipt'))
        refuse('invalid-protection-context-input');
      const { receipt } = input;
      await check();
      const { openProtectedRoot } = await import('./storage-protection.mjs');
      const guard = await openProtectedRoot({ receipt, ...context });
      try {
        await check();
      } catch (error) {
        try {
          await guard.close();
        } catch (cause) {
          pendingCleanup.add(guard);
          error.cause = cause;
          Object.defineProperty(error, 'retryCleanup', { value: retryCleanup });
        }
        throw error;
      }
      return guard;
    },
  });
  members.set(system, { context, check });
  return system;
}
export function isPortableSystem(value) {
  return members.has(value);
}
export async function assertPortableSystemContext(value, context) {
  const record = members.get(value);
  if (
    !record ||
    !context ||
    context.signal !== record.context.signal ||
    context.deadline !== record.context.deadline
  )
    refuse('portable-operations-context-mismatch');
  await record.check();
}
