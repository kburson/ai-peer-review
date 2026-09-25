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
  const scratch = path.join(process.cwd(), '.scratch');
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(path.join(scratch, 'claude-wake-'));
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

function toolCall(id) {
  const value = entry('assistant', [
    { type: 'tool_use', id, name: 'Bash', input: { command: 'peer-review resume /fixture' } },
  ]);
  value.message.stop_reason = 'tool_use';
  return value;
}

function toolResult(id) {
  return entry('user', [{ type: 'tool_result', tool_use_id: id, content: 'submitted' }]);
}

function skillCall(id) {
  const value = toolCall(id);
  value.message.content[0] = {
    type: 'tool_use',
    id,
    name: 'Skill',
    input: { skill: 'peer-review' },
  };
  return value;
}

function skillMetadata(
  id,
  content = 'Base directory for this skill: /synthetic/skills/peer-review'
) {
  return { ...entry('user', content), isMeta: true, sourceToolUseID: id };
}

function outcome(location) {
  return readClaudeWakeOutcome({
    ...location,
    sessionId: SESSION,
    wakeOperationId: OPERATION,
    capsuleDigest: DIGEST,
    expectedModel: 'claude-opus-5',
  });
}

test('Claude wake remains correlated across multiple tool-use and tool-result exchanges', (t) => {
  const location = fixture(t, [
    entry('user', `APR_WAKE_OPERATION ${OPERATION} ${DIGEST}`),
    toolCall('resume-call'),
    toolResult('resume-call'),
    toolCall('submit-call'),
    toolResult('submit-call'),
    entry('assistant', 'completed the requested role action'),
  ]);
  assert.deepEqual(outcome(location), { status: 'acknowledged', reason: 'provider-terminal-turn' });
});

test('Claude wake correlates completed Skill metadata and acknowledges a terminal refusal only as transport', (t) => {
  const denied = toolResult('denied-command');
  denied.message.content[0].is_error = true;
  denied.message.content[0].content = 'Permission denied for this Bash command.';
  for (const terminal of ['The role action is complete.', 'I cannot run the denied command.']) {
    const entries = [
      entry('user', `APR_WAKE_OPERATION ${OPERATION} ${DIGEST}`),
      skillCall('skill-expansion'),
      toolResult('skill-expansion'),
      skillMetadata('skill-expansion'),
      toolCall('denied-command'),
      denied,
      entry('assistant', terminal),
    ];
    const recorder = createClaudeWakeRecorder({
      sessionId: SESSION,
      expectedModel: 'claude-opus-5',
    });
    recorder.accept({
      type: 'system',
      subtype: 'init',
      session_id: SESSION,
      model: 'claude-opus-5',
      claude_code_version: '2.1.278',
    });
    for (const value of entries) recorder.accept({ ...value, session_id: value.sessionId });
    recorder.accept({ type: 'result', session_id: SESSION, is_error: false });
    assert.equal(recorder.confirm().session_id, SESSION);
    assert.deepEqual(outcome(fixture(t, entries)), {
      status: 'acknowledged',
      reason: 'provider-terminal-turn',
    });
  }
});

test('Claude wake accepts text-block Skill metadata for a completed call in the current wake', (t) => {
  assert.equal(
    outcome(
      fixture(t, [
        entry('user', `APR_WAKE_OPERATION ${OPERATION} ${DIGEST}`),
        skillCall('skill-expansion'),
        toolResult('skill-expansion'),
        skillMetadata('skill-expansion', [{ type: 'text', text: 'Skill instructions' }]),
        entry('assistant', 'done'),
      ])
    ).status,
    'acknowledged'
  );
});

test('Claude wake rejects metadata that is not text correlated to its completed Skill call', (t) => {
  const prompt = entry('user', `APR_WAKE_OPERATION ${OPERATION} ${DIGEST}`);
  const terminal = entry('assistant', 'done');
  for (const exchange of [
    [skillCall('skill'), toolResult('skill'), skillMetadata('unrelated')],
    [skillCall('skill'), skillMetadata('skill'), toolResult('skill')],
    [toolCall('bash'), toolResult('bash'), skillMetadata('bash')],
    [skillCall('skill'), toolResult('skill'), { ...skillMetadata('skill'), isMeta: false }],
    [
      skillCall('skill'),
      toolResult('skill'),
      { ...skillMetadata('skill'), sourceToolUseID: undefined },
    ],
    [skillCall('skill'), toolResult('skill'), skillMetadata('skill', [{ type: 'unknown' }])],
    [skillCall('skill'), toolResult('skill'), entry('user', 'An unrelated human request')],
    [skillMetadata('older-skill')],
  ]) {
    assert.equal(
      outcome(
        fixture(t, [
          entry('user', 'An earlier turn'),
          skillCall('older-skill'),
          toolResult('older-skill'),
          terminal,
          prompt,
          ...exchange,
          terminal,
        ])
      ).status,
      'outcome-unknown'
    );
  }
});

