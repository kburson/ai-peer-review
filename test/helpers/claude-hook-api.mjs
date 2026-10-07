// @story #136
import { createClaudeHook } from '../../src/providers/claude-hook-core.mjs';
const hook = createClaudeHook({ performCurrentOperationEffect: (operation) => operation() });
export const {
  captureClaudeStartHook,
  captureClaudeStartHookWhenPresent,
  readClaudeStartHook,
  readClaudeStartHookForSession,
} = hook;
