// @story #136
import { createCodexHook } from '../../src/providers/codex-hook-core.mjs';
const hook = createCodexHook({ performCurrentOperationEffect: (operation) => operation() });
export const { captureCodexStartHook, readCodexStartHook } = hook;
