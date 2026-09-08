import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createResponseDraft,
  parseResponse,
  reserveCollateral,
  sealResponse,
} from '../../src/collateral/responses.mjs';
import { resolveReviewPaths } from '../../src/collateral/paths.mjs';
import { participant } from '../helpers/review-fixture.mjs';

const NOW = '2026-09-08T12:00:00.000Z';

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'apr-responses-'));
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
      artifact: {
        path: 'docs/example.md',
        head: '1'.repeat(40),
        blob: '2'.repeat(40),
        digest: `sha256:${'3'.repeat(64)}`,
      },
    },
    participants: {
      author: participant('author'),
      reviewer: participant('reviewer'),
    },
    paths,
    now: NOW,
    prior_finding_ids: [],
    pending_finding_ids: [],
    sealed_responses: [],
  };
  return { root, review, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

function fillReviewer(
  bytes,
  { findings = '', optional = '', decision = 'revisions-requested' } = {}
) {
  return bytes
    .toString()
    .replace('<!-- Write the review summary. -->', 'The artifact needs focused revision.')
    .replace('<!-- List numbered findings or write None. -->', findings || 'None.')
    .replace('<!-- List required changes or write None. -->', 'Address the numbered findings.')
    .replace('<!-- List numbered optional suggestions or write None. -->', optional || 'None.')
    .replace('<!-- Write revisions-requested or accepted. -->', decision);
}

function fillAuthor(bytes) {
  return bytes
    .toString()
    .replace('<!-- Summarize the revision. -->', 'Addressed the review.')
    .replace('<!-- Disposition every sealed finding ID. -->', 'R1-F001 — fixed')
    .replace('<!-- Describe changes made. -->', 'Updated the artifact.')
    .replace('<!-- Explain declined changes or write None. -->', 'None.')
    .replace('<!-- Record verification performed. -->', 'Focused tests passed.');
}

test('response schema is closed and drafts derive protected metadata from review authority', (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const schema = JSON.parse(
    readFileSync(new URL('../../schemas/response-v1.json', import.meta.url), 'utf8')
  );
  assert.equal(schema.$id, 'ai-peer-review.response/v1');
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.agent.additionalProperties, false);
  const decision = JSON.parse(
    readFileSync(new URL('../../schemas/human-decision-v1.json', import.meta.url), 'utf8')
  );
  assert.deepEqual(decision.examples[0].unresolved_findings[0].finding_ids, ['R1-F002']);

  const draft = createResponseDraft(fx.review, 'reviewer', 1);
  assert.equal(draft.path, fx.review.paths.reviewerResponse(1).absolute);
  const parsed = parseResponse(draft.bytes);
  assert.equal(parsed.metadata.review_id, 'review-01');
  assert.equal(parsed.metadata.role, 'reviewer');
  assert.equal(parsed.metadata.turn, 1);
  assert.equal(parsed.metadata.artifact_path, 'docs/example.md');
  assert.equal(parsed.metadata.artifact_commit, '1'.repeat(40));
  assert.equal(
    parsed.metadata.agent.session_fingerprint,
    fx.review.participants.reviewer.session_fingerprint
  );
  assert.equal(parsed.metadata.submitted_at, null);
  assert.deepEqual(
    parsed.sections.map(({ heading }) => heading),
    ['Summary', 'Findings', 'Required changes', 'Optional suggestions', 'Decision']
  );
});

test('reviewer sealing preserves one ordered finding sequence across required and optional sections', (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const draft = createResponseDraft(fx.review, 'reviewer', 1);
  writeFileSync(
    draft.path,
    fillReviewer(draft.bytes, {
      findings: '### R1-F001 — Broken invariant\n\nThe invariant can drift.',
      optional: '### R1-F002 — Clearer naming\n\nConsider a narrower name.',
    })
  );
  const refreshedIdentity = {
    ...fx.review.participants.reviewer,
    model_id: 'gpt-test-refreshed',
    model_display: 'GPT Test Refreshed',
  };
  const sealed = sealResponse(fx.review, draft.path, refreshedIdentity);
  assert.deepEqual(sealed.finding_ids, ['R1-F001', 'R1-F002']);
  assert.match(sealed.digest, /^sha256:[0-9a-f]{64}$/);
  const sealedMetadata = parseResponse(readFileSync(draft.path)).metadata;
  assert.equal(sealedMetadata.submitted_at, NOW);
  assert.equal(sealedMetadata.agent.model_id, 'gpt-test-refreshed');

  const retryReview = { ...fx.review, sealed_responses: [sealed] };
  assert.deepEqual(sealResponse(retryReview, draft.path, refreshedIdentity), sealed);
  assert.deepEqual(createResponseDraft(retryReview, 'reviewer', 1).bytes, readFileSync(draft.path));
});

