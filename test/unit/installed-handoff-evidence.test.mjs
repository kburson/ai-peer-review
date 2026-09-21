import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadLegacyAuthority } from '../helpers/internal-api.mjs';
import { identity, NOW } from '../helpers/intervention-fixture.mjs';
import { inspectInstalledHandoff } from '../helpers/installed-handoff-evidence.mjs';
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
  mkdirSync(path.join(root, '.scratch/test'), { recursive: true });
  const workspace = mkdtempSync(path.join(root, '.scratch/test/handoff-receipt-'));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const events = authorRevisionEvents();
  events.push(
    event('author-revision-committed', {
      sequence: events.length + 1,
      revision: events.at(-1).revision + 1,
    })
  );
  writeFileSync(
    path.join(workspace, 'events.jsonl'),
    events.map((item) => JSON.stringify(item)).join('\n') + '\n'
  );
  const input = { installed: root, workspace, head: 'a'.repeat(40) };
  const bindings = path.join(workspace, 'provider/bindings');
  mkdirSync(bindings, { recursive: true });
  const operations = [];
  for (const [index, role] of ['author', 'reviewer'].entries()) {
    writeFileSync(
      path.join(bindings, `${role}.json`),
      JSON.stringify({
        session_fingerprint: FINGERPRINTS[role],
        adapter_version: '1.0.0',
        evidence_digest: `sha256:${'c'.repeat(64)}`,
      })
    );
    const operation = reserveWakeOperation(
      workspace,
      {
        kind: 'wake',
        authority_revision: 3 + index,
        participant_fingerprint: FINGERPRINTS[role],
        transport: { capability: 'live-wait', adapter_version: '1.0.0' },
        delivery: {
          delivery_id: `${role}-turn`,
          recipient: role,
          digest: `sha256:${'d'.repeat(64)}`,
          sequence: 4 + index,
          revision: 3 + index,
          receipt_verified: true,
        },
        capsule: {
          schema: 'ai-peer-review.wake-capsule/v1',
          review_id: 'review-01',
          expected_revision: 3 + index,
          target_role: role,
          reason: 'role-actionable',
          next_command: 'peer-review resume /fixture',
        },
      },
      new Date(NOW)
    );
    assert.equal(await inspectInstalledHandoff(input), null);
    appendWakeOutcome(
      workspace,
      operation.operation_id,
      { status: 'acknowledged', reason: 'fixture-acknowledged' },
      new Date(NOW)
    );
    operations.push(operation.operation_id);
  }
  const receipt = await inspectInstalledHandoff(input);
  assert.equal(receipt.commit_mode, 'normal');
  assert.equal(receipt.outcome, 'two-way-acknowledged');
  assert.equal(receipt.author_wake_operation, operations[0]);
  assert.equal(receipt.reviewer_wake_operation, operations[1]);
  assert.equal(receipt.package_head, input.head);
});
