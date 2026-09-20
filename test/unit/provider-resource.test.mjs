import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  acquireProviderResource,
  providerResourceDigest,
} from '../../src/broker/provider-resources.mjs';

const NOW = '2026-09-20T12:00:00.000Z';
const identity = {
  userId: '501',
  provider: 'anthropic',
  digest: 'a'.repeat(64),
  packageVersion: '0.2.2',
  protocolVersion: 1,
};
const descriptor = { concurrent: false, resource_id: 'desktop-surface-1' };
const instanceId = 'b'.repeat(64);
const nonce = 'c'.repeat(64);

function fixture() {
  const directories = new Map();
  const locks = new Map();
  const opened = [];
  const directoryFor = (value) => {
    if (!directories.has(value)) directories.set(value, { valid: true, files: new Map() });
    return directories.get(value);
  };
  const platform = {
    kind: 'linux',
    cacheRoot: '/cache',
    userId: () => '501',
    now: () => NOW,
    providerObservationMaxAgeMs: 5_000,
    reconcileProviderResource: ({ resourceId }) => ({
      status: 'available',
      resource_id: resourceId,
      observed_at: NOW,
    }),
    openPrivateDirectory(value) {
      opened.push(value);
      const state = directoryFor(value);
      let closed = false;
      return Object.freeze({
        verify: () => !closed && state.valid,
        read: (name) => state.files.get(name) ?? null,
        create: (name, bytes) => {
          if (state.files.has(name)) throw new Error('exists');
          state.files.set(name, Buffer.from(bytes));
          return true;
        },
        remove: (name, bytes) => {
          const current = state.files.get(name);
          if (!current || !current.equals(Buffer.from(bytes))) return false;
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
      const state = { active: true };
      locks.set(value, state);
      return Object.freeze({
        ...proof,
        verify: () => state.active,
        release: () => {
          if (!state.active) return false;
          state.active = false;
          locks.delete(value);
          return true;
        },
        abandon: () => {
          state.active = false;
          locks.delete(value);
        },
      });
    },
  };
  return {
    platform,
    opened,
    locks,
    files: (value) => directoryFor(value).files,
  };
}

test('resource digest excludes project and package versions', () => {
  const input = { userId: '501', provider: 'anthropic', resourceId: 'desktop-surface-1' };
  const expected = createHash('sha256')
    .update(
      JSON.stringify([
        'ai-peer-review.provider-resource/v1',
        '501',
        'anthropic',
        'desktop-surface-1',
      ]),
      'utf8'
    )
    .digest('hex');
  assert.equal(providerResourceDigest(input), expected);
  assert.equal(
    providerResourceDigest({ ...input, projectDigest: 'd'.repeat(64), packageVersion: '99.0.0' }),
    expected
  );
});

test('resource digest rejects noncanonical or missing identity parts', () => {
  for (const value of [
    { userId: '', provider: 'anthropic', resourceId: 'surface' },
    { userId: '501', provider: 'Anthropic', resourceId: 'surface' },
    { userId: '501', provider: 'anthropic', resourceId: '' },
    { userId: '501', provider: 'anthropic', resourceId: 'secret with spaces' },
  ]) {
    assert.throws(() => providerResourceDigest(value), {
      code: 'APR_PROVIDER_RESOURCE_INTEGRITY',
    });
  }
});

test('provider resource schema closes every persisted field', () => {
  const schema = JSON.parse(
    readFileSync(new URL('../../schemas/provider-resource-v1.json', import.meta.url), 'utf8')
  );
  assert.equal(schema.$id, 'ai-peer-review.provider-resource/v1');
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required, [
    'schema',
    'resource_digest',
    'owner_project_root_digest',
    'instance_id',
    'nonce_digest',
    'acquired_at',
    'heartbeat_at',
    'diagnostic_at',
  ]);
});

test('exclusive lease persists only digests and verifies provider state before delivery', () => {
  const f = fixture();
  const lease = acquireProviderResource({ identity, descriptor, instanceId, nonce }, f.platform);
  const digest = providerResourceDigest({
    userId: identity.userId,
    provider: identity.provider,
    resourceId: descriptor.resource_id,
  });
  assert.equal(lease.concurrent, false);
  assert.equal(lease.resourceDigest, digest);
  assert.deepEqual(f.opened, [
    '/cache/ai-peer-review',
    '/cache/ai-peer-review/provider-resources',
    `/cache/ai-peer-review/provider-resources/${digest}`,
  ]);
  assert.deepEqual(lease.record, {
    schema: 'ai-peer-review.provider-resource/v1',
    resource_digest: digest,
    owner_project_root_digest: identity.digest,
    instance_id: instanceId,
    nonce_digest: createHash('sha256').update(nonce, 'utf8').digest('hex'),
    acquired_at: NOW,
    heartbeat_at: NOW,
    diagnostic_at: NOW,
  });
  assert.equal(JSON.stringify(lease.record).includes(nonce), false);
  assert.equal(
    lease.beforeDelivery({
      status: 'exclusive',
      resource_id: descriptor.resource_id,
      observed_at: NOW,
    }),
    true
  );
});

test('exclusive lease refuses missing resource identity, stale observation and unresolved release', () => {
  const f = fixture();
  assert.throws(
    () =>
      acquireProviderResource(
        { identity, descriptor: { concurrent: false, resource_id: null }, instanceId, nonce },
        f.platform
      ),
    { code: 'APR_PROVIDER_RESOURCE_ID_REQUIRED' }
  );
  const lease = acquireProviderResource({ identity, descriptor, instanceId, nonce }, f.platform);
  assert.throws(
    () =>
      lease.beforeDelivery({
        status: 'exclusive',
        resource_id: descriptor.resource_id,
        observed_at: '2026-09-20T11:59:00.000Z',
      }),
    { code: 'APR_PROVIDER_RESOURCE_STALE' }
  );
  assert.throws(
    () =>
      lease.release({
        status: 'unresolved',
        resource_id: descriptor.resource_id,
        observed_at: NOW,
      }),
    { code: 'APR_PROVIDER_RESOURCE_STALE' }
  );
  assert.equal(f.locks.size, 1);
  assert.throws(
    () =>
      lease.release({
        status: 'reconciled-recovery',
        resource_id: descriptor.resource_id,
        observed_at: '2000-01-01T00:00:00.000Z',
      }),
    { code: 'APR_PROVIDER_RESOURCE_STALE' }
  );
  assert.throws(
    () =>
      lease.release({
        status: 'reconciled-recovery',
        resource_id: descriptor.resource_id,
        observed_at: '2026-09-20T12:00:00.001Z',
      }),
    { code: 'APR_PROVIDER_RESOURCE_STALE' }
  );
  assert.equal(f.locks.size, 1);
  assert.equal(
    lease.release({
      status: 'reconciled-recovery',
      resource_id: descriptor.resource_id,
      observed_at: '2026-09-20T11:59:55.000Z',
    }),
    true
  );
  assert.equal(f.locks.size, 0);
});

test('acquisition binds caller identity to the actual operating-system user', () => {
  const mismatch = fixture();
  mismatch.platform.userId = () => '502';
  assert.throws(
    () => acquireProviderResource({ identity, descriptor, instanceId, nonce }, mismatch.platform),
    { code: 'APR_PROVIDER_RESOURCE_INTEGRITY' }
  );
  const unavailable = fixture();
  delete unavailable.platform.userId;
  assert.throws(
    () =>
      acquireProviderResource({ identity, descriptor, instanceId, nonce }, unavailable.platform),
    { code: 'APR_PROVIDER_RESOURCE_INTEGRITY' }
  );
  assert.equal(mismatch.opened.length, 0);
  assert.equal(unavailable.opened.length, 0);
});

test('concurrent adapter retains an exact session handle without claiming a shared lock', () => {
  const f = fixture();
  const lease = acquireProviderResource(
    {
      identity,
      descriptor: { concurrent: true, resource_id: null },
      instanceId,
      nonce,
    },
    f.platform
  );
  assert.equal(lease.concurrent, true);
  assert.equal(lease.resourceDigest, null);
  assert.equal(f.opened.length, 0);
  assert.equal(
    lease.beforeDelivery({
      status: 'ready',
      session_handle: 'claude-session-123',
      observed_at: NOW,
    }),
    true
  );
  assert.throws(
    () =>
      lease.release({
        status: 'complete',
        session_handle: 'other-session',
        observed_at: NOW,
      }),
    { code: 'APR_PROVIDER_RESOURCE_STALE' }
  );
  assert.equal(
    lease.release({
      status: 'complete',
      session_handle: 'claude-session-123',
      observed_at: NOW,
    }),
    true
  );
});

test('desktop-style descriptors default to exclusive and fail closed without an ID', () => {
  const f = fixture();
  assert.throws(
    () =>
      acquireProviderResource(
        { identity, descriptor: { resource_id: null }, instanceId, nonce },
        f.platform
      ),
    { code: 'APR_PROVIDER_RESOURCE_ID_REQUIRED' }
  );
});
