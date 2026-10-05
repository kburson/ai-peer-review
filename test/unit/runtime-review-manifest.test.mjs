// @story #144
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const api = await import('../../scripts/check-runtime-contract-adoption.mjs');
const relative =
  '../../docs/superpowers/peer-reviews/plan/2026-10-05-2026-10-05-144-contract-owner-adoption-addendum-review-057079566301a0106537dde070ea518a/review-057079566301a0106537dde070ea518a-review-manifest.md';
const text = readFileSync(new URL(relative, import.meta.url), 'utf8');
const original = JSON.parse(text.match(/^```json\r?\n([\s\S]*?)^```\s*$/m)[1]);
test('[#144] complete retained normal0.4.1 manifest validates against its exact producer grammar', () => {
  assert.equal(api.validateRuntimeReviewManifest(original, '0.4.1'), true);
  assert.equal(api.validateRuntimeReviewManifest(original, '0.4.0'), false);
});
test('[#144] unknown producer cannot choose a permissive retained manifest profile', () => {
  assert.equal(api.validateRuntimeReviewManifest(original, '0.4.2'), false);
});
for (const [name, mutate] of [
  [
    'unknown runtime author field',
    (x) => {
      x.runtime.author.observed = true;
    },
  ],
  [
    'missing runtime author effort',
    (x) => {
      delete x.runtime.author.effort;
    },
  ],
  [
    'unknown closed normal member',
    (x) => {
      x.runtime.extra = true;
    },
  ],
  [
    'invalid declared author host',
    (x) => {
      x.runtime.author.host = 'unsupported-host';
    },
  ],
])
  test('[#144] full version-bound actual manifest refuses ' + name, () => {
    const changed = structuredClone(original);
    mutate(changed);
    assert.equal(api.validateRuntimeReviewManifest(changed, '0.4.1'), false);
  });
