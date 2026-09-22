import assert from 'node:assert/strict';
import test from 'node:test';

import { createClaudeAdapter } from '../../src/providers/claude.mjs';
import { createCodexAdapter } from '../../src/providers/codex.mjs';
import { createGrokAdapter } from '../../src/providers/grok.mjs';
import {
  createProviderAdapter,
  productionProviderAdapters,
  selectedAdapter,
  SELECTORS,
} from '../../src/providers/registry.mjs';
import { participantIdentityFromProviderObservation } from '../../src/identity/registry.mjs';
import { doctor } from '../../src/doctor.mjs';

test('provider aliases resolve to exact immutable model and effort records', async () => {
  const adapter = createClaudeAdapter();
  assert.deepEqual(await adapter.resolveModel({ model: 'opus', effort: 'high' }), {
    model_id: 'claude-opus-5',
    model_display: 'Claude Opus 5',
    effort: 'high',
  });
  await assert.rejects(adapter.resolveModel({ model: 'missing', effort: 'high' }), {
    code: 'APR_REVIEWER_SELECTION_UNSUPPORTED',
  });
  await assert.rejects(adapter.resolveModel({ model: 'opus', effort: 'maximum' }), {
    code: 'APR_REVIEWER_SELECTION_UNSUPPORTED',
  });
});

test('role wake methods use the bound session and never a reviewer launch operation handle', async () => {
  const calls = [];
  const adapter = createProviderAdapter({
    selector: 'codex',
    provider: 'openai',
    host: 'codex',
    models: {},
    surface: {
      async deliverToSession(input) {
        calls.push(input);
        return { status: 'acknowledged' };
      },
      async reconcileDelivery(input) {
        calls.push(input);
        return { status: 'not-submitted' };
      },
    },
  });
  const binding = {
    role: 'author',
    provider: 'openai',
    host: 'codex',
    handle_locator: 'author-session',
  };
  await adapter.deliverToSession({ binding, wakeOperationId: 'wake-01' });
  await adapter.reconcileDelivery({ binding, wakeOperationId: 'wake-01' });
  assert.deepEqual(
    calls.map(({ handle, wakeOperationId }) => [handle, wakeOperationId]),
    [
      ['author-session', 'wake-01'],
      ['author-session', 'wake-01'],
    ]
  );
});

test('all production adapters expose the complete contract and closed provider identity', () => {
  for (const [selector, factory, provider, host] of [
    ['codex', createCodexAdapter, 'openai', 'codex'],
    ['claude', createClaudeAdapter, 'anthropic', 'claude-code'],
    ['grok', createGrokAdapter, 'xai', 'grok'],
  ]) {
    const adapter = factory();
    assert.deepEqual(selectedAdapter(selector, { [selector]: adapter }), {
      provider,
      host,
      adapter,
    });
    for (const method of [
      'resolveModel',
      'observeCapabilities',
      'launchReviewer',
      'observeSession',
      'deliver',
      'reconcile',
      'close',
    ])
      assert.equal(typeof adapter[method], 'function');
  }
});

test('unproven surfaces remain unavailable and never advertise native control', async () => {
  const adapter = createGrokAdapter();
  assert.equal('launch' in adapter, false);
  const observed = await adapter.observeCapabilities();
  assert.equal(observed.available, false);
  assert.deepEqual(observed.native, []);
  assert.deepEqual(
    observed.broker.map((entry) => entry.transport_mode),
    ['manual']
  );
  assert.deepEqual(observed.resource, { concurrent: false, resource_id: 'grok-desktop' });
});

test('Claude production adapter refuses an unpinned installed CLI version', async () => {
  const calls = [];
  const adapter = createClaudeAdapter({
    execFile: async (file, args, options) => {
      calls.push({ file, args, options });
      return { stdout: 'Claude Code 9.9.9\n', stderr: '' };
    },
  });
  const observed = await adapter.observeCapabilities();
  assert.equal(observed.available, true);
  assert.deepEqual(observed.native, []);
  assert.deepEqual(observed.transport, ['manual', 'resume-only']);
  assert.deepEqual(
    calls,
    Array.from({ length: 2 }, () => ({
      file: 'claude',
      args: ['--version'],
      options: { shell: false, encoding: 'utf8', timeout: 30_000, killSignal: 'SIGKILL' },
    }))
  );
});

test('pinned Claude stream and transcript adapter exposes exact reviewer launch capability', async () => {
  const adapter = createClaudeAdapter({
    execFile: async () => ({ stdout: '2.1.278 (Claude Code)\n', stderr: '' }),
  });
  const observed = await adapter.observeCapabilities();
  assert.equal(observed.available, true);
  assert.equal(observed.automatic, true);
  assert.equal(observed.reviewerLaunchable, true);
  assert.ok(observed.transport.includes('automatic-required'));
  const reviewer = await adapter.capabilities({ selection: { classification: 'SPR' } });
  assert.equal(reviewer.native.length, 0);
  assert.ok(reviewer.broker.some((entry) => entry.transport_mode === 'automatic-required'));
});

