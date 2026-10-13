// @story #209
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { tmpdir } from 'node:os';
import fsPromises from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { mkdtemp, realpath, rm, mkdir, writeFile, rename, symlink, link } from 'node:fs/promises';
import { provisionProtectedRoot, openProtectedRoot } from '../../src/broker/storage-protection.mjs';

async function protectedDirectory(t) {
  const parent = await realpath(await mkdtemp(path.join(tmpdir(), 'apr-reconciliation-209-')));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const root = path.join(parent, 'private');
  const receipt = await provisionProtectedRoot({ root });
  const guard = await openProtectedRoot({ receipt });
  t.after(() => guard.close());
  return { root, guard };
}

test('protected reconciliation enumeration includes ordinary files and directories beyond election slots', async (t) => {
  // Dropping non-election names would falsely prove an empty obligation store.
  const { root, guard } = await protectedDirectory(t);
  await mkdir(path.join(root, 'reviews'), { mode: 0o700 });
  await writeFile(path.join(root, 'a.json'), '{}\n', { mode: 0o600 });
  assert.equal(typeof guard.listOrdinaryEntries, 'function');
  const entries = await guard.listOrdinaryEntries();
  assert.deepEqual(
    entries.map(({ name, type }) => ({ name, type })),
    [
      { name: 'a.json', type: 'file' },
      { name: 'reviews', type: 'directory' },
    ]
  );
  assert.ok(entries.every((entry) => typeof entry.identity === 'string' && entry.identity));
  assert.equal(Object.isFrozen(entries), true);
});

test('protected reconciliation enumeration refuses a replaced root', async (t) => {
  // Reopening the same pathname must not substitute a different physical root.
  const { root, guard } = await protectedDirectory(t);
  assert.equal(typeof guard.listOrdinaryEntries, 'function');
  await rename(root, root + '-original');
  await mkdir(root, { mode: 0o700 });
  await assert.rejects(() => guard.listOrdinaryEntries(), { code: 'APR_BROKER_STALE' });
});

test('protected reconciliation enumeration refuses a symbolic link child', async (t) => {
  // Following a linked child would hide an outside obligation namespace.
  const { root, guard } = await protectedDirectory(t);
  assert.equal(typeof guard.listOrdinaryEntries, 'function');
  await symlink(root, path.join(root, 'foreign'));
  await assert.rejects(() => guard.listOrdinaryEntries(), { code: 'APR_BROKER_STALE' });
});

const ordinary = await import('../../src/broker/portable-reconciliation-inventory.mjs').catch(
  (error) => {
    if (
      error.code === 'ERR_MODULE_NOT_FOUND' &&
      error.url?.endsWith('/portable-reconciliation-inventory.mjs')
    )
      return {};
    throw error;
  }
);
async function ordinaryDirectory(t) {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'apr-ordinary-209-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const controller = new AbortController();
  return { root, signal: controller.signal, deadline: performance.now() + 30000 };
}

test('absence anchors retain unrelated links without following them and refuse target creation', async (t) => {
  const input = await ordinaryDirectory(t);
  await symlink(input.root, path.join(input.root, 'unrelated-link'));
  const root = path.join(input.root, 'missing-store', 'resources');
  assert.equal(typeof ordinary.observeOrdinaryReconciliationAbsenceCore, 'function');
  const observation = await ordinary.observeOrdinaryReconciliationAbsenceCore({ ...input, root });
  t.after(() => observation.close());
  assert.equal(observation.verified, false);
  await observation.assertUnchanged();
  await mkdir(path.dirname(root));
  await assert.rejects(() => observation.assertUnchanged(), { code: 'APR_BROKER_STALE' });
});

