import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';

import { ensureBroker } from '../helpers/broker-client-api.mjs';
import { runBroker } from '../helpers/broker-service-api.mjs';

function clock() {
  const pending = [];
  return {
    now: () => 0,
    setTimeout(callback) {
      pending.push(callback);
      return pending.length;
    },
    clearTimeout() {},
    expire() {
      pending.shift()?.();
    },
  };
}

function server() {
  let handler;
  let resolveReady;
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });
  return {
    ready,
    start(value) {
      handler = value;
      resolveReady();
    },
    request(value) {
      return handler(value);
    },
    close() {},
  };
}

function worker(observe = () => 'automatic-wait') {
  return {
    start: async () => {},
    reconcile: async () => 'automatic-wait',
    suspend: async () => {},
    close: async () => {},
    workState: observe,
  };
}

function identity(digest, physicalRoot) {
  return {
    digest,
    physicalRoot,
    tuple: ['ai-peer-review.broker-root/v1', physicalRoot, null, '501'],
  };
}

test('different project roots and package versions run independent brokers', async () => {
  const firstServer = server();
  const secondServer = server();
  const firstIdentity = identity('a'.repeat(64), '/projects/a');
  const secondIdentity = identity('b'.repeat(64), '/projects/b');
  const firstClock = clock();
  const secondClock = clock();
  const first = runBroker({
    identity: firstIdentity,
    owner: { release() {} },
    versions: { package_version: '1.0.0', broker_protocol_version: 1, node_major: 24 },
    registry: { list: () => [], get: () => null },
    workerFactory: worker,
    clock: firstClock,
    server: firstServer,
  });
  const second = runBroker({
    identity: secondIdentity,
    owner: { release() {} },
    versions: { package_version: '2.0.0', broker_protocol_version: 1, node_major: 24 },
    registry: { list: () => [], get: () => null },
    workerFactory: worker,
    clock: secondClock,
    server: secondServer,
  });

  await Promise.all([firstServer.ready, secondServer.ready]);
  assert.equal(
    (await firstServer.request({ id: 'a', command: 'status', workspace: null })).package_version,
    '1.0.0'
  );
  assert.equal(
    (await secondServer.request({ id: 'b', command: 'status', workspace: null })).package_version,
    '2.0.0'
  );
  firstClock.expire();
  secondClock.expire();
  await Promise.all([first, second]);
});

test('multiple reviews share one broker while a foreign registration is refused', async () => {
  const local = identity('c'.repeat(64), '/projects/local-worktree');
  const registrations = [
    {
      review_id: 'one',
      workspace: '/projects/local-worktree/.scratch/peer-review/reviews/one',
      project_digest: local.digest,
    },
    {
      review_id: 'two',
      workspace: '/projects/local-worktree/.scratch/peer-review/reviews/two',
      project_digest: local.digest,
    },
  ];
  const workers = [];
  const states = new Map(registrations.map((item) => [item.review_id, 'automatic-wait']));
  const brokerServer = server();
  const brokerClock = clock();
  const running = runBroker({
    identity: local,
    owner: { release() {} },
    versions: { package_version: '1.0.0', broker_protocol_version: 1, node_major: 24 },
    registry: {
      list: () => registrations,
      get: (workspace) => registrations.find((item) => item.workspace === workspace) ?? null,
    },
    workerFactory(item) {
      workers.push(item.review_id);
      return worker(() => states.get(item.review_id));
    },
    clock: brokerClock,
    server: brokerServer,
  });

  await brokerServer.ready;
  assert.deepEqual(workers.sort(), ['one', 'two']);
  const foreign = {
    ...registrations[0],
    review_id: 'foreign',
    workspace: '/projects/local-worktree/.scratch/peer-review/reviews/foreign',
    project_digest: 'd'.repeat(64),
  };
  registrations.push(foreign);
  await assert.rejects(
    brokerServer.request({ id: 'foreign', command: 'register', workspace: foreign.workspace }),
    { code: 'APR_BROKER_AUTH_FAILED' }
  );

  registrations.splice(2);
  await assert.rejects(
    brokerServer.request({ id: 'stop-runnable', command: 'stop', workspace: null }),
    {
      code: 'APR_BROKER_STOP_REFUSED',
    }
  );
  for (const item of registrations) {
    states.set(item.review_id, 'terminal');
    await brokerServer.request({
      id: `reconcile-${item.review_id}`,
      command: 'reconcile',
      workspace: item.workspace,
    });
  }
  assert.equal(
    (await brokerServer.request({ id: 'stop', command: 'stop', workspace: null })).status,
    'stopping'
  );
  await running;
});