test('method presence without official exact-session evidence never advertises automatic SPR', async () => {
  const incomplete = createCodexAdapter({ surface: { launch: async () => ({}) } });
  assert.deepEqual(
    (await incomplete.capabilities({ selection: { classification: 'SPR' } })).native,
    []
  );

  const unproven = createCodexAdapter({
    surface: {
      launch: async () => ({}),
      resume: async () => ({}),
      monitor: async () => ({}),
      observe: async () => ({}),
    },
  });
  const capabilities = await unproven.capabilities({ selection: { classification: 'SPR' } });
  assert.deepEqual(capabilities.native, []);
  assert.equal(
    capabilities.broker.some((entry) => entry.transport_mode === 'automatic-required'),
    false
  );
});

test('author exact wake can be conformant without reviewer launch authority', async () => {
  const surface = {
    available: async () => true,
    observeBoundSession: async () => ({}),
    deliverToSession: async () => ({}),
    reconcileDelivery: async () => ({}),
    conformance: async () => ({
      surfaceVersion: 'installed-1',
      evidenceSources: { model: 'official-exact-session', session: 'official-exact-session' },
      operations: { deliverToSession: 'exact', reconcile: 'exact' },
      health: {
        installed: true,
        healthy: true,
        fresh: true,
        surfaceVersion: 'installed-1',
        adapterVersion: '1.0.0',
      },
    }),
  };
  const adapter = createProviderAdapter({
    selector: 'codex',
    provider: 'openai',
    host: 'codex',
    models: {},
    surface,
  });
  const author = await adapter.observeCapabilities();
  assert.equal(author.automatic, true);
  const reviewer = await adapter.capabilities({ selection: { classification: 'SPR' } });
  assert.equal(reviewer.native.length, 0);
});

test('production registry contains every selector without a provider fallback', () => {
  assert.deepEqual(Object.keys(SELECTORS).sort(), ['claude', 'codex', 'grok']);
  const adapters = productionProviderAdapters();
  assert.deepEqual([...adapters.keys()].sort(), ['claude', 'codex', 'grok']);
  assert.equal(adapters.get('claude').provider, 'anthropic');
  adapters.clear();
  assert.equal(productionProviderAdapters().size, 3);
});

test('safe provider observation becomes runtime identity without exposing a raw session handle', () => {
  const identity = participantIdentityFromProviderObservation({
    role: 'reviewer',
    observation: {
      provider: 'anthropic',
      host: 'claude-code',
      model_id: 'claude-opus-5',
      model_display: 'Claude Opus 5',
      session_fingerprint: `sha256:${'a'.repeat(64)}`,
      assurance: 'runtime',
    },
    joinedAt: '2026-09-21T00:00:00.000Z',
  });
  assert.equal(identity.session_fingerprint, `sha256:${'a'.repeat(64)}`);
  assert.equal(JSON.stringify(identity).includes('session_id'), false);
});

test('doctor fails a required recognized provider whose exact control surface is unproven', () => {
  const result = doctor({
    requestedMode: 'manual',
    packageResolved: true,
    skillAvailable: true,
    identity: { identity_source: 'runtime', session_fingerprint: 'sha256:x' },
    git: { repository: true, worktreeSafe: true, scratchIgnored: true },
    transport: { healthy: true, mode: 'manual' },
    providerAdapter: { selector: 'grok', available: false, adapter_version: '1.0.0' },
    providerRequired: true,
  });
  assert.equal(result.healthy, false);
  assert.deepEqual(
    result.rows.find((entry) => entry.id === 'provider-adapter'),
    {
      id: 'provider-adapter',
      status: 'unavailable',
      required: true,
      details: { selector: 'grok', available: false, adapter_version: '1.0.0' },
    }
  );
});

test('doctor automatic-required refuses unproven Codex and Grok surfaces', async () => {
  for (const adapter of [createCodexAdapter(), createGrokAdapter()]) {
    const providerAdapter = await adapter.observeCapabilities();
    const result = doctor({
      requestedMode: 'automatic-required',
      packageResolved: true,
      skillAvailable: true,
      identity: { identity_source: 'runtime', session_fingerprint: 'sha256:x' },
      git: { repository: true, worktreeSafe: true, scratchIgnored: true },
      transport: { healthy: true, mode: 'automatic-required' },
      providerAdapter,
      providerRequired: true,
    });
    assert.equal(result.healthy, false, adapter.selector);
    assert.equal(
      result.rows.find((entry) => entry.id === 'provider-adapter').status,
      'unavailable',
      adapter.selector
    );
  }
});
