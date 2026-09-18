import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  appendEvent,
  appendLockedEvents,
  atomicCreate,
  atomicWrite,
  inspectReviewLock,
  reclaimReviewLock,
  withReviewLock,
} from '../../src/protocol/store.mjs';

function workspaceFixture(t) {
  const workspace = mkdtempSync(path.join(tmpdir(), 'ai-peer-review-store-'));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  return workspace;
}

test('atomicWrite replaces through an exclusive sibling and leaves no temporary file', (t) => {
  const workspace = workspaceFixture(t);
  const file = path.join(workspace, 'nested', 'protocol.json');
  atomicWrite(file, Buffer.from('first\n'));
  atomicWrite(file, Buffer.from('second\n'));
  assert.equal(readFileSync(file, 'utf8'), 'second\n');
  assert.deepEqual(readdirSync(path.dirname(file)), ['protocol.json']);
});

test('atomicWrite converts parent creation failures to a stable APR error', (t) => {
  const workspace = workspaceFixture(t);
  const parent = path.join(workspace, 'not-a-directory');
  writeFileSync(parent, 'file\n');
  assert.throws(
    () => atomicWrite(path.join(parent, 'protocol.json'), Buffer.from('{}\n')),
    (error) =>
      error.code === 'APR_ATOMIC_WRITE_FAILED' && error.details.file.endsWith('protocol.json')
  );
});

test('atomicCreate publishes once without replacing an occupied target', (t) => {
  const workspace = workspaceFixture(t);
  const file = path.join(workspace, 'nested', 'events.jsonl');
  atomicCreate(file, Buffer.from('first\n'));
  assert.equal(readFileSync(file, 'utf8'), 'first\n');
  assert.deepEqual(readdirSync(path.dirname(file)), ['events.jsonl']);
  assert.throws(
    () => atomicCreate(file, Buffer.from('second\n')),
    (error) => error.code === 'APR_OUTPUT_COLLISION' && error.details.file === file
  );
  assert.equal(readFileSync(file, 'utf8'), 'first\n');
  assert.deepEqual(readdirSync(path.dirname(file)), ['events.jsonl']);
});

test('withReviewLock records ownership, supports async work, and preserves return values', async (t) => {
  const workspace = workspaceFixture(t);
  let probes = 0;
  const value = await withReviewLock(
    workspace,
    async ({ lockFile, token }) => {
      const lock = JSON.parse(readFileSync(lockFile, 'utf8'));
      assert.equal(lock.schema, 'ai-peer-review.lock/v2');
      assert.equal(lock.token, token);
      assert.equal(lock.pid, process.pid);
      assert.equal(lock.host, 'host-a');
      assert.equal(lock.boot_id, 'boot-a');
      assert.equal(lock.process_start, 'start-a');
      assert.match(lock.acquired_at, /^\d{4}-\d{2}-\d{2}T/);
      return 'complete';
    },
    {
      ownerIdentity: {
        status: 'live',
        host: 'host-a',
        pid: process.pid,
        boot_id: 'boot-a',
        process_start: 'start-a',
      },
      async observeProcessIdentity() {
        probes += 1;
      },
    }
  );
  assert.equal(value, 'complete');
  assert.equal(probes, 0);
  assert.equal(existsSync(path.join(workspace, 'locks', 'review.lock')), false);
});

test('withReviewLock refuses contention and never deletes another owner token', async (t) => {
  const workspace = workspaceFixture(t);
  const lockFile = path.join(workspace, 'locks', 'review.lock');

  await withReviewLock(workspace, async () => {
    await assert.rejects(
      withReviewLock(workspace, async () => 'not entered'),
      (error) => error.code === 'APR_REVIEW_LOCKED'
    );
    writeFileSync(
      lockFile,
      `${JSON.stringify({ schema: 'ai-peer-review.lock/v1', token: 'foreign', pid: 1, acquiredAt: new Date(0).toISOString() })}\n`
    );
  });
  assert.equal(existsSync(lockFile), true);
  assert.equal(JSON.parse(readFileSync(lockFile, 'utf8')).token, 'foreign');
});

