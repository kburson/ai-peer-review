// @story #198
import { createHash } from 'node:crypto';
const fail = () => {
  throw Error('hosted-receipt-invalid');
};
export const requiredCIJobs = [
  'Node 24 / ubuntu-latest',
  'Node 24 / macos-latest',
  'Node 24 / windows-latest',
  'Node 26 / Ubuntu',
  'Node 26 / macos-latest',
  'Node 26 / windows-latest',
  'Node current / Ubuntu',
  'Node current / macos-latest',
  'Node current / windows-latest',
  'npm 11.8.0 / Node 24',
  'npm 12.0.2 / Node 26',
  'Phase 2 boundary',
];
export function validateCIRun(run, jobs, head) {
  if (
    run?.repository?.full_name !== 'kburson/ai-peer-review' ||
    run.head_sha !== head ||
    run.status !== 'completed' ||
    run.conclusion !== 'success' ||
    run.path !== '.github/workflows/ci.yml' ||
    !['push', 'pull_request', 'workflow_dispatch'].includes(run.event) ||
    !Number.isSafeInteger(run.id) ||
    !Number.isSafeInteger(run.run_attempt) ||
    run.run_attempt < 1 ||
    jobs?.total_count !== jobs?.jobs?.length
  )
    fail();
  for (const name of requiredCIJobs) {
    const matches = jobs.jobs.filter((j) => j.name === name);
    if (
      matches.length !== 1 ||
      matches[0].status !== 'completed' ||
      matches[0].conclusion !== 'success' ||
      matches[0].run_id !== run.id ||
      matches[0].run_attempt !== run.run_attempt
    )
      fail();
  }
  if (
    jobs.jobs.some(
      (j) => !requiredCIJobs.includes(j.name) && j.name !== 'Optional live-provider probe'
    )
  )
    fail();
  return true;
}
export function validateReceipt(r, expected, log) {
  const keys = [
    'schema',
    'repository',
    'sourceHead',
    'testedHead',
    'testedTree',
    'runId',
    'runAttempt',
    'job',
    'platform',
    'node',
    'command',
    'exitCode',
    'signal',
    'logSha256',
  ];
  if (
    !r ||
    Object.keys(r).sort().join() !== keys.sort().join() ||
    r.schema !== 'ai-peer-review.ci-command-receipt/v1' ||
    r.repository !== 'kburson/ai-peer-review' ||
    !/^[0-9a-f]{40}$/.test(r.testedHead) ||
    r.sourceHead !== expected.sourceHead ||
    r.testedTree !== expected.testedTree ||
    r.runId !== expected.runId ||
    r.runAttempt !== expected.runAttempt ||
    r.job !== expected.job ||
    r.platform !== expected.platform ||
    !new RegExp('^' + expected.node + '\\.[0-9]+\\.[0-9]+$').test(r.node) ||
    r.command !== expected.command ||
    r.exitCode !== 0 ||
    r.signal !== null ||
    r.logSha256 !== createHash('sha256').update(log).digest('hex') ||
    !Buffer.isBuffer(log) ||
    !log.length
  )
    fail();
  return r;
}
