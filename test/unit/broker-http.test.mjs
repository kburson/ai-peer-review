import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { Linter } from 'eslint';
import { portableBrokerFixture } from '../helpers/portable-broker-fixture.mjs';

test('authenticated HTTP dispatch returns status without exposing credentials', async (t) => {
  const f = await portableBrokerFixture(t);
  const response = await f.request();
  assert.equal(response.ok, true);
  assert.equal(response.result.operation, 'status');
  assert.equal(JSON.stringify(response).includes(f.privateBinding.credential), false);
});

for (const [name, transform] of [
  ['missing Host', (f) => f.rawRequest('', '{}', { Host: null })],
  ['duplicate Host', (f) => f.rawRequest(`Host: 127.0.0.1:${f.server.port}\r\n`)],
  ['DNS Host', (f) => f.rawRequest('', '{}', { Host: `localhost:${f.server.port}` })],
  ['wrong port', (f) => f.rawRequest('', '{}', { Host: '127.0.0.1:1' })],
  ['absolute target', (f) => f.rawRequest().replace('POST /rpc ', 'POST http://127.0.0.1/rpc ')],
  ['query credential target', (f) => f.rawRequest().replace('/rpc ', '/rpc?credential=secret ')],
  ['Origin', (f) => f.rawRequest('Origin: https://example.com\r\n')],
  ['Sec-Fetch', (f) => f.rawRequest('Sec-Fetch-Mode: cors\r\n')],
  ['upgrade', (f) => f.rawRequest('Upgrade: websocket\r\n')],
  [
    'wrong credential',
    (f) => f.rawRequest('', '{malformed', { Authorization: `Bearer ${'d'.repeat(64)}` }),
  ],
  ['short credential', (f) => f.rawRequest('', '{}', { Authorization: 'Bearer a' })],
  ['wrong instance', (f) => f.rawRequest('', '{}', { 'X-Apr-Instance': 'd'.repeat(64) })],
  ['wrong worktree', (f) => f.rawRequest('', '{}', { 'X-Apr-Worktree': 'd'.repeat(64) })],
  [
    'duplicate credential',
    (f) => f.rawRequest(`Authorization: Bearer ${f.privateBinding.credential}\r\n`),
  ],
]) {
  test(`refuses ${name} before body interpretation or dispatch`, async (t) => {
    const f = await portableBrokerFixture(t);
    const result = await f.raw(transform(f));
    const status = [
      'wrong credential',
      'short credential',
      'wrong instance',
      'wrong worktree',
      'duplicate credential',
    ].includes(name)
      ? 401
      : ['Origin', 'Sec-Fetch', 'upgrade'].includes(name)
        ? 403
        : 400;
    assert.ok(result.startsWith(`HTTP/1.1 ${status} `), result);
    assert.equal(f.dispatchCalls.length, 0);
    assert.equal(result.includes(f.privateBinding.credential), false);
    assert.equal(/access-control-allow-origin/i.test(result), false);
  });
}

test('oversized headers and declared bodies are refused without dispatch', async (t) => {
  const f = await portableBrokerFixture(t);
  assert.match(await f.raw(f.rawRequest(`X-Large: ${'x'.repeat(16_384)}\r\n`)), /^HTTP\/1\.1 431/);
  assert.match(
    await f.raw(f.rawRequest().replace('Content-Length: 2', 'Content-Length: 1048577')),
    /^HTTP\/1\.1 413/
  );
  assert.equal(f.dispatchCalls.length, 0);
});

for (const [name, body] of [
  ['malformed JSON', '{'],
  ['truncated UTF-8', Buffer.from([0x7b, 0xc3])],
]) {
  test(`refuses ${name} without dispatch`, async (t) => {
    const f = await portableBrokerFixture(t);
    const header = f
      .rawRequest('', '')
      .replace('Content-Length: 0', `Content-Length: ${Buffer.byteLength(body)}`);
    assert.match(
      await f.raw(Buffer.concat([Buffer.from(header), Buffer.from(body)])),
      /^HTTP\/1\.1 400/
    );
    assert.equal(f.dispatchCalls.length, 0);
  });
}

test('unauthenticated socket idle resets on received bytes and closes at five seconds', async (t) => {
  const f = await portableBrokerFixture(t);
  const socket = await f.rawSocket();
  await f.flush();
  f.clock.advance(4_000);
  socket.write('POST /rpc HTTP/1.1\r\nHost: ');
  await f.flush();
  f.clock.advance(4_999);
  await f.flush();
  assert.equal(socket.destroyed, false);
  f.clock.advance(1);
  await f.flush();
  assert.equal(socket.destroyed, true);
});

