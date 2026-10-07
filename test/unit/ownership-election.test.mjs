// cspell:words reclaimers
// @story #168
import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdtemp, realpath, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { provisionProtectedRoot } from '../../src/broker/storage-protection.mjs';

const api = await import('../../src/broker/ownership-election.mjs').catch((error) => {
  if (
    error.code === 'ERR_MODULE_NOT_FOUND' &&
    error.url?.endsWith('/src/broker/ownership-election.mjs')
  )
    return {};
  throw error;
});
const identity = (pid) => ({ host: 'fixture-host', pid });
const slot = (id, pid, ticket = null) => ({
  schema: 'ai-peer-review.election-slot/v1',
  resourceKey: 'owner',
  contenderId: id,
  identity: identity(pid),
  choosing: ticket === null,
  ticket,
});
function memoryStore(resourceKey = 'owner', all = new Map()) {
  let sequence = 0;
  const key = (id) => resourceKey + ':' + id;
  const snapshot = (id) => {
    const value = all.get(key(id));
    return value ? { id, record: structuredClone(value.record), version: value.version } : null;
  };
  return {
    all,
    resourceKey,
    async assertBound() {},
    async create(id, record) {
      if (all.has(key(id))) throw Object.assign(new Error('occupied'), { code: 'EEXIST' });
      all.set(key(id), { record: structuredClone(record), version: ++sequence });
      return snapshot(id);
    },
    async read(id) {
      return snapshot(id);
    },
    async list() {
      return [...all.entries()]
        .filter(([k]) => k.startsWith(resourceKey + ':'))
        .map(([k]) => snapshot(k.slice(resourceKey.length + 1)));
    },
    async publish(id, expected, record) {
      if (snapshot(id)?.version !== expected.version)
        throw Object.assign(new Error('generation changed'), { code: 'APR_BROKER_STALE' });
      all.set(key(id), { record: structuredClone(record), version: ++sequence });
      return snapshot(id);
    },
    async remove(id, expected) {
      if (snapshot(id)?.version !== expected.version)
        throw Object.assign(new Error('generation changed'), { code: 'APR_BROKER_STALE' });
      all.delete(key(id));
    },
  };
}
function input(store, id = 'mine', pid = 42, extra = {}) {
  return {
    store,
    resourceKey: store.resourceKey,
    contenderId: id,
    contenderIdentity: identity(pid),
    signal: new AbortController().signal,
    deadline: performance.now() + 1000,
    clock: performance,
    observeProcessIdentity: async ({ pid: observedPid, original }) => ({
      status: 'live',
      host: original.host,
      pid: observedPid,
    }),
    wait: async () => delay(1),
    ...extra,
  };
}

test('choosing is published before enumeration and the held core lease is never production authority', async () => {
  assert.equal(typeof api.acquireOwnerElectionCore, 'function');
  const store = memoryStore();
  const list = store.list;
  store.list = async () => {
    const current = await store.read('mine');
    assert.ok(current);
    return list();
  };
  const out = await api.acquireOwnerElectionCore(input(store));
  assert.equal(out.kind, 'won');
  assert.equal(out.verified, false);
  assert.equal(api.isOwnerElectionLease(out.lease), false);
  assert.equal((await store.read('mine')).record.ticket, '1');
  assert.ok((await store.read('mine')).record.choosing === false);
  await out.lease.release();
  assert.equal(await store.read('mine'), null);
});

test('simultaneous equal-ticket contenders serialize by contender ID and retain the winner slot', async () => {
  assert.equal(typeof api.acquireOwnerElectionCore, 'function');
  const store = memoryStore();
  let count = 0,
    open;
  const barrier = new Promise((resolve) => {
    open = resolve;
  });
  const onTransition = async (name) => {
    if (name === 'choosing-published') {
      count++;
      if (count === 2) open();
      await barrier;
    }
  };
  const first = api.acquireOwnerElectionCore(input(store, 'a', 41, { onTransition }));
  let secondSettled = false;
  const second = api
    .acquireOwnerElectionCore(input(store, 'b', 42, { onTransition }))
    .then((out) => {
      secondSettled = true;
      return out;
    });
  const a = await first;
  assert.equal(a.kind, 'won');
  await delay(5);
  assert.equal(secondSettled, false);
  assert.ok(await store.read('a'));
  assert.ok(await store.read('b'));
  await a.lease.release();
  const b = await second;
  assert.equal(b.kind, 'won');
  await b.lease.release();
  assert.equal(store.all.size, 0);
});

