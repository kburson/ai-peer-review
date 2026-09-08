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

import { appendEvent, atomicWrite, withReviewLock } from '../../src/protocol/store.mjs';

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

test('withReviewLock records ownership, supports async work, and preserves return values', async (t) => {
  const workspace = workspaceFixture(t);
  const value = await withReviewLock(workspace, async ({ lockFile, token }) => {
    const lock = JSON.parse(readFileSync(lockFile, 'utf8'));
    assert.equal(lock.schema, 'ai-peer-review.lock/v1');
    assert.equal(lock.token, token);
    assert.equal(lock.pid, process.pid);
    assert.match(lock.acquiredAt, /^\d{4}-\d{2}-\d{2}T/);
    return 'complete';
  });
  assert.equal(value, 'complete');
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
