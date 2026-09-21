import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { canonicalProjection } from '../../src/protocol/service.mjs';
import { run } from '../../src/cli/run.mjs';
import { AprError } from '../../src/errors.mjs';
import { decideWake } from '../../src/coordinator/decision.mjs';
import { requestCoordinatorStop } from '../../src/coordinator/lease.mjs';
import { reserveWakeOperation } from '../../src/coordinator/ledger.mjs';
import {
  coordinatorStatus,
  reconcileWake,
  runCoordinator,
} from '../../src/coordinator/service.mjs';

const NOW = Date.parse('2026-09-13T12:00:00.000Z');
const REVIEWER = `sha256:${'b'.repeat(64)}`;
const AUTHOR = `sha256:${'a'.repeat(64)}`;
const DIGEST = `sha256:${'d'.repeat(64)}`;

function workspace(t) {
  const root = path.join(process.cwd(), '.scratch', 'test');
  mkdirSync(root, { recursive: true });
  const value = mkdtempSync(path.join(root, 'coordinator-wake-'));
  mkdirSync(path.join(value, 'deliveries'), { recursive: true });
  t.after(() => rmSync(value, { recursive: true, force: true }));
  return value;
}

function authority() {
  return {
    state: {
      protocol: {
        review_id: 'review-coordinator-01',
        sequence: 7,
        revision: 4,
        state: 'reviewer-turn',
        current_actor: 'reviewer',
        next_action: 'reviewer-submit',
        intervention: null,
      },
      participants: {
        author: { role: 'author', session_fingerprint: AUTHOR },
        reviewer: { role: 'reviewer', session_fingerprint: REVIEWER },
      },
    },
    events: [
      {
        sequence: 7,
        revision: 4,
        type: 'delivery-written',
        payload: {
          delivery: {
            delivery_id: 'author-turn-1-to-reviewer',
            recipient: 'reviewer',
            digest: DIGEST,
          },
        },
      },
    ],
  };
}

function observation() {
  return {
    session_fingerprint: REVIEWER,
    capability: 'native-push',
    adapter: 'codex-app',
    adapter_version: '2.0.0',
    lease: {
      schema: 'ai-peer-review.resident-lease/v1',
      process_instance_id: 'reviewer-process-01',
      pid: null,
      opaque_handle: 'codex:reviewer-session',
      host: 'codex',
      adapter_version: '2.0.0',
      heartbeat_sequence: 4,
      observed_at: '2026-09-13T11:59:55.000Z',
      expires_at: '2026-09-13T12:30:00.000Z',
    },
  };
}

function writeReceipt(root) {
  const delivery = authority().events[0].payload.delivery;
  writeFileSync(
    path.join(root, 'deliveries', `${delivery.delivery_id}.json`),
    canonicalProjection(delivery)
  );
}

function adapter({ reconcile = { status: 'not-submitted', reason: 'no-provider-record' } } = {}) {
  const calls = [];
  const reconciliations = [];
  return {
    name: 'codex-app-native-push',
    calls,
    reconciliations,
    async deliver(input) {
      calls.push(input);
      return { status: 'acknowledged', reason: 'adapter-acknowledged' };
    },
    async reconcile(input) {
      reconciliations.push(input);
      return reconcile;
    },
    async close() {},
  };
}

function input(root, wakeAdapter, now = NOW) {
  return {
    workspace: root,
    observation: observation(),
    adapter: wakeAdapter,
    now,
    inspect: () => authority(),
  };
}

function brokerIo(respond, evidence = {}) {
  const stdout = [];
  const stderr = [];
  const requests = [];
  return {
    cwd: process.cwd(),
    env: {},
    now: new Date(NOW),
    stdout: { write: (value) => stdout.push(String(value)) },
    stderr: { write: (value) => stderr.push(String(value)) },
    stdoutBytes: stdout,
    stderrBytes: stderr,
    brokerRequests: requests,
    brokerConnect: async ({ identity }) => {
      let used = false;
      return {
        async request(message) {
          if (used) throw new Error('broker connections accept exactly one command');
          used = true;
          requests.push({ project: identity, message });
          return respond(message);
        },
      };
    },
    brokerInspectEvidence: () => ({
      registrations: [],
      recovery_records: [],
      unreconciled_workspaces: [],
      ...evidence,
    }),
    brokerInspectWorkspaceEvidence: () => ({ ambiguous: false }),
  };
}