test('linked worktrees keep separate broker identity and startup uses literal argv without a shell', async () => {
  const spawns = [];
  const project = identity('e'.repeat(64), '/projects/repo-worktrees/feature-a');
  const runtimeImage = {
    root: '/cache/images/runtime-a',
    nodeExecutable: '/cache/images/runtime-a/node',
    digest: `sha256:${'f'.repeat(64)}`,
  };
  let attempts = 0;
  const client = await ensureBroker({
    project,
    versions: { package_version: '1.0.0', broker_protocol_version: 1, node_major: 24 },
    runtimeImage,
    platform: {
      verifyRuntimeImage: () => true,
      async connect() {
        attempts += 1;
        if (attempts < 3) {
          const error = new Error('missing');
          error.code = 'ENOENT';
          throw error;
        }
        return { project_digest: project.digest };
      },
      createBootstrap(value) {
        assert.equal(value.project.digest, project.digest);
        assert.equal(value.runtimeImage.digest, runtimeImage.digest);
        return '/projects/repo-worktrees/feature-a/.scratch/peer-review/broker/bootstrap.json';
      },
      async delay() {},
      spawn(executable, args, options) {
        spawns.push({ executable, args, options });
        return { ready: Promise.resolve(), unref() {} };
      },
    },
  });

  assert.equal(client.project_digest, project.digest);
  assert.equal(attempts, 3);
  assert.equal(spawns.length, 1);
  assert.equal(spawns[0].executable, realpathSync(process.execPath));
  assert.equal(
    spawns[0].args[0],
    fileURLToPath(new URL('../../bin/peer-review-broker.mjs', import.meta.url))
  );
  assert.equal(spawns[0].args.length, 2);
  assert.equal(spawns[0].options.shell, false);
  assert.notEqual(
    project.digest,
    identity('f'.repeat(64), '/projects/repo-worktrees/feature-b').digest
  );
});

test('freshly launched broker waits for complete discovery bytes before authenticating', async () => {
  const project = identity('e'.repeat(64), '/projects/discovery-race');
  const runtimeImage = {
    root: '/cache/images/runtime-race',
    nodeExecutable: '/cache/images/runtime-race/node',
    digest: `sha256:${'f'.repeat(64)}`,
  };
  let attempts = 0;
  const client = { project_digest: project.digest };
  const result = await ensureBroker({
    project,
    versions: { package_version: '1.0.0', broker_protocol_version: 1, node_major: 24 },
    runtimeImage,
    platform: {
      verifyRuntimeImage: () => true,
      async connect() {
        attempts++;
        if (attempts === 1) throw Object.assign(new Error('missing'), { code: 'ENOENT' });
        if (attempts === 2)
          throw Object.assign(new Error('Broker discovery metadata is unavailable.'), {
            code: 'APR_BROKER_STALE',
          });
        if (attempts === 3)
          throw Object.assign(new Error('Broker discovery metadata is malformed.'), {
            code: 'APR_BROKER_STALE',
          });
        if (attempts === 4)
          throw Object.assign(new Error('Broker discovery changed during handshake.'), {
            code: 'APR_BROKER_STALE',
          });
        return client;
      },
      discoveryState: () => 'present',
      createBootstrap: () => '/projects/discovery-race/bootstrap.json',
      spawn: () => ({ ready: Promise.resolve(), unref() {} }),
      async delay() {},
    },
  });
  assert.equal(result, client);
  assert.equal(attempts, 5);
});

test('missing discovery launches once while contradictory stale evidence remains fenced', async () => {
  const project = identity('1'.repeat(64), '/projects/fresh');
  const runtimeImage = {
    root: '/cache/images/runtime-fresh',
    nodeExecutable: '/cache/images/runtime-fresh/node',
    digest: `sha256:${'2'.repeat(64)}`,
  };
  const versions = { package_version: '1.0.0', broker_protocol_version: 1, node_major: 24 };
  let launches = 0;
  let attempts = 0;
  const platform = {
    verifyRuntimeImage: () => true,
    async connect() {
      attempts += 1;
      if (attempts < 3) {
        const error = new Error('missing discovery');
        error.code = 'APR_BROKER_STALE';
        throw error;
      }
      return { project_digest: project.digest };
    },
    discoveryState: () => 'missing',
    createBootstrap: () => '/projects/fresh/.scratch/peer-review/broker/bootstrap.json',
    spawn() {
      launches += 1;
      return { ready: Promise.resolve(), unref() {} };
    },
    async delay() {},
  };
  await ensureBroker({ project, versions, runtimeImage, platform });
  assert.equal(launches, 1);
  assert.equal(attempts, 3);

  await assert.rejects(
    ensureBroker({
      project,
      versions,
      runtimeImage,
      platform: {
        ...platform,
        connect: async () => {
          const error = new Error('contradictory metadata');
          error.code = 'APR_BROKER_STALE';
          throw error;
        },
        discoveryState: () => 'present',
      },
    }),
    { code: 'APR_BROKER_STALE' }
  );
});

