// @story #190
// Diagnostic data only: genuine stock calls and unchanged original budgets.
// Public output contains only timings/categories/codes, never paths, identities or error details.
import { execFileSync } from 'node:child_process';
import { mkdir, realpath, writeFile } from 'node:fs/promises';
import { userInfo } from 'node:os';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { runNpm, parseNpmPackOutput } from './npm-command.mjs';
const root = await realpath(fileURLToPath(new URL('../../', import.meta.url)));
if (
  process.argv.length !== 2 ||
  process.platform !== 'win32' ||
  process.env.GITHUB_ACTIONS !== 'true' ||
  process.env.RUNNER_ENVIRONMENT !== 'github-hosted' ||
  process.env.GITHUB_REPOSITORY !== 'kburson/ai-peer-review' ||
  process.env.GITHUB_WORKFLOW !== 'Installed portable journeys' ||
  process.env.GITHUB_REF_NAME !== 'codex/190-installed-journeys' ||
  process.env.NODE_OPTIONS
)
  throw Error('diagnostic-host-unavailable');
const base = path.join(
  await realpath(userInfo().homedir),
  'apr-primary-diagnostic-' + randomUUID()
);
await mkdir(base, { mode: 0o700 });
const output = path.join(root, '.scratch/190-primary-diagnostic-public');
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
});
let stderr = '',
  status = 'diagnostic-returned',
  code = null;
try {
  execFileSync(
    process.execPath,
    [
      '--import',
      path.join(root, 'test/helpers/windows-stock-timing.mjs'),
      cli,
      'primary',
      'register',
      '--json',
    ],
    {
      cwd: project,
      encoding: 'utf8',
      timeout: 120000,
      maxBuffer: 1048576,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
} catch (error) {
  stderr = error.stderr?.toString() ?? '';
  status = 'diagnostic-refused';
}
const timings = stderr.split(/\r?\n/u).flatMap((line) => {
  try {
    const v = JSON.parse(line);
    if (v.schema === 'ai-peer-review.error/v1' && /^APR_[A-Z_]+$/u.test(v.code ?? ''))
      code = v.code;
    if (
      v.diagnostic !== 'stock-exec-timing' ||
      !Number.isSafeInteger(v.id) ||
      !Number.isSafeInteger(v.elapsedMs) ||
      !['principal', 'acl-or-path', 'other'].includes(v.kind) ||
      !['completed', 'refused'].includes(v.outcome)
    )
      return [];
    return [{ id: v.id, kind: v.kind, elapsedMs: v.elapsedMs, outcome: v.outcome }];
  } catch {
    return [];
  }
});
await writeFile(
  path.join(output, 'timings.json'),
  JSON.stringify(
    {
      schema: 'ai-peer-review.windows-primary-diagnostic/v1',
      verified: false,
      operationalAuthority: 'unavailable',
      node: process.versions.node,
      status,
      code,
      timings,
    },
    null,
    2
  ) + '\n',
  { flag: 'wx' }
);
console.log('Diagnostic timings collected; no installed journey or operational authority claim.');
