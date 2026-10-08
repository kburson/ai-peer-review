// @story #178
// Actual test-owned substrate; every protocol result remains unverified.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, open, readFile, lstat, unlink, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { createOwnerLifecycleCore } from '../../src/broker/owner-lifecycle-core.mjs';
import { createLoopbackServer } from '../../src/broker/http-server.mjs';
import { observeLoopbackOwnerCore } from '../../src/broker/owner-connection.mjs';
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
export async function transactionFixture(t, options = {}) {
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
    const fd = file.fd;
    const entry = {
      file,
      original: await file.stat({ bigint: true }),
      fd,
      location,
      bytes: Buffer.from(bytes),
      name,
    };
    held.set(name, entry); // Retain even when a pending write/fsync cannot complete.
    await file.writeFile(bytes);
    await file.sync();
    const original = await file.stat({ bigint: true });
    entry.original = original;
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
      const rootStat = await lstat(base, { bigint: true }),
        parentStat = await lstat(path.dirname(base), { bigint: true });
      return {
        name,
        root: base,
        rootIdentity: rootStat.dev + ':' + rootStat.ino,
        parentIdentity: parentStat.dev + ':' + parentStat.ino,
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
        const pendingEntry = held.get(original.name);
        pendingEntry.quarantine = destination; // Keep both locators before the pending effect.
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
          transport: {
            stop: async (context) => {
              if (options.transport) return options.transport({ server, channel, context });
              await channel?.close(startup);
              await server?.close();
              return true;
            },
          },
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
          ...(x.quarantine ? { originalLocator: x.location, quarantineLocator: x.quarantine } : {}),
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

export async function deadOriginal(t) {
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

export async function protectedCredential(t, { runtime = false, seeds = [] } = {}) {
  const storage = await import('../../src/broker/storage-protection.mjs');
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'apr-private-read-178-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const setup = { signal: new AbortController().signal, deadline: performance.now() + 180000 },
    privateRoot = path.join(root, 'private');
  const receipt = await storage.provisionProtectedRoot({ root: privateRoot, ...setup });
  const seedGuard = await storage.openProtectedRoot({ receipt, ...setup });
  t.after(() => seedGuard.close());
  await seedGuard.writeExclusive('fixture-secret', Buffer.alloc(32, 7));
  const { rename } = await import('node:fs/promises');
  await rename(path.join(privateRoot, 'fixture-secret'), path.join(privateRoot, 'credential'));
  for (const [name, bytes] of seeds) {
    const temporaryName = 'fixture-' + name;
    await seedGuard.writeExclusive(temporaryName, bytes);
    await rename(path.join(privateRoot, temporaryName), path.join(privateRoot, name));
  }
  const runtimeRoot = path.join(root, 'runtime');
  const runtimeReceipt = runtime
    ? await storage.provisionProtectedRoot({ root: runtimeRoot, ...setup })
    : undefined;
  await seedGuard.close();
  const context = budget();
  const guard = await storage.openProtectedRoot({ receipt, ...context });
  t.after(() => guard.close());
  return { storage, guard, context, receipt, root: privateRoot, runtimeRoot, runtimeReceipt };
}
