import { readFileSync, writeFileSync } from 'node:fs';
// @story #187
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { createSelectionStore } from '../../src/config/runtime-selection-core.mjs';

test('selection construction observes neither unavailable paths nor account or protection', () => {
  let calls = 0,
    store;
  const missing = path.join(tmpdir(), 'apr-definition-only-' + randomUUID());
  assert.doesNotThrow(() => {
    store = createSelectionStore({
      packageRoot: missing,
      nodeExecutable: path.join(missing, 'node'),
      account: () => {
        calls++;
        throw new Error('account-observed-during-definition');
      },
      security: () => {
        calls++;
        throw new Error('protection-observed-during-definition');
      },
    });
  });
  assert.equal(calls, 0);
  assert.equal(typeof store.read, 'function');
  assert.equal(typeof store.register, 'function');
  assert.equal(typeof store.assertSelected, 'function');
});

test('foreign OS selection input refuses before observing unavailable installation paths', async () => {
  let accountCalls = 0;
  const missing = path.join(tmpdir(), 'apr-foreign-host-' + randomUUID());
  const store = createSelectionStore({
    packageRoot: missing,
    nodeExecutable: path.join(missing, 'node'),
    kind: process.platform === 'win32' ? 'linux' : 'win32',
    account() {
      accountCalls++;
      throw Error('foreign account observed');
    },
  });
  for (const name of ['location', 'read', 'register', 'assertSelected'])
    await assert.rejects(store[name](), { code: 'APR_RUNTIME_ACCOUNT_UNAVAILABLE' }, name);
  assert.equal(accountCalls, 0);
});

import { deriveProcessSourceContract } from '../../scripts/verify-portable-consumers.mjs';
import { consumerFixture } from '../helpers/portable-consumer-fixtures.mjs';

test('development closure can enumerate its manifest before first generation without omitting it', (t) => {
  const fixture = consumerFixture(
    t,
    {
      'src/protocol/process-source-assurance.mjs': 'export const parser = 1;',
      'schemas/process-source-class-v1.json': '{}',
    },
    { entries: ['src/protocol/process-source-assurance.mjs'] }
  );
  assert.deepEqual(deriveProcessSourceContract({ root: fixture.root }).files, [
    'schemas/process-source-class-v1.json',
    'src/protocol/process-source-assurance.mjs',
    'src/protocol/process-source-contract-files.json',
  ]);
});
test('development closure admits only its explicitly pinned JSON inputs', (t) => {
  const fixture = consumerFixture(
    t,
    {
      'src/protocol/process-source-assurance.mjs':
        "import schema from '../../schemas/process-source-class-v1.json' with { type: 'json' }; export { schema };",
      'schemas/process-source-class-v1.json': '{}',
      'src/protocol/process-source-contract-files.json': '{}',
    },
    { entries: ['src/protocol/process-source-assurance.mjs'] }
  );
  assert.deepEqual(deriveProcessSourceContract({ root: fixture.root }).files, [
    'schemas/process-source-class-v1.json',
    'src/protocol/process-source-assurance.mjs',
    'src/protocol/process-source-contract-files.json',
  ]);
});

test('manifest generation binds the actual closure and check mode never repairs a stale manifest', async (t) => {
  const generator = await import('../../scripts/generate-process-source-contract.mjs').catch(
    () => ({})
  );
  assert.equal(typeof generator.generateProcessSourceContract, 'function');
  const fixture = consumerFixture(
    t,
    {
      'src/protocol/process-source-assurance.mjs':
        "export const parser = () => import('../guard.mjs');",
      'src/guard.mjs': 'export const guard = 1;',
      'schemas/process-source-class-v1.json': '{}',
    },
    { entries: ['src/protocol/process-source-assurance.mjs'] }
  );
  const result = generator.generateProcessSourceContract({ root: fixture.root });
  assert.equal(result.verified, false);
  const manifest = JSON.parse(
    readFileSync(path.join(fixture.root, 'src/protocol/process-source-contract-files.json'), 'utf8')
  );
  assert.deepEqual(manifest, {
    schema: 'ai-peer-review.process-source-contract-files/v1',
    entry: 'src/protocol/process-source-assurance.mjs',
    files: [
      'schemas/process-source-class-v1.json',
      'src/guard.mjs',
      'src/protocol/process-source-assurance.mjs',
      'src/protocol/process-source-contract-files.json',
    ],
  });
  assert.equal(
    generator.generateProcessSourceContract({ root: fixture.root, check: true }).changed,
    false
  );
  const file = path.join(fixture.root, 'src/protocol/process-source-contract-files.json');
  writeFileSync(
    file,
    JSON.stringify({
      ...manifest,
      files: manifest.files.filter((value) => value !== 'src/guard.mjs'),
    })
  );
  const stale = readFileSync(file, 'utf8');
  assert.throws(
    () => generator.generateProcessSourceContract({ root: fixture.root, check: true }),
    /manifest|closure|stale/i
  );
  assert.equal(readFileSync(file, 'utf8'), stale);
});

