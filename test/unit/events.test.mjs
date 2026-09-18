import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EVENT_TYPES,
  eventAdvancesRevision,
  validateEvent,
  validateVersionedEvent,
} from '../../src/protocol/events.mjs';
import { event, v2Event } from '../helpers/review-fixture.mjs';

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

test('event-v2 compatibility artifacts are closed and independently versioned', () => {
  for (const [file, id] of [
    ['schemas/event-v2.json', 'ai-peer-review.event/v2'],
    ['schemas/protocol-v2.json', 'ai-peer-review.protocol/v2'],
    ['schemas/participants-v2.json', 'ai-peer-review.participants/v2'],
  ]) {
    const schema = JSON.parse(readFileSync(new URL(`../../${file}`, import.meta.url)));
    assert.equal(schema.$id, id);
    assert.equal(schema.additionalProperties, false);
  }
});

test('v2 schema artifacts define the evidence-bearing participant contract', () => {
  for (const file of ['schemas/event-v2.json', 'schemas/participants-v2.json']) {
    const schema = JSON.parse(readFileSync(new URL(`../../${file}`, import.meta.url)));
    assert.equal(schema.$defs.participant.required.includes('evidence'), true, file);
    assert.deepEqual(schema.$defs.evidence.required, ['session', 'model'], file);
    const observationRule = schema.$defs.modelEvidence.allOf[0];
    assert.equal(
      observationRule.if.properties.source.const,
      'provider-result',
      `${file} provider source`
    );
    assert.equal(
      observationRule.then.properties.observed_id.type,
      'string',
      `${file} observed model`
    );
    assert.equal(observationRule.else.properties.observed_id.const, null, `${file} declared model`);
  }
});

test('versioned validation selects the envelope schema and names a reader upgrade for unknown events', () => {
  assert.equal(validateVersionedEvent(event('review-created')), true);
  assert.equal(validateVersionedEvent(v2Event('compatibility-declared')), true);
  assert.throws(
    () =>
      validateVersionedEvent({ ...event('review-created'), schema: 'ai-peer-review.event/v99' }),
    (error) => error.code === 'APR_READER_UPGRADE_REQUIRED'
  );
});

test('lock-reclaimed is a closed sequence-only v2 event and remains unavailable to v1 writers', () => {
  const reclaimed = v2Event('lock-reclaimed', {
    actor: 'system',
    sequence: 3,
    revision: 1,
  });
  assert.equal(validateVersionedEvent(reclaimed), true);
  assert.equal(eventAdvancesRevision('lock-reclaimed'), false);
  assert.throws(
    () => validateEvent({ ...reclaimed, schema: 'ai-peer-review.event/v1' }),
    (error) => error.code === 'APR_EVENT_INVALID'
  );
  assert.throws(
    () => validateVersionedEvent({ ...reclaimed, actor: `sha256:${'a'.repeat(64)}` }),
    (error) => error.code === 'APR_EVENT_INVALID'
  );
});

