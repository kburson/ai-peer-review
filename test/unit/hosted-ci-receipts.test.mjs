// @story #198
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { load as loadYaml } from 'js-yaml';
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

// @story #212
// These tests catch a missing standalone Windows gate, wrong PR head branch,
// manual reactivation of Windows, and dropped POSIX/runtime matrix coverage.
function expandedWorkers(workflow, scope) {
  const output = [];
  for (const [key, job] of Object.entries(workflow.jobs)) {
    if (job.if && job.if === "needs.scope.outputs.scope == 'all'" && scope !== 'all') continue;
    // The optional provider probe is separately authorized and disabled here.
    if (key === 'live-provider-optional') continue;
    const matrix = job.strategy?.matrix ?? {};
    const axes = Object.entries(matrix).filter(([name]) => name !== 'include');
    let rows = [{}];
    for (const [name, raw] of axes) {
      const values =
        raw === '${{ fromJSON(needs.scope.outputs.os) }}'
          ? scope === 'linux-macos'
            ? ['ubuntu-latest', 'macos-latest']
            : ['ubuntu-latest', 'macos-latest', 'windows-latest']
          : raw;
      assert.ok(Array.isArray(values), `unsupported matrix ${key}/${name}`);
      rows = rows.flatMap((row) => values.map((value) => ({ ...row, [name]: value })));
    }
    if (matrix.include) rows = matrix.include;
    for (const row of rows)
      output.push({
        key,
        os: job['runs-on'] === '${{ matrix.os }}' ? row.os : job['runs-on'],
        node: String(row.node ?? job.env?.APR_CI_MATRIX_NODE ?? ''),
      });
  }
  return output;
}

test('[#190] delivery-parent events schedule POSIX workers without reactivating Windows', async () => {
  const { resolveVerificationScope } = await import('../../scripts/ci/verification-scope.mjs');
  const { projectReceiptScope } = await import('../../scripts/ci/verify-project-receipts.mjs');
  const ci = loadYaml(
    readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8')
  );
  const installed = loadYaml(
    readFileSync(
      new URL('../../.github/workflows/installed-portable-journeys.yml', import.meta.url),
      'utf8'
    )
  );
  for (const eventName of ['push', 'pull_request', 'workflow_dispatch']) {
    const scope = resolveVerificationScope({
      eventName,
      branch: 'codex/171-portable-consumers',
      sourceRepository: 'kburson/ai-peer-review',
      refType: 'branch',
      requestedScope: 'all',
    });
    assert.equal(scope, 'linux-macos');
    const jobs = expandedWorkers(ci, scope);
    assert.equal(
      jobs.some((job) => job.os === 'windows-latest'),
      false
    );
    assert.equal(
      jobs.filter((job) => ['node-24', 'preferred-node', 'phase-2-boundary'].includes(job.key))
        .length,
      7
    );
    const journeys = expandedWorkers(installed, scope).filter((job) => job.key === 'installed');
    assert.deepEqual(journeys.map((job) => `${job.node}/${job.os}`).sort(), [
      '24/macos-latest',
      '24/ubuntu-latest',
      '26/macos-latest',
      '26/ubuntu-latest',
    ]);
  }
  assert.equal(projectReceiptScope('codex/171-portable-consumers'), 'linux-macos');
  for (const change of [
    { sourceRepository: 'someone/ai-peer-review' },
    { refType: 'tag' },
    { branch: 'codex/171-portable-consumers-extra' },
  ]) {
    assert.equal(
      resolveVerificationScope({
        eventName: 'push',
        branch: 'codex/171-portable-consumers',
        sourceRepository: 'kburson/ai-peer-review',
        refType: 'branch',
        ...change,
      }),
      'all'
    );
  }
});

test('[#212] event scope keeps #190 POSIX and ordinary branches all-platform', async () => {
  const { resolveVerificationScope, scopePlatforms } =
    await import('../../scripts/ci/verification-scope.mjs');
  for (const eventName of ['push', 'pull_request', 'workflow_dispatch']) {
    for (const requestedScope of ['all', 'linux-macos'])
      assert.equal(
        resolveVerificationScope({
          eventName,
          sourceRepository: 'kburson/ai-peer-review',
          refType: 'branch',
          branch: 'codex/190-installed-journeys',
          requestedScope,
        }),
        'linux-macos'
      );
    for (const branch of ['trunk', 'codex/other', 'codex/190-installed-journeys-extra'])
      assert.equal(resolveVerificationScope({ eventName, branch }), 'all');
  }
  assert.equal(
    resolveVerificationScope({
      eventName: 'workflow_dispatch',
      branch: 'trunk',
      requestedScope: 'linux-macos',
    }),
    'linux-macos'
  );
  assert.equal(
    resolveVerificationScope({ eventName: 'push', branch: 'trunk', requestedScope: 'linux-macos' }),
    'all'
  );
  for (const change of [
    { eventName: 'pull_request_target' },
    { branch: '' },
    { requestedScope: 'posix' },
  ])
    assert.throws(() =>
      resolveVerificationScope({ eventName: 'push', branch: 'trunk', ...change })
    );
  assert.deepEqual(scopePlatforms('linux-macos'), ['ubuntu-latest', 'macos-latest']);
  assert.deepEqual(scopePlatforms('all'), ['ubuntu-latest', 'macos-latest', 'windows-latest']);
  assert.throws(() => scopePlatforms('posix'));
});

