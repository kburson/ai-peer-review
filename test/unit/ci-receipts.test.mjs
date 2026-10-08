// @story #140
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import {
  validateLaneReceipt,
  validateCloudRun,
  captureCommand,
  validateRequiredJob,
  validateTestedCommit,
  laneInventory,
  laneCommand,
} from '../../scripts/ci/receipt.mjs';

import { workers } from '../../scripts/ci/verify-receipts.mjs';

const log = Buffer.from('TAP version 13\n1..1\nok 1 - actual child output\n');
const expected = {
  repository: 'kburson/ai-peer-review',
  sourceHead: 'a'.repeat(40),
  testedCommit: 'b'.repeat(40),
  runId: '123',
  runAttempt: '2',
  jobKey: 'node-24-24-ubuntu-latest',
  matrixNode: '24',
  runnerOS: 'Linux',
  fingerprint: { 'package.json': 'c'.repeat(64), 'package-lock.json': 'd'.repeat(64) },
  inventory: { 'test/unit/a.test.mjs': 'e'.repeat(64), 'test/golden/b.test.mjs': 'f'.repeat(64) },
};
function receipt() {
  return {
    schema: 'apr.ci-test-lane/v1',
    ...structuredClone(expected),
    lane: 'fast',
    command: ['npm', 'test'],
    node: 'v24.16.0',
    platform: 'linux',
    arch: 'x64',
    startedAt: '2026-10-04T20:00:00.000Z',
    finishedAt: '2026-10-04T20:00:01.000Z',
    durationMs: 1000,
    exitCode: 0,
    signal: null,
    logSha256: createHash('sha256').update(log).digest('hex'),
  };
}
test('accepts successful lane with complete expected inventory and raw output', () => {
  assert.equal(validateLaneReceipt(receipt(), { ...expected, lane: 'fast', log }), true);
});
for (const [label, mutate] of [
  [
    'failed child',
    (r) => {
      r.exitCode = 1;
    },
  ],
  [
    'terminated child',
    (r) => {
      r.signal = 'SIGTERM';
    },
  ],
  [
    'stale source',
    (r) => {
      r.sourceHead = '0'.repeat(40);
    },
  ],
  [
    'wrong tested commit',
    (r) => {
      r.testedCommit = r.sourceHead;
    },
  ],
  [
    'foreign run',
    (r) => {
      r.runId = '124';
    },
  ],
  [
    'previous attempt',
    (r) => {
      r.runAttempt = '1';
    },
  ],
  [
    'missing test file',
    (r) => {
      delete r.inventory['test/unit/a.test.mjs'];
    },
  ],
  [
    'changed test file',
    (r) => {
      r.inventory['test/unit/a.test.mjs'] = '0'.repeat(64);
    },
  ],
  [
    'extra test file',
    (r) => {
      r.inventory['test/unit/extra.test.mjs'] = '0'.repeat(64);
    },
  ],
  [
    'changed configuration',
    (r) => {
      r.fingerprint['package.json'] = '0'.repeat(64);
    },
  ],
  [
    'substituted command',
    (r) => {
      r.command = ['npm', 'run', 'test:unit'];
    },
  ],
  [
    'wrong runtime',
    (r) => {
      r.node = 'v26.8.1';
    },
  ],
  [
    'wrong platform',
    (r) => {
      r.platform = 'win32';
    },
  ],
  [
    'invalid timestamp',
    (r) => {
      r.startedAt = 'not-a-date';
    },
  ],
  [
    'reversed time',
    (r) => {
      r.finishedAt = '2026-10-04T19:59:59.000Z';
    },
  ],
  [
    'fabricated duration',
    (r) => {
      r.durationMs = -1;
    },
  ],
]) {
  test(`refuses ${label}`, () => {
    const record = receipt();
    mutate(record);
    assert.throws(
      () => validateLaneReceipt(record, { ...expected, lane: 'fast', log }),
      /ci-receipt:/
    );
  });
}
test('refuses missing or altered raw output', () => {
  for (const output of [Buffer.alloc(0), Buffer.from('substituted output')]) {
    assert.throws(
      () => validateLaneReceipt(receipt(), { ...expected, lane: 'fast', log: output }),
      /ci-receipt:/
    );
  }
});
test('only accepts completed successful CI for exact repository, workflow and source head', () => {
  const run = {
    id: 123,
    run_attempt: 2,
    repository: { full_name: expected.repository },
    head_sha: expected.sourceHead,
    path: '.github/workflows/ci.yml',
    status: 'completed',
    conclusion: 'success',
    event: 'pull_request',
  };
  assert.equal(validateCloudRun(run, expected), true);
  for (const change of [
    { conclusion: 'failure' },
    { status: 'in_progress' },
    { head_sha: '0'.repeat(40) },
    { path: '.github/workflows/optional.yml' },
    { event: 'pull_request_target' },
    { repository: { full_name: 'foreign/repo' } },
    { run_attempt: 0 },
  ]) {
    assert.throws(() => validateCloudRun({ ...run, ...change }, expected), /ci-receipt:/);
  }
});