test('ordinary reconciliation inventory observes physical files without granting protected authority', async (t) => {
  // Omitting a nested authority file would hide an orphan transaction.
  const input = await ordinaryDirectory(t);
  await mkdir(path.join(input.root, 'review'), { mode: 0o755 });
  await writeFile(path.join(input.root, 'a.json'), '{}\n');
  await writeFile(path.join(input.root, 'review', 'events.jsonl'), '{}\n');
  assert.equal(typeof ordinary.observeOrdinaryReconciliationTree, 'function');
  const observed = await ordinary.observeOrdinaryReconciliationTree(input);
  t.after(() => observed.close());
  assert.equal(observed.verified, false);
  assert.deepEqual(
    observed.entries.map((entry) => entry.relativePath),
    ['a.json', 'review', 'review/events.jsonl']
  );
  await ordinary.assertOrdinaryReconciliationTreeUnchanged(observed);
});

test('ordinary reconciliation inventory refuses new membership after observation', async (t) => {
  // A stale empty list must not authorize a later owner effect.
  const input = await ordinaryDirectory(t);
  assert.equal(typeof ordinary.observeOrdinaryReconciliationTree, 'function');
  const observed = await ordinary.observeOrdinaryReconciliationTree(input);
  t.after(() => observed.close());
  await writeFile(path.join(input.root, 'new.json'), '{}\n');
  await assert.rejects(() => ordinary.assertOrdinaryReconciliationTreeUnchanged(observed), {
    code: 'APR_BROKER_STALE',
  });
});

test('ordinary reconciliation inventory refuses replacement of an empty original root', async (t) => {
  // Equal empty child lists cannot prove that the physical root is unchanged.
  const input = await ordinaryDirectory(t);
  const observed = await ordinary.observeOrdinaryReconciliationTree(input);
  t.after(() => observed.close());
  const retained = input.root + '-original';
  t.after(() => rm(retained, { recursive: true, force: true }));
  await rename(input.root, retained);
  await mkdir(input.root);
  await assert.rejects(() => ordinary.assertOrdinaryReconciliationTreeUnchanged(observed), {
    code: 'APR_BROKER_STALE',
  });
});

test('ordinary reconciliation inventory refuses a authority file linked from another name', async (t) => {
  // A second locator must not mutate a supposedly retained ordinary file.
  const input = await ordinaryDirectory(t);
  await writeFile(path.join(input.root, 'first.json'), '{}\n');
  await link(path.join(input.root, 'first.json'), path.join(input.root, 'second.json'));
  assert.equal(typeof ordinary.observeOrdinaryReconciliationTree, 'function');
  await assert.rejects(() => ordinary.observeOrdinaryReconciliationTree(input), {
    code: 'APR_BROKER_STALE',
  });
});

test('ordinary reconciliation inventory cannot revalidate copied observations', async (t) => {
  const input = await ordinaryDirectory(t);
  assert.equal(typeof ordinary.observeOrdinaryReconciliationTree, 'function');
  const observed = await ordinary.observeOrdinaryReconciliationTree(input);
  t.after(() => observed.close());
  await assert.rejects(() => ordinary.assertOrdinaryReconciliationTreeUnchanged({ ...observed }), {
    code: 'APR_BROKER_STALE',
  });
});

test('ordinary reconciliation inventory refuses an oversized authority file', async (t) => {
  const input = await ordinaryDirectory(t);
  await writeFile(path.join(input.root, 'events.jsonl'), Buffer.alloc(1048577, 65));
  await assert.rejects(
    () => ordinary.observeOrdinaryReconciliationTree(input),
    (error) =>
      error.code === 'APR_BROKER_STALE' &&
      error.details.reason === 'reconciliation-inventory-overflow'
  );
});

test('ordinary reconciliation inventory retains its original abort signal', async (t) => {
  const input = await ordinaryDirectory(t);
  const controller = new AbortController();
  input.signal = controller.signal;
  const observed = await ordinary.observeOrdinaryReconciliationTree(input);
  t.after(() => observed.close());
  input.signal = new AbortController().signal;
  controller.abort();
  await assert.rejects(
    () => ordinary.assertOrdinaryReconciliationTreeUnchanged(observed),
    (error) =>
      error.code === 'APR_BROKER_STALE' && error.details.reason === 'reconciliation-aborted'
  );
});

