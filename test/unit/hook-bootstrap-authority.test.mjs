// @story #102
import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { captureCodexStartHook } from '../../src/providers/codex-hook.mjs';
import { captureClaudeStartHook } from '../../src/providers/claude-hook.mjs';

const session = '11111111-1111-4111-8111-111111111111';
const token = 'a'.repeat(32);
function fixture(t, command) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'apr-hook-bootstrap-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const transcript = path.join(root, session + '.jsonl');
  const at = new Date();
  writeFileSync(
    transcript,
    JSON.stringify({
      type: 'assistant',
      sessionId: session,
      version: '1.0.0',
      timestamp: at.toISOString(),
      message: {
        model: 'fixture-model',
        content: [{ type: 'tool_use', id: 'fixture-tool', name: 'Bash', input: { command } }],
      },
    }) + '\n',
    { mode: 0o600 }
  );
  return {
    root,
    at,
    event: {
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      cwd: root,
      model: 'fixture-model',
      session_id: session,
      tool_use_id: 'fixture-tool',
      turn_id: 'fixture-turn',
      transcript_path: transcript,
      tool_input: { command },
    },
  };
}
for (const command of [
  'peer-review help',
  'peer-review explain APR_PRIMARY_AUTHORITY_UNAVAILABLE',
  'peer-review primary register --dry-run',
  'peer-review setup --dry-run',
]) {
  for (const [provider, capture] of [
    ['Codex', captureCodexStartHook],
    ['Claude', captureClaudeStartHook],
  ]) {
    test(provider + ' hook forwards ' + command + ' without mutation authority', async (t) => {
      const f = fixture(t, command);
      const before = readdirSync(f.root);
      const bytes = readFileSync(f.event.transcript_path);
      const result = await capture({
        event: f.event,
        sourceVersion: '1.0.0',
        token,
        observedAt: f.at,
      });
      assert.equal(result.hookSpecificOutput.permissionDecision, 'allow');
      assert.ok(result.hookSpecificOutput.updatedInput.command.endsWith(command));
      assert.deepEqual(readdirSync(f.root), before);
      assert.deepEqual(readFileSync(f.event.transcript_path), bytes);
    });
  }
}
for (const [provider, capture] of [
  ['Codex', captureCodexStartHook],
  ['Claude', captureClaudeStartHook],
]) {
  test(provider + ' hook still refuses a source-runtime start before record writes', async (t) => {
    const f = fixture(t, 'peer-review start docs/spec.md');
    await assert.rejects(
      capture({ event: f.event, sourceVersion: '1.0.0', token, observedAt: f.at }),
      { code: 'APR_RUNTIME_INSTALLATION_INVALID' }
    );
    assert.equal(readdirSync(f.root).length, 1);
  });
}
for (const provider of ['codex', 'claude']) {
  test(
    provider + ' hook executable forwards bootstrap without an activated project',
    { skip: process.platform === 'win32' },
    (t) => {
      const f = fixture(t, 'peer-review help');
      const tools = path.join(f.root, 'tools');
      mkdirSync(tools);
      writeFileSync(
        path.join(tools, provider),
        provider === 'codex'
          ? '#!/bin/sh\necho "codex-cli 1.0.0"\n'
          : '#!/bin/sh\necho "1.0.0 (Claude Code)"\n',
        { mode: 0o700 }
      );
      const result = spawnSync(
        process.execPath,
        [path.resolve('bin/peer-review-' + provider + '-hook.mjs')],
        {
          cwd: f.root,
          input: JSON.stringify(f.event),
          encoding: 'utf8',
          env: { ...process.env, PATH: tools + path.delimiter + process.env.PATH },
        }
      );
      assert.equal(result.status, 0, result.stderr);
      assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, 'allow');
      assert.equal(readdirSync(f.root).includes('.scratch'), false);
    }
  );
}