test('numeric tickets use the maximum rather than lexical order', async () => {
  assert.equal(typeof api.acquireOwnerElectionCore, 'function');
  const store = memoryStore();
  await store.create('old-two', slot('old-two', 90, '2'));
  await store.create('old-ten', slot('old-ten', 91, '10'));
  const out = await api.acquireOwnerElectionCore(
    input(store, 'mine', 42, {
      observeProcessIdentity: async ({ pid, original }) => ({
        status: 'dead',
        host: original.host,
        pid,
        scope: 'original-process-only',
      }),
    })
  );
  assert.equal(out.kind, 'won');
  assert.equal((await store.read('mine')).record.ticket, '11');
  assert.equal(await store.read('old-two'), null);
  assert.equal(await store.read('old-ten'), null);
  await out.lease.release();
});

test('unknown chooser blocks without age takeover and withdraws the newcomer', async () => {
  assert.equal(typeof api.acquireOwnerElectionCore, 'function');
  const store = memoryStore();
  await store.create('unknown', slot('unknown', 90));
  const out = await api.acquireOwnerElectionCore(
    input(store, 'mine', 42, {
      observeProcessIdentity: async () => ({
        status: 'unknown',
        reason: 'source-class-unavailable',
      }),
    })
  );
  assert.equal(out.kind, 'indeterminate');
  assert.equal(out.lease, undefined);
  assert.ok(await store.read('unknown'));
  assert.equal(await store.read('mine'), null);
});

test('authenticated owner-live data withdraws its own slot and carries no lease', async () => {
  assert.equal(typeof api.acquireOwnerElectionCore, 'function');
  const store = memoryStore();
  await store.create('owner', slot('owner', 90, '1'));
  const out = await api.acquireOwnerElectionCore(
    input(store, 'mine', 42, {
      observeOwner: async () => ({ status: 'authenticated-live', instanceId: 'fixture-instance' }),
    })
  );
  assert.equal(out.kind, 'owner-live');
  assert.equal(out.verified, false);
  assert.equal(out.lease, undefined);
  assert.equal(await store.read('mine'), null);
  assert.ok(await store.read('owner'));
});

test('owner, exact provider resource and primary admission retain independent slot sets', async () => {
  assert.equal(typeof api.acquireOwnerElectionCore, 'function');
  const all = new Map();
  const stores = ['owner', 'provider-one', 'provider-two', 'primary'].map((key) =>
    memoryStore(key, all)
  );
  const outcomes = await Promise.all(
    stores.map((store, index) => api.acquireOwnerElectionCore(input(store, 'mine', 42 + index)))
  );
  assert.deepEqual(
    outcomes.map((out) => out.kind),
    ['won', 'won', 'won', 'won']
  );
  assert.equal(all.size, 4);
  await outcomes[0].lease.release();
  assert.equal(all.size, 3);
  for (const out of outcomes.slice(1)) await out.lease.release();
  assert.equal(all.size, 0);
});

test('manual effects retain the same held lease and reject nested reacquisition', async () => {
  assert.equal(typeof api.acquireOwnerElectionCore, 'function');
  const store = memoryStore();
  const args = input(store);
  const out = await api.acquireOwnerElectionCore(args);
  const seen = [];
  await out.lease.run(async (budget) => {
    seen.push(budget);
    assert.equal(budget.signal, args.signal);
    assert.equal(budget.deadline, args.deadline);
    const nested = await api.acquireOwnerElectionCore({ ...args, contenderId: 'nested' });
    assert.equal(nested.kind, 'indeterminate');
    assert.equal(nested.reason, 'nested-resource-acquisition');
    assert.equal(await store.read('nested'), null);
    assert.ok(await store.read('mine'));
    seen.push(budget);
  });
  assert.equal(seen[0], seen[1]);
  await out.lease.release();
});

