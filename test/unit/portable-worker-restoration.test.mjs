// @story #209
// Real production-used worker protocol; these explicit test ports grant no owner authority.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createReviewWorker } from '../../src/broker/worker.mjs';

test('restoration observes automatic wait without starting coordination before activation', async () => {
  let coordinated = 0,
    delivered = 0;
  const worker = createReviewWorker({
    registration: { workspace: '/fixture-review' },
    deferCoordination: true,
    inspectStatus: () => ({ state: 'reviewer-turn', next_action: 'reviewer-submit', review: {} }),
    adapter: {
      automatic: true,
      coordinatorInput: {},
      deliver: async () => {
        delivered++;
      },
    },
    coordinator: async () => {
      coordinated++;
    },
  });
  assert.equal(await worker.start(), 'automatic-wait');
  await worker.reconcile();
  assert.equal(coordinated, 0);
  assert.equal(delivered, 0);
  assert.equal(typeof worker.activate, 'function');
  await worker.activate();
  assert.equal(coordinated, 1);
  await worker.activate();
  assert.equal(coordinated, 1);
  await worker.close();
});

test('restoration defers exact launch reconciliation and refuses activation after suspension', async () => {
  let launches = 0;
  const worker = createReviewWorker({
    registration: { workspace: '/fixture-review' },
    deferCoordination: true,
    inspectStatus: () => ({
      state: 'awaiting-reviewer',
      review: { recovery: { stage: 'outcome-unknown' } },
    }),
    adapter: {
      bootstrap: true,
      reconcileLaunch: async () => {
        launches++;
      },
    },
  });
  assert.equal(await worker.start(), 'bootstrap');
  await worker.reconcile();
  assert.equal(launches, 0);
  await worker.suspend();
  await assert.rejects(() => worker.activate(), /activation.*refused/u);
  assert.equal(launches, 0);
  await worker.close();
});

test('broker awaits initial notified settlement before publication and activates afterward', async () => {
  const { createBrokerService } = await import('../../src/broker/service-core.mjs');
  const service = createBrokerService({
    withOperationAuthority: async (_input, operation) => operation(),
    assertCurrentOperationAuthority: () => {},
  });
  const calls = [];
  let listener,
    dispatch,
    startSettled = false;
  const registrations = [];
  const item = {
    project_digest: 'a'.repeat(64),
    review_id: 'review',
    workspace: '/project/review',
  };
  registrations.push(item);
  const worker = {
    workState: () => 'recovery-only',
    onStateChange(value) {
      listener = value;
      return () => {};
    },
    async start() {
      calls.push('start');
      listener();
      await Promise.resolve();
      await Promise.resolve();
      startSettled = true;
      calls.push('start-settled');
    },
    async suspend() {
      calls.push(startSettled ? 'suspend' : 'suspend-before-start-settled');
    },
    async close() {
      calls.push('close');
    },
    async activate() {
      calls.push('activate-removed-worker');
    },
  };
  const running = service.startBroker({
    identity: { digest: item.project_digest, physicalRoot: '/project' },
    versions: {},
    owner: {
      async publish() {
        calls.push('publish');
      },
      async release() {},
    },
    registry: { list: () => registrations, get: () => registrations[0] ?? null },
    workerFactory: async () => worker,
    clock: { now: Date.now, setTimeout: () => 1, clearTimeout() {} },
    server: {
      async start(value) {
        dispatch = value;
      },
      async close() {},
    },
  });
  await running.ready;
  assert.deepEqual(calls, ['start', 'start-settled', 'suspend', 'close', 'publish']);
  registrations.length = 0;
  await dispatch({ command: 'stop', workspace: null });
  await running.untilStopped;
});