test('handoff and receipt authority exist before exactly one participant-visible wake', async (t) => {
  const root = workspace(t);
  writeReceipt(root);
  const wakeAdapter = adapter();
  const result = await reconcileWake(input(root, wakeAdapter));

  assert.equal(result.status, 'acknowledged');
  assert.equal(wakeAdapter.calls.length, 1);
  assert.equal(wakeAdapter.calls[0].capsule.target_role, 'reviewer');
  assert.equal(wakeAdapter.calls[0].capsule.expected_revision, 4);
  assert.equal(wakeAdapter.calls[0].capsule_text.includes('review prose'), false);
  assert.deepEqual(JSON.parse(wakeAdapter.calls[0].capsule_text), wakeAdapter.calls[0].capsule);
});

test('an unchanged twenty-minute window makes zero additional provider or model calls', async (t) => {
  const root = workspace(t);
  writeReceipt(root);
  const wakeAdapter = adapter();
  await reconcileWake(input(root, wakeAdapter));
  const calls = wakeAdapter.calls.length;
  const result = await reconcileWake(input(root, wakeAdapter, NOW + 20 * 60 * 1000));

  assert.equal(result.status, 'acknowledged');
  assert.equal(wakeAdapter.calls.length, calls);
  assert.equal(wakeAdapter.reconciliations.length, 0);
});

test('bounded coordinator status reports the latest durable outcome without session authority', async (t) => {
  const root = workspace(t);
  writeReceipt(root);
  await reconcileWake(input(root, adapter()));

  const status = coordinatorStatus(root);
  assert.deepEqual(status, {
    schema: 'ai-peer-review.coordinator-result/v1',
    command: 'status',
    review_id: 'review-coordinator-01',
    running: false,
    lease: null,
    latest: {
      operation_id: status.latest.operation_id,
      protocol_revision: 4,
      target_role: 'reviewer',
      status: 'acknowledged',
      outcome_count: 1,
    },
  });
  assert.doesNotMatch(JSON.stringify(status), /opaque_handle|session_fingerprint|capsule_text/);
});

test('closed broker CLI authenticates project routing and refuses suspension without review authority', async (t) => {
  const root = workspace(t);
  const io = brokerIo((message) => {
    if (message.command === 'status') {
      return {
        status: 'running',
        project_digest: 'fixture-project',
        package_version: '0.2.2',
        broker_protocol_version: 1,
        node_major: 24,
        reviews: 0,
      };
    }
    if (message.command === 'stop')
      return { status: 'stopping', project_digest: 'fixture-project' };
    return {
      status: 'automatic-wait',
      review_id: path.basename(root),
      project_digest: 'fixture-project',
    };
  });

  assert.equal(await run(['broker', 'reconcile', root, '--json'], io), 0);
  const reconciled = JSON.parse(io.stdoutBytes.at(-1));
  assert.equal(reconciled.command, 'reconcile');
  assert.equal(reconciled.status, 'automatic-wait');
  assert.doesNotMatch(JSON.stringify(reconciled), /opaque_handle|session_fingerprint|capsule_text/);

  assert.equal(await run(['broker', 'suspend', root, '--json'], io), 1);
  assert.equal(io.brokerRequests.length, 1);
  assert.equal(await run(['broker', 'status', '--json'], io), 0, io.stderrBytes.join(''));
  assert.equal(JSON.parse(io.stdoutBytes.at(-1)).status, 'running');
  assert.equal(await run(['broker', 'stop', '--json'], io), 0);
  assert.equal(JSON.parse(io.stdoutBytes.at(-1)).status, 'stopping');
  assert.deepEqual(
    io.brokerRequests.map(({ message }) => [message.command, message.workspace]),
    [
      ['reconcile', root],
      ['status', null],
      ['stop', null],
    ]
  );
  assert.ok(io.brokerRequests.every(({ project }) => project.physicalRoot === process.cwd()));
});

