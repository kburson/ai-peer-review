import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderCommand } from '../cli/help-data.mjs';
import { resolveContainedPath } from '../collateral/paths.mjs';
import { AprError } from '../errors.mjs';
import { fingerprintSession as defaultFingerprintSession } from '../identity/registry.mjs';
import { inspectReviewAuthority as defaultInspectAuthority } from '../protocol/service.mjs';
import { atomicWrite } from '../protocol/store.mjs';
import {
  buildClaudeLaunchDiagnostic,
  normalizeClaudeExecution,
} from './claude-launch-diagnostics.mjs';

const UNSUPPORTED_PATTERN = /[*?\[\]\\]/u;
const UNSUPPORTED_BASH_PATTERN = /[*?\[\]\\()]/u;
const EFFORTS = new Set(['low', 'medium', 'high']);
const PACKAGE_BIN = fileURLToPath(new URL('../../bin/peer-review.mjs', import.meta.url));

export function buildClaudeLaunchEnvironment(parentEnvironment = process.env) {
  const environment = { ...parentEnvironment };
  for (const key of [
    'CODEX_SESSION_ID',
    'CODEX_THREAD_ID',
    'CODEX_MODEL_ID',
    'CODEX_MODEL_DISPLAY',
  ]) {
    delete environment[key];
  }
  return environment;
}

function packageCommand(verb, target) {
  return [process.execPath, PACKAGE_BIN, verb, target];
}

function fail(message, recovery, details = {}) {
  throw new AprError('APR_CLAUDE_PERMISSION_INVALID', message, { recovery, details });
}

function pathImplementation(value) {
  if (typeof value !== 'string') return null;
  if (path.posix.isAbsolute(value)) return path.posix;
  if (/^[A-Za-z]:\\/.test(value) && path.win32.isAbsolute(value)) return path.win32;
  return null;
}

function exactPath(value, label) {
  const implementation = pathImplementation(value);
  if (!implementation || implementation.normalize(value) !== value || value.includes('\0')) {
    fail(
      `Claude ${label} path is not canonical and absolute.`,
      `Use the exact canonical absolute ${label} path from the sealed reviewer invitation.`,
      { label }
    );
  }
  return value;
}

function claudePath(value, label) {
  const selected = exactPath(value, label);
  if (path.posix.isAbsolute(selected)) return selected;
  return `/${selected[0].toLowerCase()}${selected.slice(2).replaceAll('\\', '/')}`;
}

function portableCommandPath(value, label) {
  const selected = exactPath(value, label);
  return path.posix.isAbsolute(selected) ? selected : selected.replaceAll('\\', '/');
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
  const selected = claudePath(absolutePath, 'response');
  if (UNSUPPORTED_PATTERN.test(selected)) {
    fail(
      'Claude response permission path is not exactly representable.',
      'Use a canonical physical response path without permission-pattern metacharacters.'
    );
  }
  return `Edit(/${selected})`;
}

export function matchesClaudeEditRule(rule, candidate, { projectRoot } = {}) {
  if (typeof rule !== 'string' || typeof candidate !== 'string') return false;
  const match = rule.match(/^Edit\((\/{1,2}[^\0]*)\)$/u);
  if (!match || UNSUPPORTED_PATTERN.test(match[1])) return false;
  const specifier = match[1];
  try {
    const normalizedCandidate = claudePath(candidate, 'response');
    let selected;
    if (specifier.startsWith('//')) {
      selected = path.posix.normalize(specifier.slice(1));
    } else {
      const normalizedProject = claudePath(projectRoot, 'repository');
      selected = path.posix.resolve(normalizedProject, specifier.slice(1));
    }
    return normalizedCandidate === selected;
  } catch {
    return false;
  }
}

function renderClaudeBashCommand(argv) {
  const portableArgv = argv.map((value) =>
    pathImplementation(value) ? portableCommandPath(value, 'command') : value
  );
  return renderCommand(portableArgv, { platform: 'linux' });
}

export function claudeJoinCommand(contract) {
  return renderClaudeBashCommand(packageCommand('join', contract?.invitation));
}

