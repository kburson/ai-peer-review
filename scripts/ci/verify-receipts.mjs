// @story #198
// Native verification consumes actual downloaded CI evidence only.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCIRun, validateReceipt } from './receipt-core.mjs';
export function verifyCloudReceipts({ projectDir = process.cwd() } = {}) {
  const execute = (command, args) =>
    execFileSync(command, args, { cwd: projectDir, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const git = (...args) => execute('git', args).trim();
  if (git('status', '--porcelain', '--untracked-files=all')) throw Error('receipt-dirty-source');
  const head = git('rev-parse', 'HEAD'),
    tree = git('rev-parse', 'HEAD^{tree}'),
    repository = 'kburson/ai-peer-review';
  if (
    ![
      'git@github.com:' + repository + '.git',
      'https://github.com/' + repository + '.git',
      'https://github.com/' + repository,
    ].includes(git('config', '--get', 'remote.origin.url'))
  )
    throw Error('receipt-origin-mismatch');
  const api = (endpoint) =>
    JSON.parse(execute('gh', ['api', 'repos/' + repository + '/' + endpoint]));
  const runs = api(
    'actions/workflows/ci.yml/runs?head_sha=' + head + '&per_page=100'
  ).workflow_runs;
  const run = runs.find((r) => r.event === 'pull_request') ?? runs[0];
  if (!run) throw Error('receipt-ci-unavailable');
  const jobs = api(
    'actions/runs/' + run.id + '/attempts/' + run.run_attempt + '/jobs?per_page=100'
  );
  validateCIRun(run, jobs, head);
  const artifacts = api('actions/runs/' + run.id + '/artifacts?per_page=100');
  if (artifacts.total_count !== artifacts.artifacts.length)
    throw Error('receipt-incomplete-artifacts');
  const workers = [
    { os: 'Linux', platform: 'linux' },
    { os: 'macOS', platform: 'darwin' },
    { os: 'Windows', platform: 'win32' },
  ];
  const names = workers.map((w) => 'apr-ci-node-24-' + w.os + '-24-' + run.run_attempt);
  for (const name of names) {
    const matches = artifacts.artifacts.filter((a) => a.name === name);
    if (matches.length !== 1 || matches[0].expired) throw Error('receipt-artifact-unavailable');
  }
  const base = path.join(projectDir, '.scratch', 'ci-receipts');
  mkdirSync(base, { recursive: true });
  const dir = mkdtempSync(path.join(base, run.id + '-' + run.run_attempt + '-'));
  writeFileSync(
    path.join(dir, 'provenance.json'),
    JSON.stringify({ head, tree, run, jobs, artifacts }, null, 2) + '\n'
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
  let testedHead;
  for (const [i, w] of workers.entries())
    for (const lane of ['fast', 'slow']) {
      const folder = path.join(dir, names[i]);
      const r = JSON.parse(readFileSync(path.join(folder, lane + '.json'), 'utf8'));
      validateReceipt(
        r,
        {
          sourceHead: head,
          testedTree: tree,
          runId: String(run.id),
          runAttempt: String(run.run_attempt),
          job: 'node-24',
          platform: w.platform,
          node: '24',
          command: lane === 'fast' ? 'npm test' : 'npm run test:slow',
        },
        readFileSync(path.join(folder, lane + '.log'))
      );
      if (testedHead && testedHead !== r.testedHead) throw Error('receipt-tested-head-mismatch');
      testedHead = r.testedHead;
    }
  const actual = api('git/commits/' + testedHead);
  if (
    actual.tree?.sha !== tree ||
    (run.event === 'pull_request' && !actual.parents?.some((p) => p.sha === head)) ||
    (run.event !== 'pull_request' && testedHead !== head)
  )
    throw Error('receipt-tested-commit-mismatch');
  if (git('rev-parse', 'HEAD') !== head || git('status', '--porcelain', '--untracked-files=all'))
    throw Error('receipt-source-changed');
  const receipt = {
    schema: 'ai-peer-review.hosted-tests-verified/v1',
    head,
    tree,
    runId: run.id,
    runAttempt: run.run_attempt,
    commands: ['npm test', 'npm run test:slow'],
    workers: 3,
    dir,
  };
  writeFileSync(path.join(dir, 'accepted.json'), JSON.stringify(receipt, null, 2) + '\n');
  return receipt;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  console.log(JSON.stringify(verifyCloudReceipts(), null, 2));
