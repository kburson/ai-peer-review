import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

process.on('uncaughtExceptionMonitor', (error) => {
  if (process.env.APR_FIXTURE_BROKER_LOG)
    appendFileSync(process.env.APR_FIXTURE_BROKER_LOG, `${error.stack}\n`);
});
const args = process.argv.slice(2);
if (args[0] === '--version') {
  console.log('2.1.278 (Claude Code)');
  process.exit(0);
}
const installed = process.env.APR_FIXTURE_PACKAGE;
assert.ok(installed, 'fake provider must be explicitly scoped to its fixture');
const root = process.cwd();
const initial = args[0] === '--fixture-start';
const prompt = args[args.indexOf('-p') + 1];
const resume = args.includes('--resume');
const author = initial || (resume && prompt.includes('Resume your author role'));
const session = author
  ? '11111111-1111-4111-8111-111111111111'
  : '22222222-2222-4222-8222-222222222222';
if (resume) assert.equal(args[args.indexOf('--resume') + 1], session);
appendFileSync(
  process.env.APR_FIXTURE_CALLS,
  `${initial ? 'start' : resume ? `${author ? 'author' : 'reviewer'}-wake` : 'launch'}\n`
);
const directory = path.join(
  process.env.HOME,
  '.claude/projects',
  root.replace(/[^A-Za-z0-9]/g, '-')
);
mkdirSync(directory, { recursive: true });
const transcript = path.join(directory, `${session}.jsonl`);
const emit = (event) => process.stdout.write(`${JSON.stringify(event)}\n`);
const record = (type, content, stop = 'end_turn') => {
  const message =
    type === 'user'
      ? { role: 'user', content }
      : {
          role: 'assistant',
          model: 'claude-opus-5',
          stop_reason: stop,
          content,
        };
  const value = {
    type,
    sessionId: session,
    version: '2.1.278',
    timestamp: new Date().toISOString(),
    message,
  };
  appendFileSync(transcript, `${JSON.stringify(value)}\n`, { mode: 0o600 });
  if (type === 'assistant') emit({ ...value, session_id: session });
};
emit({
  type: 'system',
  subtype: 'init',
  session_id: session,
  model: 'claude-opus-5',
  claude_code_version: '2.1.278',
});
record('user', initial ? 'Start the fixture review.' : prompt);
const tool = (id, command) =>
  record('assistant', [{ type: 'tool_use', id, name: 'Bash', input: { command } }], 'tool_use');
const result = (id) =>
  record('user', [{ type: 'tool_result', tool_use_id: id, content: 'completed' }]);
