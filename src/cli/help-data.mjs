import { AprError } from '../errors.mjs';
import { COMMAND_FLAGS, COMMAND_USAGE, COMMANDS, POSITIONAL_GRAMMAR } from './parse.mjs';

const PURPOSE = Object.freeze({
  setup: 'Install or remove reversible peer-review agent integration.',
  doctor: 'Inspect local peer-review readiness without mutation.',
  start: 'Start a new event-authoritative review after complete preflight.',
  'request-grant': 'Create a canonical Human Authority challenge.',
  join: 'Join from an invitation as a distinct reviewer session.',
  status: 'Read event-derived review state and one exact next action.',
  resume: 'Reconstruct the current actor instructions without polling or waking.',
  submit: 'Seal and submit the current participant response.',
  supplement: 'Register human-authorized supplemental context.',
  continue: 'Extend an exhausted review budget under a signed grant.',
  finalize: 'Commit ordinary consensus or human-authorized good-enough acceptance.',
  recover: 'Inspect and perform an explicitly authorized recovery.',
  abandon: 'Terminate an intervention review while retaining evidence paths.',
  help: 'Query the complete offline command contract.',
  explain: 'Explain one stable APR error and its recovery.',
});

const HUMAN_GATED = new Set(['supplement', 'continue']);
const ROLES = Object.freeze({
  setup: ['human'],
  doctor: ['author', 'reviewer', 'human'],
  start: ['author'],
  'request-grant': ['author', 'reviewer'],
  join: ['reviewer'],
  status: ['author', 'reviewer', 'human'],
  resume: ['author', 'reviewer', 'human'],
  submit: ['author', 'reviewer'],
  supplement: ['author', 'reviewer'],
  continue: ['author', 'reviewer'],
  finalize: ['author'],
  recover: ['author', 'reviewer'],
  abandon: ['author', 'reviewer'],
  help: ['author', 'reviewer', 'human'],
  explain: ['author', 'reviewer', 'human'],
});
const STATES = Object.freeze({
  setup: ['outside-review'],
  doctor: ['any'],
  start: ['outside-review'],
  'request-grant': ['outside-review', 'intervention-required'],
  join: ['awaiting-reviewer'],
  status: ['any'],
  resume: ['any'],
  submit: ['reviewer-turn', 'author-revision'],
  supplement: ['reviewer-turn', 'author-revision'],
  continue: ['intervention-required'],
  finalize: ['acceptance-pending', 'author-finalization'],
  recover: ['reviewer-turn', 'author-revision', 'intervention-required'],
  abandon: ['intervention-required'],
  help: ['any'],
  explain: ['any'],
});
const PRECONDITIONS = Object.freeze({
  setup: ['Explicit scope and a readable host configuration surface.'],
  doctor: ['A readable local package; named repository checks require a Git worktree.'],
  start: [
    'A clean tracked artifact, contained available outputs, ignored scratch, and author identity.',
    'Optional --bootstrap-grant must authorize the exact protected pin-verifier action.',
  ],
  'request-grant': ['Exact event authority and complete parameters for one protected action.'],
  join: ['The exact sealed invitation, original physical worktree, and a distinct reviewer.'],
  status: ['A readable event-authoritative review workspace.'],
  resume: ['A readable event-authoritative review workspace.'],
  submit: ['The registered current actor, active claim, and exact pending response.'],
  supplement: ['Intervention authority plus an exact signed supplement grant.'],
  continue: ['Turn-budget intervention plus an exact signed continuation grant.'],
  finalize: ['Reviewer acceptance or an exact accept-over-objections grant.'],
  recover: ['A stale or missing participant condition authorized by event state.'],
  abandon: ['An active intervention and a non-empty retained-evidence reason.'],
  help: ['A readable installed package.'],
  explain: ['A known stable APR error code.'],
});
const EFFECTS = Object.freeze({
  setup: ['Previews or applies reversible owned configuration changes; never pushes.'],
  doctor: ['Read-only inspection; changes no files, Git, configuration, or transport.'],
  start: [
    'Creates event authority, projections, reservation, startup, and invitation; never pushes.',
  ],
  'request-grant': ['Appends or reuses one challenge event; performs no Git operation.'],
  join: ['Appends reviewer identity and claim events and creates one reviewer draft.'],
  status: ['Read-only event reduction; performs no repair, polling, wake, or Git operation.'],
  resume: ['Read-only instruction reconstruction; performs no polling, wake, or Git operation.'],
  submit: ['Seals one response and appends its lifecycle and delivery events.'],
  supplement: ['Registers digest-bound scratch context and its signed authority event.'],
  continue: ['Consumes one signed grant and resumes exactly one interrupted role.'],
  finalize: ['Produces terminal manifest evidence and author-only Git work in normal mode.'],
  recover: ['Performs only the selected event-authorized reclaim or replacement.'],
  abandon: ['Appends terminal abandonment while preserving listed evidence paths.'],
  help: ['Read-only offline rendering.'],
  explain: ['Read-only offline error rendering.'],
});
const ERRORS = Object.freeze({
  setup: ['APR_USAGE', 'APR_OUTPUT_COLLISION'],
  doctor: ['APR_REPOSITORY_NOT_FOUND'],
  start: [
    'APR_REPOSITORY_NOT_FOUND',
    'APR_ARTIFACT_UNTRACKED',
    'APR_ARTIFACT_DIRTY',
    'APR_PATH_TEMPLATE_INVALID',
    'APR_SCRATCH_NOT_IGNORED',
    'APR_IDENTITY_REQUIRED',
    'APR_TRANSPORT_UNAVAILABLE',
    'APR_AUTHORITY_REQUIRED',
    'APR_AUTHORITY_POLICY',
    'APR_OUTPUT_COLLISION',
    'APR_GRANT_INVALID',
    'APR_STALE_REVIEW',
    'APR_TEMPLATE_INVALID',
  ],
  'request-grant': [
    'APR_AUTHORITY_UNAVAILABLE',
    'APR_CHALLENGE_ACTIVE',
    'APR_GRANT_PARAMETERS_INVALID',
  ],
  join: [
    'APR_INVITATION_INVALID',
    'APR_IDENTITY_REQUIRED',
    'APR_IDENTITY_CONFLICT',
    'APR_TRANSPORT_UNAVAILABLE',
    'APR_STALE_REVIEW',
    'APR_TEMPLATE_INVALID',
    'APR_OUTPUT_COLLISION',
  ],
  status: ['APR_EVENT_LOG_MISSING', 'APR_EVENT_LOG_CORRUPT', 'APR_INVITATION_INVALID'],
  resume: ['APR_EVENT_LOG_MISSING', 'APR_EVENT_LOG_CORRUPT', 'APR_INVITATION_INVALID'],
  submit: [
    'APR_PROTECTED_METADATA_CHANGED',
    'APR_RESPONSE_INVALID',
    'APR_RESPONSE_WRITE_FAILED',
    'APR_IDENTITY_CONFLICT',
    'APR_CLAIM_INVALID',
    'APR_CLAIM_CONFLICT',
    'APR_INVALID_TRANSITION',
    'APR_STALE_REVIEW',
    'APR_EVENT_LOG_MISSING',
    'APR_EVENT_LOG_CORRUPT',
    'APR_OUTPUT_COLLISION',
    'APR_REPOSITORY_NOT_FOUND',
    'APR_ARTIFACT_UNTRACKED',
    'APR_ARTIFACT_UNCOMMITTED',
    'APR_ARTIFACT_NOT_REGULAR',
    'APR_ARTIFACT_UNREADABLE',
    'APR_ARTIFACT_CHANGED',
    'APR_ARTIFACT_UNCHANGED',
    'APR_DELIVERY_CONFLICT',
    'APR_PATH_OUTSIDE_REPOSITORY',
    'APR_GIT_FAILED',
    'APR_GIT_PATH_INVALID',
    'APR_GIT_PATH_OUTSIDE_REPOSITORY',
    'APR_REVIEWER_GIT_VIOLATION',
    'APR_GIT_WORKTREE_CHANGED',
    'APR_GIT_HEAD_CHANGED',
    'APR_GIT_OWNED_PATH_OVERLAP',
    'APR_GIT_SEAL_MISMATCH',
    'APR_GIT_INDEX_CHANGED',
    'APR_GIT_INDEX_INVALID',
    'APR_GIT_TRANSACTION_INVALID',
    'APR_GIT_TRANSACTION_FAILED',
    'APR_GIT_RECOVERY_INVALID',
    'APR_GIT_COMMIT_INVALID',
  ],
  supplement: ['APR_GRANT_INVALID', 'APR_GRANT_MISMATCH'],
  continue: ['APR_GRANT_INVALID', 'APR_GRANT_MISMATCH', 'APR_GRANT_REPLAYED'],
  finalize: ['APR_INVALID_TRANSITION', 'APR_GRANT_INVALID'],
  recover: ['APR_CLAIM_NOT_STALE', 'APR_GRANT_INVALID', 'APR_IDENTITY_CONFLICT'],
  abandon: ['APR_INVALID_TRANSITION', 'APR_USAGE'],
  help: ['APR_USAGE'],
  explain: ['APR_USAGE'],
});

