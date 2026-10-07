// @story #176
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createHmac } from 'node:crypto';
import { createLoopbackServer } from '../../src/broker/http-server.mjs';

const binding = Object.freeze({
  credential: 'a'.repeat(64),
  instanceId: 'b'.repeat(64),
  worktree: 'c'.repeat(64),
  ownerVersion: 'd'.repeat(64),
});
const expected = {
  instanceId: binding.instanceId,
  worktree: binding.worktree,
  ownerVersion: binding.ownerVersion,
};
const budget = (milliseconds = 5000) => ({
  signal: new AbortController().signal,
  deadline: performance.now() + milliseconds,
});
async function fixture(t, options = {}) {
  const dispatches = [];
  const server = await createLoopbackServer({
    binding,
    clock: options.clock,
    dispatch: async (req, res) => {
      dispatches.push({ operation: req.operation, body: req.body, socket: req.socket });
      if (options.dispatch) return options.dispatch(req, res);
      return {
        schema: 'ai-peer-review.response/v1',
        ok: true,
        mutation_occurred: false,
        retry_safe: true,
        next_action: null,
        result: { operation: req.operation },
        error: null,
      };
    },
  });
  t.after(() => server.close());
  return { endpoint: { host: '127.0.0.1', port: server.port }, server, dispatches };
}
async function proof(t, endpoint, overrides = {}) {
  const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
  t.after(() => agent.destroy());
  const challenge = 'e'.repeat(64);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        ...endpoint,
        agent,
        path: '/owner-proof',
        method: 'POST',
        headers: {
          Host: '127.0.0.1:' + endpoint.port,
          'X-Apr-Challenge': challenge,
          'Content-Length': '0',
          ...overrides,
        },
      },
      async (res) => {
        const socket = res.socket;
        try {
          const chunks = [];
          for await (const part of res) chunks.push(part);
          resolve({
            status: res.statusCode,
            body: Buffer.concat(chunks).toString(),
            socket,
            agent,
            challenge,
          });
        } catch (error) {
          reject(error);
        }
      }
    );
    req.on('error', reject);
    req.end();
  });
}

test('credential-free proof authenticates the actual server tuple without operational dispatch', async (t) => {
  // Removing the proof branch or any MAC-covered fact must fail this control.
  const f = await fixture(t);
  const p = await proof(t, f.endpoint);
  assert.equal(p.status, 200);
  const value = JSON.parse(p.body);
  assert.deepEqual(
    Object.keys(value).sort(),
    [
      'challenge',
      'instanceId',
      'localAddress',
      'localPort',
      'mac',
      'ownerVersion',
      'port',
      'remoteAddress',
      'remotePort',
      'schema',
      'worktree',
    ].sort()
  );
  assert.equal(value.schema, 'ai-peer-review.owner-proof/v1');
  assert.equal(value.challenge, p.challenge);
  assert.equal(value.instanceId, expected.instanceId);
  assert.equal(value.worktree, expected.worktree);
  assert.equal(value.ownerVersion, expected.ownerVersion);
  assert.equal(value.port, f.endpoint.port);
  assert.equal(value.localAddress, p.socket.remoteAddress);
  assert.equal(value.localPort, p.socket.remotePort);
  assert.equal(value.remoteAddress, p.socket.localAddress);
  assert.equal(value.remotePort, p.socket.localPort);
  const message =
    'APR owner proof v1\0' +
    JSON.stringify([
      p.challenge,
      binding.instanceId,
      binding.worktree,
      binding.ownerVersion,
      f.endpoint.port,
      '127.0.0.1',
      f.endpoint.port,
      '127.0.0.1',
      p.socket.localPort,
    ]);
  assert.equal(
    value.mac,
    createHmac('sha256', Buffer.from(binding.credential, 'hex')).update(message).digest('hex')
  );
  assert.equal(p.body.includes(binding.credential), false);
  assert.deepEqual(f.dispatches, []);
});