test('byte drips cannot renew absolute ten-second header receipt deadline', async (t) => {
  const f = await portableBrokerFixture(t);
  const socket = await f.rawSocket();
  await f.flush();
  for (let i = 0; i < 3; i += 1) {
    socket.write(i === 0 ? 'POST /rpc HTTP/1.1\r\nX-Drip: ' : 'x');
    await f.flush();
    f.clock.advance(3_000);
  }
  f.clock.advance(999);
  await f.flush();
  assert.equal(socket.destroyed, false);
  f.clock.advance(1);
  await f.flush();
  assert.equal(socket.destroyed, true);
});

test('authenticated incomplete body has absolute receipt bound and no idle bound', async (t) => {
  const f = await portableBrokerFixture(t);
  const socket = await f.rawSocket();
  socket.write(f.rawRequest().replace('Content-Length: 2', 'Content-Length: 100'));
  await f.flush();
  f.clock.advance(5_000);
  await f.flush();
  assert.equal(socket.destroyed, false);
  f.clock.advance(5_000);
  await f.flush();
  assert.equal(socket.destroyed, true);
  assert.equal(f.dispatchCalls.length, 0);
});

test('chunked body over one MiB is refused before dispatch', async (t) => {
  const f = await portableBrokerFixture(t);
  const body = Buffer.alloc(1_048_577, 120);
  const header = f.rawRequest().split('Content-Length:')[0] + 'Transfer-Encoding: chunked\r\n\r\n';
  const result = await f.raw(
    Buffer.concat([
      Buffer.from(header + body.length.toString(16) + '\r\n'),
      body,
      Buffer.from('\r\n0\r\n\r\n'),
    ])
  );
  assert.match(result, /^HTTP\/1\.1 413/);
  assert.equal(f.dispatchCalls.length, 0);
});

test('unauthenticated complete headers are rejected without waiting for advertised body', async (t) => {
  const f = await portableBrokerFixture(t);
  const result = await f.raw(
    f
      .rawRequest('', '', { Authorization: 'Bearer wrong' })
      .replace('Content-Length: 0', 'Content-Length: 1000000')
  );
  assert.match(result, /^HTTP\/1\.1 401/);
  assert.equal(f.dispatchCalls.length, 0);
});

test('truncated body cannot dispatch and its socket is cleaned up', async (t) => {
  const f = await portableBrokerFixture(t);
  const socket = await f.rawSocket();
  const closed = new Promise((resolve) => socket.once('close', resolve));
  socket.end(f.rawRequest().replace('Content-Length: 2', 'Content-Length: 10'));
  await closed;
  assert.equal(f.dispatchCalls.length, 0);
});

test('production portable service refuses startup without Task 2 protected owner authority', async () => {
  const service = await import('../../src/broker/service.mjs');
  assert.equal(typeof service.createPortableBrokerServer, 'function');
  assert.throws(() => service.createPortableBrokerServer({ binding: {} }), {
    code: 'APR_BROKER_PROTECTION_UNAVAILABLE',
  });
});

test('portable client startup cannot fall back to native platform or launch', async () => {
  const { ensureBroker } = await import('../../src/broker/client.mjs');
  let touched = false;
  await assert.rejects(
    ensureBroker({
      transport: 'portable',
      platform: {
        connect: () => {
          touched = true;
        },
      },
    }),
    { code: 'APR_BROKER_PROTECTION_UNAVAILABLE' }
  );
  assert.equal(touched, false);
});

test('authenticated wait survives receipt deadline and leaves status responsive', async (t) => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  t.after(() => release());
  const f = await portableBrokerFixture(t, {
    dispatch: async (req) => {
      if (req.operation !== 'wait') return { schema: 'ai-peer-review.response/v1', ok: true };
      return (async function* () {
        yield { cursor: 1, revision: 1 };
        await gate;
        yield { cursor: 2, revision: 2 };
      })();
    },
  });
  const { waitLoopback } = await import('../../src/broker/http-client.mjs');
  const stream = waitLoopback({
    endpoint: f.endpoint,
    privateBinding: f.privateBinding,
    body: {},
    afterCursor: 0,
  });
  t.after(() => stream.return());
  assert.deepEqual((await stream.next()).value, { cursor: 1, revision: 1 });
  f.clock.advance(20_000);
  assert.equal((await f.request()).ok, true);
  release();
  assert.deepEqual((await stream.next()).value, { cursor: 2, revision: 2 });
  assert.equal((await stream.next()).done, true);
});

