import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { resolveReviewPaths } from '../../src/collateral/paths.mjs';
import { createResponseDraft, sealResponse } from '../../src/collateral/responses.mjs';
import { participant } from '../helpers/review-fixture.mjs';

test('response identity conflict names the mismatched field without disclosing session fingerprints', (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'apr-identity-diagnostic-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const reviewer = {
    ...participant('reviewer'),
    host: 'claude-code',
    provider: 'anthropic',
    identity_source: 'declared',
    session_fingerprint: `sha256:${'a'.repeat(64)}`,
  };
  const paths = resolveReviewPaths({
    root,
    reviewsRoot: 'docs/reviews',
    reviewPathTemplate: '<kind>/<date>-<name>-<review-id>',
    kind: 'spec',
    name: 'example',
    date: '2026-09-08',
    reviewId: 'review-01',
  });
  const review = {
    protocol: {
      review_id: 'review-01',
      state: 'reviewer-turn',
      commit_mode: 'normal',
      max_turns: 2,
      turns_used: 0,
      claims: {
        reviewer: {
          session_fingerprint: reviewer.session_fingerprint,
          claimed_at: '2026-09-08T12:00:00.000Z',
        },
      },
      artifact: {
        path: 'docs/example.md',
        head: '1'.repeat(40),
        blob: '2'.repeat(40),
        digest: `sha256:${'3'.repeat(64)}`,
      },
    },
    participants: { author: participant('author'), reviewer },
    paths,
    now: '2026-09-08T12:00:00.000Z',
    prior_finding_ids: [],
    pending_finding_ids: [],
    sealed_responses: [],
  };
  const draft = createResponseDraft(review, 'reviewer', 1);
  for (const [field, value] of [
    ['role', 'author'],
    ['host', 'codex'],
    ['provider', 'openai'],
    ['session_fingerprint', `sha256:${'b'.repeat(64)}`],
    ['identity_source', 'runtime'],
  ]) {
    assert.throws(
      () => sealResponse(review, draft.path, { ...reviewer, [field]: value }),
      (error) => {
        assert.equal(error.code, 'APR_IDENTITY_CONFLICT');
        assert.equal(error.details.mismatched_field, field);
        assert.equal(error.details.registered_identity_source, 'declared');
        assert.equal(
          error.details.resolved_identity_source,
          field === 'identity_source' ? 'runtime' : 'declared'
        );
        assert.equal(error.details.fingerprint_equal, field !== 'session_fingerprint');
        assert.doesNotMatch(JSON.stringify(error), /sha256:[ab]{64}/u);
        return true;
      }
    );
  }
});
