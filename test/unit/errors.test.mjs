import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { AprError } from '../../src/errors.mjs';

test('package identity is public, dependency-free, and publish-bounded', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8')
  );

  assert.equal(packageJson.name, 'ai-peer-review');
  assert.equal(packageJson.version, '0.1.0');
  assert.equal(packageJson.type, 'module');
  assert.equal(packageJson.engines.node, '>=22');
  assert.equal(packageJson.bin['peer-review'], './bin/peer-review.mjs');
  assert.deepEqual(packageJson.dependencies, {});
  assert.deepEqual(packageJson.devDependencies, {
    cspell: '8.19.4',
    eslint: '9.39.4',
    'markdownlint-cli2': '0.23.2',
    prettier: '3.8.3',
  });
  assert.deepEqual(packageJson.scripts, {
    test: 'npm run test:unit && npm run test:golden',
    'test:unit': 'node --test "test/unit/**/*.test.mjs"',
    'test:golden': 'node --test "test/golden/**/*.test.mjs"',
    'test:integration': 'node --test "test/integration/**/*.test.mjs"',
    'test:packaging': 'node --test "test/packaging/**/*.test.mjs"',
    'test:smoke': 'node --test "test/smoke/**/*.test.mjs"',
    'test:mcp': 'node --test "test/mcp/**/*.test.mjs"',
    format: 'prettier --write .',
    'format:check': 'prettier --check .',
    lint: 'eslint . && markdownlint-cli2 "**/*.md" && cspell --no-progress "**/*.{md,mjs,js,json}"',
  });
  assert.deepEqual(packageJson.files, [
    'bin/',
    'src/',
    'docs/',
    'schemas/',
    'templates/',
    'skills/',
    'provenance/',
    'scripts/verify-extraction.mjs',
    'scripts/verify-release.mjs',
    'LICENSE',
    'NOTICE',
    'README.md',
  ]);
});

test('repository tooling configuration is explicit and credential-free', async () => {
  const read = (pathname) => readFile(new URL(`../../${pathname}`, import.meta.url), 'utf8');
  const [npmrc, gitignore, prettier, markdownlint, spelling] = await Promise.all([
    read('.npmrc'),
    read('.gitignore'),
    read('.prettierrc.json'),
    read('.markdownlint-cli2.jsonc'),
    read('cspell.json'),
  ]);

  assert.equal(npmrc, 'access=public\nprovenance=true\n');
  assert.doesNotMatch(npmrc, /token|auth/i);
  for (const ignored of ['node_modules/', 'coverage/', '*.tgz', '.scratch/peer-review/']) {
    assert.match(gitignore, new RegExp(ignored.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.equal(JSON.parse(prettier).singleQuote, true);
  assert.match(markdownlint, /"MD013": false/);
  assert.equal(JSON.parse(spelling).version, '0.2');
});

test('AprError has a stable machine contract', () => {
  const error = new AprError('APR_ARTIFACT_DRIFT', 'artifact differs from HEAD', {
    recovery: 'git diff -- docs/spec.md',
    details: { path: 'docs/spec.md' },
  });

  assert.equal(error.name, 'AprError');
  assert.equal(error.exitCode, 1);
  assert.ok(Object.isFrozen(error.details));
  assert.deepEqual(error.toJSON(), {
    schema: 'ai-peer-review.error/v1',
    code: 'APR_ARTIFACT_DRIFT',
    message: 'artifact differs from HEAD',
    recovery: 'git diff -- docs/spec.md',
    details: { path: 'docs/spec.md' },
  });
});

test('AprError rejects an unstable code or missing recovery', () => {
  assert.throws(() => new AprError('usage', 'bad', { recovery: 'retry' }), TypeError);
  assert.throws(() => new AprError('APR_USAGE', 'bad'), TypeError);
});
