import {
  transactionFixture,
  protectedCredential,
  deadOriginal,
} from '../helpers/portable-owner-transaction.mjs';
// @story #178
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, open, readFile, lstat, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
    const { replaceFixtureFile } = await import('../helpers/portable-owner-replacement.mjs');
    const replacement = path.join(path.dirname(old.location), 'newcomer');
    const file = await open(replacement, 'wx', 0o600);
    await file.writeFile('live newcomer');
    await file.sync();
    await file.close();
    await replaceFixtureFile(replacement, old.location, f.startup);
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
  const f = await protectedCredential(t, { runtime: true }),
    election = await import('../../src/broker/ownership-election.mjs');
  const { runtimeRoot, runtimeReceipt: runtime } = f;
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

for (const phase of ['choosing', 'owner', 'quarantine']) {
  test(
    'actual child crash at ' + phase + ' preserves durable generations without new takeover',
    async (t) => {
      const { spawn } = await import('node:child_process'),
        { once } = await import('node:events');
      const root = await realpath(await mkdtemp(path.join(tmpdir(), 'apr-crash-178-')));
      t.after(() => rm(root, { recursive: true, force: true }));
      const child = spawn(
        process.execPath,
        [
          fileURLToPath(new URL('../helpers/portable-owner-crash-child.mjs', import.meta.url)),
          root,
          phase,
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      );
      const exit = once(child, 'exit');
      let stderr = '';
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });
      t.after(() => {
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      });
      const marker = await new Promise((resolve, reject) => {
        let output = '';
        child.stdout.on('data', (chunk) => {
          output += chunk;
          if (output.includes('\n')) {
            try {
              resolve(JSON.parse(output.trim()));
            } catch (error) {
              reject(error);
            }
          }
        });
        child.once('error', reject);
        child.once('exit', () => reject(Error('crash barrier failed ' + stderr)));
      });
      assert.equal(marker.pid, child.pid);
      assert.equal(marker.phase, phase);
      child.kill('SIGKILL');
      await exit;
      const privateRoot = path.join(root, 'private'),
        names = await (await import('node:fs/promises')).readdir(privateRoot);
      if (phase === 'choosing') {
        const slots = names.filter((name) => name.startsWith('apr-election-'));
        assert.equal(slots.length, 1);
        const record = JSON.parse(await readFile(path.join(privateRoot, slots[0]), 'utf8'));
        assert.equal(record.choosing, true);
        assert.equal(record.identity.pid, marker.pid);
      } else if (phase === 'owner') {
        assert.equal(await exists(path.join(privateRoot, 'fixture-owner')), true);
        assert.equal((await readFile(path.join(privateRoot, 'fixture-credential'))).length, 32);
        assert.equal(await exists(path.join(root, 'runtime', 'endpoint.json')), false);
      } else {
        const quarantines = names.filter((name) => name.startsWith('quarantine-'));
        assert.equal(quarantines.length, 1);
        assert.ok(
          JSON.parse(await readFile(path.join(privateRoot, quarantines[0]), 'utf8')).identity.pid >
            0
        );
        assert.equal(await exists(path.join(privateRoot, 'fixture-owner')), false);
        assert.equal(await exists(path.join(privateRoot, 'fixture-credential')), false);
      }
      const before = await Promise.all(
        names.map(async (name) => [
          name,
          (await readFile(path.join(privateRoot, name))).toString('hex'),
        ])
      );
      const restarted = await transactionFixture(t, { root });
      restarted.ports.reconcile = async () => ({
        status: 'unknown',
        outstandingObligations: [{ name: 'prior-crash', outcome: 'reconciliation-unavailable' }],
      });
      if (phase === 'choosing') {
        const { actualElection } = await import('../helpers/portable-owner-election.mjs');
        restarted.ports.elect = (context) =>
          actualElection(t, {
            root: privateRoot,
            budget: { ...context, deadline: context.deadline },
            observeOwner: async () => ({ status: 'unknown' }),
          });
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 30);
        await assert.rejects(
          core.acquirePortableOwnerCore({
            ports: restarted.ports,
            budget: { signal: controller.signal, deadline: performance.now() + 1000 },
          }),
          (error) => error.code === 'APR_BROKER_STALE'
        );
      } else
        await assert.rejects(
          core.acquirePortableOwnerCore({ ports: restarted.ports, budget: restarted.startup }),
          (error) => error.code === 'APR_BROKER_STALE'
        );
      for (const [name, bytes] of before)
        assert.equal((await readFile(path.join(privateRoot, name))).toString('hex'), bytes);
      assert.equal(await exists(path.join(root, 'runtime', 'endpoint.json')), false);
    }
  );
}