test('[#212] actual workflow expansion gates every Windows job before scheduling', async () => {
  const { resolveVerificationScope } = await import('../../scripts/ci/verification-scope.mjs');
  const ci = loadYaml(
    readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8')
  );
  const installed = loadYaml(
    readFileSync(
      new URL('../../.github/workflows/installed-portable-journeys.yml', import.meta.url),
      'utf8'
    )
  );
  for (const workflow of [ci, installed]) {
    assert.ok(workflow.jobs.scope);
    assert.equal(workflow.jobs.scope['runs-on'], 'ubuntu-latest');
    assert.equal(workflow.on.workflow_dispatch.inputs.verification_scope.default, 'all');
    assert.deepEqual(workflow.on.workflow_dispatch.inputs.verification_scope.options, [
      'all',
      'linux-macos',
    ]);
    const select = workflow.jobs.scope.steps.find((step) => step.id === 'selected');
    assert.equal(select.run, 'node scripts/ci/verification-scope.mjs');
    assert.equal(select.env.APR_CI_EVENT_NAME, '${{ github.event_name }}');
    assert.equal(select.env.APR_CI_SOURCE_BRANCH, '${{ github.head_ref || github.ref_name }}');
    assert.equal(select.env.APR_CI_REQUESTED_SCOPE, "${{ inputs.verification_scope || 'all' }}");
  }
  for (const eventName of ['push', 'pull_request', 'workflow_dispatch']) {
    const scope = resolveVerificationScope({
      eventName,
      branch: 'codex/190-installed-journeys',
      sourceRepository: 'kburson/ai-peer-review',
      refType: 'branch',
    });
    const jobs = expandedWorkers(ci, scope),
      journeys = expandedWorkers(installed, scope);
    assert.equal(
      jobs.some((job) => job.os === 'windows-latest'),
      false
    );
    assert.equal(
      journeys.some((job) => job.os === 'windows-latest'),
      false
    );
    assert.equal(
      jobs.filter((job) => ['node-24', 'preferred-node', 'phase-2-boundary'].includes(job.key))
        .length,
      7
    );
    assert.deepEqual(
      journeys
        .filter((job) => job.key === 'installed')
        .map((job) => `${job.node}/${job.os}`)
        .sort(),
      ['24/macos-latest', '24/ubuntu-latest', '26/macos-latest', '26/ubuntu-latest']
    );
  }
  assert.equal(expandedWorkers(ci, 'all').filter((job) => job.os === 'windows-latest').length, 30);
  assert.equal(
    expandedWorkers(installed, 'all').filter((job) => job.key === 'installed').length,
    6
  );
  for (const key of ['owner-publication-windows', 'portable-ownership-windows', 'portable-units']) {
    const unsafe = structuredClone(ci);
    delete unsafe.jobs[key].if;
    assert.ok(
      expandedWorkers(unsafe, 'linux-macos').some((job) => job.os === 'windows-latest'),
      key
    );
  }
  for (const [workflow, key] of [
    [ci, 'node-24'],
    [ci, 'preferred-node'],
    [ci, 'owner-publication-windows'],
    [ci, 'portable-ownership-windows'],
    [ci, 'portable-units'],
    [installed, 'installed'],
  ])
    assert.equal(workflow.jobs[key].needs, 'scope');
  assert.equal(installed.jobs.installed.strategy['max-parallel'], 4);
  assert.equal(installed.jobs.installed['timeout-minutes'], 20);
  assert.equal(ci.jobs['portable-units'].strategy['max-parallel'], 4);
});

