import { requestBroker, ensureBroker, fenceManualRecovery } from './broker-client-api.mjs';
// @story #136
import { runClaudeReviewerLaunch } from './claude-launch-api.mjs';
import { applyReviewRecord } from './review-record-api.mjs';
import { requestGrant } from './challenge-api.mjs';
import * as protocol from './protocol-api.mjs';
import { createReviewOperations } from '../../src/cli/run-core.mjs';
import { createStartupRuntime } from '../../src/startup/runtime-core.mjs';
const denyProvider = () => {
  throw new Error(
    'Source fixture cannot launch a production provider or broker; inject an inert fixture effect'
  );
};
import { createCodexAdapter, createCodexProviderSurface } from '../../src/providers/codex.mjs';
import { createClaudeAdapter } from '../../src/providers/claude.mjs';
import { readClaudeStartHook } from '../../src/providers/claude-hook.mjs';
import {
  waitForClaudeStreamObservation,
  createClaudeStreamingExec as createStream,
  createClaudeStreamRecorder,
} from './claude-stream-api.mjs';
const productionProviderAdapters = () =>
  new Map([
    [
      'codex',
      createCodexAdapter({
        surface: createCodexProviderSurface({ executeVersion: async () => 'fixture' }),
      }),
    ],
    [
      'claude',
      createClaudeAdapter({
        surface: {
          available: async () => false,
          version: async () => 'fixture',
          observeCurrentSession: ({ root, token, workspace, operationId, handleLocator }) =>
            token
              ? readClaudeStartHook({ root, token, sessionId: handleLocator, operationId })
              : waitForClaudeStreamObservation({ workspace, operationId, handleLocator }),
        },
      }),
    ],
  ]);
const createClaudeStreamingExec = (input) => {
  if (typeof input?.spawnProcess !== 'function') return denyProvider();
  return createStream(input);
};
const startup = createStartupRuntime({
  startReview: (...args) => operations.startReview(...args),
  ensureBroker: denyProvider,
  requestBroker,
  productionProviderAdapters,
  performCurrentOperationEffect: (operation) => operation(),
});
const operations = createReviewOperations({
  protocol,
  startup,
  ensureBroker,
  requestBroker,
  fenceManualRecovery,
  productionProviderAdapters,
  requestGrant,
  runClaudeReviewerLaunch,
  applyReviewRecord,
  createClaudeStreamingExec,
  createClaudeStreamRecorder,
  performCurrentOperationEffect: (operation) => operation(),
});
export const {
  startReview,
  joinReview,
  statusReview,
  resumeReview,
  continueReview,
  registerSupplement,
  abandonReview,
  supersedeReview,
  recoverReview,
  advanceReview,
  submitReviewTurn,
  submitAuthorTurn,
  finalizeReview,
  run,
  runHandoffMcpStdio,
} = operations;

export const {
  prepareStartup,
  activateStartup,
  requireStartupIssue,
  validateRuntimeDescriptor,
  assertRequestedReviewer,
  selectRuntime,
  observeSelectedRuntime,
} = startup;
