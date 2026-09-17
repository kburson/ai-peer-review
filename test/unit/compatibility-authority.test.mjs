import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertReaderWriterCompatibility,
  compatibilityDeclared,
  mutateReviewBatch,
} from '../helpers/internal-api.mjs';
import {
  createReviewWorkspace,
  event,
  FINGERPRINTS,
  participant,
  reviewerTurnEvents,
  v2Event,
} from '../helpers/review-fixture.mjs';
import { inspectReview } from '../../src/protocol/service.mjs';
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
  assert.throws(
    () => assertReaderWriterCompatibility(COMPATIBILITY, { readerVersion: '0.2.1' }),
    (error) => error.code === 'APR_READER_UPGRADE_REQUIRED'
  );
  assert.doesNotThrow(() => assertReaderWriterCompatibility(COMPATIBILITY));
  assert.deepEqual(
    [v1, declaration, joined].map((item) => item.schema),
    ['ai-peer-review.event/v1', 'ai-peer-review.event/v2', 'ai-peer-review.event/v2']
  );
});

test('a sealed v2 minimum refuses a writer below its required version', () => {
  assert.throws(
    () =>
      assertReaderWriterCompatibility(COMPATIBILITY, {
        readerVersion: '0.2.2',
        writerVersion: '0.2.1',
      }),
    (error) => error.code === 'APR_WRITER_UPGRADE_REQUIRED'
  );
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
