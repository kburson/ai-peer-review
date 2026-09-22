import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { AprError } from '../../src/errors.mjs';
import {
  openParticipantBinding,
  recordParticipantBinding,
} from '../../src/broker/participant-binding.mjs';
import {
  createClaudeStreamRecorder,
  createClaudeStreamingExec,
  collectClaudeStream,
  readClaudeStreamObservation,
  readClaudeSessionSnapshot,
} from '../../src/providers/claude-stream.mjs';
import { run, startReview } from '../../src/cli/run.mjs';
import { fingerprintSession, participantIdentity } from '../../src/identity/registry.mjs';
import { createClaudeAdapter } from '../../src/providers/claude.mjs';
import { createCodexProviderSurface } from '../../src/providers/codex.mjs';
import { readCodexSessionSnapshot } from '../../src/providers/codex-session.mjs';
import { captureCodexStartHook, readCodexStartHook } from '../../src/providers/codex-hook.mjs';
import { activateStartup, prepareStartup } from '../../src/startup/runtime.mjs';
import { fixtureStartupDeps } from '../helpers/internal-api.mjs';

const NOW = '2026-09-21T00:00:00.000Z';

test('Claude dormant-session snapshot reads current provider-owned terminal state', (t) => {
  const fixture = repositoryFixture('apr-claude-snapshot-');
  t.after(fixture.cleanup);
  const claudeHome = path.join(fixture.root, '.scratch', 'test', 'claude-home');
  const sessionId = '989532be-1441-41db-94e5-99806cae2772';
  const directory = path.join(claudeHome, 'projects', fixture.root.replace(/[^A-Za-z0-9]/g, '-'));
  mkdirSync(directory, { recursive: true });
  const transcript = path.join(directory, `${sessionId}.jsonl`);
  writeFileSync(
    transcript,
    [
      { type: 'user', sessionId, timestamp: '2026-09-21T14:34:00.000Z' },
      {
        type: 'assistant',
        sessionId,
        timestamp: '2026-09-21T14:35:00.000Z',
        version: '2.1.278',
        message: { role: 'assistant', model: 'claude-opus-5', stop_reason: 'end_turn' },
      },
    ]
      .map((value) => JSON.stringify(value))
      .join('\n') + '\n',
    { mode: 0o600 }
  );
  const snapshot = readClaudeSessionSnapshot({
    projectRoot: fixture.root,
    sessionId,
    claudeHome,
    now: '2026-09-21T18:00:00.000Z',
  });
  assert.equal(snapshot.model_id, 'claude-opus-5');
  assert.equal(snapshot.observed_at, '2026-09-21T18:00:00.000Z');
  assert.equal(snapshot.last_turn_at, '2026-09-21T14:35:00.000Z');
  assert.equal(snapshot.phase, 'terminal-snapshot');
  writeFileSync(
    transcript,
    `${readFileSync(transcript, 'utf8')}${JSON.stringify({ type: 'user', sessionId, timestamp: '2026-09-21T17:59:00.000Z' })}\n`,
    { mode: 0o600 }
  );
  assert.throws(
    () => readClaudeSessionSnapshot({ projectRoot: fixture.root, sessionId, claudeHome }),
    { code: 'APR_CLAUDE_SESSION_ACTIVE' }
  );
});

test('Codex start hook binds the exact pending tool use to provider model and session', (t) => {
  const fixture = repositoryFixture('apr-codex-hook-');
  t.after(fixture.cleanup);
  const command = 'peer-review start docs/example.md --artifact-kind spec';
  const captured = captureCodexStartHook({
    event: {
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command },
      tool_use_id: 'call-start-1',
      turn_id: 'turn-private',
      session_id: 'session-private',
      model: 'gpt-5.6-sol',
      cwd: fixture.root,
    },
    sourceVersion: '0.155.0-alpha.9.2',
    token: 'a'.repeat(32),
    observedAt: '2026-09-21T14:35:00.000Z',
  });
  assert.equal(
    captured.hookSpecificOutput.updatedInput.command,
    `APR_CODEX_HOOK_TOKEN=${'a'.repeat(32)} ${command}`
  );
  const observed = readCodexStartHook({
    root: fixture.root,
    token: 'a'.repeat(32),
    sessionId: 'session-private',
    operationId: 'start:review-1',
  });
  assert.equal(observed.model_id, 'gpt-5.6-sol');
  assert.equal(observed.session_id, 'session-private');
  assert.equal(observed.operation_id, 'start:review-1');
  assert.equal(observed.tool_use_id, 'call-start-1');
  assert.equal(JSON.stringify(captured).includes('session-private'), false);
});

