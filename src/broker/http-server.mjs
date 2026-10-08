import http from 'node:http';
import { performance } from 'node:perf_hooks';
import { finished } from 'node:stream/promises';
import { AprError } from '../errors.mjs';
import {
  authenticateLoopback,
  validatePrivateBinding,
  authenticateOwnerProof,
  createOwnerProof,
} from './http-auth.mjs';

export const HTTP_BODY_LIMIT = 1_048_576;
// Shutdown never releases ownership while dispatch/drain obligations remain.
export const HTTP_SHUTDOWN_GRACE_MS = 10_000;
// New sockets have no authenticated priority: at 128 pending peers, even a
// legitimate new client can be refused. Existing authenticated keep-alive
// controls retain capacity; every accepted socket still counts toward 256.
export const HTTP_ADMISSION_LIMITS = Object.freeze({ sockets: 256, pending: 128 });
// Authenticated control connections outlive the 15-second monitoring cadence.
// Their lifetime is bounded by explicit close and the total socket admission cap.
const realClock = { now: () => performance.now(), setTimeout, clearTimeout };

function reject(res, status) {
  if (res.destroyed) return;
  res.writeHead(status, { Connection: 'close', 'Content-Length': '0' });
  res.end(() => res.socket?.destroy());
}

function bytes(value) {
  const body = Buffer.from(JSON.stringify(value), 'utf8');
  if (body.length > HTTP_BODY_LIMIT) throw new Error('frame bound');
  return body;
}

async function write(res, data) {
  if (res.write(data)) return;
  await new Promise((resolve, reject) => {
    const cleanup = () => {
      res.removeListener('drain', drained);
      res.removeListener('close', closed);
      res.removeListener('error', failed);
    };
    const drained = () => {
      cleanup();
      resolve();
    };
    const failed = (error) => {
      cleanup();
      reject(error);
    };
    const closed = () => failed(new Error('Broker stream closed.'));
    res.once('drain', drained);
    res.once('close', closed);
    res.once('error', failed);
    if (res.destroyed) closed();
  });
}

async function finish(res, data) {
  const settled = finished(res, { cleanup: true });
  res.end(data);
  await settled;
}

const ABORTED = Symbol('broker aborted');
async function untilAbort(promise, signal) {
  if (signal.aborted) return ABORTED;
  let stop;
  const aborted = new Promise((resolve) => {
    stop = () => resolve(ABORTED);
    signal.addEventListener('abort', stop, { once: true });
  });
  try {
    return await Promise.race([promise, aborted]);
  } finally {
    signal.removeEventListener('abort', stop);
  }
}

async function streamEvents(res, events, signal) {
  const iterator = events[Symbol.asyncIterator]();
  let completed = false;
  try {
    while (!signal.aborted) {
      const step = await untilAbort(
        Promise.resolve().then(() => iterator.next()),
        signal
      );
      if (step === ABORTED) return;
      if (step.done) {
        completed = true;
        return;
      }
      await write(res, Buffer.concat([bytes(step.value), Buffer.from('\n')]));
    }
  } finally {
    // An async generator's return can itself wait behind a blocked next().
    // Invoke cleanup, handle its rejection, and never let it retain ownership.
    if (!completed && typeof iterator.return === 'function')
      Promise.resolve()
        .then(() => iterator.return())
        .catch(() => {});
  }
}

