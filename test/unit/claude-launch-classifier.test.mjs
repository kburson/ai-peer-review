import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv-provider.js';

import {
  buildClaudeLaunchDiagnostic,
  normalizeClaudeExecution,
} from '../../src/provider/claude-launch-diagnostics.mjs';

const schema = JSON.parse(
  readFileSync(new URL('../../schemas/claude-launch-result-v1.json', import.meta.url), 'utf8')
);

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
