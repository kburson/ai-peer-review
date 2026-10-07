// @story #136
import {
  withOperationAuthority,
  performCurrentOperationEffect,
} from '../startup/authority-fence.mjs';
import { createCodexHook } from './codex-hook-core.mjs';
const hook = createCodexHook({ performCurrentOperationEffect });
export const { isCodexPeerReviewCommand, isCodexPeerReviewCodeModeEvent } = hook;
export async function captureCodexStartHook(input, ...args) {
  const codeMode = isCodexPeerReviewCodeModeEvent(input?.event);
  if (!isCodexPeerReviewCommand(input?.event?.tool_input?.command) && !codeMode) return null;
  const capture = () => hook.captureCodexStartHook(input, ...args);
  if (
    !codeMode &&
    !/^(?:(?:npx (?:--no-install )?)?(?:ai-)?peer-review|node (?:\.\/)?bin\/peer-review\.mjs) (?:start|join)(?:\s|$)/.test(
      input?.event?.tool_input?.command ?? ''
    )
  )
    return capture();
  return withOperationAuthority({ operation: 'hook.codex', cwd: input?.event?.cwd }, capture);
}
export function readCodexStartHook(...args) {
  return hook.readCodexStartHook(...args);
}