export async function createLoopbackServer({
  binding,
  authenticate = authenticateLoopback,
  dispatch,
  clock = realClock,
}) {
  if (
    !validatePrivateBinding(binding) ||
    typeof dispatch !== 'function' ||
    typeof authenticate !== 'function' ||
    !['now', 'setTimeout', 'clearTimeout'].every((key) => typeof clock?.[key] === 'function')
  )
    throw new TypeError('Invalid loopback broker dependencies.');
  const expected = { ...binding, port: null };
  const sockets = new Map();
  const active = new Set();
  const rpcDispatches = new Map();
  let pending = 0;
  let closing = false;
  const clear = (state, name) => {
    if (state[name] !== null) clock.clearTimeout(state[name]);
    state[name] = null;
  };
  const receipt = (socket, state) => {
    if (state.receipt !== null) return;
    state.receipt = clock.setTimeout(() => socket.destroy(), 10_000);
  };
  const idle = (socket, state) => {
    clear(state, 'idle');
    state.idle = clock.setTimeout(() => socket.destroy(), 5_000);
  };

  const handle = async (req, res, expectation) => {
    const state = sockets.get(req.socket);
    if (!state || closing) return reject(res, 503);
    // Overlapping HTTP pipelining is unsupported. Queue the bounded refusal
    // behind the active response so a legitimate wait keeps its lifetime.
    if (state.inFlight) return reject(res, 400);
    state.inFlight = true;
    state.operation = null;
    state.response = res;
    receipt(req.socket, state);
    res.once('close', () => {
      state.inFlight = false;
      state.response = null;
    });
    if (
      req.method !== 'POST' ||
      !['/rpc', '/wait', '/owner-proof', '/owner-bind'].includes(req.url) ||
      req.httpVersion !== '1.1'
    )
      return reject(res, 400);
    if (req.url === '/owner-proof') {
      const proof = authenticateOwnerProof(req.rawHeaders, expected);
      if (!proof.ok || state.proofed || state.authenticated || expectation)
        return reject(res, proof.status ?? 400);
      state.proofed = true;
      const body = bytes(createOwnerProof(expected, proof.challenge, req.socket));
      req.resume();
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Content-Length': body.length,
      });
      // Possession proof does not authenticate the client or clear pending/receipt/idle protection.
      await finish(res, body);
      return;
    }
    if (req.url === '/owner-bind') {
      const count = (name) =>
        req.rawHeaders.filter((value, index) => index % 2 === 0 && value.toLowerCase() === name)
          .length;
      if (
        !state.proofed ||
        state.authenticated ||
        expectation ||
        count('content-length') !== 1 ||
        req.headers['content-length'] !== '0' ||
        req.headers['transfer-encoding'] !== undefined
      )
        return reject(res, 400);
      const auth = authenticate(req.rawHeaders, expected);
      if (!auth?.ok) return reject(res, auth?.status ?? 401);
      state.authenticated = true;
      pending -= 1;
      clear(state, 'idle');
      clear(state, 'receipt');
      req.resume();
      res.writeHead(204, { 'Cache-Control': 'no-store' });
      await finish(res);
      return;
    }
    const auth = authenticate(req.rawHeaders, expected);
    if (!auth?.ok) return reject(res, auth?.status ?? 401);
    if (!state.authenticated) {
      state.authenticated = true;
      pending -= 1;
    }
    clear(state, 'idle');
    if (expectation === 'other') return reject(res, 417);
    if (expectation === 'continue') res.writeContinue();
    if (Number(req.headers['content-length']) > HTTP_BODY_LIMIT) return reject(res, 413);
    const chunks = [];
    let size = 0;
    try {
      for await (const chunk of req) {
        size += chunk.length;
        if (size > HTTP_BODY_LIMIT) return reject(res, 413);
        chunks.push(chunk);
      }
      const parsed = JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))
      );
      if (
        !parsed ||
        parsed.schema !== 'ai-peer-review.rpc/v1' ||
        typeof parsed.operation !== 'string' ||
        !/^[a-z][a-z0-9_-]{0,63}$/.test(parsed.operation) ||
        req.url.endsWith('wait') !== (parsed.operation === 'wait') ||
        !parsed.body ||
        typeof parsed.body !== 'object' ||
        Array.isArray(parsed.body) ||
        typeof parsed.action_id !== 'string' ||
        !/^[a-zA-Z0-9-]{1,64}$/.test(parsed.action_id) ||
        Object.keys(parsed).sort().join(',') !== 'action_id,body,operation,schema'
      )
        return reject(res, 400);
      req.operation = parsed.operation;
      state.operation = parsed.operation;
      req.body = parsed.body;
      req.actionId = parsed.action_id;
      req.brokerSignal = state.abort.signal;
      clear(state, 'receipt');
    } catch {
      return reject(res, 400);
    }
    try {
      const dispatched = Promise.resolve().then(() => dispatch(req, res, auth));
      if (req.operation !== 'wait') {
        rpcDispatches.set(dispatched, { operation: req.operation, action_id: req.actionId });
        const settled = () => rpcDispatches.delete(dispatched);
        dispatched.then(settled, settled);
      }
      // Only the wait route can abandon a blocked event subscription. RPC
      // dispatch remains an ownership obligation even after peer disconnect.
      const result =
        req.operation === 'wait'
          ? await untilAbort(dispatched, state.abort.signal)
          : await dispatched;
      if (result === ABORTED) return;
      if (res.writableEnded || res.destroyed) return;
      if (req.url === '/wait') {
        if (!result || typeof result[Symbol.asyncIterator] !== 'function') return reject(res, 500);
        res.writeHead(200, { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' });
        await streamEvents(res, result, state.abort.signal);
        if (!res.destroyed) await finish(res);
      } else {
        const body = bytes(result);
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'Content-Length': body.length,
        });
        await finish(res, body);
      }
    } catch {
      if (res.headersSent) res.destroy();
      else reject(res, 500);
    }
  };
  const accept = (req, res, expectation) => {
    const task = handle(req, res, expectation).catch(() => {
      if (res.headersSent) res.destroy();
      else reject(res, 500);
    });
    active.add(task);
    task.finally(() => active.delete(task));
  };
  const server = http.createServer(
    {
      maxHeaderSize: 16_384,
      keepAliveTimeout: 0,
      requestTimeout: 10_000,
      headersTimeout: 10_000,
      connectionsCheckingInterval: 1_000,
    },
    (req, res) => accept(req, res)
  );
  server.on('checkContinue', (req, res) => accept(req, res, 'continue'));
  server.on('checkExpectation', (req, res) => accept(req, res, 'other'));
  server.on('connection', (socket) => {
    if (
      closing ||
      sockets.size >= HTTP_ADMISSION_LIMITS.sockets ||
      pending >= HTTP_ADMISSION_LIMITS.pending
    )
      return socket.destroy();
    const state = {
      authenticated: false,
      inFlight: false,
      operation: null,
      response: null,
      idle: null,
      receipt: null,
      abort: new AbortController(),
    };
    sockets.set(socket, state);
    pending += 1;
    receipt(socket, state);
    idle(socket, state);
    socket.on('data', () => {
      if (!state.inFlight) receipt(socket, state);
      if (!state.authenticated) idle(socket, state);
    });
    socket.on('close', () => {
      clear(state, 'idle');
      clear(state, 'receipt');
      state.abort.abort();
      sockets.delete(socket);
      if (!state.authenticated) pending -= 1;
    });
  });
  server.on('upgrade', (_req, socket) => {
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
  });
  server.on('clientError', (error, socket) => {
    if (socket.destroyed) return;
    if (!socket.writable || sockets.get(socket)?.inFlight) return socket.destroy();
    socket.end(
      `HTTP/1.1 ${error.code === 'HPE_HEADER_OVERFLOW' ? '431 Request Header Fields Too Large' : '400 Bad Request'}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`
    );
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  expected.port = server.address().port;
  let closed;
  return Object.freeze({
    port: expected.port,
    close() {
      closed ??= (async () => {
        closing = true;
        const stopped = new Promise((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve()))
        );
        // Pending receipts and wait streams can abort; active RPC replies drain.
        for (const [socket, state] of sockets) {
          if (!state.inFlight || state.operation === null || state.operation === 'wait')
            socket.destroy();
        }
        let timer;
        const deadline = new Promise((_, reject) => {
          timer = clock.setTimeout(
            () =>
              reject(
                new AprError(
                  'APR_BROKER_SHUTDOWN_OUTSTANDING',
                  'Broker shutdown has outstanding dispatch or response obligations.',
                  {
                    recovery:
                      'Retain ownership and reconcile the recorded obligations before release.',
                    details: {
                      outstanding_dispatches: [...rpcDispatches.values()],
                      outstanding_responses: active.size,
                    },
                  }
                )
              ),
            HTTP_SHUTDOWN_GRACE_MS
          );
        });
        try {
          await Promise.race([Promise.allSettled([...active, ...rpcDispatches.keys()]), deadline]);
          for (const socket of sockets.keys()) socket.destroy();
          await stopped;
        } catch (error) {
          for (const socket of sockets.keys()) socket.destroy();
          await stopped;
          throw error;
        } finally {
          clock.clearTimeout(timer);
        }
      })();
      return closed;
    },
  });
}
