// @story #209
import { lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { readBoundedOrdinaryFile } from '../startup/runtime-inventory.mjs';
import { AprError } from '../errors.mjs';
import { RUNTIME_COMPATIBILITY, SUPPORTED_FORMATS } from './format-authority.mjs';
export const EVENT_V1_SCHEMA = 'ai-peer-review.event/v1';
export const EVENT_V2_SCHEMA = 'ai-peer-review.event/v2';

function compatibilityError(code, message, details = {}) {
  return new AprError(code, message, {
    recovery: 'Install a peer-review package version compatible with the sealed event authority.',
    details,
  });
}

function parseVersion(version) {
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
    throw compatibilityError(
      'APR_EVENT_INVALID',
      'Compatibility versions must be stable semver values.',
      {
        version,
      }
    );
  }
  return version.split('.').map(Number);
}

export function validateCompatibility(compatibility) {
  if (!compatibility || typeof compatibility !== 'object' || Array.isArray(compatibility)) {
    throw compatibilityError('APR_EVENT_INVALID', 'Compatibility authority must be an object.');
  }
  const expected = ['accepted_event_schemas', 'minimum_reader_version', 'minimum_writer_version'];
  const actual = Object.keys(compatibility).sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw compatibilityError(
      'APR_EVENT_INVALID',
      'Compatibility authority has unexpected fields.',
      {
        actual,
        expected,
      }
    );
  }
  parseVersion(compatibility.minimum_reader_version);
  parseVersion(compatibility.minimum_writer_version);
  if (
    !Array.isArray(compatibility.accepted_event_schemas) ||
    compatibility.accepted_event_schemas.length !== 2 ||
    new Set(compatibility.accepted_event_schemas).size !==
      compatibility.accepted_event_schemas.length ||
    !compatibility.accepted_event_schemas.includes(EVENT_V1_SCHEMA) ||
    !compatibility.accepted_event_schemas.includes(EVENT_V2_SCHEMA)
  ) {
    throw compatibilityError(
      'APR_EVENT_INVALID',
      'Compatibility authority must seal both event schemas.'
    );
  }
  return true;
}

export function assertReaderWriterCompatibility(compatibility) {
  validateCompatibility(compatibility);
  assertCollateralCompatible({
    manifest: readRuntimeCompatibility(),
    operation: 'write',
    metadata: compatibility.accepted_event_schemas.map((schema) => ({ contract: 'event', schema })),
  });
  return true;
}

export function assertReaderCompatibility(compatibility) {
  validateCompatibility(compatibility);
  assertCollateralCompatible({
    manifest: readRuntimeCompatibility(),
    operation: 'read',
    metadata: compatibility.accepted_event_schemas.map((schema) => ({ contract: 'event', schema })),
  });
  return true;
}

function unsupported(message, details = {}) {
  return new AprError('APR_REVIEW_RUNTIME_UNSUPPORTED', message, {
    recovery:
      'Preserve this review read-only. Use the current selected global installation with explicitly supported collateral or start an independent review with distinct IDs and paths; never execute retained images.',
    details,
  });
}
function exactKeys(value, keys) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join(',') === [...keys].sort().join(',')
  );
}
export function validateRuntimeCompatibility(manifest) {
  const contracts = SUPPORTED_FORMATS;
  if (
    !exactKeys(manifest, ['schema', 'integration_contract', 'contracts']) ||
    manifest.schema !== 'ai-peer-review.runtime-compatibility/v1' ||
    manifest.integration_contract !== 'ai-peer-review.integration/v1' ||
    !exactKeys(manifest.contracts, Object.keys(contracts))
  )
    throw unsupported(
      'The packaged collateral compatibility manifest is incomplete or unsupported.'
    );
  for (const contract of Object.keys(contracts)) {
    const entry = manifest.contracts[contract];
    if (!exactKeys(entry, ['read', 'write']))
      throw unsupported('Collateral support must declare closed read/write sets.');
    for (const operation of ['read', 'write']) {
      const values = entry[operation];
      const supported = contracts[contract][operation];
      if (
        !Array.isArray(values) ||
        !values.length ||
        values.length > 16 ||
        new Set(values).size !== values.length ||
        values.some((value) => !supported.includes(value))
      )
        throw unsupported('Collateral support includes an unknown or invalid format.');
    }
  }
  return manifest;
}
function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
export function readRuntimeCompatibility() {
  return freeze(validateRuntimeCompatibility(RUNTIME_COMPATIBILITY));
}
export function assertCollateralCompatible({ manifest, operation, metadata } = {}) {
  validateRuntimeCompatibility(manifest);
  if (
    !['read', 'write'].includes(operation) ||
    !Array.isArray(metadata) ||
    !metadata.length ||
    metadata.length > 65536
  )
    throw unsupported(
      'Collateral admission requires a supported operation and explicit recorded formats.'
    );
  for (const record of metadata) {
    if (
      !exactKeys(record, ['contract', 'schema']) ||
      typeof record.contract !== 'string' ||
      typeof record.schema !== 'string' ||
      !Object.hasOwn(manifest.contracts, record.contract) ||
      !manifest.contracts[record.contract][operation].includes(record.schema)
    )
      throw unsupported('This review contains incompatible or unsupported collateral formats.', {
        schemas:
          typeof record?.schema === 'string' && /^[a-zA-Z0-9._/-]{1,128}$/.test(record.schema)
            ? [record.schema]
            : [],
      });
  }
}

export function inspectUnsupportedReview({ workspace } = {}) {
  const schemas = new Set();
  const reasons = new Set();
  let canonical;
  try {
    canonical = realpathSync(workspace);
    const stat = lstatSync(workspace);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('unsafe workspace');
    for (const name of [
      'events.jsonl',
      'protocol.json',
      'participants.json',
      'startup-request.json',
      'collateral-reservation.json',
    ]) {
      try {
        const bytes = readBoundedOrdinaryFile(path.join(canonical, name), 1048576).toString('utf8');
        const records = name.endsWith('.jsonl') ? bytes.split('\n').slice(0, 128) : [bytes];
        for (const record of records) {
          if (!record) continue;
          try {
            const value = JSON.parse(record);
            // Read declared identifiers only; never reduce these records or infer state.
            for (const metadata of [
              value,
              value?.payload?.startup?.context,
              value?.payload?.startup?.runtime,
              value?.request?.startup?.context,
              value?.request?.startup?.runtime,
            ]) {
              if (
                typeof metadata?.schema === 'string' &&
                /^[a-zA-Z0-9._/-]{1,128}$/.test(metadata.schema) &&
                schemas.size < 32
              )
                schemas.add(metadata.schema);
            }
          } catch {
            reasons.add('unreadable-json');
          }
        }
      } catch (error) {
        if (error.code !== 'ENOENT') reasons.add('unreadable-or-unsafe-file');
      }
    }
  } catch {
    canonical = null;
    reasons.add('unavailable-or-unsafe-workspace');
  }
  return Object.freeze({
    code: 'APR_REVIEW_RUNTIME_UNSUPPORTED',
    workspace: canonical,
    schemas: Object.freeze([...schemas].sort()),
    reasons: Object.freeze([...reasons].sort()),
  });
}
