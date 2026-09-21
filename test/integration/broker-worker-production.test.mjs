import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { createProviderBridge } from '../../src/broker/provider-bridge.mjs';
import { createReviewWorker } from '../../src/broker/worker.mjs';
import { createProductionReviewWorker } from '../../src/broker/worker-factory.mjs';
import { canonicalProjection } from '../../src/protocol/service.mjs';

const AUTHOR = `sha256:${'a'.repeat(64)}`;
const REVIEWER = `sha256:${'b'.repeat(64)}`;
const LAUNCH = 'launch:reviewer-operation';
const workspace = '/tmp/apr-bridge-fixture';

function fixture() {
  let role = 'author';
  let revision = 4;
  let fenced = false;
  const calls = [];
  const reconciled = [];
  const opens = [];
  const leases = [];
  const participants = {
    author: { provider: 'openai', host: 'codex', session_fingerprint: AUTHOR },
    reviewer: { provider: 'anthropic', host: 'claude-code', session_fingerprint: REVIEWER },
  };
  const adapters = new Map(
    Object.values(participants).map(({ provider, host }) => [
      `${provider}:${host}`,
      {
        async observeTransport({ binding }) {
          return {
            session_fingerprint: binding.session_fingerprint,
            capability: host === 'codex' ? 'native-push' : 'live-wait',
            ...(host === 'codex' ? { adapter: 'codex-app' } : {}),
            adapter_version: '1.0.0',
            lease: {
              schema: 'ai-peer-review.resident-lease/v1',
              process_instance_id: `${host}-process`,
              pid: null,
              opaque_handle: `${host}-resident`,
              host,
              adapter_version: '1.0.0',
              heartbeat_sequence: 1,
              observed_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 60_000).toISOString(),
            },
          };
        },
        async deliverToSession(input) {
          calls.push(input);
          return { status: 'acknowledged' };
        },
        async observeResource({ binding }) {
          return { session_fingerprint: binding.session_fingerprint };
        },
        async reconcileDelivery(input) {
          reconciled.push(input);
          return { status: 'not-submitted' };
        },
      },
    ])
  );
  const authority = {
    inspect: () => ({
      state: {
        protocol: { review_id: 'review-01', revision, current_actor: role },
        participants,
      },
    }),
    status: () => ({ review: { recovery: { fenced, suspending: false } } }),
    forRole: (target) => ({
      review_id: 'review-01',
      selector: target === 'author' ? 'codex' : 'claude',
      ...participants[target],
      model_id: target === 'author' ? 'gpt-6-astra' : 'claude-opus-5',
      adapter_version: '1.0.0',
      operation_id: target === 'author' ? 'start:review-01' : 'join:review-01',
    }),
  };
  const bindings = {
    async open({ role: target }) {
      opens.push(target);
      return { role: target, ...participants[target], handle_locator: `${target}-session` };
    },
  };
  const lease = {
    beforeDelivery(target, observation) {
      leases.push([target, observation.session_fingerprint]);
    },
  };
  const bridge = createProviderBridge({
    registration: { workspace },
    authority,
    bindings,
    adapters,
    lease,
    owner: { kind: 'broker', instanceId: 'owner-01' },
  });
  const wake = (target, nextRevision = revision) => {
    const capsule = {
      schema: 'ai-peer-review.wake-capsule/v1',
      review_id: 'review-01',
      expected_revision: nextRevision,
      target_role: target,
      reason: 'role-actionable',
      next_command: 'peer-review resume /tmp/apr-bridge-fixture',
    };
    const fingerprint = participants[target].session_fingerprint;
    const operationId = `sha256:${createHash('sha256')
      .update(
        canonicalProjection({
          review_id: 'review-01',
          protocol_revision: nextRevision,
          target_role: target,
          session_fingerprint: fingerprint,
        })
      )
      .digest('hex')}`;
    return {
      operation_id: operationId,
      capsule,
      capsule_digest: `sha256:${createHash('sha256')
        .update(`${canonicalProjection(capsule)}\n`)
        .digest('hex')}`,
      expected_revision: nextRevision,
      target_role: target,
      target_session_fingerprint: fingerprint,
    };
  };
  return {
    bridge,
    wake,
    calls,
    reconciled,
    opens,
    leases,
    setRole(value, nextRevision) {
      role = value;
      revision = nextRevision;
    },
    setFenced(value) {
      fenced = value;
    },
  };
}