async function ownerModule() {
  const module = await import('../../src/broker/owner-connection.mjs').catch((error) => {
    if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
    throw error;
  });
  assert.equal(
    typeof module.observeLoopbackOwnerCore,
    'function',
    'real-socket owner connection core is missing'
  );
  return module;
}
async function core(t, f, overrides = {}) {
  const m = await ownerModule();
  const context = {
    ...budget(),
    ...Object.fromEntries(
      Object.entries(overrides).filter(([key]) => ['signal', 'deadline'].includes(key))
    ),
  };
  const result = await m.observeLoopbackOwnerCore({
    endpoint: f.endpoint,
    privateBinding: binding,
    expected,
    ...context,
    ...overrides,
  });
  if (result.connection) t.after(() => result.connection.close(context));
  return { m, result, context };
}
test('core submits RPCs on its proved socket and remains unverified production evidence', async (t) => {
  const f = await fixture(t);
  const { m, result, context } = await core(t, f);
  assert.equal(result.kind, 'core-live');
  assert.equal(result.verified, false);
  assert.equal(m.isVerifiedOwnerConnection(result.connection), false);
  assert.equal(m.isVerifiedOwnerConnection({ ...result.connection }), false);
  const one = await result.connection.request({
    operation: 'status',
    body: {},
    actionId: 'first',
    ...context,
  });
  const two = await result.connection.request({
    operation: 'status',
    body: {},
    actionId: 'second',
    ...context,
  });
  assert.equal(one.ok, true);
  assert.equal(two.ok, true);
  assert.equal(f.dispatches.length, 2);
  assert.equal(f.dispatches[0].socket, f.dispatches[1].socket);
  assert.deepEqual(Object.keys(result).sort(), ['connection', 'kind', 'verified']);
  assert.equal(JSON.stringify(result).includes(binding.credential), false);
});
for (const [label, change, reason] of [
  [
    'wrong credential',
    { privateBinding: { ...binding, credential: 'f'.repeat(64) } },
    'owner-proof-refused',
  ],
  [
    'wrong instance',
    { expected: { ...expected, instanceId: 'f'.repeat(64) } },
    'owner-binding-mismatch',
  ],
  [
    'wrong worktree',
    { expected: { ...expected, worktree: 'f'.repeat(64) } },
    'owner-binding-mismatch',
  ],
  [
    'wrong generation',
    { expected: { ...expected, ownerVersion: 'f'.repeat(64) } },
    'owner-binding-mismatch',
  ],
])
  test(label + ' refuses before operational bearer submission', async (t) => {
    const f = await fixture(t);
    const { result } = await core(t, f, change);
    assert.deepEqual(result, { kind: 'unknown', verified: false, reason });
    assert.deepEqual(f.dispatches, []);
  });
test('production factory refuses ordinary and copied publications before opening a peer socket', async (t) => {
  const m = await ownerModule();
  const f = await listenPeer(t, sendProof);
  for (const value of [
    binding,
    {},
    { snapshot: async () => Buffer.alloc(32), retainedGeneration: () => ({ name: 'credential' }) },
  ]) {
    const result = await m.observeLoopbackOwner({
      endpoint: f.endpoint,
      privateBinding: value,
      expected,
      ...budget(),
    });
    assert.deepEqual(result, {
      kind: 'unknown',
      verified: false,
      reason: 'genuine-credential-publication-required',
    });
  }
  assert.equal(f.connections.length, 0);
  assert.equal(f.requests.length, 0);
});
test('later or overlapping operation contexts cannot borrow the admitted connection', async (t) => {
  let release;
  const held = new Promise((resolve) => {
    release = resolve;
  });
  const f = await fixture(t, {
    dispatch: async () => {
      await held;
      return { schema: 'ai-peer-review.response/v1', ok: true };
    },
  });
  const { result, context } = await core(t, f);
  await assert.rejects(result.connection.request({ operation: 'status', body: {}, ...budget() }), {
    details: { reason: 'connection-budget-mismatch' },
  });
  await assert.rejects(
    result.connection.request({ operation: 'status', body: {}, ...context, agent: {} }),
    { details: { reason: 'connection-options-invalid' } }
  );
  await assert.rejects(
    { ...result.connection }.request({ operation: 'status', body: {}, ...context }),
    { details: { reason: 'genuine-connection-required' } }
  );
  const pending = result.connection.request({ operation: 'status', body: {}, ...context });
  await assert.rejects(result.connection.request({ operation: 'status', body: {}, ...context }), {
    details: { reason: 'connection-busy' },
  });
  release();
  assert.equal((await pending).ok, true);
  assert.equal(f.dispatches.length, 1);
});
test('lost proved socket fails before a replacement connection or further dispatch', async (t) => {
  const f = await fixture(t);
  const { result, context } = await core(t, f);
  assert.equal(
    (await result.connection.request({ operation: 'status', body: {}, ...context })).ok,
    true
  );
  f.dispatches[0].socket.destroy();
  await new Promise((resolve) => setTimeout(resolve, 30));
  const response = await result.connection.request({
    operation: 'cancel',
    body: {},
    actionId: 'lost',
    ...context,
  });
  assert.equal(response.ok, false);
  assert.equal(response.action_id, 'lost');
  assert.equal(response.mutation_occurred, false);
  assert.equal(response.retry_safe, true);
  assert.equal(f.dispatches.length, 1);
});

