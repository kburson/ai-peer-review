import assert from 'node:assert/strict';
import test from 'node:test';

import { createAuthenticatedBrokerServer, runBroker } from '../helpers/broker-service-api.mjs';
import { encodeFrame } from '../../src/broker/ipc.mjs';
import { createReviewWorker } from '../../src/broker/worker.mjs';
import { recoveryWorkerFixture } from '../helpers/recovery-worker-fixture.mjs';

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

test(
  'broker publishes discovery only after recovery finishes and its server starts',
  { timeout: 1_000 },
  async () => {
    const clock = fakeClock();
    const server = fakeServer();
    const item = registration('slow-recovery');
    const worker = fakeWorker('terminal');
    let finishRecovery;
    const recovery = new Promise((resolve) => (finishRecovery = resolve));
    let startedRecovery;
    const recovering = new Promise((resolve) => (startedRecovery = resolve));
    worker.start = async () => {
      startedRecovery();
      await recovery;
    };
    let serving = false;
    const start = server.start;
    server.start = (handler) => {
      serving = true;
      start(handler);
    };
    let publications = 0;
    let published;
    const publication = new Promise((resolve) => {
      published = resolve;
    });
    const running = runBroker({
      ...brokerInput({
        clock,
        server,
        registrations: [item],
        workers: new Map([[item.review_id, worker]]),
      }),
      owner: {
        publish() {
          assert.equal(serving, true);
          publications++;
          published();
        },
        release() {},
      },
    });
    await recovering;
    assert.equal(publications, 0);
    assert.equal(serving, false);
    finishRecovery();
    await server.ready;
    await publication;
    try {
      assert.equal(publications, 1);
      assert.equal((await server.request({ id: 'ready', command: 'status' })).reviews, 0);
    } finally {
      await clock.advance(60_000);
      await running;
    }
  }
);

test('failed recovery releases safe ownership without publishing discovery', async () => {
  const clock = fakeClock();
  const server = fakeServer();
  const item = registration('failed-recovery');
  const worker = fakeWorker('terminal');
  worker.start = async () => {
    throw new Error('recovery failed');
  };
  let published = false;
  let released = false;
  let started = false;
  server.start = () => {
    started = true;
  };
  await assert.rejects(
    runBroker({
      ...brokerInput({
        clock,
        server,
        registrations: [item],
        workers: new Map([[item.review_id, worker]]),
      }),
      owner: {
        publish: () => {
          published = true;
        },
        release: () => {
          released = true;
        },
      },
    }),
    /recovery failed/
  );
  assert.equal(published, false);
  assert.equal(started, false);
  assert.equal(released, true);
  assert.equal(server.closed, true);
});

