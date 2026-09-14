import path from 'node:path';

import { AprError } from '../errors.mjs';

const DIGEST_RE = /^[a-f0-9]{64}$/;

function failure(code, message, recovery, details = {}) {
  return new AprError(code, message, { recovery, details });
}

function pathApi(platform) {
  return platform?.kind === 'win32' ? path.win32 : path.posix;
}

function absolute(value, platform, label) {
  if (typeof value !== 'string' || !value || !pathApi(platform).isAbsolute(value)) {
    throw failure(
      'APR_BROKER_PATH_INVALID',
      `Broker ${label} must be an absolute path.`,
      'Set the documented per-user cache location to an absolute path and retry.',
      { label, value }
    );
  }
  return value;
}

function cacheRoot({ platform, env, home }) {
  const kind = platform?.kind;
  if (kind === 'darwin')
    return path.posix.join(absolute(home, platform, 'home'), 'Library', 'Caches');
  if (kind === 'linux') {
    if (env?.XDG_CACHE_HOME !== undefined) {
      return absolute(env.XDG_CACHE_HOME, platform, 'XDG_CACHE_HOME');
    }
    return path.posix.join(absolute(home, platform, 'home'), '.cache');
  }
  if (kind === 'win32') return absolute(env?.LOCALAPPDATA, platform, 'LOCALAPPDATA');
  throw failure(
    'APR_BROKER_ENDPOINT_UNSUPPORTED',
    'This platform has no supported local broker endpoint.',
    'Use macOS, Linux, or Windows for broker-backed cross-provider review.',
    { platform: kind ?? null }
  );
}

function verifyEndpointLength(endpoint, platform) {
  const limit = platform?.maxEndpointLength;
  if (limit === undefined) return;
  if (!Number.isInteger(limit) || limit <= 0 || endpoint.length > limit) {
    throw failure(
      'APR_BROKER_ENDPOINT_TOO_LONG',
      'The project-local broker endpoint exceeds the supported platform limit.',
      'Use a shorter supported user cache path; broker endpoints are never truncated or redirected.',
      { endpoint, limit: limit ?? null }
    );
  }
}

export function brokerPaths({ identity, platform, env = {}, home } = {}) {
  const digest = identity?.digest;
  if (typeof digest !== 'string' || !DIGEST_RE.test(digest)) {
    throw failure(
      'APR_BROKER_PATH_INVALID',
      'Broker identity has no canonical root digest.',
      'Compute canonical project identity before deriving broker paths.'
    );
  }
  const root = cacheRoot({ platform, env, home });
  const paths = pathApi(platform);
  const directory = paths.join(root, 'ai-peer-review', 'brokers', digest);
  const endpoint =
    platform.kind === 'win32'
      ? `\\\\.\\pipe\\ai-peer-review-brokers-${digest}-broker.sock`
      : paths.join(directory, 'broker.sock');
  verifyEndpointLength(endpoint, platform);
  return Object.freeze({
    directory,
    endpoint,
    lock: paths.join(directory, 'broker.lock'),
    metadata: paths.join(directory, 'broker.json'),
  });
}