test('records the real child exit and raw output without converting failure to success', () => {
  const result = captureCommand(process.execPath, [
    '-e',
    "process.stdout.write('actual-output'); process.exit(7)",
  ]);
  assert.equal(result.exitCode, 7);
  assert.equal(result.signal, null);
  assert.equal(result.output.toString(), 'actual-output');
});

test('requires one successful job and every declared test step', () => {
  const job = {
    name: 'Node 24 / ubuntu-latest',
    status: 'completed',
    conclusion: 'success',
    steps: [
      { name: 'Verify tests: fast', conclusion: 'success' },
      { name: 'Verify tests: integration', conclusion: 'success' },
    ],
  };
  const requirement = { name: job.name, lanes: ['fast', 'integration'] };
  assert.equal(validateRequiredJob([job], requirement), true);
  for (const jobs of [
    [],
    [job, job],
    [{ ...job, conclusion: 'failure' }],
    [{ ...job, steps: job.steps.slice(1) }],
    [{ ...job, steps: [{ ...job.steps[0], conclusion: 'skipped' }, job.steps[1]] }],
  ]) {
    assert.throws(() => validateRequiredJob(jobs, requirement), /ci-receipt:/);
  }
});
test('accepts only actual source checkout or GitHub-proven PR merge with source parent', () => {
  const proof = {
    sourceHead: expected.sourceHead,
    event: 'pull_request',
    commitObject: {
      sha: expected.testedCommit,
      parents: [{ sha: 'c'.repeat(40) }, { sha: expected.sourceHead }],
    },
  };
  assert.equal(validateTestedCommit(expected.testedCommit, proof), true);
  assert.equal(
    validateTestedCommit(expected.sourceHead, { sourceHead: expected.sourceHead, event: 'push' }),
    true
  );
  for (const changed of [
    { ...proof, event: 'push' },
    { ...proof, commitObject: { ...proof.commitObject, sha: 'c'.repeat(40) } },
    { ...proof, commitObject: { ...proof.commitObject, parents: [{ sha: expected.sourceHead }] } },
    {
      ...proof,
      commitObject: {
        ...proof.commitObject,
        parents: [{ sha: 'c'.repeat(40) }, { sha: 'd'.repeat(40) }],
      },
    },
  ]) {
    assert.throws(() => validateTestedCommit(expected.testedCommit, changed), /ci-receipt:/);
  }
});

test('[#175] Windows baseline and owner inventories cover all integration cases once', () => {
  const files = {
    'test/integration/ordinary.test.mjs': '1',
    'test/integration/owner-publication.test.mjs': '2',
  };
  const baseline = laneInventory(files, 'integration', 'Windows');
  const owners = laneInventory(files, 'owner-publication', 'Windows');
  assert.deepEqual(baseline, { 'test/integration/ordinary.test.mjs': '1' });
  assert.deepEqual(owners, { 'test/integration/owner-publication.test.mjs': '2' });
  assert.deepEqual({ ...baseline, ...owners }, files);
  assert.deepEqual(laneInventory(files, 'integration', 'Linux'), files);
  assert.deepEqual(laneCommand('integration', 'Windows'), [
    'node',
    'test/helpers/run-suite.mjs',
    'integration',
    '--exclude-owner-publication',
    '--exclude-portable-ownership',
  ]);
});
test('[#175] dedicated owner receipts require actual owner command and exact owner inventory', () => {
  const owner = { 'test/integration/owner-publication.test.mjs': '2' };
  const want = {
    ...expected,
    runnerOS: 'Windows',
    jobKey: 'owner-publication-24-windows-latest',
    lane: 'owner-publication',
    inventory: owner,
    log,
  };
  const record = {
    ...receipt(),
    ...want,
    platform: 'win32',
    command: ['node', '--test', 'test/integration/owner-publication.test.mjs'],
  };
  assert.equal(validateLaneReceipt(record, want), true);
  assert.throws(() => validateLaneReceipt({ ...record, inventory: {} }, want), /ci-receipt:/);
  assert.throws(
    () =>
      validateLaneReceipt(
        { ...record, command: ['node', '--test', 'test/integration/ordinary.test.mjs'] },
        want
      ),
    /ci-receipt:/
  );
});