test('publication failure closes the started server and releases safe ownership', async () => {
  const server = fakeServer();
  let released = false;
  await assert.rejects(
    runBroker({
      ...brokerInput({ clock: fakeClock(), server }),
      owner: {
        publish() {
          throw new Error('publication failed');
        },
        release() {
          released = true;
        },
      },
    }),
    /publication failed/
  );
  await server.ready;
  assert.equal(server.closed, true);
  assert.equal(released, true);
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

test('broker retains endpoint ownership until the stop response is drained', async () => {
  const clock = fakeClock();
  const server = fakeServer();
  let resolveReply;
  let resolveCloseCalled;
  const reply = new Promise((resolve) => (resolveReply = resolve));
  const closeCalled = new Promise((resolve) => (resolveCloseCalled = resolve));
  const events = [];
  server.close = () => {
    resolveCloseCalled();
    return reply;
  };
  const running = runBroker({
    ...brokerInput({ clock, server }),
    owner: { release: () => events.push('released') },
  });
  await server.ready;
  assert.equal((await server.request({ id: 'stop-response', command: 'stop' })).status, 'stopping');
  await closeCalled;
  try {
    assert.deepEqual(events, []);
  } finally {
    resolveReply();
    await running;
  }
  assert.deepEqual(events, ['released']);
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

test('native server close waits for an in-flight authenticated reply', async () => {
  const handshake = {
    schema: 'ai-peer-review.broker-handshake/v1',
    tuple: ['ai-peer-review.broker-root/v1', '/project', null, '501'],
    versions: { package_version: '1.0.0', broker_protocol_version: 1, node_major: 24 },
    instance_id: 'a'.repeat(64),
    nonce: 'b'.repeat(64),
  };
  let resolveDispatch;
  let resolveEntered;
  let resolveClosed;
  const gate = new Promise((resolve) => (resolveDispatch = resolve));
  const entered = new Promise((resolve) => (resolveEntered = resolve));
  const connectionClosed = new Promise((resolve) => (resolveClosed = resolve));
  const writes = [];
  const frames = [
    encodeFrame(handshake),
    encodeFrame({ id: 'stop-ack', command: 'stop', workspace: null }),
  ];
  const server = createAuthenticatedBrokerServer(
    {
      handshake,
      endpoint: {
        accept: () => ({
          readFrame: () => frames.shift(),
          write: (bytes, options) => writes.push({ bytes, options }),
          close: () => resolveClosed(),
        }),
      },
    },
    { peerUser: () => '501' }
  );
  server.start(async () => {
    resolveEntered();
    await gate;
    return { status: 'stopping' };
  });
  await entered;
  const closing = server.close();
  let settled = false;
  Promise.resolve(closing).then(() => (settled = true));
  try {
    await Promise.resolve();
    assert.equal(settled, false);
    assert.equal(writes.length, 1);
  } finally {
    resolveDispatch();
    await connectionClosed;
  }
  await closing;
  assert.equal(writes.length, 2);
  assert.deepEqual(writes[1].options, { drain: true });
  assert.equal(JSON.parse(writes[1].bytes.subarray(4)).result.status, 'stopping');
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

test('recovery snapshot progression does not block broker readiness or launch providers', async (t) => {
  const f = recoveryWorkerFixture(t);
  const first = await f.makeWorker();
  await first.start();
  await first.suspend();
  await first.close();
  const original = f.bytes();
  f.setState('reviewer-turn');
  const clock = fakeClock();
  const server = fakeServer();
  let published = false;
  let publishReady;
  const publication = new Promise((resolve) => {
    publishReady = resolve;
  });
  const worker = await f.makeWorker(clock);
  const input = brokerInput({
    clock,
    server,
    registrations: [f.registration],
    workers: new Map([[f.registration.review_id, worker]]),
  });
  input.identity = {
    digest: f.registration.project_digest,
    physicalRoot: f.registration.project_root,
  };
  input.owner = {
    async publish() {
      await new Promise((resolve) => setImmediate(resolve));
      published = true;
      publishReady();
    },
    release() {},
  };
  const running = runBroker(input);
  await Promise.race([server.ready, running]);
  await Promise.race([publication, running]);
  assert.equal(published, true);
  assert.equal((await server.request({ id: 'status', command: 'status' })).reviews, 0);
  assert.equal(f.bytes(), original);
  await clock.advance(60_000);
  await running;
});

test('failed worker cleanup retains its subscription and exact owner-release obligations', async () => {
  const item = registration('retained-worker');
  const clock = fakeClock();
  const server = fakeServer();
  let unsubscribed = 0;
  let released = 0;
  const worker = {
    start: async () => {
      throw new Error('restoration refused');
    },
    reconcile: async () => {},
    suspend: async () => {},
    close: async () => {
      throw new Error('worker cleanup unresolved');
    },
    workState: () => 'automatic-wait',
    onStateChange: () => () => {
      unsubscribed += 1;
    },
  };
  await assert.rejects(
    runBroker({
      ...brokerInput({
        clock,
        server,
        registrations: [item],
        workers: new Map([[item.review_id, worker]]),
      }),
      owner: {
        instanceId: 'retained-instance',
        release: () => {
          released += 1;
        },
      },
    }),
    (error) => {
      assert.match(error.message, /worker cleanup unresolved/);
      assert.ok(
        error.details?.outstandingObligations?.some(
          (value) => value.name === 'broker-worker' && value.workspace === item.workspace
        )
      );
      assert.ok(
        error.details.outstandingObligations.some(
          (value) => value.name === 'owner-release' && value.instanceId === 'retained-instance'
        )
      );
      return true;
    }
  );
  assert.equal(unsubscribed, 0);
  assert.equal(released, 0);
  assert.equal(server.closed, true);
});

test('not-drained server shutdown retains exact server and owner-release obligations', async () => {
  const clock = fakeClock();
  const server = fakeServer();
  server.close = async () => {
    throw new Error('stop response not drained');
  };
  let released = 0;
  const running = runBroker({
    ...brokerInput({ clock, server }),
    owner: {
      instanceId: 'not-drained-instance',
      release: () => {
        released += 1;
      },
    },
  });
  const failed = assert.rejects(running, (error) => {
    assert.match(error.message, /stop response not drained/);
    assert.ok(
      error.details?.outstandingObligations?.some((value) => value.name === 'broker-server')
    );
    assert.ok(
      error.details.outstandingObligations.some(
        (value) => value.name === 'owner-release' && value.instanceId === 'not-drained-instance'
      )
    );
    return true;
  });
  await server.ready;
  await server.request({ id: 'stop-one', command: 'stop', workspace: null });
  await failed;
  assert.equal(released, 0);
});

test('broker startup, later requests and shutdown use independent bounded authority scopes', async () => {
  const { createBrokerService } = await import('../../src/broker/service-core.mjs');
  const scopes = [];
  let active = 0;
  const service = createBrokerService({
    withOperationAuthority: async (input, operation) => {
      scopes.push(input.operation);
      active += 1;
      try {
        return await operation();
      } finally {
        active -= 1;
      }
    },
    assertCurrentOperationAuthority: async () => {
      assert.ok(active > 0);
    },
  });
  const clock = fakeClock();
  const server = fakeServer();
  const running = service.runBroker(brokerInput({ clock, server }));
  await server.ready;
  await new Promise((resolve) => setImmediate(resolve));
  const startupActive = active;
  const status = await server.request({ id: 'status-later', command: 'status', workspace: null });
  assert.equal(status.status, 'running');
  await server.request({ id: 'stop-later', command: 'stop', workspace: null });
  await running;
  assert.equal(
    startupActive,
    0,
    'startup authority must finish before the long-lived broker waits'
  );
  assert.deepEqual(scopes, ['broker.reconcile', 'broker.status', 'broker.stop', 'broker.stop']);
  assert.equal(active, 0);
});

test('unavailable shutdown authority retains server and owner obligations before cleanup begins', async () => {
  const { createBrokerService } = await import('../../src/broker/service-core.mjs');
  let stopScopes = 0;
  let released = 0;
  const service = createBrokerService({
    withOperationAuthority: async (input, operation) => {
      if (input.operation === 'broker.stop' && ++stopScopes === 2)
        throw new Error('cleanup source unavailable');
      return operation();
    },
    assertCurrentOperationAuthority: async () => {},
  });
  const clock = fakeClock();
  const server = fakeServer();
  const running = service.runBroker({
    ...brokerInput({ clock, server }),
    owner: {
      instanceId: 'retained-source-instance',
      release: async () => {
        released += 1;
      },
    },
  });
  const failed = assert.rejects(running, (error) => {
    assert.match(error.message, /cleanup source unavailable/);
    assert.ok(
      error.details?.outstandingObligations?.some((value) => value.name === 'broker-server')
    );
    assert.ok(
      error.details.outstandingObligations.some(
        (value) => value.name === 'owner-release' && value.instanceId === 'retained-source-instance'
      )
    );
    return true;
  });
  await server.ready;
  await server.request({ id: 'stop-source', command: 'stop', workspace: null });
  await failed;
  assert.equal(server.closed, false);
  assert.equal(released, 0);
});

test('a broker run reports completed bounded startup separately from its long-lived stop promise', async () => {
  const { createBrokerService } = await import('../../src/broker/service-core.mjs');
  const service = createBrokerService({
    withOperationAuthority: async (_input, operation) => operation(),
    assertCurrentOperationAuthority: async () => {},
  });
  assert.equal(typeof service.startBroker, 'function');
  const clock = fakeClock();
  const server = fakeServer();
  let published = false;
  const lifecycle = service.startBroker({
    ...brokerInput({ clock, server }),
    owner: {
      publish: async () => {
        await new Promise((resolve) => setImmediate(resolve));
        published = true;
      },
      release: async () => {},
    },
  });
  assert.equal(lifecycle.verified, false);
  await lifecycle.ready;
  assert.equal(published, true);
  let stopped = false;
  lifecycle.untilStopped.then(() => {
    stopped = true;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(stopped, false);
  await server.request({ id: 'stop-split', command: 'stop', workspace: null });
  await lifecycle.untilStopped;
  assert.equal(stopped, true);
});

test('service lifetime phases use their owned authority path while request scopes remain separate', async () => {
  const { createBrokerService } = await import('../../src/broker/service-core.mjs');
  const phases = [];
  const requests = [];
  const service = createBrokerService({
    withOperationAuthority: async (input, operation) => {
      requests.push(input.operation);
      return operation();
    },
    withLifecycleAuthority: async (input, operation) => {
      phases.push(input.operation);
      return operation();
    },
    assertCurrentOperationAuthority: async () => {},
  });
  const clock = fakeClock();
  const server = fakeServer();
  const running = service.runBroker(brokerInput({ clock, server }));
  await server.ready;
  await server.request({ id: 'status-phases', command: 'status', workspace: null });
  await server.request({ id: 'stop-phases', command: 'stop', workspace: null });
  await running;
  assert.deepEqual(phases, ['broker.reconcile', 'broker.stop']);
  assert.deepEqual(requests, ['broker.status', 'broker.stop']);
});

test('review correction: successful drain reaches the private release without ordinary closed-listener verification', async () => {
  const clock = fakeClock(),
    server = fakeServer();
  let releases = 0;
  const running = runBroker({
    ...brokerInput({ clock, server }),
    cleanupGuard: async () => {
      if (server.closed) throw new Error('ordinary verify cannot accept drained readiness');
    },
    owner: {
      instanceId: 'drain-release',
      release: async () => {
        assert.equal(server.closed, true);
        releases++;
        return { released: true };
      },
    },
  });
  const checked = assert.doesNotReject(running);
  await server.ready;
  await server.request({ id: 'stop-drain', command: 'stop', workspace: null });
  await checked;
  assert.equal(releases, 1);
});
