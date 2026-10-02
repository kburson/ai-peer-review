import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  assertReaderWriterCompatibility,
  compatibilityDeclared as createCompatibilityDeclaration,
  mutateReviewBatch,
} from '../helpers/internal-api.mjs';
import {
  compatibilityDeclared,
  createReviewWorkspace,
  event,
  FINGERPRINTS,
  participant,
  reviewerTurnEvents,
  v2Event,
} from '../helpers/review-fixture.mjs';
import { inspectReview, mutateReview } from '../helpers/protocol-api.mjs';
import { reduceEvents } from '../../src/protocol/reducer.mjs';

const COMPATIBILITY = Object.freeze({
  minimum_reader_version: '0.2.2',
  minimum_writer_version: '0.2.2',
  accepted_event_schemas: ['ai-peer-review.event/v1', 'ai-peer-review.event/v2'],
});

function expected(state) {
  return {
    reviewId: state.protocol.review_id,
    revision: state.protocol.revision,
    sequence: state.protocol.sequence,
    actor: state.protocol.current_actor,
  };
}

test('compatibility declarations default to the current time and accept an explicit timestamp', () => {
  const state = { sequence: 1, revision: 1, review_id: 'review-01' };
  const before = Date.now();
  const declaration = createCompatibilityDeclaration(state, COMPATIBILITY);
  const after = Date.now();
  assert.ok(Date.parse(declaration.at) >= before && Date.parse(declaration.at) <= after);
  assert.equal(
    createCompatibilityDeclaration(state, COMPATIBILITY, { at: '2026-09-08T12:00:02.000Z' }).at,
    '2026-09-08T12:00:02.000Z'
  );
});

test('mixed logs accept a v2 line only when its adjacent declaration seals it', () => {
  const v1 = event('review-created');
  const declaration = compatibilityDeclared(
    { sequence: 1, revision: 1, review_id: v1.review_id },
    COMPATIBILITY
  );
  const joined = v2Event('reviewer-joined', {
    sequence: 3,
    revision: 2,
    reviewId: v1.review_id,
    actor: FINGERPRINTS.reviewer,
  });

  assert.equal(reduceEvents([v1, declaration, joined]).protocol.state, 'reviewer-turn');
  assert.doesNotThrow(() =>
    assertReaderWriterCompatibility(COMPATIBILITY, { readerVersion: '0.2.1' })
  );
  assert.doesNotThrow(() => assertReaderWriterCompatibility(COMPATIBILITY));
  assert.deepEqual(
    [v1, declaration, joined].map((item) => item.schema),
    ['ai-peer-review.event/v1', 'ai-peer-review.event/v2', 'ai-peer-review.event/v2']
  );
});

test('historical reader and writer version floors remain provenance rather than executable selection', () => {
  assert.doesNotThrow(() =>
    assertReaderWriterCompatibility(COMPATIBILITY, {
      readerVersion: '0.2.1',
      writerVersion: '0.2.1',
    })
  );
  assert.throws(
    () =>
      assertReaderWriterCompatibility({ ...COMPATIBILITY, minimum_writer_version: 'malformed' }),
    (error) => error.code === 'APR_EVENT_INVALID'
  );
});

for (const mutation of ['single', 'batch']) {
  test(`supported ${mutation} append preserves the historical writer floor as provenance`, async (t) => {
    const prefix = reviewerTurnEvents();
    const declaration = compatibilityDeclared(
      { sequence: 2, revision: 2, review_id: prefix[0].review_id },
      { ...COMPATIBILITY, minimum_writer_version: '999.0.0' }
    );
    const fixture = await createReviewWorkspace({
      events: [
        ...prefix,
        declaration,
        v2Event('identity-changed', {
          sequence: 4,
          revision: 2,
          actor: FINGERPRINTS.reviewer,
          payload: { identity: participant('reviewer') },
        }),
      ],
    });
    t.after(fixture.cleanup);
    const before = inspectReview(fixture.workspace);
    const snapshot = () =>
      [fixture.events, fixture.protocol, fixture.participants].map((file) =>
        readFileSync(file, 'utf8')
      );
    const bytes = snapshot();
    let factoryCalled = false;
    const mutate = mutation === 'single' ? mutateReview : mutateReviewBatch;
    const result = await mutate(fixture.workspace, expected(before), () => {
      factoryCalled = true;
      const next = event('identity-changed', {
        sequence: 5,
        revision: 2,
        actor: FINGERPRINTS.reviewer,
        payload: { identity: participant('reviewer') },
      });
      return mutation === 'single' ? next : [next];
    });
    assert.equal(factoryCalled, true);
    assert.equal(result.protocol.sequence, 5);
    assert.equal(result.protocol.compatibility.minimum_writer_version, '999.0.0');
    assert.notDeepEqual(snapshot(), bytes);
  });
}

