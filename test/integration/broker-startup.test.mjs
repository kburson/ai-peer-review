import assert from 'node:assert/strict';
import test from 'node:test';

import { createReviewWorker } from '../../src/broker/worker.mjs';
import { launchReviewerOperation } from '../../src/broker/launch.mjs';
import { runBroker } from '../../src/broker/service.mjs';
import { existsSync, readFileSync, realpathSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fixture, identity, NOW, replaceSection } from '../helpers/intervention-fixture.mjs';
import {
  startReview,
  joinReview,
  submitReviewTurn,
  abandonReview,
  run,
} from '../../src/cli/run.mjs';
import { participantIdentity } from '../../src/identity/registry.mjs';
import { AprError } from '../../src/errors.mjs';
import { fixtureStartupDeps } from '../helpers/internal-api.mjs';
import { activateStartup, prepareStartup } from '../../src/startup/runtime.mjs';
import * as brokerClient from '../../src/broker/client.mjs';
import { statusReview } from '../../src/cli/run.mjs';
import * as registry from '../../src/broker/registry.mjs';
import {
  latestWakeOperation,
  reserveWakeOperation,
  appendWakeOutcome,
} from '../../src/coordinator/ledger.mjs';
import {
  inspectReviewAuthority,
  mutateReview,
  initializeReview,
} from '../../src/protocol/service.mjs';
import { withReviewLock } from '../../src/protocol/store.mjs';
import { resolveReviewPaths } from '../../src/collateral/paths.mjs';

function brokerLaunchDeps(base) {
  return {
    ...base,
    async requestBroker(client, command, workspace) {
      if (command !== 'launch') return brokerClient.requestBroker(client, command, workspace);
      const journal = registry.readStartupJournal(workspace);
      const context = journal.request.startup.context;
      const invitation = resolveReviewPaths({
        root: context.repository_root,
        kind: context.artifact_kind,
        name: context.artifact_name,
        date: context.review_date,
        reviewId: journal.review_id,
        recordId: context.record_id,
      }).reviewerInvitation.absolute;
      const registration = JSON.parse(readFileSync(journal.registration_file, 'utf8'));
      const worker = createReviewWorker({
        registration,
        adapter: {
          bootstrap: true,
          resourceObservation: async () => ({ status: 'ready' }),
          launchReviewer: async () =>
            base.adapters.claude.launch({
              workspace,
              invitation,
              selection: journal.descriptor.reviewer,
              runtime: journal.descriptor,
              requestDigest: journal.request_digest,
              authorSessionFingerprint: journal.request.author.session_fingerprint,
            }),
        },
        resourceLease: { beforeDelivery: () => true, release: () => {} },
        clock: { now: () => Date.parse(NOW) },
      });
      await worker.start();
      return launchReviewerOperation({ registration, worker });
    },
  };
}

test('broker launch reservation releases dispatch lock during a deferred provider call', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  await assert.rejects(
    startReview(request(fx.root), {
      ...fixtureStartupDeps,
      afterStartupStage: async (stage) => {
        if (stage === 'registration') throw new Error('defer broker launch');
      },
    }),
    /defer broker launch/
  );
  const workspace = path.join(fx.root, '.scratch/peer-review/transaction-review');
  const registration = JSON.parse(
    readFileSync(
      path.join(fx.root, '.scratch/peer-review/broker/registrations/transaction-review.json'),
      'utf8'
    )
  );
  let entered;
  const providerEntered = new Promise((resolve) => (entered = resolve));
  let release;
  t.after(() => release?.({ status: 'definitely-not-submitted' }));
  const providerWait = new Promise((resolve) => (release = resolve));
  let calls = 0;
  const launching = launchReviewerOperation({
    registration,
    worker: {
      async launchReviewer({ operationId, intentDigest }) {
        calls++;
        assert.match(operationId, /^launch:[a-f0-9]{64}$/);
        assert.match(intentDigest, /^sha256:[a-f0-9]{64}$/);
        entered();
        return providerWait;
      },
    },
  });
  await providerEntered;
  assert.equal(registry.readStartupJournal(workspace).provider_operation.status, 'reserved');
  assert.equal(await withReviewLock(path.join(workspace, 'dispatch'), () => 'free'), 'free');
  const journal = registry.readStartupJournal(workspace);
  const context = journal.request.startup.context;
  const invitation = resolveReviewPaths({
    root: context.repository_root,
    kind: context.artifact_kind,
    name: context.artifact_name,
    date: context.review_date,
    reviewId: journal.review_id,
    recordId: context.record_id,
  }).reviewerInvitation.absolute;
  const reviewer = participantIdentity({
    role: 'reviewer',
    host: 'claude-code',
    provider: 'anthropic',
    modelId: 'claude-opus-5',
    modelDisplay: 'Claude Opus 5',
    sessionId: 'deferred-reviewer',
    source: 'runtime',
    joinedAt: NOW,
  });
  const joined = await joinReview({
    cwd: fx.root,
    invitation,
    identity: reviewer,
    now: NOW,
    runtimeObservation: {
      provider: 'anthropic',
      host: 'claude-code',
      model_id: 'claude-opus-5',
      effort: 'medium',
      adapter_version: 'fixture-v1',
      assurance: 'runtime',
    },
  });
  for (const [heading, value] of [
    ['Summary', 'Reviewed while launch remains open.'],
    ['Findings', 'None.'],
    ['Required changes', 'None.'],
    ['Optional suggestions', 'None.'],
    ['Decision', 'accepted'],
  ])
    replaceSection(joined.paths.response, heading, value);
  await submitReviewTurn({
    cwd: fx.root,
    workspace,
    identity: reviewer,
    decision: 'accepted',
    now: NOW,
  });
  assert.equal(existsSync(path.join(workspace, 'manual-fence.json')), false);
  await assert.rejects(launchReviewerOperation({ registration, worker: { launchReviewer() {} } }), {
    code: 'APR_WAKE_OUTCOME_UNKNOWN',
  });
  release({ status: 'launched', session_fingerprint: reviewer.session_fingerprint });
  assert.equal((await launching).status, 'launched');
  assert.equal(calls, 1);
  assert.equal(registry.readStartupJournal(workspace).provider_operation.status, 'acknowledged');
});

