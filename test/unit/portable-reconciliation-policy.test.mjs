// @story #209
import test from 'node:test';
import assert from 'node:assert/strict';
const policy = await import('../../src/broker/portable-reconciliation-policy.mjs').catch(
  (error) => {
    if (
      error.code === 'ERR_MODULE_NOT_FOUND' &&
      error.url?.endsWith('/portable-reconciliation-policy.mjs')
    )
      return {};
    throw error;
  }
);
const project = { digest: 'a'.repeat(64), physicalRoot: '/project' };
const reviewId = 'review-one',
  workspace = '/project/.scratch/peer-review/reviews/review-one';
const requestDigest = 'b'.repeat(64),
  runtimeDigest = 'sha256:' + 'c'.repeat(64);
function registration() {
  return {
    schema: 'ai-peer-review.broker-registration/v1',
    created_at: '2026-10-12T00:00:00.000Z',
    project_digest: project.digest,
    project_root: project.physicalRoot,
    review_id: reviewId,
    workspace,
    request_digest: requestDigest,
    runtime: {
      root: '/runtime',
      digest: runtimeDigest,
      entrypoint: '/runtime/bin/peer-review.mjs',
      nodeExecutable: '/node',
    },
  };
}
function review(stage = 'registered') {
  return {
    review_id: reviewId,
    workspace,
    authority: {
      status: 'active',
      review_id: reviewId,
      workspace,
      event_authority: 'exact',
      output_reservation: 'exact',
      request_digest: requestDigest,
      runtime_digest: runtimeDigest,
    },
    startup: { stage, review_id: reviewId, workspace, request_digest: requestDigest },
    participants: { author: { session_fingerprint: 'sha256:' + 'd'.repeat(64) }, reviewer: null },
    manualHistory: {
      schema: 'ai-peer-review.manual-launch-history/v1',
      review_id: reviewId,
      request_digest: requestDigest,
      coverage: 'complete',
      operations: [],
    },
    wake: [],
    providerObservations: [],
    locks: [],
    fence: null,
    suspension: null,
  };
}
function classify({ registrations = [], reviews = [], resources = [] } = {}) {
  assert.equal(typeof policy.classifyPortableReconciliationCore, 'function');
  return policy.classifyPortableReconciliationCore({ project, registrations, reviews, resources });
}

test('empty classification is explicitly unverified and cannot grant an owner capability', () => {
  // Returning operational verification from fixture data would bypass actual observations.
  const result = classify();
  assert.equal(result.status, 'clear');
  assert.equal(result.verified, false);
  assert.deepEqual(result.outstandingObligations, []);
});

test('exact registered prelaunch review is restorable without submitting anything', () => {
  const result = classify({ registrations: [registration()], reviews: [review()] });
  assert.equal(result.status, 'clear');
  assert.equal(result.verified, false);
  assert.deepEqual(result.dispositions, [{ review_id: reviewId, disposition: 'restorable' }]);
});

for (const [label, change, obligation] of [
  [
    'missing manual launch coverage',
    (r) => {
      r.manualHistory = null;
    },
    'manual-launch-unproved',
  ],
  [
    'legacy manual launch coverage',
    (r) => {
      r.manualHistory.coverage = 'legacy-unknown';
    },
    'manual-launch-unproved',
  ],
  [
    'pending manual launch',
    (r) => {
      r.manualHistory.operations = [
        {
          id: 'manual:' + '1'.repeat(36),
          intent_digest: 'sha256:' + 'e'.repeat(64),
          status: 'outcome-unknown',
        },
      ];
    },
    'manual-launch-unproved',
  ],
  [
    'reserved wake',
    (r) => {
      r.wake = [{ status: 'reserved' }];
    },
    'wake-outcome-unproved',
  ],
  [
    'unknown wake',
    (r) => {
      r.wake = [{ status: 'outcome-unknown' }];
    },
    'wake-outcome-unproved',
  ],
  [
    'unknown reviewer launch',
    (r) => {
      r.startup.stage = 'outcome-unknown';
    },
    'existing-effect-reconciliation-unproved',
  ],
  [
    'incomplete output reservation',
    (r) => {
      r.authority.output_reservation = 'unknown';
    },
    'review-authority-unproved',
  ],
  [
    'empty uninitialized review',
    (r) => {
      r.startup = null;
      r.authority = { status: 'absent' };
    },
    'review-initialization-unproved',
  ],
  [
    'retained coordinator',
    (r) => {
      r.locks = [{ kind: 'coordinator' }];
    },
    'coordinator-generation-retained',
  ],
  [
    'retained review lock',
    (r) => {
      r.locks = [{ kind: 'review' }];
    },
    'review-lock-retained',
  ],
  [
    'pending manual suspension',
    (r) => {
      r.suspension = { schema: 'ai-peer-review.manual-suspension/v1' };
    },
    'manual-suspension-unproved',
  ],
]) {
  test(label + ' cannot become clear', () => {
    const r = review();
    change(r);
    const result = classify({ registrations: [registration()], reviews: [r] });
    assert.equal(result.status, 'unknown');
    assert.equal(result.verified, false);
    assert.ok(result.outstandingObligations.some((entry) => entry.name === obligation));
  });
}

