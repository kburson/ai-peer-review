// @story #176
import http from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { AprError } from '../errors.mjs';
import { validatePrivateBinding, verifyOwnerProof } from './http-auth.mjs';
import { requestLoopback, waitLoopback } from './http-client.mjs';
import {
  isHeldPrivatePublication,
  isProtectedCredentialObservation,
} from './storage-protection.mjs';

const connections = new WeakMap();
const HEX = /^[a-f0-9]{64}$/;
const unknown = (reason) => Object.freeze({ kind: 'unknown', verified: false, reason });
function refusal(reason) {
  return new AprError('APR_BROKER_STALE', 'Owner connection could not be established.', {
    recovery: 'Re-observe protected owner state in a fresh operation.',
    details: { reason },
  });
}
function keys(value, allowed) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).every((key) => allowed.includes(key))
  );
}
function contextCheck(original, input, expiry = true) {
  if (!(input?.signal instanceof AbortSignal) || !Number.isFinite(input?.deadline))
    throw refusal('operation-budget-unproved');
  if (input.signal !== original.signal || input.deadline !== original.deadline)
    throw refusal('connection-budget-mismatch');
  if (expiry && (input.signal.aborted || performance.now() >= input.deadline))
    throw refusal(input.signal.aborted ? 'operation-aborted' : 'operation-deadline');
}
function preflight(input) {
  if (!keys(input, ['endpoint', 'privateBinding', 'expected', 'signal', 'deadline']))
    throw refusal('connection-options-invalid');
  if (
    !keys(input.endpoint, ['host', 'port']) ||
    input.endpoint.host !== '127.0.0.1' ||
    !Number.isInteger(input.endpoint.port) ||
    input.endpoint.port < 1 ||
    input.endpoint.port > 65535
  )
    throw refusal('endpoint-invalid');
  if (
    !keys(input.expected, ['instanceId', 'worktree', 'ownerVersion']) ||
    !['instanceId', 'worktree', 'ownerVersion'].every((key) => HEX.test(input.expected[key] ?? ''))
  )
    throw refusal('owner-binding-invalid');
  contextCheck(input, input);
  if (input.deadline - performance.now() > 30000) throw refusal('operation-budget-unproved');
}
class OperationAgent extends http.Agent {
  constructor() {
    super({ keepAlive: true, maxSockets: 1, maxFreeSockets: 1, timeout: 0 });
    this.allocated = false;
  }
  createConnection(options, callback) {
    if (this.allocated) {
      callback(refusal('proved-socket-lost'));
      return;
    }
    this.allocated = true;
    return super.createConnection(options, callback);
  }
}
async function exchange(endpoint, expected, credential, agent, signal) {
  const challenge = randomBytes(32).toString('hex');
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        ...endpoint,
        method: 'POST',
        path: '/owner-proof',
        signal,
        agent,
        maxHeaderSize: 4096,
        headers: {
          Host: '127.0.0.1:' + endpoint.port,
          'X-Apr-Challenge': challenge,
          'Content-Length': '0',
        },
      },
      async (res) => {
        const socket = res.socket;
        try {
          if (res.statusCode !== 200) throw refusal('owner-proof-refused');
          let size = 0;
          const chunks = [];
          for await (const chunk of res) {
            size += chunk.length;
            if (size > 4096) throw refusal('malformed-proof');
            chunks.push(chunk);
          }
          let value;
          try {
            value = JSON.parse(
              new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))
            );
          } catch {
            throw refusal('malformed-proof');
          }
          const reason = verifyOwnerProof(value, {
            challenge,
            expected,
            endpoint,
            credential,
            socket,
          });
          if (reason) throw refusal(reason);
          if (
            socket.destroyed ||
            !socket.writable ||
            res.headers.connection?.toLowerCase() === 'close'
          )
            throw refusal('proved-socket-lost');
          resolve(socket);
        } catch (error) {
          res.destroy();
          req.destroy();
          reject(error);
        }
      }
    );
    req.once('error', reject);
    req.end();
  });
}
function lost(actionId) {
  return {
    schema: 'ai-peer-review.response/v1',
    ok: false,
    mutation_occurred: false,
    retry_safe: true,
    next_action: null,
    action_id: actionId,
    error: { code: 'APR_BROKER_STALE', message: 'Proved broker connection is unavailable.' },
  };
}
export function isVerifiedOwnerConnection(connection) {
  const record = connections.get(connection);
  return (
    !!record &&
    !record.socket.destroyed &&
    record.socket.writable &&
    !record.closed() &&
    !record.context.signal.aborted &&
    performance.now() < record.context.deadline
  );
}
export function isOwnerConnectionFor(
  connection,
  { credential, expected, endpoint, signal, deadline } = {}
) {
  const record = connections.get(connection);
  return (
    isVerifiedOwnerConnection(connection) &&
    record.publication === credential &&
    record.context.signal === signal &&
    record.context.deadline === deadline &&
    ['instanceId', 'worktree', 'ownerVersion'].every(
      (key) => record.expected[key] === expected?.[key]
    ) &&
    record.endpoint.host === endpoint?.host &&
    record.endpoint.port === endpoint?.port
  );
}
async function observe(input, genuine) {
  let agent, timer, stop, publicationFailure;
  // Only privately registered publication methods enter this boundary.
  // Preserve their bounded errors, including exact C1 cleanup obligations.
  const readPublication = async (operation) => {
    try {
      return await operation();
    } catch (error) {
      publicationFailure =
        error instanceof AprError ? error : refusal('credential-publication-unproved');
      throw publicationFailure;
    }
  };
  try {
    preflight(input);
    const endpoint = Object.freeze({ ...input.endpoint });
    const expected = Object.freeze({ ...input.expected });
    const context = Object.freeze({ signal: input.signal, deadline: input.deadline });
    let privateBinding, generation, credentialBytes;
    const publication = input.privateBinding;
    if (genuine) {
      if (!(isHeldPrivatePublication(publication) || isProtectedCredentialObservation(publication)))
        return unknown('genuine-credential-publication-required');
      generation = { ...publication.retainedGeneration() };
      if (generation.name !== 'credential') return unknown('credential-publication-name-invalid');
      const snapshot = await readPublication(() => publication.snapshot(context));
      if (!Buffer.isBuffer(snapshot.bytes) || snapshot.bytes.length !== 32)
        return unknown('credential-publication-invalid');
      credentialBytes = Buffer.from(snapshot.bytes);
      privateBinding = Object.freeze({ ...expected, credential: credentialBytes.toString('hex') });
    } else {
      if (
        !keys(publication, ['credential', 'instanceId', 'worktree', 'ownerVersion']) ||
        !validatePrivateBinding(publication)
      )
        return unknown('fixture-binding-invalid');
      if (['instanceId', 'worktree'].some((key) => publication[key] !== expected[key]))
        return unknown('owner-binding-mismatch');
      privateBinding = Object.freeze({ ...publication });
    }
    const recheck = async () => {
      contextCheck(context, context);
      if (!genuine) return;
      if (!(isHeldPrivatePublication(publication) || isProtectedCredentialObservation(publication)))
        throw refusal('credential-publication-changed');
      // Genuine snapshot already verifies protection, retained descriptor,
      // exact generation and original budget before and after its read.
      const current = await readPublication(() => publication.snapshot(context));
      const held = publication.retainedGeneration();
      if (
        ['name', 'root', 'rootIdentity', 'identity', 'fileVersion'].some(
          (key) => held[key] !== generation[key]
        ) ||
        !current.bytes.equals(credentialBytes)
      )
        throw refusal('credential-publication-changed');
      contextCheck(context, context);
    };
    await recheck();
    const controller = new AbortController();
    agent = new OperationAgent();
    stop = () => {
      controller.abort();
      agent.destroy();
    };
    context.signal.addEventListener('abort', stop, { once: true });
    const expire = () => {
      const remaining = context.deadline - performance.now();
      if (remaining > 0) {
        // Timer resolution cannot renew the captured absolute budget or expire it early.
        timer = setTimeout(expire, Math.max(1, Math.ceil(remaining)));
        timer.unref();
        return;
      }
      stop();
    };
    timer = setTimeout(expire, Math.max(1, Math.ceil(context.deadline - performance.now())));
    timer.unref();
    if (context.signal.aborted || performance.now() >= context.deadline) stop();
    const socket = await exchange(
      endpoint,
      expected,
      privateBinding.credential,
      agent,
      controller.signal
    );
    await recheck();
    if (controller.signal.aborted || socket.destroyed) throw refusal('proved-socket-lost');
    let busy = false,
      closed = false;
    const validate = (receiver, options, allowed, expiry = true) => {
      if (receiver !== handle) throw refusal('genuine-connection-required');
      if (!keys(options, [...allowed, 'signal', 'deadline']))
        throw refusal('connection-options-invalid');
      contextCheck(context, options, expiry);
    };
    const cleanup = () => {
      closed = true;
      clearTimeout(timer);
      context.signal.removeEventListener('abort', stop);
      stop();
    };
    const handle = Object.freeze({
      verified: genuine,
      async request(options) {
        validate(this, options, ['operation', 'body', 'actionId']);
        if (busy) throw refusal('connection-busy');
        const actionId = options.actionId === undefined ? randomUUID() : options.actionId;
        if (closed || socket.destroyed || controller.signal.aborted) return lost(actionId);
        busy = true;
        try {
          await recheck();
          if (socket.destroyed || controller.signal.aborted) return lost(actionId);
          return await requestLoopback({
            endpoint,
            privateBinding,
            agent,
            ...options,
            actionId,
            signal: controller.signal,
            deadline: context.deadline,
          });
        } finally {
          busy = false;
        }
      },
      async *wait(options) {
        validate(this, options, ['afterCursor']);
        if (busy) throw refusal('connection-busy');
        if (closed || socket.destroyed || controller.signal.aborted)
          throw refusal('proved-socket-lost');
        busy = true;
        try {
          await recheck();
          if (socket.destroyed || controller.signal.aborted) throw refusal('proved-socket-lost');
          yield* waitLoopback({
            endpoint,
            privateBinding,
            agent,
            afterCursor: options.afterCursor,
            signal: controller.signal,
            deadline: context.deadline,
            body: {},
          });
        } finally {
          busy = false;
        }
      },
      async close(options) {
        validate(this, options, [], false);
        cleanup();
        return Object.freeze({ closed: true });
      },
    });
    if (genuine)
      connections.set(handle, {
        socket,
        tuple: Object.freeze({
          localAddress: socket.localAddress,
          localPort: socket.localPort,
          remoteAddress: socket.remoteAddress,
          remotePort: socket.remotePort,
        }),
        context,
        publication,
        expected,
        endpoint,
        closed: () => closed,
      });
    return Object.freeze({
      kind: genuine ? 'verified-live' : 'core-live',
      verified: genuine,
      connection: handle,
    });
  } catch (error) {
    clearTimeout(timer);
    if (stop) input.signal.removeEventListener('abort', stop);
    agent?.destroy();
    if (publicationFailure) throw publicationFailure;
    if (error.code === 'ECONNREFUSED')
      return Object.freeze({ kind: 'absent', verified: false, reason: 'transport-absent' });
    return unknown(
      error.details?.reason ||
        (input?.signal?.aborted
          ? 'operation-aborted'
          : performance.now() >= input?.deadline
            ? 'operation-deadline'
            : 'transport-unproved')
    );
  }
}
export const observeLoopbackOwner = (input = {}) => observe(input, true);
// Explicit fixture protocol only; it never registers a production connection.
export const observeLoopbackOwnerCore = (input = {}) => observe(input, false);
export function ownerConnectionObligations(connection) {
  const record = connections.get(connection);
  if (!record) throw refusal('genuine-connection-required');
  if (record.closed()) return Object.freeze([]);
  return Object.freeze([
    Object.freeze({
      name: 'proved-owner-socket',
      host: record.endpoint.host,
      port: record.endpoint.port,
      ...record.expected,
      ...record.tuple,
      outcome: 'socket-shutdown-pending',
    }),
  ]);
}
