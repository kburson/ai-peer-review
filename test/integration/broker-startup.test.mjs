import assert from 'node:assert/strict';
import test from 'node:test';

import { createReviewWorker } from '../../src/broker/worker.mjs';
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fixture, identity, NOW, replaceSection } from '../helpers/intervention-fixture.mjs';
import { startReview, joinReview, submitReviewTurn, abandonReview } from '../../src/cli/run.mjs';
import { participantIdentity } from '../../src/identity/registry.mjs';
import { AprError } from '../../src/errors.mjs';
import { fixtureStartupDeps } from '../helpers/internal-api.mjs';
import { activateStartup, prepareStartup } from '../../src/startup/runtime.mjs';
import * as brokerClient from '../../src/broker/client.mjs';
import { statusReview } from '../../src/cli/run.mjs';
import * as registry from '../../src/broker/registry.mjs';
import { inspectReviewAuthority, mutateReview } from '../../src/protocol/service.mjs';

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
  await startReview(request(fx.root), { ...deps, ensureBroker: fixtureStartupDeps.ensureBroker });
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
          return { status: 'launched' };
        },
      },
    },
  };
  const first = await startReview(request(fx.root), deps);
  assert.equal(first.state, 'reviewer-turn');
  assert.equal(first.next_action, 'reviewer-submit');
  const retry = await startReview(request(fx.root), deps);
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
  await fencing;
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

test('offline submission fences registered automatic delivery before its response event', async (t) => {
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
  assert.equal(suspensions, 1);
  assert.equal(statusReview(started.paths.workspace).review.recovery.fenced, true);
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
  const result = await startReview(request(fx.root), deps);
  assert.equal(launches, 1);
  assert.equal(
    JSON.parse(readFileSync(path.join(result.paths.workspace, 'startup-request.json'))).stage,
    'launched'
  );
  const retry = await startReview(request(fx.root), deps);
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
      startReview(request(fx.root), deps),
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
    const resumed = await startReview(request(fx.root), { ...deps, afterStartupStage: undefined });
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
