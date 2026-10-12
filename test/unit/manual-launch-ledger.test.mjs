import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { AprError } from '../../src/errors.mjs';

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

test('refused launch bookkeeping leaves the complete workspace unchanged before lock creation', async (t) => {
  const workspace = mkdtempSync(path.join(os.tmpdir(), 'apr-refused-launch-'));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const details = {
    reviewId: 'review-one',
    requestDigest: 'a'.repeat(64),
    intentDigest: 'sha256:' + 'b'.repeat(64),
  };
  const { snapshotReviewHistory } = await import('../../src/config/review-history-snapshot.mjs');
  const before = snapshotReviewHistory(workspace);
  await assert.rejects(
    reserveManualLaunch(workspace, details, {
      effect: () => {
        throw new AprError('APR_PRIMARY_AUTHORITY_UNAVAILABLE', 'held review', {
          recovery: 'Keep the held evidence intact.',
        });
      },
    }),
    /held review/
  );
  assert.deepEqual(snapshotReviewHistory(workspace), before);
});

test('completed joined launch can resume with exact native proof but never becomes abandonment evidence', async (t) => {
  const workspace = mkdtempSync(path.join(os.tmpdir(), 'apr-manual-completed-'));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const details = {
    reviewId: 'review-one',
    requestDigest: 'a'.repeat(64),
    intentDigest: 'sha256:' + 'b'.repeat(64),
  };
  initializeManualLaunchHistory(workspace, details);
  const first = await reserveManualLaunch(workspace, details);
  await settleManualLaunch(workspace, details, first.id, 'outcome-unknown');
  const proof = {
    schema: 'ai-peer-review.manual-completion-proof/v1',
    session_fingerprint: 'sha256:' + 'c'.repeat(64),
    transcript_digest: 'sha256:' + 'd'.repeat(64),
    last_turn_at: '2026-10-11T19:38:11.383Z',
    protocol_revision: 2,
  };
  const next = await reserveManualLaunch(workspace, details, { reconcile: () => proof });
  assert.notEqual(next.id, first.id);
  assert.equal(
    readManualLaunchHistory(workspace, details).operations[0].status,
    'session-completed'
  );
  assert.equal(manualLaunchProvesNonSubmission(workspace, details), false);
  const receipt = JSON.parse(
    readFileSync(
      path.join(workspace, 'manual-launch-settlements', first.id.slice(7) + '.json'),
      'utf8'
    )
  );
  assert.equal(receipt.prior_status, 'outcome-unknown');
  assert.equal(receipt.operation_id, first.id);
  assert.deepEqual(receipt.proof, proof);
  const receiptFile = path.join(
    workspace,
    'manual-launch-settlements',
    first.id.slice(7) + '.json'
  );
  writeFileSync(
    receiptFile,
    JSON.stringify({ ...receipt, intent_digest: 'sha256:' + 'e'.repeat(64) })
  );
  assert.throws(() => readManualLaunchHistory(workspace, details), {
    code: 'APR_WAKE_OUTCOME_UNKNOWN',
  });
});

test('reserved, legacy, multiple, or invalid completion evidence keeps launches fenced and bytes unchanged', async (t) => {
  for (const scenario of ['reserved', 'legacy', 'multiple', 'invalid', 'refused-authority']) {
    await t.test(scenario, async (t) => {
      const workspace = mkdtempSync(path.join(os.tmpdir(), 'apr-manual-fenced-'));
      t.after(() => rmSync(workspace, { recursive: true, force: true }));
      const details = {
        reviewId: 'review-one',
        requestDigest: 'a'.repeat(64),
        intentDigest: 'sha256:' + 'b'.repeat(64),
      };
      initializeManualLaunchHistory(workspace, details);
      const op = await reserveManualLaunch(workspace, details);
      if (scenario !== 'reserved')
        await settleManualLaunch(workspace, details, op.id, 'outcome-unknown');
      const file = path.join(workspace, 'manual-launch-history.json');
      const history = JSON.parse(readFileSync(file));
      if (scenario === 'legacy') history.coverage = 'legacy-unknown';
      if (scenario === 'multiple')
        history.operations.push({
          ...history.operations[0],
          id: 'manual:11111111-1111-1111-1111-111111111111',
        });
      writeFileSync(file, JSON.stringify(history));
      const before = readFileSync(file);
      await assert.rejects(
        reserveManualLaunch(workspace, details, {
          verifyAuthority() {
            if (scenario === 'refused-authority')
              throw new AprError('APR_WAKE_OUTCOME_UNKNOWN', 'fenced', {
                recovery: 'Keep evidence.',
              });
          },
          reconcile: () => ({ schema: 'untrusted', status: 'complete' }),
        }),
        { code: 'APR_WAKE_OUTCOME_UNKNOWN' }
      );
      assert.deepEqual(readFileSync(file), before);
    });
  }
});