test('broker stop refuses runnable and unreconciled project work', async (t) => {
  const root = workspace(t);
  const refused = () => {
    throw new AprError('APR_BROKER_STOP_REFUSED', 'Broker owns runnable work.', {
      recovery: 'Reconcile or suspend the exact review.',
    });
  };
  const runnable = brokerIo(refused);
  assert.equal(await run(['broker', 'stop', '--json'], runnable), 1);
  assert.equal(JSON.parse(runnable.stderrBytes.at(-1)).code, 'APR_BROKER_STOP_REFUSED');
  assert.deepEqual(
    runnable.brokerRequests.map(({ message }) => message.command),
    ['stop']
  );

  const unreconciled = brokerIo(refused, {
    unreconciled_workspaces: [root],
  });
  assert.equal(await run(['broker', 'stop', '--json'], unreconciled), 1);
  assert.equal(JSON.parse(unreconciled.stderrBytes.at(-1)).code, 'APR_BROKER_STOP_REFUSED');
  assert.deepEqual(
    unreconciled.brokerRequests.map(({ message }) => message.command),
    ['stop']
  );
});

test('offline broker status reports recovery evidence without starting a broker', async (t) => {
  const root = workspace(t);
  const io = brokerIo(() => null, {
    registrations: [path.join(root, 'registration.json')],
    recovery_records: [path.join(root, 'recovery.json')],
    unreconciled_workspaces: [root],
  });
  io.brokerConnect = async () => {
    throw Object.assign(new Error('absent'), { code: 'ENOENT' });
  };
  assert.equal(await run(['broker', 'status', '--json'], io), 0);
  const status = JSON.parse(io.stdoutBytes.at(-1));
  assert.equal(status.status, 'offline');
  assert.deepEqual(status.recovery.unreconciled_workspaces, [root]);
  assert.match(status.recovery.action, /broker reconcile/);
});

test('offline broker status reads project-local startup evidence without a test projection', async (t) => {
  const projectRoot = mkdtempSync(path.join(tmpdir(), 'apr-broker-offline-'));
  t.after(() => rmSync(projectRoot, { recursive: true, force: true }));
  execFileSync('git', ['init', '-b', 'trunk'], { cwd: projectRoot, stdio: 'ignore' });
  const physicalRoot = realpathSync(projectRoot);
  const workspace = path.join(physicalRoot, '.scratch', 'peer-review', 'review-01');
  const registrations = path.join(
    physicalRoot,
    '.scratch',
    'peer-review',
    'broker',
    'registrations'
  );
  mkdirSync(workspace, { recursive: true });
  mkdirSync(registrations, { recursive: true });
  writeFileSync(path.join(registrations, 'review-01.json'), JSON.stringify({ workspace }));
  writeFileSync(
    path.join(workspace, 'startup-request.json'),
    JSON.stringify({ stage: 'outcome-unknown' })
  );
  const io = brokerIo(() => null);
  io.cwd = projectRoot;
  delete io.brokerInspectEvidence;
  io.brokerConnect = async () => {
    throw Object.assign(new Error('absent'), { code: 'ENOENT' });
  };
  assert.equal(await run(['broker', 'status', '--json'], io), 0, io.stderrBytes.join(''));
  const status = JSON.parse(io.stdoutBytes.at(-1));
  assert.deepEqual(status.recovery.registrations, [path.join(registrations, 'review-01.json')]);
  assert.deepEqual(status.recovery.unreconciled_workspaces, [workspace]);
  assert.match(status.recovery.action, /broker reconcile/);
});

