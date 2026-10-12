// @story #190
// Explicit feasibility diagnostic, never an installed acceptance or unit waiver.
import test from 'node:test';
import assert from 'node:assert/strict';
import { selectionReadScopePrototype } from '../helpers/selection-read-scope-fixture.mjs';
test('diagnostic sixteen-call C1 comparison preserves original budgets and thirty-two fresh snapshots', async (t) => {
  const result = await selectionReadScopePrototype(t, 16);
  assert.deepEqual(result, {
    verified: false,
    unscoped: { acquisitions: 16, snapshots: 32, closed: 16 },
    scoped: { acquisitions: 1, snapshots: 32, closed: 1 },
  });
});