test('bootstrap worker rechecks provider lease and fence immediately before launch', async () => {
  let fenced = false;
  let providerCalls = 0;
  const adapter = {
    bootstrap: true,
    resourceObservation: async () => {
      fenced = true;
      return { status: 'ready' };
    },
    launchReviewer: async () => {
      providerCalls++;
      return { status: 'launched' };
    },
  };
  const status = () => ({
    state: 'awaiting-reviewer',
    review: { recovery: { stage: 'launch-pending', fenced, suspending: false } },
  });
  const worker = createReviewWorker({
    registration: { workspace: '/project/review' },
    adapter,
    resourceLease: { beforeDelivery: () => true },
    inspectStatus: status,
    clock: { now: () => Date.parse(NOW) },
  });
  assert.equal(await worker.start(), 'bootstrap');
  await assert.rejects(worker.launchReviewer({ operationId: 'launch:one' }), {
    code: 'APR_BROKER_STALE',
  });
  assert.equal(providerCalls, 0);
  fenced = false;
  const leaseLost = createReviewWorker({
    registration: { workspace: '/project/lease-lost' },
    adapter,
    resourceLease: {
      beforeDelivery: () => {
        throw new AprError('APR_PROVIDER_RESOURCE_STALE', 'lease lost', {
          recovery: 'Preserve the exact provider-resource lease.',
        });
      },
    },
    inspectStatus: status,
    clock: { now: () => Date.parse(NOW) },
  });
  await leaseLost.start();
  await assert.rejects(leaseLost.launchReviewer({ operationId: 'launch:two' }), {
    code: 'APR_PROVIDER_RESOURCE_STALE',
  });
  assert.equal(providerCalls, 0);
  assert.equal(
    Object.hasOwn(
      createReviewWorker({
        registration: { workspace: '/project/recovery' },
        adapter,
        inspectStatus: status,
      }),
      'launchReviewer'
    ),
    false
  );
});

test('timed-out broker launch is durable unknown and never dispatches a second call', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  await assert.rejects(
    startReview(request(fx.root), {
      ...fixtureStartupDeps,
      afterStartupStage: async (stage) => {
        if (stage === 'registration') throw new Error('defer launch');
      },
    }),
    /defer launch/
  );
  const workspace = path.join(fx.root, '.scratch/peer-review/transaction-review');
  const registration = JSON.parse(
    readFileSync(
      path.join(fx.root, '.scratch/peer-review/broker/registrations/transaction-review.json'),
      'utf8'
    )
  );
  let calls = 0;
  const worker = {
    launchReviewer: async () => {
      calls++;
      return new Promise(() => {});
    },
  };
  await assert.rejects(launchReviewerOperation({ registration, worker, timeoutMs: 5 }), {
    code: 'APR_WAKE_OUTCOME_UNKNOWN',
  });
  assert.equal(registry.readStartupJournal(workspace).provider_operation.status, 'outcome-unknown');
  await assert.rejects(launchReviewerOperation({ registration, worker, timeoutMs: 5 }), {
    code: 'APR_WAKE_OUTCOME_UNKNOWN',
  });
  assert.equal(calls, 1);
});

test('authenticated join refuses a reviewer session changed from launch acknowledgment', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const deps = brokerLaunchDeps({
    ...fixtureStartupDeps,
    adapters: {
      claude: {
        ...fixtureStartupDeps.adapters.claude,
        launch: async () => ({
          status: 'launched',
          session_fingerprint: `sha256:${'b'.repeat(64)}`,
        }),
      },
    },
  });
  const started = await startReview(request(fx.root), deps);
  const reviewer = participantIdentity({
    role: 'reviewer',
    host: 'claude-code',
    provider: 'anthropic',
    modelId: 'claude-opus-5',
    modelDisplay: 'Claude Opus 5',
    sessionId: 'different-reviewer',
    source: 'runtime',
    joinedAt: NOW,
  });
  await assert.rejects(
    joinReview({
      cwd: fx.root,
      invitation: started.paths.reviewer_invitation,
      identity: reviewer,
      now: NOW,
      runtimeObservation: {
        provider: 'anthropic',
        host: 'claude-code',
        model_id: 'claude-opus-5',
        effort: 'medium',
        adapter_version: 'fixture-v1',
        assurance: 'runtime',
      },
    }),
    { code: 'APR_IDENTITY_CONFLICT' }
  );
  assert.equal(statusReview(started.paths.workspace).state, 'awaiting-reviewer');
});

test('broker launch command acknowledges reservation while the provider is still running', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  await assert.rejects(
    startReview(request(fx.root), {
      ...fixtureStartupDeps,
      afterStartupStage: async (stage) => {
        if (stage === 'registration') throw new Error('defer launch');
      },
    }),
    /defer launch/
  );
  const workspace = path.join(fx.root, '.scratch/peer-review/transaction-review');
  const registration = JSON.parse(
    readFileSync(
      path.join(fx.root, '.scratch/peer-review/broker/registrations/transaction-review.json'),
      'utf8'
    )
  );
  let dispatch;
  let ready;
  const serverReady = new Promise((resolve) => (ready = resolve));
  const server = {
    start(handler) {
      dispatch = handler;
      ready();
    },
    close() {},
  };
  let entered;
  const providerEntered = new Promise((resolve) => (entered = resolve));
  let release;
  const providerWait = new Promise((resolve) => (release = resolve));
  t.after(() => release?.({ status: 'definitely-not-submitted' }));
  const clock = {
    now: () => Date.now(),
    setTimeout: (callback) => setImmediate(callback),
    clearTimeout: (handle) => clearImmediate(handle),
  };
  const running = runBroker({
    identity: { digest: registration.project_digest, physicalRoot: fx.root },
    owner: { release() {} },
    versions: { package_version: '0.3.0', broker_protocol_version: 1, node_major: 26 },
    registry: {
      list: async () => [registration],
      get: async () => registration,
    },
    workerFactory: () =>
      createReviewWorker({
        registration,
        adapter: {
          bootstrap: true,
          resourceObservation: async () => ({ status: 'ready' }),
          launchReviewer: async () => {
            entered();
            return providerWait;
          },
        },
        resourceLease: { beforeDelivery: () => true, release: () => {} },
        clock,
      }),
    clock,
    server,
  });
  await serverReady;
  const accepted = await dispatch({ id: 'launch-one', command: 'launch', workspace });
  assert.equal(accepted.launch_status, 'pending');
  await providerEntered;
  assert.equal(registry.readStartupJournal(workspace).provider_operation.status, 'reserved');
  const status = await dispatch({ id: 'status-one', command: 'status', workspace: null });
  assert.equal(status.reviews, 1);
  release({ status: 'launched' });
  for (let attempt = 0; attempt < 50; attempt++) {
    if (registry.readStartupJournal(workspace).stage === 'launched') break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(registry.readStartupJournal(workspace).stage, 'launched');
  await dispatch({ id: 'suspend-one', command: 'suspend', workspace });
  await running;
});