function encodeClaudeBashRule(argv) {
  const command = renderClaudeBashCommand(argv);
  if (UNSUPPORTED_BASH_PATTERN.test(command)) {
    fail(
      'Claude package command permission is not exactly representable.',
      'Use canonical review paths without permission-pattern metacharacters.'
    );
  }
  return `Bash(${command})`;
}

function localNpxBinMatches(root, entry) {
  const directory = path.join(root, 'node_modules/.bin');
  const bin = path.join(
    directory,
    process.platform === 'win32' ? 'peer-review.cmd' : 'peer-review'
  );
  if (process.platform !== 'win32') return realpathSync(bin) === realpathSync(entry);
  // npm's Windows executable is a cmd-shim, not a symbolic link. Compare its
  // destination using the same target form read-cmd-shim recognizes.
  const targets = [...readFileSync(bin, 'utf8').matchAll(/"%(?:~dp0|dp0%)\\([^"\r\n]+)"\s+%[*]/g)];
  return (
    targets.length === 1 &&
    realpathSync(path.resolve(directory, targets[0][1])) === realpathSync(entry)
  );
}

// A managed turn uses the pinned package directly. Existing plain commands
// remain supported; npx aliases are available only with a project-local install.
// npm is forced offline by the provider environment, so aliases cannot fetch.
function wakeLaunchers(root) {
  const launchers = [
    [process.execPath, fileURLToPath(new URL('../../bin/peer-review.mjs', import.meta.url))],
    ['peer-review'],
  ];
  if (root) {
    try {
      const directory = path.join(root, 'node_modules/@kburson/ai-peer-review');
      const manifest = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
      if (
        manifest.name === '@kburson/ai-peer-review' &&
        manifest.version === '0.3.0' &&
        manifest.bin?.['peer-review'] === './bin/peer-review.mjs' &&
        lstatSync(path.join(directory, 'bin/peer-review.mjs')).isFile() &&
        localNpxBinMatches(root, path.join(directory, 'bin/peer-review.mjs'))
      )
        launchers.push(['npx', 'peer-review'], ['npx', '--no-install', 'peer-review']);
    } catch {
      // No local package means no npm-resolution fallback is authorized.
    }
  }
  return launchers;
}

export function buildClaudeWakeContract({ workspace, role, state, status }) {
  exactPath(workspace, 'workspace');
  if (!['author', 'reviewer'].includes(role) || state?.protocol?.current_actor !== role)
    fail(
      'Claude wake has no current pending participant response.',
      'Reconcile the current role before waking its exact session.'
    );
  const root = state.protocol.startup?.context?.repository_root;
  const action = status?.next_action?.action;
  const commands = [];
  const rules = ['Read', 'Glob', 'Grep'];
  const launchers = wakeLaunchers(root);
  const addCommand = (name, argv) => {
    for (const launcher of launchers) {
      const args = [...launcher, ...argv];
      const command = renderClaudeBashCommand(args);
      rules.push(encodeClaudeBashRule(args));
      if (launcher === launchers[0]) commands.push(Object.freeze({ name, command }));
    }
  };
  addCommand('resume', ['resume', workspace]);
  if (
    role === 'author' &&
    ['finalize-acceptance', 'commit-acceptance', 'advance-phase-artifact'].includes(action)
  ) {
    // The next phase artifact is unbound: never invent an advance permission.
    if (action !== 'advance-phase-artifact') addCommand('finalize', ['finalize', workspace]);
  } else {
    if (!status?.paths?.response)
      fail(
        'Claude wake has no current pending participant response.',
        'Reconcile the current role before waking its exact session.'
      );
    const response = contained(root, status.paths.response, 'response').absolute;
    addCommand('submit', ['submit', workspace]);
    rules.push(encodeClaudeEditRule(response));
    if (role === 'author') {
      rules.push(
        encodeClaudeEditRule(
          contained(root, path.resolve(root, state.protocol.artifact.path), 'artifact').absolute
        )
      );
      addCommand('submit-without-artifact-change', [
        'submit',
        workspace,
        '--no-artifact-change',
        '--reason',
        'No artifact change is required for this response.',
      ]);
    }
  }
  return Object.freeze({ commands: Object.freeze(commands), permissions: Object.freeze(rules) });
}

export function buildClaudeWakePermissions(input) {
  return buildClaudeWakeContract(input).permissions;
}

