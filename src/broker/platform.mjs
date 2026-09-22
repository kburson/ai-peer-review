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
const maxNativeFrame = 65540;

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
    'reclaimStaleEndpoint',
    'verifyEndpoint',
    'closeEndpoint',
    'acceptPrivate',
    'connectPrivate',
    'connectionRead',
    'connectionWrite',
    'closeConnection',
    'peerUser',
  ]);
  const maxEndpointLength = kind === 'darwin' ? 103 : kind === 'linux' ? 107 : 256;
  const connectionHandles = new WeakMap();
  const lockHandles = new WeakMap();
  function wrapConnection(handle) {
    let closed = false;
    function closeNative(connection) {
      if (closed) return;
      closed = true;
      connectionHandles.delete(connection);
      native.closeConnection(handle);
    }
    const connection = {
      readFrame() {
        if (closed) {
          throw new AprError('APR_BROKER_STALE', 'The broker connection is closed.', {
            recovery: 'Reconnect to the authenticated broker and retry the bounded request.',
          });
        }
        try {
          return native.connectionRead(handle, maxNativeFrame);
        } catch (error) {
          try {
            closeNative(connection);
          } catch {
            // Preserve the protocol failure that caused the connection fence.
          }
          throw error;
        }
      },
      write(bytes) {
        if (closed) {
          throw new AprError('APR_BROKER_STALE', 'The broker connection is closed.', {
            recovery: 'Reconnect to the authenticated broker and retry the bounded request.',
          });
        }
        try {
          native.connectionWrite(handle, Buffer.from(bytes));
        } catch (error) {
          try {
            closeNative(connection);
          } catch {
            // Preserve the protocol failure that caused the connection fence.
          }
          throw error;
        }
      },
      exchange(bytes) {
        this.write(bytes);
        return this.readFrame();
      },
      close() {
        closeNative(connection);
      },
    };
    connectionHandles.set(connection, handle);
    return Object.freeze(connection);
  }
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
      const lock = Object.freeze({
        ...proof,
        verify: () => !released && native.verifyExclusive(handle),
        release() {
          if (released) return false;
          released = true;
          lockHandles.delete(lock);
          return native.releaseExclusive(handle);
        },
        abandon() {
          if (released) return;
          released = true;
          lockHandles.delete(lock);
          native.abandonExclusive(handle);
        },
      });
      lockHandles.set(lock, handle);
      return lock;
    },
    listenPrivate(value) {
      const handle = native.listenPrivate(value);
      let closed = false;
      return Object.freeze({
        verify: () => !closed && native.verifyEndpoint(handle),
        accept() {
          if (closed) {
            throw new AprError('APR_BROKER_STALE', 'The broker endpoint is closed.', {
              recovery: 'Reacquire broker ownership before accepting another connection.',
            });
          }
          return wrapConnection(native.acceptPrivate(handle));
        },
        close() {
          if (closed) return false;
          closed = true;
          return native.closeEndpoint(handle);
        },
      });
    },
    reclaimStaleEndpoint(value, lock) {
      const handle = lockHandles.get(lock);
      if (!handle) {
        throw new AprError(
          'APR_BROKER_STALE',
          'Broker lock is unavailable for endpoint reconciliation.',
          {
            recovery: 'Reacquire the exact project broker lock before reconciling its endpoint.',
          }
        );
      }
      native.reclaimStaleEndpoint(handle, value);
    },
    connectPrivate(value) {
      return wrapConnection(native.connectPrivate(value));
    },
    peerUser(connection) {
      const handle = connectionHandles.get(connection);
      if (handle === undefined) {
        throw new AprError(
          'APR_BROKER_AUTH_FAILED',
          'Peer identity requires an owned broker connection.',
          {
            recovery: 'Use the connection returned by this platform security instance.',
          }
        );
      }
      return native.peerUser(handle);
    },
  });
}
