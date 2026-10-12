// @story #209
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { AprError } from '../errors.mjs';
import {
  assertCollateralCompatible,
  readRuntimeCompatibility,
  inspectUnsupportedReview,
} from './compatibility-read.mjs';
import { reduceEvents } from './reducer.mjs';
function authorityError(code, message, recovery, details = {}, cause = null) {
  const error = new AprError(code, message, { recovery, details });
  if (cause) error.cause = cause;
  return error;
}

export function readAuthority(workspace) {
  const file = path.join(workspace, 'events.jsonl');
  let bytes;
  try {
    bytes = readFileSync(file, 'utf8');
  } catch (cause) {
    throw authorityError(
      'APR_EVENT_LOG_MISSING',
      'The authoritative event log cannot be read.',
      'Restore the review workspace events.jsonl file and retry recovery.',
      { file },
      cause
    );
  }
  if (!bytes || !bytes.endsWith('\n')) {
    throw authorityError(
      'APR_EVENT_LOG_CORRUPT',
      'The authoritative event log is empty or ends with a torn record.',
      'Restore events.jsonl from its last complete newline-terminated record.',
      { file }
    );
  }
  const records = bytes.slice(0, -1).split('\n');
  if (records.some((record) => !record)) {
    throw authorityError(
      'APR_EVENT_LOG_CORRUPT',
      'The authoritative event log contains a blank record.',
      'Remove only the invalid blank record after preserving and inspecting the original bytes.',
      { file }
    );
  }
  let events;
  try {
    events = records.map((record) => JSON.parse(record));
  } catch (cause) {
    throw authorityError(
      'APR_EVENT_LOG_CORRUPT',
      'The authoritative event log contains invalid JSON.',
      'Restore events.jsonl from its last complete valid record.',
      { file },
      cause
    );
  }
  try {
    assertCollateralCompatible({
      manifest: readRuntimeCompatibility(),
      operation: 'read',
      metadata: events.flatMap((event) => [
        { contract: 'event', schema: event?.schema },
        ...(event?.payload?.startup?.context
          ? [{ contract: 'context', schema: event.payload.startup.context.schema }]
          : []),
        ...(event?.payload?.startup?.runtime
          ? [{ contract: 'runtime', schema: event.payload.startup.runtime.schema }]
          : []),
      ]),
    });
    return { events, state: reduceEvents(events), file, bytes };
  } catch (cause) {
    if (cause?.code === 'APR_REVIEW_RUNTIME_UNSUPPORTED') {
      const diagnostic = inspectUnsupportedReview({ workspace });
      throw new AprError(cause.code, cause.message, {
        recovery: cause.recovery,
        details: {
          ...cause.details,
          workspace: diagnostic.workspace,
          schemas: diagnostic.schemas,
        },
      });
    }
    if (cause instanceof AprError) throw cause;
    throw authorityError(
      'APR_EVENT_LOG_CORRUPT',
      'The authoritative event log cannot be reduced.',
      'Inspect the event sequence and restore the last valid authority.',
      { file },
      cause
    );
  }
}

export function inspectReview(workspace) {
  return readAuthority(workspace).state;
}

export function inspectReviewAuthority(workspace) {
  const { events, state } = readAuthority(workspace);
  return Object.freeze({ events: Object.freeze([...events]), state });
}
