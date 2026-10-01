import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  initializeManualLaunchHistory,
  manualLaunchProvesNonSubmission,
  readManualLaunchHistory,
  reserveManualLaunch,
  settleManualLaunch,
} from '../../src/provider/manual-launch-ledger.mjs';

test('manual launch history records exact attempts and leaves uncertain outcomes unresolved', async (t) => {
  const workspace = mkdtempSync(path.join(os.tmpdir(), 'apr-manual-launch-'));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  mkdirSync(path.join(workspace, 'locks'));
  const details = {
    reviewId: 'review-one',
    requestDigest: 'a'.repeat(64),
    intentDigest: `sha256:${'b'.repeat(64)}`,
  };
  initializeManualLaunchHistory(workspace, details);
  const operation = await reserveManualLaunch(workspace, details);
  assert.match(operation.id, /^manual:[a-f0-9-]+$/);
  assert.equal(readManualLaunchHistory(workspace, details).operations[0].status, 'reserved');
  await assert.rejects(reserveManualLaunch(workspace, details), {
    code: 'APR_WAKE_OUTCOME_UNKNOWN',
  });
  await settleManualLaunch(workspace, details, operation.id, 'not-submitted');
  assert.equal(readManualLaunchHistory(workspace, details).operations[0].status, 'not-submitted');
  assert.equal(manualLaunchProvesNonSubmission(workspace, details), true);
  mkdirSync(path.join(workspace, 'provider', 'claude'), { recursive: true });
  writeFileSync(path.join(workspace, 'provider', 'claude', 'launch-state.json'), '{}');
  assert.equal(manualLaunchProvesNonSubmission(workspace, details), false);
  const next = await reserveManualLaunch(workspace, details);
  await settleManualLaunch(workspace, details, next.id, 'outcome-unknown');
  await assert.rejects(reserveManualLaunch(workspace, details), {
    code: 'APR_WAKE_OUTCOME_UNKNOWN',
  });
  assert.equal(readManualLaunchHistory(workspace, details).operations.length, 2);
  assert.ok(readFileSync(path.join(workspace, 'manual-launch-history.json')).length > 0);
});

test('missing legacy manual history is not treated as a complete empty history', (t) => {
  const workspace = mkdtempSync(path.join(os.tmpdir(), 'apr-manual-legacy-'));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  assert.equal(
    readManualLaunchHistory(workspace, {
      reviewId: 'review-one',
      requestDigest: 'a'.repeat(64),
    }),
    null
  );
});