test('observation cleanup closes the actual proved socket and preserves a failed retained read descriptor', async (t) => {
  assert.equal(
    typeof core.closeOwnerObservationCore,
    'function',
    'observation cleanup seam is missing'
  );
  const f = await protectedCredential(t),
    credential = await f.storage.observeProtectedCredential({ guard: f.guard, ...f.context });
  t.after(() => credential.close(f.context));
  const binding = {
    credential: Buffer.alloc(32, 7).toString('hex'),
    instanceId: 'b'.repeat(64),
    worktree: 'c'.repeat(64),
    ownerVersion: 'd'.repeat(64),
  };
  const server = await createLoopbackServer({
    binding,
    dispatch: async () => ({ schema: 'ai-peer-review.response/v1', ok: true }),
  });
  t.after(() => server.close());
  const proof = await observeLoopbackOwnerCore({
    endpoint: { host: '127.0.0.1', port: server.port },
    privateBinding: binding,
    expected: {
      instanceId: binding.instanceId,
      worktree: binding.worktree,
      ownerVersion: binding.ownerVersion,
    },
    ...f.context,
  });
  t.after(() => proof.connection.close(f.context));
  const failing = {
    verify: credential.verify,
    retainedGeneration: credential.retainedGeneration,
    close: async () => {
      throw Error('test-owned retained descriptor close failure');
    },
  };
  await assert.rejects(
    core.closeOwnerObservationCore({
      connection: proof.connection,
      credential: failing,
      context: f.context,
    }),
    (error) => {
      assert.equal(error.code, 'APR_BROKER_STALE');
      assert.ok(
        error.details.outstandingObligations.some(
          (item) => item.name === 'credential' && item.root === f.root
        )
      );
      assert.equal(
        JSON.stringify(error.details).includes(Buffer.alloc(32, 7).toString('hex')),
        false
      );
      return true;
    }
  );
  assert.equal(await credential.verify(f.context), true);
  assert.equal(
    (await proof.connection.request({ operation: 'status', body: {}, ...f.context })).ok,
    false
  );
  assert.equal((await readFile(path.join(f.root, 'credential'))).length, 32);
});

test('a new generation after exact quarantine blocks creation and retains old quarantine bytes', async (t) => {
  const f = await transactionFixture(t),
    identity = await deadOriginal(t);
  await f.seed(identity);
  f.ports.observeProcess = async () => ({
    status: 'dead',
    scope: 'original-process-only',
    ...identity,
  });
  const quarantine = f.ports.quarantine;
  f.ports.quarantine = async (state, context) => {
    const result = await quarantine(state, context);
    await f.seed({ host: 'test-owned-host', pid: process.pid, creation: 'new-live-generation' });
    return result;
  };
  await assert.rejects(
    core.acquirePortableOwnerCore({ ports: f.ports, budget: f.startup }),
    (error) =>
      error.details.reason === 'owner-generation-changed' &&
      error.details.outstandingObligations.some((item) => item.quarantineLocator)
  );
  assert.equal(f.candidate(), undefined);
  assert.equal(
    JSON.parse(await readFile(path.join(f.privateRoot, 'fixture-owner'), 'utf8')).identity.pid,
    process.pid
  );
  assert.equal(
    JSON.parse(await readFile((await f.quarantines())[0], 'utf8')).identity.pid,
    identity.pid
  );
});

test('closed owner records bind the selected worktree, versions and nonsecret endpoint digest', async (t) => {
  assert.equal(
    typeof core.inspectOwnerRecordsCore,
    'function',
    'owner record validation is missing'
  );
  const { createHash } = await import('node:crypto'),
    { encodeRequestCanonical } = await import('../../src/api/canonical-json.mjs'),
    { writeFile } = await import('node:fs/promises');
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'apr-records-178-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const worktree = createHash('sha256').update(root).digest('hex'),
    versions = { package_version: '0.4.0', broker_protocol_version: 1, node_major: 24 };
  const owner = {
    schema: 'ai-peer-review.portable-owner/v1',
    instanceId: 'b'.repeat(64),
    worktree,
    identity: {
      host: 'fixture-host',
      pid: process.pid,
      creation: {
        unit: 'linux-ticks:12345678-1234-1234-1234-123456789abc',
        lower: '1000',
        upper: '1001',
      },
      creationSource: {
        classId: 'fixture-class',
        contractDigest: 'sha256:' + 'a'.repeat(64),
        approvalDigest: 'sha256:' + 'c'.repeat(64),
        precision: 'one-tick',
      },
    },
    versions,
  };
  const ownerBytes = Buffer.from(JSON.stringify(owner)),
    ownerVersion = createHash('sha256').update(ownerBytes).digest('hex');
  const subject = {
    instanceId: owner.instanceId,
    worktree,
    ownerVersion,
    host: '127.0.0.1',
    port: 12345,
    versions,
  };
  const endpoint = {
    schema: 'ai-peer-review.portable-endpoint/v1',
    ...subject,
    digest: createHash('sha256').update(encodeRequestCanonical(subject)).digest('hex'),
    heartbeat: Date.now(),
  };
  await writeFile(path.join(root, 'owner.json'), ownerBytes);
  await writeFile(path.join(root, 'credential'), Buffer.alloc(32, 7));
  await writeFile(path.join(root, 'endpoint.json'), JSON.stringify(endpoint));
  const state = {
    owner: { bytes: await readFile(path.join(root, 'owner.json')) },
    credential: { bytes: await readFile(path.join(root, 'credential')) },
    endpoint: { bytes: await readFile(path.join(root, 'endpoint.json')) },
  };
  const result = core.inspectOwnerRecordsCore({ state, worktree, versions });
  assert.equal(result.verified, false);
  assert.equal(result.ownerVersion, ownerVersion);
  for (const changed of [
    { ...endpoint, digest: 'f'.repeat(64) },
    { ...endpoint, heartbeat: Infinity },
    { ...endpoint, versions: { ...versions, node_major: 26 } },
    { ...endpoint, credential: 'leaked' },
    { ...endpoint, instanceId: 'e'.repeat(64) },
  ]) {
    assert.throws(
      () =>
        core.inspectOwnerRecordsCore({
          state: { ...state, endpoint: { bytes: Buffer.from(JSON.stringify(changed)) } },
          worktree,
          versions,
        }),
      (error) => error.code === 'APR_BROKER_STALE'
    );
  }
  assert.throws(
    () => core.inspectOwnerRecordsCore({ state, worktree: 'a'.repeat(64), versions }),
    (error) => error.code === 'APR_BROKER_STALE'
  );
  assert.throws(
    () =>
      core.inspectOwnerRecordsCore({
        state: { ...state, credential: { bytes: Buffer.alloc(31) } },
        worktree,
        versions,
      }),
    (error) => error.code === 'APR_BROKER_STALE'
  );
  assert.throws(
    () =>
      core.inspectOwnerRecordsCore({
        state: {
          ...state,
          owner: {
            bytes: Buffer.from(
              ownerBytes.toString().replace('{"schema":', '{"schema":"duplicate","schema":')
            ),
          },
        },
        worktree,
        versions,
      }),
    (error) => error.code === 'APR_BROKER_STALE'
  );
});

