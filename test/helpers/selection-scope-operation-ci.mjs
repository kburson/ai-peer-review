// @story #190
// Hosted comparison of one immutable diagnostic candidate. No installed claims.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, realpathSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { userInfo } from 'node:os';
import { randomUUID, createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runNpm, parseNpmPackOutput } from './npm-command.mjs';
import { projectRegistrationCostCoverage } from './registration-cost-coverage.mjs';
import { compareScopeOperationReports } from './selection-scope-operation-report.mjs';
const root = realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
if (
  process.argv.length !== 2 ||
  process.platform !== 'linux' ||
  process.env.GITHUB_ACTIONS !== 'true' ||
  process.env.RUNNER_ENVIRONMENT !== 'github-hosted' ||
  process.env.GITHUB_REPOSITORY !== 'kburson/ai-peer-review' ||
  process.env.GITHUB_WORKFLOW !== 'Selection scope operation comparison' ||
  process.env.GITHUB_REF_NAME !== 'codex/190-installed-journeys' ||
  process.env.NODE_OPTIONS ||
  process.env.NODE_V8_COVERAGE
)
  throw Error('scope-comparison-host-unavailable');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const sourceCommit = git('rev-parse', 'HEAD');
if (sourceCommit !== process.env.GITHUB_SHA || git('status', '--porcelain'))
  throw Error('scope-comparison-candidate-unavailable');
const output = path.join(root, '.scratch/190-scope-comparison-public'),
  base = path.join(realpathSync(userInfo().homedir), 'apr190-scope-' + randomUUID());
mkdirSync(output, { recursive: true });
mkdirSync(base, { mode: 0o700 });
const digest = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const pairs = new Map();
let stage = 'pack',
  failed = false;
