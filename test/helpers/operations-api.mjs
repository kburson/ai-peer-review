import { startupEvidence } from '../../src/broker/registry.mjs';
import { AprError } from '../../src/errors.mjs';
import { realpathSync } from 'node:fs';
import { canonicalProjectIdentity } from '../../src/broker/identity.mjs';
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
  resolveProject: ({ cwd, repository, deps }) =>
    canonicalProjectIdentity({
      cwd,
      platform: {
        kind: process.platform,
        canonicalPath: realpathSync,
        userId: deps.platform?.userId ?? (() => String(process.geteuid?.() ?? 'fixture-user')),
        repository,
      },
    }),
  startReview: (...args) => operations.startReview(...args),
  ensureBroker: denyProvider,
  requestBroker,
  productionProviderAdapters,
  performCurrentOperationEffect: (operation) => operation(),
});
const operations = createReviewOperations({
  brokerRecoveryRuntime: (workspace, io) => {
    if (io.brokerReconcileRuntime) return io.brokerReconcileRuntime(workspace);
    const authority = protocol.inspectReviewAuthority(workspace);
    const observed = startupEvidence(workspace, authority.state);
    return { versions: observed.journal.versions, runtimeImage: observed.journal.runtime };
  },
  prepareBrokerClient: (input, io) => (io.brokerEnsure ?? ensureBroker)(input),
  resolveBrokerProject: ({ cwd, io }) =>
    canonicalProjectIdentity({
      cwd,
      platform: {
        kind: process.platform,
        canonicalPath: realpathSync,
        userId: () => String(process.geteuid?.() ?? 'fixture-user'),
        repository: io.repository,
      },
    }),
  connectBrokerClient: ({ project, versions, io }) =>
    io.brokerConnect
      ? io.brokerConnect({ identity: project, versions, paths: null })
      : Promise.reject(
          new AprError('APR_BROKER_START_FAILED', 'Portable fixture connector is unavailable.', {
            recovery: 'Inject an explicit unverified connector in this fixture.',
          })
        ),
  protocol,
  startup,
  ensureBroker,
  requestBroker,
  fenceManualRecovery,
  suspendBrokerRecovery: (workspace, connect) => fenceManualRecovery(workspace, { connect }),
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
