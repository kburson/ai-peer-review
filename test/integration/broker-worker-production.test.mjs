import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { createProviderBridge } from '../../src/broker/provider-bridge.mjs';
import { createReviewWorker } from '../../src/broker/worker.mjs';
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