test('Codex surface refuses an absent exact start hook and reads a matching one', async (t) => {
  const fixture = repositoryFixture('apr-codex-surface-');
  t.after(fixture.cleanup);
  const surface = createCodexProviderSurface({
    executeVersion: async () => '0.155.0-alpha.9.2',
  });
  assert.throws(
    () =>
      surface.observeCurrentSession({
        root: fixture.root,
        token: null,
        handleLocator: 'private-session',
        operationId: 'start:review-2',
      }),
    { code: 'APR_CODEX_HOOK_INVALID' }
  );
  captureCodexStartHook({
    event: {
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'peer-review start docs/example.md --artifact-kind spec' },
      tool_use_id: 'call-start-2',
      turn_id: 'turn-private',
      session_id: 'private-session',
      model: 'gpt-5.6-sol',
      cwd: fixture.root,
    },
    sourceVersion: '0.155.0-alpha.9.2',
    token: 'b'.repeat(32),
    observedAt: '2026-09-21T14:35:00.000Z',
  });
  const observed = surface.observeCurrentSession({
    root: fixture.root,
    token: 'b'.repeat(32),
    handleLocator: 'private-session',
    operationId: 'start:review-2',
  });
  assert.equal(observed.model_id, 'gpt-5.6-sol');
  assert.equal(await surface.version(), '0.155.0-alpha.9.2');
});

test('Codex dormant-session snapshot requires a terminal turn in the exact provider record', (t) => {
  const fixture = repositoryFixture('apr-codex-snapshot-');
  t.after(fixture.cleanup);
  const codexHome = path.join(fixture.root, '.scratch', 'test', 'codex-home');
  const directory = path.join(codexHome, 'sessions', '2026', '09', '21');
  mkdirSync(directory, { recursive: true });
  const sessionId = '989532be-1441-41db-94e5-99806cae2772';
  const file = path.join(directory, `rollout-2026-09-21T14-00-00-${sessionId}.jsonl`);
  const records = [
    {
      type: 'session_meta',
      payload: { id: sessionId, cwd: fixture.root, cli_version: '0.155.0-alpha.9.2' },
    },
    {
      type: 'turn_context',
      timestamp: '2026-09-21T14:00:00.000Z',
      payload: { turn_id: 'turn-one', cwd: fixture.root, model: 'gpt-5.6-sol' },
    },
    {
      type: 'event_msg',
      timestamp: '2026-09-21T14:01:00.000Z',
      payload: { type: 'task_complete', turn_id: 'turn-one' },
    },
  ];
  writeFileSync(file, `${records.map((record) => JSON.stringify(record)).join('\n')}\n`, {
    mode: 0o600,
  });
  const observed = readCodexSessionSnapshot({
    codexHome,
    projectRoot: fixture.root,
    sessionId,
    now: '2026-09-21T18:00:00.000Z',
  });
  assert.equal(observed.model_id, 'gpt-5.6-sol');
  assert.equal(observed.source_version, '0.155.0-alpha.9.2');
  records.push({
    type: 'turn_context',
    timestamp: '2026-09-21T17:59:00.000Z',
    payload: { turn_id: 'turn-two', cwd: fixture.root, model: 'gpt-5.6-sol' },
  });
  writeFileSync(file, `${records.map((record) => JSON.stringify(record)).join('\n')}\n`, {
    mode: 0o600,
  });
  assert.throws(
    () => readCodexSessionSnapshot({ codexHome, projectRoot: fixture.root, sessionId }),
    { code: 'APR_CODEX_SESSION_INVALID' }
  );
});

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