test('Claude wake Skill metadata preserves session/model and unique-marker validation', (t) => {
  const prompt = entry('user', `APR_WAKE_OPERATION ${OPERATION} ${DIGEST}`);
  const terminal = entry('assistant', 'done');
  for (const extra of [
    { ...terminal, message: { ...terminal.message, model: 'claude-sonnet-5' } },
    { ...terminal, sessionId: '22222222-2222-4222-8222-222222222222' },
    prompt,
    skillMetadata('skill', `APR_WAKE_OPERATION ${OPERATION} ${DIGEST}`),
  ]) {
    assert.throws(
      () =>
        outcome(
          fixture(t, [
            prompt,
            skillCall('skill'),
            toolResult('skill'),
            skillMetadata('skill'),
            extra,
          ])
        ),
      { code: 'APR_CLAUDE_SESSION_INVALID' }
    );
  }
});

test('Claude wake Skill expansion without a terminal response never authorizes blind retry', (t) => {
  const entries = [
    entry('user', `APR_WAKE_OPERATION ${OPERATION} ${DIGEST}`),
    skillCall('skill'),
    toolResult('skill'),
    skillMetadata('skill'),
  ];
  assert.deepEqual(outcome(fixture(t, entries)), {
    status: 'outcome-unknown',
    reason: 'provider-turn-unconfirmed',
  });
  const truncated = fixture(t, [...entries, entry('assistant', 'done')]);
  appendFileSync(truncated.transcript, '{"type":"assistant"');
  assert.throws(() => outcome(truncated), { code: 'APR_CLAUDE_SESSION_INVALID' });
});

test('Claude wake never attributes an unrelated or incomplete tool exchange to its operation', (t) => {
  const prompt = entry('user', `APR_WAKE_OPERATION ${OPERATION} ${DIGEST}`);
  const terminal = entry('assistant', 'done');
  for (const exchange of [
    [toolResult('unknown-call'), terminal],
    [toolCall('call'), toolResult('different-call'), terminal],
    [toolCall('call'), terminal],
    [toolCall('call'), toolResult('call'), toolResult('call'), terminal],
    [toolCall('call'), entry('user', 'a different request'), toolResult('call'), terminal],
  ]) {
    assert.equal(outcome(fixture(t, [prompt, ...exchange])).status, 'outcome-unknown');
  }
});

test('Claude wake rejects changed session/model and duplicate markers through tool exchanges', (t) => {
  const prompt = entry('user', `APR_WAKE_OPERATION ${OPERATION} ${DIGEST}`);
  const terminal = entry('assistant', 'done');
  for (const extra of [
    { ...terminal, message: { ...terminal.message, model: 'claude-sonnet-5' } },
    { ...terminal, sessionId: '22222222-2222-4222-8222-222222222222' },
    prompt,
  ]) {
    assert.throws(
      () => outcome(fixture(t, [prompt, toolCall('call'), toolResult('call'), extra])),
      { code: 'APR_CLAUDE_SESSION_INVALID' }
    );
  }
});

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
  mkdirSync(location.projectRoot);
  const surface = createClaudeProviderSurface({
    claudeHome: location.claudeHome,
    execFile: async () => ({ stdout: '2.1.278 (Claude Code)\n' }),
    inspectWakeAuthority: () => ({
      state: {
        protocol: {
          current_actor: 'reviewer',
          startup: { context: { repository_root: location.projectRoot } },
        },
      },
      status: { paths: { response: path.join(location.projectRoot, 'response.md') } },
    }),
    runWake: async (args, { recorder, env }) => {
      assert.equal(args[args.indexOf('--resume') + 1], SESSION);
      assert.equal(args[args.indexOf('--model') + 1], 'claude-opus-5');
      assert.equal(env.CLAUDE_MODEL_ID, 'claude-opus-5');
      assert.equal(env.CLAUDE_MODEL_DISPLAY, 'claude-opus-5');
      assert.equal(env.CLAUDE_CODE_SESSION_ID, undefined);
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
      workspace: location.projectRoot,
    }),
    { status: 'acknowledged', reason: 'provider-terminal-turn' }
  );
});
