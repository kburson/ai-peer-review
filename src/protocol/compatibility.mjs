import packageJson from '../../package.json' with { type: 'json' };

import { AprError } from '../errors.mjs';

export const EVENT_V1_SCHEMA = 'ai-peer-review.event/v1';
export const EVENT_V2_SCHEMA = 'ai-peer-review.event/v2';

export function currentCompatibility() {
  return Object.freeze({
    minimum_reader_version: packageJson.version,
    minimum_writer_version: packageJson.version,
    accepted_event_schemas: Object.freeze([EVENT_V1_SCHEMA, EVENT_V2_SCHEMA]),
  });
}

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

function atLeast(actual, minimum) {
  const left = parseVersion(actual);
  const right = parseVersion(minimum);
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index];
  }
  return true;
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

export function assertReaderWriterCompatibility(
  compatibility,
  { readerVersion = packageJson.version, writerVersion = packageJson.version } = {}
) {
  validateCompatibility(compatibility);
  if (!atLeast(readerVersion, compatibility.minimum_reader_version)) {
    throw compatibilityError(
      'APR_READER_UPGRADE_REQUIRED',
      'This review requires a newer peer-review reader.',
      { actual: readerVersion, minimum: compatibility.minimum_reader_version }
    );
  }
  if (!atLeast(writerVersion, compatibility.minimum_writer_version)) {
    throw compatibilityError(
      'APR_WRITER_UPGRADE_REQUIRED',
      'This review requires a newer peer-review writer.',
      { actual: writerVersion, minimum: compatibility.minimum_writer_version }
    );
  }
  return true;
}

export function assertReaderCompatibility(
  compatibility,
  { readerVersion = packageJson.version } = {}
) {
  validateCompatibility(compatibility);
  if (!atLeast(readerVersion, compatibility.minimum_reader_version)) {
    throw compatibilityError(
      'APR_READER_UPGRADE_REQUIRED',
      'This review requires a newer peer-review reader.',
      { actual: readerVersion, minimum: compatibility.minimum_reader_version }
    );
  }
  return true;
}

export function compatibilityDeclared(state, compatibility, { at } = {}) {
  validateCompatibility(compatibility);
  const sequence = state.sequence + 1;
  return {
    schema: EVENT_V2_SCHEMA,
    review_id: state.review_id,
    sequence,
    revision: state.revision,
    type: 'compatibility-declared',
    actor: 'system',
    at: at ?? new Date().toISOString(),
    payload: { compatibility },
  };
}
