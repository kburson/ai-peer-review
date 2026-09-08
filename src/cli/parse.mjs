import { AprError } from '../errors.mjs';

function frozenList(values) {
  return Object.freeze([...values]);
}

export const COMMAND_FLAGS = Object.freeze({
  setup: frozenList(['--agent', '--scope', '--dry-run', '--remove', '--confirm-scratch-exclude']),
  doctor: frozenList(['--mode', '--json']),
  start: frozenList([
    '--artifact-kind',
    '--reviews-root',
    '--review-path-template',
    '--issue',
    '--max-turns',
    '--claim-ttl',
    '--transport-mode',
    '--bootstrap-grant',
    '--no-commit',
    '--test-human-authority',
  ]),
  'request-grant': frozenList([
    '--action',
    '--verifier-fingerprint',
    '--assurance-grade',
    '--authority-policy',
    '--artifact-path',
    '--artifact-kind',
    '--reviews-root',
    '--review-path-template',
    '--issue',
    '--max-turns',
    '--commit-mode',
    '--additional-turns',
    '--resulting-effective-maximum',
    '--resume-role',
    '--focus-path',
    '--focus-digest',
    '--content-digest',
    '--target-role',
    '--target-turn',
    '--artifact-blob',
    '--artifact-digest',
    '--final-round',
    '--reviewer-response-path',
    '--reviewer-response-digest',
    '--unresolved-finding-id',
    '--human-rationale-digest',
    '--role',
    '--outgoing-claim-id',
    '--outgoing-session-fingerprint',
    '--incoming-session-fingerprint',
  ]),
  join: frozenList([]),
  status: frozenList(['--json', '--next']),
  resume: frozenList([]),
  submit: frozenList(['--decision', '--no-artifact-change', '--reason']),
  supplement: frozenList(['--for', '--grant']),
  continue: frozenList(['--additional-turns', '--focus', '--grant']),
  finalize: frozenList(['--good-enough', '--grant']),
  recover: frozenList(['--reclaim', '--replace-participant', '--grant']),
  abandon: frozenList(['--reason']),
  help: frozenList(['--all', '--json']),
  explain: frozenList(['--json']),
});

export const COMMANDS = frozenList(Object.keys(COMMAND_FLAGS));

function grammar(min, max = min) {
  return Object.freeze({ min, max });
}

export const POSITIONAL_GRAMMAR = Object.freeze({
  setup: grammar(0),
  doctor: grammar(0),
  start: grammar(1),
  'request-grant': grammar(1),
  join: grammar(1),
  status: grammar(1),
  resume: grammar(1),
  submit: grammar(1),
  supplement: grammar(2),
  continue: grammar(1),
  finalize: grammar(1),
  recover: grammar(1),
  abandon: grammar(1),
  help: grammar(0, 2),
  explain: grammar(1),
});

const BOOLEAN_FLAGS = new Set([
  '--dry-run',
  '--remove',
  '--confirm-scratch-exclude',
  '--json',
  '--next',
  '--no-commit',
  '--no-artifact-change',
  '--good-enough',
  '--reclaim',
  '--all',
]);
const REPEATABLE_FLAGS = new Set(['--agent', '--unresolved-finding-id']);
const POSITIVE_INTEGER_FLAGS = new Set([
  '--issue',
  '--max-turns',
  '--claim-ttl',
  '--additional-turns',
  '--resulting-effective-maximum',
  '--target-turn',
  '--final-round',
]);