function wakeDecision(state) {
  return {
    kind: 'wake',
    authority_revision: state.protocol.revision,
    participant_fingerprint: `sha256:${'b'.repeat(64)}`,
    transport: { capability: 'native-push', adapter: 'codex-app', adapter_version: '2.0.0' },
    delivery: {
      delivery_id: 'author-turn-1-to-reviewer',
      recipient: 'reviewer',
      digest: `sha256:${'d'.repeat(64)}`,
      sequence: 7,
      revision: state.protocol.revision,
      receipt_verified: true,
    },
    capsule: {
      schema: 'ai-peer-review.wake-capsule/v1',
      review_id: state.protocol.review_id,
      expected_revision: state.protocol.revision,
      target_role: 'reviewer',
      reason: 'role-actionable',
      next_command: 'peer-review resume /fixture/workspace',
    },
  };
}

test('pre-authority exact retry reuses sealed timestamps after one minute', async (t) => {
  for (const testAuthority of [false, true]) {
    const fx = fixture();
    t.after(fx.cleanup);
    const input = {
      ...request(fx.root),
      now: testAuthority ? '2026-09-09T23:59:30.000Z' : NOW,
      ...(testAuthority ? { noCommit: true, testHumanAuthority: 'timestamp-authority' } : {}),
    };
    await assert.rejects(
      startReview(input, {
        ...fixtureStartupDeps,
        afterStartupStage: async (stage) => {
          if (stage === 'reservation') throw new Error('reserved-stop');
        },
      }),
      /reserved-stop/
    );
    const workspace = path.join(fx.root, '.scratch/peer-review/transaction-review');
    const original = JSON.parse(readFileSync(path.join(workspace, 'startup-request.json')));
    const now = testAuthority ? '2026-09-10T00:00:30.000Z' : '2026-09-09T02:01:00.000Z';
    const retry = { ...input, now, identity: identity('author', 'transaction-author', now) };
    for (const changed of [
      { reviewerModel: 'other-model' },
      { maxTurns: 99 },
      { identity: identity('author', 'other-author', now) },
      ...(testAuthority ? [{ testHumanAuthority: 'changed-authority' }] : []),
    ])
      await assert.rejects(startReview({ ...retry, ...changed }, fixtureStartupDeps), {
        code: 'APR_OUTPUT_COLLISION',
      });
    const started = await startReview(retry, fixtureStartupDeps);
    assert.equal(started.review.recovery.request_digest, original.request_digest);
    assert.deepEqual(inspectReviewAuthority(workspace).events[0].payload, original.request);
    assert.equal(inspectReviewAuthority(workspace).events[0].at, original.created_at);
  }
});

test('replacement worker cannot reserve or deliver between suspension and fence publication', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const started = await startReview(request(fx.root), fixtureStartupDeps);
  let providerCalls = 0;
  const createWorker = () =>
    createReviewWorker({
      registration: { workspace: started.paths.workspace },
      adapter: {
        observation: {},
        deliver: async () => {
          providerCalls++;
          return { status: 'acknowledged' };
        },
      },
      reconcile: async ({ workspace, adapter }) => {
        const state = inspectReviewAuthority(workspace).state;
        const operation = reserveWakeOperation(workspace, wakeDecision(state), new Date(NOW));
        const result = await adapter.deliver({ expected_revision: state.protocol.revision });
        appendWakeOutcome(
          workspace,
          operation.operation_id,
          { ...result, reason: 'test-delivery' },
          new Date(NOW)
        );
      },
      clock: { now: () => Date.parse(NOW) },
    });
  const original = createWorker();
  await original.start();
  await brokerClient.fenceManualRecovery(started.paths.workspace, {
    connect: async () => ({
      request: async () => {
        await original.suspend();
        assert.equal(existsSync(path.join(started.paths.workspace, 'manual-fence.json')), false);
        const replacement = createWorker();
        await replacement.reconcile();
        return { status: 'recovery-only' };
      },
    }),
  });
  assert.equal(providerCalls, 0);
  assert.equal(latestWakeOperation(started.paths.workspace), null);
  assert.equal(statusReview(started.paths.workspace).review.recovery.fenced, true);
});

