// @story #178
import path from 'node:path';
import { createLoopbackServer, authenticatedLoopbackRequestFacts } from './http-server.mjs';
import { isHeldPrivatePublication } from './storage-protection.mjs';
import { portableOwnerOperation } from './portable-owner-lifecycle.mjs';
import { assertLifecycleBoundary } from './owner-lifecycle-core.mjs';
import { boundedOwnershipError, resolvePreparedPortableService } from './portable-ownership.mjs';
import { dispatchBrokerCommandCore } from './broker-protocol.mjs';
const servers = new WeakMap();
const retainedServers = new Set();
const requestAdmissions = new WeakMap();
export function claimPortableServiceRequest(admission) {
  const record = requestAdmissions.get(admission);
  if (!record || record.claimed) throw boundedOwnershipError('genuine-service-request-required');
  record.claimed = true; // One request cannot renew its sealed context by replay.
  const service = resolvePreparedPortableService(record.service);
  if (!service.published) throw boundedOwnershipError('service-startup-incomplete');
  budget(record.context);
  return Object.freeze({
    ...record.facts,
    context: record.context,
    owner: service.owner,
    worktree: service.worktree,
  });
}
const lifecycleAdmissions = new WeakMap();
export function createPortableServiceLifecycleAdmission({ service, phase } = {}) {
  if (!['cleanup', 'reconcile'].includes(phase))
    throw boundedOwnershipError('service-lifecycle-phase-unproved');
  const current = resolvePreparedPortableService(service);
  if (!current.published) throw boundedOwnershipError('service-startup-incomplete');
  const context = Object.freeze({
    signal: new AbortController().signal,
    deadline: performance.now() + 30000,
  });
  const admission = Object.freeze({});
  lifecycleAdmissions.set(admission, { service, phase, context, claimed: false });
  return admission;
}
export function claimPortableServiceLifecycle(admission) {
  const record = lifecycleAdmissions.get(admission);
  if (!record || record.claimed) throw boundedOwnershipError('genuine-service-lifecycle-required');
  record.claimed = true;
  const current = resolvePreparedPortableService(record.service);
  if (!current.published) throw boundedOwnershipError('service-startup-incomplete');
  budget(record.context);
  return Object.freeze({
    phase: record.phase,
    context: record.context,
    owner: current.owner,
    worktree: current.worktree,
  });
}
function admitServiceRequest({ server, service, request }) {
  const facts = authenticatedLoopbackRequestFacts(request, server);
  const current = resolvePreparedPortableService(service);
  if (!current.published) throw boundedOwnershipError('service-startup-incomplete');
  const context = Object.freeze({ signal: facts.signal, deadline: performance.now() + 30000 });
  budget(context);
  const admission = Object.freeze({});
  requestAdmissions.set(admission, { service, facts, context, claimed: false });
  return admission;
}
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
    !exact(input, [
      'credential',
      'expected',
      'signal',
      'deadline',
      ...(input.service !== undefined ? ['service'] : []),
    ]) ||
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
  const service =
    input.service === undefined ? null : resolvePreparedPortableService(input.service);
  if (
    service &&
    (service.instanceId !== expected.instanceId ||
      service.context.signal !== context.signal ||
      service.context.deadline !== context.deadline)
  )
    throw boundedOwnershipError('prepared-service-binding-mismatch');
  const server = await createLoopbackServer({
    binding: { ...expected, credential: snapshot.bytes.toString('hex') },
    dispatch: async (request) => {
      if (!service) throw boundedOwnershipError('portable-consumer-unavailable');
      const current = resolvePreparedPortableService(input.service);
      return dispatchBrokerCommandCore({
        request,
        dispatch: (message) => {
          const admission = admitServiceRequest({ server, service: input.service, request });
          return current.dispatch(message, admission);
        },
      });
    },
  });
  const handle = Object.freeze({
    endpoint: Object.freeze({ host: '127.0.0.1', port: server.port }),
  });
  const record = {
    server,
    credential: input.credential,
    expected,
    context,
    service: input.service,
    closed: false,
    drained: false,
  };
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

export async function drainPortableOwnerReadiness({ readiness, service, signal, deadline } = {}) {
  const record = servers.get(readiness);
  const current = resolvePreparedPortableService(service);
  const context = { signal, deadline };
  if (!record || record.service !== service || record.expected.instanceId !== current.instanceId)
    throw boundedOwnershipError('genuine-service-readiness-required');
  budget(context);
  if (record.closed) return true;
  await current.owner.verify(context);
  try {
    await record.server.close();
    budget(context);
    record.closed = true;
    record.drained = true;
    return true;
  } catch (error) {
    retainedServers.add(record);
    throw boundedOwnershipError('owner-service-drain-unproved', {
      outstandingObligations: [
        ...portableOwnerReadinessObligations(readiness),
        ...(error?.details?.outstandingObligations || []),
      ],
    });
  }
}

// Completion data from the exact private listener; absence alone is never proof.
export function isPortableOwnerReadinessDrainedFor({
  readiness,
  credential,
  expected,
  endpoint,
} = {}) {
  const record = servers.get(readiness);
  return (
    !!record &&
    record.closed &&
    record.drained &&
    !!record.service &&
    record.credential === credential &&
    isHeldPrivatePublication(credential) &&
    exact(expected, ['instanceId', 'worktree', 'ownerVersion']) &&
    Object.keys(record.expected).every((key) => record.expected[key] === expected[key]) &&
    endpoint?.host === '127.0.0.1' &&
    endpoint.port === readiness.endpoint.port
  );
}
