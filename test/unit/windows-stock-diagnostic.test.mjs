// @story #190
import test from 'node:test';
import assert from 'node:assert/strict';
const api = await import('../helpers/windows-stock-diagnostic-core.mjs').catch(() => ({}));
// Catch accidental publication of private process output or treating malformed host output as valid.
test('stock diagnostic retains timeout categories without private exception or command output', () => {
  assert.equal(typeof api.stockDiagnosticDetails, 'function');
  const result = api.stockDiagnosticDetails('host-identity', {
    error: {
      code: 'ETIMEDOUT',
      killed: true,
      signal: 'SIGTERM',
      message: 'private-path',
      cmd: 'private-command',
    },
    stdout: 'private-uuid',
    stderr: 'private-user',
  });
  assert.deepEqual(result, {
    errorCode: 'ETIMEDOUT',
    killed: true,
    exitSignal: 'SIGTERM',
    stderrEmpty: false,
    hostRecord: 'not-observed',
  });
  assert.doesNotMatch(JSON.stringify(result), /private/);
  assert.equal(
    api.stockDiagnosticDetails('host-identity', {
      error: { code: 'private-code', signal: 'private-signal' },
    }).errorCode,
    'other'
  );
});
test('stock diagnostic distinguishes valid host shape from incomplete or ambiguous JSON', () => {
  assert.equal(typeof api.stockDiagnosticDetails, 'function');
  const valid = '{"completed":true,"uuid":"12345678-1234-1234-1234-123456789abc"}';
  assert.equal(
    api.stockDiagnosticDetails('host-identity', { stdout: valid, stderr: '' }).hostRecord,
    'valid-shape'
  );
  for (const stdout of [
    '{"completed":false,"uuid":"12345678-1234-1234-1234-123456789abc"}',
    '{"completed":true,"uuid":"00000000-0000-0000-0000-000000000000"}',
    '{"completed":true,"uuid":"12345678-1234-1234-1234-123456789abc","extra":true}',
    '{"completed":true,"uuid":"private-host"}',
    '{"completed":true,"completed":false,"uuid":"12345678-1234-1234-1234-123456789abc"}',
    'private-text',
  ])
    assert.equal(
      api.stockDiagnosticDetails('host-identity', { stdout, stderr: '' }).hostRecord,
      'invalid-shape'
    );
  assert.equal(
    api.stockDiagnosticDetails('host-identity', { stdout: valid, stderr: 'private-warning' })
      .hostRecord,
    'stderr-present'
  );
  assert.doesNotMatch(
    JSON.stringify(api.stockDiagnosticDetails('host-identity', { stdout: valid, stderr: '' })),
    /12345678/
  );
});
test('other stock calls do not publish their principal or ACL output', () => {
  assert.equal(typeof api.stockDiagnosticDetails, 'function');
  assert.deepEqual(
    api.stockDiagnosticDetails('principal', { stdout: 'private-principal', stderr: '' }),
    { errorCode: null, killed: false, exitSignal: null, stderrEmpty: true }
  );
});
