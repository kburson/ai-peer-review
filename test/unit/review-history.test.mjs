// @story #202
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readFileSync,
  existsSync,
  chmodSync,
  symlinkSync,
  renameSync,
  mkdirSync,
  readdirSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPrimaryMaintenanceCore } from '../../src/config/primary-maintenance.mjs';
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
  // Component scheduling is explicitly unverified; no installed admission is minted.
  const api = createPrimaryMaintenanceCore({
    admission: f.admission,
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
  'history maintenance retains the caller deadline before catalog effects',
  options,
  async (t) => {
    const f = await fixture(t);
    await assert.rejects(
      f.api.preserveHistory({
        cwd: f.root,
        target: f.target,
        reason: 'expired maintenance',
        signal: new AbortController().signal,
        deadline: 0,
      }),
      { code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE' }
    );
    assert.equal(existsSync(path.join(f.commonDir, 'ai-peer-review/review-history')), false);
  }
);

for (const nested of [false, true])
  test(
    `reconciliation retains ${nested ? 'nested' : 'direct'} historical registration without restoration`,
    options,
    async (t) => {
      const f = await fixture(t);
      if (nested) {
        await f.api.preserveHistory({
          cwd: f.root,
          target: f.target,
          reason: 'obsolete original fixture',
        });
        f.target = path.dirname(
          f.write('.scratch/peer-review/reviews/group/retained.txt', 'old group')
        );
      }
      const registeredWorkspace = nested ? path.join(f.target, 'obsolete') : f.target;
      f.write(
        path.relative(f.root, registeredWorkspace) + '/startup-request.json',
        JSON.stringify({
          schema: 'ai-peer-review.startup-request/v1',
          workspace: registeredWorkspace,
          review_id: 'obsolete',
        })
      );
      const record = {
        schema: 'ai-peer-review.broker-registration/v1',
        created_at: '2026-09-12T12:00:00.000Z',
        review_id: 'obsolete',
        project_digest: 'c'.repeat(64),
        project_root: f.root,
        workspace: registeredWorkspace,
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
      const { findReviewPreservation } = await import('../../src/config/review-history.mjs');
      const records = await reconcileRegistrations({
        project: { digest: 'c'.repeat(64), physicalRoot: f.root },
        store: { root: path.dirname(file) },
        inspectAuthority: inspectStartupAuthority,
        isPreserved: (workspace) =>
          Boolean(
            findReviewPreservation(f.commonDir, workspace, { verifySnapshot: true })?.record
              .kind === 'history'
          ),
      });
      assert.equal(records.length, 1);
      assert.equal(records[0].workspace, registeredWorkspace);
      assert.deepEqual(readFileSync(file), before);
      await assert.doesNotReject(() => inspectPrimaryReviewInventory(f.commonDir, f.root));
    }
  );

test(
  'explicit history preservation unblocks inventory without rewriting uncertain evidence',
  options,
  async (t) => {
    const f = await fixture(t);
    await assert.rejects(() => inspectPrimaryReviewInventory(f.commonDir, f.root), {
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
    const inventory = await inspectPrimaryReviewInventory(f.commonDir, f.root);
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
    await assert.rejects(() => inspectPrimaryReviewInventory(f.commonDir, f.root), {
      code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
    });
  }
);

test('changed historical bytes invalidate migration exemption', options, async (t) => {
  const f = await fixture(t);
  assert.equal(typeof f.api.preserveHistory, 'function');
  await f.api.preserveHistory({ cwd: f.root, target: f.target, reason: 'obsolete attempt' });
  f.write('.scratch/peer-review/obsolete/events.jsonl', 'changed uncertain journal\n');
  await assert.rejects(() => inspectPrimaryReviewInventory(f.commonDir, f.root), {
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
    await assert.doesNotReject(() => inspectPrimaryReviewInventory(f.commonDir, f.root));
    assert.equal(readFileSync(report, 'utf8'), '# Historical diagnosis\n');
    f.write('.scratch/peer-review/unknown/startup.json', '{"stage":"reserved"}\n');
    await assert.rejects(() => inspectPrimaryReviewInventory(f.commonDir, f.root), {
      code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
    });
  }
);

test('unsafe history records and symlinked target parents fail closed', options, async (t) => {
  const f = await fixture(t);
  assert.equal(typeof f.api.preserveHistory, 'function');
  await f.api.preserveHistory({ cwd: f.root, target: f.target, reason: 'obsolete attempt' });
  chmodSync(path.join(f.commonDir, 'ai-peer-review/review-history'), 0o755);
  await assert.rejects(() => inspectPrimaryReviewInventory(f.commonDir, f.root), {
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

// These regressions catch ancestry bypass, replaced parents, partial targets and lost hold generations.
test('nested scratch names cannot conceal a preserved ancestor', options, async (t) => {
  const f = await fixture(t);
  const child = f.write(
    '.scratch/peer-review/obsolete/.scratch/peer-review/child/events.jsonl',
    'old child\n'
  );
  await f.api.preserveHistory({ cwd: f.root, target: f.target, reason: 'obsolete tree' });
  const { assertReviewNotPreserved } = await import('../../src/config/review-history.mjs');
  assert.throws(() => assertReviewNotPreserved(f.commonDir, path.dirname(child)), {
    code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
  });
});

for (const alias of [true, false]) {
  test(
    `replaced ${alias ? 'symbolic' : 'ordinary'} parent invalidates unchanged history`,
    options,
    async (t) => {
      const f = await fixture(t);
      await f.api.preserveHistory({ cwd: f.root, target: f.target, reason: 'obsolete tree' });
      const scratch = path.join(f.root, '.scratch');
      const moved = path.join(f.root, 'retained-scratch');
      renameSync(scratch, moved);
      if (alias) symlinkSync(moved, scratch, 'dir');
      else {
        mkdirSync(scratch);
        renameSync(path.join(moved, 'peer-review'), path.join(scratch, 'peer-review'));
      }
      await assert.rejects(() => inspectPrimaryReviewInventory(f.commonDir, f.root), {
        code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
      });
    }
  );
}

test('partial review preservation refuses before catalog write', options, async (t) => {
  const f = await fixture(t);
  const workspace = await pending(f);
  const file = path.join(workspace, 'events.jsonl');
  const before = readFileSync(file);
  await assert.rejects(
    f.api.preserveHistory({ cwd: f.root, target: file, reason: 'partial review' }),
    { code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE' }
  );
  assert.deepEqual(readFileSync(file), before);
  assert.equal(existsSync(path.join(f.commonDir, 'ai-peer-review/review-history')), false);
});

test(
  'a current review can be held again without removing any prior audit generation',
  options,
  async (t) => {
    const f = await fixture(t);
    await f.api.preserveHistory({ cwd: f.root, target: f.target, reason: 'obsolete tree' });
    const workspace = await pending(f);
    await f.api.holdReview({ cwd: f.root, target: workspace, reason: 'first migration' });
    await f.setupApply();
    f.git('add', '.ai-peer-review', '.codex');
    f.git('commit', '-m', 'owned integration');
    await f.api.activate({ cwd: f.root });
    await f.api.releaseReview({ cwd: f.root, target: workspace });
    const directory = path.join(f.commonDir, 'ai-peer-review/review-history');
    const prior = new Map(
      readdirSync(directory).map((name) => [name, readFileSync(path.join(directory, name))])
    );
    const bytes = readFileSync(path.join(workspace, 'events.jsonl'));
    await f.api.holdReview({ cwd: f.root, target: workspace, reason: 'second migration' });
    const { assertReviewNotPreserved } = await import('../../src/config/review-history.mjs');
    assert.throws(() => assertReviewNotPreserved(f.commonDir, workspace), {
      code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
    });
    for (const [name, bytes] of prior)
      assert.deepEqual(readFileSync(path.join(directory, name)), bytes);
    await f.api.releaseReview({ cwd: f.root, target: workspace });
    assert.doesNotThrow(() => assertReviewNotPreserved(f.commonDir, workspace));
    assert.deepEqual(readFileSync(path.join(workspace, 'events.jsonl')), bytes);
  }
);

for (const kind of ['history', 'hold'])
  test(`${kind} launch refuses before bookkeeping or provider effects`, options, async (t) => {
    const f = await fixture(t);
    await f.api.preserveHistory({ cwd: f.root, target: f.target, reason: 'obsolete fixture' });
    await f.setupApply();
    f.git('add', '.ai-peer-review', '.codex');
    f.git('commit', '-m', 'owned integration');
    await f.api.activate({ cwd: f.root });
    const workspace = await pending(f);
    const { createReviewOperations } = await import('../../src/cli/run-core.mjs');
    const protocol = await import('../helpers/protocol-api.mjs');
    const { assertReviewNotPreserved, snapshotReviewHistory } =
      await import('../../src/config/review-history.mjs');
    const routing = {
      schema: 'ai-peer-review.invitation-routing/v1',
      review_id: 'review-current',
      workspace,
      artifact: 'spec.md',
      response: 'response.md',
    };
    const invitation = f.write(
      'reviewer-invitation.md',
      '<!-- ai-peer-review-invitation data="' +
        Buffer.from(JSON.stringify(routing)).toString('base64url') +
        '" -->\n'
    );
    await f.api[kind === 'hold' ? 'holdReview' : 'preserveHistory']({
      cwd: f.root,
      target: workspace,
      reason: 'migration checkpoint',
    });
    const before = snapshotReviewHistory(workspace);
    const operations = createReviewOperations({
      protocol,
      startup: {},
      productionProviderAdapters: () => new Map(),
      createClaudeStreamingExec: () => {
        throw new Error('provider effect');
      },
      requestGrant: () => {
        throw new Error('grant effect');
      },
      performCurrentOperationEffect: (effect) => effect(),
      withReviewOperationAuthority: async (input, operation) => {
        assertReviewNotPreserved(f.commonDir, input.reviewWorkspace);
        return operation();
      },
      runClaudeReviewerLaunch: () => {
        throw new Error('provider launch');
      },
    });
    let stderr = '';
    const code = await operations.run(
      ['launch-reviewer', invitation, '--host', 'claude', '--resume', '--json'],
      {
        cwd: f.root,
        env: {},
        stdout: { write() {} },
        stderr: { write: (value) => (stderr += value) },
      }
    );
    assert.notEqual(code, 0);
    assert.equal(JSON.parse(stderr).code, 'APR_PRIMARY_AUTHORITY_UNAVAILABLE');
    assert.deepEqual(snapshotReviewHistory(workspace), before);
  });

test(
  'explicit obsolete registration history permits a relocated clone to migrate without rewriting the orphan',
  options,
  async (t) => {
    const f = await fixture(t);
    await f.api.preserveHistory({ cwd: f.root, target: f.target, reason: 'obsolete fixture' });
    const oldRoot = path.join(f.parent, 'former-worktree');
    const workspace = path.join(oldRoot, '.scratch/peer-review/review-orphan');
    const record = {
      schema: 'ai-peer-review.broker-registration/v1',
      created_at: '2026-09-12T12:00:00.000Z',
      review_id: 'review-orphan',
      project_digest: 'c'.repeat(64),
      project_root: oldRoot,
      workspace,
      request_digest: 'a'.repeat(64),
      runtime: {
        root: path.join(oldRoot, 'missing-runtime'),
        entrypoint: path.join(oldRoot, 'missing-runtime/bin/peer-review.mjs'),
        nodeExecutable: process.execPath,
        digest: 'sha256:' + 'b'.repeat(64),
      },
    };
    const file = f.write(
      '.scratch/peer-review/broker/registrations/review-orphan.json',
      JSON.stringify(record) + '\n'
    );
    const before = readFileSync(file);
    await assert.rejects(() => inspectPrimaryReviewInventory(f.commonDir, f.root), {
      code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
    });
    await f.api.preserveHistory({
      cwd: f.root,
      target: file,
      reason: 'explicit obsolete relocated registration; preserve unknown outcome',
    });
    assert.deepEqual(readFileSync(file), before);
    await assert.doesNotReject(() => inspectPrimaryReviewInventory(f.commonDir, f.root));
    const { createReviewPreservationLookup, assertReviewNotPreserved } =
      await import('../../src/config/review-history.mjs');
    const lookup = createReviewPreservationLookup(f.commonDir, path.dirname(file));
    const records = await reconcileRegistrations({
      project: { digest: 'd'.repeat(64), physicalRoot: f.root },
      store: { root: path.dirname(file) },
      inspectAuthority: inspectStartupAuthority,
      isPreserved: lookup.workspace,
      isPreservedRegistration: lookup.registration,
    });
    assert.equal(records.length, 1);
    assert.equal(records[0].workspace, workspace);
    assert.equal(lookup.workspace(workspace), true);
    assert.equal(lookup.workspace(path.join(f.root, '.scratch/peer-review/review-orphan')), false);
    assert.throws(() => assertReviewNotPreserved(f.commonDir, file), {
      code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
    });
    await assert.rejects(
      f.api.holdReview({ cwd: f.root, target: file, reason: 'not a current review' }),
      { code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE' }
    );
    assert.deepEqual(readFileSync(file), before);
  }
);
