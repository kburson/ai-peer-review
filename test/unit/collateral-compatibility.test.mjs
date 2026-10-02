// @story #135
import assert from 'node:assert/strict';
import test from 'node:test';
import { acquireBrokerOwnership } from '../../src/broker/ownership.mjs';
import { runBroker } from '../../src/broker/service.mjs';
import { verifyRuntimeInventorySync } from '../../src/startup/runtime-inventory.mjs';
import { runtimeFixture } from '../helpers/runtime-selection-fixture.mjs';
import * as compatibility from '../../src/protocol/compatibility.mjs';

const unsupported = (error) => error.code === 'APR_REVIEW_RUNTIME_UNSUPPORTED';
const invoke = (name, ...args) => {
  assert.equal(typeof compatibility[name], 'function', `${name} must enforce collateral admission`);
  return compatibility[name](...args);
};

test('supported sealed formats admit an older package independently of historical version floors', () => {
  const historical = {
    minimum_reader_version: '999.0.0',
    minimum_writer_version: '999.0.0',
    accepted_event_schemas: ['ai-peer-review.event/v1', 'ai-peer-review.event/v2'],
  };
  assert.doesNotThrow(() => compatibility.assertReaderWriterCompatibility(historical));
  assert.throws(
    () =>
      compatibility.assertReaderWriterCompatibility({
        ...historical,
        minimum_reader_version: 'bad',
      }),
    (error) => error.code === 'APR_EVENT_INVALID'
  );
});

for (const operation of ['read', 'write']) {
  test(`packaged closed support admits both event formats for ${operation}`, () => {
    const manifest = invoke('readRuntimeCompatibility');
    for (const schema of ['ai-peer-review.event/v1', 'ai-peer-review.event/v2']) {
      assert.doesNotThrow(() =>
        invoke('assertCollateralCompatible', {
          manifest,
          operation,
          metadata: [{ contract: 'event', schema }],
        })
      );
    }
    assert.throws(
      () =>
        invoke('assertCollateralCompatible', {
          manifest,
          operation,
          metadata: [{ contract: 'event', schema: 'ai-peer-review.event/v99' }],
        }),
      unsupported
    );
  });
}

for (const contract of [
  'protocol',
  'participants',
  'manifest',
  'phaseManifest',
  'response',
  'context',
  'runtime',
  'startup',
  'runtimeImage',
  'brokerRegistration',
  'brokerBootstrap',
  'reservation',
  'lineage',
  'invitation',
  'archive',
]) {
  test(`unknown ${contract} format is never admitted by a package-version match`, () => {
    const manifest = invoke('readRuntimeCompatibility');
    assert.throws(
      () =>
        invoke('assertCollateralCompatible', {
          manifest,
          operation: 'read',
          metadata: [{ contract, schema: 'unknown/v999' }],
        }),
      unsupported
    );
  });
}

test('incomplete or open manifest and invalid operation refuse rather than widening support', () => {
  const manifest = invoke('readRuntimeCompatibility');
  for (const invalid of [{}, { ...manifest, extra: true }, { ...manifest, contracts: {} }]) {
    assert.throws(
      () =>
        invoke('assertCollateralCompatible', {
          manifest: invalid,
          operation: 'write',
          metadata: [{ contract: 'event', schema: 'ai-peer-review.event/v1' }],
        }),
      unsupported
    );
  }
  for (const operation of ['execute', 'cleanup', null]) {
    assert.throws(
      () =>
        invoke('assertCollateralCompatible', {
          manifest,
          operation,
          metadata: [{ contract: 'event', schema: 'ai-peer-review.event/v1' }],
        }),
      unsupported
    );
  }
  assert.throws(
    () =>
      invoke('assertCollateralCompatible', {
        manifest,
        operation: 'read',
        metadata: [
          { contract: 'event', schema: 'ai-peer-review.event/v1', package_version: '0.4.0' },
        ],
      }),
    unsupported
  );
});

test('a plain owner or guessed runtime is not cleanup authority', () => {
  assert.throws(
    () =>
      invoke('assertCurrentCleanupOwnership', {
        owner: { verify: () => true },
        protocol: 1,
        runtime: { packageVersion: '0.4.0' },
      }),
    unsupported
  );
});

test('authenticated owned cleanup admits the verified runtime and refuses changed proof', (t) => {
  const fx = runtimeFixture(t);
  const runtime = verifyRuntimeInventorySync({ packageRoot: fx.packageRoot });
  let valid = true;
  let metadata = null;
  const owner = acquireBrokerOwnership(
    {
      identity: { tuple: ['ai-peer-review.broker-root/v1', fx.root, null, '501'] },
      paths: {
        directory: fx.root,
        lock: 'broker.lock',
        endpoint: 'broker.sock',
        metadata: 'broker.json',
      },
      versions: { package_version: '1.0.0', broker_protocol_version: 1, node_major: 26 },
      reconcile: () => true,
    },
    {
      userId: () => '501',
      openPrivateDirectory: () => ({
        verify: () => valid,
        read: () => metadata,
        create: (_name, bytes) => {
          metadata = bytes;
        },
        close() {},
      }),
      acquireExclusive: () => ({ verify: () => valid, release: () => valid, abandon() {} }),
      listenPrivate: () => ({ verify: () => valid, close() {} }),
    }
  );
  assert.doesNotThrow(() =>
    compatibility.assertCurrentCleanupOwnership({ owner, protocol: 1, runtime })
  );
  assert.throws(
    () => compatibility.assertCurrentCleanupOwnership({ owner, protocol: 999, runtime }),
    unsupported
  );
  assert.throws(
    () =>
      compatibility.assertCurrentCleanupOwnership({ owner: { ...owner }, protocol: 1, runtime }),
    unsupported
  );
  valid = false;
  assert.throws(
    () => compatibility.assertCurrentCleanupOwnership({ owner, protocol: 1, runtime }),
    unsupported
  );
});

test('broker settlement refuses unknown cleanup ownership without terminating a worker', async () => {
  let closes = 0;
  let releases = 0;
  const owner = {
    verify: () => true,
    release: () => {
      releases++;
    },
  };
  const project = { physicalRoot: 'fixture-project', digest: 'a'.repeat(64) };
  const worker = {
    start: async () => {},
    workState: () => 'terminal',
    close: async () => {
      closes++;
    },
    suspend: async () => {
      throw new Error('no suspension');
    },
  };
  await assert.rejects(
    runBroker({
      identity: project,
      owner,
      versions: { package_version: '0.4.0', broker_protocol_version: 1, node_major: 26 },
      registry: {
        list: () => [
          {
            workspace: 'fixture-workspace',
            review_id: 'fixture-review',
            project_digest: project.digest,
          },
        ],
        get() {},
      },
      workerFactory: () => worker,
      clock: {
        now: () => 0,
        setTimeout: (callback) => {
          queueMicrotask(callback);
          return 1;
        },
        clearTimeout() {},
      },
      server: { start() {}, close() {} },
      cleanupGuard: () =>
        compatibility.assertCurrentCleanupOwnership({ owner, protocol: 1, runtime: null }),
    }),
    unsupported
  );
  assert.equal(closes, 0);
  assert.equal(releases, 0);
});
