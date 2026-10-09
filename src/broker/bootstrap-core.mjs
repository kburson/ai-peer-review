import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// @story #189
// Immutable protocol data; parsing never grants operational producer membership.
import path from 'node:path';
import { AprError } from '../errors.mjs';
const exact = (value, keys) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).sort().join(',') === keys.slice().sort().join(',');
const absolute = (value) =>
  typeof value === 'string' && (path.posix.isAbsolute(value) || path.win32.isAbsolute(value));
const digest = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
const positive = (value) => Number.isSafeInteger(value) && value > 0;
function fail() {
  throw new AprError('APR_BROKER_START_FAILED', 'Broker bootstrap is malformed.', {
    recovery: 'Create a fresh bootstrap through the current selected package.',
  });
}
function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
export function parseBrokerBootstrapCore(bytes) {
  let value;
  try {
    if (
      !(typeof bytes === 'string' || Buffer.isBuffer(bytes)) ||
      Buffer.byteLength(bytes) > 1048576
    )
      fail();
    value = JSON.parse(
      typeof bytes === 'string' ? bytes : new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    );
  } catch {
    fail();
  }
  const current = value?.schema === 'ai-peer-review.broker-bootstrap/v2';
  if (
    !['ai-peer-review.broker-bootstrap/v1', 'ai-peer-review.broker-bootstrap/v2'].includes(
      value?.schema
    ) ||
    !exact(value, [
      'schema',
      'project',
      'runtimeImage',
      'versions',
      ...(current ? ['execution'] : []),
    ]) ||
    (current &&
      (!exact(value.execution, ['package_root', 'node_executable', 'package_digest']) ||
        !absolute(value.execution.package_root) ||
        !absolute(value.execution.node_executable) ||
        !digest(value.execution.package_digest))) ||
    !exact(value.project, ['digest', 'physicalRoot', 'tuple']) ||
    !digest(value.project.digest) ||
    !absolute(value.project.physicalRoot) ||
    !Array.isArray(value.project.tuple) ||
    value.project.tuple.length !== 4 ||
    !exact(value.runtimeImage, ['root', 'nodeExecutable', 'digest']) ||
    !absolute(value.runtimeImage.root) ||
    !absolute(value.runtimeImage.nodeExecutable) ||
    typeof value.runtimeImage.digest !== 'string' ||
    !/^sha256:[a-f0-9]{64}$/u.test(value.runtimeImage.digest) ||
    !exact(value.versions, ['package_version', 'broker_protocol_version', 'node_major']) ||
    typeof value.versions.package_version !== 'string' ||
    !value.versions.package_version ||
    !positive(value.versions.broker_protocol_version) ||
    !positive(value.versions.node_major)
  )
    fail();
  return freeze(value);
}

export function bootstrapRecord({ project, versions, runtimeImage }) {
  const root = realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
  return parseBrokerBootstrapCore(
    JSON.stringify({
      schema: 'ai-peer-review.broker-bootstrap/v2',
      project: { digest: project.digest, physicalRoot: project.physicalRoot, tuple: project.tuple },
      versions,
      runtimeImage,
      execution: {
        package_root: root,
        node_executable: realpathSync(process.execPath),
        package_digest: createHash('sha256')
          .update(readFileSync(path.join(root, 'package.json')))
          .digest('hex'),
      },
    })
  );
}