for (const alreadyStarting of [false, true]) {
  test(`exclusive discovery publication waits without duplicate launch (already starting: ${alreadyStarting})`, async () => {
    const project = identity('5'.repeat(64), '/projects/publishing');
    const runtimeImage = { root: '/image', nodeExecutable: '/image/node' };
    const client = { authenticated: true };
    let attempts = 0;
    let launches = 0;
    const platform = {
      verifyRuntimeImage: () => true,
      connect: async () => {
        attempts++;
        if (attempts === 1 && !alreadyStarting)
          throw Object.assign(new Error('missing'), { code: 'ENOENT' });
        if (attempts === (alreadyStarting ? 2 : 3))
          throw Object.assign(new Error('Broker discovery metadata is unavailable.'), {
            code: 'APR_BROKER_STALE',
          });
        if (attempts < 4)
          throw Object.assign(new Error('Exclusive writer still owns discovery'), {
            code: 'EBUSY',
          });
        return client;
      },
      createBootstrap: () => '/bootstrap',
      spawn: () => {
        launches++;
        return { ready: Promise.resolve(), unref() {} };
      },
      async delay() {},
    };
    assert.equal(await ensureBroker({ project, runtimeImage, versions: {}, platform }), client);
    assert.equal(launches, alreadyStarting ? 0 : 1);
    // Access/ownership failures must never be turned into publication retries.
    let unsafeReads = 0;
    await assert.rejects(
      ensureBroker({
        project,
        runtimeImage,
        versions: {},
        platform: {
          ...platform,
          connect: async () => {
            unsafeReads++;
            throw Object.assign(new Error('Unsafe ACL'), { code: 'APR_BROKER_STALE' });
          },
          discoveryState: () => 'present',
        },
      }),
      { code: 'APR_BROKER_STALE' }
    );
    assert.equal(unsafeReads, 1);
  });
}

test('spawn errors become APR_BROKER_START_FAILED instead of escaping asynchronously', async () => {
  const project = identity('3'.repeat(64), '/projects/spawn-failure');
  const runtimeImage = {
    root: '/cache/images/runtime-spawn',
    nodeExecutable: '/cache/images/runtime-spawn/node',
    digest: `sha256:${'4'.repeat(64)}`,
  };
  let errorHandler;
  await assert.rejects(
    ensureBroker({
      project,
      versions: { package_version: '1.0.0', broker_protocol_version: 1, node_major: 24 },
      runtimeImage,
      platform: {
        verifyRuntimeImage: () => true,
        connect: async () => {
          const error = new Error('missing');
          error.code = 'ENOENT';
          throw error;
        },
        createBootstrap: () => '/projects/spawn-failure/bootstrap.json',
        spawn() {
          const child = {
            once(event, handler) {
              if (event === 'error') errorHandler = handler;
              return child;
            },
            unref() {},
          };
          queueMicrotask(() => {
            const error = new Error('not found');
            error.code = 'ENOENT';
            errorHandler(error);
          });
          return child;
        },
        async delay() {},
      },
    }),
    { code: 'APR_BROKER_START_FAILED' }
  );
});

test('broker resolves registrations dynamically after startup', async () => {
  const local = identity('5'.repeat(64), '/projects/dynamic');
  const registrations = [];
  let state = 'automatic-wait';
  const brokerServer = server();
  const brokerClock = clock();
  const running = runBroker({
    identity: local,
    owner: { release() {} },
    versions: { package_version: '1.0.0', broker_protocol_version: 1, node_major: 24 },
    registry: {
      list: async () => [...registrations],
      get: async (workspace) => registrations.find((item) => item.workspace === workspace) ?? null,
    },
    workerFactory: () => worker(() => state),
    clock: brokerClock,
    server: brokerServer,
  });
  await brokerServer.ready;
  const added = {
    review_id: 'late-review',
    workspace: '/projects/dynamic/.scratch/peer-review/reviews/late-review',
    project_digest: local.digest,
  };
  registrations.push(added);
  const response = await brokerServer.request({
    id: 'register-late',
    command: 'register',
    workspace: added.workspace,
  });
  assert.equal(response.review_id, added.review_id);
  await assert.rejects(
    brokerServer.request({ id: 'stop-dynamic-runnable', command: 'stop', workspace: null }),
    { code: 'APR_BROKER_STOP_REFUSED' }
  );
  state = 'terminal';
  await brokerServer.request({
    id: 'reconcile-dynamic',
    command: 'reconcile',
    workspace: added.workspace,
  });
  assert.equal(
    (await brokerServer.request({ id: 'stop-dynamic', command: 'stop', workspace: null })).status,
    'stopping'
  );
  await running;
});