test('offline broker status survives a real missing native security helper without connector injection', async (t) => {
  const projectRoot = mkdtempSync(path.join(tmpdir(), 'apr-broker-native-offline-'));
  t.after(() => rmSync(projectRoot, { recursive: true, force: true }));
  execFileSync('git', ['init', '-b', 'trunk'], { cwd: projectRoot, stdio: 'ignore' });
  const workspace = path.join(realpathSync(projectRoot), '.scratch', 'peer-review', 'review-01');
  const registrations = path.join(
    projectRoot,
    '.scratch',
    'peer-review',
    'broker',
    'registrations'
  );
  mkdirSync(workspace, { recursive: true });
  mkdirSync(registrations, { recursive: true });
  writeFileSync(path.join(registrations, 'review-01.json'), JSON.stringify({ workspace }));
  writeFileSync(
    path.join(workspace, 'startup-request.json'),
    JSON.stringify({ stage: 'outcome-unknown' })
  );
  const stdout = [];
  const stderr = [];
  const io = {
    cwd: projectRoot,
    env: {},
    brokerSecurityRoot: projectRoot,
    stdout: { write: (value) => stdout.push(String(value)) },
    stderr: { write: (value) => stderr.push(String(value)) },
  };
  assert.equal(await run(['broker', 'status', '--json'], io), 0, stderr.join(''));
  const status = JSON.parse(stdout.at(-1));
  assert.equal(status.status, 'offline');
  assert.deepEqual(status.recovery.unreconciled_workspaces, [workspace]);
  assert.equal(status.recovery.diagnostic.code, 'APR_BROKER_START_FAILED');
  assert.match(status.recovery.diagnostic.message, /security helper/);
});

test('broker reconcile never replays an ambiguous provider action', async (t) => {
  const root = workspace(t);
  const io = brokerIo(() => {
    throw new Error('must not request broker replay');
  });
  io.brokerInspectWorkspaceEvidence = () => ({ ambiguous: true });
  assert.equal(await run(['broker', 'reconcile', root, '--json'], io), 1);
  assert.equal(JSON.parse(io.stderrBytes.at(-1)).code, 'APR_WAKE_OUTCOME_UNKNOWN');
  assert.equal(io.brokerRequests.length, 0);
});

test('restart reconciles a crash after reservation before provider delivery', async (t) => {
  const root = workspace(t);
  writeReceipt(root);
  const wakeAdapter = adapter();
  const decision = decideWake({
    authority: authority(),
    delivery: {
      ...authority().events[0].payload.delivery,
      sequence: 7,
      revision: 4,
      receipt_verified: true,
    },
    observation: observation(),
    workspace: root,
    now: NOW,
  });
  reserveWakeOperation(root, decision, new Date(NOW));

  const recovered = await reconcileWake(input(root, wakeAdapter, NOW + 1000));
  assert.equal(wakeAdapter.reconciliations.length, 1);
  assert.equal(wakeAdapter.calls.length, 1);
  assert.equal(recovered.status, 'acknowledged');
  assert.deepEqual(
    recovered.outcomes.map(({ status }) => status),
    ['not-submitted', 'acknowledged']
  );
});

test('read-before-subscribe, post-subscribe reread, and duplicate hints share one key', async (t) => {
  const root = workspace(t);
  writeReceipt(root);
  const wakeAdapter = adapter();
  let hint;
  let closed = false;
  const result = await runCoordinator({
    ...input(root, wakeAdapter),
    owner: { kind: 'cli', pid: 42 },
    leaseOptions: { instanceId: 'coordinator-01', nonce: 'nonce-01' },
    subscribe(_workspace, handlers) {
      hint = handlers.onChange;
      return { close: () => (closed = true) };
    },
    async waitForStop({ reconcile, stop }) {
      hint();
      hint();
      await reconcile();
      stop();
    },
  });

  assert.equal(result.status, 'stopped');
  assert.equal(wakeAdapter.calls.length, 1);
  assert.equal(closed, true);
});

test('coordinator obtains a fresh role observation for every reconciliation', async (t) => {
  const root = workspace(t);
  writeReceipt(root);
  const wakeAdapter = adapter();
  let observed = 0;
  const result = await runCoordinator({
    ...input(root, wakeAdapter),
    observation: undefined,
    observe: async () => {
      observed += 1;
      return observation();
    },
    owner: { kind: 'cli', pid: 42 },
    leaseOptions: { instanceId: 'coordinator-fresh-01', nonce: 'nonce-fresh-01' },
    subscribe() {
      return { close() {} };
    },
    async waitForStop({ reconcile, stop }) {
      await reconcile();
      stop();
    },
  });
  assert.equal(result.status, 'stopped');
  assert.equal(observed, 3);
  assert.equal(wakeAdapter.calls.length, 1);
});

