// @story #177
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { encodeRequestCanonical, parseRawJson } from '../api/canonical-json.mjs';
import { AprError } from '../errors.mjs';
import { isHeldPrivatePublicationFor } from './storage-protection.mjs';
import { isOwnerElectionLeaseFor } from './ownership-election.mjs';
import { isOwnerConnectionFor, observeLoopbackOwner } from './owner-connection.mjs';
import { observeOriginalProcess, reconcileOriginalProcess } from '../protocol/process-identity.mjs';
import {
  isInstalledProcessSourceAssurance,
  revalidateInstalledProcessSourceAssurance,
} from '../protocol/process-source-assurance.mjs';
import {
  isVerifiedRuntimeInventory,
  verifyRuntimeInventorySync,
} from '../startup/runtime-inventory.mjs';
import {
  createOwnerLifecycleCore,
  currentLifecycleOperation,
  ownerLifecycleCompleted,
  assertLifecycleBoundary,
  sameProcessOwnerFacts,
} from './owner-lifecycle-core.mjs';

const loadedInstallation = realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
export function isLoadedOwnerRuntime(runtime) {
  return isVerifiedRuntimeInventory(runtime) && runtime.packageRoot === loadedInstallation;
}
const owners = new WeakMap();
const resources = new WeakMap();
const protectedRoots = new Map();
const HEX = /^[a-f0-9]{64}$/u;
function stale(reason) {
  return new AprError('APR_BROKER_STALE', 'Portable owner could not be established.', {
    recovery: 'Preserve original protected generations and reconcile outstanding obligations.',
    details: { reason, outstandingObligations: [] },
  });
}
function exactKeys(value, keys) {
  return value && Object.keys(value).sort().join(',') === keys.slice().sort().join(',');
}
function bounded(context) {
  if (
    !(context?.signal instanceof AbortSignal) ||
    !Number.isFinite(context.deadline) ||
    context.signal.aborted ||
    context.deadline <= performance.now() ||
    context.deadline - performance.now() > 30000
  )
    throw stale('operation-budget-unproved');
}
export function isPortableBrokerOwner(owner) {
  const record = owners.get(owner);
  return !!record && record.activated && ownerLifecycleCompleted(record.core);
}
// These lookups only observe an active, privately admitted genuine operation.
// They cannot register a resource, complete startup, or mint another context.
export function portableOwnerOperation(resource) {
  const record = resources.get(resource);
  if (!record) return null;
  const context = currentLifecycleOperation(record.core);
  if (!context || !ownerLifecycleCompleted(record.core))
    throw stale('owner-operation-not-admitted');
  return context;
}
export function portableOwnerRootOperation(root, original) {
  const record = protectedRoots.get(root);
  if (!record) return null;
  const current = portableOwnerOperation(record.lease);
  if (
    original &&
    ![record.startup, current].some(
      (context) => context.signal === original.signal && context.deadline === original.deadline
    )
  )
    throw stale('owner-guard-budget-mismatch');
  return current;
}

