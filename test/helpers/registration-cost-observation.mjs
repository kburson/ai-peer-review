// @story #190
// Original installed candidate, original commands/budgets; passive V8 metadata only.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, realpath, readFile, writeFile, stat } from 'node:fs/promises';
import { userInfo } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { runNpm, parseNpmPackOutput } from './npm-command.mjs';
import { summarizeSelectionAttribution } from './selection-attribution.mjs';
import {
  COST_CANDIDATE,
  projectRegistrationCostCoverage,
  projectSystemCostCoverage,
  validateRegistrationCostReport,
} from './registration-cost-coverage.mjs';
const root = await realpath(fileURLToPath(new URL('../../', import.meta.url)));
if (
  process.argv.length !== 2 ||
  process.platform !== 'linux' ||
  process.env.GITHUB_ACTIONS !== 'true' ||
  process.env.RUNNER_ENVIRONMENT !== 'github-hosted' ||
  process.env.GITHUB_REPOSITORY !== 'kburson/ai-peer-review' ||
  process.env.GITHUB_WORKFLOW !== 'Registration cost observations' ||
  process.env.GITHUB_REF_NAME !== 'codex/190-installed-journeys' ||
  process.env.NODE_OPTIONS ||
  process.env.NODE_V8_COVERAGE
)
  throw Error('registration-cost-host-unavailable');
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const producer = git(root, 'rev-parse', 'HEAD');
if (producer !== process.env.GITHUB_SHA) throw Error('registration-cost-producer-unavailable');
const candidate = await realpath(path.join(root, '.scratch/190-cost-candidate'));
if (
  git(candidate, 'rev-parse', 'HEAD') !== COST_CANDIDATE ||
  git(candidate, 'status', '--porcelain')
)
  throw Error('registration-cost-candidate-unavailable');
