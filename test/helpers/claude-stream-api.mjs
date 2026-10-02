// @story #136
import { createClaudeStreamOperations } from '../../src/providers/claude-stream-core.mjs';
export const {
  createClaudeStreamingExec,
  collectClaudeStream,
  createClaudeStreamRecorder,
  createClaudeWakeRecorder,
  readClaudeStreamObservation,
  waitForClaudeStreamObservation,
  readClaudeSessionSnapshot,
  readClaudeWakeOutcome,
} = createClaudeStreamOperations({ performCurrentOperationEffect: (operation) => operation() });