test('foreground coordinator honors only its exact durable stop request', async (t) => {
  const root = workspace(t);
  writeReceipt(root);
  const wakeAdapter = adapter();
  const result = await runCoordinator({
    ...input(root, wakeAdapter),
    owner: { kind: 'cli', pid: 42 },
    leaseOptions: { instanceId: 'coordinator-stop-01', nonce: 'nonce-stop-01' },
    subscribe(_workspace, handlers) {
      requestCoordinatorStop(root, new Date(NOW + 1000));
      handlers.onChange();
      return { close() {} };
    },
    async waitForStop() {
      throw new Error('exact stop request should prevent foreground waiting');
    },
  });

  assert.equal(result.status, 'stopped');
  assert.equal(wakeAdapter.calls.length, 1);
});

test('broker-owned coordinator lifetime exposes one controller and closes every retained resource', async (t) => {
  const root = workspace(t);
  writeReceipt(root);
  const wakeAdapter = adapter();
  const closed = [];
  let controller;
  const result = await runCoordinator({
    ...input(root, wakeAdapter),
    adapter: {
      ...wakeAdapter,
      async close() {
        closed.push('adapter');
      },
    },
    owner: { kind: 'app-host', pid: 42 },
    leaseOptions: { instanceId: 'coordinator-broker-01', nonce: 'nonce-broker-01' },
    subscribe() {
      return { close: () => closed.push('subscription') };
    },
    beforeRelease() {
      closed.push('recovery');
    },
    onStarted(value) {
      controller = value;
      value.stop();
    },
    async waitForStop() {
      throw new Error('broker controller stopped before foreground waiting');
    },
  });

  assert.equal(result.status, 'stopped');
  assert.equal(typeof controller.reconcile, 'function');
  assert.equal(typeof controller.stop, 'function');
  assert.deepEqual(closed, ['subscription', 'recovery', 'adapter']);
  assert.equal(coordinatorStatus(root).running, false);
});

test('default observation ignores its own heartbeat and reacts to only an exact stop hint', async (t) => {
  const root = workspace(t);
  writeReceipt(root);
  const watchers = [];
  let inspections = 0;
  const result = await runCoordinator({
    ...input(root, adapter()),
    inspect() {
      inspections += 1;
      return authority();
    },
    owner: { kind: 'cli', pid: 42 },
    leaseOptions: { instanceId: 'coordinator-watch-01', nonce: 'nonce-watch-01' },
    watch(target, callback) {
      const watcher = {
        target,
        callback,
        on() {},
        close() {},
      };
      watchers.push(watcher);
      return watcher;
    },
    async waitForStop() {
      assert.equal(watchers.length, 3);
      const coordinatorWatcher = watchers.find(
        ({ target }) => path.basename(target) === 'coordinator'
      );
      coordinatorWatcher.callback('change', 'coordinator-lease.json');
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(inspections, 2);

      requestCoordinatorStop(root, new Date(NOW + 1000));
      coordinatorWatcher.callback('rename', 'stop-request.json');
      await new Promise((resolve) => setImmediate(resolve));
    },
  });

  assert.equal(result.status, 'stopped');
  assert.equal(inspections, 2);
});

test('integrity and unsupported-capability failures invoke no adapter', async (t) => {
  const root = workspace(t);
  writeReceipt(root);
  const wakeAdapter = adapter();
  await assert.rejects(
    reconcileWake({
      ...input(root, wakeAdapter),
      inspect() {
        const error = new Error('event digest mismatch');
        error.code = 'APR_EVENT_LOG_CORRUPT';
        throw error;
      },
    }),
    { code: 'APR_EVENT_LOG_CORRUPT' }
  );
  assert.equal(wakeAdapter.calls.length, 0);

  await assert.rejects(
    reconcileWake({
      ...input(root, wakeAdapter),
      observation: { ...observation(), capability: 'manual', adapter: undefined },
    }),
    (error) => error.code === 'APR_TRANSPORT_UNAVAILABLE'
  );
  assert.equal(wakeAdapter.calls.length, 0);
});
