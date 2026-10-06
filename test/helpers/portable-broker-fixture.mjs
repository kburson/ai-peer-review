import assert from 'node:assert/strict';
import net from 'node:net';
import http from 'node:http';

export function fakeClock() {
  let now = 0;
  let id = 0;
  const timers = new Map();
  return {
    now: () => now,
    setTimeout(fn, delay) {
      timers.set(++id, { at: now + delay, fn });
      return id;
    },
    clearTimeout(key) {
      timers.delete(key);
    },
    advance(milliseconds) {
      const end = now + milliseconds;
      while (true) {
        const next = [...timers]
          .filter(([, timer]) => timer.at <= end)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = next[1].at;
        timers.delete(next[0]);
        next[1].fn();
      }
      now = end;
    },
    pending: () => timers.size,
  };
}

export const flush = async () => {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setTimeout(resolve, 10));
};

export async function portableBrokerFixture(t, options = {}) {
  const module = await import('../../src/broker/http-server.mjs').catch((error) => {
    if (error.code === 'ERR_MODULE_NOT_FOUND') return null;
    throw error;
  });
  assert.equal(
    typeof module?.createLoopbackServer,
    'function',
    'async loopback server contract is missing'
  );
  const clock = options.realClock ? undefined : fakeClock();
  const privateBinding = {
    credential: 'a'.repeat(64),
    instanceId: 'b'.repeat(64),
    worktree: 'c'.repeat(64),
  };
  const dispatchCalls = [];
  const server = await module.createLoopbackServer({
    binding: privateBinding,
    authenticate: options.authenticate,
    clock,
    dispatch: async (req, res, auth) => {
      dispatchCalls.push({ operation: req.operation, body: req.body, auth });
      if (options.dispatch) return options.dispatch(req, res, auth);
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
  const endpoint = { host: '127.0.0.1', port: server.port };
  const sockets = new Set();
  const agent = new http.Agent({ keepAlive: true, timeout: 0, maxSockets: 1 });
  t.after(async () => {
    agent.destroy();
    for (const socket of sockets) socket.destroy();
    try {
      await server.close();
    } catch (error) {
      if (!options.expectedCloseFailure || error.code !== options.expectedCloseFailure) throw error;
    }
  });
  const headers = () => ({
    Host: `127.0.0.1:${server.port}`,
    Authorization: `Bearer ${privateBinding.credential}`,
    'X-Apr-Instance': privateBinding.instanceId,
    'X-Apr-Worktree': privateBinding.worktree,
  });
  const rawSocket = async () => {
    const socket = net.createConnection(endpoint);
    sockets.add(socket);
    socket.on('error', () => {});
    socket.on('close', () => sockets.delete(socket));
    await new Promise((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('error', reject);
    });
    socket.resume();
    return socket;
  };
  const raw = async (bytes) => {
    const socket = await rawSocket();
    const chunks = [];
    socket.on('data', (chunk) => chunks.push(chunk));
    const result = new Promise((resolve) =>
      socket.once('close', () => resolve(Buffer.concat(chunks).toString()))
    );
    socket.write(bytes);
    return result;
  };
  const rawRequest = (extra = '', body = '{}', overrides = {}) => {
    const h = { ...headers(), ...overrides };
    return `POST /rpc HTTP/1.1\r\n${Object.entries(h)
      .filter(([, value]) => value !== null)
      .map(([key, value]) => `${key}: ${value}\r\n`)
      .join(
        ''
      )}${extra}Connection: close\r\nContent-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`;
  };
  const request = async ({ operation = 'status', body = {}, ...rest } = {}) => {
    const client = await import('../../src/broker/http-client.mjs');
    return client.requestLoopback({ endpoint, privateBinding, operation, body, agent, ...rest });
  };
  return {
    server,
    endpoint,
    privateBinding,
    clock,
    flush,
    dispatchCalls,
    rawSocket,
    raw,
    rawRequest,
    request,
    agent,
  };
}
