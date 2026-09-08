import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { canonicalProjection, mutateReview, readReview } from '../../src/protocol/service.mjs';
import { withReviewLock } from '../../src/protocol/store.mjs';
import { event, reviewerTurnEvents, createReviewWorkspace } from '../helpers/review-fixture.mjs';

test('rebuilds missing and corrupt projections byte-for-byte from events', async (t) => {
  const fixture = await createReviewWorkspace({ repository: null, events: reviewerTurnEvents() });
  t.after(fixture.cleanup);
  rmSync(fixture.protocol);
  writeFileSync(fixture.participants, '{corrupt\n');

  const recovered = await readReview(fixture.workspace);
  assert.equal(readFileSync(fixture.protocol, 'utf8'), canonicalProjection(recovered.protocol));
  assert.equal(
    readFileSync(fixture.participants, 'utf8'),
    canonicalProjection(recovered.participants)
  );
  assert.equal(fixture.readEvents(), readFileSync(fixture.events, 'utf8'));
});

test('mutateReview checks expected authority, appends first, and writes exact projections', async (t) => {
  const fixture = await createReviewWorkspace({ repository: null, events: reviewerTurnEvents() });
  t.after(fixture.cleanup);
  const before = fixture.readEvents();
  const result = await mutateReview(
    fixture.workspace,
    { reviewId: 'review-01', revision: 2, sequence: 2, actor: 'reviewer' },
    (state) =>
      event('reviewer-accepted', {
        sequence: state.protocol.sequence + 1,
        revision: state.protocol.revision + 1,
        actor: `sha256:${'b'.repeat(64)}`,
      })
  );

  assert.equal(result.protocol.state, 'acceptance-pending');
  assert.equal(fixture.readEvents().startsWith(before), true);
  assert.equal(readFileSync(fixture.protocol, 'utf8'), canonicalProjection(result.protocol));
  assert.equal(
    readFileSync(fixture.participants, 'utf8'),
    canonicalProjection(result.participants)
  );
  assert.equal(result.nextAction, 'finalize-acceptance');
});

test('stale expectations and torn event bytes fail without mutation', async (t) => {
  const fixture = await createReviewWorkspace({ repository: null, events: reviewerTurnEvents() });
  t.after(fixture.cleanup);
  const before = fixture.readEvents();
  await assert.rejects(
    mutateReview(
      fixture.workspace,
      { reviewId: 'review-01', revision: 1, sequence: 2, actor: 'reviewer' },
      () => {
        throw new Error('factory must not run');
      }
    ),
    (error) => error.code === 'APR_STALE_REVIEW'
  );
  assert.equal(fixture.readEvents(), before);

  writeFileSync(fixture.events, `${before}{"torn":true}`);
  await assert.rejects(
    readReview(fixture.workspace),
    (error) => error.code === 'APR_EVENT_LOG_CORRUPT'
  );
});

test('projection repair participates in the review lock', async (t) => {
  const fixture = await createReviewWorkspace({ repository: null, events: reviewerTurnEvents() });
  t.after(fixture.cleanup);
  await withReviewLock(fixture.workspace, async () => {
    await assert.rejects(
      readReview(fixture.workspace),
      (error) => error.code === 'APR_REVIEW_LOCKED'
    );
  });
});

test('delivery events create idempotent receipts and refuse conflicts', async (t) => {
  const fixture = await createReviewWorkspace({ repository: null, events: reviewerTurnEvents() });
  t.after(fixture.cleanup);
  const delivery = event('delivery-written', {
    sequence: 3,
    revision: 2,
    payload: {
      delivery: {
        delivery_id: 'delivery-1',
        recipient: 'reviewer',
        digest: `sha256:${'f'.repeat(64)}`,
      },
    },
  });
  const result = await mutateReview(
    fixture.workspace,
    { reviewId: 'review-01', revision: 2, sequence: 2, actor: 'reviewer' },
    () => delivery
  );
  const receipt = path.join(fixture.workspace, 'deliveries', 'delivery-1.json');
  assert.equal(readFileSync(receipt, 'utf8'), canonicalProjection(delivery.payload.delivery));
  assert.equal(result.protocol.sequence, 3);

  writeFileSync(receipt, '{"conflict":true}\n');
  await assert.rejects(
    readReview(fixture.workspace),
    (error) => error.code === 'APR_DELIVERY_CONFLICT'
  );
});
