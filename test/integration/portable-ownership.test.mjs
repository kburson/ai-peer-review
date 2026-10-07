// @story #178
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, open, readFile, lstat, unlink, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { createOwnerLifecycleCore } from '../../src/broker/owner-lifecycle-core.mjs';
import { createLoopbackServer } from '../../src/broker/http-server.mjs';
import { observeLoopbackOwnerCore } from '../../src/broker/owner-connection.mjs';
import { isPortableBrokerOwner } from '../../src/broker/portable-owner-lifecycle.mjs';

async function moduleOrMissing(file) {
  try {
    return await import(file);
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && error.url?.endsWith(file.split('/').at(-1)))
      return {};
    throw error;
  }
}
const core = await moduleOrMissing('../../src/broker/portable-ownership-core.mjs');
const production = await moduleOrMissing('../../src/broker/portable-ownership.mjs');
const budget = () => ({
  signal: new AbortController().signal,
  deadline: performance.now() + 30000,
});
const exists = async (file) => {
  try {
    await lstat(file);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
};

// Explicitly unverified protocol ports own real descriptors and loopback sockets.
// They cannot mint any production capability or source-class admission.
async function transactionFixture(t, options = {}) {
  const root =
    options.root ??
    (options.workspace
      ? path.join(options.workspace, '.scratch', 'peer-review', 'transaction-fixture')
      : await mkdtemp(path.join(tmpdir(), 'apr-owner-transaction-178-')));
  if (!options.workspace && !options.root)
    t.after(() => rm(root, { recursive: true, force: true }));
  const privateRoot = path.join(root, 'private'),
    runtimeRoot = path.join(root, 'runtime');
  await mkdir(privateRoot, { mode: 0o700, recursive: true });
  await mkdir(runtimeRoot, { mode: 0o700, recursive: true });
  const held = new Map();
  t.after(async () => {
    for (const value of held.values()) await value.file.close().catch(() => {});
  });
  const make = async (name, bytes, base = privateRoot) => {
    const location = path.join(base, name),
      file = await open(location, 'wx+', 0o600);
    await file.writeFile(bytes);
    await file.sync();
    const original = await file.stat({ bigint: true }),
      fd = file.fd;
    const entry = { file, original, fd, location, bytes: Buffer.from(bytes), name };
    held.set(name, entry);
    return {
      async verify() {
        const current = await lstat(location, { bigint: true }),
          retained = await file.stat({ bigint: true });
        assert.equal(file.fd, fd);
        assert.equal(retained.ino, original.ino);
        assert.equal(retained.dev, original.dev);
        assert.equal(current.ino, original.ino);
        assert.equal(current.dev, original.dev);
        assert.ok((await readFile(location)).equals(entry.bytes));
        return true;
      },
      async withdraw() {
        await this.verify();
        await unlink(location);
      },
      close: () => file.close(),
      retainedGeneration: () => ({
        name,
        root: base,
        identity: original.dev + ':' + original.ino,
        outcome: file.fd < 0 ? 'closed' : 'retained',
      }),
    };
  };
  const snapshot = async (name, base = privateRoot) => {
    const location = path.join(base, name);
    try {
      const stat = await lstat(location, { bigint: true });
      return {
        name,
        root: base,
        identity: stat.dev + ':' + stat.ino,
        fileVersion: [stat.size, stat.mtimeNs, stat.ctimeNs].map(String).join(':'),
        bytes: await readFile(location),
        location,
      };
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  };
  const readState = async () => {
    const owner = await snapshot('fixture-owner'),
      credential = await snapshot('fixture-credential'),
      endpoint = await snapshot('endpoint.json', runtimeRoot);
    let original = null;
    if (owner) {
      try {
        original = JSON.parse(owner.bytes).identity;
      } catch {}
    }
    return { owner, credential, endpoint, original };
  };
  const quarantineRecords = [];
  const startup = budget();
  let slot, candidate, server, channel, endpoint;
  t.after(async () => {
    await channel?.close(startup).catch(() => {});
    await server?.close();
  });
  const ports = {
    async elect(context) {
      assert.equal(context.signal, startup.signal);
      assert.equal(context.deadline, startup.deadline);
      slot = await make('fixture-slot', Buffer.from('one original slot'));
      return {
        kind: 'won',
        verified: false,
        lease: {
          assert: () => slot.verify(),
          retainedGeneration: slot.retainedGeneration,
          async release() {
            await channel?.close(startup);
            await server?.close();
            for (const entry of held.values()) if (entry.quarantine) await entry.file.close();
            await slot.withdraw();
            await slot.close();
            return { status: 'withdrawn', obligations: [] };
          },
        },
      };
    },
    readState,
    async observeProcess() {
      throw new Error('No original owner to observe in this schedule');
    },
    async observeEndpoint() {
      return { kind: 'absent', verified: false };
    },
    async reconcile() {
      return { status: 'clear', verified: false, outstandingObligations: [] };
    },
    async quarantine(state) {
      const { rename } = await import('node:fs/promises');
      const receipts = [];
      for (const original of [state.owner, state.credential, state.endpoint].filter(Boolean)) {
        const current = await snapshot(original.name, original.root);
        if (
          !current ||
          current.identity !== original.identity ||
          current.fileVersion !== original.fileVersion ||
          !current.bytes.equals(original.bytes)
        )
          throw Object.assign(new Error('changed generation'), {
            details: { reason: 'owner-generation-changed' },
          });
        const destination = path.join(
          original.root,
          'quarantine-' + randomBytes(8).toString('hex') + '-' + original.name
        );
        await rename(original.location, destination);
        const moved = await lstat(destination, { bigint: true });
        assert.equal(moved.dev + ':' + moved.ino, original.identity);
        const entry = held.get(original.name);
        held.delete(original.name);
        entry.quarantine = destination;
        held.set(destination, entry);
        quarantineRecords.push(destination);
        receipts.push({
          name: original.name,
          originalLocator: original.location,
          quarantineLocator: destination,
          identity: original.identity,
          bytes: Buffer.from(original.bytes),
        });
      }
      return { status: 'quarantined', verified: false, receipts };
    },
    async create(context, lease) {
      assert.equal(await exists(path.join(runtimeRoot, 'endpoint.json')), false);
      const bytes = Buffer.from('exact test-owned owner generation');
      const credentialBytes = randomBytes(32);
      candidate = {
        owner: await make('fixture-owner', bytes),
        credential: await make('fixture-credential', credentialBytes),
        lease,
        ownerVersion: createHash('sha256').update(bytes).digest('hex'),
        binding: {
          credential: credentialBytes.toString('hex'),
          instanceId: 'b'.repeat(64),
          worktree: createHash('sha256').update(path.resolve(root)).digest('hex'),
        },
      };
      assert.equal(context.signal, startup.signal);
      return candidate;
    },
    async ready(value, context) {
      server = await createLoopbackServer({
        binding: { ...value.binding, ownerVersion: value.ownerVersion },
        dispatch: async (request) => ({
          schema: 'ai-peer-review.response/v1',
          ok: true,
          mutation_occurred: false,
          retry_safe: true,
          next_action: null,
          result: { operation: request.operation },
          error: null,
        }),
      });
      endpoint = { host: '127.0.0.1', port: server.port };
      const expected = {
        instanceId: value.binding.instanceId,
        worktree: value.binding.worktree,
        ownerVersion: value.ownerVersion,
      };
      const observed = await observeLoopbackOwnerCore({
        endpoint,
        privateBinding: { ...value.binding, ownerVersion: value.ownerVersion },
        expected,
        ...context,
      });
      assert.equal(observed.kind, 'core-live');
      assert.equal(observed.verified, false);
      channel = observed.connection;
      const response = await channel.request({ operation: 'status', body: {}, ...context });
      assert.equal(response.result.operation, 'status');
      return { channel, endpoint };
    },
    async publishEndpoint(value, ready, context) {
      assert.equal(ready.channel, channel);
      value.endpoint = await make(
        'endpoint.json',
        Buffer.from(JSON.stringify(ready.endpoint)),
        runtimeRoot
      );
      assert.equal(context.deadline, startup.deadline);
    },
    async lifecycle(value) {
      return createOwnerLifecycleCore({
        budget: startup,
        ports: {
          publication: value.owner,
          credential: value.credential,
          endpoint: value.endpoint,
          lease: value.lease,
          source: { observe: async () => true },
          ready: {
            verify: async (context) =>
              (await channel.request({ operation: 'status', body: {}, ...context })).ok === true,
          },
        },
      });
    },
    outstandingObligations: () =>
      [...held.values()]
        .filter((x) => x.file.fd >= 0)
        .map((x) => ({
          name: x.name,
          root: path.dirname(x.location),
          identity: x.original.dev + ':' + x.original.ino,
          outcome: 'retained',
        })),
  };
  return {
    root,
    privateRoot,
    runtimeRoot,
    readyEndpoint: () => endpoint,
    closeReady: async () => {
      await channel?.close(startup);
      await server?.close();
    },
    held,
    startup,
    ports,
    async seed(identity) {
      const bytes = Buffer.from(JSON.stringify({ identity }));
      await make('fixture-owner', bytes);
      return { ...held.get('fixture-owner'), identity };
    },
    quarantines: async () => [...quarantineRecords],
    ownerExists: () => exists(path.join(privateRoot, 'fixture-owner')),
    endpointExists: () => exists(path.join(runtimeRoot, 'endpoint.json')),
    candidate: () => candidate,
  };
}

test('unverified exact transaction holds original descriptors and slot through readiness and clean release', async (t) => {
  // Skipping readiness, replacing the retained descriptor, or releasing a slot early must fail.
  assert.equal(
    typeof core.acquirePortableOwnerCore,
    'function',
    'portable transaction core is missing'
  );
  const f = await transactionFixture(t),
    owner = await core.acquirePortableOwnerCore({ ports: f.ports, budget: f.startup });
  assert.equal(owner.verified, false);
  assert.equal(isPortableBrokerOwner(owner), false);
  assert.equal(await f.ownerExists(), true);
  assert.equal(await f.endpointExists(), false);
  await owner.publish();
  assert.equal(await f.endpointExists(), true);
  assert.equal(await owner.verify(), true);
  for (const x of f.held.values()) {
    const stat = await x.file.stat({ bigint: true });
    assert.equal(x.file.fd, x.fd);
    assert.equal(stat.ino, x.original.ino);
  }
  const released = await owner.release();
  assert.equal(released.released, true);
  assert.deepEqual(released.outstandingObligations, []);
  assert.equal(await f.ownerExists(), false);
  assert.equal(await f.endpointExists(), false);
  for (const x of f.held.values()) assert.equal(x.file.fd, -1);
});

test('original-budget-never-renewed before publication readiness', async (t) => {
  assert.equal(
    typeof core.acquirePortableOwnerCore,
    'function',
    'portable transaction core is missing'
  );
  const f = await transactionFixture(t),
    controller = new AbortController();
  f.startup.signal = controller.signal;
  const owner = await core.acquirePortableOwnerCore({ ports: f.ports, budget: f.startup });
  controller.abort();
  await assert.rejects(owner.publish(), (error) => error.code === 'APR_BROKER_STALE');
  assert.equal(await f.endpointExists(), false);
  assert.equal(await f.ownerExists(), true);
  const x = f.held.get('fixture-owner');
  assert.equal(x.file.fd, x.fd);
});

test('copied-capability-refused for a production join before any caller effect', async () => {
  assert.equal(typeof production.joinVerifiedBroker, 'function', 'genuine join factory is missing');
  let called = false;
  await assert.rejects(
    production.joinVerifiedBroker({
      binding: {
        request() {
          called = true;
        },
      },
      ...budget(),
    }),
    (error) => error.code === 'APR_BROKER_STALE'
  );
  assert.equal(called, false);
  assert.equal(production.isAuthenticatedOwnerObservation({ status: 'authenticated-live' }), false);
});

test('invalid original operation budget refuses before election or owner creation', async () => {
  assert.equal(
    typeof core.acquirePortableOwnerCore,
    'function',
    'portable transaction core is missing'
  );
  let effects = 0;
  await assert.rejects(
    core.acquirePortableOwnerCore({
      ports: {
        elect: async () => {
          effects++;
        },
      },
      budget: { signal: new AbortController().signal, deadline: Infinity },
    }),
    (error) => error.code === 'APR_BROKER_STALE'
  );
  assert.equal(effects, 0);
});

test('bounded ownership errors retain exact cleanup locators without private bytes', () => {
  assert.equal(
    typeof production.boundedOwnershipError,
    'function',
    'bounded ownership error mapper is missing'
  );
  const error = production.boundedOwnershipError('generation-changed', {
    obligations: [
      {
        name: 'owner.json',
        identity: '2:7',
        fileVersion: '3:4:5',
        rootIdentity: '2:1',
        alternateName: 'apr-owner-quarantine-existing.json',
        bytes: Buffer.from('private'),
        credential: 'a'.repeat(64),
      },
    ],
    mutationOccurred: true,
  });
  assert.equal(error.code, 'APR_BROKER_STALE');
  const retained = error.details.outstandingObligations[0];
  assert.equal(retained.identity, '2:7');
  assert.equal(retained.alternateName, 'apr-owner-quarantine-existing.json');
  assert.equal(error.details.mutationOccurred, true);
  const publicText = JSON.stringify(error.details);
  assert.equal(publicText.includes('private'), false);
  assert.equal(publicText.includes('a'.repeat(64)), false);
});

async function deadOriginal(t) {
  const { spawn } = await import('node:child_process');
  const { once } = await import('node:events');
  const child = spawn(
    process.execPath,
    ['-e', 'console.log(process.pid);setInterval(()=>{},1000)'],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );
  t.after(() => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  });
  const exit = once(child, 'exit');
  const pid = await new Promise((resolve, reject) => {
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
      if (output.includes('\n')) resolve(Number(output.trim()));
    });
    child.once('error', reject);
  });
  child.kill('SIGKILL');
  await exit;
  return { host: 'test-owned-host', pid, creation: 'test-owned-child-instance' };
}