test('public broker suspend fences before removal and blocks reconcile and restart delivery', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const started = await startReview(request(fx.root), fixtureStartupDeps);
  let deliveries = 0;
  const createWorker = () =>
    createReviewWorker({
      registration: { workspace: started.paths.workspace },
      adapter: {
        automatic: true,
        observation: {},
        deliver: async () => {
          deliveries += 1;
          return { status: 'acknowledged' };
        },
      },
      reconcile: async ({ adapter }) => {
        await adapter.deliver({
          expected_revision: inspectReviewAuthority(started.paths.workspace).state.protocol
            .revision,
        });
      },
      clock: { now: () => Date.parse(NOW) },
    });
  const original = createWorker();
  await original.start();
  const stdout = [];
  const stderr = [];
  const io = {
    cwd: fx.root,
    env: {},
    stdout: { write: (value) => stdout.push(String(value)) },
    stderr: { write: (value) => stderr.push(String(value)) },
    brokerConnect: async () => ({
      request: async (message) => {
        assert.equal(message.command, 'suspend');
        assert.equal(
          existsSync(path.join(started.paths.workspace, 'manual-suspension.json')),
          true
        );
        return { status: await original.suspend(), review_id: started.review_id };
      },
    }),
    brokerInspectEvidence: () => ({
      registrations: [],
      recovery_records: [],
      unreconciled_workspaces: [],
    }),
  };
  assert.equal(
    await run(['broker', 'suspend', started.paths.workspace, '--json'], io),
    0,
    stderr.join('')
  );
  assert.equal(JSON.parse(stdout.at(-1)).status, 'recovery-only');
  assert.equal(existsSync(path.join(started.paths.workspace, 'manual-fence.json')), true);
  await original.reconcile();
  const replacement = createWorker();
  await replacement.start();
  await replacement.reconcile();
  assert.equal(deliveries, 0);
  assert.equal(statusReview(started.paths.workspace).review.recovery.fenced, true);
});

test('fence publication rejects wake evidence that changed after provider reconciliation began', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const started = await startReview(request(fx.root), fixtureStartupDeps);
  await assert.rejects(
    brokerClient.fenceManualRecovery(started.paths.workspace, {
      connect: async () => {
        throw Object.assign(new Error('dead'), { code: 'ENOENT' });
      },
      acquireRecoveryOwnership: async () => ({ verify: () => true, release() {} }),
      reconcileProvider: async () => {
        reserveWakeOperation(
          started.paths.workspace,
          wakeDecision(inspectReviewAuthority(started.paths.workspace).state),
          new Date(NOW)
        );
        return { status: 'acknowledged' };
      },
    }),
    { code: 'APR_WAKE_OUTCOME_UNKNOWN' }
  );
  assert.equal(existsSync(path.join(started.paths.workspace, 'manual-fence.json')), false);
});

test('suspended worker cannot reserve a wake after its awaited observation resumes', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const started = await startReview(request(fx.root), fixtureStartupDeps);
  let observed, release;
  const entered = new Promise((resolve) => {
    observed = resolve;
  });
  const waiting = new Promise((resolve) => {
    release = resolve;
  });
  const worker = createReviewWorker({
    registration: { workspace: started.paths.workspace },
    clock: { now: () => Date.parse(NOW) },
    adapter: {
      observation: async () => {
        observed();
        await waiting;
        return {};
      },
      deliver: async () => {
        throw new Error('must not deliver');
      },
    },
    reconcile: async ({ workspace }) =>
      reserveWakeOperation(
        workspace,
        wakeDecision(inspectReviewAuthority(workspace).state),
        new Date(NOW)
      ),
  });
  const running = worker.reconcile();
  await entered;
  await brokerClient.fenceManualRecovery(started.paths.workspace, {
    connect: async () => ({ request: async () => ({ status: await worker.suspend() }) }),
  });
  release();
  await running;
  assert.equal(latestWakeOperation(started.paths.workspace), null);
});

test('restart repairs interruption inside authority creation before broker reconciliation', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const input = request(fx.root);
  await assert.rejects(
    startReview(input, {
      ...fixtureStartupDeps,
      initializeReview: async (...args) => {
        await initializeReview(...args);
        throw new Error('inside-authority');
      },
    }),
    /inside-authority/
  );
  const workspace = path.join(fx.root, '.scratch/peer-review/transaction-review');
  assert.equal(existsSync(path.join(workspace, 'events.jsonl')), true);
  assert.equal(existsSync(path.join(workspace, 'collateral-reservation.json')), false);
  let reconciled;
  const resumed = await startReview(input, {
    ...fixtureStartupDeps,
    ensureBroker: async ({ project }) => {
      reconciled = await registry.reconcileRegistrations({
        project,
        store: {
          root: path.join(project.physicalRoot, '.scratch/peer-review/broker/registrations'),
        },
        inspectAuthority: registry.inspectStartupAuthority,
      });
      return fixtureStartupDeps.ensureBroker();
    },
  });
  assert.equal(reconciled.length, 1);
  assert.equal(resumed.review_id, 'transaction-review');
  assert.equal(existsSync(path.join(workspace, 'collateral-reservation.json')), true);
  assert.equal(
    inspectReviewAuthority(workspace).events.filter((event) => event.type === 'identity-changed')
      .length,
    1
  );
});

test('activation snapshots mutable phases and time before reserving authority', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const input = { ...request(fx.root), phases: ['spec', 'plan'], now: new Date(NOW) };
  const prepared = await prepareStartup(input, fixtureStartupDeps);
  input.phases.pop();
  input.now.setUTCDate(25);
  const started = await activateStartup(prepared, fixtureStartupDeps);
  const { state } = inspectReviewAuthority(started.paths.workspace);
  assert.deepEqual(state.protocol.phases.kinds, ['spec', 'plan']);
  assert.equal(state.protocol.startup.context.review_date, '2026-09-09');
  assert.equal(started.review.recovery.request_digest, prepared.requestDigest);
});

test('activation does not expose its sealed launch intent to later caller mutation', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  let launchedModel;
  const deps = {
    ...fixtureStartupDeps,
    adapters: {
      claude: {
        ...fixtureStartupDeps.adapters.claude,
        launch: async ({ runtime }) => {
          launchedModel = runtime.reviewer.model_id;
          return { status: 'launched' };
        },
      },
    },
  };
  const prepared = await prepareStartup(request(fx.root), brokerLaunchDeps(deps));
  const output = await activateStartup(
    prepared,
    brokerLaunchDeps({
      ...deps,
      afterStartupStage: async (stage) => {
        if (stage === 'registration')
          prepared.runtime.reviewer.model_id = 'changed-during-activation';
      },
    })
  );
  assert.equal(launchedModel, 'claude-opus-5');
  assert.equal(output.review.runtime.reviewer.model_id, 'claude-opus-5');
});

