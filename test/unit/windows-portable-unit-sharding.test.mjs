// @story #187
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifySuiteFiles } from '../helpers/suite-plan.mjs';
const discovered = [
  'test/unit/ordinary.test.mjs',
  'test/unit/runtime-selection.test.mjs',
  'test/unit/portable-authority-fences.test.mjs',
  'test/unit/storage-protection.test.mjs',
  'test/unit/ownership-election.test.mjs',
  'test/unit/portable-identity.test.mjs',
  'test/unit/portable-new-consumer.test.mjs',
];
test('[#187] four Windows workers cover every portable unit file once with one runtime case group each', () => {
  const plan = classifySuiteFiles(discovered);
  const shards = plan.windowsPortableShards ?? [];
  assert.equal(
    shards.length,
    4,
    'serial aggregate is insufficient; require four independent plans'
  );
  const files = shards.flatMap((shard) => shard.files);
  assert.equal(new Set(files).size, files.length, 'no duplicate shard executions');
  for (const file of discovered.filter(
    (file) =>
      file !== 'test/unit/ordinary.test.mjs' && file !== 'test/unit/runtime-selection.test.mjs'
  ))
    assert.equal(files.filter((candidate) => candidate === file).length, 1, file);
  assert.equal(files.includes('test/unit/runtime-selection.test.mjs'), false);
  assert.equal(
    files.filter((file) => file.startsWith('test/unit/runtime-selection-cases/')).length,
    4
  );
  for (const shard of shards)
    assert.equal(
      shard.files.filter((file) => file.startsWith('test/unit/runtime-selection-cases/')).length,
      1
    );
});