test('endpoint silence without independent original-process death preserves the old owner', async (t) => {
  const f = await transactionFixture(t),
    old = await f.seed({ host: 'test-owned-host', pid: process.pid });
  f.ports.observeProcess = async () => ({
    status: 'unknown',
    host: old.identity.host,
    pid: old.identity.pid,
  });
  await assert.rejects(
    core.acquirePortableOwnerCore({ ports: f.ports, budget: f.startup }),
    (error) => {
      assert.equal(error.details.reason, 'original-process-death-unproved');
      return true;
    }
  );
  assert.ok((await readFile(old.location)).equals(old.bytes));
  assert.equal(old.file.fd, old.fd);
  assert.deepEqual(await f.quarantines(), []);
});

test('an authenticated reachable endpoint conflicts with original-process death', async (t) => {
  const f = await transactionFixture(t),
    identity = await deadOriginal(t),
    old = await f.seed(identity);
  f.ports.observeProcess = async () => ({
    status: 'dead',
    host: identity.host,
    pid: identity.pid,
    scope: 'original-process-only',
  });
  f.ports.observeEndpoint = async (_state, context) => {
    await f.ports.ready(
      {
        binding: {
          credential: 'a'.repeat(64),
          instanceId: 'b'.repeat(64),
          worktree: 'c'.repeat(64),
        },
        ownerVersion: 'd'.repeat(64),
      },
      context
    );
    return { kind: 'core-live', verified: false };
  };
  await assert.rejects(
    core.acquirePortableOwnerCore({ ports: f.ports, budget: f.startup }),
    (error) => {
      assert.equal(error.details.reason, 'conflicting-owner-evidence');
      return true;
    }
  );
  assert.ok((await readFile(old.location)).equals(old.bytes));
  assert.deepEqual(await f.quarantines(), []);
});

