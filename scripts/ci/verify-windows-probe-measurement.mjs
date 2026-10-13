// @story #198
// Read actual GitHub metadata and freshly download sanitized diagnostics.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateMeasurementReport,
  validateMeasurementProvenance,
} from '../../test/helpers/windows-probe-measurement-report.mjs';
export function verifyWindowsProbeMeasurement({ projectDir = process.cwd() } = {}) {
  const execute = (command, args) =>
    execFileSync(command, args, { cwd: projectDir, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const producer = execute('git', ['rev-parse', 'HEAD']).trim();
  const repository = 'kburson/ai-peer-review';
  const remote = execute('git', ['config', '--get', 'remote.origin.url']).trim();
  if (
    ![
      'git@github.com:' + repository + '.git',
      'https://github.com/' + repository + '.git',
      'https://github.com/' + repository,
    ].includes(remote)
  )
    throw Error('measurement-origin-mismatch');
  const api = (endpoint) =>
    JSON.parse(execute('gh', ['api', 'repos/' + repository + '/' + endpoint]));
  const runs = api(
    'actions/workflows/windows-probe-measurement.yml/runs?head_sha=' + producer + '&per_page=100'
  ).workflow_runs;
  const run = runs[0];
  if (!run) throw Error('measurement-run-unavailable');
  const jobs = api(
    'actions/runs/' + run.id + '/attempts/' + run.run_attempt + '/jobs?per_page=100'
  );
  const artifacts = api('actions/runs/' + run.id + '/artifacts?per_page=100');
  const workers = validateMeasurementProvenance({ run, jobs, artifacts }, producer);
  const base = path.join(projectDir, '.scratch/198-measurement-receipts');
  mkdirSync(base, { recursive: true });
  const dir = mkdtempSync(path.join(base, run.id + '-' + run.run_attempt + '-'));
  writeFileSync(
    path.join(dir, 'provenance.json'),
    JSON.stringify({ producer, run, jobs, artifacts }, null, 2) + '\n'
  );
  const names = workers.map((w) => 'windows-probes-' + w.key + '-' + run.run_attempt);
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
  const reports = workers.map((w, i) =>
    validateMeasurementReport(
      JSON.parse(readFileSync(path.join(dir, names[i], 'measurement.json'), 'utf8')),
      {
        producer,
        runId: String(run.id),
        runAttempt: String(run.run_attempt),
        node: w.node,
        token: w.token,
      }
    )
  );
  const result = {
    schema: 'ai-peer-review.windows-probe-download/v1',
    verified: false,
    operationalAuthority: 'unavailable',
    producer,
    runId: String(run.id),
    runAttempt: String(run.run_attempt),
    reports,
    dir,
  };
  writeFileSync(
    path.join(dir, 'verified-provenance-unverified-diagnostics.json'),
    JSON.stringify(result, null, 2) + '\n'
  );
  return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  console.log(JSON.stringify(verifyWindowsProbeMeasurement(), null, 2));
