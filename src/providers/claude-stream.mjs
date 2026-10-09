// @story #136
import { performCurrentOperationEffect } from '../startup/authority-fence.mjs';
import { createClaudeStreamOperations } from './claude-stream-core.mjs';
const admittedExecutors = new WeakSet();
const operations = createClaudeStreamOperations({ performCurrentOperationEffect });
export function createClaudeStreamingExec(input) {
  const execution = operations.createClaudeStreamingExec(input);
  admittedExecutors.add(execution);
  return execution;
}
export function isAdmissionOwnedClaudeExecutor(execution) {
  return admittedExecutors.has(execution);
}
export const {
  collectClaudeStream,
  createClaudeStreamRecorder,
  createClaudeWakeRecorder,
  readClaudeStreamObservation,
  waitForClaudeStreamObservation,
  readClaudeSessionSnapshot,
  readClaudeWakeOutcome,
} = operations;
