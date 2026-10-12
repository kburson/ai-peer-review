// @story #190
// Diagnostic-only inspector observation. No evaluate/callFunction/source edit.
import { Worker } from 'node:worker_threads';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
export function summarizeSelectionAttribution(trace) {
  const invalid = () => {
    throw Error('selection-attribution-evidence-unavailable');
  };
  const exact = (value, fields) =>
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join() === fields.sort().join();
  if (
    !exact(trace, [
      'verified',
      'operationalAuthority',
      'observerExitObserved',
      'unavailable',
      'observations',
      'selectionGuardOpens',
    ]) ||
    trace.verified !== false ||
    trace.operationalAuthority !== 'unavailable' ||
    trace.observerExitObserved !== true ||
    trace.unavailable !== 0 ||
    !Number.isSafeInteger(trace.selectionGuardOpens) ||
    trace.selectionGuardOpens < 0 ||
    !Array.isArray(trace.observations) ||
    trace.observations.length > 4096
  )
    invalid();
  let original = null,
    admissions = 0;
  for (const row of trace.observations) {
    if (
      !exact(row, ['kind', 'context', 'caller']) ||
      !Number.isSafeInteger(row.context) ||
      row.context < 1
    )
      invalid();
    if (row.kind === 'original' && row.caller === 'original' && original === null)
      original = row.context;
    else if (
      row.kind === 'selection' &&
      row.caller === 'assertSelected' &&
      row.context === original
    )
      admissions++;
    else invalid();
  }
  if (original === null || !admissions || trace.selectionGuardOpens !== 2 * admissions) invalid();
  return {
    verified: false,
    operationalAuthority: 'unavailable',
    originalContexts: 1,
    matchingAdmissions: admissions,
    otherCalls: 0,
    legacySelectionGuardOpens: trace.selectionGuardOpens,
    normalizedAcquisitionsBeforeScope: admissions,
    projectedAcquisitionsAfterScope: 1,
    projectedRootQueriesRemoved: 2 * (admissions - 1),
    countThresholdMet: admissions >= 11,
    implementationAdmitted: false,
    completeWindowsRegistrationObserved: false,
    guaranteedStartupSavingMs: 0,
    observerExitObserved: true,
  };
}
export async function startSelectionAttribution(targets) {
  if (
    !Array.isArray(targets) ||
    !targets.length ||
    targets.length > 2 ||
    targets.some(
      (t) =>
        !['original', 'selection'].includes(t.kind) ||
        !['original', 'context'].includes(t.variable) ||
        typeof t.url !== 'string' ||
        !t.url.startsWith('file:') ||
        !Number.isSafeInteger(t.lineNumber) ||
        t.lineNumber < 0
    )
  )
    throw Error('selection-attribution-target-unavailable');
  const worker = new Worker(new URL('./selection-attribution-worker.mjs', import.meta.url), {
    execArgv: [],
    workerData: { targets },
  });
  const ready = once(worker, 'message');
  await Promise.race([ready, delay(5000, 'timeout', { ref: false })])
    .then((value) => {
      if (!Array.isArray(value) || value[0]?.kind !== 'ready')
        throw Error('selection-attribution-start-unavailable');
    })
    .catch(async (error) => {
      await worker.terminate();
      throw error;
    });
  let closed = false;
  return Object.freeze({
    async close() {
      if (closed) throw Error('selection-attribution-already-closed');
      closed = true;
      worker.ref();
      const reply = once(worker, 'message'),
        exit = once(worker, 'exit');
      worker.postMessage('stop');
      try {
        const value = await Promise.race([reply, delay(5000, null, { ref: false })]);
        if (!value || value[0]?.kind !== 'report')
          throw Error('selection-attribution-report-unavailable');
        const ended = await Promise.race([exit, delay(5000, null, { ref: false })]);
        if (!ended || ended[0] !== 0) throw Error('selection-attribution-exit-unavailable');
        return {
          verified: false,
          operationalAuthority: 'unavailable',
          observerExitObserved: true,
          unavailable: value[0].unavailable,
          observations: value[0].observations,
        };
      } catch (error) {
        await worker.terminate();
        throw error;
      }
    },
    unref() {
      worker.unref();
    },
  });
}