export async function createPortableOwnerLifecycle(input = {}) {
  assertLifecycleBoundary();
  if (
    !exactKeys(input, [
      'publication',
      'credential',
      'endpointPublication',
      'lease',
      'identity',
      'source',
      'connection',
      'runtime',
      'signal',
      'deadline',
    ])
  )
    throw stale('lifecycle-options-invalid');
  const {
    publication,
    credential,
    endpointPublication,
    lease,
    identity,
    source,
    connection,
    runtime,
  } = input;
  const startup = Object.freeze({ signal: input.signal, deadline: input.deadline });
  bounded(startup);
  if (
    !isHeldPrivatePublicationFor(publication, { lease, name: 'owner.json' }) ||
    !isHeldPrivatePublicationFor(credential, { lease, name: 'credential' }) ||
    !isHeldPrivatePublicationFor(endpointPublication, { lease, name: 'endpoint.json' }) ||
    !isOwnerElectionLeaseFor(lease, { identity, source, ...startup }) ||
    !isInstalledProcessSourceAssurance(source) ||
    !isLoadedOwnerRuntime(runtime)
  )
    throw stale('genuine-owner-producers-required');
  if (
    (await reconcileOriginalProcess({ original: identity, observation: identity })).status !==
    'live'
  )
    throw stale('genuine-original-process-required');
  if (!(await revalidateInstalledProcessSourceAssurance(source, startup)))
    throw stale('source-class-unavailable');
  const snapshots = [];
  for (const handle of [publication, credential, endpointPublication])
    snapshots.push(await handle.snapshot(startup));
  bounded(startup);
  const [ownerSnapshot, credentialSnapshot, endpointSnapshot] = snapshots;
  let facts, endpointFacts;
  try {
    facts = parseRawJson(new TextDecoder('utf-8', { fatal: true }).decode(ownerSnapshot.bytes));
    endpointFacts = parseRawJson(
      new TextDecoder('utf-8', { fatal: true }).decode(endpointSnapshot.bytes)
    );
  } catch {
    throw stale('protected-owner-format-unproved');
  }
  if (!facts || !endpointFacts || typeof facts !== 'object' || typeof endpointFacts !== 'object')
    throw stale('protected-owner-format-unproved');
  const ownerVersion = createHash('sha256').update(ownerSnapshot.bytes).digest('hex');
  const expected = Object.freeze({
    instanceId: facts.instanceId,
    worktree: facts.worktree,
    ownerVersion,
  });
  if (
    !exactKeys(facts, ['schema', 'instanceId', 'worktree', 'identity', 'versions']) ||
    facts.schema !== 'ai-peer-review.portable-owner/v1' ||
    !HEX.test(facts.instanceId ?? '') ||
    !HEX.test(facts.worktree ?? '') ||
    !exactKeys(
      facts.identity,
      ['host', 'pid', 'creation', 'creationSource'].filter((key) => identity[key] !== undefined)
    ) ||
    !sameProcessOwnerFacts(facts.identity, identity) ||
    !exactKeys(facts.versions, ['package_version', 'broker_protocol_version', 'node_major']) ||
    facts.versions.package_version !== runtime.packageVersion ||
    facts.versions.broker_protocol_version !== 1 ||
    facts.versions.node_major !== Number(process.versions.node.split('.')[0]) ||
    credentialSnapshot.bytes.length !== 32 ||
    !exactKeys(endpointFacts, [
      'schema',
      'instanceId',
      'worktree',
      'ownerVersion',
      'host',
      'port',
      'digest',
      'heartbeat',
      'versions',
    ]) ||
    endpointFacts.schema !== 'ai-peer-review.portable-endpoint/v1' ||
    !Number.isFinite(endpointFacts.heartbeat) ||
    endpointFacts.heartbeat < 0 ||
    !exactKeys(endpointFacts.versions, [
      'package_version',
      'broker_protocol_version',
      'node_major',
    ]) ||
    !encodeRequestCanonical(endpointFacts.versions).equals(
      encodeRequestCanonical(facts.versions)
    ) ||
    endpointFacts.digest !==
      createHash('sha256')
        .update(
          encodeRequestCanonical({
            instanceId: facts.instanceId,
            worktree: facts.worktree,
            ownerVersion,
            host: endpointFacts.host,
            port: endpointFacts.port,
            versions: facts.versions,
          })
        )
        .digest('hex') ||
    endpointFacts.instanceId !== expected.instanceId ||
    endpointFacts.worktree !== expected.worktree ||
    endpointFacts.ownerVersion !== ownerVersion ||
    endpointFacts.host !== '127.0.0.1' ||
    !Number.isInteger(endpointFacts.port) ||
    endpointFacts.port < 1 ||
    endpointFacts.port > 65535
  )
    throw stale('protected-owner-binding-unproved');
  const endpoint = Object.freeze({ host: endpointFacts.host, port: endpointFacts.port });
  if (!isOwnerConnectionFor(connection, { credential, expected, endpoint, ...startup }))
    throw stale('genuine-owner-connection-required');
  verifyRuntimeInventorySync({ packageRoot: runtime.packageRoot, previousObservation: runtime });
  const versions = Object.freeze({ ...facts.versions });
  const same = (before, after) =>
    ['name', 'identity', 'fileVersion', 'rootIdentity'].every(
      (key) => before[key] === after[key]
    ) &&
    Buffer.isBuffer(after.bytes) &&
    before.bytes.equals(after.bytes);
  const wrap = (handle, snapshot) => ({
    async verify(context) {
      if (
        (await handle.verify(context)) !== true ||
        !same(snapshot, await handle.snapshot(context))
      )
        throw stale('owner-generation-changed');
      return true;
    },
    withdraw: (context) => handle.withdraw(snapshot, context),
    close: (context) => handle.close(context),
    retainedGeneration: handle.retainedGeneration,
  });
  const readiness = async (context) => {
    verifyRuntimeInventorySync({ packageRoot: runtime.packageRoot, previousObservation: runtime });
    if (!ownerLifecycleCompleted(core))
      return isOwnerConnectionFor(connection, { credential, expected, endpoint, ...context });
    const observed = await observeLoopbackOwner({
      endpoint,
      privateBinding: credential,
      expected,
      ...context,
    });
    if (
      observed.kind !== 'verified-live' ||
      !isOwnerConnectionFor(observed.connection, { credential, expected, endpoint, ...context })
    )
      throw stale('owner-readiness-unproved');
    await observed.connection.close(context);
    return true;
  };
  const core = await createOwnerLifecycleCore({
    budget: startup,
    ports: {
      publication: wrap(publication, ownerSnapshot),
      credential: wrap(credential, credentialSnapshot),
      endpoint: wrap(endpointPublication, endpointSnapshot),
      lease,
      source: {
        async observe(context) {
          if (!(await revalidateInstalledProcessSourceAssurance(source, context))) return false;
          const observation = await observeOriginalProcess({ pid: identity.pid, ...context });
          return (
            (await reconcileOriginalProcess({ original: identity, observation })).status === 'live'
          );
        },
      },
      ready: { verify: readiness },
    },
  });
  const record = {
    core,
    lease,
    startup,
    activated: false,
    roots: new Set(snapshots.map((snapshot) => snapshot.root)),
  };
  // C1 snapshots carry the producer's actual root locator in retained metadata.
  record.roots = new Set(
    [publication, credential, endpointPublication].map((handle) => handle.retainedGeneration().root)
  );
  const owner = Object.freeze({
    handshake: Object.freeze({ instance_id: facts.instanceId, versions }),
    instanceId: facts.instanceId,
    async publish() {
      await core.publish();
      for (const root of record.roots) {
        if (protectedRoots.has(root)) throw stale('owner-root-already-held');
      }
      record.activated = true;
      for (const resource of [lease, publication, credential, endpointPublication])
        resources.set(resource, record);
      for (const root of record.roots) protectedRoots.set(root, record);
    },
    verify: (context) => core.verify(context),
    async release(context) {
      const result = await core.release(context);
      for (const root of record.roots)
        if (protectedRoots.get(root) === record) protectedRoots.delete(root);
      return result;
    },
  });
  owners.set(owner, record);
  return owner;
}
