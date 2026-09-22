import { withoutProviderIdentity } from '../provider/preflight.mjs';
import { remainingProviderTime } from './process-lifetime.mjs';
import { createProviderAdapter, registerProductionProviderAdapter } from './registry.mjs';
import { execFile as execFileCallback } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import { AprError } from '../errors.mjs';
import { readClaudeStartHook, readClaudeStartHookForSession } from './claude-hook.mjs';
import {
  buildClaudeReviewerLaunch,
  buildClaudeWakePermissions,
  buildClaudeReviewerResume,
  claudeJoinCommand,
  runClaudeReviewerLaunch,
} from '../provider/claude-launch.mjs';
import { inspectReview, statusReview } from '../protocol/service.mjs';
import {
  createClaudeStreamRecorder,
  createClaudeWakeRecorder,
  createClaudeStreamingExec,
  readClaudeSessionSnapshot,
  readClaudeStreamObservation,
  readClaudeWakeOutcome,
} from './claude-stream.mjs';

const execFile = promisify(execFileCallback);
const ADAPTER_VERSION = '1.0.0';
const SUPPORTED_SURFACE_VERSION = '2.1.278';

const MODELS = Object.freeze({
  opus: Object.freeze({ model_id: 'claude-opus-5', model_display: 'Claude Opus 5' }),
  'claude-opus-5': Object.freeze({ model_id: 'claude-opus-5', model_display: 'Claude Opus 5' }),
  sonnet: Object.freeze({ model_id: 'claude-sonnet-5', model_display: 'Claude Sonnet 5' }),
  'claude-sonnet-5': Object.freeze({
    model_id: 'claude-sonnet-5',
    model_display: 'Claude Sonnet 5',
  }),
});

function routingFromInvitation(invitationPath) {
  let encoded;
  try {
    const invitation = readFileSync(invitationPath, 'utf8');
    encoded = invitation.match(
      /^<!-- ai-peer-review-invitation data="([A-Za-z0-9_-]+)" -->$/m
    )?.[1];
    if (!encoded || Buffer.from(encoded, 'base64url').toString('base64url') !== encoded)
      throw new Error('non-canonical invitation payload');
    const routing = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (
      routing?.schema !== 'ai-peer-review.invitation-routing/v1' ||
      [routing.review_id, routing.artifact, routing.workspace, routing.response].some(
        (value) => typeof value !== 'string' || !value
      )
    )
      throw new Error('invalid invitation payload');
    return routing;
  } catch (cause) {
    const error = new AprError(
      'APR_INVITATION_INVALID',
      'Claude provider launch requires the complete generated reviewer invitation.',
      { recovery: 'Use the canonical absolute reviewer-invitation.md path.' }
    );
    error.cause = cause;
    throw error;
  }
}

function launchState(workspace, expected) {
  const file = path.join(workspace, 'provider', 'claude', 'launch-state.json');
  let value;
  try {
    const metadata = lstatSync(file);
    if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error('unsafe state file');
    value = JSON.parse(readFileSync(file, 'utf8'));
  } catch (cause) {
    const error = new AprError(
      'APR_CLAUDE_SESSION_INVALID',
      'Claude provider launch state cannot be read safely.',
      { recovery: 'Preserve the review workspace and restore its package-owned launch state.' }
    );
    error.cause = cause;
    throw error;
  }
  if (
    value?.schema !== 'ai-peer-review.claude-launch-state/v1' ||
    !/^[A-Za-z0-9._:-]+$/.test(value.session_handle ?? '') ||
    value.review_id !== expected.review_id ||
    value.invitation !== expected.invitation ||
    value.response !== expected.response ||
    value.model !== expected.model ||
    value.effort !== expected.effort
  ) {
    throw new AprError('APR_CLAUDE_SESSION_INVALID', 'Claude provider launch state is invalid.', {
      recovery: 'Preserve the review workspace and reconcile the exact Claude session.',
    });
  }
  return value;
}

