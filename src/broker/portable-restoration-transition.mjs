// @story #209
// Unverified comparison only. Operational acceptance requires genuine inventory and worker receipts.
import path from 'node:path';
import { canonicalProjection } from '../protocol/canonical-projection.mjs';
import { PROTOCOL_STATES } from '../protocol/format-authority.mjs';
import { validBrokerRegistrationRecordCore } from './registration-record.mjs';
import { describeResourceReconciliationNamespaceCore } from './portable-reconciliation-inventory.mjs';
const exact = (value, keys) =>
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).sort().join(',') === [...keys].sort().join(',');
export function nextPortableRestorationStageCore(previous, stage) {
  const allowed = {
    created: ['start'],
    start: ['suspend', 'close'],
    suspend: ['close'],
    close: [],
  };
  return previous === null
    ? stage === 'created'
      ? stage
      : null
    : allowed[previous]?.includes(stage)
      ? stage
      : null;
}
function files(namespace) {
  const result = new Map();
  if (!Array.isArray(namespace?.files) || namespace.files.length > 4096)
    throw new Error('unproved');
  for (const file of namespace.files) {
    if (
      typeof file.name !== 'string' ||
      result.has(file.name) ||
      !ArrayBuffer.isView(file.bytes) ||
      file.bytes.length > 1048576
    )
      throw new Error('unproved');
    result.set(file.name, { ...file, bytes: Buffer.from(file.bytes) });
  }
  return result;
}
function sameNamespace(before, after) {
  if (
    !before ||
    !after ||
    before.kind !== after.kind ||
    before.root !== after.root ||
    canonicalProjection(before.entries) !== canonicalProjection(after.entries)
  )
    return false;
  const left = files(before),
    right = files(after);
  return (
    left.size === right.size &&
    [...left].every(
      ([name, file]) =>
        right.has(name) &&
        file.bytes.equals(right.get(name).bytes) &&
        file.mode === right.get(name).mode
    )
  );
}
function namespaceMap(data) {
  if (data?.verified !== false || !Array.isArray(data.namespaces) || data.namespaces.length > 4096)
    throw new Error('unproved');
  const result = new Map();
  for (const namespace of data.namespaces) {
    if (typeof namespace.root !== 'string' || result.has(namespace.root))
      throw new Error('unproved');
    files(namespace);
    result.set(namespace.root, namespace);
  }
  return result;
}
function containerMap(data) {
  if (
    !Array.isArray(data.containers) ||
    data.containers.length > 4096 ||
    !Array.isArray(data.absent) ||
    data.absent.length > 4096
  )
    throw new Error('unproved');
  const map = new Map();
  for (const item of data.containers) {
    if (
      typeof item.root !== 'string' ||
      !Array.isArray(item.entries) ||
      !Array.isArray(item.chain) ||
      typeof item.identity !== 'string' ||
      typeof item.version !== 'string' ||
      !['ordinary', 'protected'].includes(item.mechanism)
    )
      throw new Error('unproved');
    const key = item.mechanism + ':' + item.root;
    if (map.has(key) && canonicalProjection(map.get(key)) !== canonicalProjection(item))
      throw new Error('unproved');
    map.set(key, item);
  }
  return map;
}
function sameContainers(before, after, allowed) {
  const left = containerMap(before),
    right = containerMap(after);
  const covers = (location) =>
    [...allowed].some((name) => name === location || name.startsWith(location + path.sep));
  for (const key of new Set([...left.keys(), ...right.keys()])) {
    const a = left.get(key),
      b = right.get(key),
      root = (a ?? b).root;
    if (!a || !b) {
      if (!covers(root) || !b) return false;
      continue;
    }
    if (
      a.mechanism !== b.mechanism ||
      a.identity !== b.identity ||
      canonicalProjection(a.chain) !== canonicalProjection(b.chain)
    )
      return false;
    const rows = (value) =>
      new Map(value.entries.map((entry) => [entry.relativePath ?? entry.name, entry]));
    const ar = rows(a),
      br = rows(b);
    for (const name of new Set([...ar.keys(), ...br.keys()])) {
      const x = ar.get(name),
        y = br.get(name),
        location = path.join(root, name);
      if (canonicalProjection(x ?? null) === canonicalProjection(y ?? null)) continue;
      if (!covers(location)) return false;
      if (x && y && (x.type !== y.type || x.identity !== y.identity)) return false;
      if (x && y && x.type !== 'directory' && !allowed.has(location)) return false;
    }
    if (a.version !== b.version && !covers(root)) return false;
  }
  const absences = (data) => data.absent.filter(({ root }) => !covers(root));
  return canonicalProjection(absences(before)) === canonicalProjection(absences(after));
}
function recoveryTransition(before, after, registration, protocolState) {
  const root = path.join(
    registration.project_root,
    '.scratch',
    'peer-review',
    'broker',
    'recovery'
  );
  if (after?.kind !== 'recovery' || after.root !== root || (before && before.kind !== 'recovery'))
    return false;
  const left = before ? files(before) : new Map(),
    right = files(after);
  const name = registration.review_id + '.json';
  if (left.has(name) || right.size !== left.size + 1 || !right.has(name)) return false;
  for (const [oldName, file] of left)
    if (!right.get(oldName)?.bytes.equals(file.bytes) || right.get(oldName)?.mode !== file.mode)
      return false;
  const oldRows = before?.entries ?? [];
  if (
    canonicalProjection(oldRows) !==
    canonicalProjection(
      after.entries.filter((entry) => (entry.relativePath ?? entry.name) !== name)
    )
  )
    return false;
  const expected = {
    schema: 'ai-peer-review.broker-recovery/v1',
    review_id: registration.review_id,
    project_digest: registration.project_digest,
    workspace: registration.workspace,
    request_digest: registration.request_digest,
    runtime_digest: registration.runtime.digest,
    protocol_state: protocolState,
  };
  return right.get(name).bytes.equals(Buffer.from(JSON.stringify(expected) + '\n'));
}
function heldResourceNamespace(namespace, resource, registration) {
  if (
    !namespace ||
    namespace.kind !== 'provider-resources' ||
    namespace.root !== resource.root ||
    !exact(resource.record, [
      'schema',
      'resource_digest',
      'owner_project_root_digest',
      'instance_id',
      'nonce_digest',
      'acquired_at',
      'heartbeat_at',
      'diagnostic_at',
    ]) ||
    resource.record.schema !== 'ai-peer-review.provider-resource/v1' ||
    resource.record.resource_digest !== resource.resourceDigest ||
    resource.record.owner_project_root_digest !== registration.project_digest
  )
    return false;
  const key = describeResourceReconciliationNamespaceCore({
    root: namespace.root,
    entries: [],
  }).resourceKey;
  const rows = files(namespace),
    name = 'apr-resource-' + key + '.json';
  if (rows.size !== 2 || !rows.has(name)) return false;
  if (
    namespace.entries.length !== rows.size ||
    namespace.entries.some(
      (entry) => entry.type !== 'file' || !rows.has(entry.relativePath ?? entry.name)
    )
  )
    return false;
  let record, election;
  try {
    record = JSON.parse(rows.get(name).bytes.toString('utf8'));
    const names = [...rows.keys()].filter((value) => value !== name);
    election = JSON.parse(rows.get(names[0]).bytes.toString('utf8'));
    if (names[0] !== 'apr-election-' + key + '-' + election.contenderId + '.json') return false;
  } catch {
    return false;
  }
  return (
    canonicalProjection(record) === canonicalProjection(resource.record) &&
    exact(election, ['schema', 'resourceKey', 'contenderId', 'choosing', 'ticket', 'identity']) &&
    election.schema === 'ai-peer-review.election-slot/v1' &&
    election.resourceKey === key &&
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/u.test(election.contenderId) &&
    election.choosing === false &&
    /^[1-9]\d{0,29}$/u.test(election.ticket) &&
    typeof election.identity?.host === 'string' &&
    election.identity.host.length > 0 &&
    Number.isSafeInteger(election.identity?.pid) &&
    election.identity.pid > 0
  );
}
function resourceTransition(before, after, resource, registration, stage, allowed) {
  if (!after || after.kind !== 'provider-resources' || after.root !== resource.root) return false;
  const empty = (namespace) =>
    !namespace || (files(namespace).size === 0 && namespace.entries.length === 0);
  if (resource.released) {
    if (
      !['suspend', 'close'].includes(stage) ||
      !heldResourceNamespace(before, resource, registration) ||
      !empty(after)
    )
      return false;
  } else {
    if (
      stage !== 'created' ||
      !empty(before) ||
      !heldResourceNamespace(after, resource, registration)
    )
      return false;
  }
  for (const namespace of [before, after].filter(Boolean))
    for (const name of files(namespace).keys()) allowed.add(path.join(resource.root, name));
  return true;
}
export function comparePortableRestorationTransitionCore(input = {}) {
  const result = (status) =>
    Object.freeze({
      verified: false,
      status,
      outstandingObligations: Object.freeze(
        status === 'unknown'
          ? [{ name: 'reconciliation-generation-changed', outcome: 'retained-unproved' }]
          : []
      ),
    });
  try {
    if (
      !exact(input, ['before', 'after', 'registration', 'stage', 'protocolState', 'resources']) ||
      !validBrokerRegistrationRecordCore(input.registration) ||
      !['created', 'start', 'suspend', 'close'].includes(input.stage) ||
      !Array.isArray(input.resources) ||
      input.resources.length > 64 ||
      !PROTOCOL_STATES.includes(input.protocolState) ||
      canonicalProjection(input.before.project) !== canonicalProjection(input.after.project) ||
      input.before.project.physicalRoot !== input.registration.project_root ||
      input.before.project.digest !== input.registration.project_digest
    )
      return result('unknown');
    const left = namespaceMap(input.before),
      right = namespaceMap(input.after);
    const allowed = new Set();
    const resources = new Map();
    for (const resource of input.resources) {
      if (
        !exact(resource, [
          'verified',
          'released',
          'concurrent',
          'resourceDigest',
          'record',
          'root',
        ]) ||
        resource.verified !== false ||
        typeof resource.released !== 'boolean' ||
        typeof resource.concurrent !== 'boolean'
      )
        return result('unknown');
      if (resource.concurrent) {
        if (resource.root !== null || resource.resourceDigest !== null || resource.record !== null)
          return result('unknown');
        continue;
      }
      if (
        !/^[a-f0-9]{64}$/u.test(resource.resourceDigest) ||
        typeof resource.root !== 'string' ||
        path.basename(resource.root) !== resource.resourceDigest ||
        resources.has(resource.root)
      )
        return result('unknown');
      resources.set(resource.root, resource);
      if (
        !resource.released &&
        !heldResourceNamespace(right.get(resource.root), resource, input.registration)
      )
        return result('unknown');
    }
    let changed = false;
    for (const root of new Set([...left.keys(), ...right.keys()])) {
      const before = left.get(root),
        after = right.get(root);
      if (sameNamespace(before, after)) continue;
      if (
        resources.has(root) &&
        resourceTransition(
          before,
          after,
          resources.get(root),
          input.registration,
          input.stage,
          allowed
        )
      ) {
        changed = true;
        continue;
      }
      if (
        ['suspend', 'close'].includes(input.stage) &&
        recoveryTransition(before, after, input.registration, input.protocolState)
      ) {
        changed = true;
        allowed.add(path.join(root, input.registration.review_id + '.json'));
        continue;
      }
      return result('unknown');
    }
    if (!sameContainers(input.before, input.after, allowed)) return result('unknown');
    return result(changed ? 'transition' : 'unchanged');
  } catch {
    return result('unknown');
  }
}
