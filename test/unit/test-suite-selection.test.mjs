// @story #102
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

test('delivery suites omit retired files before loading and omit mixed transport cases', (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'apr-suite-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, 'test/unit'), { recursive: true });
  writeFileSync(
    path.join(root, 'test/unit/broker-build.test.mjs'),
    'throw Error("native build loaded");'
  );
  writeFileSync(
    path.join(root, 'test/unit/mixed.test.mjs'),
    "import test from 'node:test';\n" +
      "test('ordinary authority', () => console.log('authority executed'));\n" +
      "test('installed broker starts', () => { throw Error('broker executed'); });\n"
  );
  writeFileSync(
    path.join(root, 'test/unit/broker-http.test.mjs'),
    "import test from 'node:test';\n" +
      "test('broker HTTP remains responsive', () => console.log('portable HTTP executed'));\n"
  );
  writeFileSync(
    path.join(root, 'test/unit/storage-protection.test.mjs'),
    "import test from 'node:test';\n" +
      "test('portable broker protects storage', () => console.log('portable storage executed'));\n"
  );
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL('../helpers/run-suite.mjs', import.meta.url)), 'unit'],
    { cwd: root, encoding: 'utf8', env }
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /authority executed/);
  assert.match(result.stdout, /portable HTTP executed/);
  assert.match(result.stdout, /portable storage executed/);
  assert.match(result.stdout, /Broker verification paused/);
});
