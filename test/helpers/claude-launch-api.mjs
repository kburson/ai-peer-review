// @story #136
import { createClaudeLaunchOperations } from '../../src/provider/claude-launch-core.mjs';
const operations = createClaudeLaunchOperations({
  performCurrentOperationEffect: (effect) => effect(),
  assertCurrentOperationAuthority: () => {},
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
  runClaudeReviewerLaunch,
} = operations;
