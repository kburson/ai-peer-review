import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  acquireCoordinatorLease,
  inspectCoordinatorLease,
  requestCoordinatorStop,
} from '../helpers/coordinator-lease-api.mjs';

const NOW = new Date('2026-09-13T12:00:00.000Z');

function workspace(t) {
  const root = path.join(process.cwd(), '.scratch', 'test');
  mkdirSync(root, { recursive: true });
  const value = mkdtempSync(path.join(root, 'coordinator-lease-'));
  t.after(() => rmSync(value, { recursive: true, force: true }));
  return value;
}

test('acquires, heartbeats, inspects, and releases only its exact instance', async (t) => {
  const root = workspace(t);
  const controller = await acquireCoordinatorLease(root, { kind: 'cli', pid: 42 }, NOW, {
    instanceId: 'instance-01',
    nonce: 'nonce-01',
  });
  assert.equal(inspectCoordinatorLease(root).lease.instance_id, 'instance-01');
  assert.doesNotMatch(readFileSync(controller.paths.lease, 'utf8'), /nonce-01/);
  const refreshed = await controller.heartbeat(new Date(NOW.valueOf() + 1000));
  assert.equal(refreshed.heartbeat_sequence, 2);
  await controller.release();
  assert.equal(existsSync(controller.paths.lock), false);
  assert.equal(existsSync(controller.paths.lease), false);
});

test('requests stop for only the exact owned instance and makes retry idempotent', async (t) => {
  const root = workspace(t);
  const controller = await acquireCoordinatorLease(root, { kind: 'cli', pid: 42 }, NOW, {
    instanceId: 'instance-01',
    nonce: 'nonce-01',
  });

  const requested = await requestCoordinatorStop(root, NOW);
  assert.equal(requested.instance_id, 'instance-01');
  assert.equal(controller.stopRequested(), true);
  assert.deepEqual(await requestCoordinatorStop(root, new Date(NOW.valueOf() + 1000)), requested);

  await controller.release();
  assert.equal(existsSync(controller.paths.stop), false);
});

test('refuses contention and never deletes a foreign replacement', async (t) => {
  const root = workspace(t);
  const first = await acquireCoordinatorLease(root, { kind: 'cli', pid: 42 }, NOW, {
    instanceId: 'instance-01',
    nonce: 'nonce-01',
  });
  await assert.rejects(
    async () =>
      await acquireCoordinatorLease(root, { kind: 'app-host', pid: null }, NOW, {
        instanceId: 'instance-02',
        nonce: 'nonce-02',
      }),
    (error) => error.code === 'APR_COORDINATOR_OWNED'
  );

  const foreign = JSON.parse(readFileSync(first.paths.lock, 'utf8'));
  writeFileSync(first.paths.lock, `${JSON.stringify({ ...foreign, token: 'foreign-token' })}\n`);
  await first.release();
  assert.equal(existsSync(first.paths.lock), true);
});

test('lease contents alone never override missing or mismatched lock evidence', async (t) => {
  const root = workspace(t);
  const controller = await acquireCoordinatorLease(root, { kind: 'cli', pid: 42 }, NOW, {
    instanceId: 'instance-01',
    nonce: 'nonce-01',
  });
  rmSync(controller.paths.lock);
  assert.throws(
    () => inspectCoordinatorLease(root),
    (error) => error.code === 'APR_COORDINATOR_STALE'
  );
});

for (const action of ['heartbeat', 'release']) {
  test(
    '[#187] coordinator ' + action + ' preserves replacement ownership across awaited admission',
    async (t) => {
      const root = workspace(t);
      const { createCoordinatorLeaseOperations } =
        await import('../../src/coordinator/lease-core.mjs');
      let replace = false,
        foreignLock,
        foreignLease;
      const api = createCoordinatorLeaseOperations({
        async performCurrentOperationEffect(effect) {
          await Promise.resolve();
          if (replace) {
            replace = false;
            const lock = JSON.parse(readFileSync(controller.paths.lock));
            const lease = JSON.parse(readFileSync(controller.paths.lease));
            foreignLock = JSON.stringify({
              ...lock,
              instance_id: 'foreign',
              token: 'foreign-token',
            });
            foreignLease = JSON.stringify({
              ...lease,
              instance_id: 'foreign',
              token: 'foreign-token',
            });
            writeFileSync(controller.paths.lock, foreignLock);
            writeFileSync(controller.paths.lease, foreignLease);
          }
          return effect();
        },
      });
      const controller = await api.acquireCoordinatorLease(root, { kind: 'cli', pid: 42 }, NOW, {
        instanceId: 'original',
        nonce: 'original',
      });
      replace = true;
      if (action === 'heartbeat')
        await assert.rejects(controller.heartbeat(NOW), { code: 'APR_COORDINATOR_STALE' });
      else assert.equal(await controller.release(), false);
      assert.equal(readFileSync(controller.paths.lock, 'utf8'), foreignLock);
      assert.equal(readFileSync(controller.paths.lease, 'utf8'), foreignLease);
    }
  );
}
