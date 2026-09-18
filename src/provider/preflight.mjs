import { createHash } from 'node:crypto';
import { lstatSync } from 'node:fs';
import path from 'node:path';

import { AprError } from '../errors.mjs';
import { encodeClaudeExecutionPermissions } from './claude-launch.mjs';

export const CLAUDE_ENVIRONMENT_ALLOWLIST = Object.freeze([
  'HOME',
  'USERPROFILE',
  'APPDATA',
  'LOCALAPPDATA',
  'XDG_CONFIG_HOME',
  'XDG_CACHE_HOME',
  'TMPDIR',
  'TEMP',
  'TMP',
  'PATH',
  'SHELL',
  'TERM',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'SystemRoot',
  'SYSTEMROOT',
  'COMSPEC',
  'PATHEXT',
  'WINDIR',
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'NO_PROXY',
  'http_proxy',
  'https_proxy',
  'no_proxy',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_BASE_URL',
  'CLAUDE_CONFIG_DIR',
  'CLAUDE_CODE_API_KEY_HELPER_TTL_MS',
  'SSL_CERT_FILE',
  'SSL_CERT_DIR',
  'NODE_EXTRA_CA_CERTS',
]);

export const PROVIDER_IDENTITY_ENVIRONMENT_KEYS = Object.freeze([
  'CLAUDE_CODE_SESSION_ID',
  'CLAUDE_SESSION_ID',
  'CLAUDE_MODEL_ID',
  'CLAUDE_MODEL_DISPLAY',
  'CODEX_THREAD_ID',
  'CODEX_SESSION_ID',
  'CODEX_MODEL_ID',
  'CODEX_MODEL_DISPLAY',
  'GROK_SESSION_ID',
  'GROK_MODEL_ID',
]);

function fail(code, message, recovery, details = {}, cause = null) {
  const error = new AprError(code, message, { recovery, details });
  if (cause) error.cause = cause;
  throw error;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])])
    );
  }
  return value;
}

function digest(value) {
  return `sha256:${createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex')}`;
}

function version(value) {
  const match = String(value).match(/(?:^|\D)(\d+)\.(\d+)\.(\d+)(?:\D|$)/u);
  return match ? match.slice(1, 4).map(Number) : null;
}

function atLeast(actual, minimum) {
  const left = version(actual);
  const right = version(minimum);
  if (!left || !right) return false;
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index];
  }
  return true;
}

function inspectExecutable(file, label, lstat) {
  if (typeof file !== 'string' || !path.isAbsolute(file) || path.normalize(file) !== file) {
    fail(
      'APR_PROVIDER_EXECUTABLE_UNSAFE',
      `${label} executable must be canonical and absolute.`,
      'Select the exact installed executable path; PATH lookup and aliases are not allowed.',
      { label }
    );
  }
  let metadata;
  try {
    metadata = lstat(file, { bigint: true });
    if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error('unsafe file type');
  } catch (cause) {
    fail(
      'APR_PROVIDER_EXECUTABLE_UNSAFE',
      `${label} executable is missing, redirected, or not a regular file.`,
      'Install or select a canonical regular executable and rerun preflight.',
      { label, path: file },
      cause
    );
  }
  return Object.freeze({
    path: file,
    device: String(metadata.dev),
    inode: String(metadata.ino),
    size: String(metadata.size),
  });
}

export function buildProviderChildEnvironment(env, capability) {
  if (env.CLAUDE_CODE_USE_BEDROCK || env.CLAUDE_CODE_USE_VERTEX) {
    fail(
      'APR_ENVIRONMENT_INVALID',
      'Claude Bedrock and Vertex identity environments are not classified by this adapter.',
      'Use direct Anthropic, configured Claude, or gateway authentication until a versioned enterprise adapter policy is installed.'
    );
  }
  const allow = new Set(capability.environment_allowlist);
  const child = {};
  for (const name of [...allow].sort()) {
    if (typeof env[name] === 'string') child[name] = env[name];
  }
  const allowedNames = Object.keys(child).sort();
  const removedNames = Object.keys(env)
    .filter((name) => !allow.has(name))
    .sort();
  return {
    child: Object.freeze(child),
    receipt: Object.freeze({
      allowed_names: Object.freeze(allowedNames),
      removed_names: Object.freeze(removedNames),
      policy_digest: digest({
        allowlist: capability.environment_allowlist,
        identity_removal: capability.identity_removal,
      }),
    }),
  };
}

