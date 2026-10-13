// @story #190
// Unverified V8 metadata; counters cannot admit a runtime or Windows worker.
import { createHash } from 'node:crypto';
export const COST_CANDIDATE = '40a3e279d551719416eb750974fe30d011d6a37a';
const names = new Set([
  'inspect',
  'inspectAncestors',
  'inspectWindowsReadPair',
  'inspectPosixReadPair',
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
const unavailable = () => {
  throw Error('registration-cost-coverage-unavailable');
};
const integer = (v) => Number.isSafeInteger(v) && v >= 0 && v <= 1000000000;
function closed(value, keys) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join() !== [...keys].sort().join()
  )
    unavailable();
}
function checkCounters(counters, length = 1000000000) {
  if (!Array.isArray(counters) || counters.length < 2 || counters.length > names.size)
    unavailable();
  const seen = new Set();
  for (const item of counters) {
    closed(item, ['name', 'startOffset', 'endOffset', 'count']);
    if (
      !names.has(item.name) ||
      seen.has(item.name) ||
      !integer(item.count) ||
      !integer(item.startOffset) ||
      !integer(item.endOffset) ||
      item.endOffset <= item.startOffset ||
      item.endOffset > length
    )
      unavailable();
    seen.add(item.name);
  }
  if (!seen.has('inspect') || !seen.has('openProtectedRoot')) unavailable();
}
export function projectRegistrationCostCoverage({ coverage, source, expectedSourceSha256 }) {
  if (
    typeof source !== 'string' ||
    source.length > 1048576 ||
    !Array.isArray(coverage?.functions) ||
    coverage.functions.length > 4096
  )
    unavailable();
  const sourceSha256 = createHash('sha256').update(source).digest('hex');
  if (sourceSha256 !== expectedSourceSha256) unavailable();
  const counters = coverage.functions
    .filter((item) => names.has(item.functionName))
    .map((item) => {
      if (
        typeof item.isBlockCoverage !== 'boolean' ||
        !Array.isArray(item.ranges) ||
        !item.ranges.length ||
        item.ranges.length > 4096
      )
        unavailable();
      const first = item.ranges[0];
      // Debugger function-only coverage includes async resumptions. A positive
      // entry count needs precise block coverage; an unexecuted lazy function
      // may legitimately have one coarse range with a zero count.
      if (!item.isBlockCoverage && (item.ranges.length !== 1 || first.count !== 0)) unavailable();
      return {
        name: item.functionName,
        startOffset: first.startOffset,
        endOffset: first.endOffset,
        count: first.count,
      };
    })
    .sort((a, b) => a.startOffset - b.startOffset);
  checkCounters(counters, source.length);
  return { sourceSha256, counters };
}
export function validateRegistrationCostReport(value) {
  closed(value, [
    'schema',
    'verified',
    'operationalAuthority',
    'candidate',
    'producer',
    'platform',
    'node',
    'status',
    'exitCode',
    'childExitObserved',
    'registrationRecordObserved',
    'elapsedMs',
    'originalBudgetMs',
    'originalBudgetRenewed',
    'completeWindowsRegistrationObserved',
    'guaranteedStartupSavingMs',
    'cleanup',
    'sourceSha256',
    'counters',
  ]);
  if (
    value.schema !== 'ai-peer-review.registration-cost-observation/v1' ||
    value.verified !== false ||
    value.operationalAuthority !== 'unavailable' ||
    value.candidate !== COST_CANDIDATE ||
    !/^[a-f0-9]{40}$/.test(value.producer) ||
    value.platform !== 'linux' ||
    !/^(24|26)\.[0-9]+\.[0-9]+$/.test(value.node) ||
    value.status !== 'primary-returned' ||
    value.exitCode !== 0 ||
    value.childExitObserved !== true ||
    value.registrationRecordObserved !== true ||
    !integer(value.elapsedMs) ||
    value.elapsedMs >= 30000 ||
    value.originalBudgetMs !== 30000 ||
    value.originalBudgetRenewed !== false ||
    value.completeWindowsRegistrationObserved !== false ||
    value.guaranteedStartupSavingMs !== 0 ||
    value.cleanup !== 'retained-unproved' ||
    !/^[a-f0-9]{64}$/.test(value.sourceSha256)
  )
    unavailable();
  checkCounters(value.counters);
  return value;
}

// Principal calls on the complete unchanged Linux path bound Windows stock starts.
// This is a diagnostic count, not a Windows registration or worker approval.
export function projectSystemCostCoverage({ coverage, source, expectedSourceSha256 }) {
  if (
    typeof source !== 'string' ||
    source.length > 1048576 ||
    createHash('sha256').update(source).digest('hex') !== expectedSourceSha256 ||
    !Array.isArray(coverage?.functions)
  )
    unavailable();
  const names = new Set([
    'principal',
    'initializePortableSystem',
    'check',
    'canonicalPaths',
    'userId',
  ]);
  const counters = [];
  for (const item of coverage.functions) {
    if (!names.has(item.functionName)) continue;
    const first = item.ranges?.[0];
    if (
      !first ||
      !integer(first.count) ||
      !integer(first.startOffset) ||
      !integer(first.endOffset) ||
      first.endOffset > source.length ||
      (first.count > 0 && item.isBlockCoverage !== true) ||
      counters.some((row) => row.name === item.functionName)
    )
      unavailable();
    counters.push({ name: item.functionName, count: first.count });
  }
  if (
    !counters.some((row) => row.name === 'principal') ||
    !counters.some((row) => row.name === 'initializePortableSystem')
  )
    unavailable();
  return { sourceSha256: expectedSourceSha256, counters };
}