test('authority creation verifies rebuilt payload against the reserved digest before events', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const prepared = await prepareStartup(request(fx.root), fixtureStartupDeps);
  await assert.rejects(
    startReview(
      { ...request(fx.root), runtime: prepared.runtime, maxTurns: 999 },
      {
        ...fixtureStartupDeps,
        validatedStartup: true,
        requestDigest: prepared.requestDigest,
      }
    ),
    { code: 'APR_OUTPUT_COLLISION' }
  );
  assert.equal(existsSync(path.join(prepared.paths.scratch.absolute, 'events.jsonl')), false);
  const started = await activateStartup(prepared, fixtureStartupDeps);
  const before = readFileSync(started.paths.events);
  await assert.rejects(
    startReview(
      { ...request(fx.root), runtime: prepared.runtime },
      {
        ...fixtureStartupDeps,
        validatedStartup: true,
        requestDigest: '0'.repeat(64),
      }
    ),
    { code: 'APR_OUTPUT_COLLISION' }
  );
  assert.deepEqual(readFileSync(started.paths.events), before);
});

test('registered review with missing journal refuses status and manual fence without mutation', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const started = await startReview(request(fx.root), fixtureStartupDeps);
  const events = readFileSync(started.paths.events);
  unlinkSync(path.join(started.paths.workspace, 'startup-request.json'));
  await assert.rejects(brokerClient.fenceManualRecovery(started.paths.workspace), {
    code: 'APR_BROKER_REGISTRATION_RECOVERY_REQUIRED',
  });
  await assert.rejects(startReview(request(fx.root), fixtureStartupDeps), {
    code: 'APR_BROKER_REGISTRATION_RECOVERY_REQUIRED',
  });
  assert.throws(() => statusReview(started.paths.workspace), {
    code: 'APR_BROKER_REGISTRATION_RECOVERY_REQUIRED',
  });
  assert.equal(existsSync(path.join(started.paths.workspace, 'manual-fence.json')), false);
  assert.deepEqual(readFileSync(started.paths.events), events);
});

test('startup dispatch cannot cross a manual fence published after registration', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  let launches = 0;
  await assert.rejects(
    startReview(
      request(fx.root),
      brokerLaunchDeps({
        ...fixtureStartupDeps,
        adapters: {
          claude: {
            ...fixtureStartupDeps.adapters.claude,
            launch: async () => {
              launches++;
              return { status: 'launched' };
            },
          },
        },
        afterStartupStage: async (stage, { workspace }) => {
          if (stage === 'registration')
            await brokerClient.fenceManualRecovery(workspace, {
              connect: async () => ({ request: async () => ({ status: 'recovery-only' }) }),
            });
        },
      })
    ),
    { code: 'APR_BROKER_STALE' }
  );
  assert.equal(launches, 0);
  assert.equal(
    statusReview(path.join(fx.root, '.scratch/peer-review/transaction-review')).review.recovery
      .fenced,
    true
  );
});

test('manual fence revalidates a launch outcome changed during suspension', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const started = await startReview(request(fx.root), fixtureStartupDeps);
  const file = path.join(started.paths.workspace, 'startup-request.json');
  await assert.rejects(
    brokerClient.fenceManualRecovery(started.paths.workspace, {
      connect: async () => ({
        request: async () => {
          const journal = JSON.parse(readFileSync(file));
          writeFileSync(file, JSON.stringify({ ...journal, stage: 'outcome-unknown' }));
          return { status: 'recovery-only' };
        },
      }),
    }),
    { code: 'APR_WAKE_OUTCOME_UNKNOWN' }
  );
  assert.equal(existsSync(path.join(started.paths.workspace, 'manual-fence.json')), false);
});

test('registered exact retry stays offline and retains the originally pinned runtime', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const first = await startReview(request(fx.root), fixtureStartupDeps);
  const second = await startReview(request(fx.root), {
    ...fixtureStartupDeps,
    pinRuntimeImage: () => {
      throw new Error('must not repin');
    },
    ensureBroker: () => {
      throw new Error('must not reconnect completed startup');
    },
  });
  assert.equal(second.review_id, first.review_id);
});

test('prepared startup rejects changed identity before authority or dispatch', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const input = request(fx.root);
  const prepared = await prepareStartup(input, fixtureStartupDeps);
  // An accidental caller mutation after preflight cannot change sealed intent.
  prepared.runtime.reviewer.model_id = 'changed-model';
  await assert.rejects(activateStartup(prepared, fixtureStartupDeps), {
    code: 'APR_OUTPUT_COLLISION',
  });
  assert.equal(existsSync(path.join(prepared.paths.scratch.absolute, 'events.jsonl')), false);
});

test('startup uses the broker platform OS principal for project identity', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  let principal;
  await prepareStartup(request(fx.root), {
    ...fixtureStartupDeps,
    platform: {
      kind: process.platform,
      canonicalPath: realpathSync,
      userId: () => 'os-principal-fixture',
    },
    ensureBroker: async ({ project }) => {
      principal = project.userId;
      return { close() {} };
    },
  });
  assert.equal(principal, 'os-principal-fixture');
});

test('broker preparation uses the pinned package version instead of the invoking package version', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  let observed;
  await prepareStartup(request(fx.root), {
    ...fixtureStartupDeps,
    ensureBroker: async ({ versions }) => {
      observed = versions;
      return { close() {} };
    },
  });
  assert.equal(observed.package_version, '9.8.7-fixture');
});

test('corrupt startup evidence fails closed without a provider retry or journal deletion', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const started = await startReview(request(fx.root), fixtureStartupDeps);
  const file = path.join(started.paths.workspace, 'startup-request.json');
  writeFileSync(file, '{torn');
  await assert.rejects(startReview(request(fx.root), fixtureStartupDeps), {
    code: 'APR_BROKER_REGISTRATION_RECOVERY_REQUIRED',
  });
  assert.equal(readFileSync(file, 'utf8'), '{torn');
});