test('ordinary reconciliation inventory refuses an already expired deadline', async (t) => {
  const input = await ordinaryDirectory(t);
  input.deadline = performance.now() - 1;
  await assert.rejects(
    () => ordinary.observeOrdinaryReconciliationTree(input),
    (error) =>
      error.code === 'APR_BROKER_STALE' && error.details.reason === 'reconciliation-deadline'
  );
});

test('ordinary reconciliation inventory refuses a symbolic-link authority child', async (t) => {
  const input = await ordinaryDirectory(t);
  await symlink(input.root, path.join(input.root, 'review'));
  await assert.rejects(
    () => ordinary.observeOrdinaryReconciliationTree(input),
    (error) =>
      error.code === 'APR_BROKER_STALE' &&
      error.details.reason === 'reconciliation-namespace-unproved'
  );
});

test('ordinary reconciliation inventory rejects changed bytes after an await', async (t) => {
  const input = await ordinaryDirectory(t);
  await writeFile(path.join(input.root, 'events.jsonl'), 'first\n');
  const observed = await ordinary.observeOrdinaryReconciliationTree(input);
  t.after(() => observed.close());
  await writeFile(path.join(input.root, 'events.jsonl'), 'other\n');
  await assert.rejects(
    () => ordinary.assertOrdinaryReconciliationTreeUnchanged(observed),
    (error) =>
      error.code === 'APR_BROKER_STALE' &&
      error.details.reason === 'reconciliation-generation-changed'
  );
});

test('ordinary reconciliation cleanup retries only unresolved original descriptors', async (t) => {
  // Retrying an already closed child must not prevent closing the retained root.
  const input = await ordinaryDirectory(t);
  await mkdir(path.join(input.root, 'child'));
  const original = fsPromises.opendir;
  let refused = false;
  fsPromises.opendir = async (...args) => {
    const handle = await original(...args);
    if (args[0] === input.root) {
      const close = handle.close.bind(handle);
      handle.close = async () => {
        if (!refused) {
          refused = true;
          throw Object.assign(new Error('injected descriptor failure'), { code: 'EIO' });
        }
        return close();
      };
    }
    return handle;
  };
  syncBuiltinESMExports();
  t.after(() => {
    fsPromises.opendir = original;
    syncBuiltinESMExports();
  });
  const observed = await ordinary.observeOrdinaryReconciliationTree(input);
  t.after(() => observed.close());
  await assert.rejects(() => observed.close(), {
    code: 'APR_BROKER_STALE',
  });
  assert.equal(observed.outstandingObligations.length, 1);
  assert.equal(observed.outstandingObligations[0].root, input.root);
  await assert.rejects(() => ordinary.assertOrdinaryReconciliationTreeUnchanged(observed), {
    code: 'APR_BROKER_STALE',
  });
  await observed.close();
  assert.deepEqual(observed.outstandingObligations, []);
});

test('ordinary reconciliation retains a file descriptor whose close fails during capture', async (t) => {
  // Losing a failed file close would let a later capture falsely report clean resources.
  const input = await ordinaryDirectory(t);
  const target = path.join(input.root, 'events.jsonl');
  await writeFile(target, '{}\n');
  const original = fsPromises.open;
  let retained;
  let fail = true;
  fsPromises.open = async (...args) => {
    const handle = await original(...args);
    if (args[0] === target) {
      retained = handle;
      const close = handle.close.bind(handle);
      handle.close = async () => {
        if (fail) throw Object.assign(new Error('injected file close failure'), { code: 'EIO' });
        return close();
      };
    }
    return handle;
  };
  syncBuiltinESMExports();
  t.after(async () => {
    fsPromises.open = original;
    syncBuiltinESMExports();
    fail = false;
    if (retained?.fd >= 0) await retained.close();
  });
  await assert.rejects(
    () => ordinary.observeOrdinaryReconciliationTree(input),
    (error) =>
      error.code === 'APR_BROKER_STALE' &&
      error.details.reason === 'reconciliation-close-unproved' &&
      error.details.outstandingObligations.some((item) => item.name === 'ordinary-file-descriptor')
  );
  assert.ok(retained.fd >= 0);
  fsPromises.open = original;
  syncBuiltinESMExports();
  await assert.rejects(
    () => ordinary.observeOrdinaryReconciliationTree(input),
    (error) => error.details.reason === 'reconciliation-close-unproved'
  );
  fail = false;
  await ordinary.retryOrdinaryReconciliationCleanup();
  assert.equal(retained.fd, -1);
});

