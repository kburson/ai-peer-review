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

test('event schema closes every event payload and nested object contract', () => {
  const schema = JSON.parse(readFileSync(new URL('../../schemas/event-v1.json', import.meta.url)));
  const schemaTypes = schema.oneOf.map((branch) => branch.properties.type.const);
  assert.deepEqual(schemaTypes.sort(), [...EVENT_TYPES].sort());
  assert.equal(schema.properties.actor.anyOf[1].$ref, '#/$defs/digest');
  for (const [name, definition] of Object.entries(schema.$defs)) {
    if (definition.type === 'object') {
      assert.equal(definition.additionalProperties, false, name);
    }
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

test('rejects malformed nested payload values with one stable error code', () => {
  const cases = [
    event('review-created', { payload: { max_turns: 'unbounded' } }),
    event('reviewer-accepted', { payload: { turn: Number.MAX_SAFE_INTEGER + 1 } }),
    event('turn-claimed', { payload: { claim: null } }),
    event('turn-claimed', {
      payload: { claim: { ...event('turn-claimed').payload.claim, unexpected: true } },
    }),
    event('reviewer-joined', {
      payload: {
        reviewer: { ...event('reviewer-joined').payload.reviewer, identity_source: 'guessed' },
      },
    }),
    event('delivery-written', {
      payload: {
        delivery: { delivery_id: '../escape', recipient: 'reviewer', digest: 'not-a-digest' },
      },
    }),
  ];

  for (const invalid of cases) {
    assert.throws(
      () => validateEvent(invalid),
      (error) => error.code === 'APR_EVENT_INVALID'
    );
  }
});
