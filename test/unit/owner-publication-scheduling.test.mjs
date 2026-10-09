// @story #186
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('Windows owner-publication groups never overlap their bounded stock probe schedules', (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'apr-owner-schedule-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const log = path.join(root, 'events.jsonl');
  const harness = readFileSync(
    new URL('../integration/owner-publication.test.mjs', import.meta.url),
    'utf8'
  ).replace("process.platform === 'win32'", 'true');
  writeFileSync(path.join(root, 'harness.mjs'), harness);
  mkdirSync(path.join(root, 'owner-publication-cases'));
  for (const group of ['generations', 'quarantine', 'budget', 'faults']) {
    const child =
      "import test from 'node:test';import fs from 'node:fs';test(" +
      JSON.stringify(group) +
      ',async()=>{fs.appendFileSync(' +
      JSON.stringify(log) +
      ',JSON.stringify({group:' +
      JSON.stringify(group) +
      ",event:'start'})+'\\n');await new Promise(resolve=>setTimeout(resolve,150));fs.appendFileSync(" +
      JSON.stringify(log) +
      ',JSON.stringify({group:' +
      JSON.stringify(group) +
      ",event:'end'})+'\\n');});";
    writeFileSync(path.join(root, 'owner-publication-cases', group + '.mjs'), child);
  }
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ['--test', path.join(root, 'harness.mjs')], {
    encoding: 'utf8',
    env,
    timeout: 10000,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const events = readFileSync(log, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  const active = new Set(),
    completed = new Set();
  for (const row of events) {
    if (row.event === 'start') {
      assert.equal(
        active.size,
        0,
        'Concurrent Windows stock probe groups: ' + [...active, row.group].join(',')
      );
      active.add(row.group);
    } else {
      assert.ok(active.delete(row.group));
      completed.add(row.group);
    }
  }
  assert.equal(active.size, 0);
  assert.deepEqual([...completed].sort(), ['budget', 'faults', 'generations', 'quarantine']);
});