test('namespace discovery includes orphan direct and nested review transactions', () => {
  // Enumerating only registrations would omit these durable review stores.
  assert.equal(typeof ordinary.describeReconciliationNamespacesCore, 'function');
  const result = ordinary.describeReconciliationNamespacesCore({
    projectEntries: [
      { name: 'private', type: 'directory' },
      { name: 'runtime', type: 'directory' },
      { name: 'runtimes', type: 'directory' },
      { name: 'broker', type: 'directory' },
      { name: 'reviews', type: 'directory' },
      { name: 'review-orphan', type: 'directory' },
    ],
    brokerEntries: [
      { name: 'registrations', type: 'directory' },
      { name: 'recovery', type: 'directory' },
    ],
    reviewEntries: [{ name: 'review-nested-orphan', type: 'directory' }],
  });
  assert.equal(result.verified, false);
  assert.deepEqual(result.reviewPaths, ['review-orphan', 'reviews/review-nested-orphan']);
  assert.deepEqual(result.brokerPaths, ['broker/recovery', 'broker/registrations']);
});

test('namespace discovery refuses unknown broker children and malformed review names', () => {
  // Ignoring unknown authority-bearing names would produce false empty inventory.
  assert.equal(typeof ordinary.describeReconciliationNamespacesCore, 'function');
  for (const input of [
    {
      projectEntries: [],
      brokerEntries: [{ name: 'unknown.json', type: 'file' }],
      reviewEntries: [],
    },
    {
      projectEntries: [{ name: 'unknown.json', type: 'file' }],
      brokerEntries: [],
      reviewEntries: [],
    },
    {
      projectEntries: [],
      brokerEntries: [],
      reviewEntries: [{ name: '../outside', type: 'directory' }],
    },
    {
      projectEntries: [],
      brokerEntries: [{ name: 'registrations', type: 'file' }],
      reviewEntries: [],
    },
  ])
    assert.throws(
      () => ordinary.describeReconciliationNamespacesCore(input),
      (error) => error.details.reason === 'reconciliation-namespace-unproved'
    );
});

test('production reconciliation inventory refuses caller-shaped owner paths', async () => {
  // An arbitrary private/runtime pair cannot mint a real project binding.
  assert.equal(typeof ordinary.observeReconciliationInventory, 'function');
  await assert.rejects(
    () =>
      ordinary.observeReconciliationInventory({
        paths: { privateRoot: '/tmp/private', runtimeRoot: '/tmp/runtime' },
        signal: new AbortController().signal,
        deadline: performance.now() + 30000,
      }),
    { code: 'APR_BROKER_STALE' }
  );
});

test('production inventory assertion rejects copied observations and changed original context', async () => {
  // Public discovery-shaped objects cannot replace private retained inventory membership.
  assert.equal(typeof ordinary.assertReconciliationInventory, 'function');
  await assert.rejects(
    () =>
      ordinary.assertReconciliationInventory({
        observation: { verified: false, entryCount: 0, namespaces: [] },
        paths: {},
        signal: new AbortController().signal,
        deadline: performance.now() + 30000,
      }),
    (error) => error.details.reason === 'reconciliation-observation-unproved'
  );
});

test('ordinary inventory refuses a directory deeper than the original bound', async (t) => {
  // An arbitrarily deep orphan store must not evade the total inventory bound.
  const input = await ordinaryDirectory(t);
  let root = input.root;
  for (let i = 0; i < 17; i++) {
    root = path.join(root, 'child');
    await mkdir(root);
  }
  await assert.rejects(
    () => ordinary.observeOrdinaryReconciliationTree(input),
    (error) => error.details.reason === 'reconciliation-inventory-overflow'
  );
});

