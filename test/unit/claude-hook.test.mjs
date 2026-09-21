import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  captureClaudeStartHook,
  captureClaudeStartHookWhenPresent,
  readClaudeStartHook,
  readClaudeStartHookForSession,
} from '../../src/providers/claude-hook.mjs';
import { createClaudeProviderSurface } from '../../src/providers/claude.mjs';

const SESSION = '11111111-1111-4111-8111-111111111111';
const TOKEN = 'a'.repeat(32);
const COMMAND = 'peer-review start --reviewer-provider claude';

function fixture(t, { model = 'claude-opus-5', command = COMMAND } = {}) {
  const root = mkdtempSync(path.join(process.cwd(), '.scratch', 'claude-hook-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const directory = path.join(root, '.claude', 'projects', 'project');
  mkdirSync(directory, { recursive: true });
  const transcript = path.join(directory, `${SESSION}.jsonl`);
  writeFileSync(
    transcript,
    `${JSON.stringify({
      type: 'assistant',
      sessionId: SESSION,
      version: '2.1.278',
      timestamp: new Date().toISOString(),
      message: {
        role: 'assistant',
        model,
        content: [{ type: 'tool_use', id: 'call-start-01', name: 'Bash', input: { command } }],
      },
    })}\n`,
    { mode: 0o600 }
  );
  return {
    root,
    event: {
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_use_id: 'call-start-01',
      session_id: SESSION,
      transcript_path: transcript,
      cwd: root,
      tool_input: { command: COMMAND },
    },
  };
}

test('Claude PreToolUse binds exact transcript model, session, and start command', (t) => {
  const { root, event } = fixture(t);
  const output = captureClaudeStartHook({ event, sourceVersion: '2.1.278', token: TOKEN });
  assert.equal(output.hookSpecificOutput.permissionDecision, 'allow');
  assert.equal(
    output.hookSpecificOutput.updatedInput.command,
    `APR_CLAUDE_HOOK_TOKEN=${TOKEN} CLAUDE_CODE_SESSION_ID=${SESSION} CLAUDE_MODEL_ID=claude-opus-5 ${COMMAND}`
  );
  const observed = readClaudeStartHook({
    root,
    token: TOKEN,
    sessionId: SESSION,
    operationId: 'start:review-01',
  });
  assert.equal(observed.model_id, 'claude-opus-5');
  assert.equal(observed.session_id, SESSION);
  assert.equal(observed.operation_id, 'start:review-01');
});

test('Claude start hook refuses transcript model or tool-use divergence', (t) => {
  const changed = fixture(t, { command: 'peer-review status /tmp/review' });
  assert.throws(() =>
    captureClaudeStartHook({ event: changed.event, sourceVersion: '2.1.278', token: TOKEN })
  );
  const missing = fixture(t);
  assert.throws(() =>
    captureClaudeStartHook({
      event: { ...missing.event, tool_use_id: 'call-other' },
      sourceVersion: '2.1.278',
      token: TOKEN,
    })
  );
});

test('Claude start hook waits briefly for the same provider tool use to reach its transcript', async (t) => {
  const { event } = fixture(t);
  const bytes = readFileSync(event.transcript_path);
  writeFileSync(event.transcript_path, '{"type":"user"}\n');
  setTimeout(() => writeFileSync(event.transcript_path, bytes), 15);
  const output = await captureClaudeStartHookWhenPresent(
    { event, sourceVersion: '2.1.278', token: TOKEN },
    { delay: 20, attempts: 4 }
  );
  assert.equal(output.hookSpecificOutput.permissionDecision, 'allow');
});

test('verified active Claude author tool use supplies a current automatic transport lease', async (t) => {
  const { root, event } = fixture(t);
  captureClaudeStartHook({ event, sourceVersion: '2.1.278', token: TOKEN });
  const observed = readClaudeStartHook({
    root,
    token: TOKEN,
    sessionId: SESSION,
    operationId: 'start:review-01',
  });
  const surface = createClaudeProviderSurface({
    execFile: async () => ({ stdout: '2.1.278 (Claude Code)\n' }),
  });
  const transport = await surface.observeTransport({
    binding: {
      role: 'author',
      model_id: 'claude-opus-5',
      handle_locator: SESSION,
      session_fingerprint: `sha256:${'a'.repeat(64)}`,
    },
    projectRoot: root,
    activeEvidence: observed,
  });
  assert.equal(transport.capability, 'live-wait');
  assert.equal(transport.session_fingerprint, `sha256:${'a'.repeat(64)}`);
  assert.equal(transport.lease.opaque_handle, SESSION);
});

test('running broker reopens exactly one owner-only Claude start hook without inherited token', (t) => {
  const { root, event } = fixture(t);
  captureClaudeStartHook({ event, sourceVersion: '2.1.278', token: TOKEN });
  assert.equal(
    readClaudeStartHookForSession({ root, sessionId: SESSION, operationId: 'start:review-01' })
      .model_id,
    'claude-opus-5'
  );
  const claudeHome = path.join(root, '.claude');
  const providerDirectory = path.join(claudeHome, 'projects', root.replace(/[^A-Za-z0-9]/g, '-'));
  mkdirSync(providerDirectory, { recursive: true });
  copyFileSync(event.transcript_path, path.join(providerDirectory, `${SESSION}.jsonl`));
  const surface = createClaudeProviderSurface({ claudeHome });
  assert.equal(
    surface.observeBoundSession({
      projectRoot: root,
      workspace: root,
      handleLocator: SESSION,
      expected: { operation_id: 'start:review-01' },
    }).model_id,
    'claude-opus-5'
  );
  captureClaudeStartHook({ event, sourceVersion: '2.1.278', token: 'b'.repeat(32) });
  assert.throws(() =>
    readClaudeStartHookForSession({ root, sessionId: SESSION, operationId: 'start:review-01' })
  );
});
