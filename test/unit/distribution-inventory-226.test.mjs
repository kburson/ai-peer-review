// @story #226
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';

const file = new URL(
  '../../docs/superpowers/adoption/222-distribution-inventory.json',
  import.meta.url
);
const expectedReleases = {
  '0.1.0': '36f4aab8cacd8654ec2736ad54887039ece1ddfa14964c3716dd8e7ef28d406b',
  '0.2.0': 'd67b69cc22f18efb08a4014bb40e9981e78e9bd09c706745aae230bdc5e0970f',
  '0.2.1': 'b2357a02969f5c92ba2830c0d20b93aceeb0a899ee4e970e8b813d6090d828ba',
  '0.2.2': 'a2ac027482971619641d1a85f41a6c2921f95b54e03c9fec7fdd32d9f323b748',
};
const selected = [
  'lineage-proof',
  'contract-evidence',
  'review-grammar',
  'adoption-check',
  'adoption-preparation',
  'process-approval-ledger',
];
function census() {
  assert.ok(existsSync(file), 'The bounded distribution census has not been produced');
  return JSON.parse(readFileSync(file, 'utf8'));
}
// This bounded checker protects the census's removal handoff, not runtime approval.
function checkRemovalHandoff(value) {
  const consumers = new Set(value.consumers.map((row) => row.id));
  for (const id of selected) {
    const row = value.interfaces.find((item) => item.id === id);
    assert.ok(row, `Missing selected interface ${id}`);
    assert.equal(row.disposition, 'blocked-removal', `${id}: removal needs scoped adoption`);
    assert.ok(row.consumer_ids.length > 0, `${id}: missing consumer disposition`);
    assert.ok(
      row.consumer_ids.every((item) => consumers.has(item)),
      `${id}: unresolved consumer`
    );
    assert.ok(
      row.reason && row.cleanup_task && row.follow_up_owner,
      `${id}: missing accountable handoff`
    );
  }
  const installed = value.distributions.find((row) => row.kind === 'installed');
  for (const row of value.interfaces) {
    if (!row.consumer_ids.includes('installed-journal-readers')) continue;
    const hasFile = row.files.some((file) =>
      installed.inventory.paths.some((path) =>
        file.endsWith('/') ? path.startsWith(file) : path === file
      )
    );
    const hasExport = row.exports.some((name) =>
      installed.public_exports.some((entry) => entry.export === name)
    );
    assert.ok(
      hasFile || hasExport,
      `${row.id}: installed consumer has no inspected file or export`
    );
  }
  for (const row of value.limitations) {
    assert.ok(
      row.identity && row.reason && row.follow_up_owner,
      'Unavailable evidence needs an owner'
    );
    assert.equal(row.implies_absence, false, 'Unavailable evidence must not become absence');
    assert.equal(row.removal_allowed, false, 'Unavailable evidence cannot authorize retirement');
  }
}

test('released payload identities bind exact inspected GitHub and npm bytes', () => {
  const value = census();
  assert.equal(value.schema, 'ai-peer-review.distribution-inventory/v1');
  const releases = value.distributions.filter((row) => row.kind === 'release');
  assert.deepEqual(releases.map((row) => row.version).sort(), Object.keys(expectedReleases));
  for (const row of releases) {
    assert.equal(row.artifact_sha256, expectedReleases[row.version]);
    assert.equal(row.npm_artifact_sha256, row.artifact_sha256);
    assert.equal(row.ref, `refs/tags/v${row.version}`);
    assert.equal(row.repository, 'kburson/ai-peer-review');
    assert.ok(row.inventory.paths.includes('src/public-api.mjs'));
    assert.equal(row.inventory.entry_count, row.inventory.paths.length);
    assert.equal(
      row.inventory.paths_sha256,
      createHash('sha256').update(JSON.stringify(row.inventory.paths)).digest('hex')
    );
    assert.ok(row.public_api_sha256 && row.github_asset_url && row.npm_tarball_url);
  }
});

test('installed package identity does not inherit a stale embedded release version', () => {
  const row = census().distributions.find((item) => item.kind === 'installed');
  assert.equal(row.package_name, '@kburson/ai-peer-review');
  assert.equal(row.version, '0.4.1');
  assert.equal(row.provenance_claim.version, '0.2.0');
  assert.equal(row.source_commit, null);
  assert.ok(row.provenance_discrepancy && row.follow_up_owner);
});

test('every selected proof retirement remains blocked with concrete consumer ownership', () => {
  checkRemovalHandoff(census());
});

test('negative control rejects a dropped consumer disposition', () => {
  const value = census();
  value.interfaces.find((row) => row.id === 'lineage-proof').consumer_ids = [];
  assert.throws(() => checkRemovalHandoff(value), /missing consumer disposition/);
});

test('negative control rejects a registry failure laundered into absence', () => {
  const value = census();
  value.limitations.find((row) => row.id === 'scoped-registry').implies_absence = true;
  assert.throws(() => checkRemovalHandoff(value), /must not become absence/);
});

test('historical readers and current integrity interfaces are retained separately from proof retirement', () => {
  const value = census();
  for (const id of ['journal-lineage', 'runtime-integrity', 'historical-schemas']) {
    assert.equal(value.interfaces.find((row) => row.id === id).disposition, 'preserve');
  }
  const planned = value.consumers.find((row) => row.id === 'aitm-publication-contract');
  assert.equal(planned.status, 'planned-not-delivered');
  assert.equal(planned.repository, 'kburson/ai-task-manager');
  const runtime = value.consumers.find((row) => row.id === 'aitm-runtime-selection');
  assert.equal(runtime.ref, '71c4fc17e1259973b66eebaf09742638cb8d11d4');
  assert.ok(runtime.inspected_files.includes('scripts/task-tracker/bash-guard.mjs'));
});

test('negative control rejects installed consumer edges to known absent artifacts', () => {
  for (const id of ['review-grammar', 'historical-schemas']) {
    const value = census();
    const row = value.interfaces.find((item) => item.id === id);
    row.consumer_ids.push('installed-journal-readers');
    assert.throws(
      () => checkRemovalHandoff(value),
      /installed consumer has no inspected file or export/
    );
  }
});
