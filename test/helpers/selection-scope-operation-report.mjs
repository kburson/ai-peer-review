// @story #190
// Closed diagnostic projection. Data never becomes installed/source membership.
const exact = (value, fields) =>
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).sort().join() === [...fields].sort().join();
const fail = () => {
  throw Error('selection-scope-diagnostic-invalid');
};
export function summarizeScopeOperation(trace, mode) {
  if (
    !['scoped', 'unscoped'].includes(mode) ||
    !exact(trace, [
      'verified',
      'operationalAuthority',
      'observerExitObserved',
      'unavailable',
      'observations',
      'acquisitions',
      'freshSnapshots',
      'descriptorsClosed',
      'operationExitObserved',
    ]) ||
    trace.verified !== false ||
    trace.operationalAuthority !== 'unavailable' ||
    !['observerExitObserved', 'operationExitObserved'].every(
      (key) => typeof trace[key] === 'boolean'
    ) ||
    !['unavailable', 'acquisitions', 'freshSnapshots', 'descriptorsClosed'].every(
      (key) => Number.isSafeInteger(trace[key]) && trace[key] >= 0
    ) ||
    !Array.isArray(trace.observations) ||
    trace.observations.length > 4096
  )
    fail();
  let original = null,
    originals = 0,
    matchingAdmissions = 0,
    otherCalls = 0;
  for (const row of trace.observations) {
    if (
      !exact(row, ['kind', 'context', 'caller']) ||
      !Number.isSafeInteger(row.context) ||
      row.context < 1 ||
      !['original', 'selection'].includes(row.kind) ||
      !['original', 'assertSelected', 'read', 'register', 'location', 'fixture'].includes(
        row.caller
      )
    )
      fail();
    if (row.kind === 'original' && row.caller === 'original') {
      originals++;
      original ??= row.context;
    } else if (
      row.kind === 'selection' &&
      row.context === original &&
      row.caller === 'assertSelected'
    )
      matchingAdmissions++;
    else otherCalls++;
  }
  const comparisonMatched =
    originals === 1 &&
    matchingAdmissions === 16 &&
    otherCalls === 0 &&
    trace.unavailable === 0 &&
    trace.acquisitions === (mode === 'scoped' ? 1 : 16) &&
    trace.freshSnapshots === 32 &&
    trace.descriptorsClosed === trace.acquisitions &&
    trace.observerExitObserved &&
    trace.operationExitObserved;
  return Object.freeze({
    verified: false,
    operationalAuthority: 'unavailable',
    mode,
    matchingAdmissions,
    otherCalls,
    originalContexts: originals,
    acquisitions: trace.acquisitions,
    freshSnapshots: trace.freshSnapshots,
    descriptorsClosed: trace.descriptorsClosed,
    unavailable: trace.unavailable,
    observerExitObserved: trace.observerExitObserved,
    operationExitObserved: trace.operationExitObserved,
    comparisonMatched,
    guaranteedStartupSavingMs: 0,
  });
}

export function compareScopeOperationReports(unscoped, scoped) {
  const expected = new Map([
    ['observeStorageProtection', 15],
    ['openProtectedRoot', 15],
    ['inspect', 30],
    ['inspectAncestors', 30],
  ]);
  const known = new Set([
    'inspect',
    'inspectAncestors',
    'inspectWindowsReadPair',
    'windowsProbe',
    'observeStorageProtection',
    'provisionProtectedRoot',
    'prepareParent',
    'openProtectedRoot',
    'verify',
    'readObserved',
    'matchFile',
    'createFile',
    'writeExclusive',
    'replace',
    'readSnapshot',
    'withElectionLease',
    'createOwnedPublication',
    'listOwnedPublications',
    'windowsReplaceFile',
  ]);
  const maps = [unscoped, scoped].map((value) => {
    if (
      !exact(value, ['report', 'coverage']) ||
      !exact(value.coverage, ['sourceSha256', 'counters']) ||
      !/^[a-f0-9]{64}$/.test(value.coverage.sourceSha256) ||
      !Array.isArray(value.coverage.counters) ||
      value.coverage.counters.length > known.size
    )
      fail();
    const map = new Map();
    for (const row of value.coverage.counters) {
      if (
        !exact(row, ['name', 'startOffset', 'endOffset', 'count']) ||
        !known.has(row.name) ||
        map.has(row.name) ||
        !['startOffset', 'endOffset', 'count'].every(
          (key) => Number.isSafeInteger(row[key]) && row[key] >= 0
        ) ||
        row.endOffset <= row.startOffset
      )
        fail();
      map.set(row.name, row);
    }
    return map;
  });
  const coverageMatched =
    unscoped.coverage.sourceSha256 === scoped.coverage.sourceSha256 &&
    maps[0].size === maps[1].size &&
    [...expected.keys(), 'readSnapshot', 'verify'].every((name) =>
      maps.every((map) => map.has(name))
    ) &&
    [...maps[0]].every(([name, before]) => {
      const after = maps[1].get(name);
      return (
        after &&
        before.startOffset === after.startOffset &&
        before.endOffset === after.endOffset &&
        before.count - after.count === (expected.get(name) ?? 0)
      );
    });
  return Object.freeze({
    verified: false,
    operationalAuthority: 'unavailable',
    comparisonMatched: Boolean(
      unscoped.report.mode === 'unscoped' &&
      scoped.report.mode === 'scoped' &&
      unscoped.report.comparisonMatched &&
      scoped.report.comparisonMatched &&
      coverageMatched
    ),
    coverageMatched,
    guaranteedStartupSavingMs: 0,
  });
}