test('ordinary inventory refuses entry overflow rather than truncating enumeration', async (t) => {
  const input = await ordinaryDirectory(t);
  for (let i = 0; i < 4097; i++) await writeFile(path.join(input.root, 'entry-' + i), '');
  await assert.rejects(
    () => ordinary.observeOrdinaryReconciliationTree(input),
    (error) => error.details.reason === 'reconciliation-inventory-overflow'
  );
});

test('fixed project producer discovers orphan stores and retains missing-store parent membership', async (t) => {
  // This is the real read-only project producer used by fixed production discovery, without an owner grant.
  const input = await ordinaryDirectory(t);
  const root = path.join(input.root, '.scratch', 'peer-review');
  await mkdir(path.join(root, 'reviews', 'review-nested'), { recursive: true });
  await mkdir(path.join(root, 'review-direct'));
  await writeFile(path.join(root, 'review-direct', 'startup-request.json'), '{}\n');
  assert.equal(typeof ordinary.observeProjectReconciliationInventoryCore, 'function');
  const observed = await ordinary.observeProjectReconciliationInventoryCore({ ...input, root });
  t.after(() => observed.close());
  assert.equal(observed.verified, false);
  assert.deepEqual(
    observed.namespaces.map(({ kind, root: location }) => [kind, path.relative(root, location)]),
    [
      ['review', 'review-direct'],
      ['review', path.join('reviews', 'review-nested')],
    ]
  );
  await observed.assertUnchanged();
  await mkdir(path.join(root, 'broker'));
  await assert.rejects(
    () => observed.assertUnchanged(),
    (error) => error.details.reason === 'reconciliation-generation-changed'
  );
});

for (const child of [
  'unknown-authority.json',
  'provider/unknown-host/launch-state.json',
  'wake/operations/unknown.json',
]) {
  test('fixed project producer refuses unknown authority child ' + child, async (t) => {
    const input = await ordinaryDirectory(t);
    const root = path.join(input.root, '.scratch', 'peer-review');
    const file = path.join(root, 'review-orphan', child);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, '{}\n');
    await assert.rejects(
      () => ordinary.observeProjectReconciliationInventoryCore({ ...input, root }),
      (error) => error.details.reason === 'reconciliation-namespace-unproved'
    );
  });
}

test('existing-effect resource assertion refuses copied inventory membership', async () => {
  assert.equal(typeof ordinary.assertReconciliationExistingEffectScope, 'function');
  await assert.rejects(
    () =>
      ordinary.assertReconciliationExistingEffectScope({
        observation: { verified: true },
        paths: {},
        signal: new AbortController().signal,
        deadline: performance.now() + 30000,
      }),
    { code: 'APR_BROKER_STALE' }
  );
});

test('fixed project discovery retains the stock provider operation namespace as evidence', async (t) => {
  // The actual provider adapter persists digest-named operation records here.
  const input = await ordinaryDirectory(t);
  const root = path.join(input.root, '.scratch', 'peer-review');
  const file = path.join(
    root,
    'review-one',
    'provider',
    'claude',
    'operations',
    'a'.repeat(64) + '.json'
  );
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, '{}\n');
  const observed = await ordinary.observeProjectReconciliationInventoryCore({ ...input, root });
  t.after(() => observed.close());
  assert.equal(observed.verified, false);
  assert.deepEqual(
    observed.namespaces.map(({ kind }) => kind),
    ['review']
  );
  await observed.assertUnchanged();
});

