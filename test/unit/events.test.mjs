import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import { EVENT_TYPES, validateEvent } from '../../src/protocol/events.mjs';
import { event } from '../helpers/review-fixture.mjs';

test('schema artifacts identify the three closed v1 projections', () => {
  for (const [file, id] of [
    ['schemas/event-v1.json', 'ai-peer-review.event/v1'],
    ['schemas/protocol-v1.json', 'ai-peer-review.protocol/v1'],
    ['schemas/participants-v1.json', 'ai-peer-review.participants/v1'],
  ]) {
    const schema = JSON.parse(readFileSync(new URL(`../../${file}`, import.meta.url)));
    assert.equal(schema.$id, id);
    assert.equal(schema.additionalProperties, false);
  }
});

test('accepts every closed event type with its canonical payload', () => {
  for (const type of EVENT_TYPES) assert.equal(validateEvent(event(type)), true, type);
});

test('rejects unknown event fields, types, and payload fields', () => {
  const valid = event('review-created');
  for (const invalid of [
    { ...valid, extra: true },
    { ...valid, type: 'future-event' },
    { ...valid, payload: { ...valid.payload, unexpected: true } },
  ]) {
    assert.throws(
      () => validateEvent(invalid),
      (error) => error.code === 'APR_EVENT_INVALID'
    );
  }
});

test('rejects malformed envelope identifiers, integers, actors, and times', () => {
  const valid = event('review-created');
  for (const patch of [
    { review_id: '../escape' },
    { sequence: 0 },
    { revision: -1 },
    { actor: '' },
    { at: 'tomorrow' },
  ]) {
    assert.throws(
      () => validateEvent({ ...valid, ...patch }),
      (error) => error.code === 'APR_EVENT_INVALID'
    );
  }
});
