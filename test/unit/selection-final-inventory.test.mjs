// @story #190
// Fixture selection and engine metadata do not grant installed authority.
import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { createSelectionStore } from '../../src/config/runtime-selection-core.mjs';
import { runtimeFixture } from '../helpers/runtime-selection-fixture.mjs';
import { startPreciseFunctionCoverage } from '../helpers/precise-function-coverage.mjs';

test('one final inventory scan validates each complete selection admission', async (t) => {
  const f = runtimeFixture(t);
  const store = createSelectionStore({ account: f.account, packageRoot: f.packageRoot });
  await store.register();
  const collector = await startPreciseFunctionCoverage();
  await store.assertSelected();
  const coverage = await collector.finish();
  const url = new URL('../../src/startup/runtime-inventory.mjs', import.meta.url).href;
  const script = coverage.result.find((item) => item.url === url);
  const calls = script?.functions.find((item) => item.functionName === 'observeRuntimeInventory');
  // This synchronous function has no async resumptions; its entry count is calls.
  assert.equal(calls?.ranges[0]?.count, 1);
});

test('cross-store previous inventory still fences a changed installed generation', async (t) => {
  const f = runtimeFixture(t);
  const first = createSelectionStore({ account: f.account, packageRoot: f.packageRoot });
  await first.register();
  const observation = await first.assertSelected();
  writeFileSync(path.join(f.packageRoot, 'runner.mjs'), 'export const version = 2;\n');
  f.seal();
  const second = createSelectionStore({ account: f.account, packageRoot: f.packageRoot });
  await assert.rejects(second.assertSelected({ previousObservation: observation }), {
    code: 'APR_RUNTIME_CHANGED',
  });
});

test('source mutation between independent selection snapshots refuses before return', async (t) => {
  const f = runtimeFixture(t);
  let armed = false,
    calls = 0,
    changed = false;
  const store = createSelectionStore({
    packageRoot: f.packageRoot,
    account() {
      if (armed && ++calls === 2) {
        changed = true;
        writeFileSync(path.join(f.packageRoot, 'runner.mjs'), 'export const version = 2;\n');
        f.seal();
      }
      return f.account();
    },
  });
  await store.register();
  armed = true;
  await assert.rejects(store.assertSelected(), { code: 'APR_RUNTIME_CHANGED' });
  assert.equal(changed, true);
});