import { runtimeFixture } from '../helpers/runtime-selection-fixture.mjs';
import { existsSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

test('selection awaits account discovery without accepting a promise as account authority', async (t) => {
  const f = runtimeFixture(t);
  let calls = 0;
  const store = createSelectionStore({
    packageRoot: f.packageRoot,
    account: async () => {
      calls++;
      await Promise.resolve();
      return f.account();
    },
  });
  const registered = await store.register();
  assert.equal((await store.assertSelected()).selection_id, registered.selection_id);
  assert.ok(calls >= 3);
});
test('cancelled selection registration retains the original budget and writes no locator', async (t) => {
  const f = runtimeFixture(t);
  const controller = new AbortController();
  controller.abort();
  const store = createSelectionStore({ packageRoot: f.packageRoot, account: f.account });
  await assert.rejects(
    store.register({ signal: controller.signal, deadline: performance.now() + 5000 }),
    /abort|cancel|deadline|context/i
  );
  assert.equal(
    existsSync(
      path.join(
        f.home,
        process.platform === 'win32'
          ? 'AppData/Local/ai-peer-review/runtime-selection.json'
          : '.config/ai-peer-review/runtime-selection.json'
      )
    ),
    false
  );
});

import { fileURLToPath } from 'node:url';
test('actual protected selection source closure includes owner and HTTP code without package metadata', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const files = deriveProcessSourceContract({ root }).files;
  for (const file of [
    'src/broker/storage-protection.mjs',
    'src/broker/ownership-election.mjs',
    'src/broker/portable-ownership.mjs',
    'src/broker/owner-connection.mjs',
  ])
    assert.ok(files.includes(file), file);
  assert.equal(files.includes('package.json'), false);
});

import { spawnSync } from 'node:child_process';
test('fresh processes can import assurance, selection and both factories in every dependency order', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const orders = [
    ['src/protocol/process-source-assurance.mjs', 'src/config/runtime-selection.mjs'],
    ['src/config/runtime-selection.mjs', 'src/protocol/process-source-assurance.mjs'],
    [
      'src/broker/portable-platform.mjs',
      'src/broker/portable-system.mjs',
      'src/config/runtime-selection.mjs',
    ],
    [
      'src/broker/portable-system.mjs',
      'src/config/runtime-selection.mjs',
      'src/broker/portable-platform.mjs',
    ],
  ];
  for (const order of orders) {
    const modules = order.map((file) => new URL('../../' + file, import.meta.url).href);
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `for(const file of ${JSON.stringify(modules)}) await import(file);const selection=await import(${JSON.stringify(new URL('../../src/config/runtime-selection.mjs', import.meta.url).href)});try{await selection.assertSelectedRuntime();throw new Error('source admitted');}catch(error){if(error.code!=='APR_RUNTIME_INSTALLATION_INVALID')throw error;}console.log('refused');`,
      ],
      { cwd: root, encoding: 'utf8', timeout: 15000 }
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), 'refused');
  }
});

import { createPrimaryAuthorityFixture } from '../helpers/repository-fixture.mjs';
import {
  readPrimaryRegistration,
  resolvePrimaryAuthority,
} from '../../src/config/primary-authority.mjs';
import { discoverAuthorityRepository } from '../../src/git/repository.mjs';
test('primary registration is an awaited protected observation, never synchronous permission', async (t) => {
  const f = await createPrimaryAuthorityFixture(t);
  const pending = readPrimaryRegistration(discoverAuthorityRepository(f.root));
  assert.equal(typeof pending?.then, 'function');
  const observed = await pending;
  assert.equal(observed.record.primary_root, f.root);
});
test('primary authority refuses the original aborted context before admitting owned policy', async (t) => {
  const f = await createPrimaryAuthorityFixture(t),
    controller = new AbortController();
  controller.abort();
  await assert.rejects(
    resolvePrimaryAuthority({
      cwd: f.root,
      signal: controller.signal,
      deadline: performance.now() + 5000,
    }),
    /abort|cancel|deadline|context/i
  );
  assert.equal(readFileSync(f.registrationPath, 'utf8'), JSON.stringify(f.record) + '\n');
});

