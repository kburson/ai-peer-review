import {
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { AprError } from '../errors.mjs';
import { validateEvent } from './events.mjs';
import { reduceEvents } from './reducer.mjs';
import { atomicCreate, atomicWrite, withReviewLock } from './store.mjs';

function ordered(value) {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, ordered(value[key])])
    );
  }
  return value;
}

export function canonicalProjection(value) {
  return `${JSON.stringify(ordered(value), null, 2)}\n`;
}

function appendLockedEvent(file, priorBytes, event) {
  const record = Buffer.from(`${JSON.stringify(ordered(event))}\n`, 'utf8');
  atomicWrite(file, Buffer.concat([Buffer.from(priorBytes, 'utf8'), record]));
}

function authorityError(code, message, recovery, details = {}, cause = null) {
  const error = new AprError(code, message, { recovery, details });
  if (cause) error.cause = cause;
  return error;
}

function readAuthority(workspace) {
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
    return { events, state: reduceEvents(events), file, bytes };
  } catch (cause) {
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

function ensureProjection(file, value) {
  const expected = canonicalProjection(value);
  let current = null;
  try {
    if (existsSync(file)) current = readFileSync(file, 'utf8');
  } catch {
    current = null;
  }
  if (current !== expected) atomicWrite(file, Buffer.from(expected));
}

function deliveryReceiptFile(workspace, delivery) {
  if (
    !delivery ||
    typeof delivery.delivery_id !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(delivery.delivery_id)
  ) {
    throw authorityError(
      'APR_DELIVERY_INVALID',
      'Delivery authority has an invalid delivery ID.',
      'Repair the delivery event through the documented recovery flow.'
    );
  }
  return path.join(workspace, 'deliveries', `${delivery.delivery_id}.json`);
}

export function writeDeliveryReceiptExclusive(file, delivery) {
  const expected = Buffer.from(canonicalProjection(delivery));
  const directory = path.dirname(file);
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  let descriptor = null;
  let phase = 'setup';
  try {
    mkdirSync(directory, { recursive: true });
    phase = 'temporary';
    descriptor = openSync(temporary, 'wx', 0o600);
    writeFileSync(descriptor, expected);
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = null;
    phase = 'target';
    linkSync(temporary, file);
    phase = 'durability';
    unlinkSync(temporary);
    let directoryDescriptor = null;
    try {
      directoryDescriptor = openSync(directory, 'r');
      fsyncSync(directoryDescriptor);
    } catch (cause) {
      const unsupported = new Set(['EINVAL', 'EISDIR', 'ENOTSUP', 'EOPNOTSUPP', 'EPERM']);
      if (!unsupported.has(cause?.code)) throw cause;
    } finally {
      if (directoryDescriptor !== null) closeSync(directoryDescriptor);
    }
  } catch (cause) {
    if (descriptor !== null) {
      try {
        closeSync(descriptor);
      } catch {}
    }
    if (existsSync(temporary)) {
      try {
        unlinkSync(temporary);
      } catch {}
    }
    if (cause?.code === 'EEXIST' && phase === 'target') {
      throw authorityError(
        'APR_DELIVERY_CONFLICT',
        'A delivery receipt was created concurrently.',
        `Preserve ${file}, inspect the collision, and run explicit recovery.`,
        { file },
        cause
      );
    }
    throw authorityError(
      'APR_DELIVERY_WRITE_FAILED',
      'A delivery receipt could not be created durably.',
      `Inspect ${directory} and retry recovery after correcting the filesystem failure.`,
      { file },
      cause
    );
  }
}

function ensureDeliveryReceipts(workspace, state, { write = true } = {}) {
  for (const delivery of state.protocol.deliveries) {
    const file = deliveryReceiptFile(workspace, delivery);
    const expected = canonicalProjection(delivery);
    if (existsSync(file)) {
      let current;
      try {
        current = readFileSync(file, 'utf8');
      } catch (cause) {
        throw authorityError(
          'APR_DELIVERY_CONFLICT',
          'A delivery receipt cannot be verified.',
          `Inspect ${file} and restore the event-derived receipt.`,
          { file },
          cause
        );
      }
      if (current !== expected) {
        throw authorityError(
          'APR_DELIVERY_CONFLICT',
          'A delivery receipt conflicts with event authority.',
          `Preserve ${file}, inspect the collision, and run explicit recovery.`,
          { file }
        );
      }
    } else if (write) {
      writeDeliveryReceiptExclusive(file, delivery);
    }
  }
}

function writeProjections(workspace, state) {
  ensureProjection(path.join(workspace, 'protocol.json'), state.protocol);
  ensureProjection(path.join(workspace, 'participants.json'), state.participants);
}

function assertExpected(state, expected) {
  if (!expected || typeof expected !== 'object') {
    throw authorityError(
      'APR_STALE_REVIEW',
      'Expected review authority is required.',
      'Read current status and retry with its exact review, revision, sequence, and actor.'
    );
  }
  const actual = {
    reviewId: state.protocol.review_id,
    revision: state.protocol.revision,
    sequence: state.protocol.sequence,
    actor: state.protocol.current_actor,
  };
  if (
    actual.reviewId !== expected.reviewId ||
    actual.revision !== expected.revision ||
    actual.sequence !== expected.sequence ||
    actual.actor !== expected.actor
  ) {
    throw authorityError(
      'APR_STALE_REVIEW',
      'Expected review authority no longer matches events.',
      'Read current status and retry from the exact reported authority.',
      { expected, actual }
    );
  }
}

export async function readReview(workspace) {
  return withReviewLock(workspace, async () => {
    const { state } = readAuthority(workspace);
    ensureDeliveryReceipts(workspace, state);
    writeProjections(workspace, state);
    return state;
  });
}

export async function repairReview(workspace, expected, repair = () => {}) {
  const preflight = readAuthority(workspace).state;
  assertExpected(preflight, expected);
  if (typeof repair !== 'function') {
    throw authorityError(
      'APR_EVENT_INVALID',
      'Review repair requires a repair function.',
      'Provide the exact event-authorized repair operation.'
    );
  }
  return withReviewLock(workspace, async () => {
    const { state } = readAuthority(workspace);
    assertExpected(state, expected);
    ensureDeliveryReceipts(workspace, state);
    writeProjections(workspace, state);
    await repair(state);
    return state;
  });
}

export function inspectReview(workspace) {
  return readAuthority(workspace).state;
}

export async function initializeReview(workspace, event) {
  validateEvent(event);
  if (event.type !== 'review-created' || event.sequence !== 1 || event.revision !== 1) {
    throw authorityError(
      'APR_EVENT_INVALID',
      'Initial review authority must be one review-created event.',
      'Recreate startup from complete preflight authority.'
    );
  }
  return withReviewLock(workspace, async () => {
    const file = path.join(workspace, 'events.jsonl');
    if (existsSync(file)) {
      throw authorityError(
        'APR_OUTPUT_COLLISION',
        'A review event log already occupies the requested workspace.',
        `Preserve ${file}, inspect the existing review, and choose explicit recovery.`,
        { file }
      );
    }
    const state = reduceEvents([event]);
    atomicCreate(file, Buffer.from(`${JSON.stringify(ordered(event))}\n`, 'utf8'));
    writeProjections(workspace, state);
    return state;
  });
}

export async function mutateReview(workspace, expected, createEvent) {
  const preflight = readAuthority(workspace).state;
  assertExpected(preflight, expected);
  if (typeof createEvent !== 'function') {
    throw authorityError(
      'APR_EVENT_INVALID',
      'Review mutation requires an event factory.',
      'Provide a function that creates one event from the locked current state.'
    );
  }

  return withReviewLock(workspace, async () => {
    const { events, state: current, file, bytes } = readAuthority(workspace);
    assertExpected(current, expected);
    const nextEvent = await createEvent(current);
    validateEvent(nextEvent);
    const next = reduceEvents([...events, nextEvent]);
    ensureDeliveryReceipts(workspace, next, { write: false });
    appendLockedEvent(file, bytes, nextEvent);
    writeProjections(workspace, next);
    ensureDeliveryReceipts(workspace, next);
    return next;
  });
}
