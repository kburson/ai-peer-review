import assert from 'node:assert/strict';
import test from 'node:test';

import { createAuthenticatedBrokerServer, runBroker } from '../../src/broker/service.mjs';
import { encodeFrame } from '../../src/broker/ipc.mjs';
import { createReviewWorker } from '../../src/broker/worker.mjs';

function fakeClock() {
  let now = 0;
  let sequence = 0;
  const timers = new Map();
  const drain = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };
  return {
    now: () => now,
    setTimeout(callback, delay) {
      const id = ++sequence;
      timers.set(id, { at: now + delay, callback });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    async advance(milliseconds) {
      const target = now + milliseconds;
      for (;;) {
        const next = [...timers.entries()]
          .filter(([, timer]) => timer.at <= target)
          .sort((left, right) => left[1].at - right[1].at || left[0] - right[0])[0];
        if (!next) break;
        timers.delete(next[0]);
        now = next[1].at;
        next[1].callback();
        await drain();
      }
      now = target;
      await drain();
    },
  };
}

function fakeServer() {
  let handle;
  let closed = false;
  let resolveReady;
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });
  return {
    ready,
    start(next) {
      handle = next;
      resolveReady();
    },
    request(message) {
      return handle(message);
    },
    close() {
      closed = true;
    },
    get closed() {
      return closed;
    },
  };
}

function registration(reviewId, projectDigest = 'a'.repeat(64)) {
  return {
    review_id: reviewId,
    workspace: `/project/.scratch/peer-review/reviews/${reviewId}`,
    project_digest: projectDigest,
  };
}

function fakeWorker(initial = 'terminal', transitions = []) {
  let state = initial;
  const calls = [];
  return {
    calls,
    workState: () => state,
    setState(value) {
      state = value;
    },
    async start() {
      calls.push('start');
    },
    async reconcile() {
      calls.push('reconcile');
      state = transitions.shift() ?? state;
      return state;
    },
    async suspend() {
      calls.push('suspend');
    },
    async close() {
      calls.push('close');
    },
  };
}

function brokerInput({ clock, server, registrations = [], workers = new Map(), identity } = {}) {
  const project = identity ?? { digest: 'a'.repeat(64), physicalRoot: '/project' };
  return {
    identity: project,
    owner: { release() {} },
    versions: { package_version: '1.0.0', broker_protocol_version: 1, node_major: 24 },
    registry: {
      list: () => registrations,
      get(workspace) {
        return registrations.find((item) => item.workspace === workspace) ?? null;
      },
    },
    workerFactory(item) {
      return workers.get(item.review_id);
    },
    clock,
    server,
  };
}

test('installed recovery-only broker worker refuses launch before provider action', async () => {
  const clock = fakeClock();
  const server = fakeServer();
  const item = registration('review-recovery-launch');
  const worker = fakeWorker('recovery-only');
  const running = runBroker(
    brokerInput({
      clock,
      server,
      registrations: [item],
      workers: new Map([[item.review_id, worker]]),
    })
  );
  await server.ready;
  await assert.rejects(
    server.request({ id: 'launch-1', command: 'launch', workspace: item.workspace }),
    { code: 'APR_TRANSPORT_UNAVAILABLE' }
  );
  await clock.advance(60_000);
  await running;
  assert.equal(worker.calls.includes('launchReviewer'), false);
});

test('broker exits at exactly sixty seconds without runnable work', async () => {
  const clock = fakeClock();
  const server = fakeServer();
  let exited = false;
  const running = runBroker(brokerInput({ clock, server })).then(() => (exited = true));

  await server.ready;
  await clock.advance(59_999);
  assert.equal(exited, false);
  await clock.advance(1);
  await running;
  assert.equal(exited, true);
  assert.equal(server.closed, true);
});

test('status inspection does not postpone an existing idle deadline', async () => {
  const clock = fakeClock();
  const server = fakeServer();
  let exited = false;
  const running = runBroker(brokerInput({ clock, server })).then(() => (exited = true));

  await server.ready;
  await clock.advance(30_000);
  await server.request({ id: 'status-idle', command: 'status', workspace: null });
  await clock.advance(29_999);
  assert.equal(exited, false);
  await clock.advance(1);
  await running;
  assert.equal(exited, true);
});