test('Windows safe sharing failures retry at most three total attempts within the original budget', async () => {
  assert.equal(typeof api.acquireOwnerElectionCore, 'function');
  const store = memoryStore();
  let calls = 0;
  const publish = store.publish;
  store.publish = async (...args) => {
    calls++;
    if (calls <= 3) throw Object.assign(new Error('sharing'), { code: 'EBUSY', retrySafe: true });
    return publish(...args);
  };
  const out = await api.acquireOwnerElectionCore(input(store, 'mine', 42, { platform: 'win32' }));
  assert.equal(out.kind, 'indeterminate');
  assert.equal(calls, 3);
  assert.equal(out.lease, undefined);
  assert.equal(await store.read('mine'), null);
});

test('failed own withdrawal is retained as an obligation, never reported removed', async () => {
  assert.equal(typeof api.acquireOwnerElectionCore, 'function');
  const store = memoryStore();
  await store.create('unknown', slot('unknown', 90));
  store.remove = async () => {
    throw Object.assign(new Error('cleanup denied'), { code: 'EACCES' });
  };
  const out = await api.acquireOwnerElectionCore(
    input(store, 'mine', 42, { observeProcessIdentity: async () => ({ status: 'unknown' }) })
  );
  assert.equal(out.kind, 'indeterminate');
  assert.equal(out.withdrawal.status, 'unresolved');
  assert.ok(out.obligations.some((item) => item.contenderId === 'mine'));
  assert.ok(await store.read('mine'));
});

test('production rejects copied path data and fixture observers without writing slots', async (t) => {
  assert.equal(typeof api.acquireOwnerElection, 'function');
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'apr-election-168-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const out = await api.acquireOwnerElection({
    paths: { root, verified: true, resourceKey: 'owner' },
    contenderIdentity: identity(process.pid),
    observeProcessIdentity: async () => ({ status: 'dead', verified: true }),
    signal: new AbortController().signal,
    deadline: performance.now() + 30000,
  });
  assert.equal(out.kind, 'indeterminate');
  assert.equal(out.lease, undefined);
  assert.deepEqual(await readdir(root), []);
  const receipt = await provisionProtectedRoot({ root });
  const paths = await api.bindOwnerElectionPaths({ receipt, resource: { kind: 'broker-owner' } });
  const pending = await api.acquireOwnerElection({
    paths,
    signal: new AbortController().signal,
    deadline: performance.now() + 30000,
  });
  assert.equal(pending.kind, 'indeterminate');
  assert.equal(pending.reason, 'source-class-unavailable');
  assert.deepEqual(await readdir(root), []);
  await paths.close();
});

test('a winning transaction retains its lease before any exact-dead pruning', async () => {
  const store = memoryStore();
  await store.create('dead', slot('dead', 90, '1'));
  let held;
  store.beginWinningTransaction = async (lease, budget) => {
    held = lease;
    assert.equal(budget.deadline, args.deadline);
    await lease.assert();
  };
  const remove = store.remove;
  store.remove = async (id, expected) => {
    if (id === 'dead') {
      assert.ok(held);
      await held.assert();
    }
    return remove(id, expected);
  };
  const args = input(store, 'mine', 42, {
    observeProcessIdentity: async ({ pid, original }) => ({
      status: 'dead',
      host: original.host,
      pid,
      scope: 'original-process-only',
    }),
  });
  const out = await api.acquireOwnerElectionCore(args);
  assert.equal(out.kind, 'won');
  assert.equal(out.lease, held);
  assert.equal(await store.read('dead'), null);
  await out.lease.release();
});

