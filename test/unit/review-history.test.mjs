// @story #202
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, chmodSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPrimaryMaintenance } from '../../src/config/primary-maintenance.mjs';
import { inspectPrimaryReviewInventory } from '../../src/config/primary-inventory.mjs';
import { setupHostFixture } from '../helpers/setup-host-fixture.mjs';
import { initializeReview, inspectReviewAuthority } from '../helpers/protocol-api.mjs';
import { event } from '../helpers/review-fixture.mjs';
import { reconcileRegistrations, inspectStartupAuthority } from '../../src/broker/registry.mjs';

const options = {
  skip: process.platform === 'win32' ? 'Native private storage paused for #102/#107' : false,
};
async function fixture(t) {
  const f = await setupHostFixture(t);
  const api = createPrimaryMaintenance({
    packageRoot: fileURLToPath(new URL('../..', import.meta.url)),
    home: f.home,
    admit: async () => {},
    integrationContract: 'ai-peer-review.integration/v1',
  });
  const target = f.write(
    '.scratch/peer-review/obsolete/events.jsonl',
    'historical uncertain journal\n'
  );
  return { ...f, api, target: path.dirname(target) };
}
async function pending(f) {
  const workspace = path.join(f.linked, '.scratch/peer-review/review-current');
  const e = event('review-created', { reviewId: 'review-current' });
  e.payload.startup.context.repository_root = f.linked;
  await initializeReview(workspace, e);
  return workspace;
}

test(
  'broker reconciliation retains historical registration without restoring obsolete runtime',
  options,
  async (t) => {
    const f = await fixture(t);
    f.write(
      '.scratch/peer-review/obsolete/startup-request.json',
      JSON.stringify({
        schema: 'ai-peer-review.startup-request/v1',
        workspace: f.target,
        review_id: 'obsolete',
      })
    );
    const record = {
      schema: 'ai-peer-review.broker-registration/v1',
      created_at: '2026-09-12T12:00:00.000Z',
      review_id: 'obsolete',
      project_digest: 'c'.repeat(64),
      project_root: f.root,
      workspace: f.target,
      request_digest: 'a'.repeat(64),
      runtime: {
        root: path.join(f.root, 'missing-old-runtime'),
        entrypoint: path.join(f.root, 'missing-old-runtime/bin/peer-review.mjs'),
        nodeExecutable: process.execPath,
        digest: 'sha256:' + 'b'.repeat(64),
      },
    };
    const file = f.write(
      '.scratch/peer-review/broker/registrations/obsolete.json',
      JSON.stringify(record) + '\n'
    );
    const before = readFileSync(file);
    await f.api.preserveHistory({
      cwd: f.root,
      target: f.target,
      reason: 'obsolete runtime and attempt remain historical',
    });
    const { readReviewPreservation } = await import('../../src/config/review-history.mjs');
    const records = await reconcileRegistrations({
      project: { digest: 'c'.repeat(64), physicalRoot: f.root },
      store: { root: path.dirname(file) },
      inspectAuthority: inspectStartupAuthority,
      isPreserved: (workspace) =>
        Boolean(
          readReviewPreservation(f.commonDir, workspace, { verifySnapshot: true })?.record.kind ===
          'history'
        ),
    });
    assert.equal(records.length, 1);
    assert.equal(records[0].workspace, f.target);
    assert.deepEqual(readFileSync(file), before);
    assert.doesNotThrow(() => inspectPrimaryReviewInventory(f.commonDir, f.root));
  }
);

test(
  'explicit history preservation unblocks inventory without rewriting uncertain evidence',
  options,
  async (t) => {
    const f = await fixture(t);
    assert.throws(() => inspectPrimaryReviewInventory(f.commonDir, f.root), {
      code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
    });
    const before = readFileSync(path.join(f.target, 'events.jsonl'));
    assert.equal(
      typeof f.api.preserveHistory,
      'function',
      'missing administrative history preservation'
    );
    const record = await f.api.preserveHistory({
      cwd: f.root,
      target: f.target,
      reason: 'obsolete predecessor; preserve uncertainty',
    });
    assert.equal(record.kind, 'history');
    assert.deepEqual(readFileSync(path.join(f.target, 'events.jsonl')), before);
    const inventory = inspectPrimaryReviewInventory(f.commonDir, f.root);
    assert.equal(inventory.reviews.find((x) => x.workspace === f.target).preservation, 'history');
  }
);

test(
  'history dry-run creates no receipt and never exempts unclassified activity',
  options,
  async (t) => {
    const f = await fixture(t);
    assert.equal(typeof f.api.preserveHistory, 'function');
    await f.api.preserveHistory({
      cwd: f.root,
      target: f.target,
      reason: 'inspect historical target',
      dryRun: true,
    });
    assert.equal(existsSync(path.join(f.commonDir, 'ai-peer-review/review-history')), false);
    assert.throws(() => inspectPrimaryReviewInventory(f.commonDir, f.root), {
      code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
    });
  }
);

test('changed historical bytes invalidate migration exemption', options, async (t) => {
  const f = await fixture(t);
  assert.equal(typeof f.api.preserveHistory, 'function');
  await f.api.preserveHistory({ cwd: f.root, target: f.target, reason: 'obsolete attempt' });
  f.write('.scratch/peer-review/obsolete/events.jsonl', 'changed uncertain journal\n');
  assert.throws(() => inspectPrimaryReviewInventory(f.commonDir, f.root), {
    code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
  });
});

