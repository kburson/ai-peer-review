// @story #106
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import * as stream from '../helpers/claude-stream-api.mjs';

function setup(t) {
  const workspace = mkdtempSync(path.join(os.tmpdir(), 'apr-observation-wait-'));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const input = { workspace, operationId: 'join:106', handleLocator: 'session-106' };
  const recorder = stream.createClaudeStreamRecorder({ ...input, expectedCommand: 'join-exact' });
  const publish = () => {
    recorder.accept({
      type: 'system',
      subtype: 'init',
      session_id: input.handleLocator,
      model: 'claude-opus-5',
      claude_code_version: '2.1.278',
    });
    recorder.accept({
      type: 'assistant',
      session_id: input.handleLocator,
      timestamp: new Date().toISOString(),
      message: {
        model: 'claude-opus-5',
        content: [
          { type: 'tool_use', name: 'Bash', id: 'join-106', input: { command: 'join-exact' } },
        ],
      },
    });
  };
  return { input, publish };
}

test('active join waits for a delayed genuine observation', async (t) => {
  const { input, publish } = setup(t);
  const pending = stream.waitForClaudeStreamObservation(input);
  const timer = setTimeout(publish, 40);
  t.after(() => clearTimeout(timer));
  assert.equal((await pending).session_id, input.handleLocator);
});

test('missing active-join observation still refuses at the bounded deadline', async (t) => {
  const { input } = setup(t);
  await assert.rejects(stream.waitForClaudeStreamObservation(input, { timeoutMs: 30 }), {
    code: 'APR_CLAUDE_SESSION_INVALID',
  });
});

test('an existing observation for another session is never retried', async (t) => {
  const { input, publish } = setup(t);
  publish();
  await assert.rejects(
    stream.waitForClaudeStreamObservation({ ...input, handleLocator: 'other' }),
    (error) => error.code === 'APR_CLAUDE_SESSION_INVALID' && error.cause === undefined
  );
});