test('broker publishes before activating retained automatic workers', async () => {
  const { createBrokerService } = await import('../../src/broker/service-core.mjs');
  const service = createBrokerService({
    withOperationAuthority: async (_input, operation) => operation(),
    assertCurrentOperationAuthority: () => {},
  });
  const calls = [];
  let dispatch,
    state = 'automatic-wait';
  const item = {
    project_digest: 'a'.repeat(64),
    review_id: 'review',
    workspace: '/project/review',
  };
  const running = service.startBroker({
    identity: { digest: item.project_digest, physicalRoot: '/project' },
    versions: {},
    owner: {
      async publish() {
        calls.push('publish');
      },
      async release() {},
    },
    registry: { list: () => [item], get: () => item },
    workerFactory: async () => ({
      workState: () => state,
      async start() {
        calls.push('start');
      },
      async activate() {
        calls.push('activate');
      },
      async suspend() {},
      async close() {},
    }),
    clock: { now: Date.now, setTimeout: () => 1, clearTimeout() {} },
    server: {
      async start(value) {
        dispatch = value;
      },
      async close() {},
    },
  });
  await running.ready;
  assert.deepEqual(calls, ['start', 'publish', 'activate']);
  state = 'terminal';
  await dispatch({ command: 'stop', workspace: null });
  await running.untilStopped;
});

test('restoration resource reader refuses fabricated workers and owner bindings', async () => {
  const factory = await import('../../src/broker/worker-factory.mjs');
  assert.equal(typeof factory.inspectPortableWorkerResources, 'function');
  await assert.rejects(
    () =>
      factory.inspectPortableWorkerResources({
        worker: { workState: () => 'automatic-wait' },
        owner: {},
        signal: new AbortController().signal,
        deadline: performance.now() + 30000,
      }),
    { code: 'APR_BROKER_START_FAILED' }
  );
});

test('restoration receipts and initial registrations cannot be supplied by copied facades', async () => {
  const factory = await import('../../src/broker/worker-factory.mjs');
  const ownership = await import('../../src/broker/portable-ownership.mjs');
  const context = { signal: new AbortController().signal, deadline: performance.now() + 30000 };
  assert.equal(typeof factory.inspectPortableWorkerRestorationReceipt, 'function');
  assert.equal(typeof ownership.readPreparedPortableRegistrations, 'function');
  assert.equal(typeof ownership.acceptPortableWorkerRestoration, 'function');
  await assert.rejects(
    () =>
      factory.inspectPortableWorkerRestorationReceipt({
        receipt: { verified: true, stage: 'start' },
        owner: {},
        ...context,
      }),
    { code: 'APR_BROKER_START_FAILED' }
  );
  await assert.rejects(
    () => ownership.readPreparedPortableRegistrations({ owner: {}, ...context }),
    { code: 'APR_BROKER_STALE' }
  );
  await assert.rejects(
    () => ownership.acceptPortableWorkerRestoration({ owner: {}, receipt: {}, ...context }),
    { code: 'APR_BROKER_STALE' }
  );
});
test('startup service refuses commands before its owner publication completes', async () => {
  const { createBrokerService } = await import('../../src/broker/service-core.mjs');
  let releasePublish;
  const publishWait = new Promise((resolve) => {
    releasePublish = resolve;
  });
  let dispatch, serverStarted;
  const started = new Promise((resolve) => {
    serverStarted = resolve;
  });
  const service = createBrokerService({
    withOperationAuthority: (_scope, operation) => operation(),
    assertCurrentOperationAuthority: async () => {},
  });
  const run = service.startBroker({
    identity: { digest: 'a'.repeat(64), physicalRoot: '/project' },
    versions: {},
    owner: { publish: () => publishWait, release: async () => {} },
    registry: { list: () => [], get: () => null },
    workerFactory: async () => {},
    clock: { now: Date.now, setTimeout: () => 1, clearTimeout() {} },
    server: {
      start: async (value) => {
        dispatch = value;
        serverStarted();
      },
      close: async () => {},
    },
  });
  await started;
  await assert.rejects(() => dispatch({ command: 'status', workspace: null }), {
    code: 'APR_BROKER_STALE',
  });
  releasePublish();
  await run.ready;
  await dispatch({ command: 'stop', workspace: null });
  await run.untilStopped;
});