test('startup preflight rejects malformed paths, transport, limits, and authority without runtime effects', async (t) => {
  for (const overrides of [
    { artifactKind: 'invalid' },
    { maxTurns: 0 },
    { transportMode: 'carrier-pigeon' },
    { reviewPathTemplate: '../../../outside' },
    { bootstrapGrant: 'missing-grant.json' },
  ]) {
    const fx = fixture();
    t.after(fx.cleanup);
    let brokerCalls = 0;
    await assert.rejects(
      startReview(
        { ...request(fx.root), ...overrides },
        {
          ...fixtureStartupDeps,
          ensureBroker: async () => {
            brokerCalls++;
            throw new Error('unreachable');
          },
        }
      ),
      (error) => error.code?.startsWith('APR_')
    );
    assert.equal(brokerCalls, 0);
    assert.equal(existsSync(path.join(fx.root, '.scratch')), false);
    assert.equal(existsSync(path.join(fx.root, 'docs/peer-reviews')), false);
  }
});

test('startup registration reconciliation derives exact authority independently from the journal', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const started = await startReview(request(fx.root), fixtureStartupDeps);
  const evidence = registry.inspectStartupAuthority({ workspace: started.paths.workspace });
  assert.equal(evidence.status, 'active');
  assert.equal(evidence.event_authority, 'exact');
  assert.equal(evidence.output_reservation, 'exact');
  assert.equal(evidence.request_digest, started.review.recovery.request_digest);
  assert.ok(evidence.runtime_digest.startsWith('sha256:'));
});

test('terminal authority reconciles after its owned output reservation is released', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const input = request(fx.root);
  const started = await startReview(input, fixtureStartupDeps);
  await joinReview({
    cwd: fx.root,
    invitation: started.paths.reviewer_invitation,
    now: NOW,
    identity: participantIdentity({
      role: 'reviewer',
      host: 'claude-code',
      provider: 'anthropic',
      modelId: 'claude-opus-5',
      modelDisplay: 'Claude Opus 5',
      sessionId: 'terminal-reviewer',
      source: 'runtime',
      joinedAt: NOW,
    }),
    runtimeObservation: {
      provider: 'anthropic',
      host: 'claude-code',
      model_id: 'claude-opus-5',
      effort: 'medium',
      adapter_version: 'fixture-v1',
      assurance: 'runtime',
    },
  });
  const { state } = inspectReviewAuthority(started.paths.workspace);
  await mutateReview(
    started.paths.workspace,
    {
      reviewId: state.protocol.review_id,
      revision: state.protocol.revision,
      sequence: state.protocol.sequence,
      actor: state.protocol.current_actor,
    },
    (current) => ({
      schema: 'ai-peer-review.event/v1',
      review_id: current.protocol.review_id,
      sequence: current.protocol.sequence + 1,
      revision: current.protocol.revision + 1,
      type: 'intervention-entered',
      actor: 'system',
      at: NOW,
      payload: {
        intervention_id: 'terminal-fixture',
        reason: 'participant-loss',
        interrupted_state: 'reviewer-turn',
      },
    })
  );
  await abandonReview({
    cwd: fx.root,
    workspace: started.paths.workspace,
    identity: input.identity,
    reason: 'No longer needed.',
    now: NOW,
  });
  assert.equal(
    existsSync(path.join(started.paths.workspace, 'collateral-reservation.json')),
    false
  );
  assert.equal(
    registry.inspectStartupAuthority({ workspace: started.paths.workspace }).status,
    'terminal'
  );
  const events = readFileSync(started.paths.events);
  const retried = await startReview(input, fixtureStartupDeps);
  assert.equal(retried.state, 'abandoned');
  assert.equal(
    existsSync(path.join(started.paths.workspace, 'collateral-reservation.json')),
    false
  );
  assert.deepEqual(readFileSync(started.paths.events), events);
});

test('registration refusal cannot dispatch a reviewer and remains exactly recoverable', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  let launches = 0;
  const deps = {
    ...fixtureStartupDeps,
    adapters: {
      claude: {
        ...fixtureStartupDeps.adapters.claude,
        launch: async () => {
          launches++;
          return { status: 'launched' };
        },
      },
    },
    ensureBroker: async () => ({ request: async () => ({ status: 'not-registered' }) }),
  };
  await assert.rejects(startReview(request(fx.root), deps), { code: 'APR_BROKER_START_FAILED' });
  assert.equal(launches, 0);
  await startReview(
    request(fx.root),
    brokerLaunchDeps({ ...deps, ensureBroker: fixtureStartupDeps.ensureBroker })
  );
  assert.equal(launches, 1);
});

test('launch that joins before acknowledgement and its retry return the current next action', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  let launches = 0;
  const reviewer = participantIdentity({
    role: 'reviewer',
    host: 'claude-code',
    provider: 'anthropic',
    modelId: 'claude-opus-5',
    modelDisplay: 'Claude Opus 5',
    sessionId: 'early-join',
    source: 'runtime',
    joinedAt: NOW,
  });
  const deps = {
    ...fixtureStartupDeps,
    adapters: {
      claude: {
        ...fixtureStartupDeps.adapters.claude,
        launch: async ({ invitation }) => {
          launches++;
          await joinReview({
            cwd: fx.root,
            invitation,
            identity: reviewer,
            now: NOW,
            runtimeObservation: {
              provider: 'anthropic',
              host: 'claude-code',
              model_id: 'claude-opus-5',
              effort: 'medium',
              adapter_version: 'fixture-v1',
              assurance: 'runtime',
            },
          });
          return { status: 'launched', session_fingerprint: reviewer.session_fingerprint };
        },
      },
    },
  };
  const first = await startReview(request(fx.root), brokerLaunchDeps(deps));
  assert.equal(first.state, 'reviewer-turn');
  assert.equal(first.next_action, 'reviewer-submit');
  const retry = await startReview(request(fx.root), brokerLaunchDeps(deps));
  assert.equal(retry.state, 'reviewer-turn');
  assert.equal(launches, 1);
});

