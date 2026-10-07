// @story #177
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, open, readFile, unlink, lstat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const stale = (error) => error.code === 'APR_BROKER_STALE';
async function fixture(t) {
  const { createOwnerLifecycleCore } = await import('../../src/broker/owner-lifecycle-core.mjs');
  const root = await mkdtemp(path.join(tmpdir(), 'apr-lifecycle-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  let now = 0;
  const signal = new AbortController().signal;
  const budget = { signal, deadline: 10, clock: () => now };
  const descriptors = [];
  const held = new Map();
  const ports = {};
  for (const name of ['owner', 'credential', 'endpoint', 'slot']) {
    const file = path.join(root, name);
    const descriptor = await open(file, 'wx+', 0o600);
    await descriptor.writeFile(name);
    const original = await descriptor.stat({ bigint: true });
    const originalFd = descriptor.fd;
    held.set(name, { descriptor, original, originalFd });
    let closed = false;
    descriptors.push(descriptor);
    ports[name] = {
      async verify(context) {
        assert.ok(Object.isFrozen(context));
        const retained = await descriptor.stat({ bigint: true });
        assert.equal(descriptor.fd, originalFd);
        assert.equal(retained.ino, original.ino);
        assert.equal(retained.dev, original.dev);
        const current = await lstat(file, { bigint: true });
        assert.equal(current.ino, original.ino);
        assert.equal(await readFile(file, 'utf8'), name);
        return true;
      },
      async withdraw() {
        await unlink(file);
      },
      async close() {
        await descriptor.close();
        closed = true;
      },
      retainedGeneration: () => ({
        name,
        identity: String(original.ino),
        outcome: closed ? 'closed' : 'retained',
      }),
    };
  }
  t.after(async () => {
    for (const descriptor of descriptors) await descriptor.close().catch(() => {});
  });
  let hook = async () => true;
  let ready = async () => true;
  const owner = await createOwnerLifecycleCore({
    budget,
    ports: {
      publication: ports.owner,
      credential: ports.credential,
      endpoint: ports.endpoint,
      source: { observe: (context) => hook(context) },
      ready: { verify: (context) => ready(context) },
      lease: {
        assert: (context) => ports.slot.verify(context),
        async release(context) {
          await ports.slot.withdraw(context);
          await ports.slot.close(context);
          return { status: 'withdrawn', obligations: [] };
        },
        retainedGeneration: ports.slot.retainedGeneration,
      },
    },
  });
  return {
    root,
    held,
    async inspectDescriptors() {
      for (const { descriptor, original, originalFd } of held.values()) {
        assert.ok(originalFd >= 0);
        assert.equal(descriptor.fd, originalFd);
        const stat = await descriptor.stat({ bigint: true });
        assert.equal(stat.ino, original.ino);
        assert.equal(stat.dev, original.dev);
      }
    },
    owner,
    ports,
    signal,
    budget,
    advance: (value) => {
      now = value;
    },
    context: () => ({ signal: new AbortController().signal, deadline: now + 100 }),
    source: (fn) => {
      hook = fn;
    },
    ready: (fn) => {
      ready = fn;
    },
  };
}

test('completed owner retains real slot and descriptor across startup expiry until clean release', async (t) => {
  const fx = await fixture(t);
  await fx.inspectDescriptors();
  await fx.owner.publish();
  await fx.inspectDescriptors();
  const original = await lstat(path.join(fx.root, 'owner'), { bigint: true });
  fx.advance(20);
  await fx.inspectDescriptors();
  assert.equal(await fx.owner.verify(fx.context()), true);
  await fx.inspectDescriptors();
  assert.equal((await lstat(path.join(fx.root, 'owner'), { bigint: true })).ino, original.ino);
  assert.equal(await readFile(path.join(fx.root, 'slot'), 'utf8'), 'slot');
  assert.equal(fx.owner.verified, false);
  const { isPortableBrokerOwner } = await import('../../src/broker/portable-owner-lifecycle.mjs');
  assert.equal(isPortableBrokerOwner(fx.owner), false);
  assert.equal(isPortableBrokerOwner({ ...fx.owner }), false);
  const result = await fx.owner.release(fx.context());
  assert.equal(result.released, true);
  assert.deepEqual(result.outstandingObligations, []);
  for (const { descriptor } of fx.held.values()) {
    assert.equal(descriptor.fd, -1);
    await assert.rejects(descriptor.stat(), { code: 'EBADF' });
  }
  for (const name of ['owner', 'credential', 'endpoint', 'slot'])
    await assert.rejects(lstat(path.join(fx.root, name)), { code: 'ENOENT' });
});

for (const stage of ['source', 'ready']) {
  test('original-budget-never-renewed during ' + stage, async (t) => {
    const fx = await fixture(t);
    fx[stage](async () => {
      fx.advance(11);
      return true;
    });
    await assert.rejects(fx.owner.publish(), stale);
    await assert.rejects(fx.owner.verify(fx.context()), stale);
    await assert.rejects(fx.owner.release(fx.context()), stale);
    assert.equal(await readFile(path.join(fx.root, 'slot'), 'utf8'), 'slot');
  });
}
test('unfinished startup cannot adopt a fresh independent context', async (t) => {
  const fx = await fixture(t);
  await assert.rejects(fx.owner.verify(fx.context()), stale);
  fx.advance(11);
  await assert.rejects(fx.owner.publish(), stale);
});
for (const invalid of [Infinity, NaN, 30001, -1, '100']) {
  test('completed owner refuses invalid independent deadline ' + String(invalid), async (t) => {
    const fx = await fixture(t);
    await fx.owner.publish();
    await assert.rejects(fx.owner.verify({ signal: fx.signal, deadline: invalid }), stale);
    assert.equal(await readFile(path.join(fx.root, 'owner'), 'utf8'), 'owner');
  });
}
test('non-AbortSignal and aborted operation refuse before effects', async (t) => {
  const fx = await fixture(t);
  await fx.owner.publish();
  await assert.rejects(fx.owner.verify({ signal: {}, deadline: 100 }), stale);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(fx.owner.release({ signal: controller.signal, deadline: 100 }), stale);
  assert.equal(await readFile(path.join(fx.root, 'slot'), 'utf8'), 'slot');
});
test('nested renewal refuses even a different owner inside an admitted callback', async (t) => {
  const fx = await fixture(t);
  const other = await fixture(t);
  await fx.owner.publish();
  await other.owner.publish();
  fx.source(async () => {
    await assert.rejects(fx.owner.verify(fx.context()), stale);
    await assert.rejects(other.owner.verify(other.context()), stale);
    return true;
  });
  assert.equal(await fx.owner.verify(fx.context()), true);
});
test('release reserves synchronously before delayed source and forbids overlap', async (t) => {
  const fx = await fixture(t);
  await fx.owner.publish();
  let resume;
  const pending = new Promise((resolve) => {
    resume = resolve;
  });
  fx.source(async () => {
    await pending;
    return true;
  });
  const release = fx.owner.release(fx.context());
  await assert.rejects(fx.owner.verify(fx.context()), stale);
  await assert.rejects(fx.owner.release(fx.context()), stale);
  assert.equal(await readFile(path.join(fx.root, 'owner'), 'utf8'), 'owner');
  resume();
  assert.equal((await release).released, true);
  await assert.rejects(fx.owner.verify(fx.context()), stale);
});
test('changed-generation-preserved and cleanup-obligation-retained', async (t) => {
  const fx = await fixture(t);
  await fx.owner.publish();
  await unlink(path.join(fx.root, 'owner'));
  const replacement = await open(path.join(fx.root, 'owner'), 'wx', 0o600);
  await replacement.writeFile('replacement');
  await replacement.close();
  await assert.rejects(fx.owner.release(fx.context()), (error) => {
    assert.ok(stale(error));
    assert.ok(error.details.outstandingObligations.some((item) => item.name === 'owner'));
    return true;
  });
  assert.equal(await readFile(path.join(fx.root, 'owner'), 'utf8'), 'replacement');
  assert.equal(await readFile(path.join(fx.root, 'slot'), 'utf8'), 'slot');
});
test('copied-capability-refused by every production input without any producer call', async () => {
  const { createPortableOwnerLifecycle, isPortableBrokerOwner } =
    await import('../../src/broker/portable-owner-lifecycle.mjs');
  const fake = {
    verify() {
      assert.fail('untrusted producer called');
    },
  };
  assert.equal(isPortableBrokerOwner(fake), false);
  await assert.rejects(
    createPortableOwnerLifecycle({
      publication: fake,
      credential: fake,
      endpointPublication: fake,
      lease: fake,
      identity: {},
      source: fake,
      connection: fake,
      runtime: {},
      signal: new AbortController().signal,
      deadline: performance.now() + 1000,
    }),
    stale
  );
});

// Denying a port proof may not be laundered into completion.
for (const stage of ['source', 'ready']) {
  test('failed ' + stage + ' proof retains startup files and never completes', async (t) => {
    const fx = await fixture(t);
    fx[stage](async () => false);
    await assert.rejects(fx.owner.publish(), stale);
    await assert.rejects(fx.owner.release(fx.context()), stale);
    assert.equal(await readFile(path.join(fx.root, 'owner'), 'utf8'), 'owner');
  });
}
test('cleanup-obligation-retained after real withdrawal and failed descriptor close', async (t) => {
  const fx = await fixture(t);
  await fx.owner.publish();
  fx.ports.owner.close = async () => {
    throw Object.assign(new Error('close failed'), {
      details: { obligations: [{ name: 'owner', outcome: 'descriptor-close-pending' }] },
    });
  };
  await assert.rejects(fx.owner.release(fx.context()), (error) => {
    assert.ok(stale(error));
    assert.ok(
      error.details.outstandingObligations.some(
        (item) => item.outcome === 'descriptor-close-pending'
      )
    );
    return true;
  });
  await assert.rejects(lstat(path.join(fx.root, 'owner')), { code: 'ENOENT' });
  assert.equal(await readFile(path.join(fx.root, 'slot'), 'utf8'), 'slot');
});
test('expiry during pending verify fences later cleanup without dropping the actual slot', async (t) => {
  const fx = await fixture(t);
  await fx.owner.publish();
  let resume;
  const pause = new Promise((resolve) => {
    resume = resolve;
  });
  fx.source(async () => {
    await pause;
    return true;
  });
  const verify = fx.owner.verify(fx.context());
  fx.advance(101);
  resume();
  await assert.rejects(verify, stale);
  await assert.rejects(fx.owner.release(fx.context()), stale);
  assert.equal(await readFile(path.join(fx.root, 'slot'), 'utf8'), 'slot');
});
test('creation with already expired original budget preserves files and rejects initialization', async (t) => {
  const { createOwnerLifecycleCore } = await import('../../src/broker/owner-lifecycle-core.mjs');
  const fx = await fixture(t);
  fx.advance(11);
  await assert.rejects(
    createOwnerLifecycleCore({
      budget: { ...fx.budget, clock: () => 11 },
      ports: {
        publication: fx.ports.owner,
        endpoint: fx.ports.endpoint,
        source: { observe: async () => true },
        ready: { verify: async () => true },
      },
    }),
    stale
  );
  assert.equal(await readFile(path.join(fx.root, 'owner'), 'utf8'), 'owner');
});

test('process owner facts compare structured creation stamps independent of object or key order', async () => {
  const { sameProcessOwnerFacts } = await import('../../src/broker/owner-lifecycle-core.mjs');
  const observation = {
    host: 'actual-host',
    pid: 42,
    creation: { lower: '1000', upper: '1001' },
    creationSource: {
      classId: 'class',
      contractDigest: 'contract',
      approvalDigest: 'approved',
      precision: 'tick',
    },
  };
  const protectedFacts = {
    pid: 42,
    host: 'actual-host',
    creation: { upper: '1001', lower: '1000' },
    creationSource: {
      approvalDigest: 'approved',
      classId: 'class',
      precision: 'tick',
      contractDigest: 'contract',
    },
  };
  assert.equal(sameProcessOwnerFacts(protectedFacts, observation), true);
  assert.equal(
    sameProcessOwnerFacts(
      { ...protectedFacts, creation: { lower: '1000', upper: '1002' } },
      observation
    ),
    false
  );
  assert.equal(sameProcessOwnerFacts({ ...protectedFacts, pid: 43 }, observation), false);
});

test('genuine foreign inventory with the same package version is not the loaded owner runtime', async (t) => {
  const { runtimeFixture } = await import('../helpers/runtime-selection-fixture.mjs');
  const { writeFileSync } = await import('node:fs');
  const { verifyRuntimeInventorySync, isVerifiedRuntimeInventory } =
    await import('../../src/startup/runtime-inventory.mjs');
  const fx = runtimeFixture(t);
  const metadata = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8')
  );
  writeFileSync(
    path.join(fx.packageRoot, 'package.json'),
    JSON.stringify({
      name: metadata.name,
      version: metadata.version,
      engines: { node: '>=24' },
    })
  );
  fx.seal(); // Test-owned package only, never a process-source admission.
  const runtime = verifyRuntimeInventorySync({ packageRoot: fx.packageRoot });
  assert.equal(isVerifiedRuntimeInventory(runtime), true);
  assert.equal(runtime.packageVersion, metadata.version);
  const { isLoadedOwnerRuntime } = await import('../../src/broker/portable-owner-lifecycle.mjs');
  assert.equal(isLoadedOwnerRuntime(runtime), false);
  assert.equal(isLoadedOwnerRuntime({ ...runtime }), false);
});
test('retained descriptor closed early is fenced despite unchanged pathname and bytes', async (t) => {
  const fx = await fixture(t);
  await fx.owner.publish();
  await fx.ports.owner.close();
  await assert.rejects(fx.owner.verify(fx.context()), stale);
  assert.equal(await readFile(path.join(fx.root, 'owner'), 'utf8'), 'owner');
});
