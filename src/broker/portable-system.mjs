// cspell:words NOSYSTEM
// @story #186
// cspell:words SID SIDs Win32PowerShell reparse
import { lstat, realpath, readFile } from 'node:fs/promises';
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
async function run(file, args, context, options = {}) {
  const identity = await executable(file, context);
  const result = await execute(file, args, {
    ...options,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    maxBuffer: MAX_OUTPUT,
    signal: context.signal,
    timeout: Math.max(1, Math.min(5000, Math.floor(context.deadline - performance.now()))),
  });
  if ((await executable(file, context)) !== identity) refuse('stock-executable-replaced');
  return result.stdout.trim();
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
    await check();
    const after = await lstat(resolved, { bigint: true });
    if ((await realpath(value)) !== resolved || fileIdentity(before) !== fileIdentity(after))
      refuse('canonical-path-replaced');
    await check();
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
  const system = Object.freeze({
    kind: process.platform,
    canonicalPath,
    physicalLocation,
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