function launchPrompt(invitation, joinCommand, submitCommand) {
  return [
    `Open the sealed reviewer invitation at ${invitation}.`,
    `Run exactly: ${joinCommand}. Complete the independent review and edit only its pending response.`,
    `Then run exactly: ${submitCommand}. Do not edit the artifact or use Git.`,
  ].join(' ');
}

function executionPrompt(contract, joinCommand, submitCommand) {
  const instructions = [`Open the sealed reviewer invitation at ${contract.invitation}.`];
  if (contract.join_required) {
    instructions.push(
      `Run exactly: ${joinCommand}. Complete the independent review and edit only its pending response.`
    );
  } else {
    instructions.push(
      'Continue the registered independent review and edit only its pending response.'
    );
  }
  instructions.push(`Then run exactly: ${submitCommand}. Do not edit the artifact or use Git.`);
  return instructions.join(' ');
}

export function encodeClaudeExecutionPermissions(contract) {
  if (contract?.schema !== 'ai-peer-review.execution-contract/v1') {
    throw new AprError(
      'APR_PERMISSION_UNREPRESENTABLE',
      'Claude permissions require a current reviewer execution contract.',
      { recovery: 'Rebuild the contract from current workspace authority.' }
    );
  }
  try {
    const rules = ['Read', 'Glob', 'Grep'];
    if (contract.commands.join) {
      rules.push(
        encodeClaudeBashRule([contract.commands.join.file, ...contract.commands.join.args])
      );
    }
    rules.push(
      encodeClaudeBashRule([contract.commands.submit.file, ...contract.commands.submit.args])
    );
    rules.push(encodeClaudeEditRule(contract.response));
    return Object.freeze(rules);
  } catch (cause) {
    if (cause?.code === 'APR_PERMISSION_UNREPRESENTABLE') throw cause;
    const error = new AprError(
      'APR_PERMISSION_UNREPRESENTABLE',
      'The exact reviewer command or path cannot be represented in Claude permissions.',
      {
        recovery:
          'Install or select canonical Node, package, provider, workspace, and response paths representable by Claude, then rerun preflight.',
      }
    );
    error.cause = cause;
    throw error;
  }
}