test('unknown reconciliation preserves death-proven generations instead of treating empty cache as clear', async (t) => {
  const f = await transactionFixture(t),
    identity = await deadOriginal(t),
    old = await f.seed(identity);
  f.ports.observeProcess = async () => ({
    status: 'dead',
    host: identity.host,
    pid: identity.pid,
    scope: 'original-process-only',
  });
  f.ports.reconcile = async () => ({
    status: 'unknown',
    outstandingObligations: [{ name: 'registry.json', outcome: 'absence-unproved' }],
  });
  await assert.rejects(
    core.acquirePortableOwnerCore({ ports: f.ports, budget: f.startup }),
    (error) => {
      assert.equal(error.details.reason, 'owner-reconciliation-unproved');
      assert.ok(error.details.outstandingObligations.some((x) => x.name === 'registry.json'));
      return true;
    }
  );
  assert.ok((await readFile(old.location)).equals(old.bytes));
  assert.deepEqual(await f.quarantines(), []);
});

test('exact death and clear unverified reconciliation quarantine old bytes before exclusive new owner creation', async (t) => {
  const f = await transactionFixture(t),
    identity = await deadOriginal(t),
    old = await f.seed(identity);
  f.ports.observeProcess = async () => ({
    status: 'dead',
    host: identity.host,
    pid: identity.pid,
    scope: 'original-process-only',
  });
  const owner = await core.acquirePortableOwnerCore({ ports: f.ports, budget: f.startup });
  const quarantines = await f.quarantines();
  assert.equal(quarantines.length, 1);
  assert.ok((await readFile(quarantines[0])).equals(old.bytes));
  assert.equal(old.file.fd, old.fd);
  const current = await lstat(old.location, { bigint: true });
  assert.notEqual(current.ino, old.original.ino);
  assert.equal(owner.verified, false);
  await owner.publish();
  await owner.release();
  assert.equal(old.file.fd, -1);
  assert.ok((await readFile(quarantines[0])).equals(old.bytes));
});