test('[#212] scope job command publishes real selected scope and runner outputs', async () => {
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { spawnSync } = await import('node:child_process');
  const path = await import('node:path');
  const root = mkdtempSync(path.join(tmpdir(), 'apr-scope-'));
  try {
    for (const [branch, eventName, requestedScope, want] of [
      [
        'codex/190-installed-journeys',
        'pull_request',
        'all',
        'scope=linux-macos\nos=["ubuntu-latest","macos-latest"]\n',
      ],
      ['trunk', 'push', 'all', 'scope=all\nos=["ubuntu-latest","macos-latest","windows-latest"]\n'],
      [
        'trunk',
        'workflow_dispatch',
        'linux-macos',
        'scope=linux-macos\nos=["ubuntu-latest","macos-latest"]\n',
      ],
    ]) {
      const output = path.join(root, String(eventName));
      const result = spawnSync(process.execPath, ['scripts/ci/verification-scope.mjs'], {
        encoding: 'utf8',
        env: {
          ...process.env,
          GITHUB_OUTPUT: output,
          APR_CI_EVENT_NAME: eventName,
          APR_CI_SOURCE_BRANCH: branch,
          APR_CI_SOURCE_REPOSITORY: 'kburson/ai-peer-review',
          APR_CI_REF_TYPE: 'branch',
          APR_CI_REQUESTED_SCOPE: requestedScope,
        },
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(readFileSync(output, 'utf8'), want);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('[#212] native project policy selects scoped proof only on approved source branch', async () => {
  const { projectReceiptScope } = await import('../../scripts/ci/verify-project-receipts.mjs');
  const { workers } = await import('../../scripts/ci/verify-receipts.mjs');
  assert.equal(projectReceiptScope('codex/190-installed-journeys'), 'linux-macos');
  for (const branch of ['trunk', 'codex/other', 'HEAD']) {
    assert.equal(projectReceiptScope(branch), 'all');
    assert.equal(workers(projectReceiptScope(branch)).length, 37);
  }
  const config = JSON.parse(
    readFileSync(new URL('../../.ai-task-manager/task-tracker.json', import.meta.url), 'utf8')
  );
  const provider = config.verificationProvider;
  for (const steps of [provider.develop.iterationSteps, provider.test.steps]) {
    const tests = steps.filter((step) => step.kind === 'test');
    assert.equal(tests.length, 1);
    assert.equal(tests[0].command, 'node scripts/ci/verify-project-receipts.mjs');
    assert.equal(tests[0].classification, 'test-cloud-declared-platforms');
  }
  for (const coverage of provider.test.declaredCommandCoverage)
    assert.deepEqual(coverage.requires, ['test-cloud-declared-platforms']);
});

test('[#212] automatic deferral binds the canonical source repository and branch ref', async () => {
  const { resolveVerificationScope } = await import('../../scripts/ci/verification-scope.mjs');
  const own = {
    eventName: 'pull_request',
    branch: 'codex/190-installed-journeys',
    sourceRepository: 'kburson/ai-peer-review',
    refType: 'branch',
  };
  assert.equal(resolveVerificationScope(own), 'linux-macos');
  for (const context of [
    { ...own, sourceRepository: 'someone/ai-peer-review' },
    { ...own, eventName: 'workflow_dispatch', refType: 'tag' },
    { ...own, sourceRepository: undefined },
    { ...own, refType: undefined },
  ])
    assert.equal(resolveVerificationScope(context), 'all');
  assert.equal(
    resolveVerificationScope({
      ...own,
      eventName: 'workflow_dispatch',
      refType: 'tag',
      requestedScope: 'linux-macos',
    }),
    'linux-macos'
  );
  for (const filename of ['ci.yml', 'installed-portable-journeys.yml']) {
    const workflow = loadYaml(
      readFileSync(new URL('../../.github/workflows/' + filename, import.meta.url), 'utf8')
    );
    const env = workflow.jobs.scope.steps.find((step) => step.id === 'selected').env;
    assert.equal(
      env.APR_CI_SOURCE_REPOSITORY,
      '${{ github.event.pull_request.head.repo.full_name || github.repository }}'
    );
    assert.equal(env.APR_CI_REF_TYPE, '${{ github.ref_type }}');
  }
});

test('[#212] native detached verification retains only the exact approved issue source', async () => {
  const { projectReceiptScope } = await import('../../scripts/ci/verify-project-receipts.mjs');
  const head = 'a'.repeat(40);
  const context = { issueNumber: 212, sourceHead: head, branchHead: head, publishedHead: head };
  assert.equal(projectReceiptScope('HEAD', context), 'linux-macos');
  assert.equal(projectReceiptScope('HEAD', { ...context, issueNumber: 190 }), 'linux-macos');
  for (const changed of [
    { issueNumber: 213 },
    { issueNumber: undefined },
    { branchHead: 'b'.repeat(40) },
    { publishedHead: 'b'.repeat(40) },
    { sourceHead: undefined },
    { sourceHead: 'invalid' },
  ])
    assert.equal(projectReceiptScope('HEAD', { ...context, ...changed }), 'all');
  for (const branch of ['trunk', 'codex/other'])
    assert.equal(projectReceiptScope(branch, context), 'all');
});