test('role bindings keep distinct provider handles private and re-observe after restart', async (t) => {
  mkdirSync(path.join(process.cwd(), '.scratch/test'), { recursive: true });
  const workspace = mkdtempSync(path.join(process.cwd(), '.scratch/test/88-bindings-'));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const attestation = {
    source: 'pinned-runtime',
    adapter_version: '1.0.0',
    surface_version: '2.1.278',
  };
  const roles = [
    { role: 'author', session: 'claude-author-private', operation: 'start:review-1' },
    { role: 'reviewer', session: 'claude-reviewer-private', operation: 'join:review-1' },
  ];
  for (const item of roles) {
    const authority = {
      review_id: 'review-1',
      selector: 'claude',
      provider: 'anthropic',
      host: 'claude-code',
      model_id: 'claude-opus-5',
      effort: 'medium',
      adapter_version: '1.0.0',
      operation_id: item.operation,
    };
    const providerEvidence = {
      source: 'official-exact-session',
      source_version: '2.1.278',
      observed_at: '2026-09-21T14:35:00.000Z',
      operation_id: item.operation,
      provider: 'anthropic',
      host: 'claude-code',
      model_id: 'claude-opus-5',
      session_id: item.session,
      phase: 'tool-use',
      tool_use_id: `tool-${item.role}`,
    };
    const recorded = recordParticipantBinding({
      workspace,
      role: item.role,
      authority,
      providerEvidence,
      adapterAttestation: attestation,
      handleLocator: item.session,
      now: '2026-09-21T14:36:00.000Z',
    });
    assert.equal(recorded.role, item.role);
    assert.equal(JSON.stringify(recorded).includes(item.session), false);
    const reopened = await openParticipantBinding({
      workspace,
      role: item.role,
      authority,
      adapters: {
        claude: {
          observeBoundSession: async ({ handleLocator }) => ({
            source: 'official-session-record',
            source_version: '2.1.278',
            last_turn_at: '2026-09-21T14:35:00.000Z',
            provider: 'anthropic',
            host: 'claude-code',
            model_id: 'claude-opus-5',
            session_id: handleLocator,
            observed_at: '2026-09-21T18:00:00.000Z',
            phase: 'terminal-snapshot',
          }),
          attestVersion: async () => attestation,
        },
      },
      now: '2026-09-21T18:01:00.000Z',
    });
    assert.equal(reopened.session_fingerprint, recorded.session_fingerprint);
    assert.equal(JSON.stringify(reopened).includes(item.session), false);
  }
});

test('XPR restart keeps Codex author and Claude reviewer bindings separate and fences a changed author handle', async (t) => {
  mkdirSync(path.join(process.cwd(), '.scratch/test'), { recursive: true });
  const workspace = mkdtempSync(path.join(process.cwd(), '.scratch/test/88-xpr-bindings-'));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const roles = [
    {
      role: 'author',
      selector: 'codex',
      provider: 'openai',
      host: 'codex',
      model_id: 'gpt-5.6-sol',
      session: 'codex-session-private',
      source_version: '0.155.0-alpha.9.2',
      operation_id: 'start:review-xpr',
    },
    {
      role: 'reviewer',
      selector: 'claude',
      provider: 'anthropic',
      host: 'claude-code',
      model_id: 'claude-opus-5',
      session: 'claude-session-private',
      source_version: '2.1.278',
      operation_id: 'join:review-xpr',
    },
  ];
  const adapters = {};
  for (const item of roles) {
    const authority = {
      review_id: 'review-xpr',
      selector: item.selector,
      provider: item.provider,
      host: item.host,
      model_id: item.model_id,
      adapter_version: '1.0.0',
      operation_id: item.operation_id,
    };
    item.authority = authority;
    const attestation = {
      source: 'pinned-runtime',
      adapter_version: '1.0.0',
      surface_version: item.source_version,
    };
    recordParticipantBinding({
      workspace,
      role: item.role,
      authority,
      providerEvidence: {
        source: 'official-exact-session',
        source_version: item.source_version,
        observed_at: '2026-09-21T14:35:00.000Z',
        operation_id: item.operation_id,
        provider: item.provider,
        host: item.host,
        model_id: item.model_id,
        session_id: item.session,
        phase: 'tool-use',
        tool_use_id: `tool-${item.role}`,
      },
      adapterAttestation: attestation,
      handleLocator: item.session,
      now: '2026-09-21T14:36:00.000Z',
    });
    adapters[item.selector] = {
      observeBoundSession: async ({ handleLocator }) => ({
        source: 'official-session-record',
        source_version: item.source_version,
        observed_at: '2026-09-21T18:00:00.000Z',
        last_turn_at: '2026-09-21T14:35:00.000Z',
        provider: item.provider,
        host: item.host,
        model_id: item.model_id,
        session_id: handleLocator,
        phase: 'terminal-snapshot',
      }),
      attestVersion: async () => attestation,
    };
  }
  for (const item of roles) {
    const reopened = await openParticipantBinding({
      workspace,
      role: item.role,
      authority: item.authority,
      adapters,
      now: '2026-09-21T18:01:00.000Z',
    });
    assert.equal(reopened.provider, item.provider);
    assert.equal(JSON.stringify(reopened).includes(item.session), false);
  }
  const authorFile = path.join(workspace, 'provider', 'bindings', 'author.json');
  const tampered = JSON.parse(readFileSync(authorFile, 'utf8'));
  tampered.handle_locator = 'substituted-codex-session';
  writeFileSync(authorFile, `${JSON.stringify(tampered)}\n`, { mode: 0o600 });
  assert.rejects(
    openParticipantBinding({
      workspace,
      role: 'author',
      authority: roles[0].authority,
      adapters,
      now: '2026-09-21T18:01:00.000Z',
    }),
    { code: 'APR_IDENTITY_CONFLICT' }
  );
});