test('genuine path cleanup preserves both actual protected root descriptors when closure fails', async (t) => {
  const f = await protectedCredential(t, { runtime: true }),
    election = await import('../../src/broker/ownership-election.mjs');
  const { runtimeRoot, runtimeReceipt: runtime } = f;
  const fsApi = (await import('node:fs/promises')).default,
    { syncBuiltinESMExports } = await import('node:module'),
    originalOpen = fsApi.open;
  const retained = [];
  let fail = false;
  fsApi.open = async (...args) => {
    const file = await originalOpen(...args);
    if ([f.root, runtimeRoot].includes(String(args[0]))) {
      const close = file.close.bind(file);
      retained.push({ file, close });
      file.close = async () => {
        if (fail) throw Error('fixture root descriptor close failure');
        return close();
      };
    }
    return file;
  };
  syncBuiltinESMExports();
  t.after(async () => {
    fail = false;
    fsApi.open = originalOpen;
    syncBuiltinESMExports();
    for (const entry of retained) await entry.close();
  });
  const paths = await election.bindOwnerElectionPaths({
    receipt: f.receipt,
    effectReceipts: [runtime],
    resource: { kind: 'broker-owner' },
    ...f.context,
  });
  const active = retained.filter((entry) => entry.file.fd >= 0);
  fail = true;
  await assert.rejects(paths.close(), (error) => {
    assert.equal(error.code, 'APR_BROKER_STALE');
    const obligations = error.details.obligations;
    assert.ok(obligations.some((item) => item.root === f.root));
    assert.ok(obligations.some((item) => item.root === runtimeRoot));
    return true;
  });
  assert.equal(active.length, 2);
  assert.ok(active.every((entry) => entry.file.fd >= 0));
});

test('failed real transport shutdown retains owner, endpoint and original slot before namespace withdrawal', async (t) => {
  const f = await transactionFixture(t, {
    transport: async ({ server, channel, context }) => {
      await channel.close(context);
      await server.close();
      throw Object.assign(Error('test-owned unresolved shutdown'), {
        details: {
          reason: 'owner-transport-close-unproved',
          outstandingObligations: [{ name: 'retained-server', outcome: 'shutdown-unproved' }],
        },
      });
    },
  });
  const owner = await core.acquirePortableOwnerCore({ ports: f.ports, budget: f.startup });
  await owner.publish();
  await assert.rejects(
    owner.release(),
    (error) =>
      error.details.reason === 'owner-transport-close-unproved' &&
      error.details.outstandingObligations.some((item) => item.name === 'retained-server')
  );
  assert.equal(await f.ownerExists(), true);
  assert.equal(await f.endpointExists(), true);
  assert.equal(await exists(path.join(f.privateRoot, 'fixture-slot')), true);
  for (const entry of f.held.values()) assert.equal(entry.file.fd, entry.fd);
});

test('readiness server factory refuses unverified or copied publication capabilities', async () => {
  const api = await moduleOrMissing('../../src/broker/owner-readiness.mjs');
  assert.equal(
    typeof api.createPortableOwnerReadiness,
    'function',
    'genuine readiness factory is missing'
  );
  await assert.rejects(
    api.createPortableOwnerReadiness({
      credential: { verified: true, snapshot: async () => ({ bytes: Buffer.alloc(32) }) },
      expected: {
        instanceId: 'b'.repeat(64),
        worktree: 'c'.repeat(64),
        ownerVersion: 'd'.repeat(64),
      },
      ...budget(),
    }),
    (error) => error.code === 'APR_BROKER_STALE'
  );
  assert.equal(api.isPortableOwnerReadiness({ port: 12345 }), false);
  let effects = 0;
  const counterfeit = {
    verified: true,
    retainedGeneration: () => ({ name: 'credential', root: '/caller/private' }),
    snapshot: async () => {
      effects++;
      return { bytes: Buffer.alloc(32) };
    },
    verify: async () => true,
  };
  await assert.rejects(
    api.createPortableOwnerReadiness({
      credential: counterfeit,
      expected: {
        instanceId: 'b'.repeat(64),
        worktree: 'c'.repeat(64),
        ownerVersion: 'd'.repeat(64),
      },
      ...budget(),
    }),
    (error) => error.code === 'APR_BROKER_STALE'
  );
  assert.equal(effects, 0);
});

