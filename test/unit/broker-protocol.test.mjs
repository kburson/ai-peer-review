// @story #189
import assert from 'node:assert/strict';
import test from 'node:test';
const protocol = await import('../../src/broker/broker-protocol.mjs').catch(() => ({}));

test('portable command validation accepts the closed status and workspace command shapes', () => {
  assert.equal(typeof protocol.validateCommand, 'function');
  for (const command of ['status', 'stop']) {
    const input = { id: 'action-1', command, workspace: null };
    assert.equal(protocol.validateCommand(input), input);
  }
  for (const command of ['register', 'launch', 'suspend', 'reconcile']) {
    const input = { id: 'action-2', command, workspace: '/work/review' };
    assert.equal(protocol.validateCommand(input), input);
  }
});

test('portable commands refuse extra fields, unknown verbs and invalid workspace bindings', () => {
  assert.equal(typeof protocol.validateCommand, 'function');
  for (const input of [
    { id: 'one', command: 'launch', workspace: 'relative' },
    { id: 'two', command: 'status', workspace: '/work/review' },
    { id: 'three', command: 'unknown', workspace: null },
    { id: 'four', command: 'stop', workspace: null, credential: 'private' },
    { id: 'five', command: 'register', workspace: '/work/\0review' },
  ])
    assert.throws(() => protocol.validateCommand(input), { code: 'APR_BROKER_PROTOCOL' });
});

test('portable transport selection admits the portable route and refuses unsupported choices', () => {
  assert.equal(typeof protocol.assertBrokerTransport, 'function');
  assert.doesNotThrow(() => protocol.assertBrokerTransport('portable'));
  for (const transport of ['legacy', 'native', undefined, {}])
    assert.throws(() => protocol.assertBrokerTransport(transport), { code: 'APR_BROKER_PROTOCOL' });
});

test('portable dispatch emits the existing HTTP response envelope for a closed command', async () => {
  assert.equal(typeof protocol.dispatchBrokerCommandCore, 'function');
  const requests = [];
  const response = await protocol.dispatchBrokerCommandCore({
    request: { actionId: 'status-one', operation: 'status', body: { workspace: null } },
    dispatch: async (message) => {
      requests.push(message);
      return { status: 'running', reviews: 0 };
    },
  });
  assert.deepEqual(requests, [{ id: 'status-one', command: 'status', workspace: null }]);
  assert.equal(response.schema, 'ai-peer-review.response/v1');
  assert.equal(response.ok, true);
  assert.equal(response.action_id, 'status-one');
  assert.deepEqual(response.result, { status: 'running', reviews: 0 });
});

test('portable dispatch refuses extra body fields before effects and never reflects error exhaust', async () => {
  assert.equal(typeof protocol.dispatchBrokerCommandCore, 'function');
  let effects = 0;
  const invalid = await protocol.dispatchBrokerCommandCore({
    request: {
      actionId: 'stop-one',
      operation: 'stop',
      body: { workspace: null, credential: 'private-exhaust' },
    },
    dispatch: async () => {
      effects += 1;
    },
  });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.mutation_occurred, false);
  assert.equal(effects, 0);
  const failed = await protocol.dispatchBrokerCommandCore({
    request: { actionId: 'suspend-one', operation: 'suspend', body: { workspace: '/work/review' } },
    dispatch: async () => {
      effects += 1;
      throw Object.assign(new Error('private-exhaust'), { code: 'APR_WAKE_OUTCOME_UNKNOWN' });
    },
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.error.code, 'APR_WAKE_OUTCOME_UNKNOWN');
  assert.equal(failed.mutation_occurred, null);
  assert.equal(failed.retry_safe, false);
  assert.equal(failed.next_action, 'reconcile');
  assert.equal(JSON.stringify([invalid, failed]).includes('private-exhaust'), false);
});

test('unverified service protocol uses actual authenticated HTTP and drains stop before owner release', async (t) => {
  const { createLoopbackServer } = await import('../../src/broker/http-server.mjs');
  const { requestLoopback } = await import('../../src/broker/http-client.mjs');
  const { createBrokerService } = await import('../../src/broker/service-core.mjs');
  const binding = {
    credential: 'a'.repeat(64),
    instanceId: 'b'.repeat(64),
    worktree: 'c'.repeat(64),
  };
  const order = [];
  let handler;
  let started;
  const ready = new Promise((resolve) => {
    started = resolve;
  });
  const http = await createLoopbackServer({
    binding,
    dispatch: (request) => protocol.dispatchBrokerCommandCore({ request, dispatch: handler }),
  });
  t.after(() => http.close());
  const server = {
    start(dispatch) {
      handler = dispatch;
      order.push('dispatch-set');
      started();
    },
    async close() {
      await http.close();
      order.push('drained');
    },
  };
  const service = createBrokerService({
    withOperationAuthority: async (_input, operation) => operation(),
    assertCurrentOperationAuthority: async () => {},
  });
  const running = service.runBroker({
    identity: { digest: 'd'.repeat(64), physicalRoot: '/project' },
    owner: {
      publish: async () => {
        order.push('published');
      },
      release: async () => {
        order.push('released');
      },
    },
    versions: { package_version: '0.4.0', broker_protocol_version: 1, node_major: 24 },
    registry: { list: async () => [], get: async () => null },
    workerFactory: async () => {
      throw new Error('empty registry');
    },
    clock: { now: () => 0, setTimeout: () => 1, clearTimeout() {} },
    server,
  });
  await ready;
  const status = await requestLoopback({
    endpoint: { host: '127.0.0.1', port: http.port },
    privateBinding: binding,
    operation: 'status',
    body: {},
    actionId: 'status-http',
  });
  assert.equal(status.ok, true);
  assert.equal(status.result.status, 'running');
  assert.equal(status.result.reviews, 0);
  const stopping = await requestLoopback({
    endpoint: { host: '127.0.0.1', port: http.port },
    privateBinding: binding,
    operation: 'stop',
    body: {},
    actionId: 'stop-http',
  });
  assert.equal(stopping.ok, true);
  assert.equal(stopping.result.status, 'stopping');
  await running;
  assert.deepEqual(order, ['dispatch-set', 'published', 'drained', 'released']);
});