export const GRANT_PARAMETER_FIELDS = Object.freeze({
  'pin-verifier': frozenList([
    'verifier_fingerprint',
    'assurance_grade',
    'authority_policy',
    'artifact_path',
    'artifact_kind',
    'reviews_root',
    'path_template',
    'issue_id',
    'maximum_turns',
    'commit_mode',
  ]),
  continue: frozenList([
    'additional_turns',
    'resulting_effective_maximum',
    'resume_role',
    'focus_path',
    'focus_digest',
  ]),
  supplement: frozenList(['content_digest', 'target_role', 'target_turn']),
  'accept-over-objections': frozenList([
    'artifact_path',
    'artifact_blob',
    'artifact_digest',
    'final_round',
    'reviewer_response_path',
    'reviewer_response_digest',
    'unresolved_finding_ids',
    'human_rationale_digest',
  ]),
  'replace-participant': frozenList([
    'role',
    'outgoing_claim_id',
    'outgoing_session_fingerprint',
    'incoming_session_fingerprint',
  ]),
});

const SPECIAL_PARAMETER_NAMES = Object.freeze({
  '--review-path-template': 'path_template',
  '--issue': 'issue_id',
  '--max-turns': 'maximum_turns',
  '--unresolved-finding-id': 'unresolved_finding_ids',
});

function usage(message, details = {}) {
  throw new AprError('APR_USAGE', message, {
    recovery: 'Run peer-review help --all for the closed command grammar.',
    details,
    exitCode: 2,
  });
}

function camelName(flag) {
  return flag.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function parameterName(flag) {
  return SPECIAL_PARAMETER_NAMES[flag] ?? flag.slice(2).replaceAll('-', '_');
}

function parsePositiveInteger(flag, value) {
  if (!/^[1-9]\d*$/.test(value)) usage(`${flag} requires a positive integer`, { flag, value });
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    usage(`${flag} requires a safe positive integer`, { flag, value });
  }
  return parsed;
}

function normalizeHelp(argv) {
  if (argv.length === 1 && (argv[0] === '--help' || argv[0] === '-h')) {
    return { command: 'help', args: [], options: {} };
  }
  if (argv.length === 2 && COMMANDS.includes(argv[0]) && argv[1] === '--help') {
    return { command: 'help', args: [argv[0]], options: {} };
  }
  return null;
}

function validatePositions(command, args) {
  const { min, max } = POSITIONAL_GRAMMAR[command];
  if (args.length < min || args.length > max) {
    usage(`${command} received an invalid positional argument count`, {
      command,
      expected: min === max ? min : `${min}-${max}`,
      actual: args.length,
    });
  }
  if (command === 'help' && args.length === 2 && args[0] !== 'search') {
    usage('help accepts two positional arguments only as: help search <term>');
  }
}

function validateEnum(options, key, flag, values) {
  if (options[key] !== undefined && !values.includes(options[key])) {
    usage(`${flag} must be one of: ${values.join(', ')}`);
  }
}

function validateConstraints(command, args, options) {
  if (command === 'start') {
    if (!options.artifactKind) usage('start requires --artifact-kind');
    validateEnum(options, 'artifactKind', '--artifact-kind', ['spec', 'plan']);
    if (options.testHumanAuthority && !options.noCommit) {
      usage('--test-human-authority requires --no-commit');
    }
    if (options.transportMode === 'automatic-required') {
      usage('automatic-required is unavailable until Phase 2');
    }
    if (options.claimTtlMs === undefined) options.claimTtlMs = 8 * 60 * 60 * 1000;
  }
  if (command === 'submit') {
    validateEnum(options, 'decision', '--decision', ['revisions-requested', 'accepted']);
    if (
      options.noArtifactChange &&
      (typeof options.reason !== 'string' || !options.reason.trim())
    ) {
      usage('--no-artifact-change requires a non-empty --reason');
    }
    if (options.reason !== undefined && !options.noArtifactChange) {
      usage('--reason requires --no-artifact-change');
    }
  }
  if (command === 'supplement') {
    validateEnum(options, 'for', '--for', ['author', 'reviewer']);
    if (!options.for || !options.grant) usage('supplement requires --for and --grant');
  }
  if (command === 'continue' && !options.grant) usage('continue requires --grant');
  if (command === 'finalize' && Boolean(options.goodEnough) !== Boolean(options.grant)) {
    usage('finalize requires --good-enough and --grant together');
  }
  if (command === 'abandon' && (typeof options.reason !== 'string' || !options.reason.trim())) {
    usage('abandon requires a non-empty --reason');
  }
  if (command === 'recover') {
    validateEnum(options, 'replaceParticipant', '--replace-participant', ['author', 'reviewer']);
    if (options.reclaim && options.replaceParticipant) {
      usage('--reclaim and --replace-participant are mutually exclusive');
    }
    if (options.replaceParticipant && !options.grant) {
      usage('--replace-participant requires --grant');
    }
    if (options.grant && !options.replaceParticipant) {
      usage('--grant requires --replace-participant on recover');
    }
  }
  if (command === 'help' && args[0] && args[0] !== 'search' && !COMMANDS.includes(args[0])) {
    usage(`unknown help topic: ${args[0]}`);
  }
}

