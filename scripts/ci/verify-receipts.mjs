// @story #140
// Read successful GitHub CI and freshly download evidence; never run host suites.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  OWNER_PUBLICATION_GROUPS,
  laneInventory,
  fail,
  projectState,
  validateCloudRun,
  validateLaneReceipt,
  validateRequiredJob,
  validateTestedCommit,
} from './receipt.mjs';

import { WINDOWS_PORTABLE_UNIT_GROUPS } from '../../test/helpers/suite-plan.mjs';

const OS = { 'ubuntu-latest': 'Linux', 'macos-latest': 'macOS', 'windows-latest': 'Windows' };
const baselineLanes = ['fast', 'integration', 'mcp', 'packaging', 'smoke'];
export function workers() {
  const result = [];
  for (const [os, runnerOS] of Object.entries(OS)) {
    result.push({ key: 'node-24-24-' + os, name: 'Node 24 / ' + os, matrixNode: '24', runnerOS });
    for (const node of ['26', 'current'])
      result.push({
        key: 'preferred-node-' + node + '-' + os,
        name: 'Node ' + node + ' / ' + (os === 'ubuntu-latest' ? 'Ubuntu' : os),
        matrixNode: node,
        runnerOS,
      });
  }
  result.push({
    key: 'phase-2-boundary-26-ubuntu-latest',
    name: 'Phase 2 boundary',
    matrixNode: '26',
    runnerOS: 'Linux',
  });
  for (const worker of result) worker.lanes = baselineLanes;
  for (const node of ['24', '26', 'current'])
    for (const group of OWNER_PUBLICATION_GROUPS)
      result.push({
        key: 'owner-publication-' + group + '-' + node + '-windows-latest',
        name: 'Owner publication ' + group + ' / Node ' + node + ' / windows-latest',
        matrixNode: node,
        runnerOS: 'Windows',
        lanes: ['owner-publication-' + group],
      });
  for (const node of ['24', '26', 'current'])
    result.push({
      key: 'portable-ownership-' + node + '-windows-latest',
      name: 'Portable ownership / Node ' + node + ' / windows-latest',
      matrixNode: node,
      runnerOS: 'Windows',
      lanes: ['portable-ownership'],
    });
  for (const node of ['24', '26', 'current'])
    for (const group of WINDOWS_PORTABLE_UNIT_GROUPS)
      result.push({
        key: 'portable-unit-' + group + '-' + node + '-windows-latest',
        name: 'Portable units / ' + group + ' / Node ' + node + ' / windows-latest',
        matrixNode: node,
        runnerOS: 'Windows',
        lanes: ['portable-unit-' + group],
      });
  return result;
}
export function verificationLanes(mode = 'all') {
  if (!['all', 'fast', 'slow'].includes(mode)) fail('mode');
  const required = [...new Set(workers().flatMap((worker) => worker.lanes))];
  const isFast = (lane) => lane === 'fast' || lane.startsWith('portable-unit-');
  return mode === 'all'
    ? required
    : required.filter((lane) => (mode === 'fast' ? isFast(lane) : !isFast(lane)));
}
export function verifyCloudReceipts({ projectDir = process.cwd(), mode = 'all' } = {}) {
  if (!['all', 'fast', 'slow'].includes(mode)) fail('mode');
  const lanes = verificationLanes(mode);
  const execute = (command, args) =>
    execFileSync(command, args, { cwd: projectDir, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const state = projectState(projectDir);
  const repository = JSON.parse(
    readFileSync(path.join(projectDir, '.ai-task-manager/task-tracker.json'), 'utf8')
  ).repo;
  if (repository !== 'kburson/ai-peer-review') fail('repository');
  const api = (...parts) =>
    JSON.parse(execute('gh', ['api', ['repos', repository, ...parts].join('/')]));
  const remote = execute('git', ['config', '--get', 'remote.origin.url']).trim();
  if (
    ![
      'https://github.com/' + repository + '.git',
      'https://github.com/' + repository,
      'git@github.com:' + repository + '.git',
    ].includes(remote)
  )
    fail('origin identity');
  const runs = api(
    'actions',
    'workflows',
    'ci.yml',
    'runs?head_sha=' + state.head + '&per_page=100'
  ).workflow_runs;
  // An older passing attempt cannot mask the latest PR run's failure.
  const run = runs.find((item) => item.event === 'pull_request') ?? runs[0];
  validateCloudRun(run, { repository, sourceHead: state.head });
  const jobs = api('actions', 'runs', run.id, 'attempts', run.run_attempt, 'jobs?per_page=100');
  if (jobs.total_count !== jobs.jobs.length) fail('incomplete job inventory');
  const expectedWorkers = workers();
  for (const worker of expectedWorkers)
    validateRequiredJob(jobs.jobs, { name: worker.name, lanes: worker.lanes });
  const artifacts = api('actions', 'runs', run.id, 'artifacts?per_page=100');
  if (artifacts.total_count !== artifacts.artifacts.length) fail('incomplete artifact inventory');
  const names = expectedWorkers.map((worker) => 'apr-ci-' + worker.key + '-' + run.run_attempt);
  for (const name of names) {
    const matches = artifacts.artifacts.filter((artifact) => artifact.name === name);
    if (matches.length !== 1 || matches[0].expired)
      fail('missing, duplicate or expired artifact ' + name);
  }
  const root = path.join(projectDir, '.scratch', 'ci-receipts');
  mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(path.join(root, run.id + '-' + run.run_attempt + '-'));
  writeFileSync(
    path.join(dir, 'provenance.json'),
    JSON.stringify({ repository, sourceHead: state.head, run, jobs, artifacts }, null, 2) + '\n'
  );
  execute('gh', [
    'run',
    'download',
    String(run.id),
    '--repo',
    repository,
    '--dir',
    dir,
    ...names.flatMap((name) => ['--name', name]),
  ]);
  let commit;
  let records = 0;
  for (const worker of expectedWorkers) {
    for (const lane of worker.lanes.filter((lane) => lanes.includes(lane))) {
      const location = path.join(dir, 'apr-ci-' + worker.key + '-' + run.run_attempt);
      const record = JSON.parse(readFileSync(path.join(location, lane + '.json'), 'utf8'));
      if (commit === undefined) commit = record.testedCommit;
      validateLaneReceipt(record, {
        repository,
        sourceHead: state.head,
        testedCommit: commit,
        runId: String(run.id),
        runAttempt: String(run.run_attempt),
        jobKey: worker.key,
        matrixNode: worker.matrixNode,
        runnerOS: worker.runnerOS,
        lane,
        fingerprint: state.fingerprint,
        inventory: laneInventory(state.fingerprint, lane, worker.runnerOS),
        log: readFileSync(path.join(location, lane + '.log')),
      });
      records++;
    }
  }
  validateTestedCommit(commit, {
    sourceHead: state.head,
    event: run.event,
    commitObject: commit === state.head ? null : api('git', 'commits', commit),
  });
  return {
    sourceHead: state.head,
    testedCommit: commit,
    runId: run.id,
    runAttempt: run.run_attempt,
    workers: expectedWorkers.length,
    records,
    lanes,
    runUrl: run.html_url,
    artifactDirectory: dir,
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--lane'))
    fail('usage: verify-receipts [--lane fast|slow]');
  console.log(JSON.stringify(verifyCloudReceipts({ mode: args[1] ?? 'all' }), null, 2));
}