test('changed-generation-preserved between death proof and quarantine never reaches owner creation', async (t) => {
  const f = await transactionFixture(t),
    identity = await deadOriginal(t),
    old = await f.seed(identity);
  f.ports.observeProcess = async () => ({
    status: 'dead',
    host: identity.host,
    pid: identity.pid,
    scope: 'original-process-only',
  });
  f.ports.reconcile = async () => {
    const { rename } = await import('node:fs/promises');
    const replacement = path.join(path.dirname(old.location), 'newcomer');
    const file = await open(replacement, 'wx', 0o600);
    await file.writeFile('live newcomer');
    await file.sync();
    await file.close();
    await rename(replacement, old.location);
    return { status: 'clear', outstandingObligations: [] };
  };
  await assert.rejects(
    core.acquirePortableOwnerCore({ ports: f.ports, budget: f.startup }),
    (error) => {
      assert.equal(error.details.reason, 'owner-generation-changed');
      return true;
    }
  );
  assert.equal(await readFile(old.location, 'utf8'), 'live newcomer');
  assert.deepEqual(await f.quarantines(), []);
  assert.equal(old.file.fd, old.fd);
  assert.equal(await f.endpointExists(), false);
});

test('cleanup-obligation-retained after own slot publication and refused fresh reconciliation', async (t) => {
  const f = await transactionFixture(t);
  f.ports.reconcile = async () => ({ status: 'unknown', outstandingObligations: [] });
  await assert.rejects(
    core.acquirePortableOwnerCore({ ports: f.ports, budget: f.startup }),
    (error) => {
      assert.equal(error.details.mutationOccurred, true);
      assert.ok(error.details.outstandingObligations.some((x) => x.name === 'fixture-slot'));
      return true;
    }
  );
  assert.equal(f.held.get('fixture-slot').file.fd, f.held.get('fixture-slot').fd);
  assert.equal(await f.ownerExists(), false);
});

