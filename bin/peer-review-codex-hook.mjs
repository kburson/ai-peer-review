#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

import { captureCodexStartHook, isCodexPeerReviewCommand } from '../src/providers/codex-hook.mjs';

let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
  if (input.length > 1024 * 1024) process.exit(2);
}
const event = JSON.parse(input);
if (!isCodexPeerReviewCommand(event?.tool_input?.command)) process.exit(0);
const version = execFileSync('codex', ['--version'], { encoding: 'utf8' })
  .trim()
  .match(/^codex-cli (.+)$/)?.[1];
const output = captureCodexStartHook({
  event,
  hookRuntimeSessionId: process.env.CODEX_THREAD_ID ?? null,
  sourceVersion: version,
  token: randomBytes(16).toString('hex'),
});
if (output) process.stdout.write(`${JSON.stringify(output)}\n`);
