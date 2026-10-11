// @story #198
export const MEASUREMENT_CANDIDATE = '40a3e279d551719416eb750974fe30d011d6a37a';
const fail = () => {
  throw Error('measurement-evidence-invalid');
};
function closed(v, keys) {
  if (
    !v ||
    typeof v !== 'object' ||
    Array.isArray(v) ||
    Object.keys(v).sort().join() !== [...keys].sort().join()
  )
    fail();
}
const integer = (v) => Number.isSafeInteger(v) && v >= 0;
export function validateMeasurementReport(r, expected) {
  closed(r, [
    'schema',
    'candidate',
    'producer',
    'runId',
    'runAttempt',
    'job',
    'node',
    'platform',
    'release',
    'token',
    'collectionComplete',
    'status',
    'code',
    'cleanup',
    'measurement',
  ]);
  if (
    r.schema !== 'ai-peer-review.windows-probe-measurement/v1' ||
    r.candidate !== MEASUREMENT_CANDIDATE ||
    r.producer !== expected.producer ||
    r.runId !== expected.runId ||
    r.runAttempt !== expected.runAttempt ||
    r.job !== 'probe' ||
    r.platform !== 'win32' ||
    r.release !== '10.0.26100' ||
    r.token !== expected.token ||
    !new RegExp('^' + expected.node + '\\.[0-9]+\\.[0-9]+$').test(r.node) ||
    r.collectionComplete !== true ||
    !['primary-refused', 'primary-returned'].includes(r.status) ||
    r.cleanup !== 'retained-unproved' ||
    (r.code !== null && !/^APR_[A-Z_]{1,80}$/.test(r.code))
  )
    fail();
  const m = r.measurement;
  closed(m, [
    'verified',
    'operationalAuthority',
    'calls',
    'counts',
    'truncated',
    'dropped',
    'originalBudgetMs',
    'elapsedMs',
    'residualStarts',
    'guaranteedSavedMs',
    'requiredSavingPerRepeatMs',
    'decision',
  ]);
  closed(m.counts, ['total', 'first', 'removable', 'outside']);
  if (
    m.verified !== false ||
    m.operationalAuthority !== 'unavailable' ||
    m.originalBudgetMs !== 30000 ||
    m.guaranteedSavedMs !== 0 ||
    m.decision !== 'insufficient-evidence' ||
    !integer(m.elapsedMs) ||
    typeof m.truncated !== 'boolean' ||
    !integer(m.dropped) ||
    !Array.isArray(m.calls) ||
    m.calls.length > 4096
  )
    fail();
  const seen = new Map();
  let first = 0,
    removable = 0;
  for (const [index, c] of m.calls.entries()) {
    closed(c, ['id', 'kind', 'context', 'guard', 'elapsedMs', 'success', 'category']);
    if (
      c.id !== index + 1 ||
      !['observe', 'provision', 'replacement', 'principal', 'other'].includes(c.kind) ||
      !(c.context === null || (integer(c.context) && c.context > 0)) ||
      !(c.guard === null || (integer(c.guard) && c.guard > 0)) ||
      !integer(c.elapsedMs) ||
      typeof c.success !== 'boolean' ||
      !['outside', 'first', 'removable'].includes(c.category)
    )
      fail();
    if (c.category !== 'outside') {
      if (
        m.truncated ||
        c.kind !== 'observe' ||
        !c.success ||
        c.guard === null ||
        c.context === null
      )
        fail();
      const key = c.guard + ':' + c.context;
      if (c.category === 'first') {
        if (seen.has(key)) fail();
        seen.set(key, true);
        first++;
      } else {
        if (!seen.has(key)) fail();
        removable++;
      }
    }
  }
  const total = m.calls.length + m.dropped;
  if (
    m.truncated !== m.dropped > 0 ||
    m.counts.total !== total ||
    m.counts.first !== first ||
    m.counts.removable !== removable ||
    m.counts.outside !== total - first - removable ||
    m.residualStarts !== total - removable ||
    m.requiredSavingPerRepeatMs !==
      (removable ? Math.ceil(Math.max(0, m.elapsedMs - 30000) / removable) : null)
  )
    fail();
  return r;
}

export function measurementWorkers() {
  return ['24', '26'].flatMap((node) =>
    ['ordinary', 'limited'].map((token) => ({
      node,
      token,
      key: node + '-' + token,
      name: 'Windows probes / Node ' + node + ' / ' + token,
    }))
  );
}
export function validateMeasurementProvenance({ run, jobs, artifacts }, producer) {
  if (
    !run ||
    run.repository?.full_name !== 'kburson/ai-peer-review' ||
    run.head_sha !== producer ||
    run.status !== 'completed' ||
    run.conclusion !== 'success' ||
    run.path !== '.github/workflows/windows-probe-measurement.yml' ||
    !['push', 'workflow_dispatch'].includes(run.event) ||
    !['codex/198-draft', 'trunk'].includes(run.head_branch) ||
    !Number.isSafeInteger(run.id) ||
    !Number.isSafeInteger(run.run_attempt) ||
    run.run_attempt < 1
  )
    fail();
  const workers = measurementWorkers();
  if (
    !jobs ||
    jobs.total_count !== 4 ||
    jobs.jobs?.length !== 4 ||
    !artifacts ||
    artifacts.total_count !== 4 ||
    artifacts.artifacts?.length !== 4
  )
    fail();
  for (const w of workers) {
    const matches = jobs.jobs.filter((j) => j.name === w.name);
    if (
      matches.length !== 1 ||
      matches[0].status !== 'completed' ||
      matches[0].conclusion !== 'success' ||
      matches[0].run_id !== run.id ||
      matches[0].run_attempt !== run.run_attempt
    )
      fail();
    const aa = artifacts.artifacts.filter(
      (a) => a.name === 'windows-probes-' + w.key + '-' + run.run_attempt
    );
    if (aa.length !== 1 || aa[0].expired || !Number.isSafeInteger(aa[0].id)) fail();
  }
  return workers;
}
