// @story #177
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { compileFunction } from 'node:vm';
import { parse } from 'espree';
import { runBroker } from '../helpers/broker-service-api.mjs';
import { assertCurrentCleanupOwnership } from '../../src/protocol/compatibility.mjs';

const unsupported = (error) => error.code === 'APR_REVIEW_RUNTIME_UNSUPPORTED';
for (const result of [false, 1, {}, null]) {
  test(
    'unverified cleanup core never treats resolved ' + String(result) + ' as ownership',
    async () => {
      const { verifyCleanupOwnerCore } =
        await import('../../src/protocol/cleanup-ownership-core.mjs');
      assert.equal(await verifyCleanupOwnerCore({ verify: async () => result }, {}), false);
    }
  );
}
test('unverified cleanup core bounds verification rejection', async () => {
  const { verifyCleanupOwnerCore } = await import('../../src/protocol/cleanup-ownership-core.mjs');
  assert.equal(
    await verifyCleanupOwnerCore(
      {
        verify: async () => {
          throw new Error('private bytes');
        },
      },
      {}
    ),
    false
  );
});
test('production copied owner cannot invoke even a Promise resolving true', async () => {
  let invoked = false;
  await assert.rejects(
    assertCurrentCleanupOwnership({
      owner: {
        verify: async () => {
          invoked = true;
          return true;
        },
      },
      protocol: 1,
      runtime: { packageVersion: '1.0.0' },
    }),
    unsupported
  );
  assert.equal(invoked, false);
});

async function shippedGuard(bindings) {
  const source = await readFile(
    new URL('../../bin/peer-review-broker.mjs', import.meta.url),
    'utf8'
  );
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', range: true });
  const found = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Property' && node.key?.name === 'cleanupGuard') found.push(node.value);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') walk(value);
    }
  };
  walk(ast);
  assert.equal(found.length, 1, 'exact shipped runBroker cleanup composition');
  return compileFunction(
    'return ' + source.slice(...found[0].range),
    Object.keys(bindings)
  )(...Object.values(bindings));
}

test('shipped-composition-awaits-refusal before actual service worker close or owner release', async () => {
  let closes = 0,
    releases = 0,
    entered,
    reject;
  const entry = new Promise((resolve) => {
    entered = resolve;
  });
  const refusal = new Promise((_resolve, decline) => {
    reject = decline;
  });
  refusal.catch(() => {});
  const owner = {
    verify: () => true,
    release: () => {
      releases++;
    },
  };
  const cleanupGuard = await shippedGuard({
    assertSelectedRuntime: async () => ({ inventory: {} }),
    assertCurrentCleanupOwnership: () => {
      entered();
      return refusal;
    },
    owner,
    bootstrap: { versions: { broker_protocol_version: 1 } },
    runtimeObservation: {},
  });
  const project = { physicalRoot: 'fixture-project', digest: 'a'.repeat(64) };
  const run = runBroker({
    identity: project,
    owner,
    versions: { package_version: '0.4.0', broker_protocol_version: 1, node_major: 26 },
    registry: {
      list: () => [
        {
          workspace: 'fixture-workspace',
          review_id: 'fixture-review',
          project_digest: project.digest,
        },
      ],
      get() {},
    },
    workerFactory: () => ({
      start: async () => {},
      workState: () => 'terminal',
      close: async () => {
        closes++;
      },
      suspend: async () => {
        throw new Error('no suspension');
      },
    }),
    clock: {
      now: () => 0,
      setTimeout: (callback) => {
        queueMicrotask(callback);
        return 1;
      },
      clearTimeout() {},
    },
    server: { start() {}, close() {} },
    cleanupGuard,
  });
  let settled = false;
  run.then(
    () => {
      settled = true;
    },
    () => {
      settled = true;
    }
  );
  await entry;
  await new Promise((resolve) => setImmediate(resolve));
  const pending = !settled;
  reject(
    Object.assign(new Error('bounded unsupported'), { code: 'APR_REVIEW_RUNTIME_UNSUPPORTED' })
  );
  await assert.rejects(run, unsupported);
  assert.equal(pending, true);
  assert.equal(closes, 0);
  assert.equal(releases, 0);
});

test('exact async cleanup core accepts true without conferring genuine owner membership', async () => {
  const { verifyCleanupOwnerCore } = await import('../../src/protocol/cleanup-ownership-core.mjs');
  const { isAuthenticatedBrokerOwner } = await import('../../src/broker/ownership.mjs');
  for (const owner of [{ verify: () => true }, { verify: async () => true }]) {
    assert.equal(await verifyCleanupOwnerCore(owner, {}), true);
    assert.equal(isAuthenticatedBrokerOwner(owner), false);
  }
});
