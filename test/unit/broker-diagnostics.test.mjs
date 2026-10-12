// @story #190
import test from 'node:test';
import assert from 'node:assert/strict';
import * as entry from '../../bin/peer-review-broker.mjs';
import { brokerChildRefusalReasons } from '../helpers/installed-portable-journey.mjs';
test('broker startup diagnostics retain only known refusal categories and never private fields', () => {
  assert.equal(typeof entry.brokerStartupDiagnostic, 'function');
  const value = entry.brokerStartupDiagnostic({
    code: 'APR_BROKER_STALE',
    details: { reason: 'bootstrap-executing-runtime-changed', credential: 'DO-NOT-PUBLISH' },
    cause: { details: { reason: 'private-file-unproved' } },
  });
  assert.deepEqual(value, {
    schema: 'ai-peer-review.broker-startup-diagnostic/v1',
    verified: false,
    code: 'APR_BROKER_STALE',
    reasons: ['bootstrap-executing-runtime-changed', 'private-file-unproved'],
  });
  assert.equal(JSON.stringify(value).includes('DO-NOT-PUBLISH'), false);
  assert.deepEqual(
    entry.brokerStartupDiagnostic({ code: 'private-code', details: { reason: 'private-detail' } })
      .reasons,
    []
  );
  const cycle = { details: { reason: 'operation-deadline' } };
  cycle.cause = cycle;
  assert.deepEqual(entry.brokerStartupDiagnostic(cycle).reasons, ['operation-deadline']);
});

test('stock guard failures survive the closed installed diagnostic projection', () => {
  for (const reason of [
    'lease-budget-mismatch',
    'protected-root-closed',
    'owned-publication-changed',
  ]) {
    const value = entry.brokerStartupDiagnostic({
      code: 'APR_BROKER_STALE',
      details: { reason, path: '/private/user/path', credential: 'DO-NOT-PUBLISH' },
    });
    assert.deepEqual(brokerChildRefusalReasons(JSON.stringify(value)), [reason]);
    assert.equal(JSON.stringify(value).includes('/private/user/path'), false);
    assert.equal(JSON.stringify(value).includes('DO-NOT-PUBLISH'), false);
  }
  assert.deepEqual(
    brokerChildRefusalReasons(
      JSON.stringify({
        schema: 'ai-peer-review.broker-startup-diagnostic/v1',
        verified: false,
        reasons: ['lease-budget-mismatch/private-user-data'],
      })
    ),
    []
  );
});
