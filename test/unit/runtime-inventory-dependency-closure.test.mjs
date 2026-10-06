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

// @story #137
import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { prepareNativeInventory } from '../../src/installed/native-inventory.mjs';

function transitiveFixture(t, { external = false, nested = false, optional = false } = {}) {
  const f = runtimeFixture(t);
  writeFileSync(
    path.join(f.packageRoot, 'package.json'),
    JSON.stringify({
      name: '@kburson/ai-peer-review',
      version: '1.0.0',
      dependencies: { 'direct-runtime': '1.0.0' },
    })
  );
  const direct = path.join(f.packageRoot, 'node_modules/direct-runtime');
  mkdirSync(direct, { recursive: true });
  writeFileSync(
    path.join(direct, 'package.json'),
    JSON.stringify({
      name: 'direct-runtime',
      version: '1.0.0',
      main: 'index.cjs',
      [optional ? 'optionalDependencies' : 'dependencies']: { 'transitive-runtime': '^1.0.0' },
    })
  );
  writeFileSync(path.join(direct, 'index.cjs'), 'module.exports = require("transitive-runtime");');
  const target = external ? f.root : nested ? direct : f.packageRoot;
  const transitive = path.join(target, 'node_modules/transitive-runtime');
  mkdirSync(transitive, { recursive: true });
  writeFileSync(
    path.join(transitive, 'package.json'),
    JSON.stringify({ name: 'transitive-runtime', version: '1.0.0', main: 'index.cjs' })
  );
  writeFileSync(path.join(transitive, 'index.cjs'), 'module.exports = 1;');
  const files = [];
  function walk(relative = '') {
    for (const entry of readdirSync(path.join(f.packageRoot, relative), { withFileTypes: true })) {
      const name = relative ? relative + '/' + entry.name : entry.name;
      if (entry.isDirectory()) walk(name);
      else if (name !== 'runtime-inventory.json')
        files.push({
          path: name,
          sha256: createHash('sha256')
            .update(readFileSync(path.join(f.packageRoot, name)))
            .digest('hex'),
        });
    }
  }
  walk();
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  writeFileSync(
    path.join(f.packageRoot, 'runtime-inventory.json'),
    JSON.stringify({ schema: 'ai-peer-review.runtime-inventory/v1', files })
  );
  return { ...f, direct, transitive };
}

test('sealed direct dependency cannot execute a transitive package from an ancestor', (t) => {
  const f = transitiveFixture(t, { external: true });
  assert.throws(() => verifyRuntimeInventorySync({ packageRoot: f.packageRoot }), {
    code: 'APR_RUNTIME_INVENTORY_INVALID',
  });
  assert.throws(() => prepareNativeInventory(f.packageRoot), {
    code: 'APR_RUNTIME_INVENTORY_INVALID',
  });
});

for (const nested of [false, true]) {
  test(
    'sealed dependency closure accepts internal ' +
      (nested ? 'nested' : 'hoisted') +
      ' transitive packages',
    (t) => {
      const f = transitiveFixture(t, { nested });
      assert.doesNotThrow(() => verifyRuntimeInventorySync({ packageRoot: f.packageRoot }));
      assert.doesNotThrow(() => prepareNativeInventory(f.packageRoot));
    }
  );
}

test('carried observation refuses a newly available external optional dependency', (t) => {
  const f = transitiveFixture(t, { optional: true });
  const observation = verifyRuntimeInventorySync({ packageRoot: f.packageRoot });
  const metadata = JSON.parse(readFileSync(path.join(f.direct, 'package.json')));
  metadata.optionalDependencies['external-optional'] = '^1.0.0';
  writeFileSync(path.join(f.direct, 'package.json'), JSON.stringify(metadata));
  // Re-seal this authorized dependency metadata while the optional package is absent.
  const inventoryPath = path.join(f.packageRoot, 'runtime-inventory.json');
  const inventory = JSON.parse(readFileSync(inventoryPath));
  inventory.files.find(
    (entry) => entry.path === 'node_modules/direct-runtime/package.json'
  ).sha256 = createHash('sha256')
    .update(readFileSync(path.join(f.direct, 'package.json')))
    .digest('hex');
  writeFileSync(inventoryPath, JSON.stringify(inventory));
  const fresh = verifyRuntimeInventorySync({ packageRoot: f.packageRoot });
  const external = path.join(f.root, 'node_modules/external-optional');
  mkdirSync(external, { recursive: true });
  writeFileSync(
    path.join(external, 'package.json'),
    JSON.stringify({ name: 'external-optional', version: '1.0.0' })
  );
  assert.throws(
    () => verifyRuntimeInventorySync({ packageRoot: f.packageRoot, previousObservation: fresh }),
    { code: 'APR_RUNTIME_INVENTORY_INVALID' }
  );
  assert.notEqual(observation.inventoryDigest, fresh.inventoryDigest);
});
