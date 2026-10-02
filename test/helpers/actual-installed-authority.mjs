// @story #137
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync, rmSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runNpm } from './npm-command.mjs';
import { packRuntime } from './runtime-package.mjs';

export function actualInstalledAuthority(t) {
  const { directory, tarball } = packRuntime(t);
  const prefix = path.join(directory, 'global prefix');
  runNpm(
    'npm',
    [
      'install',
      '--global',
      '--prefix',
      prefix,
      '--ignore-scripts',
      '--offline',
      '--no-audit',
      '--no-fund',
      tarball,
    ],
    { encoding: 'utf8' }
  );
  const installed = path.join(
    prefix,
    ...(process.platform === 'win32' ? [] : ['lib']),
    'node_modules/@kburson/ai-peer-review'
  );
  const home = path.join(directory, 'account');
  const root = path.join(directory, 'primary project');
  const linked = path.join(directory, 'linked project');
  mkdirSync(home, { mode: 0o700 });
  mkdirSync(root);
  for (const relative of ['Library/Caches', 'cache', 'AppData/Roaming'])
    mkdirSync(path.join(home, relative), { recursive: true, mode: 0o700 });
  const profile = fileURLToPath(
    new URL('./installed-provider/account-profile.mjs', import.meta.url)
  );
  const endpointRoot =
    process.platform === 'win32' ? null : realpathSync(mkdtempSync('/tmp/apr-e-'));
  if (endpointRoot) t.after(() => rmSync(endpointRoot, { recursive: true, force: true }));
  const env = {
    ...process.env,
    APR_FIXTURE_ACCOUNT_HOME: home,
    HOME: home,
    USERPROFILE: home,
    XDG_CONFIG_HOME: path.join(home, '.config'),
    APPDATA: path.join(home, 'AppData/Roaming'),
    XDG_CACHE_HOME: path.join(home, 'cache'),
    LOCALAPPDATA: path.join(home, 'AppData'),
    ...(endpointRoot ? { AI_PEER_REVIEW_ENDPOINT_ROOT: endpointRoot } : {}),
    NODE_OPTIONS: '--import ' + JSON.stringify(profile),
    APR_NODEDIR_BASE: process.env.APR_NODEDIR_BASE || path.dirname(path.dirname(process.execPath)),
  };
  const build = spawnSync(
    process.execPath,
    [
      path.join(installed, 'scripts/build-broker-security.mjs'),
      '--nodedir',
      process.env.APR_NODEDIR_BASE
        ? path.join(process.env.APR_NODEDIR_BASE, process.versions.node)
        : path.dirname(path.dirname(process.execPath)),
    ],
    { cwd: installed, env, encoding: 'utf8', timeout: 120000 }
  );
  assert.equal(build.status, 0, build.stderr);
  const cli = (args, cwd = root) =>
    spawnSync(process.execPath, [path.join(installed, 'bin/peer-review.mjs'), ...args], {
      cwd,
      env,
      encoding: 'utf8',
      timeout: 120000,
      maxBuffer: 4 * 1024 * 1024,
    });
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  git('init', '-b', 'trunk');
  git('config', 'user.name', 'Installed Fixture');
  git('config', 'user.email', 'installed@example.invalid');
  mkdirSync(path.join(root, 'docs'));
  writeFileSync(path.join(root, 'docs/artifact.md'), '# Artifact\n');
  git('add', '.');
  git('commit', '-m', 'fixture');
  git('worktree', 'add', '-b', 'linked', linked);
  for (const args of [
    ['register-runtime', '--json'],
    ['primary', 'register', '--json'],
    ['setup', '--agent', 'codex', '--scope', 'user', '--json'],
    ['setup', '--agent', 'codex', '--scope', 'project', '--confirm-scratch-exclude', '--json'],
  ]) {
    const result = cli(args);
    assert.equal(result.status, 0, result.stderr + result.stdout);
  }
  git('add', '.');
  git('commit', '-m', 'activate policy');
  const activated = cli(['primary', 'activate', '--json']);
  assert.equal(activated.status, 0, activated.stderr + activated.stdout);
  return {
    directory,
    installed,
    home,
    root,
    linked,
    env,
    cli,
    git,
    module: (relative) => JSON.stringify(pathToFileURL(path.join(installed, relative)).href),
    execute: (code, { cwd = root, extraEnv = {} } = {}) =>
      spawnSync(process.execPath, ['--input-type=module', '-e', code], {
        cwd,
        env: { ...env, ...extraEnv },
        encoding: 'utf8',
        timeout: 120000,
        maxBuffer: 4 * 1024 * 1024,
      }),
  };
}
