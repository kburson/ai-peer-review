import { createHash } from 'node:crypto';
import path from 'node:path';

import { AprError } from '../errors.mjs';

const RESOURCE_SCHEMA = 'ai-peer-review.provider-resource/v1';
const HASH = /^[a-f0-9]{64}$/;
const PROVIDER = /^[a-z][a-z0-9._-]{0,63}$/;
const RESOURCE_ID = /^[\x21-\x7e]{1,256}$/;
const RELEASED = new Set(['complete', 'reconciled-recovery']);

function failure(code, message, details = {}) {
  return new AprError(code, message, {
    recovery:
      'Preserve provider-resource evidence and reconcile the exact provider surface before retrying.',
    details,
  });
}

function exact(value, keys) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function instant(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(Date.parse(value)).toISOString() === value
  );
}

function now(platform) {
  const value = typeof platform?.now === 'function' ? platform.now() : new Date().toISOString();
  if (!instant(value))
    throw failure('APR_PROVIDER_RESOURCE_INTEGRITY', 'Provider-resource clock is invalid.');
  return value;
}

function freshObservation(value, platform) {
  if (!instant(value)) return false;
  const age = Date.parse(now(platform)) - Date.parse(value);
  const limit = platform?.providerObservationMaxAgeMs ?? 5_000;
  return Number.isSafeInteger(limit) && limit > 0 && age >= 0 && age <= limit;
}

function validUserId(value) {
  return typeof value === 'string' && value.trim() === value && value.length > 0;
}

function validResourceId(value) {
  return typeof value === 'string' && RESOURCE_ID.test(value);
}

function validateIdentity(identity) {
  if (
    identity === null ||
    typeof identity !== 'object' ||
    Array.isArray(identity) ||
    !validUserId(identity.userId) ||
    !PROVIDER.test(identity.provider ?? '') ||
    !HASH.test(identity.digest ?? '')
  ) {
    throw failure(
      'APR_PROVIDER_RESOURCE_INTEGRITY',
      'Provider-resource identity is incomplete or noncanonical.'
    );
  }
}

function validateOperatingSystemUser(identity, platform) {
  let observed;
  try {
    observed = platform?.userId?.();
  } catch {
    throw failure(
      'APR_PROVIDER_RESOURCE_INTEGRITY',
      'Provider-resource operating-system user identity is unavailable.'
    );
  }
  if (!validUserId(observed) || observed !== identity.userId) {
    throw failure(
      'APR_PROVIDER_RESOURCE_INTEGRITY',
      'Provider-resource identity does not match the operating-system user.'
    );
  }
}

function validateInstance(instanceId, nonce) {
  if (!HASH.test(instanceId ?? '') || !HASH.test(nonce ?? '')) {
    throw failure(
      'APR_PROVIDER_RESOURCE_INTEGRITY',
      'Provider-resource instance or nonce is invalid.'
    );
  }
}

function validateDescriptor(descriptor) {
  if (
    descriptor === null ||
    typeof descriptor !== 'object' ||
    Array.isArray(descriptor) ||
    (descriptor.concurrent !== undefined && typeof descriptor.concurrent !== 'boolean') ||
    (descriptor.resource_id !== null &&
      descriptor.resource_id !== undefined &&
      !validResourceId(descriptor.resource_id))
  ) {
    throw failure('APR_PROVIDER_RESOURCE_INTEGRITY', 'Provider-resource descriptor is malformed.');
  }
  const concurrent = descriptor.concurrent === true;
  if (!concurrent && !validResourceId(descriptor.resource_id)) {
    throw failure(
      'APR_PROVIDER_RESOURCE_ID_REQUIRED',
      'Exclusive automated provider use requires a stable nonsecret resource ID.'
    );
  }
  return concurrent;
}

export function providerResourceDigest({ userId, provider, resourceId } = {}) {
  if (!validUserId(userId) || !PROVIDER.test(provider ?? '') || !validResourceId(resourceId)) {
    throw failure(
      'APR_PROVIDER_RESOURCE_INTEGRITY',
      'Provider-resource digest input is incomplete or noncanonical.'
    );
  }
  return createHash('sha256')
    .update(JSON.stringify([RESOURCE_SCHEMA, userId, provider, resourceId]), 'utf8')
    .digest('hex');
}

