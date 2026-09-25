import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  cleanupHandoffBroker,
  createInstalledHandoffScratch,
  spawnOwnedHandoffBroker,
} from '../helpers/installed-handoff-lifecycle.mjs';

const providerLifetime = new URL('../../src/providers/process-lifetime.mjs', import.meta.url).href;
const root = fileURLToPath(new URL('../..', import.meta.url));

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === 'ESRCH') return false;
    throw error;
  }
}

test('broker stays alive until its detached provider deadline timer has stopped and reaped the child', async (t) => {
  const deadline = Date.now() + 2_000;
  const broker = spawnOwnedHandoffBroker(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import { spawnProviderProcess } from ${JSON.stringify(providerLifetime)};
    const provider = spawnProviderProcess(process.execPath, ['-e', 'setInterval(() => {}, 100)'], {
      env: process.env, stdio: 'ignore',
    });
    const complete = provider.wait().catch(() => {});
    process.send({ pid: provider.child.pid });
    process.on('message', async () => {
      await complete;
      process.send({ settled: true });
    });
  `,
    ],
    {
      cwd: root,
      env: { ...process.env, APR_PROVIDER_DEADLINE_MS: String(deadline) },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    }
  );
  broker.wait().catch(() => {});
  const [message] = await once(broker.child, 'message');
  t.after(async () => {
    if (alive(message.pid)) process.kill(message.pid, 'SIGKILL');
    await broker.stop();
  });
  assert.equal(alive(message.pid), true);
  const result = await cleanupHandoffBroker({
    broker,
    deadline,
    graceMs: 1_000,
    settle: async () => {
      const next = once(broker.child, 'message');
      broker.child.send('settle');
      const [response] = await next;
      assert.equal(response.settled, true);
    },
  });
  assert.equal(result.status, 'settled');
  assert.equal(
    alive(message.pid),
    false,
    'detached provider must be reaped before broker cleanup succeeds'
  );
});

test('unsettled cleanup retains broker through deadline and grace and reports unproven', async (t) => {
  const deadline = Date.now() + 250;
  const broker = spawnOwnedHandoffBroker(process.execPath, ['-e', 'setInterval(() => {}, 100)'], {
    cwd: root,
    env: { ...process.env, APR_PROVIDER_DEADLINE_MS: String(deadline) },
    stdio: 'ignore',
  });
  broker.wait().catch(() => {});
  t.after(() => broker.stop());
  let closedAt;
  broker.child.once('close', () => {
    closedAt = Date.now();
  });
  const result = await cleanupHandoffBroker({
    broker,
    deadline,
    graceMs: 250,
    settle: () => new Promise(() => {}),
  });
  assert.equal(result.status, 'unproven');
  assert.ok(
    closedAt >= deadline + 240,
    'broker must retain the provider timers throughout cleanup grace'
  );
});

test('operator-selected absolute evidence parent retains private scratch outside the disposable checkout', (t) => {
  mkdirSync(path.join(root, '.scratch/test'), { recursive: true });
  const parent = mkdtempSync(path.join(root, '.scratch/test/handoff-preserved-'));
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  const checkout = path.join(parent, 'disposable-checkout');
  const evidenceRoot = path.join(parent, 'retained-evidence');
  const scratch = createInstalledHandoffScratch({ root: checkout, evidenceRoot });
  assert.equal(path.dirname(scratch), evidenceRoot);
  if (process.platform !== 'win32') {
    assert.equal(statSync(evidenceRoot).mode & 0o777, 0o700);
    assert.equal(statSync(scratch).mode & 0o777, 0o700);
  }
  assert.throws(() => createInstalledHandoffScratch({ root: checkout, evidenceRoot: 'relative' }), {
    code: 'APR_LIVE_EVIDENCE_PATH_INVALID',
  });
});
