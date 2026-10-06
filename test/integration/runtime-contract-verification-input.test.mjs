// @story #144
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../../', import.meta.url));
const source = 'evidence/portable-runtime/contracts/approved-reference.json';
const output = '.scratch/peer-review/evidence-approved-ref.json';
const helper = path.join(root, 'scripts/ci/prepare-contract-adoption.mjs');
const original = fs.readFileSync(path.join(root, source));
function checkout(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'apr-144-input-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  execFileSync('git', ['clone', '--shared', '--quiet', root, dir]);
  fs.writeFileSync(path.join(dir, source), original);
  return dir;
}
function run(cwd) {
  return spawnSync(process.execPath, [helper], { cwd, encoding: 'utf8' });
}
function destination(cwd) {
  fs.mkdirSync(path.dirname(path.join(cwd, output)), { recursive: true });
  return path.join(cwd, output);
}
test('[#144] clean checkout recreates validated reference and keeps publication refused', (t) => {
  const cwd = checkout(t);
  assert.equal(fs.existsSync(path.join(cwd, output)), false);
  const result = run(cwd);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(fs.readFileSync(path.join(cwd, output)), original);
  const check = spawnSync(
    process.execPath,
    [
      path.join(root, 'scripts/check-runtime-contract-adoption.mjs'),
      '--mode',
      'adoption-only',
      '--record',
      'evidence/portable-runtime/contracts/runtime-contract-adoption.json',
      '--approved-ref',
      output,
    ],
    { cwd, encoding: 'utf8' }
  );
  assert.equal(check.status, 0, check.stderr);
  const report = JSON.parse(check.stdout);
  assert.equal(report.contractAdopted, true);
  assert.equal(report.activationAuthorized, false);
  assert.equal(report.publicationAllowed, false);
  const before = fs.statSync(path.join(cwd, output));
  assert.equal(run(cwd).status, 0);
  assert.equal(fs.statSync(path.join(cwd, output)).mtimeMs, before.mtimeMs);
});
test('[#144] preparation preserves a conflicting existing selector', (t) => {
  const cwd = checkout(t);
  const dest = destination(cwd);
  fs.writeFileSync(dest, '{"untrusted":true}\n');
  const result = run(cwd);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /approved-reference-output-conflict/);
  assert.equal(fs.readFileSync(dest, 'utf8'), '{"untrusted":true}\n');
});
test('[#144] preparation refuses unknown selector fields before creating scratch', (t) => {
  const cwd = checkout(t);
  const value = JSON.parse(original);
  value.operatorApproved = true;
  fs.writeFileSync(path.join(cwd, source), JSON.stringify(value));
  const result = run(cwd);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /approved-reference-incomplete/);
  assert.equal(fs.existsSync(path.join(cwd, '.scratch')), false);
});
test('[#144] preparation verifies pinned record bytes before creating scratch', (t) => {
  const cwd = checkout(t);
  const value = JSON.parse(original);
  value.record.sha256 = '0'.repeat(64);
  fs.writeFileSync(path.join(cwd, source), JSON.stringify(value));
  const result = run(cwd);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /record-digest-mismatch/);
  assert.equal(fs.existsSync(path.join(cwd, '.scratch')), false);
});
test('[#144] preparation refuses a linked output without changing either link', (t) => {
  const cwd = checkout(t);
  const dest = destination(cwd);
  const other = path.join(cwd, '.scratch', 'retained.json');
  fs.writeFileSync(other, original);
  fs.linkSync(other, dest);
  const result = run(cwd);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /approved-reference-path-unsafe/);
  assert.deepEqual(fs.readFileSync(other), original);
  assert.equal(fs.statSync(dest).nlink, 2);
});
test(
  '[#144] preparation refuses a symlinked output parent',
  { skip: process.platform === 'win32' },
  (t) => {
    const cwd = checkout(t);
    const other = path.join(cwd, 'other');
    fs.mkdirSync(other);
    fs.symlinkSync(other, path.join(cwd, '.scratch'));
    const result = run(cwd);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /approved-reference-path-unsafe/);
    assert.deepEqual(fs.readdirSync(other), []);
  }
);
test(
  '[#144] preparation refuses a symlinked selector',
  { skip: process.platform === 'win32' },
  (t) => {
    const cwd = checkout(t);
    const selector = path.join(cwd, source);
    const other = path.join(cwd, 'other.json');
    fs.renameSync(selector, other);
    fs.symlinkSync(other, selector);
    const result = run(cwd);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /approved-reference-path-unsafe/);
    assert.equal(fs.existsSync(path.join(cwd, '.scratch')), false);
  }
);
