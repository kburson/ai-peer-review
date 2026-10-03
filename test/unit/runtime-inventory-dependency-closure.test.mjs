// @story #137
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { runtimeFixture } from '../helpers/runtime-selection-fixture.mjs';
import { verifyRuntimeInventorySync } from '../../src/startup/runtime-inventory.mjs';

test('admission refuses a prior inventory whose effective dependency exists only above the package', (t) => {
  const f = runtimeFixture(t);
  const metadataPath = path.join(f.packageRoot, 'package.json');
  const metadata = JSON.parse(readFileSync(metadataPath));
  metadata.dependencies = { 'ancestor-runtime': '1.0.0' };
  writeFileSync(metadataPath, JSON.stringify(metadata));
  const dependency = path.join(f.root, 'node_modules/ancestor-runtime');
  mkdirSync(dependency, { recursive: true });
  writeFileSync(
    path.join(dependency, 'package.json'),
    JSON.stringify({ name: 'ancestor-runtime', version: '1.0.0', main: 'index.js' })
  );
  writeFileSync(path.join(dependency, 'index.js'), 'module.exports = 1;');
  f.seal();
  const before = readFileSync(path.join(f.packageRoot, 'runtime-inventory.json'));
  assert.throws(() => verifyRuntimeInventorySync({ packageRoot: f.packageRoot }), {
    code: 'APR_RUNTIME_INVENTORY_INVALID',
  });
  writeFileSync(path.join(dependency, 'index.js'), 'module.exports = 2;');
  assert.throws(() => verifyRuntimeInventorySync({ packageRoot: f.packageRoot }), {
    code: 'APR_RUNTIME_INVENTORY_INVALID',
  });
  assert.deepEqual(readFileSync(path.join(f.packageRoot, 'runtime-inventory.json')), before);
});
