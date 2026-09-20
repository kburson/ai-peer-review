import assert from 'node:assert/strict';
import test from 'node:test';

import {
  acquireProviderResource,
  providerResourceDigest,
} from '../../src/broker/provider-resources.mjs';

const NOW = '2026-09-20T12:00:00.000Z';
const descriptor = { concurrent: false, resource_id: 'shared-desktop' };
const instanceA = 'a'.repeat(64);
const instanceB = 'b'.repeat(64);
const nonceA = 'c'.repeat(64);
const nonceB = 'd'.repeat(64);

function sharedPlatform() {
  let directories = new Map();
  let locks = new Map();
  const orphanedLocks = [];
  let providerStatus = 'available';
  let now = NOW;
  const directoryFor = (value) => {
    if (!directories.has(value)) directories.set(value, { valid: true, files: new Map() });
    return directories.get(value);
  };
  const platform = {
    kind: 'linux',
    cacheRoot: '/users/501/cache',
    userId: () => '501',
    providerObservationMaxAgeMs: 5_000,
    now: () => now,
    reconcileProviderResource: ({ resourceId }) => ({
      status: providerStatus,
      resource_id: resourceId,
      observed_at: now,
    }),
    openPrivateDirectory(value) {
      const state = directoryFor(value);
      let closed = false;
      return Object.freeze({
        verify: () => !closed && state.valid,
        read: (name) => state.files.get(name) ?? null,
        create: (name, bytes) => {
          if (!state.valid || state.files.has(name)) throw new Error('create refused');
          state.files.set(name, Buffer.from(bytes));
          return true;
        },
        remove: (name, bytes) => {
          const current = state.files.get(name);
          if (!state.valid || !current || !current.equals(Buffer.from(bytes))) return false;
          state.files.delete(name);
          return true;
        },
        close: () => {
          closed = true;
        },
      });
    },
    acquireExclusive(value, proof) {
      if (locks.has(value)) throw Object.assign(new Error('owned'), { code: 'APR_BROKER_OWNED' });
      const state = { active: true, value };
      locks.set(value, state);
      return Object.freeze({
        ...proof,
        verify: () => state.active,
        release: () => {
          if (!state.active) return false;
          state.active = false;
          if (locks.get(value) === state) locks.delete(value);
          return true;
        },
        abandon: () => {
          state.active = false;
          if (locks.get(value) === state) locks.delete(value);
        },
      });
    },
  };
  return {
    platform,
    setProviderStatus: (value) => {
      providerStatus = value;
    },
    setNow: (value) => {
      now = value;
    },
    deleteCache() {
      for (const state of directories.values()) state.valid = false;
      orphanedLocks.push(...locks.values());
      directories = new Map();
      locks = new Map();
    },
    seedRecord(resourceDigest, value) {
      const directory = `/users/501/cache/ai-peer-review/provider-resources/${resourceDigest}`;
      directoryFor(directory).files.set('resource.json', Buffer.from(JSON.stringify(value)));
    },
    lockCount: () => locks.size + orphanedLocks.filter((lock) => lock.active).length,
  };
}

function identity(projectDigest, packageVersion, protocolVersion) {
  return {
    userId: '501',
    provider: 'anthropic',
    digest: projectDigest,
    packageVersion,
    protocolVersion,
  };
}

function acquire(f, owner, instanceId, nonce) {
  return acquireProviderResource({ identity: owner, descriptor, instanceId, nonce }, f.platform);
}

function complete(lease) {
  return lease.release({
    status: 'complete',
    resource_id: descriptor.resource_id,
    observed_at: NOW,
  });
}

test('different projects and versions contend on one user/provider/resource digest', () => {
  const f = sharedPlatform();
  const projectA = identity('1'.repeat(64), '0.2.2', 1);
  const projectB = identity('2'.repeat(64), '9.0.0', 17);
  const first = acquire(f, projectA, instanceA, nonceA);
  assert.equal(
    first.resourceDigest,
    providerResourceDigest({
      userId: '501',
      provider: 'anthropic',
      resourceId: descriptor.resource_id,
    })
  );
  assert.throws(() => acquire(f, projectB, instanceB, nonceB), {
    code: 'APR_PROVIDER_RESOURCE_BUSY',
  });
  assert.equal(complete(first), true);
  const second = acquire(f, projectB, instanceB, nonceB);
  assert.equal(complete(second), true);
});