function pathApi(platform) {
  return platform?.kind === 'win32' ? path.win32 : path.posix;
}

function providerPaths(platform, digest) {
  const paths = pathApi(platform);
  const root = platform?.cacheRoot;
  if (
    typeof root !== 'string' ||
    !root ||
    !paths.isAbsolute(root) ||
    paths.normalize(root) !== root
  ) {
    throw failure(
      'APR_PROVIDER_RESOURCE_INTEGRITY',
      'Provider-resource cache root is not a canonical absolute path.'
    );
  }
  const directories = Object.freeze([
    paths.join(root, 'ai-peer-review'),
    paths.join(root, 'ai-peer-review', 'provider-resources'),
    paths.join(root, 'ai-peer-review', 'provider-resources', digest),
  ]);
  return Object.freeze({
    directories,
    directory: directories.at(-1),
    lock: paths.join(directories.at(-1), 'resource.lock'),
    record: 'resource.json',
  });
}

function openAuthority(paths, platform) {
  if (typeof platform?.openPrivateDirectory !== 'function') {
    throw failure(
      'APR_PROVIDER_RESOURCE_INTEGRITY',
      'Provider-resource platform cannot open private directories.'
    );
  }
  const opened = [];
  try {
    for (const value of paths.directories) {
      const directory = platform.openPrivateDirectory(value);
      opened.push(directory);
      if (!directory.verify()) {
        throw failure(
          'APR_PROVIDER_RESOURCE_STALE',
          'Provider-resource directory ownership is indeterminate.'
        );
      }
    }
    const retained = opened.pop();
    for (const directory of opened) directory.close();
    return retained;
  } catch (error) {
    for (const directory of opened.reverse()) directory.close();
    throw error;
  }
}

function parseRecord(bytes, digest) {
  let value;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch {
    throw failure('APR_PROVIDER_RESOURCE_STALE', 'Provider-resource record is malformed.');
  }
  if (
    !exact(value, [
      'schema',
      'resource_digest',
      'owner_project_root_digest',
      'instance_id',
      'nonce_digest',
      'acquired_at',
      'heartbeat_at',
      'diagnostic_at',
    ]) ||
    value.schema !== RESOURCE_SCHEMA ||
    value.resource_digest !== digest ||
    !HASH.test(value.owner_project_root_digest ?? '') ||
    !HASH.test(value.instance_id ?? '') ||
    !HASH.test(value.nonce_digest ?? '') ||
    !instant(value.acquired_at) ||
    !instant(value.heartbeat_at) ||
    !instant(value.diagnostic_at)
  ) {
    throw failure(
      'APR_PROVIDER_RESOURCE_STALE',
      'Provider-resource record has an unknown schema or invalid evidence.'
    );
  }
  return Object.freeze(value);
}

function bytesFor(record) {
  return Buffer.from(JSON.stringify(record), 'utf8');
}

function validateProviderObservation(observation, expectedStatus, resourceId, platform) {
  if (
    !exact(observation, ['status', 'resource_id', 'observed_at']) ||
    observation.resource_id !== resourceId ||
    !freshObservation(observation.observed_at, platform)
  ) {
    throw failure(
      'APR_PROVIDER_RESOURCE_STALE',
      'Provider-resource live observation is missing, stale, or mismatched.'
    );
  }
  if (observation.status === 'busy') {
    throw failure('APR_PROVIDER_RESOURCE_BUSY', 'The provider resource is busy.');
  }
  if (observation.status !== expectedStatus) {
    throw failure(
      'APR_PROVIDER_RESOURCE_STALE',
      'Provider-resource live observation is indeterminate.'
    );
  }
  return observation;
}

