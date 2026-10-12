// @story #209
// Unverified comparison only. Operational acceptance requires genuine inventory and worker receipts.
import path from 'node:path';
import { canonicalProjection } from '../protocol/canonical-projection.mjs';
import { PROTOCOL_STATES } from '../protocol/format-authority.mjs';
import { validBrokerRegistrationRecordCore } from './registration-record.mjs';
const exact = (value, keys) =>
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).sort().join(',') === [...keys].sort().join(',');
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
    if (!right.get(oldName)?.bytes.equals(file.bytes)) return false;
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
      input.resources.length ||
      !PROTOCOL_STATES.includes(input.protocolState) ||
      canonicalProjection(input.before.project) !== canonicalProjection(input.after.project) ||
      input.before.project.physicalRoot !== input.registration.project_root ||
      input.before.project.digest !== input.registration.project_digest
    )
      return result('unknown');
    const left = namespaceMap(input.before),
      right = namespaceMap(input.after);
    let changed = false;
    for (const root of new Set([...left.keys(), ...right.keys()])) {
      const before = left.get(root),
        after = right.get(root);
      if (sameNamespace(before, after)) continue;
      if (
        ['suspend', 'close'].includes(input.stage) &&
        recoveryTransition(before, after, input.registration, input.protocolState)
      ) {
        changed = true;
        continue;
      }
      return result('unknown');
    }
    return result(changed ? 'transition' : 'unchanged');
  } catch {
    return result('unknown');
  }
}