test('v2 participant events require exact provenance evidence while v1 remains frozen', () => {
  const v2 = v2Event('reviewer-joined');
  v2.payload.reviewer.evidence = {
    session: {
      fingerprint: v2.payload.reviewer.session_fingerprint,
      source: 'provider-result',
      assurance: 'observed',
    },
    model: {
      requested_id: null,
      declared_id: 'gpt-test',
      observed_id: 'gpt-test',
      source: 'provider-result',
      assurance: 'observed',
      conflict: false,
    },
  };

  assert.equal(validateVersionedEvent(v2), true);
  const mislabeled = structuredClone(v2);
  mislabeled.payload.reviewer.evidence.session.assurance = 'declared';
  assert.throws(
    () => validateVersionedEvent(mislabeled),
    (error) => error.code === 'APR_EVENT_INVALID'
  );
  const incompleteObservation = structuredClone(v2);
  incompleteObservation.payload.reviewer.evidence.model.observed_id = null;
  incompleteObservation.payload.reviewer.evidence.model.conflict = false;
  assert.throws(
    () => validateVersionedEvent(incompleteObservation),
    (error) => error.code === 'APR_EVENT_INVALID'
  );
  const emptyObservation = structuredClone(v2);
  emptyObservation.payload.reviewer.evidence.model.observed_id = '';
  emptyObservation.payload.reviewer.evidence.model.conflict = false;
  assert.throws(
    () => validateVersionedEvent(emptyObservation),
    (error) =>
      error.code === 'APR_EVENT_INVALID' &&
      error.details.reason === 'reviewer-joined reviewer model observation'
  );
  const inventedObservation = structuredClone(v2);
  inventedObservation.payload.reviewer.evidence.model.source = 'environment-declaration';
  inventedObservation.payload.reviewer.evidence.model.assurance = 'declared';
  inventedObservation.payload.reviewer.evidence.model.declared_id = null;
  inventedObservation.payload.reviewer.evidence.model.conflict = false;
  assert.throws(
    () => validateVersionedEvent(inventedObservation),
    (error) => error.code === 'APR_EVENT_INVALID'
  );
  assert.throws(
    () => validateEvent({ ...v2, schema: 'ai-peer-review.event/v1' }),
    (error) => error.code === 'APR_EVENT_INVALID'
  );
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
  assert.equal(EVENT_TYPES.includes('superseded'), true);
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

test('rejects prototype-key event types with the stable event error', () => {
  for (const type of ['toString', 'constructor', '__proto__']) {
    assert.throws(
      () => validateEvent({ ...event('review-created'), type }),
      (error) => error.code === 'APR_EVENT_INVALID'
    );
    assert.throws(
      () => eventAdvancesRevision(type),
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
    { at: '2026-02-30T12:00:00.000Z' },
  ]) {
    assert.throws(
      () => validateEvent({ ...valid, ...patch }),
      (error) => error.code === 'APR_EVENT_INVALID'
    );
  }
  assert.equal(validateEvent({ ...valid, at: '2028-02-29T12:00:00Z' }), true);
});

test('rejects malformed nested payload values with one stable error code', () => {
  const noCommit = event('review-created');
  noCommit.payload.commit_mode = 'no-commit';
  noCommit.payload.startup.no_commit_baseline = {
    head: '1'.repeat(40),
    index_digest: `sha256:${'2'.repeat(64)}`,
    worktree_digest: `sha256:${'3'.repeat(64)}`,
    changed_paths: [],
  };
  const cases = [
    event('review-created', { payload: { max_turns: 'unbounded' } }),
    event('review-created', {
      payload: {
        startup: {
          ...event('review-created').payload.startup,
          no_commit_baseline: noCommit.payload.startup.no_commit_baseline,
        },
      },
    }),
    event('review-created', {
      payload: {
        authority: {
          authority_policy: 'detection-allowed',
          challenge_ttl_ms: 15 * 60 * 1000,
          verifier: {
            kind: 'ed25519',
            verifier_id: 'test:fixture-a',
            verifier_fingerprint: `sha256:${'4'.repeat(64)}`,
            public_key: 'test key',
            assurance_grade: 'test-fixture',
            signer_strength: 'unverified-test',
          },
        },
      },
    }),
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

test('no-commit handoff events bind the canonical snapshot path and artifact digest', () => {
  for (const type of [
    'author-revision-sealed-no-commit',
    'author-closing-round-sealed-no-commit',
  ]) {
    const valid = event(type);
    valid.payload.snapshot.digest = valid.payload.artifact.digest;
    assert.equal(validateEvent(valid), true);
    for (const snapshot of [
      { ...valid.payload.snapshot, path: `artifacts/turn-${valid.payload.turn + 1}.md` },
      { ...valid.payload.snapshot, digest: `sha256:${'f'.repeat(64)}` },
    ]) {
      assert.throws(
        () => validateEvent({ ...valid, payload: { ...valid.payload, snapshot } }),
        (error) => error.code === 'APR_EVENT_INVALID'
      );
    }
  }
});