import { readFileSync } from 'node:fs';
import { runtimeCaseRecords, runtimeTestProgram } from '../helpers/runtime-case-coverage.mjs';
test('[#187] independent runtime case modules preserve all original assertions and aggregate coverage', () => {
  const baseline = JSON.parse(readFileSync('test/unit/runtime-selection-cases/baseline.json'));
  assert.equal(baseline.records.length, 23);
  const groups = ['selection', 'authority', 'storage', 'identity'];
  const aggregate = runtimeTestProgram(
    readFileSync('test/unit/runtime-selection.test.mjs', 'utf8')
  );
  const imports = aggregate.body
    .filter((node) => node.type === 'ImportDeclaration')
    .map((node) => node.source.value);
  const expected = groups.map((group) => './runtime-selection-cases/' + group + '.mjs');
  assert.deepEqual(
    imports.sort(),
    expected.sort(),
    'declared aggregate must reach every group exactly once'
  );
  const records = groups
    .flatMap((group) => {
      const file = 'test/unit/runtime-selection-cases/' + group + '.mjs';
      return runtimeCaseRecords(readFileSync(file, 'utf8'), file);
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  assert.equal(new Set(records.map((record) => record.name)).size, records.length);
  assert.deepEqual(records, baseline.records, 'every original assertion callback is preserved');
});

import { mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
function runnerFixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'apr-unit-shards-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, 'test/helpers'), { recursive: true });
  mkdirSync(path.join(root, 'test/unit/runtime-selection-cases'), { recursive: true });
  for (const file of ['run-suite.mjs', 'suite-plan.mjs', 'run-windows-fast.mjs'])
    cpSync('test/helpers/' + file, path.join(root, 'test/helpers', file));
  const counter = path.join(root, 'executions.txt');
  const body = (name) =>
    "import test from 'node:test';import fs from 'node:fs';test('" +
    name +
    "',()=>fs.appendFileSync(" +
    JSON.stringify(counter) +
    ", '" +
    name +
    "\\n'));\n";
  writeFileSync(path.join(root, 'test/unit/ordinary.test.mjs'), body('ordinary'));
  writeFileSync(path.join(root, 'test/unit/portable-new-consumer.test.mjs'), body('portable'));
  writeFileSync(
    path.join(root, 'test/unit/runtime-selection.test.mjs'),
    "throw Error('delegated aggregate accidentally executed');\n"
  );
  for (const group of ['selection', 'authority', 'storage', 'identity'])
    writeFileSync(
      path.join(root, 'test/unit/runtime-selection-cases', group + '.mjs'),
      body(group)
    );
  const env = { ...process.env, CI: 'true', GITHUB_ACTIONS: 'true' };
  delete env.NODE_TEST_CONTEXT;
  const run = (args) =>
    spawnSync(process.execPath, ['test/helpers/run-suite.mjs', 'unit', ...args], {
      cwd: root,
      env,
      encoding: 'utf8',
      timeout: 10000,
    });
  return { root, counter, run };
}
test('[#187] actual baseline and four independent runner invocations execute each disposable case once', (t) => {
  const fixture = runnerFixture(t);
  for (const args of [
    ['--exclude-portable-unit'],
    ...['selection', 'authority', 'storage', 'identity'].map((group) => [
      '--portable-unit-shard',
      group,
    ]),
  ]) {
    const result = fixture.run(args);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  }
  const actual = readFileSync(fixture.counter, 'utf8').trim().split('\n').sort();
  assert.deepEqual(
    actual,
    ['ordinary', 'portable', 'selection', 'authority', 'storage', 'identity'].sort()
  );
});
test('[#187] a failed shard propagates failure and selectors refuse unknown or incomplete groups', (t) => {
  const fixture = runnerFixture(t);
  for (const args of [
    ['--portable-unit-shard'],
    ['--portable-unit-shard', 'foreign'],
    ['--exclude-portable-unit', '--portable-unit-shard', 'identity'],
  ])
    assert.notEqual(fixture.run(args).status, 0, JSON.stringify(args));
  writeFileSync(
    path.join(fixture.root, 'test/unit/runtime-selection-cases/identity.mjs'),
    "throw Error('actual shard failure');\n"
  );
  const result = fixture.run(['--portable-unit-shard', 'identity']);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /actual shard failure/);
});

import { workers, verificationLanes } from '../../scripts/ci/verify-receipts.mjs';
import { laneCommand, laneInventory, validateRequiredJob } from '../../scripts/ci/receipt.mjs';
test('[#187] every Windows runtime requires all four independent portable unit receipt workers', () => {
  const declared = workers();
  const shards = declared.filter((worker) => worker.key.startsWith('portable-unit-'));
  assert.equal(
    shards.length,
    12,
    'baseline success cannot substitute independent portable unit jobs'
  );
  assert.equal(declared.length, 37);
  assert.equal(
    declared.reduce((count, worker) => count + worker.lanes.length, 0),
    77
  );
  const jobs = declared.map((worker) => ({
    name: worker.name,
    status: 'completed',
    conclusion: 'success',
    steps: worker.lanes.map((lane) => ({ name: 'Verify tests: ' + lane, conclusion: 'success' })),
  }));
  for (const worker of shards) {
    assert.equal(validateRequiredJob(jobs, worker), true);
    assert.throws(
      () =>
        validateRequiredJob(
          jobs.filter((job) => job.name !== worker.name),
          worker
        ),
      /job/
    );
    assert.throws(
      () =>
        validateRequiredJob(
          jobs.map((job) => (job.name === worker.name ? { ...job, conclusion: 'failure' } : job)),
          worker
        ),
      /job/
    );
    assert.throws(
      () =>
        validateRequiredJob(
          jobs.map((job) => (job.name === worker.name ? { ...job, steps: [] } : job)),
          worker
        ),
      /step/
    );
  }
});
test('[#187] Windows baseline and four shard command inventories cover active cases without duplication', () => {
  assert.deepEqual(laneCommand('fast', 'Windows'), ['node', 'test/helpers/run-windows-fast.mjs']);
  const files = Object.fromEntries(
    [
      ...discovered,
      'test/golden/example.test.mjs',
      ...['selection', 'authority', 'storage', 'identity'].map(
        (group) => 'test/unit/runtime-selection-cases/' + group + '.mjs'
      ),
    ].map((file) => [file, 'fixture hash'])
  );
  const baseline = laneInventory(files, 'fast', 'Windows');
  const partitions = ['selection', 'authority', 'storage', 'identity'].map((group) => {
    assert.deepEqual(laneCommand('portable-unit-' + group, 'Windows'), [
      'node',
      'test/helpers/run-suite.mjs',
      'unit',
      '--portable-unit-shard',
      group,
    ]);
    return laneInventory(files, 'portable-unit-' + group, 'Windows');
  });
  const executed = [baseline, ...partitions].flatMap((inventory) => Object.keys(inventory));
  assert.equal(new Set(executed).size, executed.length);
  assert.deepEqual(
    executed.sort(),
    Object.keys(files)
      .filter((file) => file !== 'test/unit/runtime-selection.test.mjs')
      .sort()
  );
});

import { load as loadYaml } from 'js-yaml';
test('[#187] hosted CI runs all four portable unit groups on independent bounded Windows jobs', () => {
  const workflow = loadYaml(readFileSync('.github/workflows/ci.yml', 'utf8'));
  const job = workflow.jobs['portable-units'];
  assert.ok(job, 'unit partitions need independent machines, not more processes on one host');
  assert.equal(job['runs-on'], 'windows-latest');
  assert.equal(job.strategy['max-parallel'], 4);
  assert.deepEqual(job.strategy.matrix.node, ['24', '26', 'current']);
  assert.deepEqual(job.strategy.matrix.group, ['selection', 'authority', 'storage', 'identity']);
  assert.ok(
    job.steps.some(
      (step) =>
        step.name === 'Verify tests: portable-unit-${{ matrix.group }}' &&
        step.run === 'node scripts/ci/record-tests.mjs portable-unit-${{ matrix.group }}'
    )
  );
  assert.ok(
    job.steps.some(
      (step) =>
        step.uses === 'actions/upload-artifact@v7' &&
        step.if === 'always()' &&
        step.with['if-no-files-found'] === 'error'
    )
  );
});

test('[#187] actual Windows baseline executes ordinary and golden coverage and propagates unit failure', (t) => {
  const fixture = runnerFixture(t);
  mkdirSync(path.join(fixture.root, 'test/golden'), { recursive: true });
  writeFileSync(
    path.join(fixture.root, 'test/golden/example.test.mjs'),
    "import test from 'node:test';import fs from 'node:fs';test('golden',()=>fs.appendFileSync(" +
      JSON.stringify(fixture.counter) +
      ", 'golden\\n'));\n"
  );
  const env = { ...process.env, CI: 'true', GITHUB_ACTIONS: 'true' };
  delete env.NODE_TEST_CONTEXT;
  const run = () =>
    spawnSync(process.execPath, ['test/helpers/run-windows-fast.mjs'], {
      cwd: fixture.root,
      env,
      encoding: 'utf8',
      timeout: 10000,
    });
  const first = run();
  assert.equal(first.status, 0, first.stdout + first.stderr);
  assert.deepEqual(readFileSync(fixture.counter, 'utf8').trim().split('\n').sort(), [
    'golden',
    'ordinary',
  ]);
  writeFileSync(
    path.join(fixture.root, 'test/unit/ordinary.test.mjs'),
    "throw Error('actual baseline failure');\n"
  );
  const failure = run();
  assert.notEqual(failure.status, 0);
  assert.match(failure.stdout + failure.stderr, /actual baseline failure/);
  assert.deepEqual(
    readFileSync(fixture.counter, 'utf8').trim().split('\n').sort(),
    ['golden', 'ordinary'],
    'golden must not run after unit failure'
  );
});

test('[#187] fast verification includes every unit shard while slow verification retains every other lane', () => {
  assert.deepEqual(
    verificationLanes('fast').sort(),
    [
      'fast',
      'portable-unit-selection',
      'portable-unit-authority',
      'portable-unit-storage',
      'portable-unit-identity',
    ].sort()
  );
  const fast = verificationLanes('fast'),
    slow = verificationLanes('slow'),
    all = verificationLanes('all');
  assert.equal(
    fast.some((lane) => slow.includes(lane)),
    false
  );
  assert.deepEqual([...fast, ...slow].sort(), all.slice().sort());
  assert.throws(() => verificationLanes('partial'), /mode/);
});

test('[#187] preserved-case inspection detects modified assertions, changed generated bindings and duplicate registrations', () => {
  const file = 'test/unit/runtime-selection-cases/selection.mjs';
  const original = "test('case',()=>assert.equal(1,1));";
  const changed = "test('case',()=>assert.equal(1,2));";
  assert.notDeepEqual(runtimeCaseRecords(original, file), runtimeCaseRecords(changed, file));
  const generated = (lookup) =>
    "for (const [name,lookup] of [['case'," +
    lookup +
    ']]) {test(name,()=>assert.equal(lookup,1));}';
  assert.notDeepEqual(
    runtimeCaseRecords(generated(1), file),
    runtimeCaseRecords(generated(2), file)
  );
  assert.throws(() => runtimeCaseRecords(original + original, file), /duplicate/);
  assert.throws(() => runtimeCaseRecords('test(unresolved,()=>{});', file), /unresolved/);
});