export function quoteShellArgument(value) {
  if (typeof value !== 'string' || !value || /[\0\r\n]/.test(value)) {
    throw new AprError(
      'APR_PATH_TEMPLATE_INVALID',
      'A command argument cannot be rendered safely.',
      {
        recovery: 'Use repository and review paths without control characters.',
      }
    );
  }
  if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

export function renderCommand(argv) {
  if (!Array.isArray(argv) || argv.length === 0) {
    throw new AprError('APR_USAGE', 'A command requires a non-empty argument vector.', {
      recovery: 'Use the structured command catalog.',
    });
  }
  return argv.map(quoteShellArgument).join(' ');
}

export function markdownCodeSpan(value) {
  if (typeof value !== 'string' || !value || /[\0\r\n]/.test(value)) {
    throw new AprError('APR_PATH_TEMPLATE_INVALID', 'A Markdown value cannot be rendered safely.', {
      recovery: 'Use repository and review paths without control characters.',
    });
  }
  const longest = Math.max(0, ...(value.match(/`+/g) ?? []).map((run) => run.length));
  const delimiter = '`'.repeat(longest + 1);
  const padding = value.startsWith('`') || value.endsWith('`') ? ' ' : '';
  return `${delimiter}${padding}${value}${padding}${delimiter}`;
}

const NEXT_COMMAND = Object.freeze({
  'join-reviewer': ({ invitation }) => ['peer-review', 'join', invitation],
  'reviewer-submit': ({ workspace }) => ['peer-review', 'submit', workspace],
  'author-submit': ({ workspace }) => ['peer-review', 'submit', workspace],
  'finalize-acceptance': ({ workspace }) => ['peer-review', 'finalize', workspace],
  'commit-acceptance': ({ workspace }) => ['peer-review', 'finalize', workspace],
  'human-intervention': ({ workspace }, state) => {
    if (state.protocol.intervention?.reason === 'stale-claim') {
      return ['peer-review', 'recover', workspace, '--reclaim'];
    }
    if (state.protocol.intervention?.reason === 'turn-budget-exhausted') {
      const resumeRole =
        state.protocol.intervention.interrupted_state === 'author-revision' ? 'author' : 'reviewer';
      return [
        'peer-review',
        'request-grant',
        workspace,
        '--action',
        'continue',
        '--additional-turns',
        '1',
        '--resulting-effective-maximum',
        String(state.protocol.max_turns + 1),
        '--resume-role',
        resumeRole,
      ];
    }
    return ['peer-review', 'recover', workspace];
  },
});
const ERROR_CATALOG = Object.freeze({
  APR_ARTIFACT_DIRTY: {
    message: 'The tracked artifact differs from HEAD.',
    recovery: 'Commit or restore the artifact, then rerun peer-review start.',
  },
  APR_ARTIFACT_UNTRACKED: {
    message: 'The artifact is not a tracked stage-zero file.',
    recovery: 'Track and commit the artifact before starting review.',
  },
  APR_IDENTITY_CONFLICT: {
    message: 'Participant identity conflicts with event authority.',
    recovery: 'Use a distinct registered session or signed participant replacement.',
  },
  APR_CLAIM_INVALID: {
    message: 'The current participant claim is missing, stale, or inconsistent.',
    recovery: 'Read peer-review status and follow its exact claim recovery command.',
  },
  APR_CLAIM_CONFLICT: {
    message: 'The role claim conflicts with current participant or turn authority.',
    recovery: 'Read peer-review status and resume from its exact registered claimant.',
  },
  APR_RESPONSE_WRITE_FAILED: {
    message: 'The sealed response could not be written atomically.',
    recovery: 'Preserve the draft, repair its parent directory, and retry exactly.',
  },
  APR_ARTIFACT_UNCOMMITTED: {
    message: 'The artifact path is not present in event-authorized HEAD.',
    recovery: 'Restore the tracked artifact at the authorized revision before retrying.',
  },
  APR_ARTIFACT_NOT_REGULAR: {
    message: 'The artifact is not a tracked regular file with a supported Git mode.',
    recovery: 'Restore a regular 100644 or 100755 artifact and retry.',
  },
  APR_ARTIFACT_UNREADABLE: {
    message: 'The artifact working-tree bytes cannot be read.',
    recovery: 'Restore a readable regular artifact at the event-authorized path.',
  },
  APR_ARTIFACT_CHANGED: {
    message: 'The artifact changed despite an explicit no-artifact-change submission.',
    recovery: 'Remove the flag or restore the event-authorized artifact bytes.',
  },
  APR_ARTIFACT_UNCHANGED: {
    message: 'The author submission has no artifact change or explicit rationale.',
    recovery: 'Change the artifact or submit --no-artifact-change with a non-empty reason.',
  },
  APR_DELIVERY_CONFLICT: {
    message: 'A delivery identifier is already bound to different handoff evidence.',
    recovery: 'Preserve the event log and inspect the conflicting delivery before recovery.',
  },
  APR_PATH_OUTSIDE_REPOSITORY: {
    message: 'A transaction or collateral path escapes the physical repository.',
    recovery: 'Use only the exact contained event-authorized repository path.',
  },
  APR_GIT_FAILED: {
    message: 'A read-only Git repository observation failed.',
    recovery: 'Repair the repository and retry from the event-authorized worktree.',
  },
  APR_GIT_PATH_INVALID: {
    message: 'A Git metadata path is empty, malformed, or non-canonical.',
    recovery: 'Use a contained repository-relative Git metadata path.',
  },
  APR_GIT_PATH_OUTSIDE_REPOSITORY: {
    message: 'A Git metadata path escapes the repository common directory.',
    recovery: 'Use only a contained repository-relative Git metadata path.',
  },
  APR_REVIEWER_GIT_VIOLATION: {
    message: 'Reviewer-time repository state differs from the sealed read-only boundary.',
    recovery: 'Restore the event-authorized repository state without discarding unrelated work.',
  },
  APR_GIT_WORKTREE_CHANGED: {
    message: 'Submission is running from a different physical Git worktree.',
    recovery: 'Return to the event-authorized worktree and retry.',
  },
  APR_GIT_HEAD_CHANGED: {
    message: 'Git HEAD differs from the exact transaction authority.',
    recovery: 'Inspect HEAD and use only exact transaction recovery.',
  },
  APR_GIT_OWNED_PATH_OVERLAP: {
    message: 'A protocol-owned path already has staged changes.',
    recovery: 'Restore that index entry without discarding working bytes, then retry.',
  },
  APR_GIT_SEAL_MISMATCH: {
    message: 'Git bytes or modes differ from the sealed transaction.',
    recovery: 'Restore the exact sealed path bytes and modes, then retry.',
  },
  APR_GIT_INDEX_CHANGED: {
    message: 'Unrelated staged object IDs changed during the transaction.',
    recovery: 'Preserve the repository and restore the unrelated index entries.',
  },
  APR_GIT_INDEX_INVALID: {
    message: 'Git returned an index entry outside the supported stage-zero contract.',
    recovery: 'Repair the Git index and retry the peer-review command.',
  },
  APR_GIT_TRANSACTION_INVALID: {
    message: 'The exact-path Git transaction request is incomplete or inconsistent.',
    recovery: 'Retry with the exact event-authorized paths, modes, message, and trailers.',
  },
  APR_GIT_TRANSACTION_FAILED: {
    message: 'A literal-argument Git transaction command failed.',
    recovery: 'Preserve repository state, inspect the command failure, and retry exactly.',
  },
  APR_GIT_RECOVERY_INVALID: {
    message: 'Durable Git transaction recovery evidence is missing or inconsistent.',
    recovery: 'Preserve the journal and repository and inspect them before retrying.',
  },
  APR_GIT_COMMIT_INVALID: {
    message: 'The recovered commit differs from sealed paths, modes, ancestry, or trailers.',
    recovery: 'Preserve the commit and inspect its exact tree and message before recovery.',
  },
  APR_OUTPUT_COLLISION: {
    message: 'A peer-review output path is occupied by conflicting content.',
    recovery: 'Preserve the bytes, inspect the collision, and use explicit recovery.',
  },
  APR_EVENT_LOG_CORRUPT: {
    message: 'The authoritative event log cannot be reduced safely.',
    recovery: 'Restore the last complete newline-terminated event history.',
  },
  APR_USAGE: {
    message: 'Command syntax is outside the closed grammar.',
    recovery: 'Run peer-review help --all.',
  },
  APR_REPOSITORY_NOT_FOUND: {
    message: 'The command is not running inside a physical Git worktree.',
    recovery: 'Run the command from the intended Git worktree.',
  },
  APR_PATH_TEMPLATE_INVALID: {
    message: 'A configured path or template cannot be rendered safely.',
    recovery: 'Use the documented contained path placeholders and safe path values.',
  },
  APR_SCRATCH_NOT_IGNORED: {
    message: 'The review scratch workspace is not ignored by Git.',
    recovery: 'Add .scratch/peer-review/ to the repository-local Git exclude and retry.',
  },
  APR_IDENTITY_REQUIRED: {
    message: 'The command could not establish its required participant identity.',
    recovery: 'Use an official runtime identity or provide the documented declared identity.',
  },
  APR_TRANSPORT_UNAVAILABLE: {
    message: 'The requested transport is not supported by the current participant.',
    recovery: 'Use manual transport or a validated resume-only adapter in Phase 1.',
  },
  APR_AUTHORITY_REQUIRED: {
    message: 'Configured startup authority is missing, unreadable, or incomplete.',
    recovery: 'Repair .ai-peer-review.json or omit bootstrap authority for consensus-only startup.',
  },
  APR_AUTHORITY_POLICY: {
    message: 'The signer or verifier does not satisfy the required authority policy.',
    recovery: 'Use prevention-grade authority, or keep test authority in no-commit mode.',
  },
  APR_GRANT_INVALID: {
    message: 'The Human Authority grant is missing or malformed.',
    recovery: 'Use the exact complete grant for the current challenge.',
  },
  APR_AUTHORITY_UNAVAILABLE: {
    message: 'The review has no verifier capable of the protected action.',
    recovery: 'Continue ordinary consensus or use the verifier pinned at startup.',
  },
  APR_CHALLENGE_ACTIVE: {
    message: 'A different live Human Authority challenge already occupies this action.',
    recovery: 'Use or explicitly supersede the existing challenge through the documented flow.',
  },
  APR_GRANT_PARAMETERS_INVALID: {
    message: 'Protected-action parameters do not match their closed canonical contract.',
    recovery: 'Regenerate the challenge from exact current event authority.',
  },
  APR_INVITATION_INVALID: {
    message: 'The reviewer invitation does not match sealed startup authority.',
    recovery: 'Use the exact generated invitation in its original physical worktree.',
  },
  APR_EVENT_LOG_MISSING: {
    message: 'The authoritative review event log is unavailable.',
    recovery: 'Restore the exact events.jsonl review workspace and retry.',
  },
  APR_PROTECTED_METADATA_CHANGED: {
    message: 'Participant-authored content changed protected response metadata.',
    recovery: 'Restore metadata from current event authority and edit only permitted content.',
  },
  APR_RESPONSE_INVALID: {
    message: 'The pending response does not satisfy its closed role and turn contract.',
    recovery: 'Repair the exact pending response using peer-review resume guidance.',
  },
  APR_GRANT_MISMATCH: {
    message: 'The grant does not bind the current challenge, action, or parameters.',
    recovery: 'Request and sign a fresh challenge for the exact current action.',
  },
  APR_GRANT_REPLAYED: {
    message: 'The Human Authority grant has already been consumed.',
    recovery: 'Request a fresh challenge if another protected action remains necessary.',
  },
  APR_INVALID_TRANSITION: {
    message: 'The requested lifecycle event is not allowed from the current state.',
    recovery: 'Read peer-review status and perform only its exact next action.',
  },
  APR_CLAIM_NOT_STALE: {
    message: 'The selected claim has not reached its recorded expiry.',
    recovery: 'Resume with the current claimant or wait until the recorded expiry.',
  },
  APR_STALE_REVIEW: {
    message: 'The requested mutation no longer matches current event authority.',
    recovery: 'Read current status and retry from its exact review, revision, sequence, and actor.',
  },
  APR_TEMPLATE_INVALID: {
    message: 'A package template or its closed variable set is invalid.',
    recovery:
      'Restore the installed package template and regenerate collateral from event authority.',
  },
});

function topic(command) {
  const grammar = POSITIONAL_GRAMMAR[command];
  return Object.freeze({
    schema: 'ai-peer-review.help/v1',
    command,
    purpose: PURPOSE[command],
    roles: ROLES[command],
    states: STATES[command],
    usage: COMMAND_USAGE[command],
    arguments: { minimum: grammar.min, maximum: grammar.max },
    flags: COMMAND_FLAGS[command].map((flag) => ({
      flag,
      description: `${flag} is owned only by ${command} and is parsed by its closed grammar.`,
    })),
    defaults:
      command === 'start'
        ? [
            'reviews root from configuration',
            'ten turns',
            'eight-hour claim TTL',
            'normal commit mode',
          ]
        : ['stored review authority'],
    environment: [
      'Official provider session metadata when available; declared identity is explicit.',
    ],
    preconditions: PRECONDITIONS[command],
    effects: EFFECTS[command],
    commit:
      command === 'submit' || command === 'finalize'
        ? 'Author-only when normal mode requires it.'
        : 'never',
    push: 'never',
    block: HUMAN_GATED.has(command)
      ? 'Blocks without a valid exact grant.'
      : 'Fails closed on unmet preconditions.',
    wake: 'never in Phase 1',
    tokens: 'No background polling or model-token spending.',
    no_commit:
      command === 'start' || command === 'submit' || command === 'finalize'
        ? 'Uses explicit non-durable snapshot evidence and never implies a Git commit.'
        : 'Mode is read from protocol authority and cannot be changed here.',
    examples: [
      COMMAND_USAGE[command],
      `npx --yes ai-peer-review@0.1.0 ${COMMAND_USAGE[command].replace(/^peer-review /, '')}`,
    ],
    result: 'A versioned JSON result envelope or deterministic offline text.',
    next_action:
      command === 'status' || command === 'resume'
        ? 'Exactly one event-derived action and command.'
        : 'Read peer-review status for the next event-derived action.',
    errors: ERRORS[command],
    json_schema: 'ai-peer-review.cli-result/v1',
  });
}

function render(value) {
  return [
    value.usage,
    '',
    `Purpose: ${value.purpose}`,
    `Roles: ${value.roles.join(', ')}`,
    `States: ${value.states.join(', ')}`,
    `Arguments: ${value.arguments.minimum}-${value.arguments.maximum}`,
    `Flags: ${value.flags.map(({ flag }) => flag).join(', ') || 'none'}`,
    `Defaults: ${value.defaults.join('; ')}`,
    `Environment: ${value.environment.join('; ')}`,
    `Preconditions: ${value.preconditions.join('; ')}`,
    `Effects: ${value.effects.join('; ')}`,
    `Commit: ${value.commit}`,
    `Push: ${value.push}`,
    `Block: ${value.block}`,
    `Wake: ${value.wake}`,
    `Tokens: ${value.tokens}`,
    `No-commit: ${value.no_commit}`,
    `Result: ${value.result}`,
    `Next action: ${value.next_action}`,
    `JSON schema: ${value.json_schema}`,
    'Examples:',
    ...value.examples.map((example) => `  ${example}`),
    `Errors: ${value.errors.join(', ')}`,
    '',
  ].join('\n');
}

function usage(message) {
  throw new AprError('APR_USAGE', message, {
    recovery: 'Run peer-review help --all for the closed command grammar.',
    exitCode: 2,
  });
}

export function helpRequest(name = null, format = 'text', options = {}) {
  if (options.search) {
    const term = String(name ?? '').toLowerCase();
    const matches = COMMANDS.filter((command) =>
      `${command} ${PURPOSE[command]} ${COMMAND_USAGE[command]}`.toLowerCase().includes(term)
    );
    const result = Object.freeze({ schema: 'ai-peer-review.help-search/v1', term, matches });
    return format === 'json' ? result : `${matches.join('\n')}\n`;
  }
  if (options.all) {
    const values = COMMANDS.map(topic);
    return format === 'json'
      ? Object.freeze({ schema: 'ai-peer-review.help-all/v1', topics: values })
      : values.map(render).join('\n');
  }
  if (name === null || name === undefined || name === '') {
    const result = Object.freeze({
      schema: 'ai-peer-review.help-index/v1',
      commands: COMMANDS,
      usage: 'peer-review help [<command>] [--all] [--json]',
    });
    return format === 'json'
      ? result
      : `${result.usage}\n\nCommands:\n${COMMANDS.map((command) => `  ${command}`).join('\n')}\n`;
  }
  if (!COMMANDS.includes(name)) usage(`Unknown help topic: ${name}`);
  const result = topic(name);
  return format === 'json' ? result : render(result);
}

export function nextActionCommand(paths, action, state) {
  const argv = NEXT_COMMAND[action]?.(paths, state) ?? null;
  return argv ? renderCommand(argv) : null;
}

export function explainError(code, format = 'json') {
  const entry = Object.hasOwn(ERROR_CATALOG, code) ? ERROR_CATALOG[code] : null;
  if (!entry) usage(`Unknown APR error code: ${code}`);
  const result = Object.freeze({
    schema: 'ai-peer-review.error-help/v1',
    code,
    message: entry.message,
    recovery: entry.recovery,
  });
  return format === 'json' ? result : `${code}\n\n${entry.message}\nRecovery: ${entry.recovery}\n`;
}
