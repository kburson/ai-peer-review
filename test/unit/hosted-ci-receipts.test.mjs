// @story #198
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { validateReceipt, validateCIRun } from '../../scripts/ci/receipt-core.mjs';
const sha = '1'.repeat(40),
  tree = '2'.repeat(40),
  log = Buffer.from('actual test output\n');
const receipt = {
  schema: 'ai-peer-review.ci-command-receipt/v1',
  repository: 'kburson/ai-peer-review',
  sourceHead: sha,
  testedHead: sha,
  testedTree: tree,
  runId: '123',
  runAttempt: '1',
  job: 'node-24',
  platform: 'linux',
  node: '24.20.0',
  command: 'npm test',
  exitCode: 0,
  signal: null,
  logSha256: createHash('sha256').update(log).digest('hex'),
};
const expected = {
  sourceHead: sha,
  testedTree: tree,
  runId: '123',
  runAttempt: '1',
  job: 'node-24',
  platform: 'linux',
  node: '24',
  command: 'npm test',
};
test('receipt validation refuses stale source, wrong command and failed execution', () => {
  assert.doesNotThrow(() => validateReceipt(receipt, expected, log));
  for (const mutate of [
    (r) => (r.sourceHead = '3'.repeat(40)),
    (r) => (r.testedTree = '3'.repeat(40)),
    (r) => (r.command = 'npm run test:slow'),
    (r) => (r.exitCode = 1),
    (r) => (r.signal = 'SIGTERM'),
    (r) => (r.runId = '124'),
    (r) => (r.job = 'other'),
    (r) => (r.node = '26.0.0'),
    (r) => (r.logSha256 = '0'.repeat(64)),
  ]) {
    const bad = structuredClone(receipt);
    mutate(bad);
    assert.throws(() => validateReceipt(bad, expected, log));
  }
  assert.throws(() => validateReceipt(receipt, expected, Buffer.from('different output')));
});
test('full CI must succeed on exact PR head and actual required workers', () => {
  const run = {
    id: 123,
    run_attempt: 1,
    head_sha: sha,
    status: 'completed',
    conclusion: 'success',
    path: '.github/workflows/ci.yml',
    event: 'pull_request',
    repository: { full_name: 'kburson/ai-peer-review' },
  };
  const names = [
    'Node 24 / ubuntu-latest',
    'Node 24 / macos-latest',
    'Node 24 / windows-latest',
    'Node 26 / Ubuntu',
    'Node 26 / macos-latest',
    'Node 26 / windows-latest',
    'Node current / Ubuntu',
    'Node current / macos-latest',
    'Node current / windows-latest',
    'npm 11.8.0 / Node 24',
    'npm 12.0.2 / Node 26',
    'Phase 2 boundary',
  ];
  const jobs = {
    total_count: 12,
    jobs: names.map((name, i) => ({
      id: i + 1,
      name,
      run_id: 123,
      run_attempt: 1,
      status: 'completed',
      conclusion: 'success',
    })),
  };
  assert.doesNotThrow(() => validateCIRun(run, jobs, sha));
  for (const mutate of [
    (v) => (v.run.head_sha = '3'.repeat(40)),
    (v) => (v.run.conclusion = 'failure'),
    (v) => v.jobs.jobs.pop(),
    (v) => (v.jobs.jobs[0].conclusion = 'failure'),
    (v) => (v.jobs.jobs[0].name = v.jobs.jobs[1].name),
    (v) => (v.jobs.jobs[0].run_id = 124),
  ]) {
    const bad = structuredClone({ run, jobs });
    mutate(bad);
    assert.throws(() => validateCIRun(bad.run, bad.jobs, sha));
  }
});

test('workflow command coverage follows real receipt lanes and rejects dropped suite coverage', async () => {
  const { expandedCICommands } = await import('../helpers/ci-command-coverage.mjs');
  const recipes = { fast: ['test'], slow: ['run', 'test:slow'] };
  const scripts = {
    test: 'npm run test:unit && npm run test:golden',
    'test:slow': 'npm run test:integration && npm run test:mcp && npm run test:smoke',
  };
  const workflow =
    '      - run: node scripts/ci/run-receipt.mjs fast\n      - run: node scripts/ci/run-receipt.mjs slow\n';
  const commands = expandedCICommands(workflow, scripts, recipes);
  for (const command of [
    'npm test',
    'npm run test:unit',
    'npm run test:golden',
    'npm run test:integration',
    'npm run test:mcp',
    'npm run test:smoke',
  ])
    assert.ok(commands.has(command));
  const missing = expandedCICommands(
    workflow,
    { ...scripts, 'test:slow': 'npm run test:mcp && npm run test:smoke' },
    recipes
  );
  assert.equal(missing.has('npm run test:integration'), false);
  const noFast = expandedCICommands(
    '      - run: node scripts/ci/run-receipt.mjs slow\n',
    scripts,
    recipes
  );
  assert.equal(noFast.has('npm test'), false);
  assert.throws(
    () => expandedCICommands('      - run: npm test\n', { test: 'npm test' }, recipes),
    /cycle/
  );
});