test('active reviewer join may re-observe its fresh provider tool use before the transcript is terminal', async (t) => {
  mkdirSync(path.join(process.cwd(), '.scratch/test'), { recursive: true });
  const workspace = mkdtempSync(path.join(process.cwd(), '.scratch/test/88-active-join-'));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const authority = {
    review_id: 'review-active',
    selector: 'claude',
    provider: 'anthropic',
    host: 'claude-code',
    model_id: 'claude-opus-5',
    adapter_version: '1.0.0',
    operation_id: 'join:review-active',
  };
  const providerEvidence = {
    source: 'official-exact-session',
    source_version: '2.1.278',
    observed_at: '2026-09-21T18:00:00.000Z',
    operation_id: authority.operation_id,
    provider: authority.provider,
    host: authority.host,
    model_id: authority.model_id,
    session_id: 'active-session-private',
    phase: 'tool-use',
    tool_use_id: 'tool-active-join',
  };
  const adapterAttestation = {
    source: 'pinned-runtime',
    adapter_version: '1.0.0',
    surface_version: '2.1.278',
  };
  recordParticipantBinding({
    workspace,
    role: 'reviewer',
    authority,
    providerEvidence,
    adapterAttestation,
    handleLocator: providerEvidence.session_id,
    now: '2026-09-21T18:00:00.000Z',
  });
  const adapters = {
    claude: {
      observeBoundSession: async () => providerEvidence,
      attestVersion: async () => adapterAttestation,
    },
  };
  const reopened = await openParticipantBinding({
    workspace,
    role: 'reviewer',
    authority,
    adapters,
    now: '2026-09-21T18:01:00.000Z',
  });
  assert.equal(reopened.role, 'reviewer');
  await assert.rejects(
    openParticipantBinding({
      workspace,
      role: 'reviewer',
      authority,
      adapters,
      now: '2026-09-21T18:06:00.000Z',
    }),
    { code: 'APR_IDENTITY_CONFLICT' }
  );
});

test('Claude live stream binds a join tool use to its exact active model and session', (t) => {
  mkdirSync(path.join(process.cwd(), '.scratch/test'), { recursive: true });
  const workspace = mkdtempSync(path.join(process.cwd(), '.scratch/test/88-claude-stream-'));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const recorder = createClaudeStreamRecorder({
    workspace,
    operationId: 'join:review-1',
    expectedCommand: 'peer-review join /repo/reviewer-invitation.md',
  });
  recorder.accept({
    type: 'system',
    subtype: 'init',
    model: 'claude-opus-5',
    session_id: 'private-claude-session',
    claude_code_version: '2.1.278',
  });
  recorder.accept({
    type: 'assistant',
    session_id: 'private-claude-session',
    timestamp: '2026-09-21T14:35:00.000Z',
    message: {
      model: 'claude-opus-5',
      content: [
        {
          type: 'tool_use',
          id: 'tool-join-1',
          name: 'Bash',
          input: { command: 'peer-review join /repo/reviewer-invitation.md' },
        },
      ],
    },
  });
  const observed = readClaudeStreamObservation({
    workspace,
    operationId: 'join:review-1',
    handleLocator: 'private-claude-session',
  });
  assert.equal(observed.model_id, 'claude-opus-5');
  assert.equal(observed.session_id, 'private-claude-session');
  assert.equal(observed.tool_use_id, 'tool-join-1');
  assert.equal(observed.source_version, '2.1.278');
  assert.equal(observed.phase, 'tool-use');
});

