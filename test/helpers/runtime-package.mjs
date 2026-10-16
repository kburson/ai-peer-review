// @story #137
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseNpmPackOutput, runNpm } from './npm-command.mjs';

export const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export function packRuntime(t) {
  const directory = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'apr runtime package ')));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const script = path.join(sourceRoot, 'scripts/pack-runtime.mjs');
  const output = execFileSync(
    process.execPath,
    [script, '--json', '--pack-destination', directory],
    { cwd: sourceRoot, encoding: 'utf8' }
  );
  const report = parseNpmPackOutput(output, {
    expectedPackageName: '@kburson/ai-peer-review',
    requireFilename: true,
  });
  const tarball = path.join(directory, report.filename);
  const extracted = path.join(directory, 'package');
  execFileSync('tar', ['-xf', tarball, '-C', directory]);
  return { directory, report, tarball, extracted };
}

// @story #190
// Real installed filesystem/protocol fixtures; the isolated account locator is
// test-only and conveys no actual provider or OS process-source assurance.
export function installRuntimeFixture(t) {
  const packed = packRuntime(t);
  const prefix = path.join(packed.directory, 'installed prefix');
  runNpm(
    'npm',
    [
      'install',
      '--global',
      '--prefix',
      prefix,
      '--offline',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      packed.tarball,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );
  const packageRoot = path.join(
    prefix,
    ...(process.platform === 'win32' ? [] : ['lib']),
    'node_modules',
    '@kburson',
    'ai-peer-review'
  );
  const accountRoot = path.join(packed.directory, 'account');
  mkdirSync(accountRoot);
  return {
    ...packed,
    packageRoot,
    module(relative) {
      return JSON.stringify(pathToFileURL(path.join(packageRoot, relative)).href);
    },
    execute(code, { cwd }) {
      return spawnSync(
        process.execPath,
        [
          '--import',
          new URL('./installed-provider/account-profile.mjs', import.meta.url).href,
          '--input-type=module',
          '-e',
          code,
        ],
        {
          cwd,
          encoding: 'utf8',
          env: { ...process.env, HOME: accountRoot, APR_FIXTURE_ACCOUNT_HOME: accountRoot },
          timeout: 30000,
        }
      );
    },
  };
}
