import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv-provider.js';

import {
  buildClaudeLaunchDiagnostic,
  normalizeClaudeExecution,
} from '../../src/provider/claude-launch-diagnostics.mjs';
import { runClaudeReviewerLaunch } from '../../src/provider/claude-launch.mjs';
import { classifyClaudeReviewerOutcome } from '../../src/provider/claude-launch.mjs';
import { fingerprintSession } from '../../src/identity/registry.mjs';
import { launchAuthority, launchFixture } from '../helpers/claude-launch-fixture.mjs';

const schema = JSON.parse(
  readFileSync(new URL('../../schemas/claude-launch-result-v1.json', import.meta.url), 'utf8')
);

test('runner classifies spawn failure after inspecting post-launch authority without private state', async (t) => {
  const fixture = launchFixture(t);
  let inspections = 0;
  const result = await runClaudeReviewerLaunch({
    contract: fixture.contract,
    inspectAuthority: () => {
      inspections += 1;
      return launchAuthority({ joined: false });
    },
    execFile: async () => {
      throw Object.assign(new Error('PRIVATE'), { code: 'ENOENT' });
    },
  });
  assert.equal(inspections, 2);
  assert.equal(result.status, 'failed');
  assert.equal(result.session_fingerprint, null);
  assert.equal(result.recovery, null);
  assert.equal(result.diagnostic.category, 'spawn-failed');
  assert.equal(existsSync(fixture.stateFile), false);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE/);
});

const sessionFingerprint = fingerprintSession('anthropic', 'fixture-claude-session');

function execution(value = {}, exit_code = 0) {
  return { exit_code, stderr: '', stdout: JSON.stringify(value) };
}

function decisionAuthority() {
  return launchAuthority({
    sequence: 4,
    revision: 3,
    state: 'acceptance-pending',
    events: [
      {
        review_id: 'review-1',
        sequence: 4,
        revision: 3,
        type: 'reviewer-accepted',
        actor: sessionFingerprint,
      },
    ],
  });
}

test('direct classifier requires independent session and explicit private recovery evidence', (t) => {
  const fx = launchFixture(t);
  const before = launchAuthority({ joined: false, sequence: 1, revision: 0 });
  const after = decisionAuthority();
  const providerResult = normalizeClaudeExecution({
    execution: execution({ session_id: 'fixture-claude-session' }, 1),
  });
  const oldCall = classifyClaudeReviewerOutcome({
    before,
    after,
    providerResult,
    contract: fx.contract,
  });
  assert.equal(oldCall.status, 'outcome-unknown');
  assert.equal(oldCall.diagnostic.category, 'session-unavailable');
  assert.equal(oldCall.recovery, null);
  const submitted = classifyClaudeReviewerOutcome({
    before,
    after,
    providerResult,
    contract: fx.contract,
    expectedSessionFingerprint: sessionFingerprint,
  });
  assert.equal(submitted.status, 'submitted');
  assert.equal(submitted.diagnostic, undefined);

  const deniedEvidence = normalizeClaudeExecution({
    execution: execution(
      {
        session_id: 'fixture-claude-session',
        permission_denials: [{ tool: 'Edit', path: fx.contract.response }],
      },
      1
    ),
  });
  const unchanged = launchAuthority();
  const denied = classifyClaudeReviewerOutcome({
    before: unchanged,
    after: unchanged,
    providerResult: deniedEvidence,
    contract: fx.contract,
    expectedSessionFingerprint: sessionFingerprint,
  });
  assert.equal(denied.status, 'permission-blocked');
  assert.equal(denied.recovery, null);
  assert.equal(
    classifyClaudeReviewerOutcome({
      before: unchanged,
      after: unchanged,
      providerResult: deniedEvidence,
      contract: fx.contract,
      expectedSessionFingerprint: sessionFingerprint,
      resumeAvailable: true,
    }).recovery.reason,
    'response-permission-denied'
  );
});

