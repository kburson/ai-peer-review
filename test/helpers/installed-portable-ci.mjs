// @story #190
// Disposable hosted installation launcher; preserves all evidence and incomplete outcomes.
import { execFileSync } from 'node:child_process';
import { mkdir, realpath, readFile, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { userInfo } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runNpm, parseNpmPackOutput } from './npm-command.mjs';
import { runInstalledPortableJourney } from './installed-portable-journey.mjs';
const root = await realpath(fileURLToPath(new URL('../../', import.meta.url)));
if (
  process.argv.length !== 2 ||
  process.env.GITHUB_ACTIONS !== 'true' ||
  process.env.RUNNER_ENVIRONMENT !== 'github-hosted' ||
  process.env.GITHUB_REPOSITORY !== 'kburson/ai-peer-review' ||
  process.env.GITHUB_WORKFLOW !== 'Installed portable journeys' ||
  process.env.GITHUB_REF_NAME !== 'codex/190-installed-journeys'
)
  throw Error('journey-host-unavailable');
const base = path.join(await realpath(userInfo().homedir), 'apr-installed-' + randomUUID());
await mkdir(base, { mode: 0o700 });
const output = path.join(root, '.scratch', '190-installed-public');
await mkdir(output, { recursive: true });
const packed = execFileSync(
  process.execPath,
  [path.join(root, 'scripts/pack-runtime.mjs'), '--json', '--pack-destination', base],
  { cwd: root, encoding: 'utf8', timeout: 120000 }
);
const pack = parseNpmPackOutput(packed, {
  expectedPackageName: '@kburson/ai-peer-review',
  requireFilename: true,
});
const tarball = path.join(base, pack.filename),
  prefix = path.join(base, 'global');
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
    tarball,
  ],
  { encoding: 'utf8' }
);
const installed = await realpath(
  path.join(
    prefix,
    ...(process.platform === 'win32' ? [] : ['lib']),
    'node_modules/@kburson/ai-peer-review'
  )
);
const projectRoot = path.join(base, 'project');
await mkdir(projectRoot, { mode: 0o700 });
await writeFile(
  path.join(output, 'package.json'),
  JSON.stringify(
    {
      schema: 'ai-peer-review.installed-package-report/v1',
      verified: false,
      packageSha256: createHash('sha256')
        .update(await readFile(tarball))
        .digest('hex'),
      sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: root,
        encoding: 'utf8',
      }).trim(),
    },
    null,
    2
  ) + '\n',
  { flag: 'wx' }
);
const report = await runInstalledPortableJourney({
  installed,
  projectRoot,
  output: path.join(output, 'journey.json'),
});
console.log(
  'Installed journey: ' +
    report.status +
    '; broker: ' +
    report.broker +
    '; manual: ' +
    report.manual +
    '; cleanup: ' +
    report.cleanup
);
// Missing actual input always fails this lane; no conditional skip or positive fixture.
if (report.status !== 'complete') process.exitCode = 1;
