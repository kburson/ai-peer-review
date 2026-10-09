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
