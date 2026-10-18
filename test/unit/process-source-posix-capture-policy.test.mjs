// @story #215
// Context fixtures test policy only; they grant no hosted or source-class authority.
import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveVerificationScope } from '../../scripts/ci/verification-scope.mjs';
import { projectReceiptScope } from '../../scripts/ci/verify-project-receipts.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const sources = [
  [214, 'feature/child/141'],
  [215, 'feature/child/215'],
  [216, 'feature/child/216'],
  [217, 'feature/child/217'],
  [218, 'feature/child/218'],
  [219, 'feature/child/219'],
  [220, 'feature/child/220'],
  [221, 'feature/child/221'],
];
const general = {
  sourceRepository: 'kburson/ai-peer-review',
  refType: 'branch',
};

// Missing exact branches would allocate the unsupported Windows matrix on first push.
for (const [, branch] of sources) {
  test(`canonical ${branch} requests only POSIX CI on every supported event`, () => {
    for (const eventName of ['push', 'pull_request', 'workflow_dispatch']) {
      assert.equal(resolveVerificationScope({ ...general, eventName, branch }), 'linux-macos');
      for (const changed of [
        { sourceRepository: 'foreign/ai-peer-review' },
        { refType: 'tag' },
        { branch: branch + '-lookalike' },
        { branch: 'prefix/' + branch },
      ]) {
        assert.equal(
          resolveVerificationScope({ ...general, eventName, branch, ...changed }),
          'all'
        );
      }
    }
  });
}

test('unrelated manual scope remains a CI request, without granting capture authority', () => {
  assert.equal(
    resolveVerificationScope({
      ...general,
      eventName: 'workflow_dispatch',
      branch: 'trunk',
      requestedScope: 'linux-macos',
    }),
    'linux-macos'
  );
  assert.equal(
    resolveVerificationScope({
      ...general,
      eventName: 'push',
      branch: 'trunk',
      requestedScope: 'linux-macos',
    }),
    'all'
  );
});

// A wrong/missing/stale pair must never turn a detached Test checkout into an exemption.
for (const [issueNumber, sourceBranch] of sources) {
  test(`detached #${issueNumber} requires its exact local and published source`, () => {
    const context = {
      issueNumber,
      sourceBranch,
      sourceHead: head,
      branchHead: head,
      publishedHead: head,
    };
    assert.equal(projectReceiptScope('HEAD', context), 'linux-macos');
    for (const changed of [
      { issueNumber: 213 },
      { sourceBranch: 'feature/child/999' },
      { sourceBranch: undefined },
      { sourceHead: 'malformed' },
      { sourceHead: 'a'.repeat(40) },
      { branchHead: 'b'.repeat(40) },
      { publishedHead: 'c'.repeat(40) },
      { publishedHead: null },
    ])
      assert.equal(projectReceiptScope('HEAD', { ...context, ...changed }), 'all');
  });
}

