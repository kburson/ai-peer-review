import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  acceptancePendingEvents,
  attestation,
  authorRevisionEvents,
  event,
  FINGERPRINTS,
  protectedParameters,
} from '../helpers/review-fixture.mjs';
import { reduceEvents } from '../../src/protocol/reducer.mjs';
import {
  buildManifest,
  finalMessage,
  finalTrailers,
  pathsToSeals,
  renderManifest,
  sealHumanDecision,
  sealManifest,
} from '../../src/manifest/render.mjs';

function review(events, overrides = {}) {
  return { state: reduceEvents(events), events, ...overrides };
}

test('manifest schema is closed and covers both terminal authority paths', () => {
  const schema = JSON.parse(
    readFileSync(new URL('../../schemas/manifest-v1.json', import.meta.url), 'utf8')
  );
  assert.equal(schema.$id, 'ai-peer-review.manifest/v1');
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.properties.acceptance_basis.enum, [
    'reviewer-consensus',
    'human-override',
  ]);
  assert.equal(schema.$defs.participant.additionalProperties, false);
  assert.equal(schema.$defs.claim.properties.pid, undefined);
});

test('manifest rendering is deterministic, ordered, and privacy bounded', () => {
  const events = acceptancePendingEvents();
  const model = buildManifest(
    review(events, {
      status: 'accepted',
      acceptance_basis: 'reviewer-consensus',
      final_commit: events[0].payload.artifact.head,
    })
  );
  const first = renderManifest(model);
  const second = renderManifest(structuredClone(model));
  assert.deepEqual(second, first);
  assert.equal(Object.isFrozen(model), true);
  assert.equal(model.turns[0].decision, 'accepted');
  assert.equal(model.artifact_history[0].commit, events[0].payload.artifact.head);
  assert.doesNotMatch(first.toString(), /session_id|transcript|token|ipc|private_key/i);
  assert.match(first.toString(), /reviewer-consensus/);
});

test('human decision and manifest seals bind exact override authority', () => {
  const events = authorRevisionEvents();
  events[0].payload.max_turns = 1;
  events.push(
    event('author-closing-round-committed', {
      sequence: 6,
      revision: 4,
      actor: FINGERPRINTS.author,
    })
  );
  const state = reduceEvents(events);
  const reviewer = [...events]
    .reverse()
    .find((item) => item.type === 'reviewer-revisions-requested');
  const parameters = {
    ...protectedParameters('accept-over-objections'),
    artifact_path: state.protocol.artifact.path,
    artifact_blob: state.protocol.artifact.blob,
    artifact_digest: state.protocol.artifact.digest,
    final_round: reviewer.payload.turn,
    reviewer_response_path: reviewer.payload.response.path,
    reviewer_response_digest: reviewer.payload.response.digest,
    unresolved_finding_ids: reviewer.payload.finding_ids,
  };
  const decision = sealHumanDecision({
    state,
    events,
    parameters,
    attestation: attestation(),
    decided_at: '2026-09-09T12:00:00.000Z',
    path: 'reviews/human-decision.md',
  });
  assert.equal(decision.model.unresolved_findings[0].finding_ids[0], 'finding-001');
  assert.match(decision.bytes.toString(), /human_rationale_digest/);
  assert.equal(Object.isFrozen(decision), true);

  const manifest = sealManifest(
    buildManifest(
      review(events, {
        status: 'accepted-over-objections',
        acceptance_basis: 'human-override',
        final_commit: state.protocol.artifact.head,
        human_decision: decision.model,
      })
    ),
    { path: 'reviews/review-manifest.md' }
  );
  const sealed = pathsToSeals([decision, manifest], {
    expected_head: state.protocol.artifact.head,
  });
  assert.deepEqual(sealed.commit_paths, [decision.path, manifest.path]);
  assert.match(finalMessage(state), /review-01/);
  assert.equal(
    finalTrailers({ state, acceptance: decision, manifest })['Peer-Review-Manifest'],
    manifest.digest
  );
});

test('no-commit manifest carries explicit non-durable status and residual risk', () => {
  const events = acceptancePendingEvents();
  events[0].payload.commit_mode = 'no-commit';
  events[0].payload.startup.no_commit_baseline = {
    head: events[0].payload.artifact.head,
    index_digest: `sha256:${'1'.repeat(64)}`,
    worktree_digest: `sha256:${'2'.repeat(64)}`,
    changed_paths: [],
  };
  const model = buildManifest(
    review(events, {
      status: 'accepted-uncommitted',
      acceptance_basis: 'reviewer-consensus',
      final_commit: null,
    })
  );
  assert.equal(model.commit_mode, 'no-commit');
  assert.equal(model.final_commit, null);
  assert.equal(model.residual_risk.includes('uncommitted-test-evidence'), true);
  assert.match(renderManifest(model).toString(), /NO-COMMIT TEST MODE/);
});