test('runner applies decision, denial, failure, interruption, and uncertainty precedence', async (t) => {
  const cases = [
    {
      name: 'decision over nonzero exit',
      before: launchAuthority({ joined: false, sequence: 1, revision: 0 }),
      after: decisionAuthority(),
      output: { session_id: 'fixture-claude-session' },
      exit: 2,
      status: 'submitted',
      category: null,
      state: true,
    },
    {
      name: 'decision over denial',
      before: launchAuthority({ joined: false, sequence: 1, revision: 0 }),
      after: decisionAuthority(),
      output: (fx) => ({
        session_id: 'fixture-claude-session',
        permission_denials: [{ tool: 'Edit', path: fx.contract.response }],
      }),
      exit: 1,
      status: 'submitted',
      category: null,
      state: true,
    },
    {
      name: 'first decision without handle',
      before: launchAuthority({ joined: false, sequence: 1, revision: 0 }),
      after: decisionAuthority(),
      output: {},
      exit: 1,
      status: 'outcome-unknown',
      category: 'session-unavailable',
      state: false,
    },
    {
      name: 'provider failure',
      output: { session_id: 'fixture-claude-session', is_error: true },
      exit: 0,
      status: 'failed',
      category: 'provider-failed',
      state: true,
    },
    {
      name: 'join failure',
      output: { session_id: 'fixture-claude-session', error: { code: 'APR_IDENTITY_REQUIRED' } },
      exit: 1,
      status: 'failed',
      category: 'join-failed',
      state: true,
    },
    {
      name: 'numeric failure',
      output: {},
      exit: 2,
      status: 'failed',
      category: 'provider-failed',
      state: false,
    },
    {
      name: 'invalid output',
      raw: '{',
      exit: 0,
      status: 'outcome-unknown',
      category: 'invalid-provider-output',
      state: false,
    },
    {
      name: 'interrupted output',
      error: { code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER', stdout: '{' },
      status: 'outcome-unknown',
      category: 'execution-interrupted',
      state: false,
    },
    {
      name: 'missing session',
      output: {},
      exit: 0,
      status: 'outcome-unknown',
      category: 'session-unavailable',
      state: false,
    },
    {
      name: 'no submission',
      output: { session_id: 'fixture-claude-session' },
      exit: 0,
      status: 'outcome-unknown',
      category: 'no-submission',
      state: true,
    },
  ];
  for (const entry of cases) {
    await t.test(entry.name, async (caseTest) => {
      const fx = launchFixture(caseTest);
      let inspections = 0;
      const result = await runClaudeReviewerLaunch({
        contract: fx.contract,
        inspectAuthority: () => {
          inspections += 1;
          return inspections === 1
            ? (entry.before ?? launchAuthority())
            : (entry.after ?? launchAuthority());
        },
        execFile: async (_file, _args, options) => {
          assert.equal(options.maxBuffer, 1024 * 1024);
          if (entry.error) throw Object.assign(new Error('PRIVATE'), entry.error);
          return entry.raw === undefined
            ? execution(
                typeof entry.output === 'function' ? entry.output(fx) : entry.output,
                entry.exit
              )
            : { exit_code: entry.exit, stderr: '', stdout: entry.raw };
        },
      });
      assert.equal(inspections, 2);
      assert.equal(result.status, entry.status);
      assert.equal(result.diagnostic?.category ?? null, entry.category);
      assert.equal(existsSync(fx.stateFile), entry.state);
      assert.equal(result.recovery, null);
      assert.doesNotMatch(JSON.stringify(result), /PRIVATE/);
    });
  }
});

test('runner refuses invalid preconditions and identity without writing private state', async (t) => {
  const fx = launchFixture(t);
  let launches = 0;
  await assert.rejects(
    runClaudeReviewerLaunch({
      contract: fx.contract,
      inspectAuthority: () => launchAuthority({ joined: false, sequence: -1 }),
      execFile: async () => {
        launches += 1;
        return execution({});
      },
    }),
    { code: 'APR_CLAUDE_RESULT_INVALID' }
  );
  assert.equal(launches, 0);
  for (const session_id of [null, '../other', 'changed-session']) {
    await assert.rejects(
      runClaudeReviewerLaunch({
        contract: fx.contract,
        inspectAuthority: () => launchAuthority(),
        execFile: async () => execution({ session_id }),
      }),
      {
        code:
          session_id === 'changed-session' ? 'APR_IDENTITY_CONFLICT' : 'APR_CLAUDE_SESSION_INVALID',
      }
    );
    assert.equal(existsSync(fx.stateFile), false);
  }
});

test('atomic state write failure preserves destination and returns no recovery', async (t) => {
  const fx = launchFixture(t);
  mkdirSync(fx.stateFile, { recursive: true });
  const sentinel = path.join(fx.stateFile, 'sentinel');
  writeFileSync(sentinel, 'preserve');
  await assert.rejects(
    runClaudeReviewerLaunch({
      contract: fx.contract,
      inspectAuthority: () => launchAuthority(),
      execFile: async () => execution({ session_id: 'fixture-claude-session' }),
    }),
    { code: 'APR_ATOMIC_WRITE_FAILED' }
  );
  assert.equal(readFileSync(sentinel, 'utf8'), 'preserve');
  assert.deepEqual(readdirSync(path.dirname(fx.stateFile)), ['launch-state.json']);
});

test('runner preserves a valid resume state on unusable output and proves a handle-free decision', async (t) => {
  const fx = launchFixture(t);
  const initial = await runClaudeReviewerLaunch({
    contract: fx.contract,
    inspectAuthority: () => launchAuthority(),
    execFile: async () => execution({ session_id: 'fixture-claude-session' }),
  });
  assert.equal(initial.status, 'outcome-unknown');
  const bytes = readFileSync(fx.stateFile, 'utf8');
  const failed = await runClaudeReviewerLaunch({
    contract: fx.contract,
    resume: true,
    inspectAuthority: () => launchAuthority(),
    execFile: async () => ({ exit_code: 2, stdout: '{', stderr: 'PRIVATE' }),
  });
  assert.equal(failed.status, 'failed');
  assert.equal(failed.diagnostic.category, 'provider-failed');
  assert.equal(failed.recovery, null);
  assert.equal(readFileSync(fx.stateFile, 'utf8'), bytes);
  const observations = [
    launchAuthority({ joined: false, sequence: 3, revision: 2 }),
    decisionAuthority(),
  ];
  const submitted = await runClaudeReviewerLaunch({
    contract: fx.contract,
    resume: true,
    inspectAuthority: () => observations.shift(),
    execFile: async (_file, args) => {
      assert.deepEqual(args.slice(0, 2), ['--resume', 'fixture-claude-session']);
      return execution({});
    },
  });
  assert.equal(submitted.status, 'submitted');
  assert.equal(submitted.session_fingerprint, sessionFingerprint);
});

test('resume refuses stale or malformed stored revision before provider dispatch', async (t) => {
  const fx = launchFixture(t);
  await runClaudeReviewerLaunch({
    contract: fx.contract,
    inspectAuthority: () => launchAuthority(),
    execFile: async () => execution({ session_id: 'fixture-claude-session' }),
  });
  const original = JSON.parse(readFileSync(fx.stateFile, 'utf8'));
  let launches = 0;
  for (const revision of [-1, 2 ** 53, 3]) {
    writeFileSync(fx.stateFile, JSON.stringify({ ...original, protocol_revision: revision }));
    await assert.rejects(
      runClaudeReviewerLaunch({
        contract: fx.contract,
        resume: true,
        inspectAuthority: () => launchAuthority(),
        execFile: async () => {
          launches += 1;
          return execution({});
        },
      }),
      { code: 'APR_CLAUDE_SESSION_INVALID' }
    );
  }
  assert.equal(launches, 0);
});

test('authority conflicts and ambiguous decisions fail before private persistence', async (t) => {
  const cases = [
    {
      name: 'wrong actor',
      after: () => {
        const value = decisionAuthority();
        value.events[0].actor = `sha256:${'b'.repeat(64)}`;
        return value;
      },
      code: 'APR_IDENTITY_CONFLICT',
    },
    {
      name: 'wrong provider',
      after: () => {
        const value = launchAuthority();
        value.state.participants.reviewer.provider = 'openai';
        return value;
      },
      code: 'APR_IDENTITY_CONFLICT',
    },
    {
      name: 'duplicate decision',
      after: () => {
        const value = decisionAuthority();
        value.events.push({ ...value.events[0] });
        return value;
      },
      code: 'APR_CLAUDE_RESULT_INVALID',
    },
    {
      name: 'regressed sequence',
      after: () => launchAuthority({ sequence: 0 }),
      code: 'APR_CLAUDE_RESULT_INVALID',
    },
    {
      name: 'missing reviewer',
      after: () => launchAuthority({ joined: false, state: 'reviewer-turn' }),
      code: 'APR_CLAUDE_RESULT_INVALID',
    },
    {
      name: 'wrong review',
      after: () => {
        const value = launchAuthority();
        value.state.protocol.review_id = 'another-review';
        return value;
      },
      code: 'APR_CLAUDE_RESULT_INVALID',
    },
    {
      name: 'regressed revision',
      before: launchAuthority({ joined: false, sequence: 1, revision: 1 }),
      after: () => launchAuthority({ revision: 0 }),
      code: 'APR_CLAUDE_RESULT_INVALID',
    },
    {
      name: 'malformed event',
      after: () => launchAuthority({ events: [{ type: 'reviewer-accepted', sequence: -1 }] }),
      code: 'APR_CLAUDE_RESULT_INVALID',
    },
    {
      name: 'decision without review id',
      after: () => {
        const value = decisionAuthority();
        delete value.events[0].review_id;
        return value;
      },
      code: 'APR_CLAUDE_RESULT_INVALID',
    },
    {
      name: 'decision ahead of revision',
      after: () => {
        const value = decisionAuthority();
        value.events[0].revision = 4;
        return value;
      },
      code: 'APR_CLAUDE_RESULT_INVALID',
    },
  ];
  for (const entry of cases) {
    await t.test(entry.name, async (caseTest) => {
      const fx = launchFixture(caseTest);
      const observations = [
        entry.before ?? launchAuthority({ joined: false, sequence: 1, revision: 0 }),
        entry.after(),
      ];
      await assert.rejects(
        runClaudeReviewerLaunch({
          contract: fx.contract,
          inspectAuthority: () => observations.shift(),
          execFile: async () => execution({ session_id: 'fixture-claude-session' }),
        }),
        { code: entry.code }
      );
      assert.equal(existsSync(fx.stateFile), false);
    });
  }
});

test('only exact response denial with valid state receives a resume command', async (t) => {
  const fx = launchFixture(t);
  const neighbor = await runClaudeReviewerLaunch({
    contract: fx.contract,
    inspectAuthority: () => launchAuthority(),
    execFile: async () =>
      execution(
        {
          session_id: 'fixture-claude-session',
          permission_denials: [{ tool: 'Edit', path: `${fx.contract.response}.neighbor` }],
        },
        1
      ),
  });
  assert.equal(neighbor.status, 'failed');
  assert.equal(neighbor.recovery, null);
  const exact = await runClaudeReviewerLaunch({
    contract: fx.contract,
    inspectAuthority: () => launchAuthority(),
    execFile: async () =>
      execution(
        {
          session_id: 'fixture-claude-session',
          permission_denials: [{ tool: 'Edit', path: fx.contract.response }],
        },
        1
      ),
  });
  assert.equal(exact.status, 'permission-blocked');
  assert.equal(exact.diagnostic.category, 'response-permission-denied');
  assert.equal(exact.recovery.reason, 'response-permission-denied');
  const withoutState = launchFixture(t);
  const noHandle = await runClaudeReviewerLaunch({
    contract: withoutState.contract,
    inspectAuthority: () => launchAuthority(),
    execFile: async () =>
      execution(
        {
          permission_denials: [{ tool: 'Edit', path: withoutState.contract.response }],
        },
        1
      ),
  });
  assert.equal(noHandle.status, 'permission-blocked');
  assert.equal(noHandle.recovery, null);
  assert.equal(existsSync(withoutState.stateFile), false);
});

test('valid pre-join handle remains private and never manufactures a reviewer', async (t) => {
  const fx = launchFixture(t);
  const result = await runClaudeReviewerLaunch({
    contract: fx.contract,
    inspectAuthority: () => launchAuthority({ joined: false }),
    execFile: async () => execution({ session_id: 'fixture-claude-session' }),
  });
  assert.equal(result.status, 'outcome-unknown');
  assert.equal(result.diagnostic.category, 'no-submission');
  assert.equal(result.session_fingerprint, null);
  assert.equal(existsSync(fx.stateFile), true);
  assert.doesNotMatch(JSON.stringify(result), /fixture-claude-session/);
});

test('normalizes a definite private join failure into bounded public copy', () => {
  const evidence = normalizeClaudeExecution({
    execution: {
      exit_code: 1,
      stdout: JSON.stringify({ error: { code: 'APR_IDENTITY_REQUIRED', message: 'PRIVATE' } }),
      stderr: 'PRIVATE',
    },
  });
  assert.equal(evidence.provider_failed, true);
  assert.equal(evidence.join_code, 'APR_IDENTITY_REQUIRED');
  assert.equal(evidence.session_id_present, false);
  const diagnostic = buildClaudeLaunchDiagnostic({
    category: 'join-failed',
    exit_code: evidence.exit_code,
    code: evidence.join_code,
  });
  assert.doesNotMatch(JSON.stringify(diagnostic), /PRIVATE/);
  assert.ok(Buffer.byteLength(JSON.stringify(diagnostic), 'utf8') <= 1024);
  for (const key of ['message', 'next_action']) {
    assert.ok(Buffer.byteLength(diagnostic[key], 'utf8') <= 256);
  }
});

test('distinguishes spawn, process, interruption, and unavailable output evidence', () => {
  for (const code of ['ENOENT', 'EACCES']) {
    const evidence = normalizeClaudeExecution({
      error: Object.assign(new Error('PRIVATE'), { code, stdout: '' }),
    });
    assert.equal(evidence.spawn_code, code);
    assert.equal(evidence.exit_code, null);
    assert.equal(evidence.interrupted, false);
  }
  const numericError = normalizeClaudeExecution({
    error: Object.assign(new Error('PRIVATE'), { code: 2, stdout: '{' }),
  });
  assert.equal(numericError.exit_code, 2);
  assert.equal(numericError.output_issue, 'invalid-json');
  assert.equal(normalizeClaudeExecution({ execution: { stdout: '{}' } }).exit_code, null);
  assert.equal(
    normalizeClaudeExecution({ error: { code: 'UNKNOWN', stdout: '{}' } }).interrupted,
    true
  );
  const rejectedZero = normalizeClaudeExecution({ error: { code: 0, stdout: '{}' } });
  assert.equal(rejectedZero.exit_code, 0);
  assert.equal(rejectedZero.interrupted, true);
  assert.equal(
    normalizeClaudeExecution({ error: { signal: 'SIGTERM', stdout: '{}' } }).interrupted,
    true
  );

  const prefix = JSON.stringify({ session_id: 'untrusted-prefix', is_error: true });
  const overflow = normalizeClaudeExecution({
    error: Object.assign(new Error('PRIVATE'), {
      code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER',
      stdout: prefix,
      stderr: '',
    }),
  });
  assert.equal(overflow.output_issue, 'capture-overflow');
  assert.equal(overflow.interrupted, true);
  assert.equal(overflow.output_valid, false);
  assert.equal(overflow.session_id_present, false);
  assert.equal(overflow.provider_failed, false);
  const oversized = normalizeClaudeExecution({
    execution: { stdout: JSON.stringify({ result: 'x'.repeat(1024 * 1024) }), stderr: '' },
  });
  assert.equal(oversized.output_issue, 'oversized');
  assert.equal(oversized.interrupted, false);
  assert.equal(oversized.output_valid, false);
});

test('keeps malformed provider data from becoming failure, identity, or denial evidence', () => {
  for (const stdout of ['', '{', '[]', 'null']) {
    const evidence = normalizeClaudeExecution({ execution: { stdout } });
    assert.equal(evidence.output_valid, false);
    assert.equal(evidence.session_id_present, false);
    assert.equal(evidence.provider_failed, false);
  }
  const absent = normalizeClaudeExecution({
    execution: { stdout: JSON.stringify({ result: 'PRIVATE', error: '' }) },
  });
  assert.equal(absent.provider_failed, false);
  assert.equal(absent.join_code, null);
  const malformed = normalizeClaudeExecution({
    execution: {
      stdout: JSON.stringify({
        session_id: null,
        error: { details: { code: 'APR_IDENTITY_REQUIRED' } },
        permission_denials: [
          null,
          {},
          { tool: 'Edit', path: 42 },
          { tool: 'Edit', path: '/exact' },
        ],
      }),
    },
  });
  assert.equal(malformed.session_id_present, true);
  assert.equal(malformed.session_id, null);
  assert.equal(malformed.join_code, null);
  assert.deepEqual(malformed.permission_denials, [{ tool: 'Edit', path: '/exact' }]);
  assert.equal(
    normalizeClaudeExecution({ execution: { stdout: JSON.stringify({ is_error: true }) } })
      .provider_failed,
    true
  );
  assert.equal(
    normalizeClaudeExecution({ execution: { stdout: JSON.stringify({ error: 'PRIVATE' }) } })
      .provider_failed,
    true
  );
  assert.equal(
    normalizeClaudeExecution({ execution: { stdout: JSON.stringify({ error: {} }) } })
      .provider_failed,
    false
  );
  assert.equal(
    normalizeClaudeExecution({
      execution: { stdout: JSON.stringify({ error: { code: 'UNKNOWN' } }) },
    }).join_code,
    null
  );
  assert.equal(
    normalizeClaudeExecution({
      execution: { stdout: JSON.stringify({ result: 'APR_IDENTITY_REQUIRED' }) },
    }).join_code,
    null
  );
  const hostile = {
    toString() {
      throw new Error('PRIVATE');
    },
  };
  assert.equal(normalizeClaudeExecution({ execution: { stdout: hostile } }).output_issue, 'empty');
  assert.equal(
    normalizeClaudeExecution({ execution: { stdout: '{}', stderr: hostile } }).output_valid,
    true
  );
  assert.equal(
    normalizeClaudeExecution({ execution: { stdout: '{}', stderr: 'x'.repeat(1024 * 1024 + 1) } })
      .output_issue,
    'oversized'
  );
});

test('diagnostic categories have closed safe copy and bounded fields', () => {
  for (const category of [
    'spawn-failed',
    'provider-failed',
    'join-failed',
    'response-permission-denied',
    'execution-interrupted',
    'invalid-provider-output',
    'session-unavailable',
    'no-submission',
  ]) {
    const diagnostic = buildClaudeLaunchDiagnostic({ category });
    assert.deepEqual(Object.keys(diagnostic), [
      'category',
      'exit_code',
      'code',
      'message',
      'next_action',
    ]);
    assert.equal(Object.isFrozen(diagnostic), true);
    assert.ok(Buffer.byteLength(JSON.stringify(diagnostic), 'utf8') <= 1024);
    for (const field of ['message', 'next_action'])
      assert.ok(Buffer.byteLength(diagnostic[field], 'utf8') <= 256);
  }
  assert.throws(() => buildClaudeLaunchDiagnostic({ category: 'PRIVATE' }), {
    code: 'APR_CLAUDE_RESULT_INVALID',
  });
  assert.throws(() => buildClaudeLaunchDiagnostic({ category: 'toString' }), {
    code: 'APR_CLAUDE_RESULT_INVALID',
  });
  assert.throws(() => buildClaudeLaunchDiagnostic({ category: 'join-failed', code: 'PRIVATE' }), {
    code: 'APR_CLAUDE_RESULT_INVALID',
  });
});

test('v1 result schema accepts historical and new failures but requires identity for submission', () => {
  const validate = new AjvJsonSchemaValidator().getValidator(schema);
  const historical = {
    schema: 'ai-peer-review.claude-launch-result/v1',
    command: 'launch-reviewer',
    review_id: 'review-1',
    status: 'submitted',
    protocol_revision: 2,
    response: '/tmp/response.md',
    session_fingerprint: `sha256:${'a'.repeat(64)}`,
    recovery: null,
  };
  assert.equal(validate(historical).valid, true);
  const diagnostic = buildClaudeLaunchDiagnostic({ category: 'spawn-failed', code: 'ENOENT' });
  const failed = { ...historical, status: 'failed', session_fingerprint: null, diagnostic };
  assert.equal(validate(failed).valid, true);
  assert.equal(validate({ ...historical, session_fingerprint: null }).valid, false);
  assert.equal(validate({ ...failed, diagnostic: { ...diagnostic, raw: 'PRIVATE' } }).valid, false);
  assert.equal(
    validate({ ...failed, diagnostic: { ...diagnostic, category: 'PRIVATE' } }).valid,
    false
  );
  assert.equal(
    validate({ ...failed, diagnostic: { ...diagnostic, code: 'PRIVATE' } }).valid,
    false
  );
  assert.equal(
    validate({ ...failed, diagnostic: { ...diagnostic, message: 'x'.repeat(257) } }).valid,
    false
  );
});