test('owner namespace policy preserves legacy obligations and refuses unknown private children', () => {
  // An ignored private child cannot substitute for complete reconciliation of old generations.
  assert.equal(typeof ordinary.describeOwnerReconciliationNamespaceCore, 'function');
  const key = 'a'.repeat(64);
  const result = ordinary.describeOwnerReconciliationNamespaceCore({
    resourceKey: key,
    privateEntries: [
      { name: 'owner.json', type: 'file' },
      { name: 'registry.json', type: 'file' },
      { name: 'apr-election-' + key + '-contender.json', type: 'file' },
    ],
    runtimeEntries: [{ name: 'endpoint.json', type: 'file' }],
  });
  assert.equal(result.verified, false);
  assert.deepEqual(result.legacyNames, ['registry.json']);
  assert.throws(
    () =>
      ordinary.describeOwnerReconciliationNamespaceCore({
        resourceKey: key,
        privateEntries: [{ name: 'unknown', type: 'directory' }],
        runtimeEntries: [],
      }),
    (error) => error.details.reason === 'reconciliation-namespace-unproved'
  );
});

test('resource namespace binds C3 filenames to the exact root and independent resource ID', async () => {
  const api = await import('../../src/broker/portable-reconciliation-inventory.mjs');
  const root = path.join(
    path.parse(process.cwd()).root,
    'account',
    'provider-resources',
    'a'.repeat(64)
  );
  const empty = api.describeResourceReconciliationNamespaceCore({ root, entries: [] });
  assert.equal(empty.verified, false);
  const name = 'apr-resource-' + empty.resourceKey + '.json';
  assert.deepEqual(
    api.describeResourceReconciliationNamespaceCore({ root, entries: [{ name, type: 'file' }] }),
    empty
  );
  assert.throws(
    () =>
      api.describeResourceReconciliationNamespaceCore({
        root,
        entries: [{ name: 'apr-resource-' + 'a'.repeat(64) + '.json', type: 'file' }],
      }),
    { code: 'APR_BROKER_STALE' }
  );
  assert.throws(
    () =>
      api.describeResourceReconciliationNamespaceCore({
        root: root + '-moved',
        entries: [{ name, type: 'file' }],
      }),
    { code: 'APR_BROKER_STALE' }
  );
  assert.throws(
    () =>
      api.describeResourceReconciliationNamespaceCore({
        root,
        entries: [
          { name, type: 'file' },
          { name, type: 'file' },
        ],
      }),
    { code: 'APR_BROKER_STALE' }
  );
});

test('fixed genuine-path inventory observes ordinary project stores and rejects an added orphan', async (t) => {
  const api = await import('../../src/broker/portable-reconciliation-inventory.mjs');
  const election = await import('../../src/broker/ownership-election.mjs');
  const project = await realpath(await mkdtemp(path.join(tmpdir(), 'apr-fixed-inventory-209-')));
  const base = path.join(project, '.scratch', 'peer-review');
  await mkdir(base, { recursive: true, mode: 0o755 });
  await mkdir(path.join(base, 'retained-review'), { mode: 0o755 });
  const context = { signal: new AbortController().signal, deadline: performance.now() + 30000 };
  const held = { paths: null, observed: null };
  t.after(async () => {
    await held.observed?.close();
    await held.paths?.close();
    await rm(project, { recursive: true, force: true });
  });
  const privateReceipt = await provisionProtectedRoot({
    root: path.join(base, 'private'),
    ...context,
  });
  const runtimeReceipt = await provisionProtectedRoot({
    root: path.join(base, 'runtime'),
    ...context,
  });
  const paths = await election.bindOwnerElectionPaths({
    receipt: privateReceipt,
    effectReceipts: [runtimeReceipt],
    resource: { kind: 'broker-owner' },
    ...context,
  });
  held.paths = paths;
  const observed = await api.observeReconciliationInventory({ paths, ...context });
  held.observed = observed;
  assert.equal(observed.verified, false);
  await api.assertReconciliationInventory({ observation: observed, paths, ...context });
  const data = await api.readReconciliationInventory({ observation: observed, paths, ...context });
  assert.equal(data.project.physicalRoot, project);
  // This read-only observer delegates C4-owned bytes to the genuine owner layer;
  // these fixture bytes never mint an owner or source/election capability.
  await writeFile(path.join(base, 'private', 'owner.json'), '{}\n', { mode: 0o600 });
  await api.assertReconciliationInventory({ observation: observed, paths, ...context });
  await writeFile(path.join(base, 'private', 'alien.json'), '{}\n', { mode: 0o600 });
  await assert.rejects(
    () => api.assertReconciliationInventory({ observation: observed, paths, ...context }),
    (error) => error.details?.reason === 'reconciliation-namespace-unproved'
  );
  await rm(path.join(base, 'private', 'alien.json'));
  await assert.rejects(
    () => api.readReconciliationInventory({ observation: { ...observed }, paths, ...context }),
    { code: 'APR_BROKER_STALE' }
  );
  await writeFile(path.join(base, 'retained-review', 'manual-fence.json'), '{}\n');
  await assert.rejects(
    () => api.assertReconciliationExistingEffectScope({ observation: observed, paths, ...context }),
    (error) => error.details?.reason === 'reconciliation-generation-changed'
  );
  await rm(path.join(base, 'retained-review', 'manual-fence.json'));
  const forEvents = await api.observeReconciliationInventory({ paths, ...context });
  t.after(() => forEvents.close());
  await writeFile(path.join(base, 'retained-review', 'events.jsonl'), '{}\n');
  await assert.rejects(
    () =>
      api.assertReconciliationExistingEffectScope({ observation: forEvents, paths, ...context }),
    (error) => error.details?.reason === 'reconciliation-generation-changed'
  );
  await mkdir(path.join(base, 'new-orphan'), { mode: 0o755 });
  await assert.rejects(
    () => api.assertReconciliationInventory({ observation: observed, paths, ...context }),
    (error) => error.details?.reason === 'reconciliation-generation-changed'
  );
});

