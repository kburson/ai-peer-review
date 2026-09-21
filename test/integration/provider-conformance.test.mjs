import assert from 'node:assert/strict';
import test from 'node:test';

import { AprError } from '../../src/errors.mjs';
import { fingerprintSession } from '../../src/identity/registry.mjs';
import { createClaudeAdapter } from '../../src/providers/claude.mjs';

const expected = Object.freeze({
  provider: 'anthropic',
  host: 'claude-code',
  model_id: 'claude-opus-5',
  effort: 'high',
  adapter_version: '1.0.0',
});

function observation(overrides = {}) {
  return {
    provider: 'anthropic',
    host: 'claude-code',
    model_id: 'claude-opus-5',
    effort: 'high',
    adapter_version: '1.0.0',
    session_id: 'reviewer-session-2',
    assurance: 'runtime',
    ...overrides,
  };
}

test('launch sends only the invitation pointer and exact requested fields', async () => {
  const calls = [];
  const adapter = createClaudeAdapter({
    surface: {
      launch: async (request) => {
        calls.push(request);
        return { status: 'acknowledged', handle: 'raw-secret', observation: observation() };
      },
      observe: async () => observation(),
    },
  });
  const result = await adapter.launchReviewer({
    invitationPath: '/repo/.scratch/reviewer-invitation.md',
    expected,
    effort: 'high',
    operationId: 'operation-1',
  });
  assert.deepEqual(calls, [
    {
      invitationPath: '/repo/.scratch/reviewer-invitation.md',
      model: 'claude-opus-5',
      effort: 'high',
      operationId: 'operation-1',
    },
  ]);
  assert.equal(result.status, 'launched');
  assert.equal('handle' in result, false);
  assert.match(result.observation.session_fingerprint, /^sha256:[0-9a-f]{64}$/);
});

test('model mismatch and same-provider author session fail before claiming launch', async () => {
  for (const [observed, author] of [
    [observation({ model_id: 'claude-sonnet-5' }), null],
    [observation(), 'sha256:author'],
  ]) {
    const adapter = createClaudeAdapter({
      surface: {
        launch: async () => ({
          status: 'acknowledged',
          handle: 'raw-secret',
          observation: observed,
        }),
      },
    });
    const fingerprint = fingerprintSession('anthropic', observed.session_id);
    await assert.rejects(
      adapter.launchReviewer({
        invitationPath: '/repo/invitation.md',
        expected,
        effort: 'high',
        operationId: 'op',
        authorSessionFingerprint: author === null ? null : fingerprint,
      }),
      { code: 'APR_IDENTITY_CONFLICT' }
    );
  }
});

test('Task 8 startup launch bridge preserves the author-session exclusion', async () => {
  const observed = observation();
  const adapter = createClaudeAdapter({
    surface: {
      launch: async () => ({ status: 'acknowledged', handle: 'raw-secret', observation: observed }),
    },
  });
  const authorSessionFingerprint = fingerprintSession('anthropic', observed.session_id);
  await assert.rejects(
    adapter.launch({
      invitation: '/repo/invitation.md',
      selection: { model_id: expected.model_id, effort: expected.effort },
      requestDigest: 'startup-operation',
      authorSessionFingerprint,
    }),
    { code: 'APR_IDENTITY_CONFLICT' }
  );
});

test('provider outcome taxonomy is preserved without automatic retry', async () => {
  for (const status of ['definitely-not-submitted', 'outcome-unknown']) {
    let calls = 0;
    const adapter = createClaudeAdapter({
      surface: {
        launch: async () => {
          calls += 1;
          return { status };
        },
      },
    });
    const result = await adapter.launchReviewer({
      invitationPath: '/repo/invitation.md',
      expected,
      effort: 'high',
      operationId: status,
    });
    assert.equal(result.status, status);
    assert.equal(calls, 1);
  }
});

test('quota and provider-resource contention retain their stable errors', async () => {
  for (const code of ['APR_PROVIDER_QUOTA', 'APR_PROVIDER_RESOURCE_BUSY']) {
    const adapter = createClaudeAdapter({
      surface: {
        launch: async () => {
          throw new AprError(code, code, { recovery: 'Wait or reconcile the exact operation.' });
        },
      },
    });
    await assert.rejects(
      adapter.launchReviewer({
        invitationPath: '/repo/invitation.md',
        expected,
        effort: 'high',
        operationId: code,
      }),
      { code }
    );
  }
});

test('re-observation rejects changed sessions and incompatible adapter versions', async () => {
  let current = observation();
  const adapter = createClaudeAdapter({
    surface: {
      launch: async () => ({ status: 'acknowledged', handle: 'raw-secret', observation: current }),
      observe: async () => current,
    },
  });
  await adapter.launchReviewer({
    invitationPath: '/repo/invitation.md',
    expected,
    effort: 'high',
    operationId: 'observe',
  });
  current = observation({ session_id: 'changed-session' });
  await assert.rejects(adapter.observeSession({ operationId: 'observe', expected }), {
    code: 'APR_IDENTITY_CONFLICT',
  });
  current = observation({ adapter_version: '2.0.0' });
  await assert.rejects(adapter.observeSession({ operationId: 'observe', expected }), {
    code: 'APR_IDENTITY_CONFLICT',
  });
});
