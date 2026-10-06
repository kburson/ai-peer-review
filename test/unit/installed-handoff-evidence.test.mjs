import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadLegacyAuthority } from '../helpers/internal-api.mjs';
import { identity, NOW } from '../helpers/intervention-fixture.mjs';
import {
  inspectInstalledHandoff,
  inspectInstalledHandoffWorkspaces,
} from '../helpers/installed-handoff-evidence.mjs';
import { authorRevisionEvents, event, FINGERPRINTS } from '../helpers/review-fixture.mjs';
import { appendWakeOutcome, reserveWakeOperation } from '../../src/coordinator/ledger.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));

test('live receipt inspection reads real event authority and leaves a pending handoff unproven', async (t) => {
  mkdirSync(path.join(root, '.scratch/test'), { recursive: true });
  const cwd = mkdtempSync(path.join(root, '.scratch/test/handoff-evidence-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const review = await loadLegacyAuthority({
    cwd,
    identity: identity('author', 'receipt-fixture-author'),
    reviewId: 'receipt-fixture',
    now: NOW,
  });
  assert.equal(
    await inspectInstalledHandoff({
      installed: root,
      workspace: review.paths.workspace,
      head: 'a'.repeat(40),
    }),
    null
  );
});

test('live receipt requires two acknowledged role wakes and records normal commit authority', async (t) => {
  const fixture = handoffFixture(t, { authorSubmitted: true, reviewerSubmitted: true });
  assert.equal(await inspectInstalledHandoff(fixture.input), null);
  const author = fixture.wake('author', 'acknowledged');
  assert.equal(await inspectInstalledHandoff(fixture.input), null);
  const reviewer = fixture.wake('reviewer', 'acknowledged');
  writeFileSync(
    path.join(fixture.input.workspace, 'wake/operations', '.in-progress.json.tmp'),
    'incomplete atomic write'
  );
  const receipt = await inspectInstalledHandoff(fixture.input);
  assert.equal(receipt.commit_mode, 'normal');
  assert.equal(receipt.outcome, 'two-way-acknowledged');
  assert.equal(receipt.author_wake_operation, author.operation_id);
  assert.equal(receipt.reviewer_wake_operation, reviewer.operation_id);
  assert.equal(receipt.package_head, fixture.input.head);
  assert.equal(receipt.author_submission_sequence, 6);
  assert.equal(receipt.return_reviewer_submission_sequence, 7);
});

function handoffFixture(t, { authorSubmitted = false, reviewerSubmitted = false } = {}) {
  mkdirSync(path.join(root, '.scratch/test'), { recursive: true });
  const workspace = mkdtempSync(path.join(root, '.scratch/test/handoff-terminal-'));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const events = authorRevisionEvents();
  if (authorSubmitted)
    events.push(event('author-revision-committed', { sequence: 6, revision: 4 }));
  if (reviewerSubmitted) {
    events.push(event('reviewer-accepted', { sequence: 7, revision: 5, payload: { turn: 2 } }));
  }
  for (const item of events) {
    const participant = item.payload.author ?? item.payload.reviewer;
    if (participant)
      Object.assign(participant, {
        provider: 'anthropic',
        host: 'claude-code',
        model_id: 'claude-opus-5',
      });
  }
  writeFileSync(path.join(workspace, 'events.jsonl'), events.map(JSON.stringify).join('\n') + '\n');
  const bindings = path.join(workspace, 'provider/bindings');
  mkdirSync(bindings, { recursive: true });
  for (const role of ['author', 'reviewer'])
    writeFileSync(
      path.join(bindings, `${role}.json`),
      JSON.stringify({
        schema: 'ai-peer-review.participant-binding/v1',
        review_id: 'review-01',
        role,
        provider: 'anthropic',
        host: 'claude-code',
        model_id: 'claude-opus-5',
        session_fingerprint: FINGERPRINTS[role],
        adapter_version: '1.0.0',
        evidence_digest: `sha256:${'c'.repeat(64)}`,
      })
    );
  return {
    input: { installed: root, workspace, head: 'a'.repeat(40) },
    wake(role, status, fingerprint = FINGERPRINTS[role], revision = role === 'author' ? 3 : 4) {
      const operation = reserveWakeOperation(
        workspace,
        {
          kind: 'wake',
          participant_fingerprint: fingerprint,
          transport: { capability: 'live-wait', adapter_version: '1.0.0' },
          capsule: {
            schema: 'ai-peer-review.wake-capsule/v1',
            review_id: 'review-01',
            expected_revision: revision,
            target_role: role,
            reason: 'role-actionable',
            next_command: 'peer-review resume /fixture',
          },
        },
        new Date(NOW)
      );
      if (status)
        appendWakeOutcome(
          workspace,
          operation.operation_id,
          { status, reason: 'private provider response must not escape' },
          new Date(NOW)
        );
      return operation;
    },
  };
}