function context(changes = {}) {
  return {
    ...process.env,
    // Deliberately unrelated general scope: ignoring --capture would emit Windows.
    APR_CI_EVENT_NAME: 'push',
    APR_CI_SOURCE_BRANCH: 'trunk',
    APR_CI_SOURCE_REPOSITORY: 'kburson/ai-peer-review',
    APR_CI_REF_TYPE: 'branch',
    APR_CI_REQUESTED_SCOPE: 'all',
    GITHUB_ACTIONS: 'true',
    RUNNER_ENVIRONMENT: 'github-hosted',
    GITHUB_REPOSITORY: 'kburson/ai-peer-review',
    GITHUB_WORKFLOW: 'Process source conformance capture',
    GITHUB_RUN_ID: '999999999999999999',
    GITHUB_RUN_ATTEMPT: '1',
    GITHUB_EVENT_NAME: 'push',
    RUNNER_OS: 'Linux',
    GITHUB_REF_TYPE: 'branch',
    GITHUB_REF_NAME: 'feature/child/221',
    GITHUB_REF: 'refs/heads/feature/child/221',
    GITHUB_SHA: head,
    ...changes,
  };
}
function scopeCli(env, args = ['--capture']) {
  const dir = mkdtempSync(path.join(tmpdir(), 'apr-capture-policy-'));
  try {
    const output = path.join(dir, 'output');
    const run = spawnSync(process.execPath, ['scripts/ci/verification-scope.mjs', ...args], {
      cwd: root,
      encoding: 'utf8',
      timeout: 10000,
      env: { ...env, GITHUB_OUTPUT: output },
    });
    let text = '';
    try {
      text = readFileSync(output, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    return { ...run, output: text };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

for (const RUNNER_OS of ['Linux', 'macOS']) {
  for (const GITHUB_EVENT_NAME of ['push', 'workflow_dispatch']) {
    test(`capture CLI allocates POSIX only for ${RUNNER_OS} ${GITHUB_EVENT_NAME}`, () => {
      const run = scopeCli(context({ RUNNER_OS, GITHUB_EVENT_NAME }));
      assert.equal(run.status, 0, run.stderr);
      assert.equal(run.output, 'scope=linux-macos\nos=["ubuntu-latest","macos-latest"]\n');
    });
  }
}

const refusals = [
  ['non-Actions', { GITHUB_ACTIONS: 'false' }, 'host'],
  ['self-hosted', { RUNNER_ENVIRONMENT: 'self-hosted' }, 'host'],
  ['foreign repository', { GITHUB_REPOSITORY: 'foreign/ai-peer-review' }, 'host'],
  ['wrong workflow', { GITHUB_WORKFLOW: 'CI' }, 'host'],
  ['zero run', { GITHUB_RUN_ID: '0' }, 'host'],
  ['malformed attempt', { GITHUB_RUN_ATTEMPT: '1x' }, 'host'],
  ['zero attempt', { GITHUB_RUN_ATTEMPT: '0' }, 'host'],
  ['PR event', { GITHUB_EVENT_NAME: 'pull_request' }, 'host'],
  ['Windows', { RUNNER_OS: 'Windows' }, 'host'],
  ['tag', { GITHUB_REF_TYPE: 'tag' }, 'branch'],
  ['foreign branch', { GITHUB_REF_NAME: 'feature/child/215' }, 'branch'],
  ['suffix branch', { GITHUB_REF_NAME: 'feature/child/221-extra' }, 'branch'],
  ['full-ref mismatch', { GITHUB_REF: 'refs/tags/feature/child/221' }, 'branch'],
  ['malformed SHA', { GITHUB_SHA: 'no-source' }, 'source'],
  ['different checkout', { GITHUB_SHA: 'd'.repeat(40) }, 'source'],
];
for (const [label, changes, code] of refusals) {
  test(`capture CLI refuses ${label} before emitting a runner matrix`, () => {
    const run = scopeCli(context(changes));
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, new RegExp(`ci-capture-${code}-unavailable`));
    assert.equal(run.output, '');
  });
}
test('scope CLI refuses unknown options', () => {
  const run = scopeCli(context(), ['--unknown']);
  assert.notEqual(run.status, 0);
  assert.equal(run.output, '');
});

function captureHelper(env) {
  return spawnSync(process.execPath, ['test/helpers/process-source-ci-capture.mjs', 'capture'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 10000,
    env,
  });
}
test('valid capture context reaches missing private state without creating keys or changing the host', () => {
  const run = captureHelper(context());
  assert.equal(run.status, 1);
  assert.match(run.stderr, /ENOENT/);
});
for (const [label, changes, code] of refusals) {
  test(`capture helper refuses ${label} before any private-state access`, () => {
    const run = captureHelper(context(changes));
    assert.equal(run.status, 1);
    assert.match(run.stderr, new RegExp(`ci-capture-${code}-unavailable`));
    assert.doesNotMatch(run.stderr, /ENOENT/);
  });
}
