// @story #140
// Repository-only CI evidence; these scripts are excluded from the public package.
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';

export const LANES = Object.freeze({
  fast: { command: ['npm', 'test'], directories: ['unit', 'golden'] },
  integration: { command: ['npm', 'run', 'test:integration'], directories: ['integration'] },
  mcp: { command: ['npm', 'run', 'test:mcp'], directories: ['mcp'] },
  packaging: { command: ['npm', 'run', 'test:packaging'], directories: ['packaging'] },
  smoke: { command: ['npm', 'run', 'test:smoke'], directories: ['smoke'] },
  'portable-ownership': {
    command: ['node', '--test', 'test/integration/portable-ownership.test.mjs'],
    files: ['test/integration/portable-ownership.test.mjs'],
  },
  'owner-publication': {
    command: ['node', '--test', 'test/integration/owner-publication.test.mjs'],
    files: ['test/integration/owner-publication.test.mjs'],
  },
});
// Windows keeps the existing baseline on its own runner. Every partition binds
// their actual command and exact inventory to the same complete source fingerprint.
export function laneCommand(lane, runnerOS) {
  if (!LANES[lane]) fail('lane');
  return lane === 'integration' && runnerOS === 'Windows'
    ? [
        'node',
        'test/helpers/run-suite.mjs',
        'integration',
        '--exclude-owner-publication',
        '--exclude-portable-ownership',
      ]
    : LANES[lane].command;
}
export function laneInventory(files, lane, runnerOS) {
  const definition = LANES[lane];
  if (!definition) fail('lane');
  return Object.fromEntries(
    Object.entries(files).filter(([file]) =>
      definition.files
        ? definition.files.includes(file)
        : definition.directories.some(
            (dir) => file.startsWith('test/' + dir + '/') && file.endsWith('.test.mjs')
          ) &&
          !(
            lane === 'integration' &&
            runnerOS === 'Windows' &&
            [
              'test/integration/owner-publication.test.mjs',
              'test/integration/portable-ownership.test.mjs',
            ].includes(file)
          )
    )
  );
}
export function fail(reason) {
  throw new Error('ci-receipt: ' + reason);
}
export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}
export function validateCloudRun(run, { repository, sourceHead }) {
  if (
    run?.repository?.full_name !== repository ||
    run.head_sha !== sourceHead ||
    run.path !== '.github/workflows/ci.yml' ||
    run.status !== 'completed' ||
    run.conclusion !== 'success' ||
    !['push', 'pull_request', 'workflow_dispatch'].includes(run.event) ||
    !Number.isSafeInteger(run.id) ||
    run.id < 1 ||
    !Number.isSafeInteger(run.run_attempt) ||
    run.run_attempt < 1
  )
    fail('run identity or outcome');
  return true;
}
export function validateLaneReceipt(record, expected) {
  if (
    !LANES[expected.lane] ||
    record?.schema !== 'apr.ci-test-lane/v1' ||
    record.lane !== expected.lane ||
    record.exitCode !== 0 ||
    record.signal !== null
  )
    fail('lane or child outcome');
  for (const key of [
    'repository',
    'sourceHead',
    'testedCommit',
    'runId',
    'runAttempt',
    'jobKey',
    'matrixNode',
    'runnerOS',
  ])
    if (record[key] !== expected[key]) fail('identity ' + key);
  if (
    !isDeepStrictEqual(record.command, laneCommand(expected.lane, expected.runnerOS)) ||
    !isDeepStrictEqual(record.fingerprint, expected.fingerprint) ||
    !isDeepStrictEqual(record.inventory, expected.inventory) ||
    !Object.keys(record.inventory).length
  )
    fail('command or source inventory');
  const major = /^v(\d+)\.\d+\.\d+$/.exec(record.node ?? '');
  if (
    !major ||
    Number(major[1]) < 24 ||
    (expected.matrixNode !== 'current' && major[1] !== expected.matrixNode) ||
    record.platform !== { Linux: 'linux', macOS: 'darwin', Windows: 'win32' }[expected.runnerOS] ||
    !['x64', 'arm64'].includes(record.arch)
  )
    fail('runtime');
  const start = Date.parse(record.startedAt),
    end = Date.parse(record.finishedAt);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end < start ||
    record.durationMs !== end - start
  )
    fail('execution time');
  if (!expected.log?.length || record.logSha256 !== sha256(expected.log)) fail('raw output');
  return true;
}
export function captureCommand(command, args, { cwd = process.cwd(), env = process.env } = {}) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, {
    cwd,
    env,
    shell: command === 'npm' && process.platform === 'win32',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 800000,
  });
  const finishedAt = new Date().toISOString();
  return {
    startedAt,
    finishedAt,
    durationMs: Date.parse(finishedAt) - Date.parse(startedAt),
    exitCode: result.status,
    signal: result.signal,
    error: result.error?.message ?? null,
    output: Buffer.concat([result.stdout ?? Buffer.alloc(0), result.stderr ?? Buffer.alloc(0)]),
  };
}
export function projectState(projectDir = process.cwd()) {
  const git = (...args) =>
    execFileSync('git', args, { cwd: projectDir, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (git('status', '--porcelain').trim()) fail('dirty source');
  // Git blob identities are stable across LF/CRLF checkouts. Clean-tree checks
  // before and after execution tie the actual checkout to these committed bytes.
  const files = Object.fromEntries(
    git('ls-files', '--stage', '-z')
      .split('\0')
      .filter(Boolean)
      .map((line) => {
        const match = /^(\d+) ([a-f0-9]{40}) 0\t(.+)$/.exec(line);
        if (!match) fail('unmerged index');
        return [match[3], match[2]];
      })
  );
  const fingerprint = files;
  const inventories = Object.fromEntries(
    Object.keys(LANES).map((lane) => [lane, laneInventory(files, lane)])
  );
  if (Object.values(inventories).some((inventory) => !Object.keys(inventory).length))
    fail('empty lane inventory');
  return { head: git('rev-parse', 'HEAD').trim(), fingerprint, inventories };
}

export function validateRequiredJob(jobs, { name, lanes }) {
  const matches = jobs.filter((job) => job.name === name);
  if (
    matches.length !== 1 ||
    matches[0].status !== 'completed' ||
    matches[0].conclusion !== 'success'
  )
    fail('missing, duplicate or unsuccessful job ' + name);
  for (const lane of lanes) {
    const steps = matches[0].steps.filter((step) => step.name === 'Verify tests: ' + lane);
    if (steps.length !== 1 || steps[0].conclusion !== 'success') fail('test step ' + lane);
  }
  return true;
}
export function validateTestedCommit(commit, { sourceHead, event, commitObject }) {
  if (!/^[a-f0-9]{40}$/.test(commit ?? '')) fail('tested commit');
  if (commit === sourceHead) return true;
  if (
    event !== 'pull_request' ||
    commitObject?.sha !== commit ||
    commitObject.parents?.length !== 2 ||
    !commitObject.parents.some((parent) => parent.sha === sourceHead)
  )
    fail('tested merge provenance');
  return true;
}