test('new work resets the idle deadline after the worker becomes terminal', async () => {
  const clock = fakeClock();
  const server = fakeServer();
  const item = registration('review-reset');
  const worker = fakeWorker('runnable', ['terminal']);
  let exited = false;
  const running = runBroker(
    brokerInput({
      clock,
      server,
      registrations: [item],
      workers: new Map([[item.review_id, worker]]),
    })
  ).then(() => (exited = true));

  await server.ready;
  await clock.advance(30_000);
  await server.request({ id: 'reconcile-1', command: 'reconcile', workspace: item.workspace });
  await clock.advance(59_999);
  assert.equal(exited, false);
  await clock.advance(1);
  await running;
  assert.equal(exited, true);
});

test('supported automatic wait remains resident until work becomes terminal', async () => {
  const clock = fakeClock();
  const server = fakeServer();
  const item = registration('review-wait');
  const worker = fakeWorker('automatic-wait', ['terminal']);
  let exited = false;
  const running = runBroker(
    brokerInput({
      clock,
      server,
      registrations: [item],
      workers: new Map([[item.review_id, worker]]),
    })
  ).then(() => (exited = true));

  await server.ready;
  await clock.advance(600_000);
  assert.equal(exited, false);
  await server.request({ id: 'reconcile-2', command: 'reconcile', workspace: item.workspace });
  await clock.advance(60_000);
  await running;
  assert.equal(exited, true);
});

test('serialized broker stop refuses a runnable registration added after a status inspection', async () => {
  const clock = fakeClock();
  const server = fakeServer();
  const item = registration('review-stop-race');
  const registrations = [];
  const worker = fakeWorker('runnable', ['terminal']);
  let exited = false;
  const running = runBroker(
    brokerInput({
      clock,
      server,
      registrations,
      workers: new Map([[item.review_id, worker]]),
    })
  ).then(() => (exited = true));

  await server.ready;
  assert.equal(
    (await server.request({ id: 'status-before-register', command: 'status', workspace: null }))
      .reviews,
    0
  );
  registrations.push(item);
  await assert.rejects(
    server.request({ id: 'stop-after-register', command: 'stop', workspace: null }),
    {
      code: 'APR_BROKER_STOP_REFUSED',
    }
  );
  assert.equal(exited, false);
  assert.equal(worker.workState(), 'runnable');
  await server.request({
    id: 'reconcile-before-stop',
    command: 'reconcile',
    workspace: item.workspace,
  });
  assert.equal(
    (await server.request({ id: 'stop-after-reconcile', command: 'stop', workspace: null })).status,
    'stopping'
  );
  await running;
  assert.equal(exited, true);
});

test('serialized broker stop refuses recovery-only registration evidence', async () => {
  const clock = fakeClock();
  const server = fakeServer();
  const item = registration('review-unreconciled');
  const worker = fakeWorker('recovery-only');
  const running = runBroker(
    brokerInput({
      clock,
      server,
      registrations: [item],
      workers: new Map([[item.review_id, worker]]),
    })
  );
  await server.ready;
  await assert.rejects(server.request({ id: 'stop-recovery', command: 'stop', workspace: null }), {
    code: 'APR_BROKER_STOP_REFUSED',
  });
  await clock.advance(60_000);
  await running;
});

test('recovery-only work records suspension before releasing resources', async () => {
  const order = [];
  const worker = createReviewWorker({
    registration: registration('review-recovery'),
    adapter: {
      automatic: false,
      async persistRecovery() {
        order.push('persist-recovery');
      },
      async close() {
        order.push('adapter-close');
      },
    },
    resourceLease: {
      release() {
        order.push('resource-release');
      },
    },
    clock: fakeClock(),
    inspectStatus: () => ({
      state: 'intervention-required',
      next_action: { action: 'human-intervention' },
    }),
  });

  await worker.start();
  assert.equal(worker.workState(), 'recovery-only');
  await worker.suspend();
  await worker.close();
  assert.deepEqual(order, ['persist-recovery', 'adapter-close', 'resource-release']);
});

test('reviewer acceptance remains runnable until author finalization is terminal', async () => {
  let status = {
    state: 'acceptance-pending',
    next_action: { action: 'finalize-acceptance' },
  };
  const worker = createReviewWorker({
    registration: registration('review-finalize'),
    adapter: { automatic: true },
    resourceLease: { release() {} },
    clock: fakeClock(),
    inspectStatus: () => status,
  });

  await worker.start();
  assert.equal(worker.workState(), 'runnable');
  status = { state: 'accepted', next_action: { action: null } };
  await worker.reconcile();
  assert.equal(worker.workState(), 'terminal');
});

