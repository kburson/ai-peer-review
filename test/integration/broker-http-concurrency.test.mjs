import assert from 'node:assert/strict';
import test from 'node:test';
import { performance } from 'node:perf_hooks';
import { portableBrokerFixture } from '../helpers/portable-broker-fixture.mjs';

test('64 slow sockets preserve authenticated status and cancellation under one second', async (t) => {
  const f = await portableBrokerFixture(t);
  const sockets = await Promise.all(Array.from({ length: 64 }, () => f.rawSocket()));
  for (const socket of sockets) socket.write('POST /rpc HTTP/1.1\r\nHost: ');
  await f.flush();
  const started = performance.now();
  assert.equal((await f.request()).ok, true);
  assert.equal((await f.request({ operation: 'cancel' })).ok, true);
  assert.ok(performance.now() - started < 1_000);
  f.clock.advance(5_000);
  await f.flush();
  assert.equal(
    sockets.every((socket) => socket.destroyed),
    true
  );
});

test('pending cap preserves existing authenticated keep-alive controls and recovers capacity', async (t) => {
  const f = await portableBrokerFixture(t);
  assert.equal((await f.request()).ok, true);
  const slow = await Promise.all(Array.from({ length: 128 }, () => f.rawSocket()));
  await f.waitForPending(128);
  const excess = await f.rawSocket();
  await f.waitForClosed(excess);
  assert.equal(excess.destroyed, true);
  assert.equal((await f.request()).ok, true);
  assert.equal((await f.request({ operation: 'cancel' })).ok, true);
  for (const socket of slow) socket.destroy();
  await f.waitForPending(0);
  const recovered = await f.rawSocket();
  await f.waitForPending(1);
  assert.equal(recovered.destroyed, false);
});

for (const [name, drip, deadline] of [
  ['idle', false, 5_000],
  ['receipt', true, 10_000],
]) {
  test(
    `real monotonic clock enforces ${name} deadline within 250ms`,
    { timeout: 12_000 },
    async (t) => {
      const f = await portableBrokerFixture(t, { realClock: true });
      const start = performance.now();
      const socket = await f.rawSocket();
      const closed = new Promise((resolve) => socket.once('close', resolve));
      let timer;
      if (drip) {
        socket.write('POST /rpc HTTP/1.1\r\nX-Drip: ');
        timer = setInterval(() => socket.write('x'), 2_000);
        t.after(() => clearInterval(timer));
      }
      await closed;
      const elapsed = performance.now() - start;
      assert.ok(elapsed >= deadline - 25, `early ${name} deadline: ${elapsed}`);
      assert.ok(elapsed <= deadline + 250, `late/inconclusive ${name} deadline: ${elapsed}`);
    }
  );
}

test('256 authenticated sockets bound total admission and cleanup restores capacity', async (t) => {
  const f = await portableBrokerFixture(t);
  const { default: http } = await import('node:http');
  const agents = Array.from(
    { length: 256 },
    () => new http.Agent({ keepAlive: true, maxSockets: 1 })
  );
  t.after(() => {
    for (const agent of agents) agent.destroy();
  });
  for (const agent of agents) assert.equal((await f.request({ agent })).ok, true);
  const refused = await f.rawSocket();
  await f.waitForClosed(refused);
  assert.equal(refused.destroyed, true);
  assert.equal((await f.request({ agent: agents[0] })).ok, true);
  const released = Object.values(agents[1].freeSockets).flat()[0];
  assert.ok(released, 'authenticated keep-alive socket exists before release');
  // Arm this authenticated socket's genuine next-request receipt before release.
  // Its clearing acknowledges the server close handler, not client-local close.
  released.write('POST /rpc HTTP/1.1\r\nHost: ');
  await f.waitForPending(1);
  agents[1].destroy();
  await f.waitForPending(0);
  const admitted = await f.rawSocket();
  await f.waitForPending(1);
  assert.equal(admitted.destroyed, false);
});

test(
  'authenticated control survives six seconds idle before full pending saturation',
  { timeout: 9_000 },
  async (t) => {
    const f = await portableBrokerFixture(t, { realClock: true });
    const { createLoopbackBrokerClient } = await import('../../src/broker/ipc.mjs');
    const client = createLoopbackBrokerClient({
      endpoint: f.endpoint,
      privateBinding: f.privateBinding,
    });
    t.after(() => client.close?.());
    assert.deepEqual(await client.request({ id: 'before', command: 'status', workspace: null }), {
      operation: 'status',
    });
    assert.equal((await f.request()).ok, true);
    await new Promise((resolve) => setTimeout(resolve, 6_100));
    const slow = await Promise.all(Array.from({ length: 128 }, () => f.rawSocket()));
    await f.waitForPending(128);
    assert.deepEqual(await client.request({ id: 'after', command: 'status', workspace: null }), {
      operation: 'status',
    });
    assert.deepEqual(await client.request({ id: 'cancel', command: 'stop', workspace: null }), {
      operation: 'stop',
    });
    assert.equal((await f.request()).ok, true);
    assert.equal((await f.request({ operation: 'cancel' })).ok, true);
    for (const socket of slow) socket.destroy();
  }
);
