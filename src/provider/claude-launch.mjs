import { lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';

import { resolveContainedPath } from '../collateral/paths.mjs';
import { AprError } from '../errors.mjs';

const UNSUPPORTED_PATTERN = /[*?\[\]\\]/u;
const EFFORTS = new Set(['low', 'medium', 'high']);

function fail(message, recovery, details = {}) {
  throw new AprError('APR_CLAUDE_PERMISSION_INVALID', message, { recovery, details });
}

function exactPath(value, label) {
  if (
    typeof value !== 'string' ||
    !path.isAbsolute(value) ||
    path.normalize(value) !== value ||
    value.includes('\0')
  ) {
    fail(
      `Claude ${label} path is not canonical and absolute.`,
      `Use the exact canonical absolute ${label} path from the sealed reviewer invitation.`,
      { label }
    );
  }
  return value;
}

function safeIdentifier(value, label) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)) {
    fail(
      `Claude ${label} is invalid.`,
      `Use the exact non-empty ${label} selected for this reviewer launch.`,
      { label }
    );
  }
  return value;
}

function contained(root, candidate, label) {
  try {
    return resolveContainedPath(root, exactPath(candidate, label), label);
  } catch (cause) {
    if (cause instanceof AprError && cause.code === 'APR_CLAUDE_PERMISSION_INVALID') throw cause;
    const error = new AprError(
      'APR_CLAUDE_PERMISSION_INVALID',
      `Claude ${label} path is outside the physical repository boundary.`,
      {
        recovery: `Use the exact ${label} path from the sealed reviewer invitation in this physical worktree.`,
        details: { label },
      }
    );
    error.cause = cause;
    throw error;
  }
}

function regularFile(file, label) {
  try {
    const metadata = lstatSync(file);
    if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error('not a regular file');
  } catch (cause) {
    const error = new AprError(
      'APR_INVITATION_INVALID',
      `Claude ${label} must be an existing regular file.`,
      `Use the exact generated ${label} from peer-review start.`,
      { label }
    );
    error.cause = cause;
    throw error;
  }
}

export function encodeClaudeEditRule(absolutePath) {
  const selected = exactPath(absolutePath, 'response');
  if (UNSUPPORTED_PATTERN.test(selected)) {
    fail(
      'Claude response permission path is not exactly representable.',
      'Use a canonical physical response path without permission-pattern metacharacters.'
    );
  }
  return `Edit(/${selected})`;
}

export function matchesClaudeEditRule(rule, candidate, { projectRoot } = {}) {
  if (typeof rule !== 'string' || typeof candidate !== 'string' || !path.isAbsolute(candidate)) {
    return false;
  }
  const match = rule.match(/^Edit\((\/{1,2}[^\0]*)\)$/u);
  if (!match || UNSUPPORTED_PATTERN.test(match[1])) return false;
  const specifier = match[1];
  let selected;
  if (specifier.startsWith('//')) {
    selected = path.normalize(specifier.slice(1));
  } else {
    if (typeof projectRoot !== 'string' || !path.isAbsolute(projectRoot)) return false;
    selected = path.resolve(projectRoot, specifier.slice(1));
  }
  return path.normalize(candidate) === selected;
}

function launchPrompt(invitation) {
  return [
    `Open the sealed reviewer invitation at ${invitation}.`,
    'Join with its exact command, complete the independent review, edit only its pending response,',
    'and submit with the exact peer-review command. Do not edit the artifact or use Git.',
  ].join(' ');
}

export function buildClaudeReviewerLaunch({
  repositoryRoot,
  invitation,
  routing,
  model,
  effort,
} = {}) {
  let physicalRoot;
  try {
    physicalRoot = realpathSync(exactPath(repositoryRoot, 'repository'));
  } catch (cause) {
    if (cause instanceof AprError) throw cause;
    fail(
      'Claude repository path cannot be resolved physically.',
      'Run the launch from the exact physical review worktree.'
    );
  }
  if (
    !routing ||
    routing.schema !== 'ai-peer-review.invitation-routing/v1' ||
    typeof routing.review_id !== 'string'
  ) {
    fail(
      'Claude launch routing is not a sealed reviewer invitation projection.',
      'Use the exact generated reviewer invitation from peer-review start.'
    );
  }
  const resolvedInvitation = contained(physicalRoot, invitation, 'invitation');
  const artifact = contained(physicalRoot, routing.artifact, 'artifact');
  const workspace = contained(physicalRoot, routing.workspace, 'workspace');
  const response = contained(physicalRoot, routing.response, 'response');
  regularFile(resolvedInvitation.absolute, 'reviewer invitation');
  regularFile(artifact.absolute, 'reviewed artifact');
  if (
    path.basename(resolvedInvitation.absolute) !== 'reviewer-invitation.md' ||
    path.dirname(resolvedInvitation.absolute) !== path.dirname(response.absolute)
  ) {
    throw new AprError(
      'APR_INVITATION_INVALID',
      'Claude launch invitation does not own the pending response destination.',
      { recovery: 'Use the exact generated reviewer invitation and its sealed response path.' }
    );
  }
  const selectedModel = safeIdentifier(model, 'model');
  if (!EFFORTS.has(effort)) {
    fail(
      'Claude effort is invalid.',
      'Use one of the supported Claude effort levels: low, medium, or high.'
    );
  }
  const rule = encodeClaudeEditRule(response.absolute);
  const badRule = `Edit(${response.absolute})`;
  const neighbor = path.join(path.dirname(response.absolute), 'reviewer-response-2.md');
  const readiness = Object.freeze({
    exact_response: matchesClaudeEditRule(rule, response.absolute, {
      projectRoot: physicalRoot,
    }),
    bad_single_slash_rejected: !matchesClaudeEditRule(badRule, response.absolute, {
      projectRoot: physicalRoot,
    }),
    artifact_rejected: !matchesClaudeEditRule(rule, artifact.absolute, {
      projectRoot: physicalRoot,
    }),
    neighbor_rejected: !matchesClaudeEditRule(rule, neighbor, {
      projectRoot: physicalRoot,
    }),
  });
  if (Object.values(readiness).some((value) => value !== true)) {
    fail(
      'Claude response permission readiness proof failed.',
      'Preserve the review and repair the exact response rule before launching Claude.'
    );
  }
  const allow = Object.freeze(['Read', 'Glob', 'Grep', rule]);
  const args = Object.freeze([
    '-p',
    launchPrompt(resolvedInvitation.absolute),
    '--output-format',
    'json',
    '--permission-mode',
    'dontAsk',
    '--model',
    selectedModel,
    '--effort',
    effort,
    '--allowedTools',
    ...allow,
  ]);
  return Object.freeze({
    schema: 'ai-peer-review.claude-launch/v1',
    review_id: routing.review_id,
    repository_root: physicalRoot,
    invitation: resolvedInvitation.absolute,
    workspace: workspace.absolute,
    response: response.absolute,
    artifact: artifact.absolute,
    model: selectedModel,
    effort,
    mode: 'launch',
    permissions: Object.freeze({ allow }),
    command: Object.freeze({ file: 'claude', args, shell: false }),
    readiness,
  });
}
