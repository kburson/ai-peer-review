// @story #198
// Fixed installed candidate, actual OS identity. Raw streams stay private.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, realpath, writeFile } from 'node:fs/promises';
import { userInfo, release } from 'node:os';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { runNpm, parseNpmPackOutput } from './npm-command.mjs';
import { createProbeMeasurement } from './windows-probe-measurement-core.mjs';
import {
  MEASUREMENT_CANDIDATE,
  validateMeasurementReport,
} from './windows-probe-measurement-report.mjs';
const root = await realpath(fileURLToPath(new URL('../../', import.meta.url)));
const token = process.argv[2];
if (
  process.argv.length !== 3 ||
  !['ordinary', 'limited'].includes(token) ||
  process.platform !== 'win32' ||
  process.env.GITHUB_ACTIONS !== 'true' ||
  process.env.RUNNER_ENVIRONMENT !== 'github-hosted' ||
  process.env.GITHUB_REPOSITORY !== 'kburson/ai-peer-review' ||
  process.env.GITHUB_WORKFLOW !== 'Windows probe measurement' ||
  process.env.NODE_OPTIONS
)
  throw Error('measurement-host-unavailable');
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const producer = git(root, 'rev-parse', 'HEAD');
if (producer !== process.env.GITHUB_SHA) throw Error('measurement-producer-mismatch');
const candidate = await realpath(path.join(root, '.scratch/198-candidate'));
if (
  git(candidate, 'rev-parse', 'HEAD') !== MEASUREMENT_CANDIDATE ||
  git(candidate, 'status', '--porcelain')
)
  throw Error('measurement-candidate-mismatch');
const base = path.join(await realpath(userInfo().homedir), 'apr198-' + randomUUID());
await mkdir(base, { mode: 0o700 });
const output = path.join(root, '.scratch/198-measurement-public');
await mkdir(output, { recursive: true });
let collectionComplete = false,
  status = 'setup-refused',
  code = null,
  measurement = createProbeMeasurement().report();
try {
  const pack = parseNpmPackOutput(
    execFileSync(
      process.execPath,
      [path.join(candidate, 'scripts/pack-runtime.mjs'), '--json', '--pack-destination', base],
      { cwd: candidate, encoding: 'utf8', timeout: 120000 }
    ),
    { expectedPackageName: '@kburson/ai-peer-review', requireFilename: true }
  );
  const prefix = path.join(base, 'global');
  runNpm(
    'npm',
    [
      'install',
      '--global',
      '--prefix',
      prefix,
      '--omit=dev',
      '--ignore-scripts',
      '--offline',
      '--no-audit',
      '--no-fund',
      path.join(base, pack.filename),
    ],
    { encoding: 'utf8', stdio: 'pipe' }
  );
  const installed = await realpath(path.join(prefix, 'node_modules/@kburson/ai-peer-review'));
  const { bootstrapPortableInventory } = await import(
    pathToFileURL(path.join(installed, 'src/installed/portable-inventory.mjs')).href
  );
  await bootstrapPortableInventory();
  const project = path.join(base, 'project');
  await mkdir(project, { mode: 0o700 });
  execFileSync('git', ['init', '-b', 'trunk'], { cwd: project, stdio: 'ignore' });
  const cli = path.join(installed, 'bin/peer-review.mjs');
  execFileSync(process.execPath, [cli, 'register-runtime', '--json'], {
    cwd: project,
    stdio: 'pipe',
    timeout: 120000,
  });
  const started = performance.now();
  const child = spawnSync(
    process.execPath,
    [
      '--import',
      pathToFileURL(path.join(root, 'test/helpers/windows-probe-measurement-preload.mjs')).href,
      cli,
      'primary',
      'register',
      '--json',
    ],
    {
      cwd: project,
      encoding: 'utf8',
      timeout: 120000,
      maxBuffer: 2097152,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  const elapsedMs = Math.round(performance.now() - started);
  await writeFile(
    path.join(base, 'primary-private.log'),
    (child.stdout ?? '') + '\n' + (child.stderr ?? ''),
    { flag: 'wx' }
  );
  const lines = (child.stderr ?? '')
    .trim()
    .split(/\r?\n/)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
  const reports = lines.filter((v) => v.diagnostic === 'windows-probe-measurement');
  if (reports.length !== 1 || child.error || child.signal)
    throw Error('measurement-collection-incomplete');
  const measured = { ...reports[0] };
  delete measured.diagnostic;
  measurement = { ...measured, elapsedMs };
  measurement.requiredSavingPerRepeatMs = measurement.counts.removable
    ? Math.ceil(Math.max(0, elapsedMs - 30000) / measurement.counts.removable)
    : null;
  for (const line of (child.stdout ?? '').split(/\r?\n/)) {
    try {
      const v = JSON.parse(line);
      if (v.schema === 'ai-peer-review.error/v1' && /^APR_[A-Z_]{1,80}$/.test(v.code ?? ''))
        code = v.code;
    } catch {
      /* Private raw output stays private. */
    }
  }
  status = child.status === 0 ? 'primary-returned' : 'primary-refused';
  collectionComplete = true;
} catch (error) {
  await writeFile(path.join(base, 'setup-private.log'), String(error?.stack ?? error), {
    flag: 'wx',
  });
}
const report = {
  schema: 'ai-peer-review.windows-probe-measurement/v1',
  candidate: MEASUREMENT_CANDIDATE,
  producer,
  runId: process.env.GITHUB_RUN_ID,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT,
  job: process.env.GITHUB_JOB,
  node: process.versions.node,
  platform: process.platform,
  release: release(),
  token,
  collectionComplete,
  status,
  code,
  cleanup: 'retained-unproved',
  measurement,
};
await writeFile(path.join(output, 'measurement.json'), JSON.stringify(report, null, 2) + '\n', {
  flag: 'wx',
});
validateMeasurementReport(report, {
  producer,
  runId: process.env.GITHUB_RUN_ID,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT,
  token,
  node: process.versions.node.split('.')[0],
});
console.log('Unverified measurement collected; runtime and cleanup outcomes remain explicit.');
