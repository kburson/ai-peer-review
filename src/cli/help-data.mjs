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
    'APR_OUTPUT_COLLISION',
    'APR_GRANT_INVALID',
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
    'APR_OUTPUT_COLLISION',
  ],
  status: ['APR_EVENT_LOG_MISSING', 'APR_EVENT_LOG_CORRUPT', 'APR_INVITATION_INVALID'],
  resume: ['APR_EVENT_LOG_MISSING', 'APR_EVENT_LOG_CORRUPT', 'APR_INVITATION_INVALID'],
  submit: ['APR_PROTECTED_METADATA_CHANGED', 'APR_RESPONSE_INVALID', 'APR_IDENTITY_CONFLICT'],
  supplement: ['APR_GRANT_INVALID', 'APR_GRANT_MISMATCH'],
  continue: ['APR_GRANT_INVALID', 'APR_GRANT_MISMATCH', 'APR_GRANT_REPLAYED'],
  finalize: ['APR_INVALID_TRANSITION', 'APR_GRANT_INVALID'],
  recover: ['APR_CLAIM_NOT_STALE', 'APR_GRANT_INVALID', 'APR_IDENTITY_CONFLICT'],
  abandon: ['APR_INVALID_TRANSITION', 'APR_USAGE'],
  help: ['APR_USAGE'],
  explain: ['APR_USAGE'],
});
const NEXT_COMMAND = Object.freeze({
  'join-reviewer': ({ invitation }) => `peer-review join ${invitation}`,
  'reviewer-submit': ({ workspace }) => `peer-review submit ${workspace}`,
  'author-submit': ({ workspace }) => `peer-review submit ${workspace}`,
  'finalize-acceptance': ({ workspace }) => `peer-review finalize ${workspace}`,
  'commit-acceptance': ({ workspace }) => `peer-review finalize ${workspace}`,
  'human-intervention': ({ workspace }, state) => {
    if (state.protocol.intervention?.reason === 'stale-claim') {
      return `peer-review recover ${workspace} --reclaim`;
    }
    if (state.protocol.intervention?.reason === 'turn-budget-exhausted') {
      const resumeRole =
        state.protocol.intervention.interrupted_state === 'author-revision' ? 'author' : 'reviewer';
      return `peer-review request-grant ${workspace} --action continue --additional-turns 1 --resulting-effective-maximum ${state.protocol.max_turns + 1} --resume-role ${resumeRole}`;
    }
    return `peer-review recover ${workspace}`;
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
  return NEXT_COMMAND[action]?.(paths, state) ?? null;
}

export function explainError(code, format = 'json') {
  const documented = new Set(Object.values(ERRORS).flat());
  const entry =
    ERROR_CATALOG[code] ??
    (documented.has(code)
      ? {
          message: 'The command failed a documented fail-closed check.',
          recovery: 'Run peer-review help --all and follow the recovery for the owning command.',
        }
      : null);
  if (!entry) usage(`Unknown APR error code: ${code}`);
  const result = Object.freeze({
    schema: 'ai-peer-review.error-help/v1',
    code,
    message: entry.message,
    recovery: entry.recovery,
  });
  return format === 'json' ? result : `${code}\n\n${entry.message}\nRecovery: ${entry.recovery}\n`;
}