function normalizeRequestGrant(rawOptions) {
  const action = rawOptions.get('--action');
  if (!action) usage('request-grant requires --action');
  const allowed = GRANT_PARAMETER_FIELDS[action];
  if (!allowed) usage(`unknown protected action: ${action}`);
  const parameters = {};
  for (const [flag, value] of rawOptions) {
    if (flag === '--action') continue;
    const name = parameterName(flag);
    if (!allowed.includes(name))
      usage(`${flag} is not valid for action ${action}`, { action, flag });
    parameters[name] = value;
  }
  return { action, parameters };
}

export function parseCommand(argv) {
  if (!Array.isArray(argv)) usage('argv must be an array');
  const help = normalizeHelp(argv);
  if (help) return help;
  if (argv.length === 0) usage('command is required');

  const [command, ...tokens] = argv;
  if (!COMMANDS.includes(command)) usage(`unknown command: ${command}`, { command });

  const flags = new Set(COMMAND_FLAGS[command]);
  const args = [];
  const rawOptions = new Map();
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith('--')) {
      args.push(token);
      continue;
    }

    const equals = token.indexOf('=');
    const flag = equals === -1 ? token : token.slice(0, equals);
    if (!flags.has(flag)) usage(`unknown flag for ${command}: ${flag}`, { command, flag });
    const hasInlineValue = equals !== -1;
    if (BOOLEAN_FLAGS.has(flag)) {
      if (hasInlineValue) usage(`${flag} does not accept a value`, { flag });
      if (rawOptions.has(flag)) usage(`duplicate singleton flag: ${flag}`, { flag });
      rawOptions.set(flag, true);
      continue;
    }

    let value = hasInlineValue ? token.slice(equals + 1) : tokens[index + 1];
    if (!hasInlineValue) index += 1;
    if (value === undefined || value.startsWith('--')) usage(`${flag} requires a value`, { flag });
    if (!value.trim()) usage(`${flag} requires a non-empty value`, { flag });
    if (POSITIVE_INTEGER_FLAGS.has(flag)) value = parsePositiveInteger(flag, value);
    if (REPEATABLE_FLAGS.has(flag)) {
      rawOptions.set(flag, [...(rawOptions.get(flag) ?? []), value]);
    } else {
      if (rawOptions.has(flag)) usage(`duplicate singleton flag: ${flag}`, { flag });
      rawOptions.set(flag, value);
    }
  }

  validatePositions(command, args);
  if (command === 'request-grant') {
    return { command, args, options: normalizeRequestGrant(rawOptions) };
  }

  const options = {};
  for (const [flag, value] of rawOptions) {
    if (flag === '--claim-ttl') {
      const claimTtlMs = value * 60 * 60 * 1000;
      if (!Number.isSafeInteger(claimTtlMs)) {
        usage('--claim-ttl converts to milliseconds outside the safe integer range', { value });
      }
      options.claimTtlMs = claimTtlMs;
    } else {
      options[camelName(flag)] = value;
    }
  }
  validateConstraints(command, args, options);
  return { command, args, options };
}