test('delivery uncertainty preserves caller action ID and prevents retry after mutation dispatch disconnect', async (t) => {
  const f = await portableBrokerFixture(t, {
    dispatch: async (req, res) => {
      res.destroy();
    },
  });
  const response = await f.request({ operation: 'cancel', actionId: 'cancel-action-1' });
  assert.equal(response.ok, false);
  assert.equal(response.retry_safe, false);
  assert.equal(response.action_id, 'cancel-action-1');
  assert.equal(response.next_action, 'reconcile');
  assert.equal(f.dispatchCalls.length, 1);
});

test('broker awaits asynchronous listener startup before publishing discovery', async (t) => {
  const { runBroker } = await import('../../src/broker/service.mjs');
  const { fakeClock, flush } = await import('../helpers/portable-broker-fixture.mjs');
  const clock = fakeClock();
  let start;
  const started = new Promise((resolve) => {
    start = resolve;
  });
  let published = false;
  const running = runBroker({
    identity: { digest: 'a'.repeat(64), physicalRoot: '/fixture' },
    versions: {},
    registry: { list: async () => [], get: async () => null },
    workerFactory: async () => {},
    clock,
    owner: {
      publish: () => {
        published = true;
      },
      release: () => {},
    },
    server: { start: () => started, close: async () => {} },
  });
  t.after(async () => {
    start();
    clock.advance(60_000);
    await running;
  });
  await flush();
  assert.equal(published, false);
  start();
  await flush();
  assert.equal(published, true);
  clock.advance(60_000);
  await running;
});

test('broker awaits owner release before reporting shutdown complete', async (t) => {
  const { runBroker } = await import('../../src/broker/service.mjs');
  const { fakeClock, flush } = await import('../helpers/portable-broker-fixture.mjs');
  const clock = fakeClock();
  let release;
  const released = new Promise((resolve) => {
    release = resolve;
  });
  let settled = false;
  const running = runBroker({
    identity: { digest: 'a'.repeat(64), physicalRoot: '/fixture' },
    versions: {},
    registry: { list: async () => [], get: async () => null },
    workerFactory: async () => {},
    clock,
    owner: { release: () => released },
    server: { start: () => {}, close: async () => {} },
  }).then(() => {
    settled = true;
  });
  t.after(async () => {
    release();
    clock.advance(60_000);
    await running;
  });
  await flush();
  clock.advance(60_000);
  await flush();
  assert.equal(settled, false);
  release();
  await running;
  assert.equal(settled, true);
});

test('portable bin entrypoint refuses before reading native bootstrap', async () => {
  const { runBrokerEntrypoint } = await import('../../bin/peer-review-broker.mjs');
  await assert.rejects(runBrokerEntrypoint('/absent-bootstrap', { transport: 'portable' }), {
    code: 'APR_BROKER_PROTECTION_UNAVAILABLE',
  });
});

test('portable IPC client awaits authenticated HTTP command without native exchange', async (t) => {
  const f = await portableBrokerFixture(t);
  const ipc = await import('../../src/broker/ipc.mjs');
  assert.equal(typeof ipc.createLoopbackBrokerClient, 'function');
  const client = ipc.createLoopbackBrokerClient({
    endpoint: f.endpoint,
    privateBinding: f.privateBinding,
    agent: f.agent,
  });
  const { requestBroker } = await import('../../src/broker/client.mjs');
  assert.deepEqual(await requestBroker(client, 'status'), { operation: 'status' });
});

test(
  'aborted backpressure wait drains shutdown without orphaned dispatch',
  { timeout: 2_000 },
  async (t) => {
    const f = await portableBrokerFixture(t, {
      dispatch: async () =>
        (async function* () {
          for (let cursor = 0; cursor < 32; cursor += 1)
            yield { cursor, revision: 1, projection: 'x'.repeat(900_000) };
        })(),
    });
    const { waitLoopback } = await import('../../src/broker/http-client.mjs');
    const controller = new AbortController();
    const stream = waitLoopback({
      endpoint: f.endpoint,
      privateBinding: f.privateBinding,
      body: {},
      signal: controller.signal,
    });
    assert.equal((await stream.next()).value.cursor, 0);
    controller.abort();
    await stream.return();
    await f.server.close();
  }
);