test('actual guarded reconciliation remains unknown while portable wake and provider producers are unavailable', async (t) => {
  const api = await moduleOrMissing('../../src/broker/portable-reconciliation.mjs');
  assert.equal(
    typeof api.observePortableReconciliation,
    'function',
    'guarded reconciliation observer is missing'
  );
  const f = await protectedCredential(t, {
      runtime: true,
      seeds: [['registry.json', Buffer.from('uncertain private registry')]],
    }),
    election = await import('../../src/broker/ownership-election.mjs');
  const { runtimeReceipt: receipt } = f;
  const paths = await election.bindOwnerElectionPaths({
    receipt: f.receipt,
    effectReceipts: [receipt],
    resource: { kind: 'broker-owner' },
    ...f.context,
  });
  t.after(() => paths.close());
  const observed = await api.observePortableReconciliation({ paths, ...f.context });
  assert.equal(observed.status, 'unknown');
  assert.equal(observed.verified, false);
  assert.ok(
    observed.outstandingObligations.some(
      (item) => item.name === 'registry.json' && item.root === f.root && item.identity
    )
  );
  assert.ok(
    observed.outstandingObligations.some(
      (item) => item.name === 'provider-reconciliation' && item.outcome === 'producer-unavailable'
    )
  );
  assert.equal(JSON.stringify(observed).includes('uncertain private registry'), false);
  assert.equal(
    (await readFile(path.join(f.root, 'registry.json'))).toString(),
    'uncertain private registry'
  );
  await assert.rejects(
    api.observePortableReconciliation({ paths: { ...paths }, ...f.context }),
    (error) => error.code === 'APR_BROKER_STALE'
  );
});

test('failed credential flush retains its actual descriptor and pathname without publishing an endpoint', async (t) => {
  const fsApi = (await import('node:fs/promises')).default,
    { syncBuiltinESMExports } = await import('node:module'),
    actualOpen = fsApi.open,
    retained = [];
  fsApi.open = async (...args) => {
    const file = await actualOpen(...args);
    if (path.basename(String(args[0])) === 'fixture-credential') {
      retained.push(file);
      file.sync = async () => {
        throw Object.assign(Error('test-owned fsync failure'), { code: 'EIO' });
      };
    }
    return file;
  };
  syncBuiltinESMExports();
  t.after(async () => {
    fsApi.open = actualOpen;
    syncBuiltinESMExports();
    for (const file of retained) await file.close();
  });
  const f = await transactionFixture(t);
  await assert.rejects(
    core.acquirePortableOwnerCore({ ports: f.ports, budget: f.startup }),
    (error) =>
      error.code === 'APR_BROKER_STALE' &&
      error.details.outstandingObligations.some(
        (item) => item.name === 'fixture-credential' && item.root === f.privateRoot
      )
  );
  assert.equal(await f.endpointExists(), false);
  assert.equal((await readFile(path.join(f.privateRoot, 'fixture-credential'))).length, 32);
  assert.equal(retained.length, 1);
  assert.ok(retained[0].fd >= 0);
});

test('a failed acknowledgement after real quarantine rename preserves both exact locators', async (t) => {
  const f = await transactionFixture(t),
    identity = await deadOriginal(t);
  await f.seed(identity);
  f.ports.observeProcess = async () => ({
    status: 'dead',
    scope: 'original-process-only',
    ...identity,
  });
  const fsApi = (await import('node:fs/promises')).default,
    { syncBuiltinESMExports } = await import('node:module'),
    actualRename = fsApi.rename;
  let moved;
  fsApi.rename = async (source, target) => {
    const result = await actualRename(source, target);
    if (source === path.join(f.privateRoot, 'fixture-owner')) {
      moved = target;
      throw Object.assign(Error('test-owned post-rename acknowledgement failure'), { code: 'EIO' });
    }
    return result;
  };
  syncBuiltinESMExports();
  t.after(() => {
    fsApi.rename = actualRename;
    syncBuiltinESMExports();
  });
  await assert.rejects(
    core.acquirePortableOwnerCore({ ports: f.ports, budget: f.startup }),
    (error) =>
      error.details.outstandingObligations.some(
        (item) =>
          item.originalLocator === path.join(f.privateRoot, 'fixture-owner') &&
          item.quarantineLocator === moved
      )
  );
  assert.equal(await f.ownerExists(), false);
  assert.equal(JSON.parse(await readFile(moved, 'utf8')).identity.pid, identity.pid);
  assert.equal(f.candidate(), undefined);
  assert.equal(await f.endpointExists(), false);
});

