// @story #188
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createBrokerClientOperations } from '../helpers/manual-recovery-api.mjs';
import { fixture, identity, NOW } from '../helpers/intervention-fixture.mjs';
import { fixtureStartupDeps, fixtureSelection } from '../helpers/internal-api.mjs';
import { startReview } from '../helpers/operations-api.mjs';
import { readStartupJournal } from '../../src/broker/registry.mjs';
import { reserveManualLaunch } from '../../src/provider/manual-launch-ledger.mjs';
async function review(t) {
  const f = fixture();
  t.after(f.cleanup);
  return await startReview(
    {
      ...fixtureSelection('claude', 'claude-opus-5'),
      cwd: f.root,
      artifact: 'docs/artifact.md',
      artifactKind: 'spec',
      identity: identity('author', 'transaction-author'),
      now: NOW,
      reviewId: 'transaction-review',
    },
    fixtureStartupDeps
  );
}
function operations(lease) {
  return createBrokerClientOperations({
    performCurrentOperationEffect: (effect) => effect(),
    assertCurrentOperationAuthority: () => {},
    acquireManualRecoveryResource: async () => lease,
    authenticateManualOwnerConnection: async () => true,
  });
}
const offline = async () => {
  throw Object.assign(new Error('offline'), { code: 'ENOENT' });
};

test('manual recovery awaits independent ownership refusal before suspension publication', async (t) => {
  const started = await review(t);
  const lease = {
    verified: false,
    verify: async () => false,
    release: async () => {},
    retain: async () => {},
  };
  await assert.rejects(
    operations(lease).fenceManualRecovery(started.paths.workspace, {
      connect: offline,
      acquireRecoveryOwnership: async () => lease,
    }),
    { code: 'APR_BROKER_START_FAILED' }
  );
  assert.equal(existsSync(path.join(started.paths.workspace, 'manual-suspension.json')), false);
});

test('unknown manual launch retains independent exclusion without treating broker death as completion', async (t) => {
  const started = await review(t);
  const journal = readStartupJournal(started.paths.workspace);
  await reserveManualLaunch(started.paths.workspace, {
    reviewId: started.review_id,
    requestDigest: journal.request_digest,
    intentDigest: 'sha256:' + 'a'.repeat(64),
  });
  let releases = 0,
    retains = 0;
  const lease = {
    verified: false,
    verify: async () => true,
    release: async () => {
      releases++;
    },
    retain: async () => {
      retains++;
    },
  };
  await assert.rejects(
    operations(lease).fenceManualRecovery(started.paths.workspace, {
      connect: offline,
      acquireRecoveryOwnership: async () => lease,
      reconcileProvider: async () => ({ status: 'not-submitted' }),
    }),
    { code: 'APR_WAKE_OUTCOME_UNKNOWN' }
  );
  assert.equal(releases, 0);
  assert.equal(retains, 1);
  assert.equal(existsSync(path.join(started.paths.workspace, 'manual-fence.json')), false);
});

test('live manual suspension refuses an unauthenticated owner connection before sending suspend', async (t) => {
  const started = await review(t);
  let requests = 0,
    retains = 0;
  const lease = {
    verified: false,
    verify: async () => true,
    release: async () => {},
    retain: async () => {
      retains++;
    },
  };
  const core = createBrokerClientOperations({
    performCurrentOperationEffect: (effect) => effect(),
    assertCurrentOperationAuthority: () => {},
    acquireManualRecoveryResource: async () => lease,
  });
  await assert.rejects(
    core.fenceManualRecovery(started.paths.workspace, {
      connect: async () => ({
        request: async () => {
          requests++;
          return { status: 'terminal' };
        },
        connection: { verified: true },
      }),
    }),
    { code: 'APR_BROKER_START_FAILED' }
  );
  assert.equal(requests, 0);
  assert.equal(retains, 1);
  assert.equal(existsSync(path.join(started.paths.workspace, 'manual-fence.json')), false);
});

test('ownership lost during awaited live suspension retains exclusion without publishing a fence', async (t) => {
  const started = await review(t);
  let valid = true,
    releases = 0,
    retains = 0;
  const lease = {
    verified: false,
    verify: async () => valid,
    release: async () => {
      releases++;
    },
    retain: async () => {
      retains++;
    },
  };
  await assert.rejects(
    operations(lease).fenceManualRecovery(started.paths.workspace, {
      connect: async () => ({
        request: async () => {
          valid = false;
          return { status: 'terminal' };
        },
      }),
    }),
    { code: 'APR_BROKER_START_FAILED' }
  );
  assert.equal(releases, 0);
  assert.equal(retains, 1);
  assert.equal(existsSync(path.join(started.paths.workspace, 'manual-fence.json')), false);
});

test('manual cleanup awaits connection close even when client close fails', async (t) => {
  const started = await review(t);
  let connectionClosed = 0;
  const lease = {
    verified: false,
    verify: async () => true,
    release: async () => {},
    retain: async () => {},
  };
  await assert.rejects(
    operations(lease).fenceManualRecovery(started.paths.workspace, {
      connect: async () => ({
        request: async () => ({ status: 'terminal' }),
        close: async () => {
          throw new Error('client-close-failed');
        },
        connection: {
          close: async () => {
            await Promise.resolve();
            connectionClosed++;
          },
        },
      }),
    }),
    /client-close-failed/
  );
  assert.equal(connectionClosed, 1);
});