test('manual recovery records a fence only after authenticated suspension settles', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const started = await startReview(request(fx.root), fixtureStartupDeps);
  let settle;
  const waiting = new Promise((resolve) => {
    settle = resolve;
  });
  let suspended;
  const entered = new Promise((resolve) => {
    suspended = resolve;
  });
  const fencing = brokerClient.fenceManualRecovery(started.paths.workspace, {
    connect: async () => ({
      request: async (message) => {
        assert.equal(message.command, 'suspend');
        suspended();
        await waiting;
        return { status: 'recovery-only' };
      },
    }),
  });
  await entered;
  assert.equal(existsSync(path.join(started.paths.workspace, 'manual-fence.json')), false);
  settle();
  assert.equal((await fencing).suspending, false);
  const status = statusReview(started.paths.workspace);
  assert.equal(status.review.recovery.fenced, true);
  assert.equal(status.review.runtime.classification, 'XPR');
  assert.equal(status.state, 'awaiting-reviewer');
  await brokerClient.fenceManualRecovery(started.paths.workspace, {
    connect: async () => {
      throw new Error('must be offline idempotent');
    },
  });
});

test('ordinary reviewer submission preserves registered automatic delivery without a manual fence', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const started = await startReview(
    { ...request(fx.root), transportMode: 'resume-only', transportCapability: 'resume-only' },
    fixtureStartupDeps
  );
  const reviewer = participantIdentity({
    role: 'reviewer',
    host: 'claude-code',
    provider: 'anthropic',
    modelId: 'claude-opus-5',
    modelDisplay: 'Claude Opus 5',
    sessionId: 'fenced-reviewer',
    source: 'runtime',
    joinedAt: NOW,
  });
  const joined = await joinReview({
    cwd: fx.root,
    invitation: started.paths.reviewer_invitation,
    identity: reviewer,
    now: NOW,
    transportCapability: 'resume-only',
    runtimeObservation: {
      provider: 'anthropic',
      host: 'claude-code',
      model_id: 'claude-opus-5',
      effort: 'medium',
      adapter_version: 'fixture-v1',
      assurance: 'runtime',
    },
  });
  for (const [heading, value] of [
    ['Summary', 'Ready.'],
    ['Findings', 'None.'],
    ['Required changes', 'None.'],
    ['Optional suggestions', 'None.'],
    ['Decision', 'accepted'],
  ])
    replaceSection(joined.paths.response, heading, value);
  let suspensions = 0;
  await submitReviewTurn(
    {
      cwd: fx.root,
      workspace: started.paths.workspace,
      identity: reviewer,
      decision: 'accepted',
      now: NOW,
    },
    {
      connect: async () => ({
        request: async () => {
          suspensions++;
          assert.equal(
            readFileSync(started.paths.events, 'utf8').includes('reviewer-accepted'),
            false
          );
          return { status: 'recovery-only' };
        },
      }),
    }
  );
  assert.equal(suspensions, 0);
  assert.equal(statusReview(started.paths.workspace).review.recovery.fenced, false);
  assert.equal(existsSync(path.join(started.paths.workspace, 'manual-fence.json')), false);
});

test('dead broker recovery requires OS ownership proof and refuses unknown provider outcome', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const started = await startReview(request(fx.root), fixtureStartupDeps);
  const deps = {
    connect: async () => {
      throw Object.assign(new Error('dead'), { code: 'ECONNREFUSED' });
    },
    acquireRecoveryOwnership: async () => ({ verify: () => true, release() {} }),
    reconcileProvider: async () => ({ status: 'outcome-unknown' }),
  };
  await assert.rejects(
    brokerClient.fenceManualRecovery(started.paths.workspace, deps),
    (error) =>
      error.code === 'APR_WAKE_OUTCOME_UNKNOWN' && error.recovery.includes('transaction-review')
  );
  assert.equal(existsSync(path.join(started.paths.workspace, 'manual-fence.json')), false);
  await brokerClient.fenceManualRecovery(started.paths.workspace, {
    ...deps,
    reconcileProvider: async () => ({ status: 'not-submitted' }),
  });
  assert.equal(statusReview(started.paths.workspace).review.recovery.fenced, true);
});

test('recreated workers and immediate delivery recheck durable fence evidence', async () => {
  let fenced = true;
  let deliveries = 0;
  let captured;
  const worker = createReviewWorker({
    registration: { workspace: '/fixture/review' },
    adapter: {
      automatic: true,
      observation: {},
      deliver: async () => {
        deliveries++;
        return { status: 'delivered' };
      },
      coordinatorInput: {},
    },
    inspectStatus: () => ({
      state: 'reviewer-turn',
      next_action: 'reviewer-submit',
      review: { recovery: { fenced, event_revision: 3 } },
    }),
    coordinator: async (input) => {
      captured = input;
    },
  });
  assert.equal(await worker.start(), 'recovery-only');
  assert.equal(captured, undefined);
  fenced = false;
  const active = createReviewWorker({
    registration: { workspace: '/fixture/review' },
    adapter: {
      automatic: true,
      observation: {},
      deliver: async () => {
        deliveries++;
        return { status: 'delivered' };
      },
      coordinatorInput: {},
    },
    inspectStatus: () => ({
      state: 'reviewer-turn',
      next_action: 'reviewer-submit',
      review: { recovery: { fenced, event_revision: 3 } },
    }),
    coordinator: async (input) => {
      captured = input;
    },
  });
  await active.start();
  fenced = true;
  assert.equal((await captured.adapter.deliver({ expected_revision: 3 })).status, 'refused');
  fenced = false;
  assert.equal((await captured.adapter.deliver({ expected_revision: 2 })).status, 'refused');
  assert.equal(deliveries, 0);
});

function request(root) {
  return {
    ...selection,
    transportMode: 'manual',
    cwd: root,
    artifact: 'docs/artifact.md',
    artifactKind: 'spec',
    identity: identity('author', 'transaction-author'),
    now: NOW,
    reviewId: 'transaction-review',
  };
}

