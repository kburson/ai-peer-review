// @story #190
// Reporting controls cannot grant installed authority; actual journeys run on hosted OS workers.
import test from 'node:test';
import assert from 'node:assert/strict';
async function driver() {
  try {
    return await import('../helpers/installed-portable-journey.mjs');
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
    throw error;
  }
}
test('child refusal diagnostics reject private or unrecognized categories', async () => {
  const subject = await driver();
  assert.equal(typeof subject.brokerChildRefusalReasons, 'function');
  const record = {
    schema: 'ai-peer-review.broker-startup-diagnostic/v1',
    verified: false,
    code: 'APR_BROKER_STALE',
    reasons: ['bootstrap-executing-runtime-changed', 'operation-deadline'],
  };
  assert.deepEqual(subject.brokerChildRefusalReasons(JSON.stringify(record)), record.reasons);
  assert.deepEqual(
    subject.brokerChildRefusalReasons(JSON.stringify({ ...record, reasons: ['private-secret'] })),
    []
  );
  assert.deepEqual(
    subject.brokerChildRefusalReasons(JSON.stringify({ ...record, verified: true })),
    []
  );
  assert.deepEqual(subject.brokerChildRefusalReasons('x'.repeat(65537)), []);
});
test('broker child diagnostics publish bounded codes without requiring one exact private message', async () => {
  const subject = await driver();
  assert.equal(typeof subject.brokerChildFailureCode, 'function');
  assert.equal(
    subject.brokerChildFailureCode('APR_PRIMARY_AUTHORITY_UNAVAILABLE: private details\n'),
    'APR_PRIMARY_AUTHORITY_UNAVAILABLE'
  );
  assert.equal(
    subject.brokerChildFailureCode(
      JSON.stringify({
        schema: 'ai-peer-review.error/v1',
        code: 'APR_BROKER_STALE',
        message: 'DO-NOT-PUBLISH',
        details: { credential: 'DO-NOT-PUBLISH' },
      })
    ),
    'APR_BROKER_STALE'
  );
  for (const value of [
    'DO-NOT-PUBLISH',
    'prefix APR_BROKER_STALE: private',
    '{"code":"APR_BROKER_STALE"}',
    'APR_BAD-CODE: private',
    'x'.repeat(65537),
  ])
    assert.equal(subject.brokerChildFailureCode(value), null);
});
test('startup diagnostics retain known owner and snapshot refusals while excluding private reasons', async () => {
  const subject = await driver();
  const { brokerStartupDiagnostic } = await import('../../bin/peer-review-broker.mjs');
  for (const reason of [
    'owner-operation-not-admitted',
    'owner-guard-budget-mismatch',
    'operation-budget-unproved',
    'protected-snapshot-changed',
    'snapshot-ancestor-changed',
    'genuine-protected-snapshot-required',
  ]) {
    const observed = brokerStartupDiagnostic({ code: 'APR_BROKER_STALE', details: { reason } });
    assert.deepEqual(observed.reasons, [reason]);
    assert.deepEqual(subject.brokerChildRefusalReasons(JSON.stringify(observed)), [reason]);
    assert.equal(observed.verified, false);
  }
  const rejected = brokerStartupDiagnostic({
    code: 'APR_BROKER_STALE',
    details: { reason: '/private/credential-DO-NOT-PUBLISH' },
  });
  assert.deepEqual(rejected.reasons, []);
  assert.equal(JSON.stringify(rejected).includes('DO-NOT-PUBLISH'), false);
});
test('installed journey refuses ports, class overrides and missing actual inputs before effects', async () => {
  const subject = await driver();
  assert.equal(
    typeof subject.runInstalledPortableJourney,
    'function',
    'actual installed journey driver missing'
  );
  for (const options of [
    {},
    { installed: '/missing', projectRoot: '/missing', output: '/missing', operations: {} },
    { installed: '/missing', projectRoot: '/missing', output: '/missing', acceptedClass: true },
  ]) {
    await assert.rejects(
      () => subject.runInstalledPortableJourney(options),
      /journey-options|journey-host-unavailable/
    );
  }
});
test('reporting never promotes missing manual or privilege evidence to complete', async () => {
  const subject = await driver();
  assert.equal(
    typeof subject.installedJourneyComplete,
    'function',
    'bounded journey completeness check missing'
  );
  assert.equal(subject.installedJourneyComplete({ status: 'complete', verified: true }), false);
  const observed = {
    broker: 'complete',
    originalPidAbsent: true,
    originalBudgetRenewed: false,
    manual: 'incomplete',
    protection: 'complete',
    effectAcceptance: 'complete',
    cleanup: 'complete',
    privilege: 'non-elevated',
  };
  assert.equal(subject.installedJourneyComplete(observed), false);
  assert.equal(subject.installedJourneyComplete({ ...observed, manual: 'complete' }), true);
  assert.equal(
    subject.installedJourneyComplete({
      ...observed,
      manual: 'complete',
      originalBudgetRenewed: true,
    }),
    false
  );
  assert.equal(
    subject.installedJourneyComplete({ ...observed, manual: 'complete', cleanup: 'uncertain' }),
    false
  );
  assert.equal(
    subject.installedJourneyComplete({ ...observed, manual: 'complete', privilege: 'unavailable' }),
    false
  );
});