test('two recovery attempts and a live newcomer join the single new real owner without a second replacement', async (t) => {
  const f = await transactionFixture(t),
    identity = await deadOriginal(t);
  await f.seed(identity);
  const { actualElection } = await import('../helpers/portable-owner-election.mjs');
  f.ports.elect = (context) =>
    actualElection(t, { root: f.privateRoot, budget: context, afterWinning: f.closeReady });
  f.ports.observeProcess = async () => ({
    status: 'dead',
    scope: 'original-process-only',
    ...identity,
  });
  let gateOpen, reached;
  const gate = new Promise((resolve) => {
      gateOpen = resolve;
    }),
    quarantined = new Promise((resolve) => {
      reached = resolve;
    });
  const quarantine = f.ports.quarantine;
  f.ports.quarantine = async (...args) => {
    const receipt = await quarantine(...args);
    reached();
    await gate;
    return receipt;
  };
  const acquiring = core.acquirePortableOwnerCore({ ports: f.ports, budget: f.startup });
  await quarantined;
  const contestants = await Promise.all([
    transactionFixture(t, { root: f.root }),
    transactionFixture(t, { root: f.root }),
  ]);
  const barriers = [],
    clients = [];
  for (const contestant of contestants) {
    let ticket;
    barriers.push(
      new Promise((resolve) => {
        ticket = resolve;
      })
    );
    contestant.ports.elect = (current) =>
      actualElection(t, {
        root: f.privateRoot,
        budget: current,
        onTransition: async (phase) => {
          if (phase === 'ticket-published') ticket();
        },
        observeOwner: async () => {
          if (!(await f.endpointExists())) return null;
          const candidate = f.candidate(),
            binding = { ...candidate.binding, ownerVersion: candidate.ownerVersion };
          const proof = await observeLoopbackOwnerCore({
            endpoint: f.readyEndpoint(),
            privateBinding: binding,
            expected: {
              instanceId: binding.instanceId,
              worktree: binding.worktree,
              ownerVersion: binding.ownerVersion,
            },
            ...current,
          });
          if (proof.kind !== 'core-live') return { status: 'unknown' };
          t.after(() => proof.connection.close(current));
          return { status: 'authenticated-live', verified: false, connection: proof.connection };
        },
      });
    contestant.ports.join = async (owner, current) => ({
      verified: false,
      request: (input) => owner.connection.request({ ...input, ...current }),
      close: () => owner.connection.close(current),
    });
    clients.push(
      core.acquirePortableOwnerCore({ ports: contestant.ports, budget: contestant.startup })
    );
  }
  await Promise.all(barriers);
  gateOpen();
  const holder = await acquiring;
  await holder.publish();
  const joined = await Promise.all(clients);
  for (const client of joined) {
    assert.equal(client.verified, false);
    assert.equal((await client.request({ operation: 'status', body: {} })).ok, true);
    await client.close();
  }
  assert.equal((await f.quarantines()).length, 1);
  const names = await (await import('node:fs/promises')).readdir(f.privateRoot);
  assert.equal(names.filter((name) => name.startsWith('apr-election-')).length, 1);
  assert.equal(await f.ownerExists(), true);
  for (const contestant of contestants) assert.equal(contestant.candidate(), undefined);
  await holder.release();
});

test('joined client cleanup still closes a genuine read descriptor when socket close throws synchronously', async (t) => {
  const f = await protectedCredential(t),
    credential = await f.storage.observeProtectedCredential({ guard: f.guard, ...f.context });
  t.after(() => credential.close(f.context));
  const binding = {
    credential: Buffer.alloc(32, 7).toString('hex'),
    instanceId: 'b'.repeat(64),
    worktree: 'c'.repeat(64),
    ownerVersion: 'd'.repeat(64),
  };
  const server = await createLoopbackServer({
    binding,
    dispatch: async () => ({ schema: 'ai-peer-review.response/v1', ok: true }),
  });
  t.after(() => server.close());
  const proof = await observeLoopbackOwnerCore({
    endpoint: { host: '127.0.0.1', port: server.port },
    privateBinding: binding,
    expected: {
      instanceId: binding.instanceId,
      worktree: binding.worktree,
      ownerVersion: binding.ownerVersion,
    },
    ...f.context,
  });
  t.after(() => proof.connection.close(f.context));
  const client = core.createJoinedBrokerClientCore({
    connection: {
      ...proof.connection,
      close() {
        throw Error('test-owned synchronous socket close failure');
      },
    },
    credential,
    context: f.context,
    handshake: { instance_id: binding.instanceId, versions: {} },
  });
  await assert.rejects(
    client.close(f.context),
    (error) =>
      error.code === 'APR_BROKER_STALE' &&
      error.details.outstandingObligations.some((item) => item.name === 'proved-socket')
  );
  assert.equal(f.storage.isProtectedCredentialObservation(credential), false);
  assert.equal((await readFile(path.join(f.root, 'credential'))).length, 32);
});