function concurrentLease(platform) {
  let released = false;
  let sessionHandle = null;
  function observe(value, statuses) {
    if (released)
      throw failure('APR_PROVIDER_RESOURCE_STALE', 'Provider session lease is released.');
    if (
      !exact(value, ['status', 'session_handle', 'observed_at']) ||
      typeof value.session_handle !== 'string' ||
      !value.session_handle.trim() ||
      value.session_handle !== value.session_handle.trim() ||
      !freshObservation(value.observed_at, platform)
    ) {
      throw failure(
        'APR_PROVIDER_RESOURCE_STALE',
        'Concurrent provider session evidence is missing, stale, or malformed.'
      );
    }
    if (value.status === 'busy')
      throw failure('APR_PROVIDER_RESOURCE_BUSY', 'The provider session is busy.');
    if (!statuses.has(value.status))
      throw failure('APR_PROVIDER_RESOURCE_STALE', 'Provider session state is indeterminate.');
    if (sessionHandle !== null && value.session_handle !== sessionHandle) {
      throw failure('APR_PROVIDER_RESOURCE_STALE', 'Provider session handle changed.');
    }
    sessionHandle = value.session_handle;
  }
  return Object.freeze({
    concurrent: true,
    resourceDigest: null,
    record: null,
    beforeDelivery(observation) {
      observe(observation, new Set(['ready']));
      return true;
    },
    release(reconciliation) {
      observe(reconciliation, RELEASED);
      released = true;
      return true;
    },
    releaseUnused() {
      if (released || sessionHandle !== null)
        throw failure('APR_PROVIDER_RESOURCE_STALE', 'Provider session lease was already used.');
      released = true;
      return true;
    },
  });
}

function mapLockError(error) {
  if (
    error?.code === 'APR_BROKER_OWNED' ||
    error?.code === 'APR_PROVIDER_RESOURCE_BUSY' ||
    error?.code === 'EAGAIN' ||
    error?.code === 'EACCES'
  ) {
    return failure('APR_PROVIDER_RESOURCE_BUSY', 'The provider resource is already owned.');
  }
  return error;
}

