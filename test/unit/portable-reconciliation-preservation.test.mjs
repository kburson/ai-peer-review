// @story #209
// Real protected preservation records; projection core is read-only and unverified.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { setupHostFixture } from '../helpers/setup-host-fixture.mjs';
import { preserveReviewHistory } from '../../src/config/review-history.mjs';
import * as projection from '../../src/broker/portable-reconciliation-projection.mjs';

// Each independent maintenance command or read-only projection invocation starts its own
// original bounded context. A retained tree observation keeps one context throughout.
const originalContext = () => ({
  signal: new AbortController().signal,
  deadline: performance.now() + 30000,
});

test('fixed parsed preservation retains a registration and excludes its worker without clearing resource obligations', async (t) => {
  assert.equal(typeof projection.readPortableReconciliationRecordsCore, 'function');
  const f = await setupHostFixture(t);
  const workspace = path.join(f.root, '.scratch', 'peer-review', 'review-obsolete');
  const directory = path.join(f.root, '.scratch', 'peer-review', 'broker', 'registrations');
  await mkdir(workspace, { recursive: true });
  await mkdir(directory, { recursive: true });
  // An intentionally unsupported immutable historical attempt cannot execute.
  await writeFile(path.join(workspace, 'events.jsonl'), 'obsolete authority\n');
  const file = path.join(directory, 'review-obsolete.json');
  const record = { workspace, schema: 'historical-obsolete-format' };
  await writeFile(file, JSON.stringify(record) + '\n');
  for (const target of [workspace, file])
    await preserveReviewHistory({
      commonDir: f.commonDir,
      worktreeRoot: f.root,
      target,
      kind: 'history',
      reason: 'unchanged obsolete attempt',
      ...originalContext(),
    });
  const bytes = await readFile(file);
  const data = {
    project: { digest: 'a'.repeat(64), physicalRoot: f.root, commonDirectory: f.commonDir },
    namespaces: [
      {
        kind: 'registrations',
        root: directory,
        files: [{ name: 'review-obsolete.json', bytes }],
        entries: [],
      },
      {
        kind: 'review',
        root: workspace,
        files: [
          { name: 'events.jsonl', bytes: await readFile(path.join(workspace, 'events.jsonl')) },
        ],
        entries: [],
      },
    ],
  };
  const result = await projection.readPortableReconciliationRecordsCore({
    data,
    ...originalContext(),
  });
  assert.equal(result.verified, false);
  assert.equal(result.classification.status, 'clear');
  assert.deepEqual(result.registrations, []);
  assert.deepEqual(
    result.preservedRegistrations.map((row) => row.file),
    [file]
  );
  assert.deepEqual(result.preservedWorkspaces, [workspace]);
  assert.equal(data.namespaces[0].files.length, 1);
  assert.deepEqual(await readFile(file), bytes);
  const { selectPortableExistingEffectCandidatesCore } =
    await import('../../src/broker/portable-existing-effect-reconciliation.mjs');
  const selected = selectPortableExistingEffectCandidatesCore(data, result);
  assert.equal(selected.verified, false);
  assert.deepEqual(selected.reviews, []);
  const { describeResourceReconciliationNamespaceCore } =
    await import('../../src/broker/portable-reconciliation-inventory.mjs');
  const resourceRoot = path.join(f.home, 'provider-resources', 'b'.repeat(64));
  const publication = describeResourceReconciliationNamespaceCore({
    root: resourceRoot,
    entries: [],
  });
  const name = 'apr-resource-' + publication.resourceKey + '.json';
  const resource = {
    schema: 'ai-peer-review.provider-resource/v1',
    resource_digest: 'b'.repeat(64),
    owner_project_root_digest: data.project.digest,
    instance_id: 'c'.repeat(64),
    nonce_digest: 'd'.repeat(64),
    acquired_at: '2026-10-12T00:00:00.000Z',
    heartbeat_at: '2026-10-12T00:00:00.000Z',
    diagnostic_at: '2026-10-12T00:00:00.000Z',
  };
  const withResource = await projection.readPortableReconciliationRecordsCore({
    data: {
      ...data,
      namespaces: [
        ...data.namespaces,
        {
          kind: 'provider-resources',
          root: resourceRoot,
          entries: [{ name, type: 'file' }],
          files: [{ name, bytes: Buffer.from(JSON.stringify(resource)) }],
        },
      ],
    },
    ...originalContext(),
  });
  assert.equal(withResource.classification.status, 'unknown');
  assert.ok(
    withResource.classification.outstandingObligations.some(
      ({ name }) => name === 'provider-resource-retained'
    )
  );
  await writeFile(file, JSON.stringify({ ...record, changed: true }));
  await assert.rejects(
    () => projection.readPortableReconciliationRecordsCore({ data, ...originalContext() }),
    { code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE' }
  );
});

test('released genuine hold cannot remain a preservation disposition during startup', async (t) => {
  const f = await setupHostFixture(t);
  const workspace = path.join(f.root, '.scratch', 'peer-review', 'review-held');
  await mkdir(workspace, { recursive: true });
  await writeFile(path.join(workspace, 'events.jsonl'), 'unsupported held attempt\n');
  await preserveReviewHistory({
    commonDir: f.commonDir,
    worktreeRoot: f.root,
    target: workspace,
    kind: 'hold',
    reason: 'active review held',
    ...originalContext(),
  });
  const data = {
    project: { digest: 'a'.repeat(64), physicalRoot: f.root, commonDirectory: f.commonDir },
    namespaces: [
      {
        kind: 'review',
        root: workspace,
        entries: [],
        files: [
          { name: 'events.jsonl', bytes: await readFile(path.join(workspace, 'events.jsonl')) },
        ],
      },
    ],
  };
  const held = await projection.readPortableReconciliationRecordsCore({
    data,
    ...originalContext(),
  });
  assert.equal(held.classification.status, 'clear');
  const { releaseReviewHold } = await import('../../src/config/review-history.mjs');
  await releaseReviewHold(f.commonDir, workspace, originalContext());
  await assert.rejects(() =>
    projection.readPortableReconciliationRecordsCore({ data, ...originalContext() })
  );
});

// The missing-preservation branch must never erase physically retained effects.
for (const [entry, expected] of [
  ['coordinator/coordinator.lock', 'coordinator-generation-retained'],
  ['coordinator/coordinator-lease.json', 'coordinator-generation-retained'],
  ['locks/review.lock', 'review-lock-retained'],
  ['dispatch/locks/review.lock', 'review-lock-retained'],
  ['startup/locks/review.lock', 'review-lock-retained'],
  ['manual-launch-history.json', 'manual-launch-unproved'],
  ['manual-suspension.json', 'manual-suspension-unproved'],
  ['wake/operations/' + 'b'.repeat(64) + '.json', 'wake-outcome-unproved'],
  ['provider/claude/operations/' + 'c'.repeat(64) + '.json', 'review-authority-unproved'],
]) {
  for (const registrationFallback of [false, true]) {
    test(
      'genuine hold retains ' +
        entry +
        (registrationFallback ? ' through registration lookup' : ''),
      async (t) => {
        const f = await setupHostFixture(t);
        const workspace = path.join(f.root, '.scratch', 'peer-review', 'review-held');
        await mkdir(path.dirname(path.join(workspace, entry)), { recursive: true });
        await writeFile(path.join(workspace, entry), '{}\n');
        if (!registrationFallback)
          await preserveReviewHistory({
            commonDir: f.commonDir,
            worktreeRoot: f.root,
            target: workspace,
            kind: 'hold',
            reason: 'independent generation remains retained',
            ...originalContext(),
          });
        let registration;
        if (registrationFallback) {
          const root = path.join(f.root, '.scratch', 'peer-review', 'broker', 'registrations');
          await mkdir(root, { recursive: true });
          const bytes = Buffer.from(
            JSON.stringify({ workspace, schema: 'historical-obsolete-format' }) + '\n'
          );
          const registrationFile = path.join(root, 'review-held.json');
          await writeFile(registrationFile, bytes);
          await preserveReviewHistory({
            commonDir: f.commonDir,
            worktreeRoot: f.root,
            target: registrationFile,
            kind: 'history',
            reason: 'historical registration excludes worker but does not settle effects',
            ...originalContext(),
          });
          registration = {
            kind: 'registrations',
            root,
            entries: [],
            files: [{ name: 'review-held.json', bytes }],
          };
        }
        const context = originalContext();
        const { observeOrdinaryReconciliationTree, assertOrdinaryReconciliationTreeUnchanged } =
          await import('../../src/broker/portable-reconciliation-inventory.mjs');
        const inventory = await observeOrdinaryReconciliationTree({ root: workspace, ...context });
        t.after(() => inventory.close());
        assert.ok(inventory.entries.some(({ relativePath }) => relativePath === entry));
        const data = {
          project: { digest: 'a'.repeat(64), physicalRoot: f.root, commonDirectory: f.commonDir },
          namespaces: [
            {
              kind: 'review',
              root: workspace,
              entries: inventory.entries,
              files: [{ name: entry, bytes: await readFile(path.join(workspace, entry)) }],
            },
          ],
        };
        if (registration) data.namespaces.unshift(registration);
        const result = await projection.readPortableReconciliationRecordsCore({ data, ...context });
        assert.equal(result.classification.status, 'unknown');
        assert.ok(
          result.classification.outstandingObligations.some(({ name }) => name === expected)
        );
        assert.ok(result.classification.outstandingObligations.length <= 64);
        assert.equal(result.verified, false);
        assert.deepEqual(result.registrations, []);
        assert.deepEqual(result.reviews, []);
        if (registrationFallback) assert.equal(result.preservedRegistrations.length, 1);
        const { selectPortableExistingEffectCandidatesCore } =
          await import('../../src/broker/portable-existing-effect-reconciliation.mjs');
        const selected = selectPortableExistingEffectCandidatesCore(data, result);
        assert.equal(selected.status, 'unknown');
        assert.equal(selected.reason, expected);
        assert.equal(selected.verified, false);
        await assertOrdinaryReconciliationTreeUnchanged(inventory);
        assert.deepEqual(await readFile(path.join(workspace, entry)), Buffer.from('{}\n'));
      }
    );
  }
}