test('bridge re-observes each sealed role and wakes its own provider session', async () => {
  const f = fixture();
  assert.equal((await f.bridge.coordinatorInput.observe()).session_fingerprint, AUTHOR);
  assert.equal((await f.bridge.deliver(f.wake('author'))).status, 'acknowledged');
  f.setRole('reviewer', 5);
  assert.equal((await f.bridge.coordinatorInput.observe()).session_fingerprint, REVIEWER);
  assert.equal((await f.bridge.deliver(f.wake('reviewer'))).status, 'acknowledged');
  assert.deepEqual(
    f.calls.map((call) => [call.binding.role, call.binding.handle_locator]),
    [
      ['author', 'author-session'],
      ['reviewer', 'reviewer-session'],
    ]
  );
  assert.deepEqual(f.leases, [
    ['author', AUTHOR],
    ['reviewer', REVIEWER],
  ]);
  assert.ok(f.calls.every((call) => call.wakeOperationId !== LAUNCH));
});

test('bridge fences wrong role, revision, capsule, session, and manual takeover', async () => {
  const f = fixture();
  const valid = f.wake('author');
  for (const changed of [
    { ...valid, target_role: 'reviewer' },
    { ...valid, expected_revision: 5 },
    { ...valid, capsule_digest: REVIEWER },
    { ...valid, target_session_fingerprint: REVIEWER },
    { ...valid, operation_id: LAUNCH },
  ]) {
    await assert.rejects(() => f.bridge.deliver(changed));
  }
  f.setFenced(true);
  await assert.rejects(() => f.bridge.deliver(valid));
  assert.equal(f.calls.length, 0);
});

test('reserved wake reconciles the same role session and operation', async () => {
  const f = fixture();
  const wake = f.wake('author');
  assert.equal((await f.bridge.reconcile(wake)).status, 'not-submitted');
  assert.equal(f.reconciled.length, 1);
  assert.equal(f.reconciled[0].wakeOperationId, wake.operation_id);
  assert.equal(f.reconciled[0].binding.handle_locator, 'author-session');
  assert.equal(f.calls.length, 0);
});

test('one bootstrap worker starts its coordinator after authenticated join', async () => {
  let joined = false;
  let starts = 0;
  const worker = createReviewWorker({
    registration: { workspace },
    adapter: {
      bootstrap: true,
      automatic: true,
      coordinatorInput: { observe: async () => ({}) },
      async deliver() {
        return { status: 'acknowledged' };
      },
    },
    inspectStatus: () =>
      joined
        ? {
            state: 'reviewer-turn',
            next_action: 'reviewer-submit',
            review: { recovery: { stage: 'launched' } },
          }
        : { state: 'awaiting-reviewer', review: { recovery: { stage: 'registered' } } },
    coordinator: async ({ onStarted }) => {
      starts += 1;
      await onStarted({ stop() {} });
    },
  });
  assert.equal(await worker.start(), 'bootstrap');
  assert.equal(starts, 0);
  joined = true;
  assert.equal(await worker.reconcile(), 'automatic-wait');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(starts, 1);
  assert.equal(await worker.reconcile(), 'automatic-wait');
  assert.equal(starts, 1);
});