function validateCapability(capability) {
  if (
    capability?.schema !== 'ai-peer-review.provider-capability/v1' ||
    capability.provider !== 'claude' ||
    typeof capability.minimum_version !== 'string' ||
    !Array.isArray(capability.probe_argv) ||
    !Array.isArray(capability.environment_allowlist) ||
    !Array.isArray(capability.identity_removal) ||
    capability.permissionEncoder !== encodeClaudeExecutionPermissions
  ) {
    fail(
      'APR_PROVIDER_CAPABILITY_INVALID',
      'The provider capability policy is incomplete.',
      'Use the sealed versioned Claude adapter capability.'
    );
  }
  if (
    JSON.stringify(capability.environment_allowlist) !==
      JSON.stringify(CLAUDE_ENVIRONMENT_ALLOWLIST) ||
    JSON.stringify(capability.identity_removal) !==
      JSON.stringify(PROVIDER_IDENTITY_ENVIRONMENT_KEYS)
  ) {
    fail(
      'APR_PROVIDER_CAPABILITY_INVALID',
      'The Claude capability differs from the sealed environment policy.',
      'Use the exact versioned Claude environment and identity-removal policy.'
    );
  }
}

export async function preflightReviewerExecution({
  contract,
  capability,
  env = process.env,
  execFile,
  lstat = lstatSync,
} = {}) {
  if (contract?.schema !== 'ai-peer-review.execution-contract/v1') {
    fail(
      'APR_EXECUTION_CONTRACT_INVALID',
      'Provider preflight requires a current reviewer execution contract.',
      'Rebuild the contract from current event authority.'
    );
  }
  validateCapability(capability);
  if (typeof execFile !== 'function') {
    fail(
      'APR_PROVIDER_CAPABILITY_INVALID',
      'Provider preflight requires a shell-free executable probe.',
      'Provide the adapter execFile boundary.'
    );
  }
  const providerIdentity = inspectExecutable(capability.executable, 'provider', lstat);
  const commandSet = [contract.commands.join, contract.commands.submit].filter(Boolean);
  const nodeIdentities = commandSet.map((command) =>
    inspectExecutable(command.file, 'Node', lstat)
  );
  const packageIdentities = commandSet.map((command) =>
    inspectExecutable(command.args[0], 'package', lstat)
  );
  const environment = buildProviderChildEnvironment(env, capability);
  let permissions;
  try {
    permissions = capability.permissionEncoder(contract);
  } catch (cause) {
    if (cause?.code === 'APR_PERMISSION_UNREPRESENTABLE') throw cause;
    fail(
      'APR_PERMISSION_UNREPRESENTABLE',
      'The exact reviewer command or path cannot be represented in provider permissions.',
      'Install or select canonical paths representable by the provider grammar, then rerun preflight.',
      {},
      cause
    );
  }
  if (!Array.isArray(permissions) || permissions.some((entry) => typeof entry !== 'string')) {
    fail(
      'APR_PERMISSION_UNREPRESENTABLE',
      'The provider permission encoder did not produce exact rules.',
      'Repair the sealed adapter permission encoder and rerun preflight.'
    );
  }
  let probe;
  try {
    probe = await execFile(capability.executable, capability.probe_argv, {
      shell: false,
      encoding: 'utf8',
      env: environment.child,
    });
  } catch (cause) {
    fail(
      'APR_PROVIDER_PROBE_FAILED',
      'The provider non-model compatibility probe failed.',
      'Repair the exact provider executable and rerun preflight before dispatch.',
      { executable: capability.executable },
      cause
    );
  }
  const observedVersion = version(probe?.stdout ?? probe)?.join('.') ?? null;
  if (!observedVersion || !atLeast(observedVersion, capability.minimum_version)) {
    fail(
      'APR_PROVIDER_VERSION_INCOMPATIBLE',
      'The provider executable is below the sealed minimum version.',
      'Upgrade the exact provider executable and rerun preflight before dispatch.',
      { actual: observedVersion, minimum: capability.minimum_version }
    );
  }
  const report = {
    schema: 'ai-peer-review.provider-preflight/v1',
    status: 'ready',
    provider: capability.provider,
    executable: { ...providerIdentity, version: observedVersion },
    package_executables: [...new Map(packageIdentities.map((item) => [item.path, item])).values()],
    node_executables: [...new Map(nodeIdentities.map((item) => [item.path, item])).values()],
    permissions: Object.freeze([...permissions]),
    environment: environment.receipt,
    enforcement: 'unverified',
  };
  report.digest = digest(report);
  const result = { ...report };
  Object.defineProperty(result, 'child_environment', {
    value: environment.child,
    enumerable: false,
    writable: false,
  });
  return Object.freeze(result);
}