const output = path.join(root, '.scratch/190-registration-cost-public');
await mkdir(output, { recursive: true });
const base = path.join(await realpath(userInfo().homedir), 'apr190-cost-' + randomUUID());
await mkdir(base, { mode: 0o700 });
let stage = 'setup',
  exitCode = null,
  childExitObserved = false;
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
  const installed = await realpath(path.join(prefix, 'lib/node_modules/@kburson/ai-peer-review'));
  const moduleFile = path.join(installed, 'src/broker/storage-protection.mjs');
  const source = await readFile(moduleFile, 'utf8');
  const expectedSourceSha256 = 'ae318643b6d5d27a72eeb653d55f6737bc035a683dd3b7c08fb7409c88992c0d';
  if (createHash('sha256').update(source).digest('hex') !== expectedSourceSha256)
    throw Error('registration-cost-source-unavailable');
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
  const coverageRoot = path.join(base, 'private-coverage');
  await mkdir(coverageRoot, { mode: 0o700 });
  stage = 'primary';
  const started = performance.now();
  // Preserve the existing #198 command and passive observer unchanged. Coverage
  // adds engine counters, not a source rewrite, substituted API, signal or clock.
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
      env: {
        ...process.env,
        NODE_V8_COVERAGE: coverageRoot,
        APR_SELECTION_COST_OBSERVATION: '1',
        APR_SELECTION_COST_OPERATION: 'register',
      },
      timeout: 120000,
      maxBuffer: 2097152,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  const elapsedMs = Math.round(performance.now() - started);
  exitCode = child.status;
  childExitObserved = Number.isInteger(child.status) && child.signal === null && !child.error;
  await writeFile(
    path.join(base, 'primary-private.log'),
    (child.stdout ?? '') + '\n' + (child.stderr ?? ''),
    { flag: 'wx' }
  );
  if (!childExitObserved || exitCode !== 0) throw Error('registration-cost-primary-refused');
  const traces = (child.stderr ?? '').split(/\r?\n/).flatMap((line) => {
    try {
      const value = JSON.parse(line);
      return value.diagnostic === 'selection-attribution' ? [value] : [];
    } catch {
      return [];
    }
  });
  if (traces.length !== 1) throw Error('selection-attribution-evidence-unavailable');
  const { diagnostic: ignoredDiagnostic, ...trace } = traces[0];
  void ignoredDiagnostic;
  const attributed = summarizeSelectionAttribution(trace);
  await writeFile(
    path.join(output, 'attribution-register.json'),
    JSON.stringify(
      {
        schema: 'ai-peer-review.selection-attribution/v1',
        candidate: COST_CANDIDATE,
        producer,
        operation: 'register',
        node: process.versions.node,
        ...attributed,
      },
      null,
      2
    ) + '\n',
    { flag: 'wx' }
  );
  const record = JSON.parse(child.stdout);
  if (
    record.schema !== 'ai-peer-review.primary-activation/v1' ||
    record.primary_root !== project ||
    record.common_dir !== path.join(project, '.git') ||
    record.primary_initialized !== false ||
    record.integration_contract !== null ||
    record.owned_blobs !== null
  )
    throw Error('registration-cost-record-unavailable');
  stage = 'coverage';
  const file = path.join(coverageRoot, 'precise-coverage.json');
  if ((await stat(file)).size > 33554432) throw Error('registration-cost-coverage-unavailable');
  const raw = JSON.parse(await readFile(file, 'utf8'));
  const entries = raw.result.filter((item) => item.url === pathToFileURL(moduleFile).href);
  if (entries.length !== 1) throw Error('registration-cost-coverage-unavailable');
  const projection = projectRegistrationCostCoverage({
    coverage: entries[0],
    source,
    expectedSourceSha256,
  });
  const systemFile = path.join(installed, 'src/broker/portable-system.mjs');
  const systemSource = await readFile(systemFile, 'utf8');
  const systemEntries = raw.result.filter((item) => item.url === pathToFileURL(systemFile).href);
  if (systemEntries.length !== 1) throw Error('registration-cost-coverage-unavailable');
  const systemCounts = projectSystemCostCoverage({
    coverage: systemEntries[0],
    source: systemSource,
    expectedSourceSha256: createHash('sha256').update(systemSource).digest('hex'),
  });
  await writeFile(
    path.join(output, 'system-counters.json'),
    JSON.stringify(
      {
        verified: false,
        operationalAuthority: 'unavailable',
        candidate: COST_CANDIDATE,
        producer,
        node: process.versions.node,
        platform: process.platform,
        originalBudgetMs: 30000,
        originalBudgetRenewed: false,
        completeWindowsRegistrationObserved: false,
        guaranteedStartupSavingMs: 0,
        ...systemCounts,
      },
      null,
      2
    ) + '\n',
    { flag: 'wx' }
  );
  const report = validateRegistrationCostReport({
    schema: 'ai-peer-review.registration-cost-observation/v1',
    verified: false,
    operationalAuthority: 'unavailable',
    candidate: COST_CANDIDATE,
    producer,
    platform: process.platform,
    node: process.versions.node,
    status: 'primary-returned',
    exitCode,
    childExitObserved,
    registrationRecordObserved: true,
    elapsedMs,
    originalBudgetMs: 30000,
    originalBudgetRenewed: false,
    completeWindowsRegistrationObserved: false,
    guaranteedStartupSavingMs: 0,
    cleanup: 'retained-unproved',
    ...projection,
  });
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n', {
    flag: 'wx',
  });
  // A separate actual activation observation. The original failing registration
  // command, candidate inputs and budgets above remain unchanged.
  stage = 'activation-setup';
  execFileSync(
    process.execPath,
    [
      cli,
      'setup',
      '--scope',
      'project',
      '--agent',
      'codex',
      '--agent',
      'claude',
      '--confirm-scratch-exclude',
    ],
    { cwd: project, stdio: 'pipe', timeout: 120000 }
  );
  execFileSync('git', ['add', '.'], { cwd: project, stdio: 'pipe' });
  execFileSync(
    'git',
    [
      '-c',
      'user.name=Disposable diagnostic',
      '-c',
      'user.email=diagnostic@example.invalid',
      'commit',
      '-m',
      'Owned disposable primary policy',
    ],
    { cwd: project, stdio: 'pipe' }
  );
  stage = 'activation';
  const activation = spawnSync(
    process.execPath,
    [
      '--import',
      pathToFileURL(path.join(root, 'test/helpers/windows-probe-measurement-preload.mjs')).href,
      cli,
      'primary',
      'activate',
      '--json',
    ],
    {
      cwd: project,
      encoding: 'utf8',
      timeout: 120000,
      maxBuffer: 2097152,
      env: {
        ...process.env,
        APR_SELECTION_COST_OBSERVATION: '1',
        APR_SELECTION_COST_OPERATION: 'activate',
      },
    }
  );
  await writeFile(
    path.join(base, 'activation-private.log'),
    (activation.stdout ?? '') + '\n' + (activation.stderr ?? ''),
    { flag: 'wx' }
  );
  if (activation.status !== 0 || activation.signal || activation.error)
    throw Error('registration-cost-primary-refused');
  const activationTraces = (activation.stderr ?? '').split(/\r?\n/).flatMap((line) => {
    try {
      const value = JSON.parse(line);
      return value.diagnostic === 'selection-attribution' ? [value] : [];
    } catch {
      return [];
    }
  });
  if (activationTraces.length !== 1) throw Error('selection-attribution-evidence-unavailable');
  const { diagnostic: activationDiagnostic, ...activationTrace } = activationTraces[0];
  void activationDiagnostic;
  const activationAttribution = summarizeSelectionAttribution(activationTrace);
  const activated = JSON.parse(activation.stdout);
  if (
    activated.root !== project ||
    activated.commonDir !== path.join(project, '.git') ||
    !/^sha256:[a-f0-9]{64}$/.test(activated.activationDigest ?? '')
  )
    throw Error('registration-cost-record-unavailable');
  await writeFile(
    path.join(output, 'attribution-activate.json'),
    JSON.stringify(
      {
        schema: 'ai-peer-review.selection-attribution/v1',
        candidate: COST_CANDIDATE,
        producer,
        operation: 'activate',
        node: process.versions.node,
        ...activationAttribution,
      },
      null,
      2
    ) + '\n',
    { flag: 'wx' }
  );
} catch (error) {
  await writeFile(path.join(base, 'failure-private.log'), String(error.stack ?? error), {
    flag: 'wx',
  });
  const reasons = new Set([
    'registration-cost-source-unavailable',
    'registration-cost-primary-refused',
    'registration-cost-record-unavailable',
    'registration-cost-coverage-unavailable',
  ]);
  await writeFile(
    path.join(output, 'incomplete.json'),
    JSON.stringify(
      {
        schema: 'ai-peer-review.registration-cost-incomplete/v1',
        verified: false,
        operationalAuthority: 'unavailable',
        candidate: COST_CANDIDATE,
        producer,
        platform: process.platform,
        node: process.versions.node,
        stage,
        reason: reasons.has(error.message) ? error.message : 'unavailable',
        exitCode: Number.isInteger(exitCode) ? exitCode : null,
        childExitObserved,
        cleanup: 'retained-unproved',
        completeWindowsRegistrationObserved: false,
        guaranteedStartupSavingMs: 0,
      },
      null,
      2
    ) + '\n',
    { flag: 'wx' }
  );
  throw Error('registration-cost-incomplete');
}
