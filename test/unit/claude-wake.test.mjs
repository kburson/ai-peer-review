import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  createClaudeWakeRecorder,
  readClaudeWakeOutcome,
} from '../../src/providers/claude-stream.mjs';
import { createClaudeProviderSurface } from '../../src/providers/claude.mjs';

const SESSION = '11111111-1111-4111-8111-111111111111';
const OPERATION = `sha256:${'a'.repeat(64)}`;
const DIGEST = `sha256:${'b'.repeat(64)}`;

function fixture(t, entries) {
  const root = mkdtempSync(path.join(process.cwd(), '.scratch', 'claude-wake-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const projectRoot = path.join(root, 'project');
  const claudeHome = path.join(root, '.claude');
  const directory = path.join(claudeHome, 'projects', projectRoot.replace(/[^A-Za-z0-9]/g, '-'));
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    path.join(directory, `${SESSION}.jsonl`),
    `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n`,
    { mode: 0o600 }
  );
  return { projectRoot, claudeHome, transcript: path.join(directory, `${SESSION}.jsonl`) };
}

function entry(type, content, at = '2026-09-21T18:00:00.000Z') {
  return {
    type,
    sessionId: SESSION,
    timestamp: at,
    version: '2.1.278',
    message:
      type === 'user'
        ? { role: 'user', content }
        : { role: 'assistant', model: 'claude-opus-5', stop_reason: 'end_turn', content },
  };
}

test('Claude transcript acknowledges exactly one completed marked wake in the bound session', (t) => {
  const marker = `APR_WAKE_OPERATION ${OPERATION} ${DIGEST}`;
  const location = fixture(t, [
    entry('user', marker),
    entry('assistant', [{ type: 'text', text: 'done' }], '2026-09-21T18:00:01.000Z'),
  ]);
  assert.deepEqual(
    readClaudeWakeOutcome({
      ...location,
      sessionId: SESSION,
      wakeOperationId: OPERATION,
      capsuleDigest: DIGEST,
      expectedModel: 'claude-opus-5',
    }),
    { status: 'acknowledged', reason: 'provider-terminal-turn' }
  );
});

test('Claude transcript absence and incomplete turns never authorize blind retry', (t) => {
  const marker = `APR_WAKE_OPERATION ${OPERATION} ${DIGEST}`;
  const absent = fixture(t, [entry('user', 'different prompt')]);
  assert.equal(
    readClaudeWakeOutcome({
      ...absent,
      sessionId: SESSION,
      wakeOperationId: OPERATION,
      capsuleDigest: DIGEST,
      expectedModel: 'claude-opus-5',
    }).status,
    'outcome-unknown'
  );
  const incomplete = fixture(t, [entry('user', marker)]);
  assert.equal(
    readClaudeWakeOutcome({
      ...incomplete,
      sessionId: SESSION,
      wakeOperationId: OPERATION,
      capsuleDigest: DIGEST,
      expectedModel: 'claude-opus-5',
    }).status,
    'outcome-unknown'
  );
});

test('Claude wake requires live stream initialization and assistant model for one exact session', () => {
  const recorder = createClaudeWakeRecorder({ sessionId: SESSION, expectedModel: 'claude-opus-5' });
  recorder.accept({
    type: 'system',
    subtype: 'init',
    session_id: SESSION,
    model: 'claude-opus-5',
    claude_code_version: '2.1.278',
  });
  recorder.accept({
    type: 'assistant',
    session_id: SESSION,
    message: { model: 'claude-opus-5', role: 'assistant', content: [] },
  });
  recorder.accept({ type: 'result', session_id: SESSION, is_error: false });
  assert.deepEqual(recorder.confirm(), {
    session_id: SESSION,
    model_id: 'claude-opus-5',
    source_version: '2.1.278',
  });
  const changed = createClaudeWakeRecorder({ sessionId: SESSION, expectedModel: 'claude-opus-5' });
  assert.throws(() =>
    changed.accept({
      type: 'system',
      subtype: 'init',
      session_id: SESSION,
      model: 'claude-sonnet-5',
      claude_code_version: '2.1.278',
    })
  );
});

test('Claude surface resumes only the bound session and acknowledges its streamed terminal turn', async (t) => {
  const location = fixture(t, [entry('assistant', [{ type: 'text', text: 'ready' }])]);
  const surface = createClaudeProviderSurface({
    claudeHome: location.claudeHome,
    execFile: async () => ({ stdout: '2.1.278 (Claude Code)\n' }),
    runWake: async (args, { recorder }) => {
      assert.equal(args[args.indexOf('--resume') + 1], SESSION);
      assert.equal(args[args.indexOf('--model') + 1], 'claude-opus-5');
      recorder.accept({
        type: 'system',
        subtype: 'init',
        session_id: SESSION,
        model: 'claude-opus-5',
        claude_code_version: '2.1.278',
      });
      recorder.accept({
        type: 'assistant',
        session_id: SESSION,
        message: { model: 'claude-opus-5' },
      });
      recorder.accept({ type: 'result', session_id: SESSION, is_error: false });
      appendFileSync(
        location.transcript,
        `${JSON.stringify(entry('user', args[1], '2026-09-21T18:00:01.000Z'))}\n${JSON.stringify(entry('assistant', 'done', '2026-09-21T18:00:02.000Z'))}\n`
      );
      return { exit_code: 0 };
    },
  });
  const binding = { role: 'reviewer', model_id: 'claude-opus-5', handle_locator: SESSION };
  assert.deepEqual(
    await surface.deliverToSession({
      binding,
      wakeOperationId: OPERATION,
      capsuleDigest: DIGEST,
      capsule: { review_id: 'review-01', next_command: 'peer-review resume /tmp/review-01' },
      projectRoot: location.projectRoot,
      workspace: '/tmp/review-01',
    }),
    { status: 'acknowledged', reason: 'provider-terminal-turn' }
  );
});
