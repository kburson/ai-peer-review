#!/usr/bin/env node
import { withOperationAuthority } from '../src/startup/authority-fence.mjs';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

import { captureCodexStartHook } from '../src/providers/codex-hook.mjs';

let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
  if (input.length > 1024 * 1024) process.exit(2);
}
const event = JSON.parse(input);
if (
  !/^(?:(?:npx )?(?:ai-)?peer-review|node (?:\.\/)?bin\/peer-review\.mjs)(?:\s|$)/.test(
    event?.tool_input?.command ?? ''
  )
)
  process.exit(0);
const output = await withOperationAuthority(
  { operation: 'hook.codex', cwd: event.cwd },
  async () => {
    const version = execFileSync('codex', ['--version'], { encoding: 'utf8' })
      .trim()
      .match(/^codex-cli (.+)$/)?.[1];
    return captureCodexStartHook({
      event,
      sourceVersion: version,
      token: randomBytes(16).toString('hex'),
    });
  }
);
if (output) process.stdout.write(`${JSON.stringify(output)}\n`);
