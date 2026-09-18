import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';

import { inspectReviewLock } from '../../src/protocol/store.mjs';
import { compatibilityDeclared, event, participant, v2Event } from '../helpers/review-fixture.mjs';
import { reclaimReviewLock } from '../helpers/internal-api.mjs';

function workspaceFixture(t) {
  const workspace = mkdtempSync(path.join(tmpdir(), 'ai-peer-review-lock-recovery-'));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  return workspace;
}

function writeForeignLock(workspace) {
  const lockDirectory = path.join(workspace, 'locks');
  mkdirSync(lockDirectory, { recursive: true });
  writeFileSync(
    path.join(lockDirectory, 'review.lock'),
    `${JSON.stringify({ schema: 'ai-peer-review.lock/v2', token: 'foreign', pid: 91, host: 'retired-host', boot_id: 'boot-a', process_start: 'start-a', acquired_at: '2026-09-18T00:00:00.000Z' })}\n`
  );
}

test('explicit reclaim appends sequence-only v2 authority to an active v2 log', async (t) => {
  const workspace = workspaceFixture(t);
  const created = event('review-created');
  const compatibility = {
    minimum_reader_version: '0.2.2',
    minimum_writer_version: '0.2.2',
    accepted_event_schemas: ['ai-peer-review.event/v1', 'ai-peer-review.event/v2'],
  };
  const declaration = compatibilityDeclared(
    { sequence: 1, revision: 1, review_id: created.review_id },
    compatibility
  );
  const joined = v2Event('reviewer-joined', {
    sequence: 3,
    revision: 2,
    payload: { reviewer: participant('reviewer') },
  });
  writeFileSync(
    path.join(workspace, 'events.jsonl'),
    [created, declaration, joined].map((entry) => JSON.stringify(entry)).join('\n') + '\n'
  );
  writeForeignLock(workspace);
  const inspection = await inspectReviewLock({ workspace });

  const result = await reclaimReviewLock({
    workspace,
    lockDigest: inspection.digest,
    reason: 'operator confirmed the retired host cannot return',
    confirmReclaim: true,
    now: '2026-09-18T00:01:00.000Z',
  });

  assert.equal(result.event_appended, true);
  const events = readFileSync(path.join(workspace, 'events.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map(JSON.parse);
  const reclaimed = events.at(-1);
  assert.equal(reclaimed.type, 'lock-reclaimed');
  assert.equal(reclaimed.sequence, 4);
  assert.equal(reclaimed.revision, 2);
  assert.equal(reclaimed.actor, 'system');
  assert.equal(reclaimed.payload.lock_digest, inspection.digest);
  assert.equal(
    reclaimed.payload.receipt_digest,
    `sha256:${createHash('sha256').update(readFileSync(result.receipt_path)).digest('hex')}`
  );
});

test('genesis crash reclamation succeeds with a durable receipt and no fabricated event', async (t) => {
  const workspace = workspaceFixture(t);
  writeForeignLock(workspace);
  const inspection = await inspectReviewLock({ workspace });
  const result = await reclaimReviewLock({
    workspace,
    lockDigest: inspection.digest,
    reason: 'startup crashed before creating the event log',
    confirmReclaim: true,
    now: '2026-09-18T00:01:00.000Z',
  });
  assert.equal(result.event_appended, false);
  assert.equal(readFileSync(result.receipt_path, 'utf8').includes(inspection.digest), true);
});
