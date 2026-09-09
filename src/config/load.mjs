import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { AprError } from '../errors.mjs';

const TOP_LEVEL = new Set(['schema', 'authority', 'hosts', 'setup']);
const AUTHORITY = new Set(['authority_policy', 'challenge_ttl_ms', 'verifier']);
const VERIFIER = new Set([
  'kind',
  'verifier_id',
  'verifier_fingerprint',
  'public_key',
  'assurance_grade',
  'signer_strength',
]);
const HOST = new Set(['identity', 'resume', 'reviewer_guard']);
const IDENTITY = new Set(['provider', 'host', 'model_id', 'model_display']);
const RESUME = new Set(['command', 'scratch_handle']);
const GUARD = new Set(['enabled', 'command']);
const SETUP = new Set(['owner', 'version', 'agents', 'config_created']);
const HOSTS = new Set(['codex', 'claude', 'grok', 'generic']);

function invalid(message, details = {}) {
  throw new AprError('APR_CONFIG_INVALID', message, {
    recovery: 'Use the closed ai-peer-review.config/v1 schema and store no credentials.',
    details,
  });
}

function record(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    invalid(`${label} must be an object.`);
}

function closed(value, keys, label) {
  record(value, label);
  const unknown = Object.keys(value).filter((key) => !keys.has(key));
  if (unknown.length) invalid(`${label} contains unknown keys.`, { unknown: unknown.sort() });
}

function strings(value, label) {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.some((item) => typeof item !== 'string' || !item)
  ) {
    invalid(`${label} must be a non-empty string array.`);
  }
}

export function validateConfig(value) {
  closed(value, TOP_LEVEL, 'configuration');
  if (value.schema !== 'ai-peer-review.config/v1') invalid('Configuration schema is invalid.');
  if (value.authority !== undefined) {
    closed(value.authority, AUTHORITY, 'authority');
    if (
      !['unavailable', 'prevention-required', 'detection-allowed'].includes(
        value.authority.authority_policy
      )
    ) {
      invalid('authority.authority_policy is invalid.');
    }
    if (
      value.authority.challenge_ttl_ms !== undefined &&
      (!Number.isSafeInteger(value.authority.challenge_ttl_ms) ||
        value.authority.challenge_ttl_ms <= 0)
    ) {
      invalid('authority.challenge_ttl_ms must be a safe positive integer.');
    }
    if (value.authority.verifier !== undefined && value.authority.verifier !== null) {
      closed(value.authority.verifier, VERIFIER, 'authority.verifier');
    }
  }
  if (value.hosts !== undefined) {
    record(value.hosts, 'hosts');
    const unknownHosts = Object.keys(value.hosts).filter((key) => !HOSTS.has(key));
    if (unknownHosts.length)
      invalid('hosts contains unknown providers.', { unknown: unknownHosts.sort() });
    for (const [name, host] of Object.entries(value.hosts)) {
      closed(host, HOST, `hosts.${name}`);
      if (host.identity !== undefined) closed(host.identity, IDENTITY, `hosts.${name}.identity`);
      if (host.resume !== undefined) {
        closed(host.resume, RESUME, `hosts.${name}.resume`);
        strings(host.resume.command, `hosts.${name}.resume.command`);
        if (typeof host.resume.scratch_handle !== 'string' || !host.resume.scratch_handle) {
          invalid(`hosts.${name}.resume.scratch_handle must be a non-empty string.`);
        }
      }
      if (host.reviewer_guard !== undefined) {
        closed(host.reviewer_guard, GUARD, `hosts.${name}.reviewer_guard`);
        if (typeof host.reviewer_guard.enabled !== 'boolean') {
          invalid(`hosts.${name}.reviewer_guard.enabled must be boolean.`);
        }
        if (host.reviewer_guard.command !== undefined)
          strings(host.reviewer_guard.command, `hosts.${name}.reviewer_guard.command`);
      }
    }
  }
  if (value.setup !== undefined) {
    closed(value.setup, SETUP, 'setup');
    if (value.setup.owner !== 'ai-peer-review' || value.setup.version !== 1)
      invalid('setup ownership metadata is invalid.');
    strings(value.setup.agents, 'setup.agents');
    if (value.setup.agents.some((agent) => !HOSTS.has(agent)))
      invalid('setup.agents contains an unknown host.');
    if (typeof value.setup.config_created !== 'boolean')
      invalid('setup.config_created must be boolean.');
  }
  return value;
}

function readConfig(file) {
  try {
    const value = JSON.parse(readFileSync(file, 'utf8'));
    validateConfig(value);
    return value;
  } catch (cause) {
    if (cause?.code === 'ENOENT') return null;
    if (cause instanceof AprError) throw cause;
    invalid('Configuration cannot be read as JSON.', { file });
  }
}

function merge(left, right) {
  if (!left) return right ?? null;
  if (!right) return left;
  const output = { ...left };
  for (const [key, value] of Object.entries(right)) {
    output[key] =
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      output[key] &&
      typeof output[key] === 'object' &&
      !Array.isArray(output[key])
        ? merge(output[key], value)
        : value;
  }
  return output;
}

export function configPaths({
  cwd = process.cwd(),
  env = process.env,
  platform = process.platform,
  home = os.homedir(),
} = {}) {
  const userRoot =
    platform === 'win32' ? env.APPDATA : (env.XDG_CONFIG_HOME ?? path.join(home, '.config'));
  if (!userRoot) invalid('A platform configuration directory is unavailable.');
  return Object.freeze({
    user: path.join(userRoot, 'ai-peer-review', 'config.json'),
    project: path.join(path.resolve(cwd), '.ai-peer-review.json'),
  });
}

export function loadConfig(options = {}) {
  const paths = configPaths(options);
  const user = readConfig(paths.user);
  const project = readConfig(paths.project);
  const config = merge(user, project) ?? { schema: 'ai-peer-review.config/v1' };
  validateConfig(config);
  return Object.freeze({
    schema: 'ai-peer-review.loaded-config/v1',
    config,
    paths,
    sources: Object.freeze({ user: Boolean(user), project: Boolean(project) }),
  });
}