test('Claude stream observation is persisted before the provider process exits', async (t) => {
  mkdirSync(path.join(process.cwd(), '.scratch/test'), { recursive: true });
  const workspace = mkdtempSync(path.join(process.cwd(), '.scratch/test/88-stream-process-'));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const recorder = createClaudeStreamRecorder({
    workspace,
    operationId: 'join:stream-process',
    expectedCommand: 'peer-review join /repo/invitation.md',
  });
  const script = [
    "const fs=require('node:fs');",
    "const init={type:'system',subtype:'init',model:'claude-opus-5',session_id:'stream-session',claude_code_version:'2.1.278'};",
    "const use={type:'assistant',session_id:'stream-session',timestamp:'2026-09-21T14:35:00.000Z',message:{model:'claude-opus-5',content:[{type:'tool_use',id:'tool-stream',name:'Bash',input:{command:'peer-review join /repo/invitation.md'}}]}};",
    "process.stdout.write(JSON.stringify(init)+'\\n'+JSON.stringify(use)+'\\n');",
    "setTimeout(()=>{if(!fs.existsSync(process.argv[1]))process.exit(42);process.stdout.write(JSON.stringify({type:'result',session_id:'stream-session',result:'done'})+'\\n');},200);",
  ].join('');
  const child = spawn(
    process.execPath,
    [
      '-e',
      script,
      path.join(
        workspace,
        'provider/claude/observations',
        `${createHash('sha256').update('join:stream-process').digest('hex')}.json`
      ),
    ],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  const execution = await collectClaudeStream({ child, recorder });
  assert.equal(execution.exit_code, 0);
  assert.equal(JSON.parse(execution.stdout).session_id, 'stream-session');
  assert.equal(
    readClaudeStreamObservation({
      workspace,
      operationId: 'join:stream-process',
      handleLocator: 'stream-session',
    }).model_id,
    'claude-opus-5'
  );
});

test('Claude streaming executor requests real-time JSON and a terminal result', async (t) => {
  mkdirSync(path.join(process.cwd(), '.scratch/test'), { recursive: true });
  const workspace = mkdtempSync(path.join(process.cwd(), '.scratch/test/88-stream-exec-'));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const recorder = createClaudeStreamRecorder({
    workspace,
    operationId: 'join:stream-exec',
    expectedCommand: 'peer-review join /repo/invitation.md',
  });
  let launchedArgs;
  const execute = createClaudeStreamingExec({
    recorder,
    spawnProcess: (_file, args) => {
      launchedArgs = args;
      return spawn(process.execPath, [
        '-e',
        "process.stdout.write(JSON.stringify({type:'system',subtype:'init',model:'claude-opus-5',session_id:'stream-exec-session',claude_code_version:'2.1.278'})+'\\n'+JSON.stringify({type:'assistant',session_id:'stream-exec-session',timestamp:'2026-09-21T14:35:00.000Z',message:{model:'claude-opus-5',content:[{type:'tool_use',id:'tool-exec',name:'Bash',input:{command:'peer-review join /repo/invitation.md'}}]}})+'\\n'+JSON.stringify({type:'result',session_id:'stream-exec-session',result:'done'})+'\\n')",
      ]);
    },
  });
  const result = await execute('claude', ['-p', 'review', '--output-format', 'json'], {});
  assert.deepEqual(launchedArgs, ['-p', 'review', '--output-format', 'stream-json', '--verbose']);
  assert.equal(JSON.parse(result.stdout).session_id, 'stream-exec-session');
});

test('Claude adapter reads exact stream evidence and attests its executing version separately', async (t) => {
  mkdirSync(path.join(process.cwd(), '.scratch/test'), { recursive: true });
  const workspace = mkdtempSync(path.join(process.cwd(), '.scratch/test/88-claude-adapter-'));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const recorder = createClaudeStreamRecorder({
    workspace,
    operationId: 'join:review-2',
    expectedCommand: 'peer-review join /repo/invitation.md',
  });
  recorder.accept({
    type: 'system',
    subtype: 'init',
    model: 'claude-opus-5',
    session_id: 'private-claude-reviewer',
    claude_code_version: '2.1.278',
  });
  recorder.accept({
    type: 'assistant',
    session_id: 'private-claude-reviewer',
    timestamp: '2026-09-21T14:35:00.000Z',
    message: {
      model: 'claude-opus-5',
      content: [
        {
          type: 'tool_use',
          id: 'tool-join-2',
          name: 'Bash',
          input: { command: 'peer-review join /repo/invitation.md' },
        },
      ],
    },
  });
  const adapter = createClaudeAdapter({
    surface: {
      available: async () => true,
      version: async () => '2.1.278',
      observeCurrentSession: readClaudeStreamObservation,
    },
  });
  const observed = await adapter.observeCurrentSession({
    operationId: 'join:review-2',
    workspace,
    handleLocator: 'private-claude-reviewer',
  });
  const attested = await adapter.attestVersion({});
  assert.equal(observed.model_id, 'claude-opus-5');
  assert.equal(attested.source, 'pinned-runtime');
  assert.equal(attested.adapter_version, '1.0.0');
  assert.equal(attested.surface_version, '2.1.278');
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

test('CLI join refuses runtime identity derived only from sealed request values', async (t) => {
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
  assert.equal(code, 1, stdout);
  assert.match(stderr, /APR_IDENTITY_CONFLICT/);
});

test('CLI join binds provider stream observation with the executing Claude adapter', async (t) => {
  const fx = repositoryFixture('apr-provider-cli-verified-join-');
  t.after(fx.cleanup);
  const adapter = createClaudeAdapter({
    surface: {
      available: async () => true,
      version: async () => '2.1.278',
      observeCurrentSession: readClaudeStreamObservation,
    },
  });
  const reviewId = 'provider-cli-verified-join';
  const prepared = await prepareStartup(
    {
      reviewerProvider: 'claude',
      reviewerModel: 'claude-opus-5',
      reviewerEffort: 'medium',
      transportMode: 'manual',
      cwd: fx.root,
      artifact: 'docs/example.md',
      artifactKind: 'spec',
      identity: identity('author', 'verified-author'),
      now: NOW,
      reviewId,
    },
    { ...fixtureStartupDeps, adapters: { claude: adapter } }
  );
  const started = await activateStartup(prepared, {
    ...fixtureStartupDeps,
    adapters: { claude: adapter },
  });
  const recorder = createClaudeStreamRecorder({
    workspace: started.paths.workspace,
    operationId: `join:${reviewId}`,
    expectedCommand: `peer-review join ${started.paths.reviewer_invitation}`,
  });
  recorder.accept({
    type: 'system',
    subtype: 'init',
    model: 'claude-opus-5',
    session_id: 'verified-reviewer',
    claude_code_version: '2.1.278',
  });
  recorder.accept({
    type: 'assistant',
    session_id: 'verified-reviewer',
    timestamp: NOW,
    message: {
      model: 'claude-opus-5',
      content: [
        {
          type: 'tool_use',
          id: 'tool-join-verified',
          name: 'Bash',
          input: { command: `peer-review join ${started.paths.reviewer_invitation}` },
        },
      ],
    },
  });
  let stdout = '';
  let stderr = '';
  const code = await run(['join', started.paths.reviewer_invitation], {
    cwd: fx.root,
    env: {
      CLAUDE_CODE_SESSION_ID: 'verified-reviewer',
      CLAUDE_MODEL_ID: 'claude-opus-5',
      CLAUDE_MODEL_DISPLAY: 'Claude Opus 5',
    },
    adapters: { claude: adapter },
    now: new Date(NOW),
    stdout: { write: (value) => (stdout += value) },
    stderr: { write: (value) => (stderr += value) },
  });
  assert.equal(code, 0, stderr);
  assert.match(stdout, /reviewer-turn/);
  const binding = JSON.parse(
    readFileSync(path.join(started.paths.workspace, 'provider/bindings/reviewer.json'), 'utf8')
  );
  assert.equal(binding.provider, 'anthropic');
  assert.equal(binding.handle_locator, 'verified-reviewer');
  const bindingFile = path.join(started.paths.workspace, 'provider/bindings/reviewer.json');
  unlinkSync(bindingFile);
  stderr = '';
  const retry = await run(['join', started.paths.reviewer_invitation], {
    cwd: fx.root,
    env: {
      CLAUDE_CODE_SESSION_ID: 'verified-reviewer',
      CLAUDE_MODEL_ID: 'claude-opus-5',
      CLAUDE_MODEL_DISPLAY: 'Claude Opus 5',
    },
    adapters: { claude: adapter },
    now: new Date(NOW),
    stdout: { write: () => {} },
    stderr: { write: (value) => (stderr += value) },
  });
  assert.equal(retry, 0, stderr);
  assert.equal(JSON.parse(readFileSync(bindingFile, 'utf8')).handle_locator, 'verified-reviewer');
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
      reviewerProvider: 'codex',
      reviewerModel: 'gpt-test',
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
        codex: {
          ...fixtureStartupDeps.adapters.codex,
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
