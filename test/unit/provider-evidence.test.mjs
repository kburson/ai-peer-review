import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateParticipantPair,
  evaluateSurfaceConformance,
} from '../../src/providers/conformance.mjs';

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

test('installed executable without official effort acknowledgment stays manual', () => {
  const result = evaluateSurfaceConformance({
    ...exact,
    evidenceSources: { ...exact.evidenceSources, effort: 'requested-flag' },
  });
  assert.equal(result.installed, true);
  assert.equal(result.automatic, false);
  assert.ok(result.reasons.includes('effort-not-official-exact-session'));
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
