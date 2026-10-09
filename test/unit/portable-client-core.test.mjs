// @story #189
import assert from 'node:assert/strict';
import test from 'node:test';
import { createPortableClientCore } from '../../src/broker/client-core.mjs';
const input = { project: { physicalRoot: '/project' }, runtimeImage: { root: '/image' } };
test('an unsent command reacquires a normally retired broker under the same original context', async () => {
  const context = { signal: new AbortController().signal, deadline: 30000 };
  let running = false,
    launches = 0,
    requests = 0;
  const core = createPortableClientCore({
    clock: { now: () => 0 },
    current: async () => {},
    effect: (fn) => fn(),
    delay: async () => {},
    launch: async () => {
      launches++;
      running = true;
      return { ready: Promise.resolve(), exited: () => false, unref() {} };
    },
    observe: async (_input, received) => {
      assert.equal(received, context);
      return running
        ? {
            status: 'live',
            close: async () => {},
            request: async ({ actionId }) => {
              requests++;
              return {
                schema: 'ai-peer-review.response/v1',
                ok: true,
                action_id: actionId,
                result: { status: 'stopped' },
              };
            },
          }
        : { status: 'missing' };
    },
  });
  assert.equal(core.verified, false);
  assert.deepEqual(await core.request(input, 'stop', null, context), { status: 'stopped' });
  assert.equal(launches, 1);
  assert.equal(requests, 1);
});
test('copied unknown owner evidence cannot launch and current authority drift forbids effects', async () => {
  let effects = 0;
  const context = { signal: new AbortController().signal, deadline: 30000 };
  const ports = {
    clock: { now: () => 0 },
    current: async () => {},
    effect: (fn) => fn(),
    delay: async () => {},
    launch: async () => {
      effects++;
    },
    observe: async () => ({ status: 'unknown', verified: true, peerUser: 'same-user' }),
  };
  const core = createPortableClientCore(ports);
  await assert.rejects(core.ensure(input, context), { code: 'APR_BROKER_START_FAILED' });
  await assert.rejects(core.request(input, 'stop', null, context), {
    code: 'APR_BROKER_START_FAILED',
  });
  const drift = createPortableClientCore({
    ...ports,
    current: async () => {
      throw new Error('current authority changed');
    },
  });
  await assert.rejects(drift.ensure(input, context), /current authority changed/);
  assert.equal(effects, 0);
});

test('review correction: launched candidate waits through partial protected publication without another launch or renewed budget', async () => {
  const context = { signal: new AbortController().signal, deadline: 30000 };
  let now = 0,
    launches = 0,
    observations = 0;
  const core = createPortableClientCore({
    clock: { now: () => now },
    current: async () => {},
    effect: (fn) => fn(),
    delay: async (ms) => {
      now += ms;
    },
    launch: async () => {
      launches++;
      return { ready: Promise.resolve(), exited: () => false, unref() {} };
    },
    observe: async (_input, received) => {
      assert.equal(received, context);
      observations++;
      return observations === 1
        ? { status: 'missing' }
        : observations < 4
          ? { status: 'pending' }
          : { status: 'live', close: async () => {} };
    },
  });
  await core.ensure(input, context);
  assert.equal(launches, 1);
  assert.equal(observations, 4);
  assert.equal(context.deadline, 30000);
});

test('review correction: independently verified dead observation reaches guarded candidate acquisition without deleting retained records', async () => {
  const context = { signal: new AbortController().signal, deadline: 30000 };
  let launched = false,
    deleted = 0;
  const core = createPortableClientCore({
    clock: { now: () => 0 },
    current: async () => {},
    effect: (fn) => fn(),
    delay: async () => {},
    launch: async () => {
      launched = true;
      return { ready: Promise.resolve(), exited: () => false, unref() {} };
    },
    observe: async () =>
      launched
        ? { status: 'live', close: async () => {} }
        : {
            status: 'dead',
            deleteRecords() {
              deleted++;
            },
          },
  });
  await core.ensure(input, context);
  assert.equal(launched, true);
  assert.equal(deleted, 0);
});

test('review correction: an existing partial publication is awaited without a candidate launch', async () => {
  const context = { signal: new AbortController().signal, deadline: 30000 };
  let calls = 0,
    launches = 0;
  const core = createPortableClientCore({
    clock: { now: () => 0 },
    current: async () => {},
    effect: (fn) => fn(),
    delay: async () => {},
    launch: async () => {
      launches++;
    },
    observe: async () =>
      ++calls < 3 ? { status: 'pending' } : { status: 'live', close: async () => {} },
  });
  await core.ensure(input, context);
  assert.equal(launches, 0);
  assert.equal(calls, 3);
});

test('review correction: unsent absence is distinct from unknown owner evidence and is never synthesized from silence', async () => {
  const context = { signal: new AbortController().signal, deadline: 30000 };
  const ports = {
    clock: { now: () => 0 },
    current: async () => {},
    effect: (fn) => fn(),
    delay: async () => {},
    launch: async () => {
      throw new Error('unexpected launch');
    },
  };
  for (const status of ['missing', 'dead']) {
    const core = createPortableClientCore({ ...ports, observe: async () => ({ status }) });
    await assert.rejects(
      core.request({ project: input.project }, 'reconcile', '/project/review', context),
      (error) =>
        error.code === 'APR_BROKER_STALE' &&
        error.details.reason === 'owner-absent-before-dispatch' &&
        error.details.ownerState === status &&
        error.details.mutationOccurred === false &&
        error.details.retrySafe === true
    );
  }
  const unknown = createPortableClientCore({
    ...ports,
    observe: async () => ({ status: 'unknown', verified: true, dead: true }),
  });
  await assert.rejects(
    unknown.request({ project: input.project }, 'reconcile', '/project/review', context),
    (error) =>
      error.code === 'APR_BROKER_START_FAILED' &&
      error.details.reason === 'owner-observation-unproved'
  );
});
