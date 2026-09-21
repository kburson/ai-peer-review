import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fixtureStartupDeps } from '../helpers/internal-api.mjs';

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
    '0.3.0'
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

  execFileSync('git', ['init', '-b', 'trunk'], { cwd: host, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.invalid'], { cwd: host });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: host });
  mkdirSync(path.join(host, 'docs'));
  writeFileSync(path.join(host, 'docs/spec.md'), '# Specification\n');
  writeFileSync(path.join(host, '.git/info/exclude'), '.scratch/peer-review/\n');
  execFileSync('git', ['add', 'docs/spec.md'], { cwd: host });
  execFileSync('git', ['commit', '-m', 'fixture'], { cwd: host, stdio: 'ignore' });
  const { run } = await import(
    pathToFileURL(path.join(host, 'node_modules/@kburson/ai-peer-review/src/cli/run.mjs'))
  );
  let started = '';
  let errors = '';
  const code = await run(
    [
      'start',
      'docs/spec.md',
      '--artifact-kind',
      'spec',
      '--reviewer-provider',
      'claude',
      '--reviewer-model',
      'claude-opus-5',
      '--reviewer-effort',
      'medium',
      '--transport-mode',
      'manual',
    ],
    {
      ...fixtureStartupDeps,
      stdout: {
        write: (value) => {
          started += value;
        },
      },
      stderr: {
        write: (value) => {
          errors += value;
        },
      },
      cwd: host,
      encoding: 'utf8',
      env: {
        ...process.env,
        CODEX_THREAD_ID: 'installed-smoke-author',
        CODEX_MODEL_ID: 'gpt-test',
        CODEX_MODEL_DISPLAY: 'GPT Test',
      },
    }
  );
  assert.equal(code, 0, errors);
  assert.match(started, /Review .*: awaiting-reviewer/);
  assert.match(started, /Next:/);
  assert.match(started, /Runtime: XPR via project-local broker/);
  assert.match(started, /Reviewer: claude-opus-5; effort: medium/);
});
