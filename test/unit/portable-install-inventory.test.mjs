// @story #190
// Actual disposable npm installation; no account/profile ports or class approval.
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { packRuntime } from '../helpers/runtime-package.mjs';
import { runNpm } from '../helpers/npm-command.mjs';
function installed(t) {
  const packed = packRuntime(t);
  const prefix = path.join(packed.directory, 'portable-install');
  runNpm(
    'npm',
    [
      'install',
      '--global',
      '--prefix',
      prefix,
      '--omit=dev',
      '--ignore-scripts',
      '--offline',
      '--no-audit',
      '--no-fund',
      packed.tarball,
    ],
    { encoding: 'utf8' }
  );
  const root = path.join(
    prefix,
    ...(process.platform === 'win32' ? [] : ['lib']),
    'node_modules/@kburson/ai-peer-review'
  );
  return { root, load: (file) => import(pathToFileURL(path.join(root, file)).href) };
}
test('fresh installed bootstrap seals actual dependency bytes without creating a native build', async (t) => {
  const { root, load } = installed(t);
  const inventory = await load('src/startup/runtime-inventory.mjs');
  assert.throws(
    () => inventory.verifyRuntimeInventorySync({ packageRoot: root }),
    /sealed installation closure/
  );
  assert.ok(
    existsSync(path.join(root, 'src/installed/portable-inventory.mjs')),
    'package-owned portable bootstrap is missing'
  );
  const { bootstrapPortableInventory } = await load('src/installed/portable-inventory.mjs');
  const result = await bootstrapPortableInventory();
  assert.equal(result.status, 'bootstrapped');
  assert.equal(existsSync(path.join(root, 'native/broker-security/build')), false);
  const observed = inventory.verifyRuntimeInventorySync({ packageRoot: root });
  assert.equal(inventory.isVerifiedRuntimeInventory(observed), true);
  const bytes = readFileSync(path.join(root, 'runtime-inventory.json'));
  assert.equal((await bootstrapPortableInventory()).status, 'already-bootstrapped');
  assert.deepEqual(readFileSync(path.join(root, 'runtime-inventory.json')), bytes);
});
test('portable bootstrap never reseals changed shipped source or later changed dependencies', async (t) => {
  const { root, load } = installed(t);
  assert.ok(
    existsSync(path.join(root, 'src/installed/portable-inventory.mjs')),
    'package-owned portable bootstrap is missing'
  );
  const { bootstrapPortableInventory } = await load('src/installed/portable-inventory.mjs');
  const source = path.join(root, 'src/errors.mjs');
  const original = readFileSync(source);
  const manifest = readFileSync(path.join(root, 'runtime-inventory.json'));
  writeFileSync(source, Buffer.concat([original, Buffer.from('\n// changed\n')]));
  await assert.rejects(() => bootstrapPortableInventory(), /inventory|changed|disagree/i);
  assert.deepEqual(readFileSync(path.join(root, 'runtime-inventory.json')), manifest);
  writeFileSync(source, original);
  await bootstrapPortableInventory();
  const sealed = readFileSync(path.join(root, 'runtime-inventory.json'));
  const dependency = path.join(root, 'node_modules/jsonc-parser/package.json');
  writeFileSync(dependency, readFileSync(dependency, 'utf8') + '\n');
  await assert.rejects(() => bootstrapPortableInventory(), /inventory|changed|disagree/i);
  assert.deepEqual(readFileSync(path.join(root, 'runtime-inventory.json')), sealed);
});