test('startup durably reserves, creates authority, and registers before reviewer launch; exact retry never launches twice', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  let launches = 0;
  const deps = {
    ...fixtureStartupDeps,
    adapters: {
      claude: {
        ...fixtureStartupDeps.adapters.claude,
        launch: async ({ workspace }) => {
          const journal = JSON.parse(readFileSync(path.join(workspace, 'startup-request.json')));
          assert.equal(journal.stage, 'launch-pending');
          assert.ok(readFileSync(path.join(workspace, 'events.jsonl')).length > 0);
          const registration = JSON.parse(
            readFileSync(
              path.join(path.dirname(workspace), 'broker/registrations/transaction-review.json')
            )
          );
          assert.equal(registration.request_digest, journal.request_digest);
          launches += 1;
          return { status: 'launched' };
        },
      },
    },
  };
  const result = await startReview(request(fx.root), brokerLaunchDeps(deps));
  assert.equal(launches, 1);
  assert.equal(
    JSON.parse(readFileSync(path.join(result.paths.workspace, 'startup-request.json'))).stage,
    'launched'
  );
  const retry = await startReview(request(fx.root), brokerLaunchDeps(deps));
  assert.equal(retry.review_id, result.review_id);
  assert.equal(launches, 1);
});

test('ambiguous launch retains journal and refuses automatic retry', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  let launches = 0;
  const deps = {
    ...fixtureStartupDeps,
    adapters: {
      claude: {
        ...fixtureStartupDeps.adapters.claude,
        launch: async () => {
          launches++;
          throw new Error('lost acknowledgement');
        },
      },
    },
  };
  for (let i = 0; i < 2; i++)
    await assert.rejects(
      startReview(request(fx.root), brokerLaunchDeps(deps)),
      (error) =>
        error.code === 'APR_WAKE_OUTCOME_UNKNOWN' && error.recovery.includes('transaction-review')
    );
  assert.equal(launches, 1);
  const journal = JSON.parse(
    readFileSync(path.join(fx.root, '.scratch/peer-review/transaction-review/startup-request.json'))
  );
  assert.equal(journal.stage, 'outcome-unknown');
});

test('reservation and registration failures preserve exact reconciliation evidence without dispatch', async (t) => {
  for (const stage of ['reservation', 'authority', 'registration']) {
    const fx = fixture();
    t.after(fx.cleanup);
    let launches = 0;
    const deps = {
      ...fixtureStartupDeps,
      adapters: {
        claude: {
          ...fixtureStartupDeps.adapters.claude,
          launch: async () => {
            launches++;
            return { status: 'launched' };
          },
        },
      },
      afterStartupStage: async (current) => {
        if (current === stage) throw new Error(`fault-${stage}`);
      },
    };
    await assert.rejects(startReview(request(fx.root), deps), new RegExp(`fault-${stage}`));
    assert.equal(launches, 0);
    const resumed = await startReview(
      request(fx.root),
      brokerLaunchDeps({ ...deps, afterStartupStage: undefined })
    );
    assert.equal(resumed.review_id, 'transaction-review');
    assert.equal(launches, 1);
  }
});

const selection = {
  reviewerProvider: 'claude',
  reviewerModel: 'claude-opus-5',
  reviewerEffort: 'medium',
};
function dependencies(providerCalls = []) {
  return {
    adapters: {
      claude: {
        resolveModel: async ({ model, effort }) => ({
          model_id: model,
          model_display: model,
          effort,
        }),
        capabilities: { broker: [{ transport_mode: 'manual', adapter_version: 'fixture-v1' }] },
        launch: async () => {
          providerCalls.push('launch');
          return { status: 'launched' };
        },
      },
    },
    pinRuntimeImage: fixtureStartupDeps.pinRuntimeImage,
  };
}

test('new manual XPR refuses broker failure before creating authority or provider work', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  const createdEvents = [];
  const providerCalls = [];
  const startWithUnavailableBroker = (options) =>
    startReview(
      {
        ...selection,
        cwd: fx.root,
        artifact: 'docs/artifact.md',
        artifactKind: 'spec',
        identity: identity('author', 'broker-failure-author'),
        now: NOW,
        ...options,
      },
      {
        ...dependencies(providerCalls),
        ensureBroker: async () => {
          throw new AprError('APR_BROKER_START_FAILED', 'Unavailable', {
            recovery: 'Restore the exact broker.',
          });
        },
        initializeReview: async (...args) => {
          createdEvents.push(args);
        },
      }
    );
  await assert.rejects(startWithUnavailableBroker({ transportMode: 'manual' }), {
    code: 'APR_BROKER_START_FAILED',
  });
  assert.equal(createdEvents.length, 0);
  assert.equal(providerCalls.length, 0);
  assert.equal(existsSync(path.join(fx.root, 'docs/peer-reviews')), false);
});

test('direct new start requires explicit reviewer selection before filesystem changes', async (t) => {
  const fx = fixture();
  t.after(fx.cleanup);
  await assert.rejects(
    startReview({
      cwd: fx.root,
      artifact: 'docs/artifact.md',
      artifactKind: 'spec',
      identity: identity('author', 'missing-selection'),
      now: NOW,
    }),
    { code: 'APR_USAGE' }
  );
  assert.equal(existsSync(path.join(fx.root, '.scratch')), false);
});

test('authenticated suspension cannot be undone by a later worker reconciliation', async () => {
  // Removing the persistent suspension check must not permit another wake.
  // The injected reconcile function is the provider-delivery boundary; the
  // worker lifecycle and its status refresh are the real implementations.
  const providerCalls = [];
  let recoveryRecorded = false;
  const worker = createReviewWorker({
    registration: { workspace: '/project/.scratch/peer-review/reviews/review-fence' },
    adapter: {
      automatic: true,
      observation: { provider: 'openai' },
      deliver: async () => {},
      persistRecovery: async () => {
        recoveryRecorded = true;
      },
    },
    inspectStatus: () => ({ state: 'reviewer-turn', next_action: 'reviewer-submit' }),
    reconcile: async () => {
      providerCalls.push('wake');
    },
  });

  await worker.start();
  await worker.suspend();
  assert.equal(recoveryRecorded, true);
  await worker.reconcile();
  await worker.reconcile();

  assert.equal(providerCalls.length, 0);
  assert.equal(worker.workState(), 'recovery-only');
});