async function listenPeer(t, respond, port = 0) {
  const sockets = new Set(),
    requests = [],
    connections = [];
  const peer = http.createServer({ keepAliveTimeout: 0 }, async (req, res) => {
    requests.push({ path: req.url, headers: { ...req.headers }, socket: req.socket });
    await respond(req, res);
  });
  peer.on('connection', (socket) => {
    sockets.add(socket);
    connections.push(socket);
    socket.on('error', () => {});
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise((resolve, reject) => {
    peer.once('error', reject);
    peer.listen(port, '127.0.0.1', resolve);
  });
  const close = async () => {
    for (const socket of sockets) socket.destroy();
    if (peer.listening) await new Promise((resolve) => peer.close(resolve));
  };
  t.after(close);
  return {
    endpoint: { host: '127.0.0.1', port: peer.address().port },
    requests,
    connections,
    close,
  };
}
function signedProof(req, changes = {}) {
  const value = {
    schema: 'ai-peer-review.owner-proof/v1',
    challenge: req.headers['x-apr-challenge'],
    ...expected,
    port: req.socket.localPort,
    localAddress: req.socket.localAddress,
    localPort: req.socket.localPort,
    remoteAddress: req.socket.remoteAddress,
    remotePort: req.socket.remotePort,
    ...changes,
  };
  const message =
    'APR owner proof v1\0' +
    JSON.stringify([
      value.challenge,
      value.instanceId,
      value.worktree,
      value.ownerVersion,
      value.port,
      value.localAddress,
      value.localPort,
      value.remoteAddress,
      value.remotePort,
    ]);
  return {
    ...value,
    mac: createHmac('sha256', Buffer.from(binding.credential, 'hex')).update(message).digest('hex'),
  };
}
function sendProof(req, res, changes) {
  const body = JSON.stringify(signedProof(req, changes));
  res.writeHead(200, { 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}
test('actual stale-port relay to a different genuine server refuses before bearer at the proxy', async (t) => {
  const net = await import('node:net');
  const old = await fixture(t),
    target = await fixture(t);
  const oldPort = old.endpoint.port;
  await old.server.close();
  const sockets = new Set(),
    incoming = [],
    upstream = [];
  const proxy = net.createServer((socket) => {
    sockets.add(socket);
    socket.on('error', () => {});
    socket.on('close', () => sockets.delete(socket));
    const next = net.createConnection(target.endpoint);
    sockets.add(next);
    next.on('error', () => socket.destroy());
    next.on('close', () => {
      sockets.delete(next);
      socket.destroy();
    });
    next.pipe(socket);
    let prefix = Buffer.alloc(0),
      started = false;
    socket.on('data', (chunk) => {
      incoming.push(chunk);
      if (started) return next.write(chunk);
      prefix = Buffer.concat([prefix, chunk]);
      const end = prefix.indexOf('\r\n\r\n');
      if (end < 0) return;
      started = true;
      const forwarded = Buffer.from(
        prefix
          .toString()
          .replace('Host: 127.0.0.1:' + oldPort, 'Host: 127.0.0.1:' + target.endpoint.port)
      );
      upstream.push(forwarded);
      next.write(forwarded);
    });
    socket.on('close', () => next.destroy());
  });
  await new Promise((resolve, reject) => {
    proxy.once('error', reject);
    proxy.listen(oldPort, '127.0.0.1', resolve);
  });
  t.after(async () => {
    for (const s of sockets) s.destroy();
    await new Promise((resolve) => proxy.close(resolve));
  });
  const { result } = await core(t, old);
  assert.deepEqual(result, { kind: 'unknown', verified: false, reason: 'channel-mismatch' });
  assert.match(Buffer.concat(upstream).toString(), /POST \/owner-proof HTTP\/1.1/);
  assert.equal(Buffer.concat(incoming).toString().toLowerCase().includes('authorization:'), false);
  assert.equal(Buffer.concat(incoming).includes(Buffer.from(binding.credential)), false);
  assert.deepEqual(target.dispatches, []);
});
for (const [label, changes, reason] of [
  ['replayed challenge', { challenge: 'f'.repeat(64) }, 'malformed-proof'],
  ['extra field', { credential: 'public-value' }, 'malformed-proof'],
  ['wrong MAC', { mac: 'f'.repeat(64) }, 'owner-proof-refused'],
])
  test(label + ' produces bounded unknown and no authentication header', async (t) => {
    const peer = await listenPeer(t, (req, res) => {
      const value = signedProof(req, label === 'wrong MAC' ? {} : changes);
      if (label === 'wrong MAC') value.mac = changes.mac;
      res.end(JSON.stringify(value));
    });
    const { result } = await core(t, peer);
    assert.deepEqual(result, { kind: 'unknown', verified: false, reason });
    assert.equal(peer.requests.length, 1);
    assert.equal(peer.requests[0].headers.authorization, undefined);
  });
test('hung proof terminates at its original deadline without credential transmission', async (t) => {
  const peer = await listenPeer(t, () => {});
  const { result } = await core(t, peer, budget(80));
  assert.deepEqual(result, { kind: 'unknown', verified: false, reason: 'operation-deadline' });
  assert.equal(peer.requests.length, 1);
  assert.equal(peer.requests[0].headers.authorization, undefined);
});
test('original cancellation ends a hung proof without renewal or bearer', async (t) => {
  const controller = new AbortController();
  const peer = await listenPeer(t, () => {
    controller.abort();
  });
  const { result } = await core(t, peer, {
    signal: controller.signal,
    deadline: performance.now() + 5000,
  });
  assert.deepEqual(result, { kind: 'unknown', verified: false, reason: 'operation-aborted' });
  assert.equal(peer.requests.length, 1);
  assert.equal(peer.requests[0].headers.authorization, undefined);
});
test('oversized proof is refused without parsing or forwarding its data', async (t) => {
  const peer = await listenPeer(t, (_req, res) => res.end('x'.repeat(4097)));
  const { result } = await core(t, peer);
  assert.deepEqual(result, { kind: 'unknown', verified: false, reason: 'malformed-proof' });
  assert.equal(peer.requests.length, 1);
});
test('rebound endpoint after proof receives no replacement connection or bearer', async (t) => {
  const peer = await listenPeer(t, sendProof);
  const { result, context } = await core(t, peer);
  assert.equal(result.kind, 'core-live');
  const port = peer.endpoint.port;
  await peer.close();
  const rebound = await listenPeer(t, (_req, res) => res.end('{}'), port);
  await new Promise((resolve) => setTimeout(resolve, 20));
  const response = await result.connection.request({
    operation: 'cancel',
    body: {},
    actionId: 'rebound',
    ...context,
  });
  assert.equal(response.mutation_occurred, false);
  assert.equal(response.retry_safe, true);
  assert.equal(rebound.connections.length, 0);
  assert.equal(rebound.requests.length, 0);
});
test('lost response after mutation keeps action identity and reconciliation obligation', async (t) => {
  const peer = await listenPeer(t, async (req, res) => {
    if (req.url === '/owner-proof') return sendProof(req, res);
    for await (const chunk of req) {
      void chunk;
      /* Consume the actual submitted mutation. */
    }
    req.socket.destroy();
  });
  const { result, context } = await core(t, peer);
  const response = await result.connection.request({
    operation: 'cancel',
    body: {},
    actionId: 'uncertain',
    ...context,
  });
  assert.equal(response.ok, false);
  assert.equal(response.action_id, 'uncertain');
  assert.equal(response.mutation_occurred, null);
  assert.equal(response.retry_safe, false);
  assert.equal(response.next_action, 'reconcile');
  assert.equal(peer.requests.length, 2);
  assert.equal(peer.connections.length, 1);
});
test('wait preserves cursor and bound context on the proved socket, then closes explicitly', async (t) => {
  const f = await fixture(t, {
    dispatch: async function* (req) {
      yield { cursor: req.body.after_cursor, kind: 'event' };
    },
  });
  const { result, context } = await core(t, f);
  const frames = [];
  for await (const frame of result.connection.wait({ afterCursor: 'seen', ...context }))
    frames.push(frame);
  assert.deepEqual(frames, [{ cursor: 'seen', kind: 'event' }]);
  assert.equal(f.dispatches.length, 1);
  assert.equal(f.dispatches[0].operation, 'wait');
  assert.deepEqual(await result.connection.close(context), { closed: true });
});

async function rawProof(
  t,
  endpoint,
  {
    path = '/owner-proof',
    method = 'POST',
    version = '1.1',
    extra = '',
    length = '0',
    challenge = 'e'.repeat(64),
    body = '',
  } = {}
) {
  const net = await import('node:net');
  const socket = net.createConnection(endpoint);
  t.after(() => socket.destroy());
  const chunks = [];
  socket.on('error', () => {});
  socket.on('data', (chunk) => chunks.push(chunk));
  const done = new Promise((resolve) =>
    socket.once('close', () => resolve(Buffer.concat(chunks).toString()))
  );
  socket.on('connect', () =>
    socket.write(
      method +
        ' ' +
        path +
        ' HTTP/' +
        version +
        '\r\nHost: 127.0.0.1:' +
        endpoint.port +
        '\r\nX-Apr-Challenge: ' +
        challenge +
        '\r\nContent-Length: ' +
        length +
        '\r\nConnection: close\r\n' +
        extra +
        '\r\n' +
        body
    )
  );
  return done;
}
for (const [label, options, status] of [
  ['duplicate Host', { extra: 'Host: 127.0.0.1:1\r\n' }, 400],
  ['duplicate challenge', { extra: 'X-Apr-Challenge: ' + 'e'.repeat(64) + '\r\n' }, 400],
  ['Origin', { extra: 'Origin: http://localhost\r\n' }, 403],
  ['Sec-Fetch', { extra: 'Sec-Fetch-Mode: cors\r\n' }, 403],
  ['absolute target', { path: 'http://127.0.0.1/owner-proof' }, 400],
  ['wrong method', { method: 'GET' }, 400],
  ['wrong version', { version: '1.0' }, 400],
  ['invalid nonce', { challenge: 'no' }, 400],
  ['private headers', { extra: 'Authorization: Bearer fixture\r\n' }, 400],
  ['Expect', { extra: 'Expect: 100-continue\r\n' }, 400],
  ['nonempty body', { length: '1', body: 'x' }, 400],
  ['oversized body', { length: '1048577' }, 400],
  ['oversized headers', { extra: 'X-Large: ' + 'x'.repeat(16384) + '\r\n' }, 431],
])
  test('proof rejects ' + label + ' before dispatch or provisional response', async (t) => {
    const f = await fixture(t);
    const response = await rawProof(t, f.endpoint, options);
    assert.match(response, new RegExp('^HTTP/1.1 ' + status + ' '));
    assert.equal(response.includes('100 Continue'), false);
    assert.deepEqual(f.dispatches, []);
  });
test('possession proof does not clear unauthenticated idle deadline before first RPC', async (t) => {
  const { fakeClock, waitForBrokerCondition } =
    await import('../helpers/portable-broker-fixture.mjs');
  const clock = fakeClock();
  const f = await fixture(t, { clock });
  const p = await proof(t, f.endpoint);
  assert.equal(p.status, 200);
  clock.advance(5000);
  await waitForBrokerCondition(
    () => p.socket.destroyed,
    'proof socket unauthenticated idle expiry'
  );
  assert.deepEqual(f.dispatches, []);
});
test('proof leaves initial receipt deadline intact even after partial first RPC activity', async (t) => {
  const { fakeClock, waitForBrokerCondition } =
    await import('../helpers/portable-broker-fixture.mjs');
  const clock = fakeClock(),
    f = await fixture(t, { clock });
  const p = await proof(t, f.endpoint);
  assert.equal(p.status, 200);
  clock.advance(4500);
  p.socket.write('POST /rpc HTTP/1.1\r\n');
  await new Promise((resolve) => setTimeout(resolve, 20));
  clock.advance(4500);
  p.socket.write('Host: 127.0.0.1:' + f.endpoint.port + '\r\n');
  await new Promise((resolve) => setTimeout(resolve, 20));
  clock.advance(1000);
  await waitForBrokerCondition(
    () => p.socket.destroyed,
    'unchanged initial 10-second receipt expiry'
  );
  assert.deepEqual(f.dispatches, []);
});
test('proof sockets remain pending at saturation while existing authenticated controls retain admission', async (t) => {
  const { fakeClock } = await import('../helpers/portable-broker-fixture.mjs');
  const { requestLoopback } = await import('../../src/broker/http-client.mjs');
  const clock = fakeClock(),
    f = await fixture(t, { clock });
  const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
  t.after(() => agent.destroy());
  const input = {
    endpoint: f.endpoint,
    privateBinding: binding,
    operation: 'status',
    body: {},
    agent,
  };
  assert.equal((await requestLoopback(input)).ok, true);
  for (let i = 0; i < 128; i += 1) assert.equal((await proof(t, f.endpoint)).status, 200);
  await assert.rejects(proof(t, f.endpoint));
  assert.equal((await requestLoopback(input)).ok, true);
  assert.equal(f.dispatches.length, 2);
  assert.equal(f.dispatches[0].socket, f.dispatches[1].socket);
});
test('proof cannot be repeated on the same pending socket to renew admission', async (t) => {
  const f = await fixture(t),
    p = await proof(t, f.endpoint);
  const status = await new Promise((resolve, reject) => {
    const req = http.request(
      {
        ...f.endpoint,
        path: '/owner-proof',
        method: 'POST',
        agent: p.agent,
        headers: {
          Host: '127.0.0.1:' + f.endpoint.port,
          'X-Apr-Challenge': 'f'.repeat(64),
          'Content-Length': '0',
        },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      }
    );
    req.on('error', reject);
    req.end();
  });
  assert.equal(status, 400);
  assert.deepEqual(f.dispatches, []);
});
test('absent transport and invalid budgets never become process-death or owner-release evidence', async (t) => {
  const peer = await listenPeer(t, sendProof);
  await peer.close();
  const { result } = await core(t, peer);
  assert.deepEqual(result, { kind: 'absent', verified: false, reason: 'transport-absent' });
  const live = await listenPeer(t, sendProof);
  for (const context of [{}, budget(31000), { ...budget(), signal: {} }, budget(-1)]) {
    const m = await ownerModule();
    const refused = await m.observeLoopbackOwnerCore({
      endpoint: live.endpoint,
      privateBinding: binding,
      expected,
      ...context,
    });
    assert.equal(refused.kind, 'unknown');
    assert.equal(refused.verified, false);
  }
  assert.equal(live.connections.length, 0);
});

test('cancellation before socket assignment is known unsent, even for a queued mutation', async (t) => {
  const { requestLoopback } = await import('../../src/broker/http-client.mjs');
  const { waitForBrokerCondition } = await import('../helpers/portable-broker-fixture.mjs');
  let release;
  const held = new Promise((resolve) => {
    release = resolve;
  });
  t.after(() => release());
  const peer = await listenPeer(t, async (req, res) => {
    for await (const part of req) {
      void part;
      /* Receive the first actual control. */
    }
    await held;
    res.end(JSON.stringify({ schema: 'ai-peer-review.response/v1', ok: true }));
  });
  const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
  t.after(() => agent.destroy());
  const input = {
    endpoint: peer.endpoint,
    privateBinding: binding,
    agent,
    operation: 'status',
    body: {},
  };
  const first = requestLoopback(input);
  await waitForBrokerCondition(() => peer.requests.length === 1, 'first assigned socket');
  const controller = new AbortController();
  const queued = requestLoopback({
    ...input,
    operation: 'cancel',
    actionId: 'never-assigned',
    signal: controller.signal,
  });
  await new Promise((resolve) => setImmediate(resolve));
  controller.abort();
  release();
  await first;
  const response = await queued;
  assert.equal(response.action_id, 'never-assigned');
  assert.equal(response.mutation_occurred, false);
  assert.equal(response.retry_safe, true);
  assert.equal(response.next_action, null);
  assert.equal(peer.requests.length, 1);
  assert.equal(peer.connections.length, 1);
});

for (const key of ['instanceId', 'worktree'])
  test('inconsistent private ' + key + ' refuses before proof or bearer', async (t) => {
    const peer = await listenPeer(t, sendProof);
    const { result } = await core(t, peer, {
      privateBinding: { ...binding, [key]: 'f'.repeat(64) },
    });
    assert.deepEqual(result, {
      kind: 'unknown',
      verified: false,
      reason: 'owner-binding-mismatch',
    });
    assert.equal(peer.connections.length, 0);
    assert.equal(peer.requests.length, 0);
  });

test('serialization crossing the original deadline cannot submit an operational request', async (t) => {
  const peer = await listenPeer(t, async (req, res) => {
    if (req.url === '/owner-proof') return sendProof(req, res);
    req.resume();
    res.end(JSON.stringify({ schema: 'ai-peer-review.response/v1', ok: true }));
  });
  const { result, context } = await core(t, peer, budget(1000));
  assert.equal(result.kind, 'core-live');
  const body = {
    toJSON() {
      while (performance.now() < context.deadline + 30) {
        /* Delayed actual serialization. */
      }
      return {};
    },
  };
  const response = await result.connection.request({
    operation: 'cancel',
    body,
    actionId: 'expired-unsent',
    ...context,
  });
  assert.equal(response.ok, false);
  assert.equal(response.action_id, 'expired-unsent');
  assert.equal(response.mutation_occurred, false);
  assert.equal(response.retry_safe, true);
  assert.equal(response.next_action, null);
  assert.equal(peer.requests.length, 1);
});
test('early channel loss preserves one default UUID action identity on a known-unsent response', async (t) => {
  const peer = await listenPeer(t, sendProof);
  const { result, context } = await core(t, peer);
  await result.connection.close(context);
  const response = await result.connection.request({ operation: 'cancel', body: {}, ...context });
  assert.match(
    response.action_id ?? '',
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
  );
  assert.equal(JSON.parse(JSON.stringify(response)).action_id, response.action_id);
  assert.equal(response.mutation_occurred, false);
  assert.equal(response.retry_safe, true);
  assert.equal(peer.requests.length, 1);
});

test('fractional original deadlines end hung proofs at the captured bound with a truthful reason', async (t) => {
  const peer = await listenPeer(t, () => {});
  for (let i = 0; i < 20; i += 1) {
    const context = budget(40.75);
    const { result } = await core(t, peer, context);
    assert.deepEqual(result, { kind: 'unknown', verified: false, reason: 'operation-deadline' });
    assert.ok(performance.now() >= context.deadline);
  }
  assert.equal(
    peer.requests.every((req) => req.headers.authorization === undefined),
    true
  );
});
