// @story #175
// cspell:words hardlink readback
import assert from 'node:assert/strict';
import path from 'node:path';
import { readdir, readFile, lstat } from 'node:fs/promises';
import * as storage from '../../../src/broker/storage-protection.mjs';
import test from 'node:test';
import { owned, realCore, reasonIs } from './fixtures.mjs';
test('[#175] production owner publication refuses copied leases before reserved-file effects', async (t) => {
  const { root, guard, context } = await owned(t);
  assert.equal(typeof storage.createHeldPrivatePublication, 'function');
  assert.equal(typeof storage.isHeldPrivatePublication, 'function');
  assert.equal(storage.isHeldPrivatePublication({ verified: true }), false);
  await assert.rejects(
    storage.createHeldPrivatePublication({
      guard,
      name: 'owner.json',
      bytes: Buffer.from('forged-owner'),
      lease: { kind: 'won', verified: true },
      ...context,
    }),
    (error) => {
      assert.equal(error.code, 'APR_BROKER_STALE');
      assert.equal(error.details.reason, 'genuine-election-lease-required');
      return true;
    }
  );
  assert.deepEqual(await readdir(root), []);
});

test('[#175] unverified publication core delegates exact effects to real retained storage', async (t) => {
  const { guard, context } = await owned(t);
  assert.equal(typeof storage.createHeldPrivatePublicationCore, 'function');
  let handle;
  const core = await storage.createHeldPrivatePublicationCore({
    name: 'fixture-owner',
    bytes: Buffer.from('one'),
    budget: context,
    store: {
      createExclusive: async (name, bytes) =>
        (handle = await guard.createRetainedPublication(name, bytes)),
      read: () => handle.snapshot(),
      replace: (expected, bytes) => handle.publish(expected, bytes),
      unlink: (expected) => handle.withdraw(expected),
      close: () => handle.close(),
    },
  });
  assert.equal(core.verified, false);
  assert.equal(storage.isHeldPrivatePublication(core), false);
  const before = await core.snapshot(context);
  await assert.rejects(
    core.replace({ ...before, bytes: Buffer.from('foreign') }, Buffer.from('stolen'), context),
    reasonIs('owned-publication-generation-changed')
  );
  await core.replace(before, Buffer.from('two'), context);
  assert.equal(await core.verify(context), true);
  const after = await core.snapshot(context);
  assert.equal(after.bytes.toString(), 'two');
  await core.withdraw(after, context);
  await core.close(context);
});

test('[#175] owner factories reject an actual clock-injected guard before lease effects', async (t) => {
  const { root, guard, context } = await owned(t, { clock: () => 0 });
  for (const factory of [storage.createHeldPrivatePublication, storage.quarantinePrivateFile]) {
    await assert.rejects(
      factory({
        guard,
        name: 'owner.json',
        bytes: Buffer.from('no'),
        expected: {},
        lease: {},
        ...context,
      }),
      reasonIs('lease-budget-mismatch')
    );
  }
  assert.deepEqual(await readdir(root), []);
});

test('[#175] core renewed contexts produce a bounded APR refusal before effects', async (t) => {
  const fixture = await realCore(t);
  const core = await fixture.create();
  await assert.rejects(
    core.snapshot({ ...fixture.context, deadline: fixture.context.deadline + 1 }),
    reasonIs('publication-budget-mismatch')
  );
  assert.equal((await readFile(path.join(fixture.root, 'fixture-owner'))).toString(), 'old');
});

test('[#175] core abort produces a bounded APR refusal', async (t) => {
  const fixture = await realCore(t);
  const core = await fixture.create();
  fixture.controller.abort();
  await assert.rejects(core.snapshot(fixture.context), reasonIs('operation-aborted'));
});

test('[#175] core invalid budget refuses without any filesystem effects', async (t) => {
  const fixture = await realCore(t);
  await assert.rejects(
    storage.createHeldPrivatePublicationCore({
      store: fixture.store,
      name: 'fixture-owner',
      bytes: Buffer.from('no'),
      budget: { signal: {}, deadline: NaN },
    }),
    reasonIs('operation-budget-unproved')
  );
  assert.deepEqual(await readdir(fixture.root), []);
});