function exclusiveLease({ identity, descriptor, instanceId, nonce }, platform) {
  const digest = providerResourceDigest({
    userId: identity.userId,
    provider: identity.provider,
    resourceId: descriptor.resource_id,
  });
  const paths = providerPaths(platform, digest);
  const directory = openAuthority(paths, platform);
  const nonceDigest = createHash('sha256').update(nonce, 'utf8').digest('hex');
  let lock = null;
  let record = null;
  let recordBytes = null;
  let fenced = false;
  let released = false;
  let used = false;

  function stale(message) {
    fenced = true;
    throw failure('APR_PROVIDER_RESOURCE_STALE', message);
  }

  function verifyOwned() {
    if (fenced || released) stale('Provider-resource lease is fenced or released.');
    try {
      const persisted = directory.read(paths.record);
      if (
        !directory.verify() ||
        !lock.verify() ||
        persisted === null ||
        !Buffer.from(persisted).equals(recordBytes)
      ) {
        stale('Provider-resource ownership evidence changed.');
      }
    } catch (error) {
      if (error?.code?.startsWith('APR_PROVIDER_RESOURCE_')) throw error;
      stale('Provider-resource ownership evidence is unreadable.');
    }
  }

  function replaceRecord(next) {
    verifyOwned();
    const nextBytes = bytesFor(next);
    try {
      if (directory.remove(paths.record, recordBytes) !== true) {
        stale('Provider-resource record could not be removed exactly.');
      }
      directory.create(paths.record, nextBytes);
      const persisted = directory.read(paths.record);
      if (!persisted || !Buffer.from(persisted).equals(nextBytes)) {
        stale('Provider-resource record replacement could not be verified.');
      }
      record = Object.freeze(next);
      recordBytes = nextBytes;
    } catch (error) {
      if (error?.code?.startsWith('APR_PROVIDER_RESOURCE_')) throw error;
      stale('Provider-resource record replacement failed.');
    }
  }

  try {
    if (typeof platform?.acquireExclusive !== 'function') {
      throw failure(
        'APR_PROVIDER_RESOURCE_INTEGRITY',
        'Provider-resource platform cannot acquire an OS lock.'
      );
    }
    try {
      lock = platform.acquireExclusive(paths.lock, { instanceId, nonceDigest });
    } catch (error) {
      throw mapLockError(error);
    }
    if (!directory.verify() || !lock.verify()) {
      throw failure(
        'APR_PROVIDER_RESOURCE_STALE',
        'Provider-resource OS ownership is indeterminate.'
      );
    }
    const priorBytes = directory.read(paths.record);
    let prior = null;
    if (priorBytes !== null) {
      prior = parseRecord(priorBytes, digest);
      if (
        prior.owner_project_root_digest !== identity.digest ||
        prior.instance_id !== instanceId ||
        prior.nonce_digest !== nonceDigest
      ) {
        throw failure(
          'APR_PROVIDER_RESOURCE_STALE',
          'Foreign provider-resource evidence requires explicit recovery.'
        );
      }
    }
    if (typeof platform?.reconcileProviderResource !== 'function') {
      throw failure(
        'APR_PROVIDER_RESOURCE_STALE',
        'Provider-resource acquisition requires live provider reconciliation.'
      );
    }
    validateProviderObservation(
      platform.reconcileProviderResource({
        resourceDigest: digest,
        resourceId: descriptor.resource_id,
        identity,
        prior,
      }),
      'available',
      descriptor.resource_id,
      platform
    );
    if (prior !== null) {
      record = prior;
      recordBytes = Buffer.from(priorBytes);
    } else {
      const acquiredAt = now(platform);
      record = Object.freeze({
        schema: RESOURCE_SCHEMA,
        resource_digest: digest,
        owner_project_root_digest: identity.digest,
        instance_id: instanceId,
        nonce_digest: nonceDigest,
        acquired_at: acquiredAt,
        heartbeat_at: acquiredAt,
        diagnostic_at: acquiredAt,
      });
      recordBytes = bytesFor(record);
      directory.create(paths.record, recordBytes);
    }
    verifyOwned();
  } catch (error) {
    lock?.abandon();
    directory.close();
    throw error;
  }

  return Object.freeze({
    concurrent: false,
    resourceDigest: digest,
    get record() {
      return record;
    },
    beforeDelivery(observation) {
      verifyOwned();
      const valid = validateProviderObservation(
        observation,
        'exclusive',
        descriptor.resource_id,
        platform
      );
      replaceRecord({
        ...record,
        heartbeat_at: valid.observed_at,
        diagnostic_at: valid.observed_at,
      });
      used = true;
      return true;
    },
    releaseUnused() {
      verifyOwned();
      if (used)
        throw failure('APR_PROVIDER_RESOURCE_STALE', 'Provider-resource lease was already used.');
      const observed = validateProviderObservation(
        platform.reconcileProviderResource({
          resourceDigest: digest,
          resourceId: descriptor.resource_id,
          identity,
          prior: record,
        }),
        'available',
        descriptor.resource_id,
        platform
      );
      return this.release({ ...observed, status: 'reconciled-recovery' });
    },
    release(reconciliation) {
      verifyOwned();
      if (
        !exact(reconciliation, ['status', 'resource_id', 'observed_at']) ||
        reconciliation.resource_id !== descriptor.resource_id ||
        !freshObservation(reconciliation.observed_at, platform) ||
        !RELEASED.has(reconciliation.status)
      ) {
        throw failure(
          'APR_PROVIDER_RESOURCE_STALE',
          'Provider-resource release requires completed or reconciled work.'
        );
      }
      if (directory.remove(paths.record, recordBytes) !== true) {
        stale('Provider-resource release could not remove the exact owned record.');
      }
      const lockReleased = lock.release();
      released = true;
      directory.close();
      if (!lockReleased) {
        throw failure(
          'APR_PROVIDER_RESOURCE_STALE',
          'Provider-resource OS lock release could not be verified.'
        );
      }
      return true;
    },
  });
}

export function acquireProviderResource(
  { identity, descriptor, instanceId, nonce } = {},
  platform
) {
  validateIdentity(identity);
  validateOperatingSystemUser(identity, platform);
  validateInstance(instanceId, nonce);
  const concurrent = validateDescriptor(descriptor);
  return concurrent
    ? concurrentLease(platform)
    : exclusiveLease({ identity, descriptor, instanceId, nonce }, platform);
}