test('withReviewLock converts lock-directory failures to a stable APR error', async (t) => {
  const workspace = workspaceFixture(t);
  writeFileSync(path.join(workspace, 'locks'), 'not a directory\n');
  await assert.rejects(
    withReviewLock(workspace, async () => 'not entered'),
    (error) => error.code === 'APR_REVIEW_LOCK_FAILED'
  );
});

test('withReviewLock retains a proven-dead lock byte-for-byte and retries acquisition', async (t) => {
  const workspace = workspaceFixture(t);
  const lockDirectory = path.join(workspace, 'locks');
  const lockFile = path.join(lockDirectory, 'review.lock');
  mkdirSync(lockDirectory, { recursive: true });
  const staleBytes = Buffer.from(
    `${JSON.stringify({ schema: 'ai-peer-review.lock/v2', token: 'old', pid: 91, host: 'host-a', boot_id: 'boot-a', process_start: 'old-start', acquired_at: new Date(0).toISOString() })}\n`
  );
  writeFileSync(lockFile, staleBytes);
  let probes = 0;

  const result = await withReviewLock(workspace, async () => 'acquired', {
    ownerIdentity: {
      status: 'live',
      host: 'host-a',
      pid: process.pid,
      boot_id: 'boot-a',
      process_start: 'current-start',
    },
    async observeProcessIdentity() {
      probes += 1;
      return { status: 'dead', host: 'host-a', pid: 91 };
    },
  });

  assert.equal(result, 'acquired');
  assert.equal(probes, 1);
  const retained = readdirSync(path.join(lockDirectory, 'stale')).filter(
    (entry) => !entry.endsWith('.receipt.json')
  );
  assert.equal(retained.length, 1);
  assert.deepEqual(readFileSync(path.join(lockDirectory, 'stale', retained[0])), staleBytes);
  assert.equal(existsSync(lockFile), false);
});

test('inspectReviewLock distinguishes live, PID reuse, different boot, foreign host, and unknown liveness', async (t) => {
  const workspace = workspaceFixture(t);
  const lockDirectory = path.join(workspace, 'locks');
  const lockFile = path.join(lockDirectory, 'review.lock');
  mkdirSync(lockDirectory, { recursive: true });
  const owner = {
    schema: 'ai-peer-review.lock/v2',
    token: 'owner',
    pid: 91,
    host: 'host-a',
    boot_id: 'boot-a',
    process_start: 'start-a',
    acquired_at: new Date(0).toISOString(),
  };
  writeFileSync(lockFile, `${JSON.stringify(owner)}\n`);

  const live = await inspectReviewLock({
    workspace,
    hostname: 'host-a',
    observeProcessIdentity: async () => ({
      status: 'live',
      host: 'host-a',
      pid: 91,
      boot_id: 'boot-a',
      process_start: 'start-a',
    }),
  });
  assert.equal(live.status, 'live');

  const reused = await inspectReviewLock({
    workspace,
    hostname: 'host-a',
    observeProcessIdentity: async () => ({
      status: 'live',
      host: 'host-a',
      pid: 91,
      boot_id: 'boot-a',
      process_start: 'start-b',
    }),
  });
  assert.equal(reused.status, 'stale');
  assert.equal(reused.reason, 'pid-reused');

  const rebooted = await inspectReviewLock({
    workspace,
    hostname: 'host-a',
    observeProcessIdentity: async () => ({
      status: 'live',
      host: 'host-a',
      pid: 91,
      boot_id: 'boot-b',
      process_start: 'start-a',
    }),
  });
  assert.equal(rebooted.status, 'stale');
  assert.equal(rebooted.reason, 'different-boot');

  const foreign = await inspectReviewLock({ workspace, hostname: 'host-b' });
  assert.equal(foreign.status, 'unknown');
  assert.equal(foreign.reason, 'foreign-host');

  const unknown = await inspectReviewLock({
    workspace,
    hostname: 'host-a',
    observeProcessIdentity: async () => ({
      status: 'unknown',
      host: 'host-a',
      pid: 91,
      reason: 'probe-unavailable',
    }),
  });
  assert.equal(unknown.status, 'unknown');
  assert.equal(unknown.reason, 'probe-unavailable');
});