test('missing state fields are uncertainty rather than authoritative absence', async (t) => {
  const f = await transactionFixture(t);
  f.ports.readState = async () => ({});
  await assert.rejects(
    core.acquirePortableOwnerCore({ ports: f.ports, budget: f.startup }),
    (error) => error.code === 'APR_BROKER_STALE'
  );
  assert.equal(await f.ownerExists(), false);
});

async function protectedCredential(t) {
  const storage = await import('../../src/broker/storage-protection.mjs');
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'apr-private-read-178-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const context = budget(),
    privateRoot = path.join(root, 'private');
  const receipt = await storage.provisionProtectedRoot({ root: privateRoot, ...context });
  const guard = await storage.openProtectedRoot({ receipt, ...context });
  t.after(() => guard.close());
  await guard.writeExclusive('fixture-secret', Buffer.alloc(32, 7));
  const { rename } = await import('node:fs/promises');
  await rename(path.join(privateRoot, 'fixture-secret'), path.join(privateRoot, 'credential'));
  return { storage, guard, context, receipt, root: privateRoot };
}

test('genuine protected credential observation reads an existing file without owner write authority', async (t) => {
  const f = await protectedCredential(t);
  assert.equal(
    typeof f.storage.observeProtectedCredential,
    'function',
    'protected existing credential producer is missing'
  );
  const observer = await f.storage.observeProtectedCredential({ guard: f.guard, ...f.context });
  t.after(() => observer.close(f.context));
  assert.equal(f.storage.isProtectedCredentialObservation(observer), true);
  assert.equal(f.storage.isProtectedCredentialObservation({ ...observer }), false);
  assert.equal(f.storage.isHeldPrivatePublication(observer), false);
  assert.equal(await observer.verify(f.context), true);
  assert.ok((await observer.snapshot(f.context)).bytes.equals(Buffer.alloc(32, 7)));
  const before = observer.retainedGeneration();
  assert.equal(before.name, 'credential');
  await assert.rejects(
    observer.snapshot({ ...f.context, signal: new AbortController().signal }),
    (error) => error.code === 'APR_BROKER_STALE'
  );
  await observer.close(f.context);
  assert.equal(f.storage.isProtectedCredentialObservation(observer), false);
  assert.equal((await readFile(path.join(f.root, 'credential'))).length, 32);
});