export function buildClaudeReviewerLaunchFromExecution({ contract, preflight } = {}) {
  if (
    contract?.schema !== 'ai-peer-review.execution-contract/v1' ||
    preflight?.schema !== 'ai-peer-review.provider-preflight/v1' ||
    preflight.status !== 'ready' ||
    !preflight.child_environment
  ) {
    throw new AprError(
      'APR_CLAUDE_RESULT_INVALID',
      'Claude launch requires a current contract and successful deterministic preflight.',
      { recovery: 'Rebuild the current contract and rerun preflight before dispatch.' }
    );
  }
  regularFile(contract.invitation, 'reviewer invitation');
  regularFile(contract.artifact, 'reviewed artifact');
  const allow = encodeClaudeExecutionPermissions(contract);
  if (JSON.stringify(allow) !== JSON.stringify(preflight.permissions)) {
    throw new AprError(
      'APR_PERMISSION_UNREPRESENTABLE',
      'Claude launch permissions differ from the preflight proof.',
      { recovery: 'Discard the stale preflight and rerun it against the current contract.' }
    );
  }
  const joinCommand = contract.commands.join
    ? renderClaudeBashCommand([contract.commands.join.file, ...contract.commands.join.args])
    : null;
  const submitCommand = renderClaudeBashCommand([
    contract.commands.submit.file,
    ...contract.commands.submit.args,
  ]);
  const args = Object.freeze([
    '-p',
    executionPrompt(contract, joinCommand, submitCommand),
    '--output-format',
    'json',
    '--permission-mode',
    'dontAsk',
    '--model',
    contract.model,
    '--effort',
    contract.effort,
    '--allowedTools',
    ...allow,
  ]);
  const result = {
    schema: 'ai-peer-review.claude-launch/v1',
    review_id: contract.review_id,
    repository_root: contract.repository_root,
    invitation: contract.invitation,
    workspace: contract.workspace,
    response: contract.response,
    artifact: contract.artifact,
    model: contract.model,
    effort: contract.effort,
    mode: 'launch',
    permissions: Object.freeze({ allow }),
    command: Object.freeze({ file: preflight.executable.path, args, shell: false }),
    readiness: Object.freeze({
      exact_response: true,
      bad_single_slash_rejected: true,
      artifact_rejected: !matchesClaudeEditRule(allow.at(-1), contract.artifact, {
        projectRoot: contract.repository_root,
      }),
      neighbor_rejected: !matchesClaudeEditRule(
        allow.at(-1),
        path.join(
          path.dirname(contract.response),
          `reviewer-response-${Number(contract.response.match(/(\d+)\.md$/u)?.[1] ?? 0) + 1}.md`
        ),
        { projectRoot: contract.repository_root }
      ),
    }),
    preflight_digest: preflight.digest,
  };
  Object.defineProperty(result, 'environment', {
    value: preflight.child_environment,
    enumerable: false,
    writable: false,
  });
  return Object.freeze(result);
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
  if (path.dirname(resolvedInvitation.absolute) !== path.dirname(response.absolute)) {
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
  const join = packageCommand('join', resolvedInvitation.absolute);
  const submit = packageCommand('submit', workspace.absolute);
  const joinCommand = renderClaudeBashCommand(join);
  const submitCommand = renderClaudeBashCommand(submit);
  const joinRule = encodeClaudeBashRule(join);
  const submitRule = encodeClaudeBashRule(submit);
  const badRule = `Edit(${response.absolute})`;
  const responseName = path.basename(response.absolute).match(/^(.*reviewer-response-)(\d+)\.md$/u);
  const neighbor = path.join(
    path.dirname(response.absolute),
    `${responseName?.[1]}${Number(responseName?.[2]) + 1}.md`
  );
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
  const allow = Object.freeze(['Read', 'Glob', 'Grep', joinRule, submitRule, rule]);
  const args = Object.freeze([
    '-p',
    launchPrompt(resolvedInvitation.absolute, joinCommand, submitCommand),
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

function resultError(message) {
  return new AprError('APR_CLAUDE_RESULT_INVALID', message, {
    recovery: 'Preserve the review workspace and re-read its event authority.',
  });
}

function authorityProjection(value, label) {
  const protocol = value?.state?.protocol;
  const reviewer = value?.state?.participants?.reviewer;
  if (
    !protocol ||
    typeof protocol.review_id !== 'string' ||
    !Number.isSafeInteger(protocol.sequence) ||
    protocol.sequence < 0 ||
    !Number.isSafeInteger(protocol.revision) ||
    protocol.revision < 0 ||
    typeof protocol.state !== 'string' ||
    !Array.isArray(value.events) ||
    (protocol.state !== 'awaiting-reviewer' && typeof reviewer?.session_fingerprint !== 'string') ||
    value.events.some(
      (event) =>
        !event ||
        !Number.isSafeInteger(event.sequence) ||
        event.sequence < 0 ||
        event.sequence > protocol.sequence ||
        !Number.isSafeInteger(event.revision) ||
        event.revision < 0 ||
        event.revision > protocol.revision ||
        event.review_id !== protocol.review_id
    )
  ) {
    throw resultError(`Claude ${label} review authority is incomplete.`);
  }
  if (
    reviewer &&
    (reviewer.host !== 'claude-code' ||
      reviewer.provider !== 'anthropic' ||
      !/^sha256:[0-9a-f]{64}$/.test(reviewer.session_fingerprint))
  ) {
    throw new AprError('APR_IDENTITY_CONFLICT', 'Registered reviewer is not the Claude session.', {
      recovery: 'Restore the exact registered Claude reviewer session.',
    });
  }
  return { protocol, reviewer };
}

function deniedExactResponse(providerResult, response) {
  let expected;
  try {
    expected = claudePath(response, 'response');
  } catch {
    return false;
  }
  return (providerResult?.permission_denials ?? []).some((denial) => {
    if (!denial || !['Edit', 'Write'].includes(denial.tool)) return false;
    try {
      return claudePath(denial.path, 'response') === expected;
    } catch {
      return false;
    }
  });
}

export function classifyClaudeReviewerOutcome({
  before,
  after,
  providerResult,
  contract,
  expectedSessionFingerprint = null,
  resumeAvailable = false,
} = {}) {
  const prior = authorityProjection(before, 'pre-launch');
  const current = authorityProjection(after, 'post-launch');
  if (
    contract?.review_id !== prior.protocol.review_id ||
    current.protocol.review_id !== prior.protocol.review_id ||
    typeof contract?.response !== 'string' ||
    typeof contract?.invitation !== 'string' ||
    current.protocol.sequence < prior.protocol.sequence ||
    current.protocol.revision < prior.protocol.revision
  ) {
    throw resultError('Claude launch result does not match the review authority.');
  }
  const decisions = after.events.filter(
    (event) =>
      event.sequence > prior.protocol.sequence &&
      ['reviewer-accepted', 'reviewer-revisions-requested'].includes(event.type)
  );
  if (decisions.length > 1) {
    throw resultError('Claude launch produced ambiguous reviewer submission evidence.');
  }
  const decision = decisions[0];
  if (decision && current.protocol.state === 'awaiting-reviewer') {
    throw resultError('Claude submission is inconsistent with awaiting-reviewer authority.');
  }
  if (decision && (!current.reviewer || decision.actor !== current.reviewer.session_fingerprint)) {
    throw new AprError(
      'APR_IDENTITY_CONFLICT',
      'Claude launch submission belongs to a different reviewer identity.',
      { recovery: 'Restore the exact registered reviewer session; do not replace its identity.' }
    );
  }
  if (
    expectedSessionFingerprint !== null &&
    (!/^sha256:[0-9a-f]{64}$/.test(expectedSessionFingerprint) ||
      (current.reviewer && expectedSessionFingerprint !== current.reviewer.session_fingerprint))
  ) {
    throw new AprError(
      'APR_IDENTITY_CONFLICT',
      'Claude session does not match registered reviewer.',
      {
        recovery: 'Resume the exact registered Claude reviewer session.',
      }
    );
  }
  const submitted = Boolean(
    decision && expectedSessionFingerprint === current.reviewer.session_fingerprint
  );
  const denied = deniedExactResponse(providerResult, contract.response);
  let status = 'outcome-unknown';
  let category = 'no-submission';
  if (submitted) status = 'submitted';
  else if (decision) category = 'session-unavailable';
  else if (denied) {
    status = 'permission-blocked';
    category = 'response-permission-denied';
  } else if (providerResult?.spawn_code) {
    status = 'failed';
    category = 'spawn-failed';
  } else if (
    (Number.isSafeInteger(providerResult?.exit_code) && providerResult.exit_code !== 0) ||
    providerResult?.provider_failed
  ) {
    status = 'failed';
    category = providerResult?.join_code ? 'join-failed' : 'provider-failed';
  } else if (providerResult?.interrupted) category = 'execution-interrupted';
  else if (!providerResult?.output_valid) category = 'invalid-provider-output';
  else if (expectedSessionFingerprint === null) category = 'session-unavailable';
  const recovery =
    status === 'permission-blocked' && resumeAvailable === true
      ? Object.freeze({
          command: renderCommand([
            'peer-review',
            'launch-reviewer',
            contract.invitation,
            '--host',
            'claude',
            '--resume',
          ]),
          reason: 'response-permission-denied',
        })
      : null;
  return Object.freeze({
    schema: 'ai-peer-review.claude-launch-result/v1',
    command: 'launch-reviewer',
    review_id: current.protocol.review_id,
    status,
    protocol_revision: current.protocol.revision,
    response: contract.response,
    session_fingerprint: current.reviewer?.session_fingerprint ?? null,
    recovery,
    ...(status === 'submitted'
      ? {}
      : {
          diagnostic: buildClaudeLaunchDiagnostic({
            category,
            exit_code: Number.isSafeInteger(providerResult?.exit_code)
              ? providerResult.exit_code
              : null,
            code:
              category === 'spawn-failed'
                ? providerResult.spawn_code
                : category === 'join-failed'
                  ? providerResult.join_code
                  : null,
          }),
        }),
  });
}

function launchStatePath(contract) {
  return contained(
    contract.repository_root,
    path.join(contract.workspace, 'provider', 'claude', 'launch-state.json'),
    'Claude launch state'
  ).absolute;
}

function sessionError(message, recovery) {
  return new AprError('APR_CLAUDE_SESSION_INVALID', message, { recovery });
}

function readLaunchState(
  contract,
  fingerprintSession = defaultFingerprintSession,
  { allowPriorResponse = false } = {}
) {
  const file = launchStatePath(contract);
  let value;
  try {
    const metadata = lstatSync(file);
    if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error('unsafe state file');
    value = JSON.parse(readFileSync(file, 'utf8'));
  } catch (cause) {
    const error = sessionError(
      'Claude resume state cannot be read safely.',
      'Preserve the review and restore its package-owned Claude launch state.'
    );
    error.cause = cause;
    throw error;
  }
  const expected = {
    review_id: contract.review_id,
    invitation: contract.invitation,
    model: contract.model,
    effort: contract.effort,
  };
  if (
    value?.schema !== 'ai-peer-review.claude-launch-state/v1' ||
    typeof value.session_handle !== 'string' ||
    !/^[A-Za-z0-9._:-]+$/.test(value.session_handle) ||
    !/^sha256:[0-9a-f]{64}$/.test(value.session_fingerprint ?? '') ||
    value.session_fingerprint !== fingerprintSession('anthropic', value.session_handle) ||
    !Number.isSafeInteger(value.protocol_revision) ||
    value.protocol_revision < 0 ||
    (allowPriorResponse
      ? typeof value.response !== 'string'
      : value.response !== contract.response) ||
    Object.entries(expected).some(([key, selected]) => value[key] !== selected)
  ) {
    throw sessionError(
      'Claude resume state conflicts with the current launch contract.',
      'Use the exact recorded invitation, model, effort, and reviewer session.'
    );
  }
  return Object.freeze({ ...value });
}

export function buildClaudeReviewerResume({ repositoryRoot, invitation, routing } = {}) {
  let physicalRoot;
  try {
    physicalRoot = realpathSync(exactPath(repositoryRoot, 'repository'));
  } catch (cause) {
    if (cause instanceof AprError) throw cause;
    throw sessionError(
      'Claude resume repository cannot be resolved physically.',
      'Return to the exact physical review worktree and retry.'
    );
  }
  const workspace = contained(physicalRoot, routing?.workspace, 'workspace');
  const stateFile = contained(
    physicalRoot,
    path.join(workspace.absolute, 'provider', 'claude', 'launch-state.json'),
    'Claude launch state'
  ).absolute;
  let state;
  try {
    const metadata = lstatSync(stateFile);
    if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error('unsafe state file');
    state = JSON.parse(readFileSync(stateFile, 'utf8'));
  } catch (cause) {
    const error = sessionError(
      'Claude resume state cannot be read safely.',
      'Preserve the review and restore its package-owned Claude launch state.'
    );
    error.cause = cause;
    throw error;
  }
  const contract = buildClaudeReviewerLaunch({
    repositoryRoot: physicalRoot,
    invitation,
    routing,
    model: state?.model,
    effort: state?.effort,
  });
  readLaunchState(contract, defaultFingerprintSession, { allowPriorResponse: true });
  return contract;
}

export async function runClaudeReviewerLaunch({
  contract,
  resume = false,
  execFile,
  inspectAuthority = defaultInspectAuthority,
  fingerprintSession = defaultFingerprintSession,
} = {}) {
  if (
    contract?.schema !== 'ai-peer-review.claude-launch/v1' ||
    typeof execFile !== 'function' ||
    typeof inspectAuthority !== 'function'
  ) {
    throw new AprError('APR_CLAUDE_RESULT_INVALID', 'Claude launch runner input is incomplete.', {
      recovery: 'Use a validated package-generated Claude launch contract.',
    });
  }
  const before = inspectAuthority(contract.workspace);
  const prior = authorityProjection(before, 'pre-launch');
  if (prior.protocol.review_id !== contract.review_id) {
    throw resultError('Claude pre-launch authority does not match the launch contract.');
  }
  const priorState = resume
    ? readLaunchState(contract, fingerprintSession, { allowPriorResponse: true })
    : null;
  if (priorState && Number.isSafeInteger(prior.protocol.turns_used)) {
    const turn = prior.protocol.turns_used + 1;
    const current = path.basename(contract.response).match(/^(.*reviewer-response-)(\d+)\.md$/u);
    const previous = path.basename(priorState.response).match(/^(.*reviewer-response-)(\d+)\.md$/u);
    const expected = current
      ? path.join(path.dirname(contract.response), `${current[1]}${turn}.md`)
      : null;
    if (
      prior.protocol.state !== 'reviewer-turn' ||
      !Number.isSafeInteger(turn) ||
      turn < 1 ||
      !current ||
      contract.response !== expected ||
      !previous ||
      previous[1] !== current[1] ||
      Number(previous[2]) < 1 ||
      Number(previous[2]) > turn ||
      priorState.response !==
        path.join(path.dirname(contract.response), `${previous[1]}${previous[2]}.md`)
    ) {
      throw sessionError(
        'Claude resume response does not match current reviewer authority.',
        'Use the event-authorized pending reviewer response from peer-review status.'
      );
    }
  }
  if (priorState && priorState.protocol_revision > prior.protocol.revision) {
    throw sessionError(
      'Claude resume state is newer than current review authority.',
      'Preserve the review and reconcile its event authority before resuming Claude.'
    );
  }
  if (
    priorState &&
    prior.reviewer &&
    prior.reviewer.session_fingerprint !== priorState.session_fingerprint
  ) {
    throw new AprError('APR_IDENTITY_CONFLICT', 'Claude resume state conflicts with reviewer.', {
      recovery: 'Restore the exact registered Claude reviewer session.',
    });
  }
  const args = resume
    ? Object.freeze(['--resume', priorState.session_handle, ...contract.command.args])
    : contract.command.args;
  const hasEnvironment = Object.hasOwn(contract, 'environment');
  if (
    hasEnvironment &&
    (contract.environment === null ||
      typeof contract.environment !== 'object' ||
      Array.isArray(contract.environment))
  ) {
    throw new AprError('APR_CLAUDE_RESULT_INVALID', 'Claude child environment is invalid.', {
      recovery: 'Rebuild the launch contract from current deterministic preflight.',
    });
  }
  const environment = hasEnvironment ? contract.environment : buildClaudeLaunchEnvironment();
  let execution;
  let executionError = null;
  try {
    const executionOptions = {
      cwd: contract.repository_root,
      shell: false,
      encoding: 'utf8',
      env: environment,
      maxBuffer: 1024 * 1024,
    };
    execution = await execFile(contract.command.file, args, executionOptions);
  } catch (cause) {
    executionError = cause;
  }
  const after = inspectAuthority(contract.workspace);
  const providerResult = normalizeClaudeExecution({ execution, error: executionError });
  const returnedHandle = providerResult.session_id_present ? providerResult.session_id : null;
  if (
    providerResult.session_id_present &&
    (typeof returnedHandle !== 'string' || !/^[A-Za-z0-9._:-]+$/.test(returnedHandle))
  ) {
    throw sessionError(
      'Claude launch returned an invalid provider session.',
      'Preserve the review and inspect the exact Claude session metadata.'
    );
  }
  if (priorState && returnedHandle !== null && returnedHandle !== priorState.session_handle) {
    throw sessionError(
      'Claude resume returned a different provider session.',
      'Restore the exact recorded Claude session; do not replace reviewer identity.'
    );
  }
  const sessionHandle = returnedHandle ?? priorState?.session_handle ?? null;
  const expectedSessionFingerprint = sessionHandle
    ? fingerprintSession('anthropic', sessionHandle)
    : null;
  const outcomeInput = {
    before,
    after,
    providerResult,
    contract,
    expectedSessionFingerprint,
  };
  const first = classifyClaudeReviewerOutcome(outcomeInput);
  let resumeAvailable = Boolean(priorState);
  if (providerResult.output_valid && sessionHandle) {
    atomicWrite(
      launchStatePath(contract),
      `${JSON.stringify(
        {
          schema: 'ai-peer-review.claude-launch-state/v1',
          review_id: contract.review_id,
          invitation: contract.invitation,
          response: contract.response,
          model: contract.model,
          effort: contract.effort,
          session_handle: sessionHandle,
          session_fingerprint: expectedSessionFingerprint,
          protocol_revision: after.state.protocol.revision,
        },
        null,
        2
      )}\n`
    );
    resumeAvailable = true;
  }
  return resumeAvailable
    ? classifyClaudeReviewerOutcome({ ...outcomeInput, resumeAvailable: true })
    : first;
}