test('native server authenticates the peer before dispatching one closed command', async () => {
  const handshake = {
    schema: 'ai-peer-review.broker-handshake/v1',
    tuple: ['ai-peer-review.broker-root/v1', '/project', null, '501'],
    versions: { package_version: '1.0.0', broker_protocol_version: 1, node_major: 24 },
    instance_id: 'a'.repeat(64),
    nonce: 'b'.repeat(64),
  };
  const writes = [];
  let resolveClosed;
  const closed = new Promise((resolve) => {
    resolveClosed = resolve;
  });
  let accepted = false;
  const connection = {
    frames: [
      encodeFrame(handshake),
      encodeFrame({ id: 'status-1', command: 'status', workspace: null }),
    ],
    readFrame() {
      return this.frames.shift();
    },
    write(bytes) {
      writes.push(bytes);
    },
    close() {
      resolveClosed();
    },
  };
  const owner = {
    handshake,
    endpoint: {
      accept() {
        if (!accepted) {
          accepted = true;
          return connection;
        }
        const error = new Error('timeout');
        error.code = 'APR_BROKER_START_FAILED';
        throw error;
      },
    },
  };
  const server = createAuthenticatedBrokerServer(owner, {
    peerUser: () => '501',
  });
  server.start(async (command) => ({ echoed: command.command }));
  await closed;
  server.close();

  assert.equal(writes.length, 2);
  assert.deepEqual(JSON.parse(writes[1].subarray(4)), {
    id: 'status-1',
    ok: true,
    result: { echoed: 'status' },
    error: null,
  });
});

test('native server fences a malformed peer and continues accepting valid clients', async () => {
  const handshake = {
    schema: 'ai-peer-review.broker-handshake/v1',
    tuple: ['ai-peer-review.broker-root/v1', '/project', null, '501'],
    versions: { package_version: '1.0.0', broker_protocol_version: 1, node_major: 24 },
    instance_id: 'a'.repeat(64),
    nonce: 'b'.repeat(64),
  };
  const writes = [];
  let accepts = 0;
  let resolveValid;
  const validClosed = new Promise((resolve) => {
    resolveValid = resolve;
  });
  const owner = {
    handshake,
    endpoint: {
      accept() {
        accepts += 1;
        if (accepts === 1) {
          return {
            readFrame: () => Buffer.from([0, 0, 0, 2, 123]),
            close() {},
          };
        }
        if (accepts === 2) {
          const frames = [
            encodeFrame(handshake),
            encodeFrame({ id: 'status-after-malformed', command: 'status', workspace: null }),
          ];
          return {
            readFrame: () => frames.shift(),
            write(bytes) {
              writes.push(bytes);
            },
            close() {
              resolveValid();
            },
          };
        }
        const error = new Error('timeout');
        error.code = 'APR_BROKER_START_FAILED';
        throw error;
      },
    },
  };
  const server = createAuthenticatedBrokerServer(owner, { peerUser: () => '501' });
  server.start(async () => ({ status: 'running' }));
  await validClosed;
  server.close();

  assert.equal(accepts >= 2, true);
  assert.equal(writes.length, 2);
});

test('rejected registration preserves the broker idle deadline', async () => {
  const clock = fakeClock();
  const server = fakeServer();
  let exited = false;
  const running = runBroker(brokerInput({ clock, server })).then(() => (exited = true));

  await server.ready;
  await clock.advance(30_000);
  await assert.rejects(
    server.request({ id: 'foreign', command: 'register', workspace: '/foreign/review' }),
    { code: 'APR_BROKER_AUTH_FAILED' }
  );
  await clock.advance(29_999);
  assert.equal(exited, false);
  await clock.advance(1);
  await running;
  assert.equal(exited, true);
});