test('acknowledged launch requires the exact joined reviewer fingerprint', () => {
  const r = review('launched');
  r.participants.reviewer = { session_fingerprint: 'sha256:' + 'e'.repeat(64) };
  r.startup.provider_operation = {
    status: 'acknowledged',
    session_fingerprint: r.participants.reviewer.session_fingerprint,
  };
  r.providerObservations = [{ kind: 'launch' }];
  assert.equal(classify({ registrations: [registration()], reviews: [r] }).status, 'clear');
  r.startup.provider_operation.session_fingerprint = 'sha256:' + 'f'.repeat(64);
  const refused = classify({ registrations: [registration()], reviews: [r] });
  assert.equal(refused.status, 'unknown');
  assert.ok(
    refused.outstandingObligations.some(
      (entry) => entry.name === 'existing-effect-reconciliation-unproved'
    )
  );
});

test('terminal authority preserves history without granting provider completion from acknowledgement', () => {
  const r = review('launched');
  r.authority.status = 'terminal';
  r.participants.reviewer = { session_fingerprint: 'sha256:' + 'e'.repeat(64) };
  r.startup.provider_operation = {
    status: 'acknowledged',
    session_fingerprint: r.participants.reviewer.session_fingerprint,
  };
  const result = classify({ registrations: [registration()], reviews: [r] });
  assert.equal(result.status, 'clear');
  assert.deepEqual(result.dispositions, [{ review_id: reviewId, disposition: 'preserved' }]);
  const retained = classify({
    registrations: [registration()],
    reviews: [r],
    resources: [providerResource(project.digest)],
  });
  assert.equal(retained.status, 'unknown');
});

function providerResource(digest) {
  return {
    kind: 'provider-resources',
    key: 'f'.repeat(64),
    record: {
      schema: 'ai-peer-review.provider-resource/v1',
      resource_digest: 'f'.repeat(64),
      owner_project_root_digest: digest,
      instance_id: '1'.repeat(64),
      nonce_digest: '2'.repeat(64),
      acquired_at: '2026-10-12T00:00:00.000Z',
      heartbeat_at: '2026-10-12T00:00:00.000Z',
      diagnostic_at: '2026-10-12T00:00:00.000Z',
    },
    elections: [],
  };
}

test('same-project provider record remains retained even without its original process', () => {
  const result = classify({ resources: [providerResource(project.digest)] });
  assert.equal(result.status, 'unknown');
  assert.ok(
    result.outstandingObligations.some((entry) => entry.name === 'provider-resource-retained')
  );
});

test('closed foreign provider association is independent while ambiguous records refuse', () => {
  const foreign = providerResource('3'.repeat(64));
  assert.equal(classify({ resources: [foreign] }).status, 'clear');
  foreign.record.owner_project_root_digest = null;
  assert.equal(classify({ resources: [foreign] }).status, 'unknown');
});

test('orphan and foreign registrations in this project store cannot grant clearance', () => {
  assert.equal(classify({ registrations: [registration()] }).status, 'unknown');
  const foreign = registration();
  foreign.project_digest = '3'.repeat(64);
  assert.equal(classify({ registrations: [foreign], reviews: [review()] }).status, 'unknown');
});

test('all ordinary manual settlement fields matching cannot substitute for C1 protection', () => {
  const r = review();
  r.fence = { review_id: reviewId, request_digest: requestDigest };
  const resource = {
    kind: 'manual-resources',
    key: 'f'.repeat(64),
    record: {
      schema: 'ai-peer-review.manual-resource/v1',
      review_id: reviewId,
      workspace,
      request_digest: requestDigest,
      contender_id: 'contender',
      durable_fence_digest: '4'.repeat(64),
    },
    elections: [],
    association: { project_digest: project.digest, workspace },
    settlement: {
      fenceDigest: '4'.repeat(64),
      reviewProtection: 'ordinary',
      electionWithdrawn: true,
    },
  };
  assert.equal(
    classify({ registrations: [registration()], reviews: [r], resources: [resource] }).status,
    'unknown'
  );
  resource.settlement.reviewProtection = 'C1';
  assert.equal(
    classify({ registrations: [registration()], reviews: [r], resources: [resource] }).status,
    'clear'
  );
});
