// @story #190
// Explicitly unverified scheduling ports; actual owned primary I/O is exercised.
import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { setImmediate as drainCallbackContinuation } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import {
  createPrimaryMaintenance,
  createPrimaryMaintenanceCore,
  retryPrimaryMaintenanceCleanup,
} from '../../src/config/primary-maintenance.mjs';
import { createSelectionStore } from '../../src/config/runtime-selection-core.mjs';
import {
  createSelectionReadScope,
  selectionScopeOutcome,
} from '../../src/config/selection-read-scope.mjs';
import { runtimeFixture } from '../helpers/runtime-selection-fixture.mjs';
import { stockCommandTimings } from '../helpers/stock-command-timings.mjs';
import { fixtureHandleDiagnostics } from '../helpers/fixture-handle-diagnostics.mjs';
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
async function owned(
  t,
  { initial = false, mutateAfter = false, failAssert = false, afterCallback, onCommitted } = {}
) {
  const cleanup = { selection: null, scope: null, project: null, runtime: null };
  const trace = {
    context: null,
    callbackSettled: false,
    finalizerReached: false,
    mutationApplied: false,
    stages: [],
    admissions: [],
    callbackFailure: null,
    started: null,
  };
  let callbackSettlement = Promise.resolve();
  // Discharge real retained resources before fixture directories are removed,
  // including when an assertion or the original operation deadline fails.
  t.after(async () => {
    const stages = [];
    try {
      await callbackSettlement;
      await drainCallbackContinuation();
      stages.push('callback-settled');
      await cleanup.selection?.retryCleanup();
      stages.push('selection-cleanup-complete');
      await cleanup.scope?.retryCleanup();
      stages.push('scope-cleanup-complete');
      await retryPrimaryMaintenanceCleanup();
      stages.push('primary-maintenance-cleanup-complete');
    } finally {
      t.diagnostic(
        JSON.stringify({
          verified: false,
          operationalAuthority: 'unavailable',
          fixtureCleanup: {
            stages,
            callbackFailure: trace.callbackFailure,
            project: cleanup.project
              ? fixtureHandleDiagnostics([
                  cleanup.project.parent,
                  cleanup.project.root,
                  cleanup.project.commonDir,
                ])
              : null,
            runtime: cleanup.runtime ? fixtureHandleDiagnostics([cleanup.runtime.root]) : null,
          },
        })
      );
    }
  });
  const project = (cleanup.project = await setupHostFixture(t)),
    runtime = (cleanup.runtime = runtimeFixture(t));
  const selection = createSelectionStore({
    packageRoot: runtime.packageRoot,
    account: runtime.account,
  });
  cleanup.selection = selection;
  await selection.register();
  await selection.assertSelected();
  const selectionFile = await selection.location();
  const selectedBytes = readFileSync(selectionFile);
  // This is an explicitly unverified unit finalizer on actual owned bytes.
  // Genuine retained C1 guard races and complete original-budget admissions
  // have their own controls; this fixture proves primary effect ordering.
  const scope = createSelectionReadScope({
    finalize() {
      trace.finalizerReached = true;
      assert.ok(
        readFileSync(selectionFile).equals(selectedBytes),
        'unverified fixture selection changed at scope completion'
      );
    },
  });
  cleanup.scope = scope;
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
        const step = { startMs: Math.round(performance.now() - trace.started) };
        trace.admissions.push(step);
        try {
          await project.admission.assert(...args);
          if (failAssert && ++asserts === (typeof failAssert === 'number' ? failAssert : 2))
            throw new Error('fixture-pre-receipt');
        } catch (error) {
          step.failure = boundedFailure(error);
          throw error;
        } finally {
          step.endMs = Math.round(performance.now() - trace.started);
        }
      },
    },
    // Scheduling ports are deliberately unverified. The genuine selected
    // snapshot belongs to fixture preparation, outside the original primary
    // operation. No fixture result supplies installed admission authority.
    admit: async () => {},
    selectionScope: (original, callback) =>
      scope.run(original, (sink) => {
        trace.context = original;
        trace.started = performance.now();
        const actual = (async () => {
          try {
            const observing = {
              ...sink,
              possible() {
                trace.stages.push('possible-attempted');
                sink.possible();
                trace.stages.push('possible-accepted');
                effect = 'unknown';
              },
              committed(actualReceipt, actualResult) {
                trace.stages.push('commit-attempted');
                sink.committed(actualReceipt, actualResult);
                trace.stages.push('commit-accepted');
                effect = 'committed';
                receipt = actualReceipt;
                result = actualResult;
                onCommitted?.(original);
              },
            };
            const value = await callback(observing);
            if (mutateAfter) {
              trace.mutationApplied = true;
              const value = JSON.parse(readFileSync(selectionFile));
              value.selection_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
              writeFileSync(selectionFile, JSON.stringify(value));
            }
            return value;
          } catch (error) {
            trace.callbackFailure = boundedFailure(error);
            throw error;
          } finally {
            if (afterCallback) await afterCallback(original);
            trace.callbackSettled = true;
          }
        })();
        callbackSettlement = actual.then(
          () => {},
          () => {}
        );
        return actual;
      }),
  });
  return {
    project,
    core,
    scope,
    trace,
    waitCallback: async () => {
      await callbackSettlement;
      await drainCallbackContinuation();
    },
    effect: () => effect,
    retained: () => ({ receipt, result }),
  };
}
// Only bounded categories, counters and booleans leave this diagnostic fixture.
function boundedFailure(error) {
  const code = /^[A-Z][A-Z0-9_]{0,79}$/.test(error?.code ?? '') ? error.code : null;
  const reason = /^[a-z][a-z0-9-]{0,95}$/.test(error?.details?.reason ?? '')
    ? error.details.reason
    : null;
  return { code, reason };
}
function activationDiagnostic(f, failure, effectAtReturn) {
  const actual = JSON.parse(readFileSync(f.project.registrationPath));
  return JSON.stringify({
    verified: false,
    operationalAuthority: 'unavailable',
    effectAtReturn,
    effectAfterSettlement: f.effect(),
    failure: boundedFailure(failure),
    outcome: selectionScopeOutcome(failure),
    stages: f.trace.stages,
    admissions: f.trace.admissions,
    stockCommands: stockCommandTimings(f.trace.started),
    callbackFailure: f.trace.callbackFailure,
    callbackSettled: f.trace.callbackSettled,
    mutationApplied: f.trace.mutationApplied,
    finalizerReached: f.trace.finalizerReached,
    originalExpired: performance.now() >= f.trace.context.deadline,
    originalAborted: f.trace.context.signal.aborted,
    elapsedMs: Math.round(performance.now() - f.trace.started),
    primaryInitialized: actual.primary_initialized,
    receipts: readdirSync(path.dirname(f.project.registrationPath)).filter((name) =>
      name.startsWith('receipt-')
    ).length,
  });
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
test('actual activation preserves commitment through finalizer refusal or original-budget quiescence refusal', async (t) => {
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
  const effectAtReturn = f.effect();
  if (effectAtReturn !== 'committed') await f.waitCallback();
  const diagnostic = activationDiagnostic(f, failure, effectAtReturn);
  t.diagnostic(diagnostic);
  assert.equal(effectAtReturn, 'committed', diagnostic);
  const actual = JSON.parse(readFileSync(f.project.registrationPath));
  assert.equal(actual.primary_initialized, true);
  assert.deepEqual(f.retained().result, actual);
  assert.equal(
    readdirSync(path.dirname(f.project.registrationPath)).filter((name) =>
      name.startsWith('receipt-')
    ).length,
    1
  );
  const outcome = selectionScopeOutcome(failure);
  if (outcome.cleanup === 'discharged') {
    assert.equal(f.trace.callbackSettled, true);
    assert.equal(f.trace.mutationApplied, true);
    assert.equal(f.trace.finalizerReached, true);
    assert.deepEqual(outcome, {
      effect: 'committed',
      completion: 'uncertain',
      cleanup: 'discharged',
      infrastructure: 'may-exist',
    });
  } else {
    // Windows can commit before the original clock refuses a still-pending callback.
    // Do not claim that changed-selection finalization or resource discharge occurred.
    assert.equal(failure.details?.reason, 'quiescence-unproved');
    assert.ok(performance.now() >= f.trace.context.deadline);
    assert.equal(f.trace.finalizerReached, false);
    assert.deepEqual(outcome, {
      effect: 'committed',
      completion: 'uncertain',
      cleanup: 'retained',
      infrastructure: 'may-exist',
    });
    assert.throws(() => f.scope.assertRegistrationAllowed(), {
      code: 'APR_SELECTION_SCOPE_UNAVAILABLE',
    });
    await f.waitCallback();
    assert.equal(f.trace.callbackSettled, true);
    await f.scope.retryCleanup();
    f.scope.assertRegistrationAllowed();
  }
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

// @story #209
// Controlled pending callback proves the retained branch without a slower CI host.
test('committed activation retains an aborted original callback until actual settlement', async (t) => {
  const controller = new AbortController();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  t.after(() => release());
  const f = await owned(t, {
    mutateAfter: true,
    onCommitted: () => controller.abort(),
    afterCallback: () => gate,
  });
  await f.project.setupApply();
  f.project.git('add', '.');
  f.project.git('commit', '-m', 'fixture controlled primary policy');
  const original = { signal: controller.signal, deadline: performance.now() + 30000 };
  let failure;
  try {
    await f.core.activate({ cwd: f.project.root, ...original });
  } catch (error) {
    failure = error;
  }
  assert.ok(failure);
  assert.equal(f.effect(), 'committed');
  assert.equal(JSON.parse(readFileSync(f.project.registrationPath)).primary_initialized, true);
  assert.equal(f.trace.context.signal, original.signal);
  assert.equal(f.trace.context.deadline, original.deadline);
  assert.equal(f.trace.callbackSettled, false);
  assert.equal(f.trace.mutationApplied, false);
  assert.equal(f.trace.finalizerReached, false);
  assert.deepEqual(selectionScopeOutcome(failure), {
    effect: 'committed',
    completion: 'uncertain',
    cleanup: 'retained',
    infrastructure: 'may-exist',
  });
  assert.throws(() => f.scope.assertRegistrationAllowed(), {
    code: 'APR_SELECTION_SCOPE_UNAVAILABLE',
  });
  release();
  await f.waitCallback();
  assert.equal(f.trace.callbackSettled, true);
  await f.scope.retryCleanup();
  f.scope.assertRegistrationAllowed();
  assert.equal(f.trace.context.deadline, original.deadline);
});
