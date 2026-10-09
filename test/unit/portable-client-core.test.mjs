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