test('a supported batch seals a historical high writer version without demanding that executable', async (t) => {
  const fixture = await createReviewWorkspace({ events: reviewerTurnEvents() });
  t.after(fixture.cleanup);
  const before = inspectReview(fixture.workspace);
  const bytes = fixture.readEvents();
  const result = await mutateReviewBatch(fixture.workspace, expected(before), (state) => [
    compatibilityDeclared(state, { ...COMPATIBILITY, minimum_writer_version: '999.0.0' }),
    v2Event('identity-changed', {
      sequence: state.sequence + 2,
      revision: state.revision,
      actor: FINGERPRINTS.reviewer,
      payload: { identity: participant('reviewer') },
    }),
  ]);
  assert.equal(result.protocol.sequence, 4);
  assert.equal(result.protocol.compatibility.minimum_writer_version, '999.0.0');
  assert.notEqual(fixture.readEvents(), bytes);
});

test('batch mutation publishes declaration and first v2 event as one ordered authority update', async (t) => {
  const fixture = await createReviewWorkspace({ events: reviewerTurnEvents() });
  t.after(fixture.cleanup);
  const before = inspectReview(fixture.workspace);

  await mutateReviewBatch(fixture.workspace, expected(before), (state) => [
    compatibilityDeclared(state, COMPATIBILITY),
    v2Event('identity-changed', {
      sequence: state.sequence + 2,
      revision: state.revision,
      reviewId: state.review_id,
      actor: FINGERPRINTS.reviewer,
      payload: { identity: participant('reviewer') },
    }),
  ]);

  assert.deepEqual(
    fixture
      .readEvents()
      .trim()
      .split('\n')
      .slice(-2)
      .map((line) => JSON.parse(line).type),
    ['compatibility-declared', 'identity-changed']
  );
});

test('an invalid second batch event leaves no standalone compatibility declaration', async (t) => {
  const fixture = await createReviewWorkspace({ events: reviewerTurnEvents() });
  t.after(fixture.cleanup);
  const before = inspectReview(fixture.workspace);
  const bytes = fixture.readEvents();

  await assert.rejects(
    mutateReviewBatch(fixture.workspace, expected(before), (state) => [
      compatibilityDeclared(state, COMPATIBILITY),
      v2Event('identity-changed', {
        sequence: state.sequence + 3,
        revision: state.revision,
        reviewId: state.review_id,
        actor: FINGERPRINTS.reviewer,
        payload: { identity: participant('reviewer') },
      }),
    ]),
    (error) => error.code === 'APR_PROJECTION_DRIFT'
  );
  assert.equal(fixture.readEvents(), bytes);
});

test('unfinished and consecutive compatibility declarations are rejected without publishing bytes', async (t) => {
  const prefix = reviewerTurnEvents();
  const first = compatibilityDeclared(
    {
      sequence: prefix.length,
      revision: prefix.at(-1).revision,
      review_id: prefix.at(-1).review_id,
    },
    COMPATIBILITY
  );
  const second = compatibilityDeclared(
    {
      sequence: first.sequence,
      revision: first.revision,
      review_id: first.review_id,
    },
    COMPATIBILITY
  );
  for (const events of [
    [...prefix, first],
    [...prefix, first, second],
  ]) {
    assert.throws(
      () => reduceEvents(events),
      (error) => error.code === 'APR_READER_UPGRADE_REQUIRED'
    );
  }

  const fixture = await createReviewWorkspace({ events: prefix });
  t.after(fixture.cleanup);
  const before = inspectReview(fixture.workspace);
  const bytes = fixture.readEvents();
  await assert.rejects(
    mutateReviewBatch(fixture.workspace, expected(before), (state) => [
      compatibilityDeclared(state, COMPATIBILITY),
      compatibilityDeclared(
        { sequence: state.sequence + 1, revision: state.revision, review_id: state.review_id },
        COMPATIBILITY
      ),
    ]),
    (error) => error.code === 'APR_EVENT_INVALID'
  );
  assert.equal(fixture.readEvents(), bytes);
});
