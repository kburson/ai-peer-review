// @story #209
import test from 'node:test';
import assert from 'node:assert/strict';
const binding = await import('../../src/broker/portable-participant-binding.mjs').catch((error) => {
  if (
    error.code === 'ERR_MODULE_NOT_FOUND' &&
    error.url?.endsWith('/portable-participant-binding.mjs')
  )
    return {};
  throw error;
});
function fixture() {
  const authorFingerprint = 'sha256:' + 'a'.repeat(64),
    reviewerFingerprint = 'sha256:' + 'b'.repeat(64);
  const state = {
    protocol: {
      review_id: 'review-one',
      startup: {
        runtime: {
          ownership: 'broker',
          transport_mode: 'automatic-required',
          adapter_version: '1.0.0',
          reviewer: { selector: 'claude' },
        },
      },
    },
    participants: {
      author: {
        host: 'codex',
        provider: 'openai',
        model_id: 'author-model',
        session_fingerprint: authorFingerprint,
      },
      reviewer: null,
    },
  };
  const capability = { available: true, automatic: true, reviewerLaunchable: true };
  // Explicit unverified protocol ports; stock fixed production selection never accepts them.
  const adapter = (host) => ({
    host,
    adapter_version: '1.0.0',
    observeCapabilities: async () => capability,
    observeBoundSession() {},
    attestVersion() {},
    observeTransport() {},
    deliverToSession() {},
    reconcileDelivery() {},
    observeResource() {},
    observeResourceRelease() {},
    launchReviewer() {},
    observeLaunchResource() {},
  });
  const adapters = new Map([
    ['codex', adapter('codex')],
    ['claude', adapter('claude-code')],
  ]);
  const input = {
    workspace: '/project/review-one',
    project: { physicalRoot: '/project' },
    state,
    journal: { stage: 'registered' },
    recovery: { fenced: false, suspending: false },
    adapters,
    now: new Date('2026-10-12T00:00:00.000Z'),
    openBinding: async ({ role, authority, workspace, projectRoot }) => {
      assert.equal(authority.review_id, 'review-one');
      assert.equal(
        authority.operation_id,
        role === 'author' ? 'start:review-one' : 'join:review-one'
      );
      assert.equal(workspace, '/project/review-one');
      assert.equal(projectRoot, '/project');
      return { session_fingerprint: role === 'author' ? authorFingerprint : reviewerFingerprint };
    },
  };
  return { input, authorFingerprint, reviewerFingerprint };
}

test('shared participant selection opens exact bindings without constructing a worker or acquiring resources', async () => {
  // The read-only selection has no owner, worker or resource-acquisition dependency.
  assert.equal(typeof binding.selectPortableParticipantBindingsCore, 'function');
  const f = fixture();
  const selected = await binding.selectPortableParticipantBindingsCore(f.input);
  assert.equal(selected.verified, false);
  assert.equal(selected.status, 'automatic');
  assert.equal(selected.authorBinding.session_fingerprint, f.authorFingerprint);
});

test('shared participant selection refuses an exact binding that differs from sealed authority', async () => {
  assert.equal(typeof binding.selectPortableParticipantBindingsCore, 'function');
  const f = fixture();
  f.input.openBinding = async () => ({ session_fingerprint: f.reviewerFingerprint });
  await assert.rejects(() => binding.selectPortableParticipantBindingsCore(f.input), {
    code: 'APR_BROKER_START_FAILED',
  });
});

test('shared participant selection retains recovery-only disposition when automatic capabilities are unavailable', async () => {
  assert.equal(typeof binding.selectPortableParticipantBindingsCore, 'function');
  const f = fixture();
  f.input.adapters.clear();
  const selected = await binding.selectPortableParticipantBindingsCore(f.input);
  assert.equal(selected.status, 'recovery');
  assert.equal(selected.verified, false);
});

test('shared participant selection checks the joined reviewer against the exact launch acknowledgement', async () => {
  assert.equal(typeof binding.selectPortableParticipantBindingsCore, 'function');
  const f = fixture();
  f.input.state.participants.reviewer = {
    host: 'claude-code',
    provider: 'anthropic',
    model_id: 'reviewer-model',
    session_fingerprint: f.reviewerFingerprint,
  };
  f.input.journal = {
    stage: 'launched',
    provider_operation: { status: 'acknowledged', session_fingerprint: f.reviewerFingerprint },
  };
  assert.equal((await binding.selectPortableParticipantBindingsCore(f.input)).status, 'automatic');
  f.input.journal.provider_operation.session_fingerprint = f.authorFingerprint;
  await assert.rejects(() => binding.selectPortableParticipantBindingsCore(f.input), {
    code: 'APR_BROKER_START_FAILED',
  });
});

test('fixed participant binding refuses caller-shaped election before observing any provider', async () => {
  assert.equal(typeof binding.openPortableParticipantBinding, 'function');
  const context = { signal: new AbortController().signal, deadline: performance.now() + 30000 };
  await assert.rejects(
    () =>
      binding.openPortableParticipantBinding({
        registration: {},
        project: {},
        lease: { verified: true },
        paths: {},
        ...context,
      }),
    { code: 'APR_BROKER_STALE' }
  );
});

test('fixed participant reader refuses copied binding capabilities', async () => {
  assert.equal(typeof binding.readPortableParticipantBinding, 'function');
  await assert.rejects(
    () =>
      binding.readPortableParticipantBinding({
        binding: { verified: true, reviewId: 'review-one' },
        signal: new AbortController().signal,
        deadline: performance.now() + 30000,
      }),
    { code: 'APR_BROKER_STALE' }
  );
});