test('complete genuine protected owner records reach the actual unavailable source producer', async (t) => {
  const { createHash } = await import('node:crypto'),
    { encodeRequestCanonical } = await import('../../src/api/canonical-json.mjs'),
    storage = await import('../../src/broker/storage-protection.mjs'),
    election = await import('../../src/broker/ownership-election.mjs'),
    { portableBrokerPaths } = await import('../../src/broker/portable-paths.mjs'),
    { rename } = await import('node:fs/promises');
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'apr-observer-review-178-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const canonical = await portableBrokerPaths({ worktree: root }),
    setup = { signal: new AbortController().signal, deadline: performance.now() + 180000 };
  const privateReceipt = await storage.provisionProtectedRoot({
      root: canonical.privateRoot,
      ...setup,
    }),
    runtimeReceipt = await storage.provisionProtectedRoot({
      root: canonical.runtimeRoot,
      ...setup,
    });
  const privateSeed = await storage.openProtectedRoot({ receipt: privateReceipt, ...setup }),
    runtimeSeed = await storage.openProtectedRoot({ receipt: runtimeReceipt, ...setup });
  t.after(() => privateSeed.close());
  t.after(() => runtimeSeed.close());
  const versions = {
    package_version: '0.4.0',
    broker_protocol_version: 1,
    node_major: Number(process.versions.node.split('.')[0]),
  };
  const owner = {
      schema: 'ai-peer-review.portable-owner/v1',
      instanceId: 'b'.repeat(64),
      worktree: createHash('sha256').update(root).digest('hex'),
      identity: { host: 'fixture-host', pid: process.pid },
      versions,
    },
    ownerBytes = encodeRequestCanonical(owner),
    ownerVersion = createHash('sha256').update(ownerBytes).digest('hex');
  const subject = {
    instanceId: owner.instanceId,
    worktree: owner.worktree,
    ownerVersion,
    host: '127.0.0.1',
    port: 12345,
    versions,
  };
  const endpoint = {
    schema: 'ai-peer-review.portable-endpoint/v1',
    ...subject,
    digest: createHash('sha256').update(encodeRequestCanonical(subject)).digest('hex'),
    heartbeat: Date.now(),
  };
  for (const [guard, root, name, bytes] of [
    [privateSeed, canonical.privateRoot, 'owner.json', ownerBytes],
    [privateSeed, canonical.privateRoot, 'credential', Buffer.alloc(32, 7)],
    [runtimeSeed, canonical.runtimeRoot, 'endpoint.json', encodeRequestCanonical(endpoint)],
  ]) {
    await guard.writeExclusive('fixture-' + name, bytes);
    await rename(path.join(root, 'fixture-' + name), path.join(root, name));
  }
  await privateSeed.close();
  await runtimeSeed.close();
  const context = budget(),
    paths = await election.bindOwnerElectionPaths({
      receipt: privateReceipt,
      effectReceipts: [runtimeReceipt],
      resource: { kind: 'broker-owner' },
      ...context,
    });
  t.after(() => paths.close());
  const observed = await production.observeAuthenticatedOwner({ paths, ...context });
  assert.equal(observed.status, 'unknown');
  assert.equal(observed.reason, 'source-class-unavailable');
  assert.equal(production.isAuthenticatedOwnerObservation(observed), false);
  assert.ok((await readFile(path.join(canonical.privateRoot, 'owner.json'))).equals(ownerBytes));
});

test('actual C1 snapshot carries protected root and exact original locator for quarantine composition', async (t) => {
  const f = await protectedCredential(t),
    snapshot = await f.guard.readSnapshot('credential');
  assert.equal(snapshot.root, f.root);
  assert.equal(snapshot.location, path.join(f.root, 'credential'));
  const parent = await lstat(path.dirname(f.root), { bigint: true });
  assert.equal(snapshot.parentIdentity, parent.dev + ':' + parent.ino);
  assert.ok(snapshot.bytes.equals(Buffer.alloc(32, 7)));
});

test('read-only election relation refuses an actual unverified core lease and copied producers', async (t) => {
  const api = await import('../../src/broker/ownership-election.mjs');
  assert.equal(
    typeof api.inspectOwnerElectionLease,
    'function',
    'actual elected source relation is missing'
  );
  const f = await transactionFixture(t),
    { actualElection } = await import('../helpers/portable-owner-election.mjs');
  const elected = await actualElection(t, { root: f.privateRoot, budget: f.startup });
  assert.equal(elected.kind, 'won');
  t.after(() => elected.lease.release());
  await assert.rejects(
    api.inspectOwnerElectionLease({ lease: elected.lease, ...f.startup }),
    (error) => error.code === 'APR_BROKER_STALE'
  );
  let effects = 0;
  await assert.rejects(
    api.inspectOwnerElectionLease({
      lease: {
        assert() {
          effects++;
        },
      },
      ...f.startup,
    }),
    (error) => error.code === 'APR_BROKER_STALE'
  );
  assert.equal(effects, 0);
});

test('quarantine root policy binds runtime destinations only to endpoint source generations', async (t) => {
  const api = await import('../../src/broker/ownership-election.mjs');
  assert.equal(
    typeof api.ownerPublicationRootMatchesCore,
    'function',
    'exact quarantine root policy is missing'
  );
  const f = await transactionFixture(t),
    { randomUUID } = await import('node:crypto'),
    name = 'apr-owner-quarantine-' + 'a'.repeat(64) + '-' + randomUUID() + '.json';
  assert.equal(
    api.ownerPublicationRootMatchesCore({
      root: f.runtimeRoot,
      privateRoot: f.privateRoot,
      name,
      quarantineOf: 'endpoint.json',
    }),
    true
  );
  for (const options of [
    { root: f.privateRoot, quarantineOf: 'endpoint.json' },
    { root: f.runtimeRoot, quarantineOf: 'credential' },
    { root: f.runtimeRoot },
    { root: f.privateRoot, quarantineOf: 'unknown' },
  ])
    assert.equal(
      api.ownerPublicationRootMatchesCore({ privateRoot: f.privateRoot, name, ...options }),
      false
    );
  assert.equal(
    api.ownerPublicationRootMatchesCore({
      root: f.runtimeRoot,
      privateRoot: f.privateRoot,
      name: 'credential',
    }),
    false
  );
  assert.equal(api.isOwnerElectionLease({ verified: true }), false);
});

