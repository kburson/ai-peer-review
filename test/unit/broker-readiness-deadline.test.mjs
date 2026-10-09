// @story #137
import assert from 'node:assert/strict';
import test from 'node:test';
import { performance } from 'node:perf_hooks';
import { createBrokerClientOperations } from '../../src/broker/client-core.mjs';

for (const recovery of [false, true]) {
  test(
    recovery
      ? 'retirement reacquisition retains the original elapsed deadline'
      : 'readiness counts time spent in retryable connection attempts',
    async (t) => {
      let elapsed = 0;
      t.mock.method(performance, 'now', () => elapsed);
      const busy = Object.assign(new Error('occupied endpoint'), { code: 'EBUSY' });
      const stale = Object.assign(new Error('Broker discovery metadata is unavailable.'), {
        code: 'APR_BROKER_STALE',
      });
      let ready = recovery;
      const platform = {
        verifyRuntimeImage: () => true,
        discoveryState: () => 'missing',
        delay: async (ms) => {
          elapsed += ms;
        },
        connect: async () => {
          if (ready) {
            ready = false;
            return {
              takeConnection: async () => {
                elapsed += 60_000;
                throw stale;
              },
            };
          }
          // Models time spent inside Windows WaitNamedPipe, not just retry sleep.
          elapsed += 5_000;
          throw busy;
        },
      };
      const { ensureBroker, requestBroker } = createBrokerClientOperations({
        performCurrentOperationEffect: (operation) => operation(),
        assertCurrentOperationAuthority: () => {},
      });
      const input = {
        project: { digest: 'a'.repeat(64) },
        versions: {},
        runtimeImage: { root: '/retained', nodeExecutable: '/retained/node' },
        platform,
      };
      await assert.rejects(
        async () => {
          const client = await ensureBroker(input);
          if (recovery) await requestBroker(client, 'stop');
        },
        (error) => error === busy || error.code === 'APR_BROKER_START_FAILED'
      );
      // At most one already-started five-second native attempt can cross the deadline.
      assert.ok(elapsed <= 125_000, 'elapsed acquisition exceeded its deadline: ' + elapsed);
      assert.ok(elapsed >= 120_000, 'refused before allowing the existing readiness budget');
    }
  );
}

test('an acquired connection after the elapsed deadline is closed without a command', async (t) => {
  let elapsed = 0;
  let commands = 0;
  let closes = 0;
  t.mock.method(performance, 'now', () => elapsed);
  const { requestBroker } = createBrokerClientOperations({
    performCurrentOperationEffect: (operation) => operation(),
    assertCurrentOperationAuthority: () => {},
  });
  const client = {
    takeConnection: async () => {
      elapsed = 120_001;
      return {
        exchange: () => {
          commands += 1;
          return Buffer.alloc(0);
        },
        close: () => {
          closes += 1;
        },
      };
    },
  };
  await assert.rejects(requestBroker(client, 'stop'), { code: 'APR_BROKER_START_FAILED' });
  assert.equal(commands, 0);
  assert.equal(closes, 1);
});