test('production factory keeps a verified author-only worker launch-capable and promotes it after join', async () => {
  let joined = false;
  let launchPending = false;
  let launchCalls = 0;
  let coordinatorStarts = 0;
  let coordinatorInput;
  const resourceAcquisitions = [];
  const resourceChecks = [];
  const current = () => ({
    state: {
      protocol: {
        review_id: 'review-01',
        revision: joined ? 3 : 1,
        current_actor: 'reviewer',
        startup: {
          context: { repository_root: '/tmp/project' },
          runtime: {
            ownership: 'broker',
            transport_mode: 'automatic-required',
            project_root_digest: 'a'.repeat(64),
            adapter_version: '1.0.0',
            reviewer: { selector: 'claude', model_id: 'claude-opus-5', effort: 'medium' },
          },
        },
      },
      participants: {
        author: {
          provider: 'openai',
          host: 'codex',
          model_id: 'gpt-6-astra',
          session_fingerprint: AUTHOR,
        },
        reviewer: joined
          ? {
              provider: 'anthropic',
              host: 'claude-code',
              model_id: 'claude-opus-5',
              session_fingerprint: REVIEWER,
            }
          : null,
      },
    },
  });
  const status = () => ({
    state: joined ? 'reviewer-turn' : 'awaiting-reviewer',
    next_action: joined ? 'reviewer-submit' : 'reviewer-join',
    review: {
      recovery: {
        stage: joined ? 'launched' : launchPending ? 'launch-pending' : 'registered',
        fenced: false,
        event_revision: joined ? 3 : 1,
      },
    },
  });
  const transport = (binding) => ({
    session_fingerprint: binding.session_fingerprint,
    capability: binding.host === 'codex' ? 'native-push' : 'live-wait',
    ...(binding.host === 'codex' ? { adapter: 'codex-app' } : {}),
    adapter_version: '1.0.0',
    lease: {
      schema: 'ai-peer-review.resident-lease/v1',
      process_instance_id: `${binding.role}-process`,
      pid: null,
      opaque_handle: binding.handle_locator,
      host: binding.host,
      adapter_version: '1.0.0',
      heartbeat_sequence: 1,
      observed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    },
  });
  const reviewer = {
    selector: 'claude',
    provider: 'anthropic',
    host: 'claude-code',
    adapter_version: '1.0.0',
    async observeCapabilities() {
      return {
        available: true,
        automatic: true,
        reviewerLaunchable: true,
        resource: { concurrent: true, resource_id: null },
      };
    },
    async launchReviewer() {
      launchCalls += 1;
      return { status: 'launched', observation: { session_fingerprint: REVIEWER } };
    },
    async observeLaunchResource() {
      return {
        status: 'ready',
        session_handle: 'reviewer-launch',
        observed_at: new Date().toISOString(),
      };
    },
    async observeBoundSession() {},
    async attestVersion() {},
    async observeResourceRelease() {
      return {
        status: 'complete',
        session_handle: 'reviewer-launch',
        observed_at: new Date().toISOString(),
      };
    },
    async observeResource({ binding }) {
      return {
        status: 'ready',
        session_handle: binding.handle_locator,
        observed_at: new Date().toISOString(),
      };
    },
    async observeTransport({ binding }) {
      return transport(binding);
    },
    async deliverToSession() {
      return { status: 'acknowledged' };
    },
    async reconcileDelivery() {},
  };
  const author = {
    selector: 'codex',
    provider: 'openai',
    host: 'codex',
    adapter_version: '1.0.0',
    async observeCapabilities() {
      return {
        available: true,
        automatic: true,
        resource: { concurrent: true, resource_id: null },
      };
    },
    async observeBoundSession() {},
    async attestVersion() {},
    async observeResourceRelease() {
      return {
        status: 'complete',
        session_handle: 'author',
        observed_at: new Date().toISOString(),
      };
    },
    async observeResource({ binding }) {
      return {
        status: 'ready',
        session_handle: binding.handle_locator,
        observed_at: new Date().toISOString(),
      };
    },
    async observeTransport({ binding }) {
      return transport(binding);
    },
    async deliverToSession() {
      return { status: 'acknowledged' };
    },
    async reconcileDelivery() {},
  };
  const worker = await createProductionReviewWorker({
    registration: {
      review_id: 'review-01',
      workspace,
      project_root: '/tmp/project',
      project_digest: 'a'.repeat(64),
      request_digest: 'b'.repeat(64),
      runtime: { digest: 'sha256:image' },
    },
    project: { physicalRoot: '/tmp/project', digest: 'a'.repeat(64) },
    runtimeImage: { digest: 'sha256:image' },
    invitationPath: '/tmp/project/reviewer-invitation.md',
    owner: { instanceId: 'c'.repeat(64), nonce: 'd'.repeat(64), verify: () => true },
    platform: { userId: () => 'fixture-user' },
    adapters: new Map([
      ['codex', author],
      ['claude', reviewer],
    ]),
    verifyImage: () => true,
    inspect: current,
    inspectStatus: status,
    startup: () => ({
      journal: {
        stage: joined ? 'launched' : 'registered',
        request_digest: 'b'.repeat(64),
        provider_operation: joined
          ? { status: 'acknowledged', session_fingerprint: REVIEWER }
          : null,
      },
      recovery: { fenced: false, suspending: false },
    }),
    openBinding: async ({ role }) => ({
      role,
      session_fingerprint: role === 'author' ? AUTHOR : REVIEWER,
    }),
    openSession: async ({ role }) => ({
      role,
      provider: role === 'author' ? 'openai' : 'anthropic',
      host: role === 'author' ? 'codex' : 'claude-code',
      session_fingerprint: role === 'author' ? AUTHOR : REVIEWER,
      handle_locator: `${role}-session`,
    }),
    acquireResource: () => {
      resourceAcquisitions.push(true);
      return {
        beforeDelivery: (value) => resourceChecks.push(value.session_handle),
        release: () => true,
      };
    },
    coordinator: async (input) => {
      coordinatorInput = input;
      coordinatorStarts += 1;
      await input.onStarted({ stop() {} });
    },
  });
  assert.equal(await worker.start(), 'bootstrap');
  assert.equal(coordinatorStarts, 0);
  assert.equal(typeof worker.launchReviewer, 'function');
  launchPending = true;
  await worker.launchReviewer({ operationId: LAUNCH, intentDigest: REVIEWER });
  assert.equal(launchCalls, 1);
  joined = true;
  assert.equal(await worker.reconcile(), 'automatic-wait');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(coordinatorStarts, 1);
  const wake = fixture().wake('reviewer', 3);
  assert.equal((await coordinatorInput.adapter.deliver(wake)).status, 'acknowledged');
  assert.equal(resourceAcquisitions.length, 3);
  assert.deepEqual(resourceChecks, ['reviewer-launch', 'reviewer-session']);
});
