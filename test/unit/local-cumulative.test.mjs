// @story #191
import assert from 'node:assert/strict';
import test from 'node:test';
import { after } from 'node:test';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
const api = await import('../../scripts/verify-local-cumulative.mjs').catch(() => ({}));
const project = fileURLToPath(new URL('../../', import.meta.url));
// Freeze the delivered fixture, not future working source. Later runtime changes
// must refuse this old acceptance evidence without breaking unrelated unit tests.
const root = mkdtempSync(path.join(tmpdir(), 'apr-cumulative-191-'));
after(() => rmSync(root, { recursive: true, force: true }));
execFileSync('git', ['clone', '--shared', '--no-checkout', '--quiet', project, root], {
  stdio: 'pipe',
});
execFileSync(
  'git',
  [
    '-c',
    'core.hooksPath=/dev/null',
    'checkout',
    '--quiet',
    '--detach',
    '67a5dd5463f51d29c2711469b2c7b2814ed982f4',
  ],
  { cwd: root, stdio: 'pipe' }
);
mkdirSync(path.join(root, 'evidence/local-handoff/191'), { recursive: true });
for (const name of ['cumulative.json', 'failed-broad-graph.json'])
  copyFileSync(
    path.join(project, 'evidence/local-handoff/191', name),
    path.join(root, 'evidence/local-handoff/191', name)
  );
function evidence() {
  assert.equal(typeof api.collectCumulativeEvidence, 'function');
  return api.collectCumulativeEvidence({ root });
}
test('[#191] cumulative integrity preserves twelve broad obligations without claiming their acceptance', () => {
  assert.equal(typeof api.verifyLocalCumulative, 'function');
  const result = api.verifyLocalCumulative({ root });
  assert.equal(result.scope, 'local-evidence-integrity');
  assert.equal(result.passed, true);
  assert.equal(result.originalObligations, 12);
  assert.equal(result.localRequirements, 7);
  assert.equal(result.broaderGraphPassed, false);
  assert.equal(result.broaderBlockers, 6935);
  assert.equal(result.currentProviderProof, false);
  assert.equal(result.windows, 'deferred under #213; unverified');
});

const corruptions = [
  ['missing original obligation', (e) => e.map.originalObligations.pop()],
  [
    'duplicate original obligation',
    (e) => e.map.originalObligations.push(e.map.originalObligations[0]),
  ],
  ['rewritten original text', (e) => (e.map.originalObligations[0].text = 'already completed')],
  ['broader status promoted', (e) => (e.map.originalObligations[0].status = 'passed')],
  ['original owner changed', (e) => (e.map.originalObligations[0].originalOwner = 191)],
  ['remaining owner removed', (e) => (e.map.originalObligations[0].remainingOwners = [])],
  [
    'new source consumer',
    (e) => e.currentSources.push({ path: 'src/new.mjs', blob: 'a'.repeat(40) }),
  ],
  ['removed source consumer', (e) => e.currentSources.pop()],
  ['changed delivered bytes', (e) => (e.currentSources[0].blob = '0'.repeat(40))],
  ['wrong delivered baseline', (e) => (e.map.deliveredHead = 'a'.repeat(40))],
  ['broad failure relabeled', (e) => (e.graph.passed = true)],
  ['broad coverage relabeled', (e) => (e.graph.coverageComplete = true)],
  ['broad runtime authority invented', (e) => (e.graph.verified = true)],
  ['broad blocker dropped', (e) => e.graph.blockers.pop()],
  ['failed report bytes altered', (e) => (e.graphSha256 = '0'.repeat(64))],
  ['historical host evidence changed', (e) => (e.observations[0].sha256 = '0'.repeat(64))],
  ['historical provider claim promoted', (e) => (e.map.currentProviderProof = true)],
  ['Windows claimed complete', (e) => (e.map.windows = 'passed')],
  ['local requirement omitted', (e) => e.map.localRequirements.pop()],
  [
    'local proof reference substituted',
    (e) => (e.map.localRequirements[0].evidence = ['test/missing.test.mjs']),
  ],
  ['unsupported completion claim added', (e) => (e.map.protectedRuntimeComplete = true)],
];
for (const [name, corrupt] of corruptions)
  test('[#191] cumulative integrity refuses ' + name, () => {
    const input = structuredClone(evidence());
    corrupt(input);
    assert.throws(() => api.validateCumulativeEvidence(input), /cumulative-invalid/);
  });

test('[#191] collector refuses a physically added consumer before declaring source continuity', () => {
  const file = path.join(root, 'src/cumulative-new-fixture.mjs');
  writeFileSync(file, 'export const extra = true;\n');
  try {
    assert.throws(() => api.verifyLocalCumulative({ root }), /cumulative-invalid/);
  } finally {
    rmSync(file);
  }
});

test('[#191] collector refuses changed source bytes from the real filesystem', () => {
  const file = path.join(root, 'bin/peer-review.mjs');
  const original = readFileSync(file);
  writeFileSync(file, Buffer.concat([original, Buffer.from('\n// changed\n')]));
  try {
    assert.throws(() => api.verifyLocalCumulative({ root }), /cumulative-invalid/);
  } finally {
    writeFileSync(file, original);
  }
});