test('[#175] Windows baseline receipt cannot substitute the full-suite command or inventory', () => {
  const inventory = { 'test/integration/ordinary.test.mjs': '1' };
  const want = { ...expected, runnerOS: 'Windows', lane: 'integration', inventory, log };
  const record = {
    ...receipt(),
    ...want,
    platform: 'win32',
    command: [
      'node',
      'test/helpers/run-suite.mjs',
      'integration',
      '--exclude-owner-publication',
      '--exclude-portable-ownership',
    ],
  };
  assert.equal(validateLaneReceipt(record, want), true);
  assert.throws(
    () => validateLaneReceipt({ ...record, command: ['npm', 'run', 'test:integration'] }, want),
    /ci-receipt:/
  );
  assert.throws(
    () =>
      validateLaneReceipt(
        {
          ...record,
          inventory: { ...inventory, 'test/integration/owner-publication.test.mjs': '2' },
        },
        want
      ),
    /ci-receipt:/
  );
});
test('[#175] hosted proof requires independent successful owner jobs for each Windows runtime', () => {
  const required = workers();
  for (const node of ['24', '26', 'current']) {
    const owner = required.filter(
      (w) =>
        w.runnerOS === 'Windows' && w.matrixNode === node && w.lanes.includes('owner-publication')
    );
    assert.equal(owner.length, 1);
    assert.deepEqual(owner[0].lanes, ['owner-publication']);
    const job = {
      name: owner[0].name,
      status: 'completed',
      conclusion: 'success',
      steps: [{ name: 'Verify tests: owner-publication', conclusion: 'success' }],
    };
    assert.equal(validateRequiredJob([job], owner[0]), true);
    assert.throws(() => validateRequiredJob([], owner[0]), /ci-receipt:/);
    assert.throws(
      () =>
        validateRequiredJob(
          [{ ...job, steps: [{ name: 'Verify tests: integration', conclusion: 'success' }] }],
          owner[0]
        ),
      /ci-receipt:/
    );
    assert.throws(
      () => validateRequiredJob([{ ...job, conclusion: 'failure' }], owner[0]),
      /ci-receipt:/
    );
  }
});

test('[#169] three Windows integration partitions cover every test exactly once', () => {
  const files = {
    'test/integration/ordinary.test.mjs': '1',
    'test/integration/owner-publication.test.mjs': '2',
    'test/integration/portable-ownership.test.mjs': '3',
  };
  const baseline = laneInventory(files, 'integration', 'Windows'),
    publications = laneInventory(files, 'owner-publication', 'Windows'),
    composition = laneInventory(files, 'portable-ownership', 'Windows');
  assert.deepEqual(baseline, { 'test/integration/ordinary.test.mjs': '1' });
  assert.deepEqual(composition, { 'test/integration/portable-ownership.test.mjs': '3' });
  assert.deepEqual({ ...baseline, ...publications, ...composition }, files);
  assert.equal(
    Object.keys(baseline).length +
      Object.keys(publications).length +
      Object.keys(composition).length,
    3
  );
  assert.deepEqual(laneInventory(files, 'integration', 'Linux'), files);
  assert.deepEqual(laneInventory(files, 'integration', 'macOS'), files);
});
test('[#169] each Windows runtime requires a separately successful portable ownership worker', () => {
  for (const node of ['24', '26', 'current']) {
    const matches = workers().filter(
      (w) =>
        w.runnerOS === 'Windows' && w.matrixNode === node && w.lanes.includes('portable-ownership')
    );
    assert.equal(matches.length, 1);
    const worker = matches[0],
      job = {
        name: worker.name,
        status: 'completed',
        conclusion: 'success',
        steps: [{ name: 'Verify tests: portable-ownership', conclusion: 'success' }],
      };
    assert.equal(validateRequiredJob([job], worker), true);
    assert.throws(() => validateRequiredJob([], worker), /ci-receipt:/);
    assert.throws(
      () => validateRequiredJob([{ ...job, conclusion: 'failure' }], worker),
      /ci-receipt:/
    );
    assert.throws(
      () =>
        validateRequiredJob(
          [{ ...job, steps: [{ name: 'Verify tests: integration', conclusion: 'success' }] }],
          worker
        ),
      /ci-receipt:/
    );
  }
});
test('[#169] portable composition receipts refuse substituted commands and inventories', () => {
  const want = {
    ...expected,
    runnerOS: 'Windows',
    jobKey: 'portable-ownership-24-windows-latest',
    lane: 'portable-ownership',
    inventory: { 'test/integration/portable-ownership.test.mjs': '3' },
    log,
  };
  const record = {
    ...receipt(),
    ...want,
    platform: 'win32',
    command: ['node', '--test', 'test/integration/portable-ownership.test.mjs'],
  };
  assert.equal(validateLaneReceipt(record, want), true);
  assert.throws(() => validateLaneReceipt({ ...record, inventory: {} }, want), /ci-receipt:/);
  assert.throws(
    () => validateLaneReceipt({ ...record, command: ['npm', 'run', 'test:integration'] }, want),
    /ci-receipt:/
  );
});
