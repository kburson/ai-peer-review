// @story #189
import assert from 'node:assert/strict';
import test from 'node:test';
import * as ownership from '../../src/broker/portable-ownership.mjs';
import { isPortableBrokerOwner } from '../../src/broker/portable-owner-lifecycle.mjs';

test('unproved bootstrap inputs cannot mint a prepared portable owner or invoke reconciliation', async () => {
  assert.equal(typeof ownership.preparePortableOwner, 'function');
  let reconciled = 0;
  await assert.rejects(
    ownership.preparePortableOwner({
      worktree: '/unproved',
      paths: {
        worktree: '/unproved',
        privateRoot: '/unproved/private',
        runtimeRoot: '/unproved/runtime',
      },
      protection: { private: { verified: true }, runtime: { verified: true } },
      reconcile: async () => {
        reconciled += 1;
        return { status: 'clear', outstandingObligations: [] };
      },
      signal: new AbortController().signal,
      deadline: performance.now() + 30000,
    })
  );
  assert.equal(reconciled, 0);
});

test('a copied prepared owner cannot enter worker ownership or published-owner membership', () => {
  assert.equal(typeof ownership.isPreparedPortableOwner, 'function');
  assert.equal(typeof ownership.resolvePortableWorkerOwner, 'function');
  const copied = {
    prepared: true,
    verified: true,
    instanceId: 'a'.repeat(64),
    verify: async () => true,
    publish: async () => {},
  };
  assert.equal(ownership.isPreparedPortableOwner(copied), false);
  assert.equal(isPortableBrokerOwner(copied), false);
  assert.throws(() => ownership.resolvePortableWorkerOwner(copied), { code: 'APR_BROKER_STALE' });
});

test('unproved owner or service handles cannot attach operational readiness dispatch', () => {
  assert.equal(typeof ownership.createPreparedPortableBrokerServer, 'function');
  assert.equal(typeof ownership.resolvePreparedPortableService, 'function');
  let dispatched = 0;
  const copied = {
    prepared: true,
    verify: async () => true,
    dispatch: async () => {
      dispatched += 1;
    },
  };
  assert.throws(() => ownership.createPreparedPortableBrokerServer({ owner: copied }), {
    code: 'APR_BROKER_STALE',
  });
  assert.throws(() => ownership.resolvePreparedPortableService(copied), {
    code: 'APR_BROKER_STALE',
  });
  assert.equal(dispatched, 0);
});

test('plain request admissions cannot grant a new current authority context', async () => {
  const readiness = await import('../../src/broker/owner-readiness.mjs');
  assert.equal(typeof readiness.claimPortableServiceRequest, 'function');
  const forged = {
    verified: true,
    operation: 'stop',
    worktree: '/work',
    signal: new AbortController().signal,
    deadline: performance.now() + 30000,
  };
  assert.throws(() => readiness.claimPortableServiceRequest(forged), { code: 'APR_BROKER_STALE' });
});

test('request authority rejects copied admission facts before invoking an effect', async () => {
  const authority = await import('../../src/startup/authority-fence.mjs');
  assert.equal(typeof authority.withPortableBrokerRequestAuthority, 'function');
  let effects = 0;
  await assert.rejects(
    authority.withPortableBrokerRequestAuthority(
      { verified: true, operation: 'stop', worktree: '/work' },
      async () => {
        effects += 1;
      }
    ),
    { code: 'APR_BROKER_STALE' }
  );
  assert.equal(effects, 0);
});

test('an absence claim or copied drain receipt cannot authorize owner release', async () => {
  const readiness = await import('../../src/broker/owner-readiness.mjs');
  assert.equal(typeof readiness.isPortableOwnerReadinessDrainedFor, 'function');
  assert.equal(
    readiness.isPortableOwnerReadinessDrainedFor({
      readiness: { closed: true, drained: true },
      credential: { verified: true },
      expected: {},
      endpoint: {},
    }),
    false
  );
});

test('copied service lifecycle facts cannot mint a cleanup context', async () => {
  const readiness = await import('../../src/broker/owner-readiness.mjs');
  assert.equal(typeof readiness.createPortableServiceLifecycleAdmission, 'function');
  assert.equal(typeof readiness.claimPortableServiceLifecycle, 'function');
  assert.throws(
    () =>
      readiness.createPortableServiceLifecycleAdmission({
        service: { published: true },
        phase: 'cleanup',
      }),
    { code: 'APR_BROKER_STALE' }
  );
  assert.throws(
    () =>
      readiness.claimPortableServiceLifecycle({
        verified: true,
        phase: 'cleanup',
        owner: { verify: async () => true },
      }),
    { code: 'APR_BROKER_STALE' }
  );
});

test('owned lifecycle authority rejects a copied service admission before effects', async () => {
  const authority = await import('../../src/startup/authority-fence.mjs');
  assert.equal(typeof authority.withPortableBrokerLifecycleAuthority, 'function');
  let effects = 0;
  await assert.rejects(
    authority.withPortableBrokerLifecycleAuthority(
      { phase: 'cleanup', verified: true },
      async () => {
        effects += 1;
      }
    ),
    { code: 'APR_BROKER_STALE' }
  );
  assert.equal(effects, 0);
});

test('production worker refuses a forged owner before touching its verification callback', async () => {
  const { createProductionReviewWorker } = await import('../../src/broker/worker-factory.mjs');
  let effects = 0;
  await assert.rejects(
    createProductionReviewWorker({
      owner: {
        verify: async () => {
          effects += 1;
          return true;
        },
      },
    }),
    { code: 'APR_BROKER_STALE' }
  );
  assert.equal(effects, 0);
});

test('production worker refuses caller platform and clock ports before effects', async () => {
  const { createProductionReviewWorker } = await import('../../src/broker/worker-factory.mjs');
  let effects = 0;
  await assert.rejects(
    createProductionReviewWorker({
      owner: {},
      platform: {
        userId: async () => {
          effects += 1;
        },
      },
      clock: { now: () => 0 },
    }),
    { code: 'APR_BROKER_START_FAILED' }
  );
  assert.equal(effects, 0);
});

test('real production worker entry refuses copied ownership before lower authority or stock ports', async () => {
  const { productionWorkerPortFixture } = await import('../helpers/production-worker-ports.mjs');
  const fixture = await productionWorkerPortFixture();
  let ownerCalls = 0;
  await assert.rejects(
    fixture.api.createProductionReviewWorker({
      registration: {
        project_root: '/project',
        project_digest: 'a'.repeat(64),
        workspace: '/project/review',
      },
      project: { physicalRoot: '/project', digest: 'a'.repeat(64) },
      runtimeImage: {},
      owner: {
        verify: async () => {
          ownerCalls += 1;
          return true;
        },
      },
    })
  );
  assert.equal(fixture.verified, false);
  assert.equal(ownerCalls, 0);
  assert.equal(fixture.state.authority, 0);
  assert.equal(fixture.state.stock, 0);
});