test('stock start hooks remain bounded metadata namespaces rather than review transactions', async (t) => {
  const input = await ordinaryDirectory(t);
  const root = path.join(input.root, '.scratch', 'peer-review');
  const { captureCodexStartHook } = await import('../helpers/codex-hook-api.mjs');
  const { captureClaudeStartHook } = await import('../helpers/claude-hook-api.mjs');
  const command = 'peer-review start docs/artifact.md --issue 209';
  await captureCodexStartHook({
    token: 'a'.repeat(32),
    sourceVersion: '1.0.0',
    observedAt: '2026-10-12T00:00:00.000Z',
    event: {
      cwd: input.root,
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command },
      model: 'model',
      session_id: 'author-session',
      tool_use_id: 'author-tool',
      turn_id: 'turn-one',
    },
  });
  const session = '11111111-1111-4111-8111-111111111111',
    transcript = path.join(input.root, session + '.jsonl');
  await writeFile(
    transcript,
    JSON.stringify({
      type: 'assistant',
      sessionId: session,
      version: '1.0.0',
      timestamp: '2026-10-12T00:00:00.000Z',
      message: {
        model: 'claude-model',
        content: [{ type: 'tool_use', id: 'claude-tool', name: 'Bash', input: { command } }],
      },
    }) + '\n',
    { mode: 0o600 }
  );
  await captureClaudeStartHook({
    token: 'b'.repeat(32),
    sourceVersion: '1.0.0',
    observedAt: '2026-10-12T00:00:00.000Z',
    event: {
      cwd: input.root,
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command },
      session_id: session,
      tool_use_id: 'claude-tool',
      transcript_path: transcript,
    },
  });
  const observed = await ordinary.observeProjectReconciliationInventoryCore({ ...input, root });
  t.after(() => observed.close());
  assert.equal(observed.verified, false);
  assert.deepEqual(
    observed.namespaces.map(({ kind }) => kind),
    ['claude-hooks', 'codex-hooks']
  );
  await observed.assertUnchanged();
  await writeFile(path.join(root, 'codex-hooks', 'a'.repeat(32) + '.json'), '{}\n');
  await assert.rejects(() => observed.assertUnchanged(), { code: 'APR_BROKER_STALE' });
  await assert.rejects(
    () => ordinary.observeProjectReconciliationInventoryCore({ ...input, root }),
    { code: 'APR_BROKER_STALE' }
  );
});