for (const operation of ['create', 'publish'])
  test('uncertain ' + operation + ' retains actual publication obligations', async () => {
    const store = memoryStore();
    const effect = store[operation];
    store[operation] = async (...args) => {
      const snapshot = await effect(...args);
      throw Object.assign(new Error('post-effect failure'), {
        code: 'APR_BROKER_STALE',
        details: {
          reason: 'publication-unconfirmed',
          obligations: [
            {
              name: 'durable-' + operation,
              version: snapshot.version,
              outcome: 'publication-unconfirmed',
            },
          ],
        },
      });
    };
    const out = await api.acquireOwnerElectionCore(input(store));
    assert.equal(out.kind, 'indeterminate');
    assert.equal(out.lease, undefined);
    assert.ok(out.obligations.some((item) => item.name === 'durable-' + operation));
    assert.ok(out.obligations.some((item) => item.contenderId === 'mine'));
    assert.ok(await store.read('mine'));
  });

test('nested acquisition through a second adapter to the same resource is refused', async () => {
  const first = memoryStore();
  const second = memoryStore('owner', first.all);
  const args = input(first);
  const out = await api.acquireOwnerElectionCore(args);
  await out.lease.run(async () => {
    const nested = await api.acquireOwnerElectionCore(input(second, 'nested'));
    assert.equal(nested.reason, 'nested-resource-acquisition');
    assert.equal(await second.read('nested'), null);
  });
  await out.lease.release();
});

for (const mode of ['abort', 'deadline'])
  for (const point of [
    'before-choosing',
    'choosing-published',
    'before-ticket',
    'ticket-published',
    'before-win',
    'waiting',
  ])
    test(
      mode + ' at ' + point + ' never grants a lease or renews the withdrawal budget',
      async () => {
        const store = memoryStore();
        if (point === 'waiting') await store.create('earlier', slot('earlier', 90, '1'));
        const controller = new AbortController();
        let now = 0;
        let triggered = false;
        const args = input(store, 'mine', 42, {
          signal: controller.signal,
          deadline: 100,
          clock: { now: () => now },
          onTransition: async (name, budget) => {
            assert.equal(budget.signal, controller.signal);
            assert.equal(budget.deadline, 100);
            if (name === point) {
              triggered = true;
              if (mode === 'abort') controller.abort();
              else now = 100;
            }
          },
        });
        const out = await api.acquireOwnerElectionCore(args);
        assert.ok(triggered);
        assert.equal(out.kind, 'indeterminate');
        assert.equal(out.lease, undefined);
        if (point === 'before-choosing') assert.equal(await store.read('mine'), null);
        else {
          assert.ok(await store.read('mine'));
          assert.equal(out.withdrawal.status, 'unresolved');
          assert.ok(out.obligations.length);
        }
      }
    );

test('a dead-slot generation replaced by a newcomer is preserved', async () => {
  const store = memoryStore();
  await store.create('dead', slot('dead', 90, '1'));
  const out = await api.acquireOwnerElectionCore(
    input(store, 'mine', 42, {
      observeProcessIdentity: async ({ pid, original }) => ({
        status: 'dead',
        host: original.host,
        pid,
        scope: 'original-process-only',
      }),
      onTransition: async (name) => {
        if (name === 'before-win') {
          const old = await store.read('dead');
          await store.remove('dead', old);
          await store.create('dead', slot('dead', 91, '1'));
        }
      },
    })
  );
  assert.equal(out.kind, 'indeterminate');
  assert.equal(out.reason, 'dead-slot-generation-changed');
  assert.equal((await store.read('dead')).record.identity.pid, 91);
  assert.equal(await store.read('mine'), null);
});

test('wrong original-process scope or host cannot retire a slot', async () => {
  for (const observed of [
    { status: 'dead', host: 'fixture-host', pid: 90, scope: 'process-tree' },
    { status: 'dead', host: 'different-host', pid: 90, scope: 'original-process-only' },
  ]) {
    const store = memoryStore();
    await store.create('blocked', slot('blocked', 90, '1'));
    const out = await api.acquireOwnerElectionCore(
      input(store, 'mine', 42, { observeProcessIdentity: async () => observed })
    );
    assert.equal(out.kind, 'indeterminate');
    assert.ok(await store.read('blocked'));
    assert.equal(await store.read('mine'), null);
  }
});

