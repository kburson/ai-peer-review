// @story #178
import path from 'node:path';
import { createLoopbackServer } from './http-server.mjs';
import { isHeldPrivatePublication } from './storage-protection.mjs';
import { portableOwnerOperation } from './portable-owner-lifecycle.mjs';
import { assertLifecycleBoundary } from './owner-lifecycle-core.mjs';
import { boundedOwnershipError } from './portable-ownership.mjs';
const servers = new WeakMap();
const retainedServers = new Set();
const exact = (value, keys) =>
  value && Object.keys(value).sort().join(',') === keys.slice().sort().join(',');
function budget(context, expected = context) {
  if (
    !(context?.signal instanceof AbortSignal) ||
    context.signal.aborted ||
    !Number.isFinite(context.deadline) ||
    context.deadline <= performance.now() ||
    context.deadline - performance.now() > 30000 ||
    context.signal !== expected.signal ||
    context.deadline !== expected.deadline
  )
    throw boundedOwnershipError('readiness-budget-unproved');
}
export function isPortableOwnerReadiness(value) {
  const record = servers.get(value);
  return !!record && !record.closed;
}
export async function createPortableOwnerReadiness(input = {}) {
  assertLifecycleBoundary();
  if (
    !exact(input, ['credential', 'expected', 'signal', 'deadline']) ||
    !isHeldPrivatePublication(input.credential) ||
    input.credential.retainedGeneration().name !== 'credential' ||
    path.basename(input.credential.retainedGeneration().root) !== 'private' ||
    !exact(input.expected, ['instanceId', 'worktree', 'ownerVersion']) ||
    !Object.values(input.expected).every(
      (value) => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value)
    )
  )
    throw boundedOwnershipError('genuine-readiness-producers-required');
  const context = Object.freeze({ signal: input.signal, deadline: input.deadline });
  budget(context);
  const snapshot = await input.credential.snapshot(context);
  if (!Buffer.isBuffer(snapshot.bytes) || snapshot.bytes.length !== 32)
    throw boundedOwnershipError('credential-publication-invalid');
  const expected = Object.freeze({ ...input.expected });
  const server = await createLoopbackServer({
    binding: { ...expected, credential: snapshot.bytes.toString('hex') },
    // C4 supplies authenticated readiness only. Operational portable consumers
    // and guarded registry/provider dispatch remain the C6 producer obligation.
    dispatch: async () => {
      throw boundedOwnershipError('portable-consumer-unavailable');
    },
  });
  const handle = Object.freeze({
    endpoint: Object.freeze({ host: '127.0.0.1', port: server.port }),
  });
  const record = { server, credential: input.credential, expected, context, closed: false };
  servers.set(handle, record);
  try {
    budget(context);
    await input.credential.verify(context);
    return handle;
  } catch (error) {
    try {
      await server.close();
      record.closed = true;
    } catch (cleanup) {
      retainedServers.add(record);
      throw boundedOwnershipError(error?.details?.reason || 'readiness-unproved', {
        outstandingObligations: [
          ...portableOwnerReadinessObligations(handle),
          ...(cleanup?.details?.outstandingObligations || []),
        ],
      });
    }
    throw error;
  }
}
export async function assertPortableOwnerReadiness({
  readiness,
  credential,
  expected,
  endpoint,
  signal,
  deadline,
} = {}) {
  const record = servers.get(readiness),
    context = { signal, deadline };
  if (
    !record ||
    record.closed ||
    record.credential !== credential ||
    !isHeldPrivatePublication(credential) ||
    !exact(expected, ['instanceId', 'worktree', 'ownerVersion']) ||
    Object.keys(record.expected).some((key) => record.expected[key] !== expected[key]) ||
    endpoint?.host !== '127.0.0.1' ||
    endpoint.port !== readiness.endpoint.port
  )
    throw boundedOwnershipError('genuine-readiness-producers-required');
  budget(context, portableOwnerOperation(credential) || record.context);
  await credential.verify(context);
  budget(context, portableOwnerOperation(credential) || record.context);
  return true;
}
export async function closePortableOwnerReadiness({ readiness, signal, deadline } = {}) {
  const record = servers.get(readiness),
    context = { signal, deadline };
  if (!record) throw boundedOwnershipError('genuine-readiness-producers-required');
  budget(context, portableOwnerOperation(record.credential) || record.context);
  if (record.closed) return true;
  try {
    await record.server.close();
    budget(context, portableOwnerOperation(record.credential) || record.context);
    record.closed = true;
    return true;
  } catch (error) {
    throw boundedOwnershipError('owner-transport-close-unproved', {
      outstandingObligations: [
        ...portableOwnerReadinessObligations(readiness),
        ...(error?.details?.outstandingObligations || []),
      ],
    });
  }
}
export function portableOwnerReadinessObligations(readiness) {
  const record = servers.get(readiness);
  if (!record) throw boundedOwnershipError('genuine-readiness-producers-required');
  if (record.closed) return Object.freeze([]);
  return Object.freeze([
    Object.freeze({
      name: 'owner-readiness-server',
      root: record.credential.retainedGeneration().root,
      ...readiness.endpoint,
      ...record.expected,
      outcome: 'server-shutdown-pending',
    }),
  ]);
}
