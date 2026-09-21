import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { AprError } from '../../src/errors.mjs';
import { run, startReview } from '../../src/cli/run.mjs';
import { fingerprintSession, participantIdentity } from '../../src/identity/registry.mjs';
import { createClaudeAdapter } from '../../src/providers/claude.mjs';
import { activateStartup, prepareStartup } from '../../src/startup/runtime.mjs';
import { fixtureStartupDeps } from '../helpers/internal-api.mjs';

const NOW = '2026-09-21T00:00:00.000Z';

function repositoryFixture(prefix = 'apr-provider-') {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  execFileSync('git', ['init', '-b', 'trunk'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: root });
  mkdirSync(path.join(root, 'docs'));
  writeFileSync(path.join(root, 'docs/example.md'), '# Example\n');
  writeFileSync(path.join(root, '.git/info/exclude'), '.scratch/peer-review/\n');
  execFileSync('git', ['add', 'docs/example.md'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'fixture'], { cwd: root, stdio: 'ignore' });
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

function identity(role, session, model = 'gpt-6-astra') {
  return participantIdentity({
    role,
    host: 'codex',
    provider: 'openai',
    modelId: model,
    modelDisplay: model,
    sessionId: session,
    source: 'runtime',
    joinedAt: NOW,
  });
}

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
  const scratchRoot = mkdtempSync(path.join(tmpdir(), 'apr-provider-operation-'));
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
    scratchRoot,
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
  assert.equal(JSON.stringify(result).includes('raw-secret'), false);
  assert.equal(
    readFileSync(
      path.join(scratchRoot, 'provider', 'claude', 'operations', 'operation-1.json'),
      'utf8'
    ).includes('raw-secret'),
    true
  );
  rmSync(scratchRoot, { recursive: true, force: true });
});

test('persisted operation handles survive adapter recreation and close is operation-scoped', async (t) => {
  const scratchRoot = mkdtempSync(path.join(tmpdir(), 'apr-provider-recovery-'));
  t.after(() => rmSync(scratchRoot, { recursive: true, force: true }));
  const observedHandles = [];
  const closedHandles = [];
  const surface = {
    launch: async ({ operationId }) => ({
      status: 'acknowledged',
      handle: `raw-${operationId}`,
      observation: observation({ session_id: `session-${operationId}` }),
    }),
    observe: async (handle) => {
      observedHandles.push(handle);
      return observation({ session_id: handle.replace('raw-', 'session-') });
    },
    close: async ({ handle }) => closedHandles.push(handle),
  };
  const first = createClaudeAdapter({ surface });
  for (const operationId of ['one', 'two'])
    await first.launchReviewer({
      invitationPath: '/repo/invitation.md',
      expected,
      effort: 'high',
      operationId,
      scratchRoot,
    });

  const recovered = createClaudeAdapter({ surface });
  await recovered.observeSession({ operationId: 'one', expected, scratchRoot });
  await recovered.close({ operationId: 'one', scratchRoot });
  await recovered.observeSession({ operationId: 'two', expected, scratchRoot });
  assert.deepEqual(observedHandles, ['raw-one', 'raw-two']);
  assert.deepEqual(closedHandles, ['raw-one']);
});

test('Claude official surface rejects launch state that conflicts with the exact request', async (t) => {
  const fx = repositoryFixture('apr-claude-surface-');
  t.after(fx.cleanup);
  const started = await startReview(
    {
      reviewerProvider: 'claude',
      reviewerModel: 'claude-opus-5',
      reviewerEffort: 'medium',
      transportMode: 'manual',
      cwd: fx.root,
      artifact: 'docs/example.md',
      artifactKind: 'spec',
      identity: identity('author', 'surface-author'),
      now: NOW,
      reviewId: 'claude-surface-review',
    },
    fixtureStartupDeps
  );
  const adapter = createClaudeAdapter({
    execFile: async () => ({ stdout: 'Claude Code 9.9.9\n', stderr: '' }),
    runLaunch: async ({ contract }) => {
      const directory = path.join(contract.workspace, 'provider', 'claude');
      mkdirSync(directory, { recursive: true });
      writeFileSync(
        path.join(directory, 'launch-state.json'),
        `${JSON.stringify({
          schema: 'ai-peer-review.claude-launch-state/v1',
          review_id: contract.review_id,
          invitation: contract.invitation,
          response: contract.response,
          model: 'substituted-model',
          effort: contract.effort,
          session_handle: 'claude-session',
          session_fingerprint: `sha256:${'a'.repeat(64)}`,
          protocol_revision: 4,
        })}\n`
      );
      return { status: 'submitted' };
    },
  });
  await assert.rejects(
    adapter.launchReviewer({
      invitationPath: started.paths.reviewer_invitation,
      expected: { ...expected, effort: 'medium' },
      effort: 'medium',
      operationId: 'claude-surface-operation',
      scratchRoot: started.paths.workspace,
    }),
    { code: 'APR_CLAUDE_SESSION_INVALID' }
  );
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
  const scratchRoot = mkdtempSync(path.join(tmpdir(), 'apr-provider-observe-'));
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
    scratchRoot,
  });
  current = observation({ session_id: 'changed-session' });
  await assert.rejects(adapter.observeSession({ operationId: 'observe', expected, scratchRoot }), {
    code: 'APR_IDENTITY_CONFLICT',
  });
  current = observation({ adapter_version: '2.0.0' });
  await assert.rejects(adapter.observeSession({ operationId: 'observe', expected, scratchRoot }), {
    code: 'APR_IDENTITY_CONFLICT',
  });
  rmSync(scratchRoot, { recursive: true, force: true });
});

