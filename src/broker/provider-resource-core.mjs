// @story #188
import { createHash } from 'node:crypto';
import path from 'node:path';

// Explicit protocol ports and returned leases are unverified; production supplies fixed C1/C3 ports.
import { AprError } from '../errors.mjs';

const RESOURCE_SCHEMA = 'ai-peer-review.provider-resource/v1';
const HASH = /^[a-f0-9]{64}$/;
const PROVIDER = /^[a-z][a-z0-9._-]{0,63}$/;
const RESOURCE_ID = /^[\x21-\x7e]{1,256}$/;
const RELEASED = new Set(['complete', 'reconciled-recovery']);
// Strong references preserve unresolved protocol handles; error metadata alone
// cannot carry descriptor or election cleanup authority.
const retainedAcquisitions = new Set();

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

async function validateOperatingSystemUser(identity, platform) {
  let observed;
  try {
    observed = await platform?.userId?.();
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

async function openAuthority(paths, platform) {
  if (typeof platform?.openPrivateDirectory !== 'function') {
    throw failure(
      'APR_PROVIDER_RESOURCE_INTEGRITY',
      'Provider-resource platform cannot open private directories.'
    );
  }
  const opened = [];
  try {
    for (const value of paths.directories) {
      const directory = await platform.openPrivateDirectory(value);
      opened.push(directory);
      if (!(await directory.verify())) {
        throw failure(
          'APR_PROVIDER_RESOURCE_STALE',
          'Provider-resource directory ownership is indeterminate.'
        );
      }
    }
    const retained = opened.pop();
    for (const directory of opened) await directory.close();
    return retained;
  } catch (error) {
    for (const directory of opened.reverse()) await directory.close();
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

function serializedProtocolLease(protocol) {
  let busy = false;
  const descriptors = Object.getOwnPropertyDescriptors(protocol);
  for (const [name, descriptor] of Object.entries(descriptors)) {
    if (name === 'assertDeliveryFresh') continue;
    if (typeof descriptor.value !== 'function') continue;
    const method = descriptor.value;
    descriptor.value = async (...args) => {
      if (busy)
        throw failure(
          'APR_PROVIDER_RESOURCE_STALE',
          'Provider-resource operation is already active.'
        );
      busy = true;
      try {
        return await method.apply(protocol, args);
      } finally {
        busy = false;
      }
    };
  }
  return Object.freeze(Object.defineProperties({}, descriptors));
}

function concurrentLease(platform) {
  let released = false;
  let sessionHandle = null;
  let lastObservation = null;
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
  return serializedProtocolLease(
    Object.freeze({
      verified: false,
      concurrent: true,
      resourceDigest: null,
      record: null,
      assertDeliveryFresh() {
        if (!lastObservation)
          throw failure(
            'APR_PROVIDER_RESOURCE_STALE',
            'No provider delivery observation was checked.'
          );
        observe(lastObservation, new Set(['ready']));
        return true;
      },
      async beforeDelivery(observation) {
        observation = Object.freeze({ ...observation });
        observe(observation, new Set(['ready']));
        lastObservation = observation;
        return true;
      },
      async release(reconciliation) {
        observe(reconciliation, RELEASED);
        released = true;
        return true;
      },
      async releaseUnused() {
        if (released || sessionHandle !== null)
          throw failure('APR_PROVIDER_RESOURCE_STALE', 'Provider session lease was already used.');
        released = true;
        return true;
      },
    })
  );
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

async function exclusiveLease({ identity, descriptor, instanceId, nonce }, platform) {
  const digest = providerResourceDigest({
    userId: identity.userId,
    provider: identity.provider,
    resourceId: descriptor.resource_id,
  });
  const paths = providerPaths(platform, digest);
  const directory = await openAuthority(paths, platform);
  const nonceDigest = createHash('sha256').update(nonce, 'utf8').digest('hex');
  let lock = null;
  let record = null;
  let recordBytes = null;
  let fenced = false;
  let released = false;
  let used = false;
  let lastObservation = null;
  let obligations = [];
  let publicationAttempted = false;

  function stale(message) {
    fenced = true;
    throw failure('APR_PROVIDER_RESOURCE_STALE', message);
  }

  async function verifyOwned() {
    if (fenced || released) stale('Provider-resource lease is fenced or released.');
    try {
      const persisted = await directory.read(paths.record);
      if (
        !(await directory.verify()) ||
        !(await lock.verify()) ||
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

  async function replaceRecord(next) {
    await verifyOwned();
    const nextBytes = bytesFor(next);
    try {
      if (
        typeof directory.replace !== 'function' ||
        (await directory.replace(paths.record, recordBytes, nextBytes)) !== true
      ) {
        stale('Provider-resource record could not be replaced exactly.');
      }
      const persisted = await directory.read(paths.record);
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
      lock = await platform.acquireExclusive(paths.lock, { instanceId, nonceDigest });
    } catch (error) {
      throw mapLockError(error);
    }
    if (!(await directory.verify()) || !(await lock.verify())) {
      throw failure(
        'APR_PROVIDER_RESOURCE_STALE',
        'Provider-resource OS ownership is indeterminate.'
      );
    }
    const priorBytes = await directory.read(paths.record);
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
      await platform.reconcileProviderResource({
        resourceDigest: digest,
        resourceId: descriptor.resource_id,
        identity,
        prior,
      }),
      'available',
      descriptor.resource_id,
      platform
    );
    if (!(await directory.verify()) || !(await lock.verify())) {
      throw failure(
        'APR_PROVIDER_RESOURCE_STALE',
        'Provider-resource ownership changed during reconciliation.'
      );
    }
    const currentBytes = await directory.read(paths.record);
    if (
      (priorBytes === null) !== (currentBytes === null) ||
      (priorBytes !== null && !Buffer.from(currentBytes).equals(Buffer.from(priorBytes)))
    ) {
      throw failure(
        'APR_PROVIDER_RESOURCE_STALE',
        'Provider-resource record changed during reconciliation.'
      );
    }
    if (!(await directory.verify()) || !(await lock.verify())) {
      throw failure(
        'APR_PROVIDER_RESOURCE_STALE',
        'Provider-resource ownership changed before publication.'
      );
    }
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
      publicationAttempted = true;
      await directory.create(paths.record, recordBytes);
    }
    await verifyOwned();
  } catch (error) {
    if (publicationAttempted || recordBytes !== null) {
      const outstandingObligations = [
        {
          name: 'provider-resource',
          resourceDigest: digest,
          instanceId,
          nonceDigest,
          reason: 'publication-unproved',
        },
      ];
      retainedAcquisitions.add({ directory, lock, recordBytes, outstandingObligations });
      error.details = { ...error.details, outstandingObligations };
      throw error;
    }
    try {
      await lock?.abandon();
      await directory.close();
    } catch (cleanup) {
      const outstandingObligations = [
        {
          name: 'provider-resource',
          resourceDigest: digest,
          instanceId,
          nonceDigest,
          reason: 'acquisition-cleanup-unproved',
        },
      ];
      retainedAcquisitions.add({ directory, lock, outstandingObligations });
      error.cause = cleanup;
      error.details = { ...error.details, outstandingObligations };
    }
    throw error;
  }

  return serializedProtocolLease(
    Object.freeze({
      verified: false,
      concurrent: false,
      resourceDigest: digest,
      get record() {
        return record;
      },
      get outstandingObligations() {
        return Object.freeze(obligations.map((item) => Object.freeze({ ...item })));
      },
      assertDeliveryFresh() {
        if (fenced || released || !lastObservation)
          throw failure(
            'APR_PROVIDER_RESOURCE_STALE',
            'Provider delivery observation is unavailable.'
          );
        validateProviderObservation(lastObservation, 'exclusive', descriptor.resource_id, platform);
        return true;
      },
      async beforeDelivery(observation) {
        observation = Object.freeze({ ...observation });
        await verifyOwned();
        const valid = validateProviderObservation(
          observation,
          'exclusive',
          descriptor.resource_id,
          platform
        );
        await replaceRecord({
          ...record,
          heartbeat_at: valid.observed_at,
          diagnostic_at: valid.observed_at,
        });
        validateProviderObservation(valid, 'exclusive', descriptor.resource_id, platform);
        lastObservation = valid;
        used = true;
        return true;
      },
      async releaseUnused() {
        await verifyOwned();
        if (used)
          throw failure('APR_PROVIDER_RESOURCE_STALE', 'Provider-resource lease was already used.');
        const observed = validateProviderObservation(
          await platform.reconcileProviderResource({
            resourceDigest: digest,
            resourceId: descriptor.resource_id,
            identity,
            prior: record,
          }),
          'available',
          descriptor.resource_id,
          platform
        );
        return await this.release({ ...observed, status: 'reconciled-recovery' });
      },
      async release(reconciliation) {
        await verifyOwned();
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
        if ((await directory.remove(paths.record, recordBytes)) !== true) {
          stale('Provider-resource release could not remove the exact owned record.');
        }
        let lockReleased;
        try {
          lockReleased = await lock.release();
          if (lockReleased !== true) throw new Error('withdrawal-unproved');
        } catch {
          obligations = [
            {
              name: 'provider-resource',
              resourceDigest: digest,
              instanceId,
              nonceDigest,
              reason: 'withdrawal-unproved',
            },
          ];
          // A failed withdrawal is not completion. Restore only an absent exact
          // record; never overwrite another generation during cleanup.
          try {
            const current = await directory.read(paths.record);
            if (current === null && (await directory.verify()) && (await lock.verify()))
              await directory.create(paths.record, recordBytes);
          } catch {
            obligations.push({
              name: 'provider-resource',
              resourceDigest: digest,
              reason: 'record-retention-unproved',
            });
          }
          fenced = true;
          throw failure(
            'APR_PROVIDER_RESOURCE_STALE',
            'Provider-resource election withdrawal could not be verified.',
            { outstandingObligations: obligations }
          );
        }
        released = true;
        await directory.close();
        return true;
      },
    })
  );
}

export async function acquireProviderResourceCore(
  { identity, descriptor, instanceId, nonce } = {},
  platform
) {
  validateIdentity(identity);
  validateInstance(instanceId, nonce);
  const concurrent = validateDescriptor(descriptor);
  identity = Object.freeze({ ...identity });
  descriptor = Object.freeze({ ...descriptor });
  await validateOperatingSystemUser(identity, platform);
  return concurrent
    ? concurrentLease(platform)
    : exclusiveLease({ identity, descriptor, instanceId, nonce }, platform);
}
