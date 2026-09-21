#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

import { captureClaudeStartHookWhenPresent } from '../src/providers/claude-hook.mjs';

let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
  if (input.length > 1024 * 1024) process.exit(2);
}
const event = JSON.parse(input);
if (
  !/^(?:peer-review|npx peer-review|node (?:\.\/)?bin\/peer-review\.mjs) start(?:\s|$)/.test(
    event?.tool_input?.command ?? ''
  )
)
  process.exit(0);
try {
  const version = execFileSync('claude', ['--version'], { encoding: 'utf8' })
    .trim()
    .match(/^(\d+\.\d+\.\d+)(?:\s|$)/)?.[1];
  const output = await captureClaudeStartHookWhenPresent({
    event,
    sourceVersion: version,
    token: randomBytes(16).toString('hex'),
  });
  if (output) process.stdout.write(`${JSON.stringify(output)}\n`);
} catch (error) {
  process.stderr.write(`${error.code ?? 'APR_CLAUDE_HOOK_INVALID'}: ${error.message}\n`);
  process.exitCode = 2;
}