test('oversized event and response are closed with bounded credential-free failure', async (t) => {
  const f = await portableBrokerFixture(t, {
    dispatch: async (req) =>
      req.operation === 'wait'
        ? (async function* () {
            yield { cursor: 1, revision: 1, projection: 'x'.repeat(1_048_576) };
          })()
        : { schema: 'ai-peer-review.response/v1', ok: true, result: 'x'.repeat(1_048_576) },
  });
  const response = await f.request();
  assert.equal(response.ok, false);
  assert.equal(response.retry_safe, true);
  const { waitLoopback } = await import('../../src/broker/http-client.mjs');
  const stream = waitLoopback({ endpoint: f.endpoint, privateBinding: f.privateBinding, body: {} });
  await assert.rejects(stream.next());
});

test(
  'authentication adapter failure returns bounded error and preserves subsequent service',
  { timeout: 2_000 },
  async (t) => {
    const { authenticateLoopback } = await import('../../src/broker/http-auth.mjs');
    const f = await portableBrokerFixture(t, {
      authenticate: (raw, binding) => {
        if (raw.some((value) => value === 'X-Fail')) throw new Error(binding.credential);
        return authenticateLoopback(raw, binding);
      },
    });
    const failed = f.raw(f.rawRequest('X-Fail: yes\r\n'));
    await f.flush();
    f.clock.advance(10_000);
    const response = await failed;
    assert.match(response, /^HTTP\/1\.1 500/);
    assert.equal(response.includes(f.privateBinding.credential), false);
    assert.equal((await f.request()).ok, true);
  }
);

test(
  'server close cancels a never-yielding iterator without waiting for its return',
  { timeout: 2_000 },
  async (t) => {
    let started;
    const nextStarted = new Promise((resolve) => {
      started = resolve;
    });
    let returned = false;
    let unblock;
    const f = await portableBrokerFixture(t, {
      dispatch: async () => ({
        [Symbol.asyncIterator]() {
          return this;
        },
        next() {
          started();
          return new Promise((resolve) => {
            unblock = resolve;
          });
        },
        return() {
          returned = true;
          return new Promise(() => {});
        },
      }),
    });
    const socket = await f.rawSocket();
    socket.write(
      f
        .rawRequest(
          '',
          JSON.stringify({
            schema: 'ai-peer-review.rpc/v1',
            operation: 'wait',
            body: {},
            action_id: 'wait',
          })
        )
        .replace('rpc HTTP', 'wait HTTP')
    );
    await nextStarted;
    const closed = f.server.close();
    const settled = await Promise.race([
      closed.then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), 500)),
    ]);
    unblock({ done: true });
    await closed;
    assert.equal(settled, true, 'close must settle despite blocked next and return');
    assert.equal(returned, true);
  }
);

test('partial pipelined bytes cannot restart receipt deadline during authenticated wait', async (t) => {
  let started;
  const streaming = new Promise((resolve) => {
    started = resolve;
  });
  const f = await portableBrokerFixture(t, {
    dispatch: async () =>
      (async function* () {
        started();
        yield { cursor: 1 };
        await new Promise(() => {});
      })(),
  });
  const socket = await f.rawSocket();
  socket.write(
    f
      .rawRequest(
        '',
        JSON.stringify({
          schema: 'ai-peer-review.rpc/v1',
          operation: 'wait',
          body: {},
          action_id: 'wait',
        })
      )
      .replace('rpc HTTP', 'wait HTTP')
      .replace('Connection: close', 'Connection: keep-alive')
  );
  await streaming;
  await f.flush();
  socket.write(f.rawRequest().slice(0, 25));
  await f.flush();
  f.clock.advance(10_000);
  await f.flush();
  assert.equal(socket.destroyed, false, 'in-flight wait has no header receipt deadline');
});

test('definite authentication refusal and connection refusal leave mutation retry safe', async (t) => {
  const f = await portableBrokerFixture(t);
  const refused = await f.request({
    operation: 'cancel',
    privateBinding: { ...f.privateBinding, credential: 'd'.repeat(64) },
  });
  assert.equal(refused.retry_safe, true);
  assert.equal(refused.mutation_occurred, false);
  assert.equal(refused.next_action, null);
  await f.server.close();
  const notConnected = await f.request({ operation: 'cancel' });
  assert.equal(notConnected.retry_safe, true);
  assert.equal(notConnected.mutation_occurred, false);
});

test('abort during response reading retains aborted code and mutation uncertainty', async (t) => {
  let sent;
  const headersSent = new Promise((resolve) => {
    sent = resolve;
  });
  const f = await portableBrokerFixture(t, {
    dispatch: async (_req, res) => {
      res.writeHead(200);
      res.write('{');
      sent();
      await new Promise(() => {});
    },
  });
  const controller = new AbortController();
  const pending = f.request({ operation: 'cancel', signal: controller.signal });
  await headersSent;
  await f.flush();
  controller.abort();
  const response = await pending;
  assert.equal(response.error.code, 'APR_BROKER_ABORTED');
  assert.equal(response.retry_safe, false);
});