test('path binding honors an already-aborted original signal', async (t) => {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'apr-election-bind-168-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const receipt = await provisionProtectedRoot({ root });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    api.bindOwnerElectionPaths({
      receipt,
      resource: { kind: 'broker-owner' },
      signal: controller.signal,
      deadline: performance.now() + 30000,
    }),
    { code: 'APR_BROKER_STALE' }
  );
});

test('overlapping protected election and effect roots cannot be bound', async (t) => {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'apr-election-overlap-168-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const receipt = await provisionProtectedRoot({ root });
  const additional = await provisionProtectedRoot({ root: path.join(root, 'nested') });
  await assert.rejects(
    api.bindOwnerElectionPaths({
      receipt,
      resource: { kind: 'broker-owner' },
      effectReceipts: [additional],
    }),
    {
      code: 'APR_BROKER_PATH_INVALID',
    }
  );
});

test('production acquisition requires a finite original startup budget before observation', async (t) => {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'apr-election-budget-168-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const receipt = await provisionProtectedRoot({ root });
  const paths = await api.bindOwnerElectionPaths({ receipt, resource: { kind: 'broker-owner' } });
  t.after(() => paths.close());
  for (const deadline of [undefined, Infinity, performance.now() + 60000]) {
    const out = await api.acquireOwnerElection({
      paths,
      signal: new AbortController().signal,
      deadline,
    });
    assert.equal(out.kind, 'indeterminate');
    assert.equal(out.reason, 'operation-budget-unproved');
    assert.deepEqual(await readdir(root), []);
  }
});

test('a concurrent newcomer keeps its generation while two reclaimers serialize', async () => {
  const store = memoryStore();
  await store.create('crashed', slot('crashed', 90));
  let count = 0,
    open;
  const barrier = new Promise((resolve) => {
    open = resolve;
  });
  const onTransition = async (name) => {
    if (name === 'choosing-published') {
      count++;
      if (count === 3) open();
      await barrier;
    }
  };
  const observeProcessIdentity = async ({ pid, original }) => ({
    status: pid === 90 ? 'dead' : 'live',
    pid,
    host: original.host,
    ...(pid === 90 ? { scope: 'original-process-only' } : {}),
  });
  const runs = ['a', 'b', 'newcomer'].map((id, i) =>
    api.acquireOwnerElectionCore(input(store, id, 41 + i, { onTransition, observeProcessIdentity }))
  );
  const first = await runs[0];
  assert.equal(first.kind, 'won');
  assert.equal(await store.read('crashed'), null);
  assert.ok(await store.read('b'));
  assert.ok(await store.read('newcomer'));
  await first.lease.release();
  const second = await runs[1];
  assert.equal(second.kind, 'won');
  assert.ok(await store.read('newcomer'));
  await second.lease.release();
  const last = await runs[2];
  assert.equal(last.kind, 'won');
  await last.lease.release();
  assert.equal(store.all.size, 0);
});

