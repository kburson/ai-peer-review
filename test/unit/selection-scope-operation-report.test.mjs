// @story #190
// Closed data validation only; these fixture counters establish no authority.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
const file = new URL('../helpers/selection-scope-operation-report.mjs', import.meta.url);
const api = existsSync(file) ? await import(file) : {};
const trace = (mode) => ({
  verified: false,
  operationalAuthority: 'unavailable',
  observerExitObserved: true,
  unavailable: 0,
  observations: [
    { kind: 'original', context: 1, caller: 'original' },
    ...Array.from({ length: 16 }, () => ({
      kind: 'selection',
      context: 1,
      caller: 'assertSelected',
    })),
  ],
  acquisitions: mode === 'scoped' ? 1 : 16,
  freshSnapshots: 32,
  descriptorsClosed: mode === 'scoped' ? 1 : 16,
  operationExitObserved: true,
});
test('comparison validates actual count coverage without granting installed authority', () => {
  assert.equal(typeof api.summarizeScopeOperation, 'function');
  for (const mode of ['scoped', 'unscoped']) {
    const report = api.summarizeScopeOperation(trace(mode), mode);
    assert.equal(report.comparisonMatched, true);
    assert.equal(report.matchingAdmissions, 16);
    assert.equal(report.freshSnapshots, 32);
    assert.equal(report.verified, false);
    assert.equal(report.operationalAuthority, 'unavailable');
    assert.equal(report.guaranteedStartupSavingMs, 0);
  }
});
test('any unexplained context, missing close or changed real count stops the comparison', () => {
  assert.equal(typeof api.summarizeScopeOperation, 'function');
  for (const changed of [
    { acquisitions: 2 },
    { freshSnapshots: 31 },
    { descriptorsClosed: 0 },
    { operationExitObserved: false },
    { observerExitObserved: false },
    { unavailable: 1 },
  ])
    assert.equal(
      api.summarizeScopeOperation({ ...trace('scoped'), ...changed }, 'scoped').comparisonMatched,
      false
    );
  const changed = trace('scoped');
  changed.observations[1].context = 2;
  const result = api.summarizeScopeOperation(changed, 'scoped');
  assert.equal(result.comparisonMatched, false);
  assert.equal(result.otherCalls, 1);
});
test('private or widened diagnostic fields refuse before public projection', () => {
  assert.equal(typeof api.summarizeScopeOperation, 'function');
  for (const changed of [
    { path: '/private' },
    { signal: {} },
    { deadline: 30000 },
    { verified: true },
    { acquisitions: -1 },
  ])
    assert.throws(() => api.summarizeScopeOperation({ ...trace('scoped'), ...changed }, 'scoped'));
  const changed = trace('scoped');
  changed.observations[1].principal = 'private';
  assert.throws(() => api.summarizeScopeOperation(changed, 'scoped'));
});

const coverage = (scoped) => ({
  sourceSha256: 'a'.repeat(64),
  counters: [
    { name: 'inspect', startOffset: 0, endOffset: 10, count: scoped ? 226 : 256 },
    { name: 'inspectAncestors', startOffset: 10, endOffset: 20, count: scoped ? 226 : 256 },
    { name: 'observeStorageProtection', startOffset: 20, endOffset: 30, count: scoped ? 5 : 20 },
    { name: 'openProtectedRoot', startOffset: 30, endOffset: 40, count: scoped ? 5 : 20 },
    { name: 'readSnapshot', startOffset: 40, endOffset: 50, count: 32 },
    { name: 'verify', startOffset: 50, endOffset: 60, count: 160 },
  ],
});
test('paired engine metadata accounts for precisely fifteen acquisitions and thirty root inspections', () => {
  assert.equal(typeof api.compareScopeOperationReports, 'function');
  const a = {
    report: api.summarizeScopeOperation(trace('unscoped'), 'unscoped'),
    coverage: coverage(false),
  };
  const b = {
    report: api.summarizeScopeOperation(trace('scoped'), 'scoped'),
    coverage: coverage(true),
  };
  assert.equal(api.compareScopeOperationReports(a, b).comparisonMatched, true);
  for (const index of [0, 1, 2, 3, 4, 5]) {
    const changed = structuredClone(b);
    changed.coverage.counters[index].count++;
    assert.equal(api.compareScopeOperationReports(a, changed).comparisonMatched, false);
  }
  const changed = structuredClone(b);
  changed.coverage.sourceSha256 = 'b'.repeat(64);
  assert.equal(api.compareScopeOperationReports(a, changed).comparisonMatched, false);
});