export function createClaudeProviderSurface(options = {}) {
  const {
    execFile: execute = execFile,
    runLaunch = runClaudeReviewerLaunch,
    runWake,
    spawnProcess,
    claudeHome,
    inspectWakeAuthority = (workspace) => ({
      state: inspectReview(workspace),
      status: statusReview(workspace),
    }),
  } = options;
  let heartbeat = 0;
  const version = async () => {
    const result = await execute('claude', ['--version'], {
      shell: false,
      encoding: 'utf8',
      timeout: remainingProviderTime(),
      killSignal: 'SIGKILL',
    });
    const observed = String(result.stdout ?? '').match(/^(\d+\.\d+\.\d+)(?:\s|$)/)?.[1];
    if (!observed)
      throw new AprError('APR_CLAUDE_SESSION_INVALID', 'Claude version cannot be attested.', {
        recovery: 'Use the installed Claude CLI with a parseable version result.',
      });
    return observed;
  };
  const currentSnapshot = async ({ projectRoot, binding, now = new Date() }) => {
    const snapshot = readClaudeSessionSnapshot({
      projectRoot,
      sessionId: binding.handle_locator,
      claudeHome,
      now,
    });
    if (snapshot.model_id !== binding.model_id || snapshot.source_version !== (await version()))
      throw new AprError(
        'APR_IDENTITY_CONFLICT',
        'Claude bound session changed model or version.',
        {
          recovery: 'Preserve the exact session and reconcile its provider transcript.',
        }
      );
    return snapshot;
  };
  const executeReview = async (request, resume) => {
    const routing = routingFromInvitation(request.invitationPath);
    const state = inspectReview(routing.workspace);
    const repositoryRoot = state.protocol.startup.context.repository_root;
    const base = resume
      ? buildClaudeReviewerResume({
          repositoryRoot,
          invitation: request.invitationPath,
          routing,
        })
      : buildClaudeReviewerLaunch({
          repositoryRoot,
          invitation: request.invitationPath,
          routing,
          model: request.model,
          effort: request.effort,
        });
    const contract = Object.freeze({
      ...base,
      environment: Object.freeze({
        ...withoutProviderIdentity(process.env),
        CLAUDE_MODEL_ID: base.model,
        CLAUDE_MODEL_DISPLAY: base.model,
      }),
    });
    const recorder = createClaudeStreamRecorder({
      workspace: routing.workspace,
      operationId: `join:${routing.review_id}`,
      expectedCommand: claudeJoinCommand(contract),
    });
    const execution =
      Object.hasOwn(options, 'execFile') || Object.hasOwn(options, 'runLaunch')
        ? execute
        : createClaudeStreamingExec({ recorder, spawnProcess });
    const result = await runLaunch({ contract, resume, execFile: execution });
    if (!['submitted', 'permission-blocked'].includes(result.status)) {
      return Object.freeze({ status: 'outcome-unknown' });
    }
    const stored = launchState(routing.workspace, base);
    const observed = readClaudeStreamObservation({
      workspace: routing.workspace,
      operationId: `join:${routing.review_id}`,
      handleLocator: stored.session_handle,
    });
    if (observed.model_id !== request.model)
      throw new AprError(
        'APR_IDENTITY_CONFLICT',
        'Claude active model differs from reviewer selection.',
        {
          recovery: 'Preserve the exact session and reconcile its provider stream.',
        }
      );
    return Object.freeze({
      status: 'acknowledged',
      handle: stored.session_handle,
      observation: Object.freeze({
        provider: 'anthropic',
        host: 'claude-code',
        model_id: observed.model_id,
        model_source: 'official-exact-session',
        effort: request.effort,
        effort_source: 'requested',
        adapter_version: ADAPTER_VERSION,
        adapter_source: 'pinned-runtime',
        session_id: observed.session_id,
        assurance: 'runtime',
      }),
    });
  };
  return Object.freeze({
    nativeAutomatic: false,
    async conformance() {
      const observed = await version();
      const supported = observed === SUPPORTED_SURFACE_VERSION;
      return Object.freeze({
        surfaceVersion: observed,
        evidenceSources: {
          model: 'official-exact-session',
          session: 'official-exact-session',
        },
        operations: {
          launch: 'exact',
          createDistinctSession: 'exact',
          deliverToSession: 'exact',
          reconcile: 'exact',
        },
        health: {
          installed: true,
          healthy: supported,
          fresh: supported,
          surfaceVersion: observed,
          adapterVersion: ADAPTER_VERSION,
        },
      });
    },
    async available() {
      await execute('claude', ['--version'], {
        shell: false,
        encoding: 'utf8',
        timeout: remainingProviderTime(),
        killSignal: 'SIGKILL',
      });
      return true;
    },
    version,
    observeCurrentSession: ({ root, token, workspace, operationId, handleLocator }) =>
      operationId?.startsWith('start:')
        ? readClaudeStartHook({ root, token, sessionId: handleLocator, operationId })
        : readClaudeStreamObservation({ workspace, operationId, handleLocator }),
    observeBoundSession: ({ projectRoot, workspace, handleLocator, expected, now }) => {
      try {
        return readClaudeSessionSnapshot({
          projectRoot,
          sessionId: handleLocator,
          claudeHome,
          now,
        });
      } catch (cause) {
        if (cause?.code !== 'APR_CLAUDE_SESSION_ACTIVE') throw cause;
        if (expected.operation_id?.startsWith('start:')) {
          return readClaudeStartHookForSession({
            root: projectRoot,
            sessionId: handleLocator,
            operationId: expected.operation_id,
          });
        }
        return readClaudeStreamObservation({
          workspace,
          operationId: expected.operation_id,
          handleLocator,
        });
      }
    },
    observeTransport: async ({
      binding,
      workspace,
      projectRoot,
      activeEvidence,
      now = new Date(),
    }) => {
      if (activeEvidence) {
        if (
          activeEvidence.source !== 'official-exact-session' ||
          activeEvidence.session_id !== binding.handle_locator ||
          activeEvidence.model_id !== binding.model_id ||
          activeEvidence.source_version !== (await version())
        )
          throw new AprError(
            'APR_IDENTITY_CONFLICT',
            'Claude active transport differs from the bound tool use.',
            {
              recovery: 'Preserve the exact Claude session and re-observe its provider stream.',
            }
          );
      } else {
        try {
          await currentSnapshot({ projectRoot, binding, now });
        } catch (cause) {
          if (cause?.code !== 'APR_CLAUDE_SESSION_ACTIVE' || binding.role !== 'reviewer')
            throw cause;
          const active = readClaudeStreamObservation({
            workspace,
            operationId: `join:${inspectReview(workspace).protocol.review_id}`,
            handleLocator: binding.handle_locator,
          });
          if (
            active.model_id !== binding.model_id ||
            active.source_version !== (await version()) ||
            new Date(now).valueOf() - Date.parse(active.observed_at) > 30_000
          )
            throw new AprError(
              'APR_IDENTITY_CONFLICT',
              'Claude active reviewer observation is stale or changed.',
              {
                recovery: 'Preserve the exact session and re-observe its live provider stream.',
              }
            );
        }
      }
      heartbeat += 1;
      const observed = new Date(now);
      return Object.freeze({
        session_fingerprint: binding.session_fingerprint,
        capability: 'live-wait',
        adapter_version: ADAPTER_VERSION,
        lease: Object.freeze({
          schema: 'ai-peer-review.resident-lease/v1',
          process_instance_id: `claude-broker-${process.pid}`,
          pid: null,
          opaque_handle: binding.handle_locator,
          host: 'claude-code',
          adapter_version: ADAPTER_VERSION,
          heartbeat_sequence: heartbeat,
          observed_at: observed.toISOString(),
          expires_at: new Date(observed.valueOf() + 30_000).toISOString(),
        }),
      });
    },
    observeResource: async ({ binding, projectRoot }) => {
      await currentSnapshot({ projectRoot, binding });
      return Object.freeze({
        status: 'ready',
        session_handle: binding.handle_locator,
        observed_at: new Date().toISOString(),
      });
    },
    observeLaunchResource: async ({ operationId }) => {
      await version();
      return Object.freeze({
        status: 'ready',
        session_handle: operationId,
        observed_at: new Date().toISOString(),
      });
    },
    observeResourceRelease: async ({ prior, role, workspace, projectRoot }) => {
      if (role === 'reviewer-launch') {
        const journal = JSON.parse(
          readFileSync(path.join(workspace, 'startup-request.json'), 'utf8')
        );
        if (journal?.provider_operation?.status !== 'acknowledged')
          throw new AprError('APR_WAKE_OUTCOME_UNKNOWN', 'Claude launch is not reconciled.', {
            recovery: 'Preserve the provider lease and reconcile the exact launch operation.',
          });
      } else {
        await currentSnapshot({
          projectRoot,
          binding: {
            handle_locator: prior?.session_handle,
            model_id: inspectReview(workspace).participants[role]?.model_id,
          },
        });
      }
      return Object.freeze({
        status: 'complete',
        session_handle: prior.session_handle,
        observed_at: new Date().toISOString(),
      });
    },
    deliverToSession: async ({
      binding,
      wakeOperationId,
      capsule,
      capsuleDigest,
      workspace,
      projectRoot,
    }) => {
      await currentSnapshot({ projectRoot, binding });
      const recorder = createClaudeWakeRecorder({
        sessionId: binding.handle_locator,
        expectedModel: binding.model_id,
      });
      const permissions = buildClaudeWakePermissions({
        workspace,
        role: binding.role,
        ...inspectWakeAuthority(workspace),
      });
      const prompt = [
        `APR_WAKE_OPERATION ${wakeOperationId} ${capsuleDigest}`,
        `Resume your ${binding.role} role for review ${capsule.review_id}.`,
        `Run ${capsule.next_command} and complete the next documented action.`,
        'Use the review workspace as the authority; preserve its exact issue and participant identity.',
        ...(binding.role === 'author'
          ? [
              'If no artifact edit is needed, submit with --no-artifact-change --reason \"No artifact change is required for this response.\".',
            ]
          : []),
      ].join('\n');
      const args = [
        '-p',
        prompt,
        '--resume',
        binding.handle_locator,
        '--output-format',
        'json',
        '--permission-mode',
        'dontAsk',
        '--model',
        binding.model_id,
        '--allowedTools',
        ...permissions,
      ];
      const execution = await (
        runWake ??
        ((values, context) =>
          createClaudeStreamingExec({ recorder: context.recorder, spawnProcess })(
            'claude',
            values,
            { cwd: context.projectRoot, env: withoutProviderIdentity(process.env) }
          ))
      )(args, { recorder, projectRoot, workspace });
      if (execution?.exit_code !== 0) return { status: 'outcome-unknown', reason: 'provider-exit' };
      const observed = recorder.confirm();
      if (observed.source_version !== (await version()))
        throw new AprError('APR_IDENTITY_CONFLICT', 'Claude wake surface version changed.', {
          recovery: 'Preserve the wake operation and reconcile its exact provider stream.',
        });
      return readClaudeWakeOutcome({
        projectRoot,
        claudeHome,
        sessionId: binding.handle_locator,
        wakeOperationId,
        capsuleDigest,
        expectedModel: binding.model_id,
      });
    },
    reconcileDelivery: ({ binding, wakeOperationId, capsuleDigest, projectRoot }) =>
      readClaudeWakeOutcome({
        projectRoot,
        claudeHome,
        sessionId: binding.handle_locator,
        wakeOperationId,
        capsuleDigest,
        expectedModel: binding.model_id,
      }),
    launch: (request) => executeReview(request, false),
    resume: (request) => executeReview(request, true),
    deliver: (request) => executeReview(request, true),
  });
}

export function createClaudeAdapter(options = {}) {
  const { surface = createClaudeProviderSurface(options), ...adapterOptions } = options;
  return createProviderAdapter({
    ...adapterOptions,
    selector: 'claude',
    provider: 'anthropic',
    host: 'claude-code',
    models: MODELS,
    surface,
    adapterVersion: ADAPTER_VERSION,
    resource: { concurrent: true, resource_id: null },
  });
}

export const claudeProviderAdapter = registerProductionProviderAdapter(createClaudeAdapter());
export default claudeProviderAdapter;
