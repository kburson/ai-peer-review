// @story #190
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const api = await import('../helpers/selection-attribution.mjs').catch(() => ({}));
test('attribution gate rejects incomplete, mismatching and private evidence', () => {
  assert.equal(typeof api.summarizeSelectionAttribution, 'function');
  const value = () => ({
    verified: false,
    operationalAuthority: 'unavailable',
    observerExitObserved: true,
    unavailable: 0,
    selectionGuardOpens: 24,
    observations: [
      { kind: 'original', context: 1, caller: 'original' },
      ...Array.from({ length: 12 }, () => ({
        kind: 'selection',
        context: 1,
        caller: 'assertSelected',
      })),
    ],
  });
  assert.equal(api.summarizeSelectionAttribution(value()).countThresholdMet, true);
  assert.equal(api.summarizeSelectionAttribution(value()).implementationAdmitted, false);
  for (const change of [
    (v) => {
      v.privatePath = 'private';
    },
    (v) => {
      v.verified = true;
    },
    (v) => {
      v.unavailable = 1;
    },
    (v) => {
      v.observerExitObserved = false;
    },
    (v) => {
      v.selectionGuardOpens = 23;
    },
    (v) => {
      v.observations[1].context = 2;
    },
    (v) => {
      v.observations[1].privateSid = 'private';
    },
    (v) => {
      v.observations.push(v.observations[0]);
    },
  ]) {
    const next = value();
    change(next);
    assert.throws(() => api.summarizeSelectionAttribution(next));
  }
});
test('engine attribution distinguishes signal identity and exact deadline without evaluating candidate code', (t) => {
  assert.equal(typeof api.startSelectionAttribution, 'function');
  const base = realpathSync(mkdtempSync(path.join(tmpdir(), 'apr-selection-attribution-')));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const file = path.join(base, 'fixture.mjs'),
    out = path.join(base, 'result.json');
  const helper = new URL('../helpers/selection-attribution.mjs', import.meta.url).href;
  const source = [
    `import {startSelectionAttribution} from ${JSON.stringify(helper)};`,
    'import {writeFileSync} from "node:fs";',
    `const observer=await startSelectionAttribution([{kind:'selection',variable:'context',url:import.meta.url,lineNumber:12}]);`,
    'const one=new AbortController().signal,two=new AbortController().signal;',
    'await capture({signal:one,deadline:30000});',
    'await capture({signal:one,deadline:30000});',
    'await capture({signal:two,deadline:30000});',
    'await capture({signal:one,deadline:31000});',
    `writeFileSync(${JSON.stringify(out)},JSON.stringify(await observer.close()));`,
    'async function capture(input) {',
    ' const context=input;',
    ' // snapshot context after the actual assignment',
    ' await Promise.resolve();',
    '}',
  ].join('\n');
  writeFileSync(file, source);
  execFileSync(process.execPath, [file], { timeout: 20000, stdio: 'pipe' });
  const value = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(value.verified, false);
  assert.equal(value.operationalAuthority, 'unavailable');
  assert.equal(value.observerExitObserved, true);
  assert.equal(value.unavailable, 0);
  assert.deepEqual(
    value.observations.map((item) => item.context),
    [1, 1, 2, 3]
  );
  assert.equal(JSON.stringify(value).includes(pathToFileURL(file).href), false);
  assert.equal(JSON.stringify(value).includes('deadline'), false);
  assert.equal(JSON.stringify(value).includes('objectId'), false);
});
