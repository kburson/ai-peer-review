// @story #202
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, truncateSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { snapshotReviewHistory } from '../../src/config/review-history-snapshot.mjs';

test('historical snapshots measure actual changed bytes independently of their filename', (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'history-snapshot-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, 'evidence');
  writeFileSync(file, 'old\n');
  const first = snapshotReviewHistory(file);
  assert.equal(first.bytes, 4);
  assert.equal(first.files, 1);
  writeFileSync(file, 'new\n');
  const next = snapshotReviewHistory(file);
  assert.equal(next.bytes, 4);
  assert.notEqual(first.digest, next.digest);
});

test('oversized sparse historical files refuse before unbounded reading', (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'history-size-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, 'evidence');
  writeFileSync(file, '');
  truncateSync(file, 256 * 1024 * 1024 + 1);
  assert.throws(() => snapshotReviewHistory(file), { code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE' });
});
