import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mergeObservedIdentity,
  resolveIdentity,
  v1Participant,
} from '../../src/identity/registry.mjs';
import { buildManifest } from '../../src/manifest/render.mjs';
import { inspectReview } from '../../src/protocol/service.mjs';
import * as api from '../helpers/internal-api.mjs';
import {
  createReviewWorkspace,
  FINGERPRINTS,
  reviewerTurnEvents,
  v2Event,
} from '../helpers/review-fixture.mjs';

const COMPATIBILITY = Object.freeze({
  minimum_reader_version: '0.2.2',
  minimum_writer_version: '0.2.2',
  accepted_event_schemas: ['ai-peer-review.event/v1', 'ai-peer-review.event/v2'],
});

function manifestFor(fixture, state) {
  const events = fixture.readEvents().trim().split('\n').map(JSON.parse);
  return buildManifest({
    state,
    events,
    status: 'accepted',
    acceptance_basis: 'reviewer-consensus',
    final_commit: state.protocol.artifact.head,
  });
}

async function appendAuthorIdentity(fixture, identity) {
  const state = inspectReview(fixture.workspace);
  return api.mutateReviewBatch(
    fixture.workspace,
    {
      reviewId: state.protocol.review_id,
      revision: state.protocol.revision,
      sequence: state.protocol.sequence,
      actor: state.protocol.current_actor,
    },
    (current) => [
      api.compatibilityDeclared(current, COMPATIBILITY, {
        at: '2026-09-08T12:00:03.000Z',
      }),
      v2Event('identity-changed', {
        sequence: current.sequence + 2,
        revision: current.revision,
        reviewId: current.review_id,
        actor: identity.session_fingerprint,
        payload: { role: 'author', identity },
      }),
    ]
  );
}

test('environment model declarations remain explicitly unverified in durable evidence', async (t) => {
  const declared = resolveIdentity({
    adapter: 'codex',
    role: 'author',
    joinedAt: '2026-09-08T12:00:00.000Z',
    env: { CODEX_THREAD_ID: 'codex-session-secret', CODEX_MODEL_ID: 'gpt-6-astra' },
  });
  const events = reviewerTurnEvents();
  events[0].payload.author = v1Participant(declared);
  const fixture = await createReviewWorkspace({ events });
  t.after(fixture.cleanup);

  const state = await appendAuthorIdentity(fixture, declared);
  const manifest = manifestFor(fixture, state);

  assert.equal(manifest.participants.author.evidence.session.assurance, 'declared');
  assert.equal(manifest.participants.author.evidence.model.source, 'environment-declaration');
  assert.equal(manifest.participants.author.evidence.model.assurance, 'declared');
  assert.equal(manifest.participants.author.evidence.model.observed_id, null);
  assert.equal(JSON.stringify(manifest).includes('codex-session-secret'), false);
});

test('provider-observed model conflicts remain visible without replacing the declaration', async (t) => {
  const declared = resolveIdentity({
    adapter: 'codex',
    role: 'author',
    joinedAt: '2026-09-08T12:00:00.000Z',
    env: { CODEX_THREAD_ID: 'codex-session-secret', CODEX_MODEL_ID: 'gpt-6-astra' },
  });
  const observed = mergeObservedIdentity(declared, {
    session_fingerprint: declared.session_fingerprint,
    model_id: 'gpt-5.6-sol',
    model_display: 'GPT-5.6 Sol',
    source: 'provider-result',
  });
  const events = reviewerTurnEvents();
  events[0].payload.author = v1Participant(declared);
  const fixture = await createReviewWorkspace({ events });
  t.after(fixture.cleanup);

  const state = await appendAuthorIdentity(fixture, observed);
  const model = manifestFor(fixture, state).participants.author.evidence.model;

  assert.equal(model.declared_id, 'gpt-6-astra');
  assert.equal(model.observed_id, 'gpt-5.6-sol');
  assert.equal(model.assurance, 'observed');
  assert.equal(model.conflict, true);
});

test('legacy v1 participant evidence stays readable and explicitly unclassified', async (t) => {
  const fixture = await createReviewWorkspace({ events: reviewerTurnEvents() });
  t.after(fixture.cleanup);
  const state = inspectReview(fixture.workspace);

  const manifest = manifestFor(fixture, state);

  for (const role of ['author', 'reviewer']) {
    assert.equal(manifest.participants[role].evidence.session.source, 'legacy-unclassified');
    assert.equal(manifest.participants[role].evidence.session.assurance, 'declared');
    assert.equal(manifest.participants[role].evidence.model.source, 'legacy-unclassified');
    assert.equal(manifest.participants[role].evidence.model.assurance, 'declared');
    assert.equal(manifest.participants[role].evidence.model.conflict, false);
  }
  assert.equal(manifest.participants.author.session_fingerprint, FINGERPRINTS.author);
});
