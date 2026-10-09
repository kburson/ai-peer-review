import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as providerResourceModule from '../../src/broker/provider-resources.mjs';

import {
  acquireProviderResourceCore as acquireProviderResource,
  acquireProviderResource as acquireOperationalProviderResource,
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
        replace: (name, expected, next) => {
          const current = state.files.get(name);
          if (!state.valid || !current || !current.equals(Buffer.from(expected))) return false;
          state.files.set(name, Buffer.from(next));
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

test('exclusive lease persists only digests and verifies provider state before delivery', async () => {
  const f = fixture();
  const lease = await acquireProviderResource(
    { identity, descriptor, instanceId, nonce },
    f.platform
  );
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
    await lease.beforeDelivery({
      status: 'exclusive',
      resource_id: descriptor.resource_id,
      observed_at: NOW,
    }),
    true
  );
});

test('exclusive lease refuses missing resource identity, stale observation and unresolved release', async () => {
  const f = fixture();
  await assert.rejects(
    async () =>
      await acquireProviderResource(
        { identity, descriptor: { concurrent: false, resource_id: null }, instanceId, nonce },
        f.platform
      ),
    { code: 'APR_PROVIDER_RESOURCE_ID_REQUIRED' }
  );
  const lease = await acquireProviderResource(
    { identity, descriptor, instanceId, nonce },
    f.platform
  );
  await assert.rejects(
    async () =>
      await lease.beforeDelivery({
        status: 'exclusive',
        resource_id: descriptor.resource_id,
        observed_at: '2026-09-20T11:59:00.000Z',
      }),
    { code: 'APR_PROVIDER_RESOURCE_STALE' }
  );
  await assert.rejects(
    async () =>
      await lease.release({
        status: 'unresolved',
        resource_id: descriptor.resource_id,
        observed_at: NOW,
      }),
    { code: 'APR_PROVIDER_RESOURCE_STALE' }
  );
  assert.equal(f.locks.size, 1);
  await assert.rejects(
    async () =>
      await lease.release({
        status: 'reconciled-recovery',
        resource_id: descriptor.resource_id,
        observed_at: '2000-01-01T00:00:00.000Z',
      }),
    { code: 'APR_PROVIDER_RESOURCE_STALE' }
  );
  await assert.rejects(
    async () =>
      await lease.release({
        status: 'reconciled-recovery',
        resource_id: descriptor.resource_id,
        observed_at: '2026-09-20T12:00:00.001Z',
      }),
    { code: 'APR_PROVIDER_RESOURCE_STALE' }
  );
  assert.equal(f.locks.size, 1);
  assert.equal(
    await lease.release({
      status: 'reconciled-recovery',
      resource_id: descriptor.resource_id,
      observed_at: '2026-09-20T11:59:55.000Z',
    }),
    true
  );
  assert.equal(f.locks.size, 0);
});

test('acquisition binds caller identity to the actual operating-system user', async () => {
  const mismatch = fixture();
  mismatch.platform.userId = () => '502';
  await assert.rejects(
    async () =>
      await acquireProviderResource({ identity, descriptor, instanceId, nonce }, mismatch.platform),
    { code: 'APR_PROVIDER_RESOURCE_INTEGRITY' }
  );
  const unavailable = fixture();
  delete unavailable.platform.userId;
  await assert.rejects(
    async () =>
      await acquireProviderResource(
        { identity, descriptor, instanceId, nonce },
        unavailable.platform
      ),
    { code: 'APR_PROVIDER_RESOURCE_INTEGRITY' }
  );
  assert.equal(mismatch.opened.length, 0);
  assert.equal(unavailable.opened.length, 0);
});

test('concurrent adapter retains an exact session handle without claiming a shared lock', async () => {
  const f = fixture();
  const lease = await acquireProviderResource(
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
    await lease.beforeDelivery({
      status: 'ready',
      session_handle: 'claude-session-123',
      observed_at: NOW,
    }),
    true
  );
  await assert.rejects(
    async () =>
      await lease.release({
        status: 'complete',
        session_handle: 'other-session',
        observed_at: NOW,
      }),
    { code: 'APR_PROVIDER_RESOURCE_STALE' }
  );
  assert.equal(
    await lease.release({
      status: 'complete',
      session_handle: 'claude-session-123',
      observed_at: NOW,
    }),
    true
  );
});

test('desktop-style descriptors default to exclusive and fail closed without an ID', async () => {
  const f = fixture();
  await assert.rejects(
    async () =>
      await acquireProviderResource(
        { identity, descriptor: { resource_id: null }, instanceId, nonce },
        f.platform
      ),
    { code: 'APR_PROVIDER_RESOURCE_ID_REQUIRED' }
  );
});

// @story #188 — copied/native-looking ports cannot mint operational leases.
test('operational provider acquisition rejects caller platform ports before any resource effect', async () => {
  const f = fixture();
  await assert.rejects(
    async () =>
      await acquireOperationalProviderResource(
        { identity, descriptor, instanceId, nonce },
        f.platform
      ),
    { code: 'APR_PROVIDER_RESOURCE_INTEGRITY' }
  );
  assert.deepEqual(f.opened, []);
  assert.equal(f.locks.size, 0);
});

test('explicit provider protocol core awaits observations and retains an unverified exact lease', async () => {
  const f = fixture();
  const original = f.platform;
  const asyncHandle = (handle) =>
    Object.freeze(
      Object.fromEntries(
        Object.entries(handle).map(([key, value]) => [
          key,
          typeof value === 'function' ? async (...args) => value(...args) : value,
        ])
      )
    );
  const ports = {
    ...original,
    userId: async () => original.userId(),
    openPrivateDirectory: async (...args) => asyncHandle(original.openPrivateDirectory(...args)),
    acquireExclusive: async (...args) => asyncHandle(original.acquireExclusive(...args)),
    reconcileProviderResource: async (...args) => original.reconcileProviderResource(...args),
  };
  const acquire =
    providerResourceModule.acquireProviderResourceCore ??
    providerResourceModule.acquireProviderResource;
  const lease = await acquire({ identity, descriptor, instanceId, nonce }, ports);
  assert.equal(lease.verified, false);
  assert.equal(
    await lease.beforeDelivery({
      status: 'exclusive',
      resource_id: descriptor.resource_id,
      observed_at: NOW,
    }),
    true
  );
  await assert.rejects(
    lease.release({ status: 'complete', resource_id: 'foreign', observed_at: NOW }),
    { code: 'APR_PROVIDER_RESOURCE_STALE' }
  );
  assert.equal(f.locks.size, 1);
  assert.equal(
    await lease.release({
      status: 'complete',
      resource_id: descriptor.resource_id,
      observed_at: NOW,
    }),
    true
  );
  assert.equal(f.locks.size, 0);
});

test('acquisition rechecks election ownership after awaited provider reconciliation before publication', async () => {
  const f = fixture();
  const acquire = f.platform.acquireExclusive;
  let state;
  f.platform.acquireExclusive = (...args) => {
    const lease = acquire(...args);
    state = f.locks.get(args[0]);
    return lease;
  };
  f.platform.reconcileProviderResource = async ({ resourceId }) => {
    state.active = false;
    return { status: 'available', resource_id: resourceId, observed_at: NOW };
  };
  await assert.rejects(
    acquireProviderResource({ identity, descriptor, instanceId, nonce }, f.platform),
    { code: 'APR_PROVIDER_RESOURCE_STALE' }
  );
  const digest = providerResourceDigest({
    userId: identity.userId,
    provider: identity.provider,
    resourceId: descriptor.resource_id,
  });
  assert.equal(f.files(`/cache/ai-peer-review/provider-resources/${digest}`).size, 0);
});

test('failed election release retains the exact resource record and an outstanding obligation', async () => {
  const f = fixture();
  const acquire = f.platform.acquireExclusive;
  f.platform.acquireExclusive = (...args) => {
    const original = acquire(...args);
    return { ...original, release: async () => false };
  };
  const lease = await acquireProviderResource(
    { identity, descriptor, instanceId, nonce },
    f.platform
  );
  const records = f.files(`/cache/ai-peer-review/provider-resources/${lease.resourceDigest}`);
  const originalBytes = Buffer.from(records.get('resource.json'));
  await assert.rejects(
    lease.release({ status: 'complete', resource_id: descriptor.resource_id, observed_at: NOW }),
    { code: 'APR_PROVIDER_RESOURCE_STALE' }
  );
  assert.deepEqual(records.get('resource.json'), originalBytes);
  assert.equal(f.locks.size, 1);
  assert.ok(lease.outstandingObligations.some((o) => o.name === 'provider-resource'));
});

test('uncertain record publication retains election exclusion and reports exact obligations', async () => {
  const f = fixture();
  const open = f.platform.openPrivateDirectory;
  f.platform.openPrivateDirectory = (...args) => {
    const directory = open(...args);
    return {
      ...directory,
      create: async (...values) => {
        directory.create(...values);
        throw Object.assign(new Error('aborted after publication'), { code: 'ABORT_ERR' });
      },
    };
  };
  await assert.rejects(
    acquireProviderResource({ identity, descriptor, instanceId, nonce }, f.platform),
    (error) => {
      assert.ok(error.details?.outstandingObligations?.some((o) => o.name === 'provider-resource'));
      return true;
    }
  );
  assert.equal(f.locks.size, 1);
  const digest = providerResourceDigest({
    userId: identity.userId,
    provider: identity.provider,
    resourceId: descriptor.resource_id,
  });
  assert.ok(f.files(`/cache/ai-peer-review/provider-resources/${digest}`).has('resource.json'));
});

test('provider core refuses overlapping release while an awaited record update is active', async () => {
  const f = fixture();
  const open = f.platform.openPrivateDirectory;
  let entered, finish;
  const updating = new Promise((resolve) => {
    entered = resolve;
  });
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  f.platform.openPrivateDirectory = (...args) => {
    const directory = open(...args);
    return {
      ...directory,
      async replace(...values) {
        entered();
        await pending;
        return directory.replace(...values);
      },
    };
  };
  const lease = await acquireProviderResource(
    { identity, descriptor, instanceId, nonce },
    f.platform
  );
  const delivery = lease.beforeDelivery({
    status: 'exclusive',
    resource_id: descriptor.resource_id,
    observed_at: NOW,
  });
  await updating;
  try {
    await assert.rejects(
      lease.release({ status: 'complete', resource_id: descriptor.resource_id, observed_at: NOW }),
      { code: 'APR_PROVIDER_RESOURCE_STALE' }
    );
    assert.equal(f.locks.size, 1);
  } finally {
    finish();
  }
  await delivery;
  assert.equal(
    await lease.release({
      status: 'complete',
      resource_id: descriptor.resource_id,
      observed_at: NOW,
    }),
    true
  );
});

test('provider acquisition seals descriptor and identity before the first observation await', async () => {
  const f = fixture();
  const mutableIdentity = { ...identity };
  const mutableDescriptor = { ...descriptor };
  f.platform.userId = async () => {
    mutableIdentity.provider = 'openai';
    mutableDescriptor.resource_id = 'changed-surface';
    return identity.userId;
  };
  const lease = await acquireProviderResource(
    { identity: mutableIdentity, descriptor: mutableDescriptor, instanceId, nonce },
    f.platform
  );
  assert.equal(
    lease.resourceDigest,
    providerResourceDigest({
      userId: identity.userId,
      provider: identity.provider,
      resourceId: descriptor.resource_id,
    })
  );
  assert.equal(
    await lease.beforeDelivery({
      status: 'exclusive',
      resource_id: descriptor.resource_id,
      observed_at: NOW,
    }),
    true
  );
});

test('unverified protocol leases and copied flags never gain provider operational membership', async () => {
  const f = fixture();
  const lease = await acquireProviderResource(
    { identity, descriptor, instanceId, nonce },
    f.platform
  );
  assert.equal(providerResourceModule.isProviderResourceLease(lease), false);
  assert.equal(providerResourceModule.isProviderResourceLease({ ...lease, verified: true }), false);
  assert.equal(await lease.releaseUnused(), true);
});

test('beforeDelivery refuses a provider observation that expires during awaited record update', async () => {
  const f = fixture();
  let clock = Date.parse(NOW);
  f.platform.now = () => new Date(clock).toISOString();
  const open = f.platform.openPrivateDirectory;
  f.platform.openPrivateDirectory = (...args) => {
    const directory = open(...args);
    return {
      ...directory,
      async replace(...values) {
        const result = directory.replace(...values);
        clock += 6000;
        return result;
      },
    };
  };
  const lease = await acquireProviderResource(
    { identity, descriptor, instanceId, nonce },
    f.platform
  );
  await assert.rejects(
    lease.beforeDelivery({
      status: 'exclusive',
      resource_id: descriptor.resource_id,
      observed_at: NOW,
    }),
    { code: 'APR_PROVIDER_RESOURCE_STALE' }
  );
  assert.equal(f.locks.size, 1);
});
