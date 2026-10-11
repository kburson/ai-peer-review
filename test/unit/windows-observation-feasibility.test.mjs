// @story #190
import test from 'node:test';
import assert from 'node:assert/strict';
const api = await import('../helpers/windows-observation-feasibility-report.mjs').catch(() => ({}));
const report = () => ({
  schema: 'ai-peer-review.windows-observation-feasibility/v1',
  verified: false,
  operationalAuthority: 'unavailable',
  producer: 'a'.repeat(40),
  sourceScriptSha256: 'b'.repeat(64),
  node: '24.21.0',
  platform: 'win32',
  arch: 'x64',
  osRelease: '10.0.26100',
  administratorMember: true,
  administratorEffective: true,
  token: 'ordinary',
  samples: 10,
  coldFirstQueryMs: 420,
  oneShotMs: Array(10).fill(450),
  batchQueryMs: Array(10).fill(20),
  completeRecordsEqual: true,
  aclChangeObserved: true,
  aclRestored: true,
  childExitObserved: true,
  completeRegistrationObserved: false,
  parentLossProved: false,
  guaranteedStartupSavingMs: 0,
});
test('closed diagnostic report cannot authorize a worker or disclose private records', () => {
  assert.equal(typeof api.validateObservationFeasibilityReport, 'function');
  assert.doesNotThrow(() => api.validateObservationFeasibilityReport(report()));
  for (const mutate of [
    (r) => {
      r.records = [{ principalSid: 'private' }];
    },
    (r) => {
      r.verified = true;
    },
    (r) => {
      r.operationalAuthority = 'current';
    },
    (r) => {
      r.completeRegistrationObserved = true;
    },
    (r) => {
      r.parentLossProved = true;
    },
    (r) => {
      r.guaranteedStartupSavingMs = 1;
    },
    (r) => {
      r.token = 'elevated-alias';
    },
    (r) => {
      r.token = 'limited';
    },
    (r) => {
      r.osRelease = 'unobserved';
    },
    (r) => {
      r.oneShotMs.pop();
    },
    (r) => {
      r.batchQueryMs[0] = -1;
    },
    (r) => {
      r.producer = 'not-a-commit';
    },
  ]) {
    const value = report();
    mutate(value);
    assert.throws(() => api.validateObservationFeasibilityReport(value));
  }
});

test('probe failure diagnostics retain known stage and code without private exception text', () => {
  assert.equal(typeof api.observationFeasibilityFailure, 'function');
  const error = new Error('private SID and directory');
  assert.deepEqual(api.observationFeasibilityFailure(error, 'validate'), {
    stage: 'validate',
    reason: 'unavailable',
    errorKind: 'Error',
  });
  assert.deepEqual(
    api.observationFeasibilityFailure(
      new Error('observation-feasibility-restoration-unproved'),
      'restore'
    ),
    {
      stage: 'restore',
      reason: 'observation-feasibility-restoration-unproved',
      errorKind: 'Error',
    }
  );
});
