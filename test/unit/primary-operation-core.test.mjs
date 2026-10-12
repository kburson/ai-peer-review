// @story #190
// Explicitly unverified scheduling ports; actual owned primary I/O is exercised.
import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import {
  createPrimaryMaintenance,
  createPrimaryMaintenanceCore,
} from '../../src/config/primary-maintenance.mjs';
import { createSelectionStore } from '../../src/config/runtime-selection-core.mjs';
import { selectionScopeOutcome } from '../../src/config/selection-read-scope.mjs';
import { runtimeFixture } from '../helpers/runtime-selection-fixture.mjs';
import { setupHostFixture } from '../helpers/setup-host-fixture.mjs';
const packageRoot = fileURLToPath(new URL('../..', import.meta.url));
const context = () => ({
  signal: new AbortController().signal,
  deadline: performance.now() + 30000,
});

test('production maintenance requires its explicit scope port', () => {
  assert.throws(
    () =>
      createPrimaryMaintenance({
        packageRoot,
        home: '/unverified',
        admit: async () => {},
        integrationContract: 'fixture',
      }),
    /scope/i
  );
});
for (const method of ['register', 'activate']) {
  test(`${method} enters scope before first admission with unchanged original context`, async () => {
    const original = context(),
      trace = [],
      failure = new Error('fixture-admission');
    const core = createPrimaryMaintenanceCore({
      packageRoot,
      home: '/unverified',
      integrationContract: 'fixture',
      admit: async (observed) => {
        assert.equal(observed.signal, original.signal);
        assert.equal(observed.deadline, original.deadline);
        trace.push('admit');
        throw failure;
      },
      admission: { run: async () => {}, assert: async () => {} },
      selectionScope: async (observed, callback) => {
        assert.equal(observed.signal, original.signal);
        assert.equal(observed.deadline, original.deadline);
        trace.push('scope-enter');
        try {
          return await callback({});
        } finally {
          trace.push('scope-close');
        }
      },
    });
    await assert.rejects(core[method](original), (error) => error === failure);
    assert.deepEqual(trace, ['scope-enter', 'admit', 'scope-close']);
  });
}
test('omitted fixture scope remains unscoped and history operations never enter a supplied port', async () => {
  for (const scoped of [false, true]) {
    const trace = [],
      failure = new Error('fixture-admission');
    const core = createPrimaryMaintenanceCore({
      packageRoot,
      home: '/unverified',
      integrationContract: 'fixture',
      admit: async () => {
        trace.push('admit');
        throw failure;
      },
      admission: { run: async () => {}, assert: async () => {} },
      ...(scoped
        ? {
            selectionScope: async () => {
              trace.push('scope');
            },
          }
        : {}),
    });
    if (!scoped) await assert.rejects(core.register(), (error) => error === failure);
    else
      for (const method of ['preserveHistory', 'holdReview', 'releaseReview'])
        await assert.rejects(core[method]({}), (error) => error === failure);
    assert.equal(trace.includes('scope'), false);
  }
});
async function owned(t, { initial = false, mutateAfter = false, failAssert = false } = {}) {
  const project = await setupHostFixture(t),
    runtime = runtimeFixture(t);
  const selection = createSelectionStore({
    packageRoot: runtime.packageRoot,
    account: runtime.account,
  });
  await selection.register();
  if (initial) rmSync(path.dirname(project.registrationPath), { recursive: true, force: true });
  let asserts = 0,
    effect = 'none',
    receipt,
    result;
  const core = createPrimaryMaintenanceCore({
    packageRoot,
    home: project.home,
    integrationContract: 'ai-peer-review.integration/v1',
    admission: {
      run: project.admission.run,
      assert: async (...args) => {
        await project.admission.assert(...args);
        if (failAssert && ++asserts === (typeof failAssert === 'number' ? failAssert : 2))
          throw new Error('fixture-pre-receipt');
      },
    },
    // Scheduling ports are deliberately unverified. One genuine selected
    // snapshot pins the actual close-race control; full real admissions belong
    // to the dedicated genuine-operation gate, never these effect unit tests.
    admit: async () => {},
    selectionScope: (original, callback) =>
      selection.withReadScope(original, async (sink) => {
        await selection.assertSelected(original);
        const observing = {
          ...sink,
          possible() {
            effect = 'unknown';
            sink.possible();
          },
          committed(actualReceipt, actualResult) {
            sink.committed(actualReceipt, actualResult);
            effect = 'committed';
            receipt = actualReceipt;
            result = actualResult;
          },
        };
        const value = await callback(observing);
        if (mutateAfter) {
          const file = await selection.location(original),
            value = JSON.parse(readFileSync(file));
          value.selection_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
          writeFileSync(file, JSON.stringify(value));
        }
        return value;
      }),
  });
  return { project, core, effect: () => effect, retained: () => ({ receipt, result }) };
}
test('actual primary commit persists when final selection closure becomes uncertain', async (t) => {
  const f = await owned(t, { initial: true, mutateAfter: true });
  let failure;
  try {
    await f.core.register({ cwd: f.project.root });
  } catch (error) {
    failure = error;
  }
  assert.ok(failure);
  assert.equal(f.effect(), 'committed');
  const actual = JSON.parse(readFileSync(f.project.registrationPath));
  assert.equal(actual.primary_root, f.project.root);
  const receipts = readdirSync(path.dirname(f.project.registrationPath)).filter((name) =>
    name.startsWith('receipt-')
  );
  assert.equal(receipts.length, 1);
  assert.deepEqual(f.retained().result, actual);
  assert.deepEqual(f.retained().receipt.after, actual);
  assert.deepEqual(selectionScopeOutcome(failure), {
    effect: 'committed',
    completion: 'uncertain',
    cleanup: 'discharged',
    infrastructure: 'may-exist',
  });
  assert.equal(JSON.stringify(selectionScopeOutcome(failure)).includes(f.project.root), false);
});
test('pre-receipt failure after actual root provisioning retains infrastructure with no primary effect', async (t) => {
  const f = await owned(t, { initial: true, failAssert: true });
  let failure;
  try {
    await f.core.register({ cwd: f.project.root });
  } catch (error) {
    failure = error;
  }
  assert.ok(failure);
  assert.equal(f.effect(), 'none');
  assert.equal(existsSync(path.dirname(f.project.registrationPath)), true);
  assert.equal(existsSync(f.project.registrationPath), false);
  assert.equal(
    readdirSync(path.dirname(f.project.registrationPath)).some((name) =>
      name.startsWith('receipt-')
    ),
    false
  );
  assert.deepEqual(selectionScopeOutcome(failure), {
    effect: 'none',
    completion: 'uncertain',
    cleanup: 'discharged',
    infrastructure: 'may-exist',
  });
});
for (const dryRun of [false, true]) {
  test(`unchanged register leaves no primary write in actual ${dryRun ? 'dry-run' : 'no-op'}`, async (t) => {
    const f = await owned(t),
      before = readFileSync(f.project.registrationPath);
    await f.core.register({ cwd: f.project.root, update: true, dryRun });
    assert.equal(f.effect(), 'none');
    assert.equal(readFileSync(f.project.registrationPath).equals(before), true);
    assert.equal(
      readdirSync(path.dirname(f.project.registrationPath)).some((name) =>
        name.startsWith('receipt-')
      ),
      false
    );
  });
}

