// @story #223
// cspell:ignore aipr
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { load as loadYaml } from 'js-yaml';
import { resolveVerificationScope } from '../../scripts/ci/verification-scope.mjs';
import { projectReceiptScope } from '../../scripts/ci/verify-project-receipts.mjs';
import { parseReceiptArguments } from '../../scripts/ci/verify-receipts.mjs';

const workflows = new URL('../../.github/workflows/', import.meta.url);
const disabled = (job) => job.if === false || job.if === '${{ false }}';
function runners(job) {
  if (disabled(job)) return [];
  const runner = job['runs-on'];
  if (runner === '${{ matrix.os }}') {
    const os = job.strategy.matrix.os;
    return os === '${{ fromJSON(needs.scope.outputs.os) }}'
      ? ['ubuntu-latest', 'macos-latest']
      : os;
  }
  return Array.isArray(runner) ? runner : [runner];
}

test('[#223] every branch and event keeps Windows deferred, including explicit all input', () => {
  for (const eventName of ['push', 'pull_request', 'workflow_dispatch'])
    for (const branch of [
      'trunk',
      'feature/child/141',
      'codex/aipr-journal-refactoring',
      'new-branch',
    ])
      for (const requestedScope of ['all', 'linux-macos'])
        assert.equal(
          resolveVerificationScope({ eventName, branch, requestedScope }),
          'linux-macos'
        );
  for (const branch of ['HEAD', 'trunk', 'codex/aipr-journal-refactoring'])
    assert.equal(projectReceiptScope(branch), 'linux-macos');
  assert.equal(parseReceiptArguments([]).scope, 'linux-macos');
});

test('[#223] no enabled job in any actual workflow can allocate a Windows runner', () => {
  const seen = [];
  for (const name of readdirSync(workflows).filter((name) => /\.ya?ml$/.test(name))) {
    const workflow = loadYaml(readFileSync(new URL(name, workflows), 'utf8'));
    for (const [key, job] of Object.entries(workflow.jobs)) {
      for (const runner of runners(job)) {
        assert.equal(typeof runner, 'string', `${name}/${key}: unresolved runner`);
        assert.doesNotMatch(runner, /windows/i, `${name}/${key}`);
      }
      seen.push(`${name}/${key}`);
    }
  }
  assert.ok(seen.length > 10, 'enumerate the complete workflow inventory');
});

test('[#223] dispatch cannot opt into Windows and all POSIX CI and installed lanes remain', () => {
  for (const name of ['ci.yml', 'installed-portable-journeys.yml']) {
    const workflow = loadYaml(readFileSync(new URL(name, workflows), 'utf8'));
    const input = workflow.on.workflow_dispatch.inputs.verification_scope;
    assert.equal(input.default, 'linux-macos');
    assert.deepEqual(input.options, ['linux-macos']);
  }
  const ci = loadYaml(readFileSync(new URL('ci.yml', workflows), 'utf8'));
  assert.deepEqual(runners(ci.jobs['node-24']), ['ubuntu-latest', 'macos-latest']);
  assert.deepEqual(runners(ci.jobs['preferred-node']), ['ubuntu-latest', 'macos-latest']);
  assert.equal(ci.jobs['phase-2-boundary']['runs-on'], 'ubuntu-latest');
  for (const key of ['node-24', 'preferred-node'])
    for (const lane of ['fast', 'integration', 'mcp', 'packaging', 'smoke'])
      assert.ok(
        ci.jobs[key].steps.some((step) => step.run === `node scripts/ci/record-tests.mjs ${lane}`)
      );
  const installed = loadYaml(
    readFileSync(new URL('installed-portable-journeys.yml', workflows), 'utf8')
  );
  assert.deepEqual(installed.jobs.installed.strategy.matrix.node, ['24', '26']);
  assert.deepEqual(runners(installed.jobs.installed), ['ubuntu-latest', 'macos-latest']);
});