test('cache deletion cannot authorize a second project while provider state is live', () => {
  const f = sharedPlatform();
  const first = acquire(f, identity('1'.repeat(64), '0.2.2', 1), instanceA, nonceA);
  f.deleteCache();
  f.setProviderStatus('busy');
  assert.throws(() => acquire(f, identity('2'.repeat(64), '9.0.0', 17), instanceB, nonceB), {
    code: 'APR_PROVIDER_RESOURCE_BUSY',
  });
  assert.throws(
    () =>
      first.beforeDelivery({
        status: 'exclusive',
        resource_id: descriptor.resource_id,
        observed_at: NOW,
      }),
    { code: 'APR_PROVIDER_RESOURCE_STALE' }
  );
  assert.equal(f.lockCount(), 1);
});

test('expired heartbeat and foreign record never permit lock theft', () => {
  const f = sharedPlatform();
  const digest = providerResourceDigest({
    userId: '501',
    provider: 'anthropic',
    resourceId: descriptor.resource_id,
  });
  f.seedRecord(digest, {
    schema: 'ai-peer-review.provider-resource/v1',
    resource_digest: digest,
    owner_project_root_digest: '1'.repeat(64),
    instance_id: instanceA,
    nonce_digest: 'e'.repeat(64),
    acquired_at: '2025-01-01T00:00:00.000Z',
    heartbeat_at: '2025-01-01T00:00:00.000Z',
    diagnostic_at: '2025-01-01T00:00:00.000Z',
  });
  assert.throws(() => acquire(f, identity('2'.repeat(64), '9.0.0', 17), instanceB, nonceB), {
    code: 'APR_PROVIDER_RESOURCE_STALE',
  });
  assert.equal(f.lockCount(), 0);
});

test('unknown and malformed records fail closed across versions', () => {
  for (const record of [
    { schema: 'ai-peer-review.provider-resource/v2' },
    { schema: 'ai-peer-review.provider-resource/v1', resource_digest: 'bad' },
  ]) {
    const f = sharedPlatform();
    const digest = providerResourceDigest({
      userId: '501',
      provider: 'anthropic',
      resourceId: descriptor.resource_id,
    });
    f.seedRecord(digest, record);
    assert.throws(() => acquire(f, identity('2'.repeat(64), '9.0.0', 17), instanceB, nonceB), {
      code: 'APR_PROVIDER_RESOURCE_STALE',
    });
    assert.equal(f.lockCount(), 0);
  }
});

test('unresolved outcome keeps ownership durable until recovery is reconciled', () => {
  const f = sharedPlatform();
  const first = acquire(f, identity('1'.repeat(64), '0.2.2', 1), instanceA, nonceA);
  assert.throws(
    () =>
      first.release({
        status: 'unresolved',
        resource_id: descriptor.resource_id,
        observed_at: NOW,
      }),
    { code: 'APR_PROVIDER_RESOURCE_STALE' }
  );
  assert.throws(() => acquire(f, identity('2'.repeat(64), '9.0.0', 17), instanceB, nonceB), {
    code: 'APR_PROVIDER_RESOURCE_BUSY',
  });
  assert.equal(
    first.release({
      status: 'reconciled-recovery',
      resource_id: descriptor.resource_id,
      observed_at: NOW,
    }),
    true
  );
  const second = acquire(f, identity('2'.repeat(64), '9.0.0', 17), instanceB, nonceB);
  assert.equal(complete(second), true);
});

test('busy provider observation immediately before delivery refuses use', () => {
  const f = sharedPlatform();
  const lease = acquire(f, identity('1'.repeat(64), '0.2.2', 1), instanceA, nonceA);
  assert.throws(
    () =>
      lease.beforeDelivery({
        status: 'busy',
        resource_id: descriptor.resource_id,
        observed_at: NOW,
      }),
    { code: 'APR_PROVIDER_RESOURCE_BUSY' }
  );
  assert.equal(complete(lease), true);
});
