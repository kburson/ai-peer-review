import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  createClaudeStreamRecorder,
  readClaudeStreamObservation,
} from '../../src/providers/claude-stream.mjs';

function fixture(t) {
  mkdirSync('.scratch/test', { recursive: true });
  const workspace = mkdtempSync(path.join(process.cwd(), '.scratch/test/observation-'));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const operationId = 'join:fixture';
  const handleLocator = 'fixture-reviewer';
  const recorder = createClaudeStreamRecorder({
    workspace,
    operationId,
    expectedCommand: 'peer-review join fixture',
  });
  recorder.accept({
    type: 'system',
    subtype: 'init',
    session_id: handleLocator,
    model: 'claude-opus-5',
    claude_code_version: '2.1.278',
  });
  recorder.accept({
    type: 'assistant',
    session_id: handleLocator,
    timestamp: new Date().toISOString(),
    message: {
      model: 'claude-opus-5',
      content: [
        {
          type: 'tool_use',
          id: 'join-call',
          name: 'Bash',
          input: { command: 'peer-review join fixture' },
        },
      ],
    },
  });
  const directory = path.join(workspace, 'provider/claude/observations');
  const filename = `${createHash('sha256').update(operationId).digest('hex')}.json`;
  return {
    input: { workspace, operationId, handleLocator },
    directory,
    filename,
    file: path.join(directory, filename),
  };
}

test('Claude operation observations use portable filenames and retain exact operation identity', (t) => {
  const f = fixture(t);
  assert.deepEqual(readdirSync(f.directory), [f.filename]);
  assert.equal(readClaudeStreamObservation(f.input).operation_id, 'join:fixture');
  assert.throws(() => readClaudeStreamObservation({ ...f.input, handleLocator: 'other' }), {
    code: 'APR_CLAUDE_SESSION_INVALID',
  });
});

test(
  'existing Unix observation files remain readable without migrating their bytes',
  { skip: process.platform === 'win32' },
  (t) => {
    const f = fixture(t);
    const bytes = readFileSync(f.file);
    const legacy = path.join(f.directory, `${f.input.operationId}.json`);
    renameSync(f.file, legacy);
    assert.equal(readClaudeStreamObservation(f.input).operation_id, f.input.operationId);
    assert.deepEqual(readFileSync(legacy), bytes);
    writeFileSync(f.file, 'malformed', { mode: 0o600 });
    assert.throws(() => readClaudeStreamObservation(f.input), {
      code: 'APR_CLAUDE_SESSION_INVALID',
    });
  }
);
