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

const READ_ONLY = new Set(['doctor', 'status', 'resume', 'help', 'explain']);
const HUMAN_GATED = new Set(['supplement', 'continue']);
const NEXT_COMMAND = Object.freeze({
  'join-reviewer': () => COMMAND_USAGE.join,
  'reviewer-submit': (workspace) => `peer-review submit ${workspace}`,
  'author-submit': (workspace) => `peer-review submit ${workspace}`,
  'finalize-acceptance': (workspace) => `peer-review finalize ${workspace}`,
  'commit-acceptance': (workspace) => `peer-review finalize ${workspace}`,
  'human-intervention': (workspace) => `peer-review status ${workspace} --next`,
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
  const mutating = !READ_ONLY.has(command);
  return Object.freeze({
    schema: 'ai-peer-review.help/v1',
    command,
    purpose: PURPOSE[command],
    roles:
      command === 'join'
        ? ['reviewer']
        : command === 'start'
          ? ['author']
          : ['author', 'reviewer', 'human'],
    states: READ_ONLY.has(command) ? ['any'] : ['command-specific event-authorized state'],
    usage: COMMAND_USAGE[command],
    arguments: { minimum: grammar.min, maximum: grammar.max },
    flags: COMMAND_FLAGS[command].map((flag) => ({
      flag,
      description: `Closed ${flag.slice(2).replaceAll('-', ' ')} option.`,
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
    preconditions: [
      READ_ONLY.has(command)
        ? 'A readable local package and any named workspace.'
        : 'Exact current event authority and all command-specific preflight checks.',
    ],
    effects: [
      mutating
        ? 'May append the documented event and its derived files.'
        : 'No files, Git, configuration, or transport are changed.',
    ],
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
    errors: Object.keys(ERROR_CATALOG),
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

export function nextActionCommand(workspace, action) {
  return NEXT_COMMAND[action]?.(workspace) ?? null;
}

export function explainError(code, format = 'json') {
  const entry = ERROR_CATALOG[code];
  if (!entry) usage(`Unknown APR error code: ${code}`);
  const result = Object.freeze({
    schema: 'ai-peer-review.error-help/v1',
    code,
    message: entry.message,
    recovery: entry.recovery,
  });
  return format === 'json' ? result : `${code}\n\n${entry.message}\nRecovery: ${entry.recovery}\n`;
}