// The user explicitly excludes unavailable Linux manual review from #190.
test('Linux manual exclusion is explicit and cannot waive another OS or broker cleanup', async () => {
  const subject = await driver();
  const observed = {
    platform: 'linux',
    broker: 'complete',
    originalPidAbsent: true,
    originalBudgetRenewed: false,
    manual: 'excluded-by-user-linux',
    protection: 'complete',
    effectAcceptance: 'complete',
    cleanup: 'complete',
    privilege: 'non-elevated',
  };
  assert.equal(subject.installedJourneyComplete(observed), true);
  assert.equal(subject.installedJourneyComplete({ ...observed, platform: 'darwin' }), false);
  assert.equal(subject.installedJourneyComplete({ ...observed, platform: 'win32' }), false);
  assert.equal(subject.installedJourneyComplete({ ...observed, cleanup: 'uncertain' }), false);
  assert.equal(subject.installedJourneyComplete({ ...observed, broker: 'incomplete' }), false);
});

test('failed stock CLI observations retain exact cleanup obligations without publishing private fields', async () => {
  const subject = await driver();
  assert.equal(typeof subject.installedJourneyFailure, 'function');
  const observed = subject.installedJourneyFailure({
    code: 1,
    message: 'Command failed',
    stderr: Buffer.from(
      JSON.stringify({
        schema: 'ai-peer-review.error/v1',
        code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
        message: 'Primary admission election refused',
        details: {
          obligations: [
            {
              contenderId: 'actual-contender',
              reason: 'operation-deadline',
              outcome: 'owned-publication-unconfirmed',
              credential: 'DO-NOT-PUBLISH',
            },
          ],
        },
      }) + '\n'
    ),
  });
  assert.equal(observed.failure.code, 'APR_PRIMARY_AUTHORITY_UNAVAILABLE');
  assert.deepEqual(observed.obligations, [
    {
      contenderId: 'actual-contender',
      reason: 'operation-deadline',
      outcome: 'owned-publication-unconfirmed',
    },
  ]);
  assert.equal(JSON.stringify(observed).includes('DO-NOT-PUBLISH'), false);
  assert.deepEqual(
    subject.installedJourneyFailure({
      message: 'budget refused',
      details: {
        reason: 'operation-deadline',
        obligations: [{ reason: 'descriptor-close-pending' }],
      },
    }).obligations,
    [{ reason: 'descriptor-close-pending' }]
  );
});

// @story #209
test('installed completion retains the required positive effect and drift gate', async () => {
  const { installedJourneyComplete } = await import('../helpers/installed-portable-journey.mjs');
  const otherwiseComplete = {
    platform: 'linux',
    broker: 'complete',
    originalPidAbsent: true,
    originalBudgetRenewed: false,
    manual: 'excluded-by-user-linux',
    protection: 'complete',
    cleanup: 'complete',
    privilege: 'non-elevated',
  };
  assert.equal(installedJourneyComplete(otherwiseComplete), false);
  assert.equal(
    installedJourneyComplete({ ...otherwiseComplete, effectAcceptance: 'incomplete' }),
    false
  );
  assert.equal(
    installedJourneyComplete({ ...otherwiseComplete, effectAcceptance: 'complete' }),
    true
  );
});
