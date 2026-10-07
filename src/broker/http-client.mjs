import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { HTTP_BODY_LIMIT } from './http-server.mjs';
import { validatePrivateBinding } from './http-auth.mjs';

function envelope(code, actionId, uncertain) {
  return {
    schema: 'ai-peer-review.response/v1',
    ok: false,
    mutation_occurred: uncertain ? null : false,
    retry_safe: !uncertain,
    next_action: uncertain ? 'reconcile' : null,
    action_id: actionId,
    error: {
      code,
      message: uncertain ? 'Broker delivery outcome is unknown.' : 'Broker request failed.',
    },
  };
}

function open(
  { endpoint, privateBinding, operation, body, signal, agent, actionId = randomUUID() },
  route
) {
  if (
    endpoint?.host !== '127.0.0.1' ||
    !Number.isInteger(endpoint.port) ||
    endpoint.port < 1 ||
    endpoint.port > 65_535 ||
    !validatePrivateBinding(privateBinding)
  )
    throw new TypeError('Invalid private loopback endpoint.');
  const payload = Buffer.from(
    JSON.stringify({ schema: 'ai-peer-review.rpc/v1', operation, body, action_id: actionId })
  );
  if (payload.length > HTTP_BODY_LIMIT) throw new TypeError('Broker body exceeds its bound.');
  const mutation = !['status', 'wait'].includes(operation);
  let mayBeSent = false;
  const response = new Promise((resolve) => {
    const req = http.request(
      {
        host: endpoint.host,
        port: endpoint.port,
        method: 'POST',
        path: route,
        signal,
        agent,
        headers: {
          Host: `127.0.0.1:${endpoint.port}`,
          Authorization: `Bearer ${privateBinding.credential}`,
          'X-Apr-Instance': privateBinding.instanceId,
          'X-Apr-Worktree': privateBinding.worktree,
          'Content-Type': 'application/json',
          'Content-Length': payload.length,
        },
      },
      (res) => resolve({ res, req })
    );
    req.once('error', (error) =>
      resolve({
        failure: envelope(
          signal?.aborted ? 'APR_BROKER_ABORTED' : 'APR_BROKER_DELIVERY_UNKNOWN',
          actionId,
          mutation && mayBeSent && error.code !== 'ECONNREFUSED'
        ),
      })
    );
    // A queued request has no delivery opportunity until a socket is assigned.
    // Replacement refusal or pre-assignment cancellation is therefore known unsent.
    req.once('socket', () => {
      if (signal?.aborted) req.destroy();
      else {
        mayBeSent = true;
        req.end(payload);
      }
    });
    if (signal?.aborted) req.destroy();
  });
  return { response, actionId, mutation, uncertain: () => mutation && mayBeSent };
}

export async function requestLoopback(input) {
  const operation = open(input, '/rpc');
  const { res, req, failure } = await operation.response;
  if (failure) return failure;
  let completed = false;
  try {
    if ([400, 401, 403, 413, 431, 503].includes(res.statusCode))
      return envelope('APR_BROKER_REQUEST_REFUSED', operation.actionId, false);
    if (res.statusCode !== 200) throw new Error('refused');
    const chunks = [];
    let size = 0;
    for await (const chunk of res) {
      size += chunk.length;
      if (size > HTTP_BODY_LIMIT) throw new Error('frame bound');
      chunks.push(chunk);
    }
    const value = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))
    );
    if (value?.schema !== 'ai-peer-review.response/v1' || typeof value.ok !== 'boolean')
      throw new Error('envelope');
    completed = true;
    return value;
  } catch {
    return envelope(
      input.signal?.aborted ? 'APR_BROKER_ABORTED' : 'APR_BROKER_DELIVERY_UNKNOWN',
      operation.actionId,
      operation.uncertain()
    );
  } finally {
    if (!completed) {
      res.destroy();
      req.destroy();
    }
  }
}

export async function* waitLoopback({ afterCursor, ...input }) {
  const operation = open(
    { ...input, operation: 'wait', body: { ...input.body, after_cursor: afterCursor } },
    '/wait'
  );
  const { res, req, failure } = await operation.response;
  if (failure) throw Object.assign(new Error(failure.error.message), { code: failure.error.code });
  let pending = Buffer.alloc(0);
  try {
    if (res.statusCode !== 200) throw new Error('Broker wait refused.');
    for await (const chunk of res) {
      // Consume delimiters before retaining bytes, bounding each frame rather than the entire stream.
      let start = 0;
      for (let end = 0; end < chunk.length; end += 1) {
        if (chunk[end] !== 10) continue;
        if (pending.length + end - start > HTTP_BODY_LIMIT)
          throw new Error('Broker event exceeds its bound.');
        const frame = Buffer.concat([pending, chunk.subarray(start, end)]);
        yield JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(frame));
        pending = Buffer.alloc(0);
        start = end + 1;
      }
      if (pending.length + chunk.length - start > HTTP_BODY_LIMIT)
        throw new Error('Broker event exceeds its bound.');
      pending = Buffer.concat([pending, chunk.subarray(start)]);
    }
    if (pending.length) throw new Error('Truncated broker event.');
  } finally {
    res.destroy();
    req.destroy();
  }
}