for (const restored of [false, true]) {
  test(`published broker registers a new worker with ${restored ? 'an active restored worker' : 'an empty initial registry'}`, async () => {
    const { createBrokerService } = await import('../../src/broker/service-core.mjs');
    const service = createBrokerService({
      withOperationAuthority: (_scope, operation) => operation(),
      assertCurrentOperationAuthority: async () => {},
    });
    const initial = {
      project_digest: 'a'.repeat(64),
      review_id: 'initial',
      workspace: '/project/initial',
    };
    const added = { ...initial, review_id: 'added', workspace: '/project/added' };
    const registrations = restored ? [initial] : [];
    const workers = new Map();
    let dispatch,
      published = false;
    const running = service.startBroker({
      identity: { digest: initial.project_digest, physicalRoot: '/project' },
      versions: {},
      owner: {
        publish: async () => {
          published = true;
        },
        release: async () => {},
      },
      registry: {
        list: () => registrations,
        get: (workspace) => registrations.find((item) => item.workspace === workspace),
      },
      workerFactory: async (item) => {
        const worker = createReviewWorker({
          registration: item,
          inspectStatus: () => ({
            state: 'reviewer-turn',
            next_action: 'reviewer-submit',
            review: {},
          }),
          adapter: { automatic: true },
        });
        workers.set(item.workspace, worker);
        return worker;
      },
      acceptWorkerRestoration: async () => {
        if (published) throw Error('No restoration receipt exists after publication');
      },
      clock: { now: Date.now, setTimeout: () => 1, clearTimeout() {} },
      server: {
        start: async (value) => {
          dispatch = value;
        },
        close: async () => {},
      },
    });
    await running.ready;
    registrations.push(added);
    try {
      await dispatch({ command: 'register', workspace: added.workspace });
      assert.equal(workers.get(added.workspace).workState(), 'automatic-wait');
      assert.equal((await dispatch({ command: 'status' })).reviews, restored ? 2 : 1);
    } finally {
      registrations.length = 0;
      for (const worker of workers.values()) await worker.suspend();
      await dispatch({ command: 'stop', workspace: null });
      await running.untilStopped;
    }
  });
}

test('a failed new worker initialization cannot be reused by a published broker', async () => {
  const { createBrokerService } = await import('../../src/broker/service-core.mjs');
  const service = createBrokerService({
    withOperationAuthority: (_scope, operation) => operation(),
    assertCurrentOperationAuthority: async () => {},
  });
  const item = { project_digest: 'a'.repeat(64), review_id: 'added', workspace: '/project/added' };
  const registrations = [];
  let dispatch,
    starts = 0,
    unavailable = true;
  const worker = createReviewWorker({
    registration: item,
    inspectStatus: () => {
      if (unavailable) throw Error('authority unavailable');
      return { state: 'accepted', review: {} };
    },
    adapter: {},
  });
  const realStart = worker.start;
  const run = service.startBroker({
    identity: { digest: item.project_digest, physicalRoot: '/project' },
    versions: {},
    owner: { publish: async () => {}, release: async () => {} },
    registry: { list: () => registrations, get: () => item },
    workerFactory: async () => ({
      ...worker,
      start: async () => {
        starts++;
        return realStart();
      },
    }),
    clock: { now: Date.now, setTimeout: () => 1, clearTimeout() {} },
    server: {
      start: async (value) => {
        dispatch = value;
      },
      close: async () => {},
    },
  });
  await run.ready;
  registrations.push(item);
  await assert.rejects(
    () => dispatch({ command: 'register', workspace: item.workspace }),
    /authority unavailable/u
  );
  try {
    await assert.rejects(() => dispatch({ command: 'register', workspace: item.workspace }), {
      code: 'APR_BROKER_STALE',
    });
    assert.equal(starts, 1);
  } finally {
    registrations.length = 0;
    unavailable = false;
    await worker.suspend();
    try {
      await dispatch({ command: 'stop' });
    } catch {}
    await run.untilStopped;
  }
});