try {
  const pack = parseNpmPackOutput(
    execFileSync(
      process.execPath,
      [path.join(root, 'scripts/pack-runtime.mjs'), '--json', '--pack-destination', base],
      { cwd: root, encoding: 'utf8', timeout: 120000 }
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
  const installed = realpathSync(path.join(prefix, 'lib/node_modules/@kburson/ai-peer-review'));
  const { bootstrapPortableInventory } = await import(
    pathToFileURL(path.join(installed, 'src/installed/portable-inventory.mjs')).href
  );
  await bootstrapPortableInventory();
  const cli = path.join(installed, 'bin/peer-review.mjs');
  const call = (cwd, args) =>
    execFileSync(process.execPath, [cli, ...args], {
      cwd,
      encoding: 'utf8',
      timeout: 120000,
      stdio: 'pipe',
    });
  stage = 'runtime-register';
  call(root, ['register-runtime', '--json']);
  const provenance = {
    schema: 'ai-peer-review.selection-scope-provenance/v1',
    verified: false,
    operationalAuthority: 'unavailable',
    sourceCommit,
    nodeVersion: process.versions.node,
    tarballSha256: digest(path.join(base, pack.filename)),
    frontendSha256: digest(path.join(root, 'test/helpers/selection-scope-operation-child.mjs')),
    stockInputBudgetsUnchanged: true,
    reports: [],
  };
  for (const operation of ['register', 'activate'])
    for (const mode of ['unscoped', 'scoped']) {
      stage = operation + '-' + mode;
      const project = path.join(base, stage);
      mkdirSync(project, { mode: 0o700 });
      execFileSync('git', ['init', '-b', 'trunk'], { cwd: project, stdio: 'ignore' });
      if (operation === 'activate') {
        call(project, ['primary', 'register', '--json']);
        call(project, [
          'setup',
          '--scope',
          'project',
          '--agents',
          'codex',
          '--confirm-scratch-exclude',
          '--json',
        ]);
        for (const args of [
          ['config', 'user.name', 'Scope Comparison'],
          ['config', 'user.email', 'scope@example.invalid'],
          ['add', '.'],
          ['commit', '-m', 'owned diagnostic policy'],
        ])
          execFileSync('git', args, { cwd: project, stdio: 'ignore' });
      }
      const privateReport = path.join(base, stage + '.json');
      const privateCoverage = path.join(base, stage + '-private-coverage');
      mkdirSync(privateCoverage, { mode: 0o700 });
      const child = spawnSync(
        process.execPath,
        [path.join(root, 'test/helpers/selection-scope-operation-child.mjs')],
        {
          cwd: project,
          encoding: 'utf8',
          timeout: 120000,
          maxBuffer: 1048576,
          env: {
            ...process.env,
            NODE_V8_COVERAGE: privateCoverage,
            APR_SCOPE_PRIVATE_COVERAGE: privateCoverage,
            APR_SCOPE_MODE: mode,
            APR_SCOPE_OPERATION: operation,
            APR_SCOPE_INSTALLED_ROOT: installed,
            APR_SCOPE_PROJECT: project,
            APR_SCOPE_REPORT: privateReport,
          },
        }
      );
      writeFileSync(
        path.join(base, stage + '.private-log'),
        (child.stdout ?? '') + '\n' + (child.stderr ?? ''),
        { flag: 'wx', mode: 0o600 }
      );
      const exited = Number.isInteger(child.status) && !child.signal && !child.error;
      if (exited) {
        const publicReport = stage + '.json';
        const report = JSON.parse(readFileSync(privateReport));
        if (child.status !== 0 || !report.comparisonMatched) failed = true;
        const storage = path.join(installed, 'src/broker/storage-protection.mjs');
        if (digest(storage) !== digest(path.join(root, 'src/broker/storage-protection.mjs')))
          throw Error('scope-comparison-storage-source-mismatch');
        const rows = readdirSync(privateCoverage)
          .filter((file) => file.endsWith('.json'))
          .flatMap((file) =>
            JSON.parse(readFileSync(path.join(privateCoverage, file))).result.filter(
              (row) => row.url === pathToFileURL(storage).href
            )
          );
        if (rows.length !== 1) throw Error('scope-comparison-engine-metadata-unavailable');
        const coverage = projectRegistrationCostCoverage({
          coverage: rows[0],
          source: readFileSync(storage, 'utf8'),
          expectedSourceSha256: digest(storage),
        });
        const pair = pairs.get(operation) ?? {};
        pair[mode] = { report, coverage };
        pairs.set(operation, pair);
        writeFileSync(
          path.join(output, publicReport),
          JSON.stringify({ ...report, coverage }, null, 2) + '\n',
          { flag: 'wx' }
        );
        provenance.reports.push({
          file: publicReport,
          sha256: digest(path.join(output, publicReport)),
          childExitObserved: true,
          exitCode: child.status,
        });
      } else {
        failed = true;
        provenance.reports.push({ stage, childExitObserved: false, outcome: 'inconclusive' });
      }
    }
  for (const [operation, pair] of pairs) {
    if (!pair.unscoped || !pair.scoped) {
      failed = true;
      continue;
    }
    const result = compareScopeOperationReports(pair.unscoped, pair.scoped);
    if (!result.comparisonMatched) failed = true;
    writeFileSync(
      path.join(output, operation + '-comparison.json'),
      JSON.stringify(result, null, 2) + '\n',
      { flag: 'wx' }
    );
  }
  writeFileSync(path.join(output, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n', {
    flag: 'wx',
  });
} catch (error) {
  failed = true;
  writeFileSync(path.join(base, 'collection.private-error'), String(error?.stack ?? error), {
    flag: 'wx',
    mode: 0o600,
  });
  writeFileSync(
    path.join(output, 'incomplete.json'),
    JSON.stringify({
      verified: false,
      operationalAuthority: 'unavailable',
      sourceCommit,
      nodeVersion: process.versions.node,
      stage,
      classification: 'inconclusive',
      fixtureCleanup: 'unproved',
      guaranteedStartupSavingMs: 0,
    }) + '\n',
    { flag: 'wx' }
  );
}
if (failed) process.exitCode = 1;
