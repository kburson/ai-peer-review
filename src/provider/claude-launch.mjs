// @story #136
import {
  withOperationAuthority,
  performCurrentOperationEffect,
  assertCurrentOperationAuthority,
} from '../startup/authority-fence.mjs';
import { createClaudeLaunchOperations } from './claude-launch-core.mjs';
const operations = createClaudeLaunchOperations({
  performCurrentOperationEffect,
  assertCurrentOperationAuthority,
});
export const {
  buildClaudeLaunchEnvironment,
  encodeClaudeEditRule,
  matchesClaudeEditRule,
  claudeJoinCommand,
  buildClaudeWakeContract,
  buildClaudeWakePermissions,
  encodeClaudeExecutionPermissions,
  buildClaudeReviewerLaunchFromExecution,
  buildClaudeReviewerLaunch,
  classifyClaudeReviewerOutcome,
  buildClaudeReviewerResume,
} = operations;
export function runClaudeReviewerLaunch(input) {
  return withOperationAuthority(
    {
      operation: 'provider.launch',
      signal: input?.signal,
      deadline: input?.deadline,
      cwd: input?.contract?.repository_root,
      reviewWorkspace: input?.contract?.workspace,
    },
    () => operations.runClaudeReviewerLaunch(input)
  );
}