test('completed actual quarantine receipt is retained before a later protection verification fails', async (t) => {
  assert.equal(
    typeof core.retainQuarantineReceiptCore,
    'function',
    'immediate receipt retention is missing'
  );
  const storage = await import('../../src/broker/storage-protection.mjs'),
    { chmod } = await import('node:fs/promises');
  const base = await realpath(await mkdtemp(path.join(tmpdir(), 'apr-q-review-178-')));
  t.after(() => rm(base, { recursive: true, force: true }));
  const root = path.join(base, 'private'),
    context = { signal: new AbortController().signal, deadline: performance.now() + 180000 };
  const receipt = await storage.provisionProtectedRoot({ root, ...context }),
    guard = await storage.openProtectedRoot({ receipt, ...context });
  t.after(() => guard.close());
  await guard.writeExclusive('fixture-owner', Buffer.from('retained old generation'));
  const snapshot = await guard.readSnapshot('fixture-owner');
  const moved = await guard.quarantine('fixture-owner', snapshot, {
    destination: 'fixture-quarantined',
  });
  const records = [];
  core.retainQuarantineReceiptCore({ records, snapshot, receipt: moved, root });
  // A later check can fail; the completed receipt must already be retained.
  if (process.platform !== 'win32') {
    await chmod(root, 0o755);
    await assert.rejects(guard.verify(), (error) => error.code === 'APR_BROKER_STALE');
    await chmod(root, 0o700);
  } else
    await assert.rejects(guard.readSnapshot('missing-proof'), (error) => error.code === 'ENOENT');
  assert.equal(records.length, 1);
  assert.equal(records[0].originalLocator, path.join(root, 'fixture-owner'));
  assert.equal(records[0].quarantineLocator, path.join(root, 'fixture-quarantined'));
  assert.equal(records[0].identity, snapshot.identity);
  assert.equal(records[0].outcome, 'quarantine-verification-pending');
  assert.equal(
    (await readFile(records[0].quarantineLocator)).toString(),
    'retained old generation'
  );
  const error = production.boundedOwnershipError('owner-quarantine-unproved', {
    outstandingObligations: records,
  });
  assert.equal(
    error.details.outstandingObligations[0].quarantineLocator,
    records[0].quarantineLocator
  );
  assert.equal(JSON.stringify(error.details).includes('retained old generation'), false);
});

test('actual verified socket cleanup metadata retains the proved tuple without credential material', async (t) => {
  const api = await import('../../src/broker/owner-connection.mjs');
  assert.equal(
    typeof api.ownerConnectionObligations,
    'function',
    'actual socket obligation producer is missing'
  );
  const f = await protectedCredential(t),
    credential = await f.storage.observeProtectedCredential({ guard: f.guard, ...f.context });
  t.after(() => credential.close(f.context));
  const binding = {
    credential: Buffer.alloc(32, 7).toString('hex'),
    instanceId: 'b'.repeat(64),
    worktree: 'c'.repeat(64),
    ownerVersion: 'd'.repeat(64),
  };
  const server = await createLoopbackServer({
    binding,
    dispatch: async () => ({ schema: 'ai-peer-review.response/v1', ok: true }),
  });
  t.after(() => server.close());
  const proof = await api.observeLoopbackOwner({
    endpoint: { host: '127.0.0.1', port: server.port },
    privateBinding: credential,
    expected: {
      instanceId: binding.instanceId,
      worktree: binding.worktree,
      ownerVersion: binding.ownerVersion,
    },
    ...f.context,
  });
  t.after(() => proof.connection?.close(f.context));
  assert.equal(proof.kind, 'verified-live');
  const obligations = api.ownerConnectionObligations(proof.connection);
  assert.equal(obligations.length, 1);
  assert.equal(obligations[0].remotePort, server.port);
  assert.ok(obligations[0].localPort > 0);
  const error = production.boundedOwnershipError('owner-effect-unproved', {
    outstandingObligations: obligations,
  });
  assert.equal(error.details.outstandingObligations[0].port, server.port);
  assert.equal(error.details.outstandingObligations[0].localPort, obligations[0].localPort);
  assert.equal(JSON.stringify(error.details).includes(binding.credential), false);
  assert.throws(
    () => api.ownerConnectionObligations({ ...proof.connection }),
    (error) => error.code === 'APR_BROKER_STALE'
  );
  await proof.connection.close(f.context);
  assert.deepEqual(api.ownerConnectionObligations(proof.connection), []);
});

test('startup endpoint flush failure retains its actual listening server and socket shutdown obligations', async (t) => {
  assert.equal(
    typeof core.ownerTransactionObligationsCore,
    'function',
    'startup transport obligation aggregation is missing'
  );
  const f = await transactionFixture(t),
    files = f.ports.outstandingObligations;
  f.ports.outstandingObligations = () =>
    core.ownerTransactionObligationsCore({
      files: files(),
      transports: f.readyEndpoint()
        ? [
            { name: 'owner-readiness-server', ...f.readyEndpoint(), outcome: 'shutdown-pending' },
            { name: 'proved-owner-socket', ...f.readyEndpoint(), outcome: 'shutdown-pending' },
          ]
        : [],
    });
  const fsApi = (await import('node:fs/promises')).default,
    { syncBuiltinESMExports } = await import('node:module'),
    actualOpen = fsApi.open;
  fsApi.open = async (...args) => {
    const file = await actualOpen(...args);
    if (path.basename(String(args[0])) === 'endpoint.json')
      file.sync = async () => {
        throw Object.assign(Error('test-owned endpoint fsync failure'), { code: 'EIO' });
      };
    return file;
  };
  syncBuiltinESMExports();
  t.after(() => {
    fsApi.open = actualOpen;
    syncBuiltinESMExports();
  });
  const owner = await core.acquirePortableOwnerCore({ ports: f.ports, budget: f.startup });
  let caught;
  await assert.rejects(owner.publish(), (error) => {
    caught = error;
    return error.code === 'APR_BROKER_STALE';
  });
  const endpoint = f.readyEndpoint();
  for (const name of ['owner-readiness-server', 'proved-owner-socket'])
    assert.ok(
      caught.details.outstandingObligations.some(
        (item) =>
          item.name === name && item.port === endpoint.port && item.outcome === 'shutdown-pending'
      )
    );
  const candidate = f.candidate(),
    binding = { ...candidate.binding, ownerVersion: candidate.ownerVersion };
  const proof = await observeLoopbackOwnerCore({
    endpoint,
    privateBinding: binding,
    expected: {
      instanceId: binding.instanceId,
      worktree: binding.worktree,
      ownerVersion: binding.ownerVersion,
    },
    ...f.startup,
  });
  t.after(() => proof.connection?.close(f.startup));
  assert.equal(proof.kind, 'core-live');
  assert.equal(proof.verified, false);
  assert.equal(
    (await proof.connection.request({ operation: 'status', body: {}, ...f.startup })).ok,
    true
  );
  assert.equal(JSON.stringify(caught.details).includes(binding.credential), false);
});