test('sealing rejects protected metadata edits and every unstable finding-ID shape', (t) => {
  const cases = [
    ['### Missing ID', 'None.'],
    ['### R2-F001 — Wrong turn', 'None.'],
    ['### R1-F002 — Gap', 'None.'],
    ['### R1-F001 —    ', 'None.'],
    ['### R1-F001 — First\n\n### R1-F001 — Duplicate', 'None.'],
    ['### R1-F001 — Reused', 'None.', ['R1-F001']],
  ];
  for (const [findings, optional, prior = []] of cases) {
    const fx = fixture();
    t.after(fx.cleanup);
    fx.review.prior_finding_ids = prior;
    const draft = createResponseDraft(fx.review, 'reviewer', 1);
    writeFileSync(draft.path, fillReviewer(draft.bytes, { findings, optional }));
    assert.throws(
      () => sealResponse(fx.review, draft.path, fx.review.participants.reviewer),
      (error) => error.code === 'APR_RESPONSE_INVALID'
    );
  }

  const fx = fixture();
  t.after(fx.cleanup);
  const draft = createResponseDraft(fx.review, 'reviewer', 1);
  writeFileSync(
    draft.path,
    draft.bytes.toString().replace('review_id: "review-01"', 'review_id: "other"')
  );
  assert.throws(
    () => sealResponse(fx.review, draft.path, fx.review.participants.reviewer),
    (error) => error.code === 'APR_PROTECTED_METADATA_CHANGED'
  );
});

test('author drafts seal exactly the preceding reviewer finding set', (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  fx.review.protocol.state = 'author-revision';
  fx.review.pending_finding_ids = ['R1-F001'];
  const draft = createResponseDraft(fx.review, 'author', 1);
  writeFileSync(draft.path, fillAuthor(draft.bytes));
  const sealed = sealResponse(fx.review, draft.path, fx.review.participants.author);
  assert.deepEqual(sealed.answered_finding_ids, ['R1-F001']);
  assert.deepEqual(sealed.finding_ids, []);
});

test('draft creation never overwrites a conflicting tracked response', (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const target = fx.review.paths.reviewerResponse(1).absolute;
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, 'foreign bytes', { flag: 'wx' });
  const before = readFileSync(target);
  assert.throws(
    () => createResponseDraft(fx.review, 'reviewer', 1),
    (error) => error.code === 'APR_OUTPUT_COLLISION'
  );
  assert.deepEqual(readFileSync(target), before);
});

test('only the event-authorized role may create or resume an unsealed draft', (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const draft = createResponseDraft(fx.review, 'reviewer', 1);
  const edited = fillReviewer(draft.bytes, { decision: 'accepted' });
  writeFileSync(draft.path, edited);
  assert.equal(
    createResponseDraft(
      { ...fx.review, now: '2026-09-08T13:00:00.000Z' },
      'reviewer',
      1
    ).bytes.toString(),
    edited
  );
  assert.throws(
    () =>
      createResponseDraft(
        { ...fx.review, protocol: { ...fx.review.protocol, state: 'author-revision' } },
        'reviewer',
        1
      ),
    (error) => error.code === 'APR_RESPONSE_INVALID'
  );
});

test('collateral reservation is idempotent, refuses partial output, and derives foreign recovery', (t) => {
  const empty = fixture();
  t.after(empty.cleanup);
  const first = reserveCollateral(empty.review);
  assert.equal(first.paths.destination.absolute, empty.review.paths.destination.absolute);
  assert.deepEqual(reserveCollateral(empty.review).reservation, first.reservation);
  assert.equal(first.reservation.paths.length, 6);

  const partial = fixture();
  t.after(partial.cleanup);
  const partialFile = partial.review.paths.reviewerResponse(1).absolute;
  mkdirSync(path.dirname(partialFile), { recursive: true });
  writeFileSync(partialFile, 'partial foreign bytes');
  const partialBefore = readFileSync(partialFile);
  assert.throws(
    () => reserveCollateral(partial.review),
    (error) => error.code === 'APR_OUTPUT_COLLISION'
  );
  assert.deepEqual(readFileSync(partialFile), partialBefore);

  const foreign = fixture();
  t.after(foreign.cleanup);
  mkdirSync(path.dirname(foreign.review.paths.manifest.absolute), { recursive: true });
  writeFileSync(foreign.review.paths.manifest.absolute, 'complete foreign manifest');
  const selected = reserveCollateral(foreign.review, {
    validateForeignManifest: ({ bytes }) => ({
      complete: bytes.toString() === 'complete foreign manifest',
      review_id: 'foreign-review',
    }),
  });
  assert.match(selected.paths.destination.relative, /-recovery-review-01$/);
  assert.equal(selected.reservation.recovered_from, 'foreign-review');
  assert.equal(
    readFileSync(foreign.review.paths.manifest.absolute, 'utf8'),
    'complete foreign manifest'
  );
});
