import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateParticipantPair,
  evaluateSurfaceConformance,
} from '../../src/providers/conformance.mjs';
import {
  verifyDormantSessionSnapshot,
  verifyProviderEvidence,
} from '../../src/providers/evidence.mjs';

const exact = {
  adapterVersion: '1.0.0',
  surfaceVersion: '2.1.278',
  evidenceSources: {
    model: 'official-exact-session',
    effort: 'official-exact-session',
    session: 'official-exact-session',
  },
  operations: {
    launch: 'exact',
    createDistinctSession: 'exact',
    deliverToSession: 'exact',
    reconcile: 'exact',
  },
  health: {
    installed: true,
    healthy: true,
    fresh: true,
    adapterVersion: '1.0.0',
    surfaceVersion: '2.1.278',
  },
};

test('requested effort can remain unverified when exact model, session and control are proven', () => {
  const result = evaluateSurfaceConformance({
    ...exact,
    evidenceSources: { ...exact.evidenceSources, effort: 'requested-flag' },
  });
  assert.equal(result.installed, true);
  assert.equal(result.automatic, true);
  assert.equal(result.reviewerLaunchable, true);
  assert.equal(result.reasons.includes('effort-not-official-exact-session'), false);
});

test('changed version or absent exact reconciliation denies automatic delivery', () => {
  const changed = evaluateSurfaceConformance({
    ...exact,
    health: { ...exact.health, surfaceVersion: '2.1.279' },
  });
  assert.equal(changed.automatic, false);
  assert.ok(changed.reasons.includes('surface-version-changed'));
  const noReconcile = evaluateSurfaceConformance({
    ...exact,
    operations: { ...exact.operations, reconcile: 'unknown' },
  });
  assert.equal(noReconcile.automatic, false);
  assert.ok(noReconcile.reasons.includes('exact-reconciliation-unavailable'));
});

test('complete exact evidence requires fresh health and launch for reviewer', () => {
  const proved = evaluateSurfaceConformance(exact);
  assert.equal(proved.automatic, true);
  assert.equal(proved.reviewerLaunchable, true);
  assert.deepEqual(proved.reasons, []);
  assert.equal(
    evaluateSurfaceConformance({ ...exact, health: { ...exact.health, fresh: false } }).automatic,
    false
  );
});

test('pair eligibility requires both role surfaces and distinct-session creation', () => {
  const proved = evaluateSurfaceConformance(exact);
  assert.equal(
    evaluateParticipantPair({ author: proved, reviewer: proved, health: exact.health }).automatic,
    true
  );
  const unproven = evaluateSurfaceConformance({
    ...exact,
    operations: { ...exact.operations, createDistinctSession: 'unproven' },
  });
  assert.equal(
    evaluateParticipantPair({ author: proved, reviewer: unproven, health: exact.health }).automatic,
    false
  );
});

test('active provider tool-use observation and pinned adapter jointly bind session and model', () => {
  const result = verifyProviderEvidence({
    expected: {
      provider: 'anthropic',
      host: 'claude-code',
      model_id: 'claude-opus-5',
      effort: 'medium',
      adapter_version: '1.0.0',
      operation_id: 'join:review-1',
    },
    providerEvidence: {
      source: 'official-exact-session',
      source_version: '2.1.278',
      observed_at: '2026-09-21T14:35:00.000Z',
      operation_id: 'join:review-1',
      provider: 'anthropic',
      host: 'claude-code',
      model_id: 'claude-opus-5',
      session_id: 'private-reviewer-session',
      phase: 'tool-use',
      tool_use_id: 'tool-provider-1',
    },
    adapterAttestation: {
      source: 'pinned-runtime',
      adapter_version: '1.0.0',
      surface_version: '2.1.278',
    },
    now: '2026-09-21T14:36:00.000Z',
  });
  assert.equal(result.assurance, 'runtime');
  assert.equal(result.model_id, 'claude-opus-5');
  assert.equal(result.effort, 'medium');
  assert.equal(result.effort_source, 'requested');
  assert.match(result.session_fingerprint, /^sha256:[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(result).includes('private-reviewer-session'), false);
});

test('requested adapter version cannot impersonate executing pinned runtime', () => {
  assert.throws(
    () =>
      verifyProviderEvidence({
        expected: {
          provider: 'anthropic',
          host: 'claude-code',
          model_id: 'claude-opus-5',
          effort: 'medium',
          adapter_version: '1.0.0',
          operation_id: 'join:review-1',
        },
        providerEvidence: {
          source: 'official-exact-session',
          source_version: '2.1.278',
          observed_at: '2026-09-21T14:35:00.000Z',
          operation_id: 'join:review-1',
          provider: 'anthropic',
          host: 'claude-code',
          model_id: 'claude-opus-5',
          session_id: 'private-reviewer-session',
          phase: 'tool-use',
          tool_use_id: 'tool-provider-1',
        },
        adapterAttestation: {
          source: 'request',
          adapter_version: '1.0.0',
          surface_version: '2.1.278',
        },
        now: '2026-09-21T14:36:00.000Z',
      }),
    { code: 'APR_IDENTITY_CONFLICT' }
  );
});

test('fresh provider-owned snapshot re-observes an old dormant session without renewing its last turn', () => {
  const expected = {
    provider: 'anthropic',
    host: 'claude-code',
    model_id: 'claude-opus-5',
    adapter_version: '1.0.0',
  };
  const snapshot = {
    source: 'official-session-record',
    source_version: '2.1.278',
    observed_at: '2026-09-21T18:00:00.000Z',
    last_turn_at: '2026-09-21T14:35:00.000Z',
    provider: 'anthropic',
    host: 'claude-code',
    model_id: 'claude-opus-5',
    session_id: 'private-session',
    phase: 'terminal-snapshot',
  };
  const attestation = {
    source: 'pinned-runtime',
    adapter_version: '1.0.0',
    surface_version: '2.1.278',
  };
  const verified = verifyDormantSessionSnapshot({
    expected,
    providerSnapshot: snapshot,
    adapterAttestation: attestation,
    now: '2026-09-21T18:00:01.000Z',
  });
  assert.match(verified.session_fingerprint, /^sha256:[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(verified).includes('private-session'), false);
  assert.throws(
    () =>
      verifyDormantSessionSnapshot({
        expected,
        providerSnapshot: { ...snapshot, model_id: 'claude-sonnet-5' },
        adapterAttestation: attestation,
        now: '2026-09-21T18:00:01.000Z',
      }),
    { code: 'APR_IDENTITY_CONFLICT' }
  );
  assert.throws(
    () =>
      verifyDormantSessionSnapshot({
        expected,
        providerSnapshot: snapshot,
        adapterAttestation: attestation,
        now: '2026-09-21T18:06:00.000Z',
      }),
    { code: 'APR_IDENTITY_CONFLICT' }
  );
});
