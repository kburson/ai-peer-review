import assert from 'node:assert/strict';
import test from 'node:test';

import { createClaudeAdapter } from '../../src/providers/claude.mjs';
import { createCodexAdapter } from '../../src/providers/codex.mjs';
import { createGrokAdapter } from '../../src/providers/grok.mjs';
import { productionProviderAdapters, selectedAdapter } from '../../src/providers/registry.mjs';
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

test('native SPR is advertised only for exact launch, resume, and monitor control', async () => {
  const incomplete = createCodexAdapter({ surface: { launch: async () => ({}) } });
  assert.deepEqual(
    (await incomplete.capabilities({ selection: { classification: 'SPR' } })).native,
    []
  );

  const exact = createCodexAdapter({
    surface: {
      launch: async () => ({}),
      resume: async () => ({}),
      monitor: async () => ({}),
      observe: async () => ({}),
    },
  });
  const capabilities = await exact.capabilities({ selection: { classification: 'SPR' } });
  assert.equal(capabilities.native[0].exact_session, true);
  assert.equal(capabilities.native[0].provider, 'openai');
});

test('production registry contains every selector without a provider fallback', () => {
  const adapters = productionProviderAdapters();
  assert.deepEqual([...adapters.keys()].sort(), ['claude', 'codex', 'grok']);
  assert.equal(adapters.get('claude').provider, 'anthropic');
  adapters.clear();
  assert.equal(productionProviderAdapters().size, 3);
});

test('provider observation becomes runtime identity without exposing a raw session handle', () => {
  const identity = participantIdentityFromProviderObservation({
    role: 'reviewer',
    observation: {
      provider: 'anthropic',
      host: 'claude-code',
      model_id: 'claude-opus-5',
      model_display: 'Claude Opus 5',
      session_id: 'raw-secret',
      assurance: 'runtime',
    },
    joinedAt: '2026-09-21T00:00:00.000Z',
  });
  assert.match(identity.session_fingerprint, /^sha256:[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(identity).includes('raw-secret'), false);
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
