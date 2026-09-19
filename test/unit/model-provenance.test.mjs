import test from 'node:test';
import assert from 'node:assert/strict';

import {
  identityChangeEvent,
  mergeObservedIdentity,
  resolveIdentity,
  v1Participant,
} from '../../src/identity/registry.mjs';

const joinedAt = '2026-09-17T12:00:00.000Z';

test('environment model declarations remain declared and provider observations preserve conflicts', () => {
  const identity = resolveIdentity({
    adapter: 'codex',
    role: 'author',
    joinedAt,
    env: { CODEX_THREAD_ID: 'codex-session-secret', CODEX_MODEL_ID: 'gpt-6-astra' },
  });

  assert.equal(identity.evidence.session.assurance, 'declared');
  assert.equal(identity.evidence.model.assurance, 'declared');
  assert.equal(identity.identity_source, 'runtime');
  assert.equal(identity.evidence.model.declared_id, 'gpt-6-astra');
  assert.equal(identity.evidence.model.observed_id, null);

  const observed = mergeObservedIdentity(identity, {
    session_fingerprint: identity.session_fingerprint,
    model_id: 'gpt-5.6-sol',
    source: 'provider-result',
  });

  assert.equal(observed.evidence.session.assurance, 'observed');
  assert.equal(observed.evidence.model.assurance, 'observed');
  assert.equal(observed.evidence.model.observed_id, 'gpt-5.6-sol');
  assert.equal(observed.evidence.model.conflict, true);
  assert.equal(JSON.stringify(observed).includes('codex-session-secret'), false);
});

test('environment-derived adapters preserve the historic v1 runtime mirror', () => {
  for (const [adapter, env] of [
    ['codex', { CODEX_THREAD_ID: 'codex-session-secret', CODEX_MODEL_ID: 'gpt-6-astra' }],
    [
      'claude',
      { CLAUDE_CODE_SESSION_ID: 'claude-session-secret', CLAUDE_MODEL_ID: 'claude-opus-5' },
    ],
    ['grok', { GROK_SESSION_ID: 'grok-session-secret', GROK_MODEL_ID: 'grok-4' }],
  ]) {
    const identity = resolveIdentity({ adapter, role: 'author', joinedAt, env });
    assert.equal(identity.identity_source, 'runtime', adapter);
    assert.equal(identity.evidence.session.source, 'environment-declaration', adapter);
    assert.equal(identity.evidence.model.source, 'environment-declaration', adapter);
    assert.equal(identity.evidence.model.assurance, 'declared', adapter);
  }
});

test('v1 participant projection excludes evidence and stays at the exact frozen shape', () => {
  const identity = resolveIdentity({
    adapter: 'codex',
    role: 'author',
    joinedAt,
    env: { CODEX_THREAD_ID: 'codex-session-secret', CODEX_MODEL_ID: 'gpt-6-astra' },
  });
  const legacy = v1Participant(identity);

  assert.deepEqual(Object.keys(legacy).sort(), [
    'host',
    'identity_source',
    'joined_at',
    'model_display',
    'model_id',
    'provider',
    'role',
    'session_fingerprint',
  ]);
  assert.equal(Object.hasOwn(legacy, 'evidence'), false);
  assert.equal(JSON.stringify(legacy).includes('codex-session-secret'), false);
});

test('identity refresh emits v2 evidence with the observed model conflict', () => {
  const declared = resolveIdentity({
    adapter: 'codex',
    role: 'author',
    joinedAt,
    env: { CODEX_THREAD_ID: 'codex-session-secret', CODEX_MODEL_ID: 'gpt-6-astra' },
  });
  const observed = mergeObservedIdentity(declared, {
    session_fingerprint: declared.session_fingerprint,
    model_id: 'gpt-5.6-sol',
    source: 'provider-result',
  });

  const event = identityChangeEvent(
    { protocol: { review_id: 'review-provenance', sequence: 2, revision: 1 } },
    declared,
    observed,
    joinedAt
  );

  assert.equal(event.schema, 'ai-peer-review.event/v2');
  assert.equal(event.payload.identity.evidence.model.declared_id, 'gpt-6-astra');
  assert.equal(event.payload.identity.evidence.model.observed_id, 'gpt-5.6-sol');
  assert.equal(event.payload.identity.evidence.model.conflict, true);
});
