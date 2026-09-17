import assert from 'node:assert/strict';
import test from 'node:test';

import * as api from '../helpers/internal-api.mjs';
import {
  createReviewWorkspace,
  FINGERPRINTS,
  participant,
  reviewerTurnEvents,
  v2Event,
} from '../helpers/review-fixture.mjs';
import { inspectReview } from '../../src/protocol/service.mjs';

const COMPATIBILITY = Object.freeze({
  minimum_reader_version: '0.2.2',
  minimum_writer_version: '0.2.2',
  accepted_event_schemas: ['ai-peer-review.event/v1', 'ai-peer-review.event/v2'],
});

test('a v2 reader upgrades a v1 record with one compatibility-and-v2-event batch', async (t) => {
  const fixture = await createReviewWorkspace({ events: reviewerTurnEvents() });
  t.after(fixture.cleanup);
  const v1State = inspectReview(fixture.workspace);

  const upgraded = await api.mutateReviewBatch(
    fixture.workspace,
    {
      reviewId: v1State.protocol.review_id,
      revision: v1State.protocol.revision,
      sequence: v1State.protocol.sequence,
      actor: v1State.protocol.current_actor,
    },
    (state) => [
      api.compatibilityDeclared(state, COMPATIBILITY),
      v2Event('identity-changed', {
        sequence: state.sequence + 2,
        revision: state.revision,
        reviewId: state.review_id,
        actor: FINGERPRINTS.reviewer,
        payload: { identity: participant('reviewer') },
      }),
    ]
  );

  const events = fixture.readEvents().trim().split('\n').map(JSON.parse);
  assert.deepEqual(
    events.slice(-2).map((event) => event.type),
    ['compatibility-declared', 'identity-changed']
  );
  assert.equal(events.at(-1).schema, 'ai-peer-review.event/v2');
  assert.equal(upgraded.protocol.sequence, v1State.protocol.sequence + 2);
});
