import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { sealInstalledRuntimeFixture } from '../helpers/installed-runtime-inventory.mjs';

import { parseNpmPackOutput, runNpm } from '../helpers/npm-command.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('packed CLI installs into a non-Node host and starts a review through injected offline adapters', async (t) => {
  const fixture = mkdtempSync(path.join(os.tmpdir(), 'apr-installed-'));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  const packDir = path.join(fixture, 'pack');
  const host = path.join(fixture, 'host');
  mkdirSync(packDir);
  mkdirSync(host);
  const packed = parseNpmPackOutput(
    runNpm('npm', ['pack', '--json', '--pack-destination', packDir], {
      cwd: root,
      encoding: 'utf8',
    }),
    { expectedPackageName: '@kburson/ai-peer-review', requireFilename: true }
  );
  const tarball = path.join(packDir, packed.filename);
  const zeroInstallHelp = runNpm(
    'npx',
    ['--yes', '--package', tarball, 'ai-peer-review', '--help'],
    {
      cwd: host,
      encoding: 'utf8',
    }
  );
  assert.match(zeroInstallHelp, /Commands:/);
  writeFileSync(path.join(host, 'package.json'), '{"private":true}\n');
  runNpm('npm', ['install', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund', tarball], {
    cwd: host,
    stdio: 'pipe',
  });
  assert.equal(
    JSON.parse(readFileSync(path.join(host, 'node_modules/@kburson/ai-peer-review/package.json')))
      .version,
    JSON.parse(readFileSync(path.join(root, 'package.json'))).version
  );
  execFileSync(
    process.execPath,
    ['--input-type=module', '--eval', "await import('@kburson/ai-peer-review');"],
    { cwd: host, encoding: 'utf8' }
  );
  const binDirectory = path.join(host, 'node_modules', '.bin');
  for (const name of ['ai-peer-review', 'peer-review', 'peer-review-mcp']) {
    assert.ok(
      ['', '.cmd', '.ps1'].some((suffix) =>
        existsSync(path.join(binDirectory, `${name}${suffix}`))
      ),
      `missing installed binary ${name}`
    );
  }
  const installedAiHelp = runNpm('npx', ['--no-install', 'ai-peer-review', '--help'], {
    cwd: host,
    encoding: 'utf8',
  });
  assert.match(installedAiHelp, /Commands:/);
  const installedPeerHelp = runNpm('npx', ['--no-install', 'peer-review', '--help'], {
    cwd: host,
    encoding: 'utf8',
  });
  assert.match(installedPeerHelp, /Commands:/);

  const installed = path.join(host, 'node_modules/@kburson/ai-peer-review');
  const developmentRoot = [
    process.env.APR_NODEDIR_BASE && path.join(process.env.APR_NODEDIR_BASE, process.versions.node),
    path.dirname(process.execPath),
    path.dirname(path.dirname(process.execPath)),
  ].find((candidate) => candidate && existsSync(path.join(candidate, 'include/node/node_api.h')));
  assert.ok(developmentRoot, 'matching Node development headers must be provisioned');
  runNpm(
    'npm',
    ['--prefix', installed, 'run', 'build:broker-security', '--', '--nodedir', developmentRoot],
    { stdio: 'pipe' }
  );
  sealInstalledRuntimeFixture(installed);
  const accountHome = path.join(fixture, 'account-home');
  mkdirSync(accountHome, { mode: 0o700 });
  writeFileSync(path.join(host, '.gitignore'), 'node_modules/\npackage*.json\n.scratch/\n');
  execFileSync('git', ['init', '-b', 'trunk'], { cwd: host, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.invalid'], { cwd: host });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: host });
  mkdirSync(path.join(host, 'docs'));
  writeFileSync(path.join(host, 'docs/spec.md'), '# Specification\n');
  writeFileSync(path.join(host, '.git/info/exclude'), '.scratch/peer-review/\n');
  execFileSync('git', ['add', 'docs/spec.md'], { cwd: host });
  execFileSync('git', ['commit', '-m', 'fixture'], { cwd: host, stdio: 'ignore' });
  const started = execFileSync(
    process.execPath,
    [
      '--import',
      fileURLToPath(new URL('../helpers/installed-provider/preload.mjs', import.meta.url)),
      fileURLToPath(new URL('../helpers/installed-smoke.mjs', import.meta.url)),
    ],
    {
      cwd: host,
      encoding: 'utf8',
      timeout: 60_000,
      env: {
        ...process.env,
        APR_FIXTURE_PACKAGE: installed,
        APR_FIXTURE_ACCOUNT_HOME: accountHome,
        HOME: accountHome,
        USERPROFILE: accountHome,
        APPDATA: path.join(accountHome, 'AppData/Roaming'),
        XDG_CONFIG_HOME: path.join(accountHome, '.config'),
        npm_config_cache: runNpm('npm', ['config', 'get', 'cache'], { encoding: 'utf8' }).trim(),
      },
    }
  );
  assert.match(started, /Review .*: awaiting-reviewer/);
  assert.match(started, /Next:/);
  assert.match(started, /Runtime: XPR via project-local broker/);
  assert.match(started, /Reviewer: claude-opus-5; effort: medium/);
});
