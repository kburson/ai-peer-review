import { realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AprError } from '../errors.mjs';
import { inspectReviewerExecutionAuthority as defaultInspectAuthority } from '../protocol/service.mjs';

const DEFAULT_PACKAGE_BIN = fileURLToPath(new URL('../../bin/peer-review.mjs', import.meta.url));
const EFFORTS = new Set(['low', 'medium', 'high']);

function invalid(message, details = {}) {
  throw new AprError('APR_EXECUTION_CONTRACT_INVALID', message, {
    recovery: 'Rebuild the reviewer execution contract from the current workspace authority.',
    details,
  });
}

function absolute(value, label) {
  if (typeof value !== 'string' || !path.isAbsolute(value) || path.normalize(value) !== value) {
    invalid(`${label} must be canonical and absolute.`, { label });
  }
  return value;
}

function contained(root, candidate, label) {
  const selected = path.resolve(root, candidate);
  const relative = path.relative(root, selected);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    invalid(`${label} escapes the physical repository.`, { label });
  }
  return selected;
}

function command(file, args) {
  return Object.freeze({ file, args: Object.freeze([...args]), shell: false });
}

export function buildReviewerExecutionContract({
  workspace,
  host,
  model,
  effort,
  inspectAuthority = defaultInspectAuthority,
  packageBin = DEFAULT_PACKAGE_BIN,
  nodeExecutable = process.execPath,
} = {}) {
  if (host !== 'claude' || typeof model !== 'string' || !model.trim() || !EFFORTS.has(effort)) {
    invalid('Reviewer host, model, or effort is unsupported.');
  }
  let physicalWorkspace;
  try {
    physicalWorkspace = realpathSync(absolute(workspace, 'workspace'));
  } catch (cause) {
    if (cause instanceof AprError) throw cause;
    const error = new AprError(
      'APR_EXECUTION_CONTRACT_INVALID',
      'The reviewer workspace cannot be resolved physically.',
      { recovery: 'Use the exact retained review workspace.' }
    );
    error.cause = cause;
    throw error;
  }
  const authority = inspectAuthority(physicalWorkspace);
  const protocol = authority?.state?.protocol;
  const reviewer = authority?.state?.participants?.reviewer ?? null;
  if (
    !protocol ||
    typeof protocol.review_id !== 'string' ||
    !Number.isSafeInteger(protocol.sequence) ||
    !Number.isSafeInteger(protocol.revision) ||
    protocol.current_actor !== 'reviewer' ||
    !Number.isSafeInteger(protocol.turns_used) ||
    typeof protocol.startup?.context?.repository_root !== 'string' ||
    typeof protocol.artifact?.path !== 'string'
  ) {
    invalid('Current event authority is not eligible for reviewer execution.');
  }
  let repositoryRoot;
  try {
    repositoryRoot = realpathSync(protocol.startup.context.repository_root);
  } catch (cause) {
    const error = new AprError(
      'APR_EXECUTION_CONTRACT_INVALID',
      'The event-authorized repository cannot be resolved physically.',
      { recovery: 'Return to the exact physical repository recorded at review startup.' }
    );
    error.cause = cause;
    throw error;
  }
  const invitation = path.join(physicalWorkspace, 'reviewer-invitation.md');
  const response = path.join(physicalWorkspace, `reviewer-response-${protocol.turns_used + 1}.md`);
  const artifact = contained(repositoryRoot, protocol.artifact.path, 'artifact');
  const node = absolute(nodeExecutable, 'Node executable');
  const packageCommand = absolute(packageBin, 'package executable');
  const joinRequired = reviewer === null;
  const join = joinRequired ? command(node, [packageCommand, 'join', invitation]) : null;
  const submit = command(node, [packageCommand, 'submit', physicalWorkspace]);

  return Object.freeze({
    schema: 'ai-peer-review.execution-contract/v1',
    review_id: protocol.review_id,
    repository_root: repositoryRoot,
    workspace: physicalWorkspace,
    invitation,
    response,
    artifact,
    host,
    model: model.trim(),
    effort,
    join_required: joinRequired,
    authority: Object.freeze({
      sequence: protocol.sequence,
      revision: protocol.revision,
      reviewer_fingerprint: reviewer?.session_fingerprint ?? null,
    }),
    commands: Object.freeze({ join, submit }),
  });
}
