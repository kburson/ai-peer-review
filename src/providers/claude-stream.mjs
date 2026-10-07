// @story #136
import { performCurrentOperationEffect } from '../startup/authority-fence.mjs';
import { createClaudeStreamOperations } from './claude-stream-core.mjs';
export const {
  createClaudeStreamingExec,
  collectClaudeStream,
  createClaudeStreamRecorder,
  createClaudeWakeRecorder,
  readClaudeStreamObservation,
  waitForClaudeStreamObservation,
  readClaudeSessionSnapshot,
  readClaudeWakeOutcome,
} = createClaudeStreamOperations({ performCurrentOperationEffect });
