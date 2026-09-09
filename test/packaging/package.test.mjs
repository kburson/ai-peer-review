import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE = '4b3bcd43cba141a611da4a2b861433b915462806';
const FILTERED = 'bfc6f9ffabd8281a815c7bd0e0824f3bacb84d9d';
const BOOTSTRAP = 'fd2e636356b6b8049930d5dc6bddf383c6d56c8d';

function pack(t) {
  const destination = mkdtempSync(path.join(os.tmpdir(), 'apr-pack-'));
  t.after(() => rmSync(destination, { recursive: true, force: true }));
  const output = execFileSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['pack', '--json', '--pack-destination', destination],
    { cwd: root, encoding: 'utf8' }
  );
  return JSON.parse(output)[0];
}

test('published tarball is a closed standalone package with zero production dependencies', (t) => {
  const result = pack(t);
  const files = result.files.map((entry) => entry.path).sort();
  const allowedPrefixes = [
    'bin/',
    'docs/',
    'provenance/',
    'schemas/',
    'skills/',
    'src/',
    'templates/',
  ];
  const allowedExact = new Set([
    'LICENSE',
    'NOTICE',
    'README.md',
    'package.json',
    'scripts/verify-extraction.mjs',
    'scripts/verify-release.mjs',
  ]);
  assert.ok(
    files.every(
      (file) => allowedExact.has(file) || allowedPrefixes.some((prefix) => file.startsWith(prefix))
    ),
    files.join('\n')
  );
  for (const required of [
    'LICENSE',
    'NOTICE',
    'README.md',
    'bin/peer-review.mjs',
    'schemas/config-v1.json',
    'skills/peer-review/SKILL.md',
    'provenance/extraction-manifest.json',
    'provenance/relicensing-declaration.json',
    'provenance/release-manifest.json',
    'scripts/verify-extraction.mjs',
    'scripts/verify-release.mjs',
  ])
    assert.ok(files.includes(required), `missing ${required}`);
  assert.ok(
    !files.some((file) =>
      /(^|\/)(test|\.scratch|node_modules|scripts\/review|scripts\/providers)(\/|$)/.test(file)
    )
  );
  assert.ok(!files.some((file) => /(token|transcript|\.env|ai-task-manager)/i.test(file)));

  const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.deepEqual(packageJson.dependencies ?? {}, {});
  const dependencyTree = JSON.parse(
    execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ls', '--omit=dev', '--json'], {
      cwd: root,
      encoding: 'utf8',
    })
  );
  assert.deepEqual(dependencyTree.dependencies ?? {}, {});
});

test('README and NOTICE bind the exact source, filtered tip, bootstrap, and license split', () => {
  const readme = readFileSync(path.join(root, 'README.md'), 'utf8');
  const notice = readFileSync(path.join(root, 'NOTICE'), 'utf8');
  for (const bytes of [readme, notice]) {
    assert.match(bytes, new RegExp(SOURCE));
    assert.match(bytes, new RegExp(FILTERED));
    assert.match(bytes, /Apache/i);
    assert.match(bytes, /(AGPL|historical licensing)/i);
  }
  assert.match(readme, new RegExp(BOOTSTRAP));
});

test('public exports and command guidance remain narrow and installation-aware', () => {
  const publicApi = readFileSync(path.join(root, 'src/public-api.mjs'), 'utf8');
  assert.equal(
    publicApi,
    "export { explainError } from './cli/help-data.mjs';\nexport { statusReview } from './protocol/service.mjs';\n"
  );
  const sources = [
    'README.md',
    'skills/peer-review/SKILL.md',
    'templates/author-startup.md',
    'templates/reviewer-invitation.md',
    'src/cli/help-data.mjs',
  ].map((file) => [file, readFileSync(path.join(root, file), 'utf8')]);
  for (const [file, bytes] of sources) {
    assert.doesNotMatch(bytes, /npx ai-peer-review(?!@)/, file);
    if (/npx peer-review/.test(bytes)) assert.match(bytes, /confirmed local installation/, file);
  }
});

test('CI contract covers Node 22 cross-platform, later runtimes, and every Phase 1 gate', () => {
  const ci = readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
  for (const required of [
    'ubuntu-latest',
    'macos-latest',
    'windows-latest',
    'node-version: 22',
    "'lts/*'",
    "'current'",
    'npm run format:check',
    'npm run lint',
    'npm test',
    'npm run test:integration',
    'npm run test:packaging',
    'npm run test:smoke',
    'npm pack --dry-run',
    'verify-extraction.mjs --require-legacy-removed',
  ])
    assert.match(ci, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(ci, /live-provider-optional:[\s\S]*continue-on-error: true/);
});
