// @story #136
import {
  withOperationAuthority,
  performCurrentOperationEffect,
  assertCurrentOperationAuthority,
} from '../startup/authority-fence.mjs';
import { createClaudeLaunchOperations } from './claude-launch-core.mjs';
import { isAdmissionOwnedClaudeExecutor } from '../providers/claude-stream.mjs';
const operations = createClaudeLaunchOperations({
  performCurrentOperationEffect,
  assertCurrentOperationAuthority,
  executionOwnsAdmission: isAdmissionOwnedClaudeExecutor,
  withProviderOperationAuthority: (input, effect) =>
    withOperationAuthority(
      {
        operation: 'provider.launch',
        signal: input.signal,
        deadline: input.deadline,
        cwd: input.contract?.repository_root,
        reviewWorkspace: input.contract?.workspace,
      },
      effect
    ),
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
  return operations.runClaudeReviewerLaunch(input);
}