test('startup waits for slow recovery without connecting to an unpublished broker', async () => {
  const project = identity('7'.repeat(64), '/projects/slow-recovery');
  let elapsed = 0;
  let launches = 0;
  const client = { authenticated: true };
  const result = await ensureBroker({
    project,
    versions: {},
    runtimeImage: { root: '/image', nodeExecutable: '/image/node' },
    platform: {
      verifyRuntimeImage: () => true,
      discoveryState: () => 'missing',
      async connect() {
        if (elapsed < 6_000)
          throw Object.assign(new Error('Broker discovery metadata is unavailable.'), {
            code: 'APR_BROKER_STALE',
          });
        return client;
      },
      createBootstrap: () => '/bootstrap',
      spawn() {
        launches++;
        return { ready: Promise.resolve(), unref() {} };
      },
      async delay(ms) {
        elapsed += ms;
      },
    },
  });
  assert.equal(result, client);
  assert.equal(launches, 1);
});

test('portable HTTP isolates project credentials and versions and drains stop before releasing each owner', async (t) => {
  const { portableServiceJourney } = await import('../helpers/portable-service-journey.mjs');
  const a = await portableServiceJourney(t, {
    identity: identity('a'.repeat(64), '/projects/a'),
    versions: { package_version: '1.0.0', broker_protocol_version: 1, node_major: 24 },
  });
  const b = await portableServiceJourney(t, {
    identity: identity('b'.repeat(64), '/projects/b'),
    versions: { package_version: '2.0.0', broker_protocol_version: 1, node_major: 26 },
  });
  assert.equal(a.verified, false);
  assert.notEqual(a.endpoint.port, b.endpoint.port);
  assert.equal((await a.request('status')).result.project_digest, 'a'.repeat(64));
  assert.equal((await b.request('status')).result.project_digest, 'b'.repeat(64));
  assert.equal((await a.request('status', null, b.privateBinding)).ok, false);
  assert.equal((await b.request('status', null, a.privateBinding)).ok, false);
  assert.equal((await a.request('stop')).result.status, 'stopping');
  await a.run.untilStopped;
  assert.deepEqual(a.facts(), { published: true, drained: true, released: true });
  assert.equal((await b.request('status')).ok, true);
  assert.equal((await b.request('stop')).result.status, 'stopping');
  await b.run.untilStopped;
  assert.deepEqual(b.facts(), { published: true, drained: true, released: true });
});

test('portable HTTP restores multiple reviews before publication and refuses a foreign registration', async (t) => {
  const { portableServiceJourney } = await import('../helpers/portable-service-journey.mjs');
  const local = identity('c'.repeat(64), '/projects/local');
  const registrations = ['one', 'two'].map((review_id) => ({
    review_id,
    workspace: '/projects/local/' + review_id,
    project_digest: local.digest,
  }));
  const restored = [];
  let state = 'automatic-wait';
  const journey = await portableServiceJourney(t, {
    identity: local,
    versions: { package_version: '1.0.0', broker_protocol_version: 1, node_major: 24 },
    registrations,
    workerFactory: (registration) => {
      restored.push(registration.review_id);
      return worker(() => state);
    },
  });
  assert.deepEqual(restored, ['one', 'two']);
  assert.equal(journey.facts().published, true);
  const foreign = {
    review_id: 'foreign',
    workspace: '/projects/local/foreign',
    project_digest: 'd'.repeat(64),
  };
  registrations.push(foreign);
  const refused = await journey.request('register', foreign.workspace);
  assert.equal(refused.ok, false);
  assert.equal(refused.error.code, 'APR_BROKER_AUTH_FAILED');
  assert.deepEqual(restored, ['one', 'two']);
  registrations.pop();
  assert.equal((await journey.request('stop')).error.code, 'APR_BROKER_STOP_REFUSED');
  state = 'terminal';
  for (const registration of registrations)
    assert.equal((await journey.request('reconcile', registration.workspace)).ok, true);
  assert.equal((await journey.request('stop')).ok, true);
  await journey.run.untilStopped;
  assert.equal(journey.facts().released, true);
});