test('actual receipt write followed by failed activation read-back remains unknown, without rollback', async (t) => {
  const f = await owned(t, { initial: true, failAssert: 3 });
  let failure;
  try {
    await f.core.register({ cwd: f.project.root });
  } catch (error) {
    failure = error;
  }
  assert.ok(failure);
  assert.equal(f.effect(), 'unknown');
  assert.equal(existsSync(f.project.registrationPath), false);
  assert.equal(
    readdirSync(path.dirname(f.project.registrationPath)).filter((name) =>
      name.startsWith('receipt-')
    ).length,
    1
  );
  assert.deepEqual(selectionScopeOutcome(failure), {
    effect: 'unknown',
    completion: 'uncertain',
    cleanup: 'discharged',
    infrastructure: 'may-exist',
  });
});
test('actual activation remains committed when scope completion rejects changed selection', async (t) => {
  const f = await owned(t, { mutateAfter: true });
  await f.project.setupApply();
  f.project.git('add', '.');
  f.project.git('commit', '-m', 'fixture owned policy');
  let failure;
  try {
    await f.core.activate({ cwd: f.project.root });
  } catch (error) {
    failure = error;
  }
  assert.ok(failure);
  assert.equal(f.effect(), 'committed');
  const actual = JSON.parse(readFileSync(f.project.registrationPath));
  assert.equal(actual.primary_initialized, true);
  assert.deepEqual(f.retained().result, actual);
  assert.equal(
    readdirSync(path.dirname(f.project.registrationPath)).filter((name) =>
      name.startsWith('receipt-')
    ).length,
    1
  );
  assert.deepEqual(selectionScopeOutcome(failure), {
    effect: 'committed',
    completion: 'uncertain',
    cleanup: 'discharged',
    infrastructure: 'may-exist',
  });
});

test('CLI scope failure projection reports committed effects and refuses automatic retry without leaking the callback error', async (t) => {
  const api = await import('../../src/config/selection-read-scope.mjs');
  assert.equal(typeof api.renderSelectionScopeFailure, 'function');
  const f = await owned(t, { initial: true, mutateAfter: true });
  let failure;
  try {
    await f.core.register({ cwd: f.project.root });
  } catch (error) {
    failure = error;
  }
  const originalMessage = failure.message;
  const projected = api.renderSelectionScopeFailure(failure);
  assert.equal(projected.mutation_occurred, true);
  assert.equal(projected.retry_safe, false);
  assert.match(projected.message, /effect committed.*completion uncertain/i);
  assert.equal(projected.details.selection_scope.effect, 'committed');
  assert.equal(JSON.stringify(projected).includes(f.project.root), false);
  assert.equal(
    failure.message,
    originalMessage,
    'formatting does not replace or mutate the actual exception'
  );
  assert.equal(api.renderSelectionScopeFailure(new Error('private unrelated failure')), null);
});
