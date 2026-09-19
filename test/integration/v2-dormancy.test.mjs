import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import * as api from '../helpers/internal-api.mjs';
import { fixture, identity, NOW, replaceSection } from '../helpers/intervention-fixture.mjs';

test('public participant registration activates v2 evidence while mixed logs stay readable', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const author = identity('author', 'v2-dormancy-author');
  const reviewer = identity('reviewer', 'v2-dormancy-reviewer');
  const started = await api.startReview({
    cwd: fx.root,
    artifact: 'docs/artifact.md',
    artifactKind: 'spec',
    identity: author,
    reviewId: 'v2-dormancy',
    now: NOW,
  });
  const joined = await api.joinReview({
    cwd: fx.root,
    invitation: started.paths.reviewer_invitation,
    identity: reviewer,
    now: NOW,
  });
  replaceSection(joined.paths.response, 'Summary', 'No revisions needed.');
  replaceSection(joined.paths.response, 'Findings', 'None.');
  replaceSection(joined.paths.response, 'Required changes', 'None.');
  replaceSection(joined.paths.response, 'Optional suggestions', 'None.');
  replaceSection(joined.paths.response, 'Decision', 'accepted');
  await api.submitReviewTurn({
    cwd: fx.root,
    workspace: started.paths.workspace,
    identity: reviewer,
    decision: 'accepted',
    now: '2026-09-09T02:01:00.000Z',
  });

  const events = readFileSync(started.paths.events, 'utf8').trim().split('\n').map(JSON.parse);
  assert.ok(events.length >= 7);
  assert.deepEqual(
    events.slice(0, 4).map((event) => [event.type, event.schema]),
    [
      ['review-created', 'ai-peer-review.event/v1'],
      ['compatibility-declared', 'ai-peer-review.event/v2'],
      ['identity-changed', 'ai-peer-review.event/v2'],
      ['reviewer-joined', 'ai-peer-review.event/v2'],
    ]
  );
  assert.deepEqual(events[2].payload.identity.evidence, author.evidence);
  assert.deepEqual(events[3].payload.reviewer.evidence, reviewer.evidence);
  assert.ok(events.slice(4).every((event) => event.schema === 'ai-peer-review.event/v1'));
});
