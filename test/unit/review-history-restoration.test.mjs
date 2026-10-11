// @story #202
// Pure service-state regression; no native build, IPC or provider execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runBroker } from '../helpers/broker-service-api.mjs';

test('historical attempts cannot restore automation or obstruct service shutdown', async () => {
  const ready = Promise.withResolvers();
  const item = {
    review_id: 'obsolete',
    workspace: '/project/.scratch/peer-review/reviews/obsolete',
    project_digest: 'a'.repeat(64),
  };
  let dispatch,
    closed = false,
    released = false;
  const registry = { list: () => [item], get: () => item };
  const running = runBroker({
    identity: { digest: 'a'.repeat(64), physicalRoot: '/project' },
    owner: {
      release() {
        released = true;
      },
    },
    versions: { package_version: '1.0.0', broker_protocol_version: 1, node_major: 24 },
    registry,
    isPreserved: (workspace) => workspace === item.workspace,
    workerFactory() {
      throw new Error('Historical provider execution attempted');
    },
    clock: { now: () => 0, setTimeout: () => 1, clearTimeout() {} },
    server: {
      start(handler) {
        dispatch = handler;
        ready.resolve();
      },
      close() {
        closed = true;
      },
    },
  });
  await Promise.race([ready.promise, running]);
  assert.equal((await dispatch({ id: 'status', command: 'status' })).reviews, 0);
  assert.equal((await dispatch({ id: 'stop', command: 'stop' })).status, 'stopping');
  await running;
  assert.equal(registry.list().length, 1);
  assert.equal(closed, true);
  assert.equal(released, true);
});