test('reclaimReviewLock requires exact digest and confirmation and retains a receipt without dispatch', async (t) => {
  const workspace = workspaceFixture(t);
  const lockDirectory = path.join(workspace, 'locks');
  const lockFile = path.join(lockDirectory, 'review.lock');
  mkdirSync(lockDirectory, { recursive: true });
  writeFileSync(
    lockFile,
    `${JSON.stringify({ schema: 'ai-peer-review.lock/v2', token: 'old', pid: 91, host: 'host-a', boot_id: 'boot-a', process_start: 'start-a', acquired_at: new Date(0).toISOString() })}\n`
  );
  const inspected = await inspectReviewLock({ workspace, hostname: 'host-b' });

  await assert.rejects(
    reclaimReviewLock({
      workspace,
      lockDigest: inspected.digest,
      reason: 'operator verified the foreign host is gone',
      confirmReclaim: false,
    }),
    (error) => error.code === 'APR_REVIEW_LOCK_RECLAIM_CONFIRMATION_REQUIRED'
  );
  await assert.rejects(
    reclaimReviewLock({
      workspace,
      lockDigest: `sha256:${'0'.repeat(64)}`,
      reason: 'operator verified the foreign host is gone',
      confirmReclaim: true,
    }),
    (error) => error.code === 'APR_REVIEW_LOCK_CHANGED'
  );

  const reclaimed = await reclaimReviewLock({
    workspace,
    lockDigest: inspected.digest,
    reason: 'operator verified the foreign host is gone',
    confirmReclaim: true,
    now: '2026-09-18T00:00:00.000Z',
  });
  assert.equal(reclaimed.lock_digest, inspected.digest);
  assert.equal(existsSync(lockFile), false);
  assert.equal(existsSync(reclaimed.retained_path), true);
  const receipt = JSON.parse(readFileSync(reclaimed.receipt_path, 'utf8'));
  assert.equal(receipt.schema, 'ai-peer-review.lock-reclaim-receipt/v1');
  assert.equal(receipt.lock_digest, inspected.digest);
  assert.equal(receipt.reason, 'operator verified the foreign host is gone');
});

test('appendEvent writes one canonical newline-terminated record under the review lock', async (t) => {
  const workspace = workspaceFixture(t);
  const file = path.join(workspace, 'events.jsonl');
  await appendEvent(file, { z: 2, nested: { y: true, a: 'first' }, a: 1 });
  await appendEvent(file, { type: 'second', revision: 2 });

  assert.equal(
    readFileSync(file, 'utf8'),
    '{"a":1,"nested":{"a":"first","y":true},"z":2}\n{"revision":2,"type":"second"}\n'
  );
  assert.equal(existsSync(path.join(workspace, 'locks', 'review.lock')), false);
});

test('appendEvent refuses a torn existing record without changing it', async (t) => {
  const workspace = workspaceFixture(t);
  const file = path.join(workspace, 'events.jsonl');
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, '{"incomplete":true}');
  await assert.rejects(
    appendEvent(file, { revision: 2 }),
    (error) => error.code === 'APR_EVENT_LOG_CORRUPT'
  );
  assert.equal(readFileSync(file, 'utf8'), '{"incomplete":true}');
});

test('appendLockedEvents makes one newline-terminated atomic batch', async (t) => {
  const workspace = workspaceFixture(t);
  const file = path.join(workspace, 'events.jsonl');
  await withReviewLock(workspace, async () => {
    appendLockedEvents(file, '', [
      { sequence: 1, type: 'first' },
      { sequence: 2, type: 'second' },
    ]);
  });
  assert.equal(
    readFileSync(file, 'utf8'),
    '{"sequence":1,"type":"first"}\n{"sequence":2,"type":"second"}\n'
  );
});