test('durable choosing survives an actual child crash and a restart preserves unknown before exact fixture death', async (t) => {
  const { spawn } = await import('node:child_process');
  const { once } = await import('node:events');
  const { readFile, unlink } = await import('node:fs/promises');
  const { randomUUID } = await import('node:crypto');
  const storage = await import('../../src/broker/storage-protection.mjs');
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'apr-election-crash-168-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const receipt = await provisionProtectedRoot({ root });
  const key = 'e'.repeat(64),
    deadId = randomUUID(),
    prefix = 'apr-election-' + key + '-';
  const source = new URL('../../src/broker/storage-protection.mjs', import.meta.url).href;
  const program = `import {observeStorageProtection,openProtectedRoot} from ${JSON.stringify(source)};
    const [root,name,key,id]=process.argv.slice(1);
    const receipt=await observeStorageProtection({root});const guard=await openProtectedRoot({receipt});
    const record={schema:'ai-peer-review.election-slot/v1',resourceKey:key,contenderId:id,
      identity:{host:'fixture-host',pid:process.pid},choosing:true,ticket:null};
    await guard.createOwnedPublication(name,Buffer.from(JSON.stringify(record)));
    console.log(JSON.stringify({pid:process.pid}));setInterval(()=>{},1000);`;
  const child = spawn(
    process.execPath,
    ['--input-type=module', '-e', program, root, prefix + deadId + '.json', key, deadId],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  const exited = once(child, 'exit');
  let stderr = '';
  child.stderr.on('data', (bytes) => {
    stderr += bytes;
  });
  t.after(() => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  });
  const ready = await new Promise((resolve, reject) => {
    let output = '';
    child.stdout.on('data', (bytes) => {
      output += bytes;
      if (output.includes('\n')) {
        try {
          resolve(JSON.parse(output));
        } catch (error) {
          reject(error);
        }
      }
    });
    child.once('error', reject);
    child.once('exit', (code) =>
      reject(new Error('chooser ended before publication: ' + code + ' ' + stderr))
    );
  });
  child.kill('SIGKILL');
  await exited;
  const original = await readFile(path.join(root, prefix + deadId + '.json'));
  assert.equal(JSON.parse(original).identity.pid, ready.pid);
  const guard = await storage.openProtectedRoot({ receipt });
  t.after(() => guard.close());
  // This adapter exercises actual persisted storage with explicit fixture process
  // observations. Its foreign unlink is test code, never an operational lease.
  const publications = new Map();
  let held;
  const snapshot = async (id) => {
    try {
      const observed = await guard.readSnapshot(prefix + id + '.json');
      return {
        id,
        record: JSON.parse(observed.bytes),
        version: observed.identity + ':' + observed.fileVersion,
        storage: observed,
      };
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  };
  const store = {
    resourceKey: key,
    assertBound: () => guard.verify(),
    read: snapshot,
    async create(id, record) {
      publications.set(
        id,
        await guard.createOwnedPublication(
          prefix + id + '.json',
          Buffer.from(JSON.stringify(record))
        )
      );
      return snapshot(id);
    },
    async publish(id, expected, record) {
      await publications.get(id).publish(expected.storage, Buffer.from(JSON.stringify(record)));
      return snapshot(id);
    },
    async list() {
      return Promise.all(
        (await guard.listOwnedPublications(prefix)).map((name) =>
          snapshot(name.slice(prefix.length, -5))
        )
      );
    },
    async beginWinningTransaction(lease) {
      held = lease;
      await held.assert();
    },
    async remove(id, expected) {
      if (publications.has(id)) {
        await publications.get(id).withdraw(expected.storage);
        publications.delete(id);
        return;
      }
      await held.assert();
      assert.equal(api.isOwnerElectionLease(held), false);
      const fresh = await snapshot(id);
      assert.equal(fresh.version, expected.version);
      assert.ok(fresh.storage.bytes.equals(expected.storage.bytes));
      await assert.rejects(
        guard.removeRetiredPublication(prefix + id + '.json', expected.storage, held),
        { code: 'APR_BROKER_STALE' }
      );
      await unlink(path.join(root, prefix + id + '.json'));
    },
  };
  const unknown = await api.acquireOwnerElectionCore(
    input(store, randomUUID(), process.pid, {
      deadline: performance.now() + 300000,
      observeProcessIdentity: async () => ({ status: 'unknown' }),
    })
  );
  assert.equal(unknown.kind, 'indeterminate');
  assert.ok((await readFile(path.join(root, prefix + deadId + '.json'))).equals(original));
  assert.deepEqual(await readdir(root), [prefix + deadId + '.json']);
  const known = await api.acquireOwnerElectionCore(
    input(store, randomUUID(), process.pid, {
      deadline: performance.now() + 300000,
      observeProcessIdentity: async ({ pid, original }) => ({
        status: 'dead',
        host: original.host,
        pid,
        scope: 'original-process-only',
      }),
    })
  );
  assert.equal(known.kind, 'won');
  assert.equal(known.verified, false);
  assert.equal(await snapshot(deadId), null);
  assert.equal((await readdir(root)).length, 1);
  await known.lease.release();
  assert.deepEqual(await readdir(root), []);
});

test('an owner authenticated at the winning boundary is joined after exact withdrawal', async () => {
  const store = memoryStore();
  let authenticated = false;
  const out = await api.acquireOwnerElectionCore(
    input(store, 'mine', 42, {
      observeOwner: async () =>
        authenticated ? { status: 'authenticated-live', instanceId: 'late-fixture-owner' } : null,
      onTransition: async (name) => {
        if (name === 'before-win') authenticated = true;
      },
    })
  );
  assert.equal(out.kind, 'owner-live');
  assert.equal(out.lease, undefined);
  assert.equal(await store.read('mine'), null);
});

test('overlapping effects cannot run concurrently through one held transaction', async () => {
  const store = memoryStore();
  const out = await api.acquireOwnerElectionCore(input(store));
  let release, entered;
  const barrier = new Promise((resolve) => {
    release = resolve;
  });
  const ready = new Promise((resolve) => {
    entered = resolve;
  });
  const first = out.lease.run(async () => {
    entered();
    await barrier;
  });
  await ready;
  try {
    await assert.rejects(
      out.lease.run(async () => {}),
      { code: 'APR_BROKER_STALE' }
    );
  } finally {
    release();
    await first;
    await out.lease.release();
  }
});

test('a bounded election refuses excessive slots and keeps every foreign generation', async () => {
  const store = memoryStore();
  for (let index = 0; index < 4096; index++)
    await store.create('foreign-' + index, slot('foreign-' + index, 100 + index, '1'));
  const out = await api.acquireOwnerElectionCore(
    input(store, 'mine', 42, {
      deadline: performance.now() + 30000,
      observeProcessIdentity: async ({ pid, original }) => ({
        status: 'dead',
        host: original.host,
        pid,
        scope: 'original-process-only',
      }),
    })
  );
  assert.equal(out.kind, 'indeterminate');
  assert.equal(out.reason, 'slot-count-unproved');
  assert.equal(await store.read('mine'), null);
  assert.equal(store.all.size, 4096);
});

test('an owner lease cannot be expanded to an unrelated protected effect root', async (t) => {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'apr-election-scope-168-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const receipt = await provisionProtectedRoot({ root: path.join(root, 'private') });
  const unrelated = await provisionProtectedRoot({ root: path.join(root, 'unrelated') });
  await assert.rejects(
    api.bindOwnerElectionPaths({
      receipt,
      resource: { kind: 'broker-owner' },
      effectReceipts: [unrelated],
    }),
    {
      code: 'APR_BROKER_PATH_INVALID',
    }
  );
  const runtime = await provisionProtectedRoot({ root: path.join(root, 'runtime') });
  const bound = await api.bindOwnerElectionPaths({
    receipt,
    resource: { kind: 'broker-owner' },
    effectReceipts: [runtime],
  });
  await bound.close();
  await assert.rejects(
    api.bindOwnerElectionPaths({
      receipt,
      resource: { kind: 'primary-admission' },
      effectReceipts: [runtime],
    }),
    {
      code: 'APR_BROKER_PATH_INVALID',
    }
  );
});

test('an active manual effect keeps its winning slot until the effect completes', async () => {
  const store = memoryStore();
  const out = await api.acquireOwnerElectionCore(input(store));
  let release, entered;
  const barrier = new Promise((resolve) => {
    release = resolve;
  });
  const ready = new Promise((resolve) => {
    entered = resolve;
  });
  const effect = out.lease.run(async () => {
    entered();
    await barrier;
  });
  await ready;
  try {
    await assert.rejects(out.lease.release(), { code: 'APR_BROKER_STALE' });
    assert.ok(await store.read('mine'));
  } finally {
    release();
    await effect;
    await out.lease.release();
  }
});