test('CLI start uses production adapters when no test registry is injected', async (t) => {
  const fx = repositoryFixture('apr-provider-cli-start-');
  t.after(fx.cleanup);
  let stdout = '';
  const code = await run(
    [
      'start',
      'docs/example.md',
      '--artifact-kind',
      'spec',
      '--reviewer-provider',
      'codex',
      '--reviewer-model',
      'gpt-6-astra',
      '--transport-mode',
      'manual',
    ],
    {
      ...fixtureStartupDeps,
      adapters: undefined,
      cwd: fx.root,
      env: {
        CODEX_THREAD_ID: 'author-session',
        CODEX_MODEL_ID: 'gpt-6-astra',
        CODEX_MODEL_DISPLAY: 'GPT-6 Astra',
      },
      now: new Date(NOW),
      stdout: { write: (value) => (stdout += value) },
      stderr: { write: () => {} },
    }
  );
  assert.equal(code, 0);
  assert.match(stdout, /awaiting-reviewer/);
});

test('CLI doctor reports the current provider adapter observation', async () => {
  let stdout = '';
  const code = await run(['doctor', '--json'], {
    cwd: process.cwd(),
    env: {
      CODEX_THREAD_ID: 'doctor-session',
      CODEX_MODEL_ID: 'gpt-6-astra',
      CODEX_MODEL_DISPLAY: 'GPT-6 Astra',
    },
    adapters: new Map([
      [
        'codex',
        {
          observeCapabilities: async () => ({
            selector: 'codex',
            available: false,
            adapter_version: '1.0.0',
          }),
        },
      ],
    ]),
    brokerSecurity: { healthy: true },
    stdout: { write: (value) => (stdout += value) },
    stderr: { write: () => {} },
  });
  const result = JSON.parse(stdout);
  assert.equal(code, 0);
  assert.deepEqual(
    result.rows.find((entry) => entry.id === 'provider-adapter'),
    {
      id: 'provider-adapter',
      status: 'unavailable',
      required: false,
      details: { selector: 'codex', available: false, adapter_version: '1.0.0' },
    }
  );
});

test('CLI join derives a closed runtime observation from sealed authority', async (t) => {
  const fx = repositoryFixture('apr-provider-cli-join-');
  t.after(fx.cleanup);
  const input = {
    reviewerProvider: 'codex',
    reviewerModel: 'gpt-6-astra',
    reviewerEffort: 'medium',
    transportMode: 'manual',
    cwd: fx.root,
    artifact: 'docs/example.md',
    artifactKind: 'spec',
    identity: identity('author', 'author-session'),
    now: NOW,
    reviewId: 'provider-cli-join',
  };
  const prepared = await prepareStartup(input, fixtureStartupDeps);
  const started = await activateStartup(prepared, fixtureStartupDeps);
  let stdout = '';
  let stderr = '';
  const code = await run(['join', started.paths.reviewer_invitation], {
    cwd: fx.root,
    env: {
      CODEX_THREAD_ID: 'reviewer-session',
      CODEX_MODEL_ID: 'gpt-6-astra',
      CODEX_MODEL_DISPLAY: 'GPT-6 Astra',
    },
    now: new Date(NOW),
    stdout: { write: (value) => (stdout += value) },
    stderr: { write: (value) => (stderr += value) },
  });
  assert.equal(code, 0, stderr);
  assert.match(stdout, /reviewer-turn/);
});

test('startup preserves definitely-not-submitted and stable provider failures', async (t) => {
  for (const failure of [
    { outcome: { status: 'definitely-not-submitted' }, code: 'APR_WAKE_NOT_SUBMITTED' },
    {
      error: new AprError('APR_PROVIDER_QUOTA', 'quota', { recovery: 'Wait for quota.' }),
      code: 'APR_PROVIDER_QUOTA',
    },
  ]) {
    const fx = repositoryFixture(`apr-provider-outcome-${failure.code}-`);
    t.after(fx.cleanup);
    const input = {
      reviewerProvider: 'claude',
      reviewerModel: 'claude-opus-5',
      reviewerEffort: 'medium',
      transportMode: 'manual',
      cwd: fx.root,
      artifact: 'docs/example.md',
      artifactKind: 'spec',
      identity: identity('author', `author-${failure.code}`),
      now: NOW,
      reviewId: `provider-${failure.code.toLowerCase()}`,
    };
    const deps = {
      ...fixtureStartupDeps,
      adapters: {
        claude: {
          ...fixtureStartupDeps.adapters.claude,
          launch: async () => {
            if (failure.error) throw failure.error;
            return failure.outcome;
          },
        },
      },
    };
    const prepared = await prepareStartup(input, deps);
    await assert.rejects(activateStartup(prepared, deps), { code: failure.code });
    const journal = JSON.parse(
      readFileSync(path.join(prepared.paths.scratch.absolute, 'startup-request.json'), 'utf8')
    );
    assert.equal(journal.stage, 'registered');
  }
});
