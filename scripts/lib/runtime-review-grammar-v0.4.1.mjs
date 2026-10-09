// @story #144
// Checker-owned producer profile. Selectors never choose executable code.
import { createHash } from 'node:crypto';
import path from 'node:path';
import { inspectRecordLineage } from './review-grammar-v0.4.1/record-lineage.mjs';
import { reduceEvents } from './review-grammar-v0.4.1/reducer.mjs';
export const RUNTIME_REVIEW_PRODUCER_VERSION = '0.4.1';
export const RUNTIME_REVIEW_PRODUCER_SOURCES = Object.freeze({
  'src/protocol/compatibility.mjs':
    'c640c542218c1719f78ab908fde3cbc36b472f13b31281c06d30052b1d9ef140',
  'src/protocol/events.mjs': '52659c85759d1b31e666f761800c9c4120d2b4178cf4bc96ef5c8cdf20c2cda1',
  'src/protocol/reducer.mjs': 'd8f77b9fc875601335abf4a1611fe5e3ea0240648dca86476c3248621a57bf72',
  'src/protocol/record-lineage.mjs':
    '9dc3e0be355b48aecb5414a3959b5f42c2869a7889335ed76f97c60a96cb2776',
  'src/startup/runtime.mjs': 'e8392c8bfc6db40605d1efcc6d47d1793a127d390e99cbe16ae207c9ef83810f',
  'src/manifest/render.mjs': '88e0eac256021aa03baffa4392a069ef4ca1d7f4abf273ed7c312224acaef728',
  'schemas/runtime-v1.json': '9a4f51b04cbf621ffcce841054ab434b3d7c9acc89f8010913f170d133f2ff37',
  'schemas/manifest-v1.json': 'a4e7843b9c2ff811cabe753b77f0682ec0b1283ff708e003ac11b836f60c63a7',
});
export function reduceRuntimeReviewEvents(events, producerVersion) {
  if (producerVersion !== RUNTIME_REVIEW_PRODUCER_VERSION)
    throw Error('producer-profile-unsupported');
  return reduceEvents(events);
}

export function inspectRuntimeReviewLineage(workspaces, producerVersion) {
  if (producerVersion !== RUNTIME_REVIEW_PRODUCER_VERSION)
    throw Error('producer-profile-unsupported');
  if (!Array.isArray(workspaces)) throw Error('persisted-workspaces-required');
  return inspectRecordLineage(workspaces);
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])])
    );
  return value;
}
const canonicalBytes = (value) => JSON.stringify(canonical(value), null, 2) + '\n';
const sha = (value) => createHash('sha256').update(value).digest('hex');
const exact = (value, fields) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).sort().join('|') === [...fields].sort().join('|');
export function assertRuntimeReviewStartupBinding({
  journal,
  registration,
  initialEvent,
  workspace,
} = {}) {
  const invalid = () => {
    throw Error('producer-startup-binding-invalid');
  };
  const runtime = journal?.runtime;
  const expectedRoot = initialEvent?.payload?.startup?.context?.repository_root;
  const expectedId = initialEvent?.review_id;
  if (
    !exact(journal, [
      'schema',
      'request_digest',
      'request',
      'workspace',
      'review_id',
      'runtime',
      'versions',
      'descriptor',
      'stage',
      'registration_file',
      ...(Object.hasOwn(journal ?? {}, 'created_at') ? ['created_at'] : []),
      ...(Object.hasOwn(journal ?? {}, 'provider_operation') ? ['provider_operation'] : []),
    ]) ||
    journal.schema !== 'ai-peer-review.startup-request/v1' ||
    journal.request_digest !== sha(canonicalBytes(journal.request)) ||
    canonicalBytes(journal.request) !== canonicalBytes(initialEvent?.payload) ||
    typeof expectedRoot !== 'string' ||
    !path.isAbsolute(expectedRoot) ||
    workspace !== path.join(expectedRoot, '.scratch', 'peer-review', expectedId ?? '') ||
    journal.workspace !== workspace ||
    journal.review_id !== expectedId ||
    canonicalBytes(journal.descriptor) !== canonicalBytes(journal.request?.startup?.runtime) ||
    !exact(journal.versions, ['package_version', 'broker_protocol_version', 'node_major']) ||
    journal.versions.package_version !== RUNTIME_REVIEW_PRODUCER_VERSION ||
    journal.versions.broker_protocol_version !== 1 ||
    !Number.isInteger(journal.versions.node_major) ||
    journal.versions.node_major <= 0 ||
    ![
      'reserved',
      'authority',
      'registered',
      'launch-pending',
      'outcome-unknown',
      'launched',
      'manual',
    ].includes(journal.stage) ||
    !exact(runtime, ['root', 'entrypoint', 'nodeExecutable', 'digest', 'files']) ||
    runtime.root !==
      path.join(expectedRoot, '.scratch', 'peer-review', 'runtimes', journal.request_digest) ||
    runtime.entrypoint !== path.join(runtime.root, 'package', 'bin', 'peer-review.mjs') ||
    runtime.nodeExecutable !==
      path.join(runtime.root, 'node', process.platform === 'win32' ? 'node.exe' : 'node') ||
    !/^sha256:[a-f0-9]{64}$/.test(runtime.digest ?? '') ||
    !Array.isArray(runtime.files) ||
    journal.registration_file !==
      path.join(
        expectedRoot,
        '.scratch',
        'peer-review',
        'broker',
        'registrations',
        expectedId + '.json'
      ) ||
    !exact(registration, [
      'schema',
      'review_id',
      'project_digest',
      'project_root',
      'workspace',
      'request_digest',
      'runtime',
      'created_at',
    ]) ||
    registration.schema !== 'ai-peer-review.broker-registration/v1' ||
    registration.review_id !== expectedId ||
    registration.workspace !== workspace ||
    registration.project_root !== expectedRoot ||
    registration.project_digest !== journal.descriptor?.project_root_digest ||
    registration.request_digest !== journal.request_digest ||
    !exact(registration.runtime, ['root', 'entrypoint', 'nodeExecutable', 'digest']) ||
    ['root', 'entrypoint', 'nodeExecutable', 'digest'].some(
      (key) => registration.runtime[key] !== runtime[key]
    )
  )
    invalid();
  if (Object.hasOwn(journal, 'created_at') && !Number.isFinite(Date.parse(journal.created_at)))
    invalid();
  if (!Number.isFinite(Date.parse(registration.created_at))) invalid();
  if (journal.provider_operation !== undefined) {
    const op = journal.provider_operation;
    if (
      !exact(op, ['intent_digest', 'operation_id', 'session_fingerprint', 'status']) ||
      !/^launch:[a-f0-9]{64}$/.test(op.operation_id ?? '') ||
      !/^sha256:[a-f0-9]{64}$/.test(op.intent_digest ?? '') ||
      !['reserved', 'acknowledged', 'not-submitted', 'outcome-unknown'].includes(op.status) ||
      (op.session_fingerprint !== null &&
        !/^sha256:[a-f0-9]{64}$/.test(op.session_fingerprint ?? ''))
    )
      invalid();
  }
  return true;
}
