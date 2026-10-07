// @story #137
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('consumer ordinary build and tests run without ai-peer-review installation or doctor', (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'apr consumer without tool '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, '.ai-peer-review'));
  writeFileSync(
    path.join(root, '.ai-peer-review/config.json'),
    JSON.stringify({ schema: 'ai-peer-review.config/v1' })
  );
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'independent-consumer', private: true, type: 'module' })
  );
  writeFileSync(path.join(root, 'app.mjs'), 'export const value = 42;\n');
  writeFileSync(
    path.join(root, 'app.test.mjs'),
    'import assert from "node:assert/strict"; import {value} from "./app.mjs"; assert.equal(value,42);\n'
  );
  const env = {
    ...process.env,
    HOME: path.join(root, 'absent-account'),
    USERPROFILE: path.join(root, 'absent-account'),
    NODE_PATH: '',
  };
  for (const args of [
    ['--check', 'app.mjs'],
    ['--test', 'app.test.mjs'],
  ]) {
    const result = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  assert.equal(existsSync(path.join(root, 'node_modules')), false);
  assert.equal(existsSync(path.join(root, 'absent-account')), false);
});