test('[#175] core busy and retired handles produce bounded APR refusals', async (t) => {
  let enter, resume;
  const entered = new Promise((resolve) => {
    enter = resolve;
  });
  const pending = new Promise((resolve) => {
    resume = resolve;
  });
  const fixture = await realCore(t, {
    beforeReplace: async () => {
      enter();
      await pending;
    },
  });
  const core = await fixture.create();
  const expected = await core.snapshot(fixture.context);
  const replacing = core.replace(expected, Buffer.from('new'), fixture.context);
  await entered;
  try {
    await assert.rejects(core.close(fixture.context), reasonIs('owned-publication-busy'));
  } finally {
    resume();
    await replacing;
  }
  await core.close(fixture.context);
  await assert.rejects(core.snapshot(fixture.context), reasonIs('owned-publication-retired'));
});

for (const operation of ['create', 'replace']) {
  test(
    '[#175] core retains exact evidence when context fails after actual ' + operation,
    async (t) => {
      const fixture = await realCore(t, {
        ...(operation === 'create'
          ? { afterCreate: ({ controller }) => controller.abort() }
          : { afterReplace: ({ controller }) => controller.abort() }),
      });
      let core, caught;
      const action = async () => {
        core = await fixture.create();
        if (operation === 'create') return core;
        const expected = await core.snapshot(fixture.context);
        return core.replace(expected, Buffer.from('new'), fixture.context);
      };
      await assert.rejects(action(), (error) => {
        caught = error;
        return true;
      });
      const actual = await lstat(path.join(fixture.root, 'fixture-owner'), { bigint: true });
      const identity = [actual.dev, actual.ino].map(String).join(':');
      assert.equal(caught.code, 'APR_BROKER_STALE');
      assert.equal(caught.details.reason, 'operation-aborted');
      assert.equal(caught.details.mutationOccurred, true);
      assert.equal(caught.details.retrySafe, false);
      assert.ok(
        caught.details.obligations.some(
          (item) => item.name === 'fixture-owner' && item.identity === identity
        )
      );
      assert.equal(
        (await readFile(path.join(fixture.root, 'fixture-owner'))).toString(),
        operation === 'create' ? 'old' : 'new'
      );
    }
  );
}

test('[#175] copied guards and actual core-produced leases cannot grant owner resources', async (t) => {
  const { root, guard, context } = await owned(t);
  const { acquireOwnerElectionCore, isOwnerElectionLease } =
    await import('../../../src/broker/ownership-election.mjs');
  let held = null,
    version = 0;
  const store = {
    assertBound: () => guard.verify(),
    async create(id, record) {
      held = { id, record, version: ++version };
      return held;
    },
    async read() {
      return held;
    },
    async list() {
      return held ? [held] : [];
    },
    async publish(id, _expected, record) {
      held = { id, record, version: ++version };
      return held;
    },
    async remove() {
      held = null;
    },
  };
  const outcome = await acquireOwnerElectionCore({
    store,
    resourceKey: 'fixture-resource',
    contenderId: 'fixture',
    contenderIdentity: { host: 'fixture-host', pid: process.pid },
    observeProcessIdentity: async () => ({ status: 'unknown' }),
    ...context,
  });
  assert.equal(outcome.kind, 'won');
  assert.equal(isOwnerElectionLease(outcome.lease), false);
  for (const factory of [storage.createHeldPrivatePublication, storage.quarantinePrivateFile]) {
    await assert.rejects(
      factory({
        guard: { ...guard },
        lease: outcome.lease,
        name: 'owner.json',
        bytes: Buffer.from('no'),
        expected: {},
        ...context,
      }),
      reasonIs('genuine-protected-guard-required')
    );
    for (const name of ['owner.json', 'credential', 'endpoint.json', 'unrelated-resource']) {
      await assert.rejects(
        factory({
          guard,
          lease: outcome.lease,
          name,
          bytes: Buffer.from('no'),
          expected: {},
          ...context,
        }),
        reasonIs('genuine-election-lease-required')
      );
    }
  }
  assert.deepEqual(await readdir(root), []);
  assert.equal((await outcome.lease.release()).status, 'withdrawn');
});