test('protected existing credential rechecks actual generation and preserves substitution without mutation', async (t) => {
  const f = await protectedCredential(t);
  assert.equal(
    typeof f.storage.observeProtectedCredential,
    'function',
    'protected existing credential producer is missing'
  );
  const observer = await f.storage.observeProtectedCredential({ guard: f.guard, ...f.context });
  t.after(() => observer.close(f.context));
  const file = await open(path.join(f.root, 'credential'), 'r+');
  await file.write(Buffer.alloc(32, 9), 0, 32, 0);
  await file.sync();
  await file.close();
  await assert.rejects(observer.snapshot(f.context), (error) => {
    assert.equal(error.code, 'APR_BROKER_STALE');
    assert.ok(Array.isArray(error.details.obligations));
    return true;
  });
  assert.ok((await readFile(path.join(f.root, 'credential'))).equals(Buffer.alloc(32, 9)));
});

test('genuine read-only credential proves the real nonce-bound socket without conferring an owner', async (t) => {
  const f = await protectedCredential(t);
  assert.equal(
    typeof f.storage.observeProtectedCredential,
    'function',
    'protected existing credential producer is missing'
  );
  const observer = await f.storage.observeProtectedCredential({ guard: f.guard, ...f.context });
  t.after(() => observer.close(f.context));
  const server = await createLoopbackServer({
    binding: {
      credential: Buffer.alloc(32, 7).toString('hex'),
      instanceId: 'b'.repeat(64),
      worktree: 'c'.repeat(64),
      ownerVersion: 'd'.repeat(64),
    },
    dispatch: async () => ({ schema: 'ai-peer-review.response/v1', ok: true }),
  });
  t.after(() => server.close());
  const connectionApi = await import('../../src/broker/owner-connection.mjs');
  const observed = await connectionApi.observeLoopbackOwner({
    endpoint: { host: '127.0.0.1', port: server.port },
    privateBinding: observer,
    expected: {
      instanceId: 'b'.repeat(64),
      worktree: 'c'.repeat(64),
      ownerVersion: 'd'.repeat(64),
    },
    ...f.context,
  });
  if (observed.connection) t.after(() => observed.connection.close(f.context));
  assert.equal(observed.kind, 'verified-live');
  assert.equal(connectionApi.isVerifiedOwnerConnection(observed.connection), true);
  assert.equal(isPortableBrokerOwner(observed.connection), false);
  assert.equal(
    (await observed.connection.request({ operation: 'status', body: {}, ...f.context })).ok,
    true
  );
});

test('genuine bound-path inspection refuses copies and a renewed startup budget', async (t) => {
  const f = await protectedCredential(t),
    election = await import('../../src/broker/ownership-election.mjs');
  const runtimeRoot = path.join(path.dirname(f.root), 'runtime');
  const runtime = await f.storage.provisionProtectedRoot({ root: runtimeRoot, ...f.context });
  const paths = await election.bindOwnerElectionPaths({
    receipt: f.receipt,
    effectReceipts: [runtime],
    resource: { kind: 'broker-owner' },
    ...f.context,
  });
  t.after(() => paths.close());
  assert.equal(
    typeof election.inspectOwnerElectionPaths,
    'function',
    'genuine bound-path inspection is missing'
  );
  const view = await election.inspectOwnerElectionPaths({ paths, ...f.context });
  assert.equal(view.privateRoot, f.root);
  assert.equal(view.runtimeRoot, runtimeRoot);
  assert.ok((await view.privateGuard.readSnapshot('credential')).bytes.equals(Buffer.alloc(32, 7)));
  await assert.rejects(
    election.inspectOwnerElectionPaths({ paths: { ...paths }, ...f.context }),
    (error) => error.code === 'APR_BROKER_STALE'
  );
  await assert.rejects(
    election.inspectOwnerElectionPaths({ paths, ...f.context, deadline: f.context.deadline + 1 }),
    (error) => error.code === 'APR_BROKER_STALE'
  );
});

test('production owner observation and acquisition refuse unproved paths without calling reconciliation', async () => {
  assert.equal(
    typeof production.observeAuthenticatedOwner,
    'function',
    'genuine owner observer is missing'
  );
  assert.equal(
    typeof production.acquirePortableOwner,
    'function',
    'genuine owner factory is missing'
  );
  const observed = await production.observeAuthenticatedOwner({ paths: {}, ...budget() });
  assert.equal(observed.status, 'unknown');
  assert.equal(production.isAuthenticatedOwnerObservation(observed), false);
  let effects = 0;
  await assert.rejects(
    production.acquirePortableOwner({
      worktree: '/unverified',
      paths: {},
      protection: {},
      reconcile: () => {
        effects++;
        return true;
      },
      ...budget(),
    }),
    (error) => error.code === 'APR_BROKER_STALE'
  );
  assert.equal(effects, 0);
});