test('historical review execution remains fenced after preservation', options, async (t) => {
  const f = await fixture(t);
  assert.equal(typeof f.api.preserveHistory, 'function');
  await f.api.preserveHistory({ cwd: f.root, target: f.target, reason: 'obsolete attempt' });
  const { assertReviewNotPreserved } = await import('../../src/config/review-history.mjs');
  assert.throws(() => assertReviewNotPreserved(f.commonDir, f.target), {
    code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
  });
  await assert.rejects(f.api.releaseReview({ cwd: f.root, target: f.target }), {
    code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
  });
});

test(
  'child review effects cannot escape an explicitly historical container',
  options,
  async (t) => {
    const f = await fixture(t);
    const child = f.write(
      '.scratch/peer-review/obsolete/child/events.jsonl',
      'preserved child evidence\n'
    );
    await f.api.preserveHistory({ cwd: f.root, target: f.target, reason: 'obsolete container' });
    const { assertReviewNotPreserved } = await import('../../src/config/review-history.mjs');
    assert.throws(() => assertReviewNotPreserved(f.commonDir, path.dirname(child)), {
      code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
    });
  }
);

test(
  'current review hold preserves original protocol and release requires activated primary',
  options,
  async (t) => {
    const f = await fixture(t);
    assert.equal(typeof f.api.holdReview, 'function');
    await f.api.preserveHistory({ cwd: f.root, target: f.target, reason: 'obsolete attempt' });
    const workspace = await pending(f);
    const bytes = readFileSync(path.join(workspace, 'events.jsonl'));
    await f.api.holdReview({
      cwd: f.root,
      target: workspace,
      reason: 'temporary upgrade checkpoint',
    });
    assert.equal(inspectReviewAuthority(workspace).state.protocol.state, 'awaiting-reviewer');
    assert.deepEqual(readFileSync(path.join(workspace, 'events.jsonl')), bytes);
    const { assertReviewNotPreserved } = await import('../../src/config/review-history.mjs');
    assert.throws(() => assertReviewNotPreserved(f.commonDir, workspace), {
      code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
    });
    await assert.rejects(f.api.releaseReview({ cwd: f.root, target: workspace }), {
      code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
    });
    await f.setupApply();
    f.git('add', '.ai-peer-review', '.codex');
    f.git('commit', '-m', 'owned integration');
    await f.api.activate({ cwd: f.root });
    await f.api.releaseReview({ cwd: f.root, target: workspace });
    assert.doesNotThrow(() => assertReviewNotPreserved(f.commonDir, workspace));
    assert.deepEqual(readFileSync(path.join(workspace, 'events.jsonl')), bytes);
  }
);

test('linked or reserved-store preservation refuses before writes', options, async (t) => {
  const f = await fixture(t);
  assert.equal(typeof f.api.preserveHistory, 'function');
  await assert.rejects(
    f.api.preserveHistory({ cwd: f.linked, target: f.target, reason: 'wrong maintenance root' }),
    { code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE' }
  );
  const reserved = f.write('.scratch/peer-review/broker/registrations/unknown.json', '{}');
  await assert.rejects(
    f.api.preserveHistory({
      cwd: f.root,
      target: path.dirname(reserved),
      reason: 'cannot hide broker authority',
    }),
    { code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE' }
  );
});

test(
  'inert reports are retained as passive evidence without admitting unknown directories',
  options,
  async (t) => {
    const f = await fixture(t);
    assert.equal(typeof f.api.preserveHistory, 'function');
    await f.api.preserveHistory({ cwd: f.root, target: f.target, reason: 'obsolete attempt' });
    const report = f.write('.scratch/peer-review/old-report.md', '# Historical diagnosis\n');
    assert.doesNotThrow(() => inspectPrimaryReviewInventory(f.commonDir, f.root));
    assert.equal(readFileSync(report, 'utf8'), '# Historical diagnosis\n');
    f.write('.scratch/peer-review/unknown/startup.json', '{"stage":"reserved"}\n');
    assert.throws(() => inspectPrimaryReviewInventory(f.commonDir, f.root), {
      code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
    });
  }
);

test('unsafe history records and symlinked target parents fail closed', options, async (t) => {
  const f = await fixture(t);
  assert.equal(typeof f.api.preserveHistory, 'function');
  await f.api.preserveHistory({ cwd: f.root, target: f.target, reason: 'obsolete attempt' });
  chmodSync(path.join(f.commonDir, 'ai-peer-review/review-history'), 0o755);
  assert.throws(() => inspectPrimaryReviewInventory(f.commonDir, f.root), {
    code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
  });
  chmodSync(path.join(f.commonDir, 'ai-peer-review/review-history'), 0o700);
  symlinkSync(f.target, path.join(f.root, '.scratch/peer-review/linked-target'));
  await assert.rejects(
    f.api.preserveHistory({
      cwd: f.root,
      target: path.join(f.root, '.scratch/peer-review/linked-target'),
      reason: 'unsafe alias',
    }),
    { code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE' }
  );
});
