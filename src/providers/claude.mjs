import { createProviderAdapter, registerProductionProviderAdapter } from './registry.mjs';
import { execFile as execFileCallback } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import { AprError } from '../errors.mjs';
import {
  buildClaudeReviewerLaunch,
  buildClaudeReviewerResume,
  claudeJoinCommand,
  runClaudeReviewerLaunch,
} from '../provider/claude-launch.mjs';
import { inspectReview } from '../protocol/service.mjs';
import {
  createClaudeStreamRecorder,
  createClaudeStreamingExec,
  readClaudeSessionSnapshot,
  readClaudeStreamObservation,
} from './claude-stream.mjs';

const execFile = promisify(execFileCallback);
const ADAPTER_VERSION = '1.0.0';

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
    spawnProcess,
    claudeHome,
  } = options;
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
        ...process.env,
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
    async available() {
      await execute('claude', ['--version'], { shell: false, encoding: 'utf8' });
      return true;
    },
    async version() {
      const result = await execute('claude', ['--version'], { shell: false, encoding: 'utf8' });
      const version = String(result.stdout ?? '').match(/^(\d+\.\d+\.\d+)(?:\s|$)/)?.[1];
      if (!version)
        throw new AprError('APR_CLAUDE_SESSION_INVALID', 'Claude version cannot be attested.', {
          recovery: 'Use the installed Claude CLI with a parseable version result.',
        });
      return version;
    },
    observeCurrentSession: ({ workspace, operationId, handleLocator }) =>
      readClaudeStreamObservation({ workspace, operationId, handleLocator }),
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
        return readClaudeStreamObservation({
          workspace,
          operationId: expected.operation_id,
          handleLocator,
        });
      }
    },
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