test('actual protected production paths without admitted source classes create no reserved owner files', async (t) => {
  assert.equal(
    typeof production.acquirePortableOwner,
    'function',
    'genuine owner factory is missing'
  );
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'apr-production-owner-178-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const { portableBrokerPaths } = await import('../../src/broker/portable-paths.mjs');
  const storage = await import('../../src/broker/storage-protection.mjs'),
    paths = await portableBrokerPaths({ worktree: root }),
    context = budget();
  const privateReceipt = await storage.provisionProtectedRoot({
    root: paths.privateRoot,
    ...context,
  });
  const runtimeReceipt = await storage.provisionProtectedRoot({
    root: paths.runtimeRoot,
    ...context,
  });
  let callerEffects = 0;
  await assert.rejects(
    production.acquirePortableOwner({
      worktree: root,
      paths,
      protection: { private: privateReceipt, runtime: runtimeReceipt },
      reconcile: () => {
        callerEffects++;
        return true;
      },
      ...context,
    }),
    (error) => {
      assert.equal(error.code, 'APR_BROKER_STALE');
      assert.equal(error.details.reason, 'source-class-unavailable');
      assert.ok(Array.isArray(error.details.outstandingObligations));
      return true;
    }
  );
  assert.equal(callerEffects, 0);
  assert.equal(await exists(path.join(paths.privateRoot, 'owner.json')), false);
  assert.equal(await exists(paths.credential), false);
  assert.equal(await exists(paths.endpoint), false);
});

test('unverified joined client retains actual socket and read descriptor after caller transfer', async (t) => {
  assert.equal(
    typeof core.createJoinedBrokerClientCore,
    'function',
    'joined client protocol core is missing'
  );
  const f = await protectedCredential(t);
  const credential = await f.storage.observeProtectedCredential({ guard: f.guard, ...f.context });
  t.after(() => credential.close(f.context));
  const server = await createLoopbackServer({
    binding: {
      credential: Buffer.alloc(32, 7).toString('hex'),
      instanceId: 'b'.repeat(64),
      worktree: 'c'.repeat(64),
      ownerVersion: 'd'.repeat(64),
    },
    dispatch: async () => ({ schema: 'ai-peer-review.response/v1', ok: true }),
  });
  t.after(() => server.close());
  const observed = await observeLoopbackOwnerCore({
    endpoint: { host: '127.0.0.1', port: server.port },
    privateBinding: {
      credential: Buffer.alloc(32, 7).toString('hex'),
      instanceId: 'b'.repeat(64),
      worktree: 'c'.repeat(64),
      ownerVersion: 'd'.repeat(64),
    },
    expected: {
      instanceId: 'b'.repeat(64),
      worktree: 'c'.repeat(64),
      ownerVersion: 'd'.repeat(64),
    },
    ...f.context,
  });
  assert.equal(observed.kind, 'core-live');
  t.after(() => observed.connection.close(f.context));
  const input = {
    connection: observed.connection,
    credential,
    context: f.context,
    handshake: {
      instance_id: 'b'.repeat(64),
      versions: { package_version: '0.4.0', broker_protocol_version: 1, node_major: 24 },
    },
  };
  const client = core.createJoinedBrokerClientCore(input);
  input.connection = null;
  input.credential = null;
  assert.equal(client.verified, false);
  assert.equal(isPortableBrokerOwner(client), false);
  assert.equal((await client.request({ operation: 'status', body: {}, ...f.context })).ok, true);
  await client.close(f.context);
  assert.equal(f.storage.isProtectedCredentialObservation(credential), false);
  assert.equal((await readFile(path.join(f.root, 'credential'))).length, 32);
  await assert.rejects(
    client.request({ operation: 'status', body: {}, ...f.context }),
    (error) => error.code === 'APR_BROKER_STALE'
  );
});

test('shared unverified owner evidence distinguishes live conflict from independently dead and absent transport', () => {
  assert.equal(
    typeof core.assessOwnerEvidenceCore,
    'function',
    'shared owner evidence decision is missing'
  );
  assert.deepEqual(
    core.assessOwnerEvidenceCore({
      process: { status: 'dead', scope: 'original-process-only' },
      endpoint: { kind: 'verified-live' },
    }),
    { status: 'unknown', reason: 'conflicting-owner-evidence', verified: false }
  );
  assert.deepEqual(
    core.assessOwnerEvidenceCore({
      process: { status: 'dead', scope: 'original-process-only' },
      endpoint: { kind: 'absent' },
    }),
    { status: 'dead', reason: 'original-process-only', verified: false }
  );
  assert.equal(
    core.assessOwnerEvidenceCore({
      process: { status: 'unknown' },
      endpoint: { kind: 'verified-live' },
    }).status,
    'unknown'
  );
});

