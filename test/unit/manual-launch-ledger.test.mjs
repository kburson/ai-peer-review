import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
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

// @story #190: isolated protocol fixtures, never actual provider evidence.
test('explicit reconciliation restores missing resume state only after exact terminal submission proof', async (t) => {
  const subject = await import('../../src/provider/manual-launch-ledger.mjs');
  assert.equal(typeof subject.reconcileSubmittedManualLaunch, 'function');
  const workspace = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'apr-terminal-recovery-')));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.dirname(workspace),
    invitation = path.join(workspace, 'invitation.md'),
    response = path.join(workspace, 'response.md');
  writeFileSync(response, 'Sealed notes.\n');
  const { createHash } = await import('node:crypto');
  const { canonicalProjection } = await import('../../src/protocol/canonical-projection.mjs');
  const { fingerprintSession } = await import('../../src/identity/fingerprint.mjs');
  const sha = (b) => 'sha256:' + createHash('sha256').update(b).digest('hex');
  const session = '00000000-0000-4000-8000-000000000001',
    fingerprint = fingerprintSession('anthropic', session),
    model = 'fixture-model',
    effort = 'high';
  const details = {
    reviewId: 'recovery-review',
    requestDigest: 'a'.repeat(64),
    intentDigest: sha(canonicalProjection({ invitation, response, model, effort, resume: false })),
  };
  initializeManualLaunchHistory(workspace, details);
  await reserveManualLaunch(workspace, details);
  const authority = {
    state: {
      participants: { reviewer: { session_fingerprint: fingerprint } },
      protocol: {
        review_id: details.reviewId,
        revision: 7,
        startup: { runtime: { reviewer: { model_id: model, effort } } },
      },
    },
    events: [
      {
        type: 'reviewer-revisions-requested',
        actor: fingerprint,
        revision: 3,
        payload: {
          response: { path: path.relative(root, response), digest: sha(readFileSync(response)) },
        },
      },
    ],
  };
  const input = {
    workspace,
    root,
    invitation,
    details,
    authority,
    observeTerminal: async () => ({
      binding: { handle_locator: session, session_fingerprint: fingerprint, model_id: model },
      snapshot: {
        source: 'official-session-record',
        phase: 'terminal-snapshot',
        session_id: session,
        model_id: model,
      },
    }),
  };
  const before = readFileSync(path.join(workspace, 'manual-launch-history.json'));
  for (const observeTerminal of [
    async () => {
      throw new AprError('APR_CLAUDE_SESSION_ACTIVE', 'active');
    },
    async () => null,
    async () => ({
      binding: { handle_locator: session, session_fingerprint: fingerprint, model_id: model },
      snapshot: {
        source: 'official-session-record',
        phase: 'terminal-snapshot',
        session_id: 'different',
        model_id: model,
      },
    }),
  ]) {
    await assert.rejects(subject.reconcileSubmittedManualLaunch({ ...input, observeTerminal }));
    assert.deepEqual(readFileSync(path.join(workspace, 'manual-launch-history.json')), before);
    assert.equal(
      (await import('node:fs')).existsSync(
        path.join(workspace, 'provider/claude/launch-state.json')
      ),
      false
    );
  }
  await subject.reconcileSubmittedManualLaunch(input);
  const state = JSON.parse(readFileSync(path.join(workspace, 'provider/claude/launch-state.json')));
  assert.equal(state.session_handle, session);
  assert.equal(state.protocol_revision, 3);
  assert.equal(readManualLaunchHistory(workspace, details).operations[0].status, 'submitted');
  const settled = readFileSync(path.join(workspace, 'manual-launch-history.json'));
  await subject.reconcileSubmittedManualLaunch(input);
  assert.deepEqual(readFileSync(path.join(workspace, 'manual-launch-history.json')), settled);
  const resumed = await reserveManualLaunch(workspace, {
    ...details,
    intentDigest: sha(canonicalProjection({ invitation, response, model, effort, resume: true })),
  });
  assert.equal(readManualLaunchHistory(workspace, details).operations.at(-1).id, resumed.id);
  assert.equal(
    authority.events.length,
    1,
    'reconciliation/continuation must not replay a reviewer submission'
  );
});
