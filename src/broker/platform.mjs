import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AprError } from '../errors.mjs';

const packageRoot = fileURLToPath(new URL('../..', import.meta.url));
const helperRelative = path.join(
  'native',
  'broker-security',
  'build',
  'Release',
  'broker_security.node'
);
const identityRelative = path.join(
  'native',
  'broker-security',
  'build',
  'Release',
  'build-identity.json'
);

function quote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function buildCommand(root) {
  const sourceCheckout = existsSync(path.join(root, '.git'));
  const prefix = sourceCheckout ? 'npm' : `npm --prefix ${quote(root)}`;
  return `${prefix} run build:broker-security -- --nodedir /absolute/local/node-development-tree`;
}

function startFailure(observation) {
  return new AprError(
    'APR_BROKER_START_FAILED',
    'The package-owned broker security helper is unavailable or incompatible.',
    {
      recovery: `Build it explicitly with: ${observation.build_command}`,
      details: observation,
    }
  );
}

export function inspectPlatformSecurity({ root = packageRoot } = {}) {
  const absoluteRoot = realpathSync(root);
  const helper = path.join(absoluteRoot, helperRelative);
  const identityFile = path.join(absoluteRoot, identityRelative);
  const expected = Object.freeze({
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
  });
  let observed = null;
  try {
    observed = JSON.parse(readFileSync(identityFile, 'utf8'));
  } catch {
    // Missing or malformed build identity is a normal unhealthy observation.
  }
  const identityMatches =
    observed !== null &&
    typeof observed === 'object' &&
    !Array.isArray(observed) &&
    Object.keys(observed).length === 3 &&
    Object.entries(expected).every(([key, value]) => observed[key] === value);
  return Object.freeze({
    healthy: existsSync(helper) && identityMatches,
    helper,
    identity_file: identityFile,
    expected,
    observed,
    build_command: buildCommand(absoluteRoot),
  });
}

function loadBinding(root) {
  const observation = inspectPlatformSecurity({ root });
  if (!observation.healthy) throw startFailure(observation);
  try {
    return createRequire(import.meta.url)(observation.helper);
  } catch (cause) {
    const error = startFailure(observation);
    error.cause = cause;
    throw error;
  }
}

function requireBinding(binding, names) {
  for (const name of names) {
    if (typeof binding?.[name] !== 'function') {
      throw new AprError(
        'APR_BROKER_START_FAILED',
        'The broker security helper does not expose its complete native contract.',
        {
          recovery: 'Rebuild the exact installed package helper and retry broker startup.',
          details: { missing: name },
        }
      );
    }
  }
}

export function platformSecurity({
  root = packageRoot,
  binding = null,
  kind = process.platform,
} = {}) {
  const native = binding ?? loadBinding(root);
  requireBinding(native, [
    'canonicalPath',
    'userId',
    'openPrivateDirectory',
    'verifyDirectory',
    'directoryRead',
    'directoryCreate',
    'directoryRemove',
    'closeDirectory',
    'acquireExclusive',
    'verifyExclusive',
    'releaseExclusive',
    'abandonExclusive',
    'listenPrivate',
    'verifyEndpoint',
    'closeEndpoint',
    'peerUser',
  ]);
  const maxEndpointLength = kind === 'darwin' ? 103 : kind === 'linux' ? 107 : 256;
  return Object.freeze({
    kind,
    maxEndpointLength,
    canonicalPath(value) {
      return native.canonicalPath(value);
    },
    userId() {
      return native.userId();
    },
    openPrivateDirectory(value) {
      const handle = native.openPrivateDirectory(value);
      let closed = false;
      return Object.freeze({
        verify: () => !closed && native.verifyDirectory(handle),
        read: (name) => native.directoryRead(handle, name),
        create: (name, bytes) => native.directoryCreate(handle, name, Buffer.from(bytes)),
        remove: (name, bytes) => native.directoryRemove(handle, name, Buffer.from(bytes)),
        close() {
          if (!closed) native.closeDirectory(handle);
          closed = true;
        },
      });
    },
    acquireExclusive(value, proof) {
      const bytes = Buffer.from(JSON.stringify(proof), 'utf8');
      const handle = native.acquireExclusive(value, bytes);
      let released = false;
      return Object.freeze({
        ...proof,
        verify: () => !released && native.verifyExclusive(handle),
        release() {
          if (released) return false;
          released = true;
          return native.releaseExclusive(handle);
        },
        abandon() {
          if (released) return;
          released = true;
          native.abandonExclusive(handle);
        },
      });
    },
    listenPrivate(value) {
      const handle = native.listenPrivate(value);
      let closed = false;
      return Object.freeze({
        verify: () => !closed && native.verifyEndpoint(handle),
        close() {
          if (closed) return false;
          closed = true;
          return native.closeEndpoint(handle);
        },
      });
    },
    peerUser(handle) {
      const descriptor = typeof handle === 'number' ? handle : handle?._handle?.fd;
      return native.peerUser(descriptor ?? handle);
    },
  });
}
