import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AprError } from '../../src/errors.mjs';
import { COMMANDS, COMMAND_FLAGS, POSITIONAL_GRAMMAR, parseCommand } from '../../src/cli/parse.mjs';
import { run } from '../../src/cli/run.mjs';

const EXPECTED_COMMANDS = [
  'setup',
  'doctor',
  'start',
  'request-grant',
  'join',
  'status',
  'resume',
  'submit',
  'supplement',
  'continue',
  'finalize',
  'recover',
  'abandon',
  'help',
  'explain',
];

function usage(argv, pattern) {
  assert.throws(
    () => parseCommand(argv),
    (error) =>
      error instanceof AprError &&
      error.code === 'APR_USAGE' &&
      pattern.test(error.message) &&
      error.exitCode === 2
  );
}

test('command, flag, and positional catalogs are closed and frozen', () => {
  assert.deepEqual(COMMANDS, EXPECTED_COMMANDS);
  assert.ok(Object.isFrozen(COMMANDS));
  assert.deepEqual(Object.keys(COMMAND_FLAGS), EXPECTED_COMMANDS);
  assert.ok(Object.isFrozen(COMMAND_FLAGS));
  assert.ok(Object.values(COMMAND_FLAGS).every(Object.isFrozen));
  assert.deepEqual(POSITIONAL_GRAMMAR.supplement, { min: 2, max: 2 });
  assert.ok(Object.isFrozen(POSITIONAL_GRAMMAR));
});

test('start options have stable names, repeatability, and defaults', () => {
  const parsed = parseCommand([
    'start',
    'docs/spec.md',
    '--artifact-kind',
    'spec',
    '--issue=1531',
    '--max-turns',
    '4',
    '--claim-ttl',
    '12',
    '--no-commit',
    '--test-human-authority',
    'fixture-a',
  ]);
  assert.deepEqual(parsed, {
    command: 'start',
    args: ['docs/spec.md'],
    options: {
      artifactKind: 'spec',
      issue: 1531,
      maxTurns: 4,
      claimTtlMs: 12 * 60 * 60 * 1000,
      noCommit: true,
      testHumanAuthority: 'fixture-a',
    },
  });
  assert.equal(
    parseCommand(['start', 'x', '--artifact-kind', 'plan']).options.claimTtlMs,
    8 * 60 * 60 * 1000
  );
  assert.deepEqual(parseCommand(['setup', '--agent', 'codex', '--agent=claude']).options.agent, [
    'codex',
    'claude',
  ]);
});

test('rejects unknown syntax, boolean values, duplicates, and invalid positions', () => {
  usage([], /command is required/i);
  usage(['wat'], /unknown command/i);
  usage(['join'], /positional/i);
  usage(['doctor', 'extra'], /positional/i);
  usage(['status', 'x', '--wat'], /unknown flag/i);
  usage(['status', 'x', '--json=true'], /does not accept a value/i);
  usage(['status', 'x', '--json', '--json'], /duplicate/i);
  usage(['start', 'x', '--artifact-kind'], /requires a value/i);
  usage(['start', 'x', '--artifact-kind', 'spec', '--artifact-kind', 'plan'], /duplicate/i);
});

test('rejects invalid positive integers and accepts Phase 2 automatic-required mode', () => {
  for (const [flag, value] of [
    ['--issue', '0'],
    ['--max-turns', '-1'],
    ['--claim-ttl', '1.5'],
  ]) {
    usage(['start', 'x', '--artifact-kind', 'spec', flag, value], /positive integer/i);
  }
  assert.equal(
    parseCommand([
      'start',
      'x',
      '--artifact-kind',
      'spec',
      '--transport-mode',
      'automatic-required',
    ]).options.transportMode,
    'automatic-required'
  );
});

test('rejects unsafe integers and claim TTL millisecond overflow', () => {
  usage(
    ['start', 'x', '--artifact-kind', 'spec', '--issue', '9007199254740993'],
    /safe positive integer/i
  );
  usage(
    [
      'request-grant',
      'workspace',
      '--action',
      'supplement',
      '--target-turn',
      '9999999999999999999999999999999999999999',
    ],
    /safe positive integer/i
  );
  const overflowingHours = String(Math.floor(Number.MAX_SAFE_INTEGER / (60 * 60 * 1000)) + 1);
  usage(
    ['start', 'x', '--artifact-kind', 'spec', '--claim-ttl', overflowingHours],
    /claim-ttl.*milliseconds.*safe/i
  );
});

