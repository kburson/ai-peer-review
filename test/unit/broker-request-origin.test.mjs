// @story #189
import assert from 'node:assert/strict';
import test from 'node:test';
import * as serverApi from '../../src/broker/http-server.mjs';
import { requestLoopback } from '../../src/broker/http-client.mjs';

test('authenticated request provenance is bound to its actual server, parsed bytes and live dispatch', async (t) => {
  assert.equal(typeof serverApi.isAuthenticatedLoopbackRequestFor, 'function');
  assert.equal(typeof serverApi.authenticatedLoopbackRequestFacts, 'function');
  const binding = {
    credential: 'a'.repeat(64),
    instanceId: 'b'.repeat(64),
    worktree: 'c'.repeat(64),
  };
  let captured;
  let genuine;
  let copied;
  let facts;
  const server = await serverApi.createLoopbackServer({
    binding,
    dispatch: async (request) => {
      captured = request;
      genuine = serverApi.isAuthenticatedLoopbackRequestFor(request, server);
      copied = serverApi.isAuthenticatedLoopbackRequestFor({ ...request }, server);
      facts = serverApi.authenticatedLoopbackRequestFacts(request, server);
      assert.equal(serverApi.isAuthenticatedLoopbackRequestFor(request, {}), false);
      request.operation = 'stop';
      assert.equal(serverApi.isAuthenticatedLoopbackRequestFor(request, server), false);
      assert.equal(facts.operation, 'status');
      return { schema: 'ai-peer-review.response/v1', ok: true, result: {} };
    },
  });
  t.after(() => server.close());
  const response = await requestLoopback({
    endpoint: { host: '127.0.0.1', port: server.port },
    privateBinding: binding,
    operation: 'status',
    body: { workspace: null },
    actionId: 'origin-one',
  });
  assert.equal(response.ok, true);
  assert.equal(genuine, true);
  assert.equal(copied, false);
  assert.equal(facts.actionId, 'origin-one');
  assert.deepEqual(facts.body, { workspace: null });
  assert.equal(serverApi.isAuthenticatedLoopbackRequestFor(captured, server), false);
  assert.throws(() => serverApi.authenticatedLoopbackRequestFacts(captured, server));
});