const env = { ...process.env, CLAUDE_CODE_SESSION_ID: session, CLAUDE_MODEL_ID: 'claude-opus-5' };
const cli = (argv, extra = {}) => {
  const output = execFileSync(
    process.execPath,
    [path.join(installed, 'bin/peer-review.mjs'), ...argv],
    {
      cwd: root,
      env: { ...env, ...extra },
      encoding: 'utf8',
      timeout: 30_000,
    }
  );
  return argv.includes('--json') ? JSON.parse(output) : output;
};
const workspace = () => {
  const directory = path.join(root, '.scratch/peer-review');
  const candidates = readdirSync(directory)
    .map((name) => path.join(directory, name))
    .filter((file) => existsSync(path.join(file, 'events.jsonl')));
  assert.equal(candidates.length, 1);
  return candidates[0];
};
const replace = (file, heading, content) => {
  const text = readFileSync(file, 'utf8');
  const pattern = new RegExp(`(## ${heading}\\r?\\n\\r?\\n)[\\s\\S]*?(?=\\r?\\n\\r?\\n## |$)`);
  assert.match(text, pattern);
  writeFileSync(file, text.replace(pattern, `$1${content}`));
};
if (initial) {
  const argv = [
    'start',
    'docs/artifact.md',
    '--artifact-kind',
    'spec',
    '--reviewer-provider',
    'claude',
    '--reviewer-model',
    'claude-opus-5',
    '--reviewer-effort',
    'low',
    '--transport-mode',
    'automatic-required',
    '--max-turns',
    '2',
  ];
  const command = `npx peer-review ${argv.join(' ')}`;
  tool('start-call', command);
  const hook = JSON.parse(
    execFileSync(process.execPath, [path.join(installed, 'bin/peer-review-claude-hook.mjs')], {
      cwd: root,
      env,
      encoding: 'utf8',
      input: JSON.stringify({
        hook_event_name: 'PreToolUse',
        tool_name: 'Bash',
        tool_use_id: 'start-call',
        tool_input: { command },
        transcript_path: transcript,
        session_id: session,
        cwd: root,
      }),
      timeout: 10_000,
    })
  );
  const token = hook.hookSpecificOutput.updatedInput.command.match(
    /APR_CLAUDE_HOOK_TOKEN=([0-9a-f]+)/
  )[1];
  cli(argv, { APR_CLAUDE_HOOK_TOKEN: token });
  result('start-call');
} else {
  const ws = workspace();
  if (!resume) {
    const { inspectReview } = await import(
      pathToFileURL(path.join(installed, 'src/protocol/service.mjs'))
    );
    const state = inspectReview(ws);
    const destination = path.join(root, state.protocol.startup.destination);
    const invitation = path.join(
      destination,
      readdirSync(destination).find((name) => name.endsWith('-reviewer-invitation.md'))
    );
    const { claudeJoinCommand } = await import(
      pathToFileURL(path.join(installed, 'src/provider/claude-launch.mjs'))
    );
    tool('join-call', claudeJoinCommand({ invitation }));
    const { readClaudeStreamObservation } = await import(
      pathToFileURL(path.join(installed, 'src/providers/claude-stream.mjs'))
    );
    let observed;
    for (let i = 0; !observed && i < 100; i++) {
      try {
        observed = readClaudeStreamObservation({
          workspace: ws,
          operationId: `join:${state.protocol.review_id}`,
          handleLocator: session,
        });
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }
    assert.ok(observed, 'real broker must record the join stream promptly');
    cli(['join', invitation]);
    result('join-call');
  }
  tool('resume-call', `peer-review resume ${ws}`);
  cli(['resume', ws]);
  const resumed = cli(['status', ws, '--json']);
  writeFileSync(
    path.join(root, '.scratch', `fixture-${author ? 'author' : 'reviewer'}-resume.json`),
    JSON.stringify(resumed)
  );
  result('resume-call');
  const response = resumed.paths.response;
  if (!response) {
    assert.equal(author, true);
    const allow = args.slice(args.indexOf('--allowedTools') + 1);
    assert.ok(allow.some((rule) => rule.startsWith('Bash(peer-review finalize ')));
    assert.ok(!allow.some((rule) => rule.startsWith('Edit(')));
    tool('finalize-call', `peer-review finalize ${ws}`);
    cli(['finalize', ws]);
    result('finalize-call');
  } else {
    if (resume) {
      const { encodeClaudeEditRule } = await import(
        pathToFileURL(path.join(installed, 'src/provider/claude-launch.mjs'))
      );
      const allow = args.slice(args.indexOf('--allowedTools') + 1);
      assert.ok(args.includes('--allowedTools'));
      assert.ok(
        allow.includes(encodeClaudeEditRule(response)),
        'wake must grant the current response edit'
      );
      assert.ok(
        allow.some((rule) => rule.startsWith('Bash(peer-review resume ')),
        'wake must grant exact resume'
      );
      assert.ok(!allow.includes('Bash') && !allow.includes('Edit') && !allow.includes('Write'));
    }
    replace(
      response,
      'Summary',
      author
        ? 'Explained the requested repair.'
        : resume
          ? 'Accepted the explanation.'
          : 'One repair required.'
    );
    if (author) {
      replace(response, 'Finding dispositions', '- R1-F001: addressed');
      replace(response, 'Changes made', 'Clarification only.');
      replace(response, 'Declined changes and rationale', 'No byte change.');
      replace(response, 'Verification', 'Verified the tiny specification.');
    } else {
      replace(
        response,
        'Findings',
        resume ? 'None.' : '### R1-F001 — Repair\n\nClarify the missing key.'
      );
      replace(response, 'Required changes', resume ? 'None.' : '- Address R1-F001.');
      replace(response, 'Optional suggestions', 'None.');
      replace(response, 'Decision', resume ? 'accepted' : 'revisions-requested');
    }
    tool('submit-call', `peer-review submit ${ws}`);
    cli([
      'submit',
      ws,
      ...(author
        ? ['--no-artifact-change', '--reason', 'No artifact change is required for this response.']
        : []),
    ]);
    result('submit-call');
  }
}
record('assistant', [{ type: 'text', text: 'Completed the requested action.' }]);
emit({ type: 'result', session_id: session, is_error: false, result: 'Completed.' });