test('genuine connection rejects a changed credential generation before any bearer dispatch', async (t) => {
  const api = await import('../../src/broker/owner-connection.mjs'),
    { writeFile } = await import('node:fs/promises');
  const f = await protectedCredential(t),
    credential = await f.storage.observeProtectedCredential({ guard: f.guard, ...f.context });
  t.after(() => credential.close(f.context));
  let dispatches = 0;
  const binding = {
    credential: Buffer.alloc(32, 7).toString('hex'),
    instanceId: 'b'.repeat(64),
    worktree: 'c'.repeat(64),
    ownerVersion: 'd'.repeat(64),
  };
  const server = await createLoopbackServer({
    binding,
    dispatch: async () => {
      dispatches++;
      return { schema: 'ai-peer-review.response/v1', ok: true };
    },
  });
  t.after(() => server.close());
  const proof = await api.observeLoopbackOwner({
    endpoint: { host: '127.0.0.1', port: server.port },
    privateBinding: credential,
    expected: {
      instanceId: binding.instanceId,
      worktree: binding.worktree,
      ownerVersion: binding.ownerVersion,
    },
    ...f.context,
  });
  t.after(() => proof.connection?.close(f.context));
  assert.equal(proof.kind, 'verified-live');
  await writeFile(path.join(f.root, 'credential'), Buffer.alloc(32, 8), { flag: 'r+' });
  await assert.rejects(
    proof.connection.request({ operation: 'status', body: {}, ...f.context }),
    (error) => error.code === 'APR_BROKER_STALE'
  );
  assert.equal(dispatches, 0);
  assert.ok((await readFile(path.join(f.root, 'credential'))).equals(Buffer.alloc(32, 8)));
});

test('verified owner proof authenticates its same socket before slow protected rechecks', async (t) => {
  const timers = new Map();
  let id = 0,
    dispatches = 0;
  const clock = {
    now: () => 0,
    setTimeout(fn, delay) {
      const key = ++id;
      timers.set(key, { fn, delay });
      return key;
    },
    clearTimeout(key) {
      timers.delete(key);
    },
  };
  const context = budget(),
    binding = {
      credential: 'a'.repeat(64),
      instanceId: 'b'.repeat(64),
      worktree: 'c'.repeat(64),
      ownerVersion: 'd'.repeat(64),
    };
  const server = await createLoopbackServer({
    binding,
    clock,
    dispatch: async () => {
      dispatches++;
      return { schema: 'ai-peer-review.response/v1', ok: true };
    },
  });
  t.after(() => server.close());
  const proof = await observeLoopbackOwnerCore({
    endpoint: { host: '127.0.0.1', port: server.port },
    privateBinding: binding,
    expected: {
      instanceId: binding.instanceId,
      worktree: binding.worktree,
      ownerVersion: binding.ownerVersion,
    },
    ...context,
  });
  t.after(() => proof.connection?.close(context));
  assert.equal(proof.kind, 'core-live');
  assert.equal(proof.verified, false);
  assert.equal(dispatches, 0);
  // Actual sockets; only the server-side clock is test-owned and unverified.
  for (const [key, timer] of [...timers])
    if (timer.delay <= 5000) {
      timers.delete(key);
      timer.fn();
    }
  await new Promise((resolve) => setTimeout(resolve, 20));
  const result = await proof.connection.request({ operation: 'status', body: {}, ...context });
  assert.equal(result.ok, true);
  assert.equal(dispatches, 1);
});

for (const [phase, enumeration] of [
  ['initial ticket scan', 1],
  ['winning scan', 2],
]) {
  test('actual withdrawn slot between enumeration and read permits ' + phase, async (t) => {
    const f = await transactionFixture(t);
    const { actualElection } = await import('../helpers/portable-owner-election.mjs');
    const first = await actualElection(t, { root: f.privateRoot, budget: f.startup });
    assert.equal(first.kind, 'won');
    let lists = 0,
      withdrew = false;
    const second = await actualElection(t, {
      root: f.privateRoot,
      budget: f.startup,
      onEnumerated: async (names) => {
        if (++lists === enumeration) {
          assert.equal(names.length, 2);
          const outcome = await first.lease.release();
          assert.equal(outcome.status, 'withdrawn');
          withdrew = true;
        }
      },
    });
    assert.equal(withdrew, true);
    assert.equal(second.kind, 'won', JSON.stringify(second));
    assert.equal(second.verified, false);
    await second.lease.release();
    const names = await (await import('node:fs/promises')).readdir(f.privateRoot);
    assert.equal(names.filter((name) => name.startsWith('apr-election-')).length, 0);
  });
}
