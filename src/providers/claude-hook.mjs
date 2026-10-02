// @story #136
import {
  withOperationAuthority,
  performCurrentOperationEffect,
} from '../startup/authority-fence.mjs';
import { createClaudeHook } from './claude-hook-core.mjs';
const hook = createClaudeHook({ performCurrentOperationEffect });
export async function captureClaudeStartHook(input, ...args) {
  if (
    !/^(?:(?:npx )?(?:ai-)?peer-review|node (?:\.\/)?bin\/peer-review\.mjs)(?:\s|$)/.test(
      input?.event?.tool_input?.command ?? ''
    )
  )
    return null;
  return withOperationAuthority({ operation: 'hook.claude', cwd: input?.event?.cwd }, () =>
    hook.captureClaudeStartHook(input, ...args)
  );
}
export async function captureClaudeStartHookWhenPresent(input, ...args) {
  if (
    !/^(?:(?:npx )?(?:ai-)?peer-review|node (?:\.\/)?bin\/peer-review\.mjs)(?:\s|$)/.test(
      input?.event?.tool_input?.command ?? ''
    )
  )
    return null;
  return withOperationAuthority({ operation: 'hook.claude', cwd: input?.event?.cwd }, () =>
    hook.captureClaudeStartHookWhenPresent(input, ...args)
  );
}
export function readClaudeStartHook(...args) {
  return hook.readClaudeStartHook(...args);
}
export function readClaudeStartHookForSession(...args) {
  return hook.readClaudeStartHookForSession(...args);
}