for (const role of ['author', 'reviewer']) {
  for (const status of ['outcome-unknown', 'refused']) {
    test(`live inspection fails promptly on ${role} ${status} without leaking provider reason`, async (t) => {
      const fixture = handoffFixture(t, { authorSubmitted: true });
      fixture.wake(role, status);
      await assert.rejects(inspectInstalledHandoff(fixture.input), (error) => {
        assert.equal(error.code, 'APR_LIVE_HANDOFF_UNPROVEN');
        assert.equal(error.stage, `${role}-wake`);
        assert.equal(error.reason, `wake-${status}`);
        assert.doesNotMatch(error.message, /private provider response/);
        return true;
      });
    });
  }
  test(`acknowledged ${role} wake without its subsequent submission fails promptly`, async (t) => {
    const fixture = handoffFixture(t, { authorSubmitted: role === 'reviewer' });
    fixture.wake(role, 'acknowledged');
    await assert.rejects(inspectInstalledHandoff(fixture.input), {
      code: 'APR_LIVE_HANDOFF_UNPROVEN',
      stage: `${role}-submission`,
      reason: 'acknowledged-without-protocol-progress',
    });
  });
}

test('success requires matching bound wake sessions and actual second reviewer submission', async (t) => {
  const fixture = handoffFixture(t, { authorSubmitted: true, reviewerSubmitted: true });
  fixture.wake('author', 'acknowledged');
  fixture.wake('reviewer', 'acknowledged', FINGERPRINTS.replacement);
  await assert.rejects(inspectInstalledHandoff(fixture.input), {
    code: 'APR_LIVE_BINDING_CONFLICT',
  });
});

test('completed author finalization does not invalidate an already proven two-way handoff', async (t) => {
  const fixture = handoffFixture(t, { authorSubmitted: true, reviewerSubmitted: true });
  fixture.wake('author', 'acknowledged');
  fixture.wake('reviewer', 'acknowledged');
  appendFileSync(
    path.join(fixture.input.workspace, 'events.jsonl'),
    [
      event('finalization-started', { sequence: 8, revision: 6 }),
      event('acceptance-committed', { sequence: 9, revision: 7 }),
    ]
      .map(JSON.stringify)
      .join('\n') + '\n'
  );
  fixture.wake('author', 'acknowledged', FINGERPRINTS.author, 5);
  assert.equal((await inspectInstalledHandoff(fixture.input)).outcome, 'two-way-acknowledged');
});

test('initial author exit without a created review fails immediately with sanitized stage and reason', (t) => {
  const host = mkdtempSync(path.join(root, '.scratch/test/handoff-empty-'));
  t.after(() => rmSync(host, { recursive: true, force: true }));
  assert.deepEqual(inspectInstalledHandoffWorkspaces({ host, authorSettled: false }), []);
  assert.throws(() => inspectInstalledHandoffWorkspaces({ host, authorSettled: true }), {
    code: 'APR_LIVE_HANDOFF_UNPROVEN',
    stage: 'author-start',
    reason: 'no-review-progress',
  });
});