test('live owner joins through actual C3 election only after exact newcomer slot withdrawal', async (t) => {
  const f = await transactionFixture(t),
    holder = await core.acquirePortableOwnerCore({ ports: f.ports, budget: f.startup });
  await holder.publish();
  const { actualElection } = await import('../helpers/portable-owner-election.mjs');
  const before = (await (await import('node:fs/promises')).readdir(f.privateRoot)).sort();
  const context = budget();
  const privateBinding = { ...f.candidate().binding, ownerVersion: f.candidate().ownerVersion };
  let elected;
  const ports = {
    ...f.ports,
    elect: async (current) => {
      elected = await actualElection(t, {
        root: f.privateRoot,
        budget: current,
        observeOwner: async () => {
          const observed = await observeLoopbackOwnerCore({
            endpoint: f.readyEndpoint(),
            privateBinding,
            expected: {
              instanceId: privateBinding.instanceId,
              worktree: privateBinding.worktree,
              ownerVersion: privateBinding.ownerVersion,
            },
            ...current,
          });
          assert.equal(observed.kind, 'core-live');
          t.after(() => observed.connection.close(current));
          return { status: 'authenticated-live', verified: false, connection: observed.connection };
        },
      });
      return elected;
    },
    join: async (owner, current) => ({
      verified: false,
      request: (options) => owner.connection.request({ ...options, ...current }),
      close: () => owner.connection.close(current),
    }),
  };
  const client = await core.acquirePortableOwnerCore({ ports, budget: context });
  assert.equal(elected.kind, 'owner-live');
  assert.equal(elected.withdrawal.status, 'withdrawn');
  assert.equal(client.verified, false);
  assert.equal(isPortableBrokerOwner(client), false);
  assert.equal((await client.request({ operation: 'status', body: {} })).ok, true);
  assert.deepEqual(
    (await (await import('node:fs/promises')).readdir(f.privateRoot)).sort(),
    before
  );
  await client.close();
  await holder.release();
});

test('two actual bakery transactions serialize the same root and retain only the winning slot', async (t) => {
  const f = await transactionFixture(t),
    { actualElection } = await import('../helpers/portable-owner-election.mjs');
  f.ports.elect = (current) =>
    actualElection(t, { root: f.privateRoot, budget: current, afterWinning: f.closeReady });
  const first = await core.acquirePortableOwnerCore({ ports: f.ports, budget: f.startup });
  await first.publish();
  let secondWon = false;
  const newcomer = await transactionFixture(t, { root: f.root });
  newcomer.ports.elect = (current) =>
    actualElection(t, {
      root: newcomer.privateRoot,
      budget: current,
      afterWinning: newcomer.closeReady,
    });
  const second = core
    .acquirePortableOwnerCore({ ports: newcomer.ports, budget: newcomer.startup })
    .then((owner) => {
      secondWon = true;
      return owner;
    });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(secondWon, false);
  const names = await (await import('node:fs/promises')).readdir(f.privateRoot);
  assert.equal(names.filter((name) => name.startsWith('apr-election-')).length, 2);
  await first.release();
  const next = await second;
  await next.publish();
  await next.release();
  assert.equal(
    (await (await import('node:fs/promises')).readdir(f.privateRoot)).filter((name) =>
      name.startsWith('apr-election-')
    ).length,
    0
  );
});

test('linked worktrees retain distinct real roots, credentials and loopback endpoints', async (t) => {
  const { createRepositoryFixture } = await import('../helpers/repository-fixture.mjs');
  const repository = createRepositoryFixture(t);
  const first = await transactionFixture(t, { workspace: repository.root }),
    second = await transactionFixture(t, { workspace: repository.linked });
  const one = await core.acquirePortableOwnerCore({ ports: first.ports, budget: first.startup }),
    two = await core.acquirePortableOwnerCore({ ports: second.ports, budget: second.startup });
  await one.publish();
  await two.publish();
  assert.notEqual(first.privateRoot, second.privateRoot);
  assert.notEqual(first.readyEndpoint().port, second.readyEndpoint().port);
  assert.notEqual(first.candidate().binding.worktree, second.candidate().binding.worktree);
  assert.notEqual(first.candidate().binding.credential, second.candidate().binding.credential);
  await one.release();
  assert.equal(await second.ownerExists(), true);
  assert.equal(await two.verify(), true);
  await two.release();
});
