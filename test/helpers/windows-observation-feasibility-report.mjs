// @story #190
// Closed diagnostic data. No source admission, worker grant or complete forecast.
const fields = [
  'schema',
  'verified',
  'operationalAuthority',
  'producer',
  'sourceScriptSha256',
  'platform',
  'arch',
  'osRelease',
  'administratorMember',
  'administratorEffective',
  'node',
  'token',
  'samples',
  'coldFirstQueryMs',
  'oneShotMs',
  'batchQueryMs',
  'completeRecordsEqual',
  'aclChangeObserved',
  'aclRestored',
  'childExitObserved',
  'completeRegistrationObserved',
  'parentLossProved',
  'guaranteedStartupSavingMs',
].sort();
export function validateObservationFeasibilityReport(value) {
  const timing = (n) => Number.isFinite(n) && n >= 0 && n <= 15000;
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join('|') !== fields.join('|') ||
    value.schema !== 'ai-peer-review.windows-observation-feasibility/v1' ||
    value.verified !== false ||
    value.operationalAuthority !== 'unavailable' ||
    !/^[a-f0-9]{40}$/.test(value.producer ?? '') ||
    !/^[a-f0-9]{64}$/.test(value.sourceScriptSha256 ?? '') ||
    !/^(?:24|26)\.[0-9]+\.[0-9]+$/.test(value.node ?? '') ||
    value.platform !== 'win32' ||
    value.arch !== 'x64' ||
    typeof value.osRelease !== 'string' ||
    value.osRelease.length > 32 ||
    !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(value.osRelease) ||
    typeof value.administratorMember !== 'boolean' ||
    typeof value.administratorEffective !== 'boolean' ||
    (value.token === 'limited' && (value.administratorMember || value.administratorEffective)) ||
    !['ordinary', 'limited'].includes(value.token) ||
    value.samples !== 10 ||
    !timing(value.coldFirstQueryMs) ||
    ![value.oneShotMs, value.batchQueryMs].every(
      (rows) =>
        Array.isArray(rows) &&
        rows.length === 10 &&
        Object.keys(rows).join(',') === '0,1,2,3,4,5,6,7,8,9' &&
        rows.every(timing)
    ) ||
    !['completeRecordsEqual', 'aclChangeObserved', 'aclRestored', 'childExitObserved'].every(
      (key) => typeof value[key] === 'boolean'
    ) ||
    value.completeRegistrationObserved !== false ||
    value.parentLossProved !== false ||
    value.guaranteedStartupSavingMs !== 0
  )
    throw Error('observation-feasibility-report-invalid');
  return value;
}
const failureStages = new Set([
  'setup',
  'one-shot',
  'batch',
  'decode',
  'validate',
  'restore',
  'publish',
]);
const failureReasons = new Set([
  'observation-feasibility-batch-refused',
  'observation-feasibility-exit-unproved',
  'observation-feasibility-output-bound',
  'observation-feasibility-input-refused',
  'observation-feasibility-output-shape',
  'observation-feasibility-record-unavailable',
  'observation-feasibility-report-invalid',
  'observation-feasibility-restoration-unproved',
]);
export function observationFeasibilityFailure(error, stage) {
  return {
    stage: failureStages.has(stage) ? stage : 'unavailable',
    reason: failureReasons.has(error?.message) ? error.message : 'unavailable',
    errorKind: ['Error', 'SyntaxError', 'TypeError'].includes(error?.name) ? error.name : 'Error',
  };
}