test('production import graph cannot activate unprotected loopback server', () => {
  const linter = new Linter();
  const rule = {
    meta: { schema: [] },
    create(context) {
      const serverModule = (value) =>
        typeof value === 'string' && value.endsWith('http-server.mjs');
      return {
        ImportDeclaration(node) {
          if (!serverModule(node.source.value)) return;
          if (
            node.specifiers.some(
              (specifier) =>
                specifier.type !== 'ImportSpecifier' ||
                specifier.imported.name !== 'HTTP_BODY_LIMIT'
            )
          )
            context.report({
              node,
              message:
                'Task 2 protected authority is required before production listener activation.',
            });
        },
        ImportExpression(node) {
          if (serverModule(node.source.value))
            context.report({ node, message: 'Dynamic listener activation requires Task 2.' });
        },
      };
    },
  };
  const check = (source) =>
    linter.verify(source, [
      {
        languageOptions: { sourceType: 'module', ecmaVersion: 'latest' },
        plugins: { boundary: { rules: { protected: rule } } },
        rules: { 'boundary/protected': 'error' },
      },
    ]);
  assert.equal(
    check("import { createLoopbackServer as activate } from './http-server.mjs'; activate({});")
      .length,
    1
  );
  assert.equal(
    check("import * as broker from './http-server.mjs'; broker.createLoopbackServer({});").length,
    1
  );
  assert.equal(check("await import('./http-server.mjs');").length, 1);
  for (const directory of ['src', 'bin']) {
    for (const relative of readdirSync(new URL('../../' + directory, import.meta.url), {
      recursive: true,
    })) {
      if (!relative.endsWith('.mjs')) continue;
      const source = readFileSync(
        new URL('../../' + directory + '/' + relative, import.meta.url),
        'utf8'
      );
      assert.deepEqual(check(source), [], directory + '/' + relative);
    }
  }
});

test('complete overlapping pipeline refuses second dispatch without cutting active wait', async (t) => {
  let started;
  const streaming = new Promise((resolve) => {
    started = resolve;
  });
  const f = await portableBrokerFixture(t, {
    dispatch: async () =>
      (async function* () {
        started();
        yield { cursor: 1 };
        await new Promise(() => {});
      })(),
  });
  const socket = await f.rawSocket();
  const first = f
    .rawRequest(
      '',
      JSON.stringify({
        schema: 'ai-peer-review.rpc/v1',
        operation: 'wait',
        body: {},
        action_id: 'first',
      })
    )
    .replace('rpc HTTP', 'wait HTTP')
    .replace('Connection: close', 'Connection: keep-alive');
  socket.write(first);
  await streaming;
  await f.flush();
  socket.write(
    f.rawRequest(
      '',
      JSON.stringify({
        schema: 'ai-peer-review.rpc/v1',
        operation: 'status',
        body: {},
        action_id: 'second',
      })
    )
  );
  await f.flush();
  f.clock.advance(10_000);
  await f.flush();
  assert.equal(socket.destroyed, false, 'refused pipeline must preserve the active wait');
  assert.equal(f.dispatchCalls.length, 1);
});

test('same portable client serves status while its mutation dispatch is delayed', async (t) => {
  let began;
  const started = new Promise((resolve) => {
    began = resolve;
  });
  let release;
  const delayed = new Promise((resolve) => {
    release = resolve;
  });
  t.after(() => release());
  const f = await portableBrokerFixture(t, {
    dispatch: async (req) => {
      if (req.operation === 'launch') {
        began();
        await delayed;
      }
      return {
        schema: 'ai-peer-review.response/v1',
        ok: true,
        result: { operation: req.operation },
      };
    },
  });
  const { createLoopbackBrokerClient } = await import('../../src/broker/ipc.mjs');
  const client = createLoopbackBrokerClient({
    endpoint: f.endpoint,
    privateBinding: f.privateBinding,
  });
  t.after(() => client.close());
  const launch = client.request({ id: 'launch', command: 'launch', workspace: process.cwd() });
  await started;
  const status = client.request({ id: 'status', command: 'status', workspace: null });
  const responsive = await Promise.race([
    status.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 500)),
  ]);
  release();
  await launch;
  assert.deepEqual(await status, { operation: 'status' });
  assert.equal(responsive, true, 'status must not queue behind a mutation on the same client');
});