test('authority diagnostics await refused primary observations before reporting a row', () => {
  const module = new URL('../../src/startup/authority-diagnostics.mjs', import.meta.url).href;
  const child = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import {authorityDiagnosticRows} from ${JSON.stringify(module)};const rows=await authorityDiagnosticRows({cwd:process.cwd()});if(rows.some(row=>row.status==='ok'))throw new Error('promise reported as authority');console.log('refused');`,
    ],
    { cwd: tmpdir(), encoding: 'utf8', timeout: 15000 }
  );
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout.trim(), 'refused');
});

import { withPrimaryAdmissionFence } from '../../src/config/primary-admission.mjs';
test('primary admission cancellation cannot acquire or invoke an effect', async (t) => {
  const f = await createPrimaryAuthorityFixture(t),
    controller = new AbortController();
  controller.abort();
  let calls = 0;
  await assert.rejects(
    withPrimaryAdmissionFence(
      { commonDir: f.commonDir, signal: controller.signal, deadline: performance.now() + 5000 },
      () => {
        calls++;
      }
    ),
    /abort|cancel|deadline|context/i
  );
  assert.equal(calls, 0);
});
test('ordinary primary election refuses missing installed source support before an effect', async (t) => {
  const f = await createPrimaryAuthorityFixture(t);
  let calls = 0;
  await assert.rejects(
    withPrimaryAdmissionFence(
      {
        commonDir: f.commonDir,
        signal: new AbortController().signal,
        deadline: performance.now() + 5000,
      },
      () => {
        calls++;
      }
    ),
    /source|election|authority|admission/i
  );
  assert.equal(calls, 0);
});

import { primaryAdmissionFixture } from '../helpers/primary-admission-fixture.mjs';
import {
  assertPrimaryAdmissionFence,
  primaryAdmissionRoot,
} from '../../src/config/primary-admission.mjs';
test('an unverified primary fixture cannot mint production admission and its root differs from broker and provider storage', async (t) => {
  const f = await createPrimaryAuthorityFixture(t),
    fixture = primaryAdmissionFixture();
  await fixture.run({ commonDir: f.commonDir }, async (fence, context) => {
    assert.equal(fence.verified, false);
    await assert.rejects(assertPrimaryAdmissionFence(fence, context), /authenticated|admission/i);
  });
  assert.equal(fixture.slots.size, 0);
  const root = primaryAdmissionRoot(f.commonDir);
  for (const other of [
    path.join(f.commonDir, 'ai-peer-review'),
    path.join(f.root, '.scratch', 'peer-review', 'broker', 'private'),
    path.join(f.root, '.scratch', 'peer-review', 'providers'),
  ])
    assert.notEqual(root, other);
});

test('failed election withdrawal retains its generation without retiring membership or closing guards', async () => {
  const api = await import('../../src/broker/ownership-election.mjs');
  const generation = {
    contenderId: 'original-nonce',
    resourceKey: 'primary',
    version: 17,
    outcome: 'removal-unconfirmed',
  };
  let retired = 0,
    closed = 0;
  const result = await api.completeElectionWithdrawalCore({
    withdraw: async () => ({ status: 'unresolved', obligations: [generation] }),
    retire: () => {
      retired++;
    },
    close: async () => {
      closed++;
      return [];
    },
  });
  assert.equal(result.verified, false);
  assert.equal(result.status, 'unresolved');
  assert.deepEqual(result.obligations, [generation]);
  assert.equal(retired, 0);
  assert.equal(closed, 0);
});

test('cancellation during awaited account discovery preserves locator absence', async (t) => {
  const f = runtimeFixture(t),
    controller = new AbortController();
  let entered, release;
  const ready = new Promise((resolve) => {
    entered = resolve;
  });
  const hold = new Promise((resolve) => {
    release = resolve;
  });
  const store = createSelectionStore({
    packageRoot: f.packageRoot,
    account: async () => {
      entered();
      await hold;
      return f.account();
    },
  });
  const pending = store.register({ signal: controller.signal, deadline: performance.now() + 5000 });
  await ready;
  controller.abort();
  release();
  await assert.rejects(pending, /abort|deadline/i);
  assert.equal(
    existsSync(
      path.join(
        f.home,
        process.platform === 'win32'
          ? 'AppData/Local/ai-peer-review/runtime-selection.json'
          : '.config/ai-peer-review/runtime-selection.json'
      )
    ),
    false
  );
});
import {
  assertOperationAuthority,
  assertOperationAuthorityNow,
  performOperationEffect,
} from '../../src/startup/authority-fence.mjs';
test('copied and unawaited fences and authenticated read roles cannot authorize an effect', async () => {
  let effects = 0;
  const pending = assertOperationAuthority({ operation: 'help' });
  await assert.rejects(
    performOperationEffect(pending, () => {
      effects++;
    }),
    /authenticated|authority/i
  );
  const read = await pending;
  await assert.rejects(assertOperationAuthorityNow({ ...read }), /authenticated|authority/i);
  await assert.rejects(
    performOperationEffect(read, () => {
      effects++;
    }),
    /Read authority/i
  );
  assert.equal(effects, 0);
});

import { renameSync } from 'node:fs';
import { replaceProtectedFixtureFile } from '../helpers/protected-generation-fixture.mjs';
test('selection file replacement with identical bytes fences an already observed generation', async (t) => {
  const f = runtimeFixture(t),
    store = createSelectionStore({ packageRoot: f.packageRoot, account: f.account });
  await store.register();
  const observation = await store.assertSelected();
  const file = await store.location(),
    bytes = readFileSync(file);
  await replaceProtectedFixtureFile(file, bytes);
  await assert.rejects(store.assertSelected({ previousObservation: observation }), {
    code: 'APR_RUNTIME_CHANGED',
  });
  assert.deepEqual(readFileSync(file), bytes);
  assert.deepEqual(readFileSync(file + '.original'), bytes);
});

test('selection protected reads enforce their narrower byte limit before returning a snapshot', async (t) => {
  const { mkdtemp, realpath, rm } = await import('node:fs/promises');
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'apr-bounded-selection-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const context = { signal: new AbortController().signal, deadline: performance.now() + 30000 };
  const { provisionProtectedRoot, openProtectedRoot } =
    await import('../../src/broker/storage-protection.mjs');
  const receipt = await provisionProtectedRoot({
    root,
    ...context,
  });
  const guard = await openProtectedRoot({ receipt, ...context });
  try {
    await guard.writeExclusive('selection.json', Buffer.alloc(8193, 120));
    await assert.rejects(guard.readSnapshot('selection.json', 8192), { code: 'APR_BROKER_STALE' });
    assert.equal((await guard.readSnapshot('selection.json')).bytes.length, 8193);
  } finally {
    await guard.close();
  }
});

test('primary registration replacement with identical bytes revokes its previously observed physical generation', async (t) => {
  const f = await createPrimaryAuthorityFixture(t),
    api = await import('../../src/config/primary-authority.mjs');
  const previous = await api.resolvePrimaryAuthority({ cwd: f.root });
  const bytes = readFileSync(f.registrationPath);
  await replaceProtectedFixtureFile(f.registrationPath, bytes);
  const current = await api.resolvePrimaryAuthority({ cwd: f.root });
  assert.equal(previous.activationDigest, current.activationDigest);
  assert.throws(
    () => api.assertPrimaryAuthorityUnchanged(previous),
    /snapshot|generation|authority/i
  );
  assert.throws(() => api.assertPrimaryAuthorityUnchanged({ ...current }), {
    code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
  });
  assert.equal(api.assertPrimaryAuthorityUnchanged(current), current);
  await assert.rejects(
    api.assertPrimaryAuthorityGeneration(previous, current),
    /generation|authenticated|authority/i
  );
  assert.deepEqual(readFileSync(f.registrationPath), bytes);
});

test(
  'primary authority uses stock Git rather than a caller PATH substitute',
  { skip: process.platform === 'win32' },
  async (t) => {
    const f = await createPrimaryAuthorityFixture(t);
    writeFileSync(path.join(f.root, 'git'), '#!/bin/sh\nexit 77\n', { mode: 0o700 });
    const previousPath = process.env.PATH;
    process.env.PATH = f.root;
    t.after(() => {
      process.env.PATH = previousPath;
    });
    const observed = await resolvePrimaryAuthority({ cwd: f.linked });
    assert.equal(observed.root, f.root);
    assert.deepEqual(observed.ownedBlobs, f.record.owned_blobs);
  }
);

test('source manifest check refuses extra rows and newly reachable modules without repairing evidence', async (t) => {
  const { generateProcessSourceContract } =
    await import('../../scripts/generate-process-source-contract.mjs');
  const f = consumerFixture(
    t,
    {
      'src/protocol/process-source-assurance.mjs': 'export const parser=1;',
      'schemas/process-source-class-v1.json': '{}',
      'src/new-source.mjs': 'export const source=2;',
    },
    { entries: ['src/protocol/process-source-assurance.mjs'] }
  );
  generateProcessSourceContract({ root: f.root });
  const file = path.join(f.root, 'src/protocol/process-source-contract-files.json');
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  writeFileSync(
    file,
    JSON.stringify({ ...manifest, files: [...manifest.files, 'src/new-source.mjs'].sort() })
  );
  const extra = readFileSync(file, 'utf8');
  assert.throws(
    () => generateProcessSourceContract({ root: f.root, check: true }),
    /stale|closure/i
  );
  assert.equal(readFileSync(file, 'utf8'), extra);
  writeFileSync(file, JSON.stringify(manifest));
  writeFileSync(
    path.join(f.root, 'src/protocol/process-source-assurance.mjs'),
    "import '../new-source.mjs';export const parser=1;"
  );
  const before = readFileSync(file, 'utf8');
  assert.throws(
    () => generateProcessSourceContract({ root: f.root, check: true }),
    /stale|closure/i
  );
  assert.equal(readFileSync(file, 'utf8'), before);
  assert.ok(
    generateProcessSourceContract({ root: f.root }).manifest.files.includes('src/new-source.mjs')
  );
});

for (const observation of ['selection', 'primary']) {
  test(
    '[#187] final ' + observation + ' observation rejects replacement during its last awaited work',
    { skip: process.platform === 'win32' && observation === 'primary' },
    () => {
      const result = spawnSync(
        process.execPath,
        [
          fileURLToPath(new URL('../helpers/authority-final-observation.mjs', import.meta.url)),
          observation,
        ],
        { encoding: 'utf8' }
      );
      assert.equal(result.error, undefined);
      assert.equal(result.status, 0, result.stdout + result.stderr);
    }
  );
}

test('[#187] failed selection descriptor cleanup remains retryable and preserves its original error', async () => {
  const { createAuthorityReadCleanupCore } = await import('../../src/startup/authority-fence.mjs');
  assert.equal(typeof createAuthorityReadCleanupCore, 'function');
  const cleanup = createAuthorityReadCleanupCore();
  const original = new Error('original-read-failure');
  let closes = 0;
  const guard = {
    async close() {
      if (++closes === 1) throw new Error('held-descriptor');
    },
  };
  await assert.rejects(
    cleanup.close(guard, original),
    (error) => error === original && error.cause.message === 'held-descriptor'
  );
  await cleanup.retry();
  await cleanup.retry();
  assert.equal(closes, 2);
  assert.equal(cleanup.verified, false);
});

test('[#187] private nested admission lineage requires the same context and primary generation', async () => {
  const { createAdmissionLineageCore } = await import('../../src/startup/authority-fence.mjs');
  assert.equal(typeof createAdmissionLineageCore, 'function');
  const lineage = createAdmissionLineageCore();
  const parent = {},
    child = {},
    foreign = {},
    copied = {};
  const context = {},
    primary = {};
  lineage.bind(parent, { context, primary });
  lineage.bind(child, { context, primary, parent });
  lineage.bind(foreign, { context, primary });
  assert.equal(lineage.same(parent, child), true);
  assert.equal(lineage.same(parent, foreign), false);
  assert.equal(lineage.same(parent, copied), false);
  for (const binding of [
    { context: {}, primary, parent },
    { context, primary: {}, parent },
  ]) {
    const changed = {};
    lineage.bind(changed, binding);
    assert.equal(lineage.same(parent, changed), false);
  }
  assert.equal(lineage.verified, false);
});

test('[#187] registration retains its genuine protected directory through publication read-back', async (t) => {
  const { createRequire, syncBuiltinESMExports } = await import('node:module');
  const fsPromises = createRequire(import.meta.url)('node:fs/promises');
  const originalOpen = fsPromises.open;
  const f = runtimeFixture(t);
  const directory = path.join(
    f.home,
    process.platform === 'win32' ? 'AppData/Local/ai-peer-review' : '.config/ai-peer-review'
  );
  const locator = path.join(directory, 'runtime-selection.json');
  const retained = new Set(),
    observed = [];
  fsPromises.open = async function (target, ...args) {
    const caller = new Error().stack.split('\n')[2] ?? '';
    const handle = await originalOpen(target, ...args);
    if (target === directory && /at (?:async )?openProtectedRoot\b/.test(caller)) {
      retained.add(handle);
      const close = handle.close.bind(handle);
      handle.close = async () => {
        await close();
        retained.delete(handle);
      };
    }
    return handle;
  };
  syncBuiltinESMExports();
  t.after(() => {
    fsPromises.open = originalOpen;
    syncBuiltinESMExports();
  });
  const store = createSelectionStore({
    packageRoot: f.packageRoot,
    account: () => {
      if (existsSync(locator)) observed.push(retained.size);
      return f.account();
    },
  });
  await store.register();
  assert.ok(observed.length >= 1);
  assert.ok(
    observed.every((count) => count === 1),
    JSON.stringify(observed)
  );
  assert.equal(retained.size, 0);
});

test('[#187] registration refuses a locator replacement during final guarded cleanup', async (t) => {
  const { createRequire, syncBuiltinESMExports } = await import('node:module');
  const fsPromises = createRequire(import.meta.url)('node:fs/promises');
  const originalOpen = fsPromises.open;
  const f = runtimeFixture(t);
  const directory = path.join(
    f.home,
    process.platform === 'win32' ? 'AppData/Local/ai-peer-review' : '.config/ai-peer-review'
  );
  const locator = path.join(directory, 'runtime-selection.json');
  let replaced = false;
  fsPromises.open = async function (target, ...args) {
    const caller = new Error().stack.split('\n')[2] ?? '';
    const handle = await originalOpen(target, ...args);
    if (target === directory && /at (?:async )?openProtectedRoot\b/.test(caller)) {
      const close = handle.close.bind(handle);
      handle.close = async () => {
        await close();
        if (existsSync(locator) && !replaced) {
          const bytes = readFileSync(locator);
          renameSync(locator, locator + '.original');
          writeFileSync(locator, bytes, { flag: 'wx', mode: 0o600 });
          replaced = true;
        }
      };
    }
    return handle;
  };
  syncBuiltinESMExports();
  t.after(() => {
    fsPromises.open = originalOpen;
    syncBuiltinESMExports();
  });
  const store = createSelectionStore({ packageRoot: f.packageRoot, account: f.account });
  await assert.rejects(store.register(), { code: 'APR_RUNTIME_CHANGED' });
  assert.equal(replaced, true);
  assert.deepEqual(readFileSync(locator), readFileSync(locator + '.original'));
});

test('[#187] an existing registration reads and updates through one retained genuine directory', async (t) => {
  const { createRequire, syncBuiltinESMExports } = await import('node:module');
  const fsPromises = createRequire(import.meta.url)('node:fs/promises');
  const originalOpen = fsPromises.open;
  const first = runtimeFixture(t),
    next = runtimeFixture(t);
  await createSelectionStore({ packageRoot: first.packageRoot, account: first.account }).register();
  const directory = path.join(
    first.home,
    process.platform === 'win32' ? 'AppData/Local/ai-peer-review' : '.config/ai-peer-review'
  );
  let opened = 0;
  fsPromises.open = async function (target, ...args) {
    const caller = new Error().stack.split('\n')[2] ?? '';
    if (target === directory && /at (?:async )?openProtectedRoot\b/.test(caller)) opened++;
    return originalOpen(target, ...args);
  };
  syncBuiltinESMExports();
  t.after(() => {
    fsPromises.open = originalOpen;
    syncBuiltinESMExports();
  });
  const store = createSelectionStore({ packageRoot: next.packageRoot, account: first.account });
  const selected = await store.register({ update: true });
  assert.equal(selected.package_root, next.packageRoot);
  assert.equal(opened, 1, 'initial read, update and read-back retain one genuine guard');
});

import { primaryAdmissionContext } from '../../src/config/primary-admission.mjs';
test('copied primary admission fields cannot provide a provider operation context', async () => {
  await assert.rejects(
    primaryAdmissionContext({ root: '/copied', resource: 'primary-admission', verified: true }),
    { code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE' }
  );
});