test('enforces no-commit and no-artifact-change constraints', () => {
  usage(
    ['start', 'x', '--artifact-kind', 'spec', '--no-commit', '--no-commit'],
    /duplicate|nested/i
  );
  usage(
    ['start', 'x', '--artifact-kind', 'spec', '--test-human-authority', 'fixture'],
    /requires --no-commit/i
  );
  usage(['submit', 'workspace', '--no-artifact-change'], /requires.*--reason/i);
  usage(['submit', 'workspace', '--reason', 'unchanged'], /requires.*--no-artifact-change/i);
  usage(
    ['submit', 'workspace', '--no-artifact-change', '--reason', '   '],
    /reason.*non-empty|non-empty.*reason/i
  );
  usage(['finalize', 'workspace', '--good-enough', '--grant', 'signed'], /requires.*--rationale/i);
  assert.deepEqual(
    parseCommand([
      'finalize',
      'workspace',
      '--good-enough',
      '--grant',
      'signed',
      '--rationale',
      'decision.md',
    ]).options,
    { goodEnough: true, grant: 'signed', rationale: 'decision.md' }
  );
});

test('enforces command-specific enums and recovery option relationships', () => {
  usage(['start', 'x', '--artifact-kind', 'code'], /artifact-kind.*spec.*plan/i);
  usage(['submit', 'workspace', '--decision', 'maybe'], /decision.*revisions-requested.*accepted/i);
  usage(
    ['supplement', 'workspace', 'notes.md', '--for', 'observer', '--grant', 'signed'],
    /--for.*author.*reviewer/i
  );
  usage(
    ['recover', 'workspace', '--reclaim', '--replace-participant', 'reviewer', '--grant', 'signed'],
    /mutually exclusive/i
  );
  usage(['recover', 'workspace', '--replace-participant', 'author'], /requires --grant/i);
  assert.deepEqual(
    parseCommand(['recover', 'workspace', '--replace-participant', 'reviewer', '--grant', 'signed'])
      .options,
    { replaceParticipant: 'reviewer', grant: 'signed' }
  );
});

test('request-grant maps only action-owned fields to canonical snake case', () => {
  const parsed = parseCommand([
    'request-grant',
    'workspace',
    '--action',
    'accept-over-objections',
    '--artifact-path',
    'docs/spec.md',
    '--unresolved-finding-id',
    'F-1',
    '--unresolved-finding-id=F-2',
    '--human-rationale-digest',
    'sha256:abc',
  ]);
  assert.deepEqual(parsed, {
    command: 'request-grant',
    args: ['workspace'],
    options: {
      action: 'accept-over-objections',
      parameters: {
        artifact_path: 'docs/spec.md',
        unresolved_finding_ids: ['F-1', 'F-2'],
        human_rationale_digest: 'sha256:abc',
      },
    },
  });
  usage(
    ['request-grant', 'workspace', '--action', 'supplement', '--focus-path', 'x'],
    /not valid for action/i
  );
  usage(['request-grant', 'workspace', '--artifact-path', 'x'], /requires --action/i);
  usage(['request-grant', 'workspace', '--action', 'unknown'], /unknown protected action/i);
});

test('top-level and command help normalize to the help command', () => {
  assert.deepEqual(parseCommand(['--help']), { command: 'help', args: [], options: {} });
  assert.deepEqual(parseCommand(['submit', '--help']), {
    command: 'help',
    args: ['submit'],
    options: {},
  });
  assert.deepEqual(parseCommand(['help', 'search', 'grant']), {
    command: 'help',
    args: ['search', 'grant'],
    options: {},
  });
});

test('run keeps library control flow exit-free and renders JSON-safe errors', async () => {
  const stdout = [];
  const stderr = [];
  const io = {
    cwd: '/repo',
    env: {},
    stdout: { write: (value) => stdout.push(String(value)) },
    stderr: { write: (value) => stderr.push(String(value)) },
  };

  assert.equal(await run(['--help'], io), 0);
  assert.match(stdout.join(''), /peer-review/);
  assert.equal(await run(['status', 'workspace'], io), 1);
  assert.equal(JSON.parse(stderr.at(-1)).code, 'APR_EVENT_LOG_MISSING');
  assert.equal(await run(['wat'], io), 2);
  assert.equal(JSON.parse(stderr.at(-1)).code, 'APR_USAGE');
});
