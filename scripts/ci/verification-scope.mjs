// @story #223
// @story #212
// @story #215
// CI-only declared platform scope; runtime operation budgets are unrelated.
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Closed issue/ref bindings for the admitted #214 repair and its seven children.
export const POSIX_REPAIR_SOURCE_BRANCHES = Object.freeze({
  214: 'feature/child/141',
  215: 'feature/child/215',
  216: 'feature/child/216',
  217: 'feature/child/217',
  218: 'feature/child/218',
  219: 'feature/child/219',
  220: 'feature/child/220',
  221: 'feature/child/221',
});
export const PROCESS_SOURCE_CAPTURE_BRANCH = POSIX_REPAIR_SOURCE_BRANCHES[221];

// This selects capture transport only, never process-source approval authority.
export function resolveCaptureWorkflowContext(env, observedSourceHead) {
  if (
    env.GITHUB_ACTIONS !== 'true' ||
    env.RUNNER_ENVIRONMENT !== 'github-hosted' ||
    env.GITHUB_REPOSITORY !== 'kburson/ai-peer-review' ||
    env.GITHUB_WORKFLOW !== 'Process source conformance capture' ||
    !/^[1-9][0-9]*$/u.test(env.GITHUB_RUN_ID ?? '') ||
    !/^[1-9][0-9]*$/u.test(env.GITHUB_RUN_ATTEMPT ?? '') ||
    !['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME) ||
    !['Linux', 'macOS'].includes(env.RUNNER_OS)
  )
    throw Error('ci-capture-host-unavailable');
  if (
    env.GITHUB_REF_TYPE !== 'branch' ||
    env.GITHUB_REF_NAME !== PROCESS_SOURCE_CAPTURE_BRANCH ||
    env.GITHUB_REF !== 'refs/heads/' + PROCESS_SOURCE_CAPTURE_BRANCH
  )
    throw Error('ci-capture-branch-unavailable');
  if (!/^[a-f0-9]{40}$/u.test(env.GITHUB_SHA ?? '') || env.GITHUB_SHA !== observedSourceHead)
    throw Error('ci-capture-source-unavailable');
  return Object.freeze({
    scope: 'linux-macos',
    branch: PROCESS_SOURCE_CAPTURE_BRANCH,
    sourceHead: observedSourceHead,
  });
}

export function scopePlatforms(scope) {
  if (scope === 'all') return ['ubuntu-latest', 'macos-latest', 'windows-latest'];
  if (scope === 'linux-macos') return ['ubuntu-latest', 'macos-latest'];
  throw new Error('ci-scope: unsupported scope');
}

export function resolveVerificationScope({ eventName, branch, requestedScope = 'all' }) {
  scopePlatforms(requestedScope);
  if (!['push', 'pull_request', 'workflow_dispatch'].includes(eventName))
    throw new Error('ci-scope: unsupported event');
  if (typeof branch !== 'string' || !branch.trim())
    throw new Error('ci-scope: missing source branch');
  // #223: Windows support and CI are deferred on every source ref. Keep the
  // legacy `all` input parseable, but it cannot reactivate scheduling.
  // Repository/ref identity is still verified by the actual receipt consumer.
  return 'linux-macos';
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 1 || args[0] !== '--capture'))
    throw Error('usage: verification-scope [--capture]');
  const scope =
    args[0] === '--capture'
      ? resolveCaptureWorkflowContext(
          process.env,
          execFileSync('git', ['rev-parse', 'HEAD'], {
            encoding: 'utf8',
            timeout: 30000,
            stdio: ['ignore', 'pipe', 'pipe'],
          }).trim()
        ).scope
      : resolveVerificationScope({
          eventName: process.env.APR_CI_EVENT_NAME,
          branch: process.env.APR_CI_SOURCE_BRANCH,
          sourceRepository: process.env.APR_CI_SOURCE_REPOSITORY,
          refType: process.env.APR_CI_REF_TYPE,
          requestedScope: process.env.APR_CI_REQUESTED_SCOPE || 'all',
        });
  if (!process.env.GITHUB_OUTPUT) throw new Error('ci-scope: missing GitHub output');
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `scope=${scope}\nos=${JSON.stringify(scopePlatforms(scope))}\n`
  );
  console.log(
    JSON.stringify({ scope, windows: scope === 'all' ? 'required' : 'deferred; unverified' })
  );
}