test('broker suspension persists recovery before idle shutdown releases active worker resources', async () => {
  const clock = fakeClock();
  const server = fakeServer();
  const order = [];
  const item = registration('review-active');
  const worker = createReviewWorker({
    registration: item,
    adapter: {
      automatic: true,
      async persistRecovery() {
        order.push('persist-recovery');
      },
      async close() {
        order.push('adapter-close');
      },
    },
    resourceLease: { release: () => order.push('resource-release') },
    clock,
    inspectStatus: () => ({ state: 'reviewing', next_action: { action: 'await-reviewer' } }),
  });
  const running = runBroker(
    brokerInput({
      clock,
      server,
      registrations: [item],
      workers: new Map([[item.review_id, worker]]),
    })
  );

  await server.ready;
  await server.request({ id: 'suspend-active', command: 'suspend', workspace: item.workspace });
  await clock.advance(60_000);
  await running;
  assert.deepEqual(order, ['persist-recovery', 'adapter-close', 'resource-release']);
});

test('broker retains ownership when worker recovery persistence fails', async () => {
  const clock = fakeClock();
  const server = fakeServer();
  const item = registration('review-persist-failure');
  let ownerReleased = false;
  const running = runBroker({
    ...brokerInput({
      clock,
      server,
      registrations: [item],
      workers: new Map([
        [
          item.review_id,
          {
            start: async () => {
              throw new Error('startup observation failed');
            },
            reconcile: async () => {},
            suspend: async () => {
              throw new Error('recovery write failed');
            },
            close: async () => {},
            workState: () => 'automatic-wait',
          },
        ],
      ]),
    }),
    owner: { release: () => (ownerReleased = true) },
  });
  await assert.rejects(running, /recovery write failed/);
  assert.equal(ownerReleased, false);
});

test('worker persists recovery before its coordinator releases the lease', async () => {
  const order = [];
  let stop;
  const worker = createReviewWorker({
    registration: registration('review-coordinator-recovery'),
    adapter: {
      automatic: true,
      coordinatorInput: {},
      async persistRecovery() {
        order.push('persist-recovery');
      },
    },
    resourceLease: { release: () => order.push('resource-release') },
    clock: fakeClock(),
    inspectStatus: () => ({ state: 'reviewing', next_action: { action: 'await-reviewer' } }),
    coordinator: async (input) => {
      await new Promise((resolve) => {
        stop = resolve;
      });
      await input.beforeRelease();
      order.push('coordinator-lease-release');
    },
  });
  await worker.start();
  const suspending = worker.suspend();
  stop();
  assert.equal(await suspending, 'recovery-only');
  assert.equal(worker.workState(), 'recovery-only');
  await worker.close();
  assert.deepEqual(order, ['persist-recovery', 'coordinator-lease-release', 'resource-release']);
});

test('coordinator settlement updates worker state without a client reconcile command', async () => {
  let status = { state: 'reviewing', next_action: { action: 'await-reviewer' } };
  let coordinatorInput;
  const worker = createReviewWorker({
    registration: registration('review-progress'),
    adapter: { automatic: true, coordinatorInput: {} },
    resourceLease: null,
    clock: fakeClock(),
    inspectStatus: () => status,
    coordinator: async (input) => {
      coordinatorInput = input;
      await input.waitForStop({ untilStopped: new Promise(() => {}) });
    },
  });

  await worker.start();
  assert.equal(worker.workState(), 'automatic-wait');
  status = { state: 'accepted', next_action: { action: null } };
  await coordinatorInput.onSettled();
  assert.equal(worker.workState(), 'terminal');
  await worker.close();
});

test('autonomous worker terminal progress starts the broker idle deadline', async () => {
  const clock = fakeClock();
  const server = fakeServer();
  const item = registration('review-autonomous-terminal');
  let status = { state: 'reviewing', next_action: { action: 'await-reviewer' } };
  let coordinatorInput;
  const worker = createReviewWorker({
    registration: item,
    adapter: { automatic: true, coordinatorInput: {} },
    resourceLease: null,
    clock,
    inspectStatus: () => status,
    coordinator: async (input) => {
      coordinatorInput = input;
      await input.waitForStop({ untilStopped: new Promise(() => {}) });
    },
  });
  let exited = false;
  const running = runBroker(
    brokerInput({
      clock,
      server,
      registrations: [item],
      workers: new Map([[item.review_id, worker]]),
    })
  ).then(() => (exited = true));
  await server.ready;
  status = { state: 'accepted', next_action: { action: null } };
  await coordinatorInput.onSettled();
  await new Promise((resolve) => setImmediate(resolve));
  await clock.advance(59_999);
  assert.equal(exited, false);
  await clock.advance(1);
  await running;
  assert.equal(exited, true);
});
