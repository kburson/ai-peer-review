// @story #189
import assert from 'node:assert/strict';
import test from 'node:test';
const api = await import('../../src/broker/bootstrap-core.mjs').catch(() => ({}));
const valid = () => ({
  schema: 'ai-peer-review.broker-bootstrap/v2',
  execution: {
    package_root: '/current/package',
    node_executable: '/current/node',
    package_digest: 'a'.repeat(64),
  },
  project: {
    digest: 'b'.repeat(64),
    physicalRoot: '/work',
    tuple: ['ai-peer-review.broker-root/v1', '/work', null, '501'],
  },
  runtimeImage: {
    root: '/image',
    nodeExecutable: '/image/node',
    digest: 'sha256:' + 'c'.repeat(64),
  },
  versions: { package_version: '0.4.0', broker_protocol_version: 1, node_major: 24 },
});

test('bootstrap data retains existing execution, project, image and version schemas without granting authority', () => {
  assert.equal(typeof api.parseBrokerBootstrapCore, 'function');
  const value = api.parseBrokerBootstrapCore(JSON.stringify(valid()));
  assert.deepEqual(value, valid());
  assert.ok(Object.isFrozen(value));
  assert.ok(Object.isFrozen(value.project));
  assert.ok(Object.isFrozen(value.project.tuple));
});

test('bootstrap data refuses extra execution fields, malformed digests and nonabsolute images', () => {
  assert.equal(typeof api.parseBrokerBootstrapCore, 'function');
  for (const change of [
    (value) => {
      value.execution.credential = 'private';
    },
    (value) => {
      value.project.digest = 'not-a-digest';
    },
    (value) => {
      value.runtimeImage.root = 'relative';
    },
    (value) => {
      value.versions.node_major = 0;
    },
    (value) => {
      value.project.tuple = [];
    },
  ]) {
    const value = valid();
    change(value);
    assert.throws(() => api.parseBrokerBootstrapCore(JSON.stringify(value)), {
      code: 'APR_BROKER_START_FAILED',
    });
  }
  assert.throws(() => api.parseBrokerBootstrapCore('{malformed'), {
    code: 'APR_BROKER_START_FAILED',
  });
});

test('copied bootstrap data cannot gain operational membership and relative paths refuse before effects', async () => {
  const production = await import('../../src/broker/portable-bootstrap.mjs').catch(() => ({}));
  assert.equal(typeof production.isPortableBrokerBootstrap, 'function');
  assert.equal(typeof production.readPortableBrokerBootstrap, 'function');
  assert.equal(production.isPortableBrokerBootstrap(valid()), false);
  await assert.rejects(
    production.readPortableBrokerBootstrap({
      file: 'relative.json',
      signal: new AbortController().signal,
      deadline: performance.now() + 30000,
    }),
    { code: 'APR_BROKER_START_FAILED' }
  );
});

test('unproved writer inputs cannot invoke an injected bootstrap or platform effect', async () => {
  const production = await import('../../src/broker/portable-bootstrap.mjs');
  assert.equal(typeof production.writePortableBrokerBootstrap, 'function');
  let effects = 0;
  await assert.rejects(
    production.writePortableBrokerBootstrap({
      project: valid().project,
      runtimeImage: valid().runtimeImage,
      platform: {
        createBootstrap() {
          effects += 1;
        },
      },
    }),
    { code: 'APR_BROKER_START_FAILED' }
  );
  assert.equal(effects, 0);
});

test('production service composition refuses copied bootstrap capabilities and injected worker ports', async () => {
  const service = await import('../../src/broker/portable-service.mjs').catch(() => ({}));
  assert.equal(typeof service.startPortableBrokerService, 'function');
  let effects = 0;
  await assert.rejects(
    service.startPortableBrokerService({ bootstrap: { verified: true, value: valid() } }),
    { code: 'APR_BROKER_START_FAILED' }
  );
  await assert.rejects(
    service.startPortableBrokerService({
      bootstrap: {},
      workerFactory: async () => {
        effects += 1;
      },
    }),
    { code: 'APR_BROKER_START_FAILED' }
  );
  assert.equal(effects, 0);
});

test('the portable broker entry refuses a legacy transport request before bootstrap access', async () => {
  const { runBrokerEntrypoint } = await import('../../bin/peer-review-broker.mjs');
  await assert.rejects(runBrokerEntrypoint('relative.json', { transport: 'legacy' }), {
    code: 'APR_BROKER_PROTOCOL',
  });
});

test('portable public client refuses native ports and forged request handles before callbacks', async () => {
  const { ensureBroker, requestBroker } = await import('../../src/broker/client.mjs');
  let effects = 0;
  await assert.rejects(
    ensureBroker({
      project: valid().project,
      runtimeImage: valid().runtimeImage,
      versions: valid().versions,
      platform: {
        connect() {
          effects++;
        },
      },
    }),
    { code: 'APR_BROKER_PROTOCOL' }
  );
  await assert.rejects(
    requestBroker(
      {
        handshake: { tuple: ['schema', '/work'] },
        request() {
          effects++;
        },
      },
      'status'
    ),
    { code: 'APR_BROKER_STALE' }
  );
  assert.equal(effects, 0);
});

test('portable root provisioning refuses copied system membership before a filesystem effect', async () => {
  const api = await import('../../src/broker/portable-root.mjs').catch(() => ({}));
  assert.equal(typeof api.ensurePortableRootProtection, 'function');
  let effects = 0;
  await assert.rejects(
    api.ensurePortableRootProtection({
      root: '/unproved/root',
      operations: {
        verified: true,
        observeProtection() {
          effects++;
        },
      },
      signal: new AbortController().signal,
      deadline: performance.now() + 30000,
    }),
    { code: 'APR_BROKER_PROTECTION_UNAVAILABLE' }
  );
  assert.equal(effects, 0);
});

test('public bootstrapRecord remains immutable unverified schema data without granting producer membership', async () => {
  const client = await import('../../src/broker/client.mjs');
  assert.equal(typeof client.bootstrapRecord, 'function');
  const value = client.bootstrapRecord(valid());
  assert.equal(value.schema, 'ai-peer-review.broker-bootstrap/v2');
  assert.ok(Object.isFrozen(value));
  const production = await import('../../src/broker/portable-bootstrap.mjs');
  assert.equal(production.isPortableBrokerBootstrap(value), false);
});

// @story #190
test('bootstrap encoding produces bounded UTF-8 bytes accepted by protected storage', () => {
  assert.equal(typeof api.encodeBrokerBootstrapCore, 'function');
  const bytes = api.encodeBrokerBootstrapCore(valid());
  assert.equal(Buffer.isBuffer(bytes), true);
  assert.deepEqual(JSON.parse(bytes.toString('utf8')), valid());
  assert.equal(bytes.at(-1), 10);
  assert.throws(() => api.encodeBrokerBootstrapCore({ ...valid(), credential: 'private' }), {
    code: 'APR_BROKER_START_FAILED',
  });
});
