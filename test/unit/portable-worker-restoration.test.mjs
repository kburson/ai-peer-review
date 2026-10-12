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
