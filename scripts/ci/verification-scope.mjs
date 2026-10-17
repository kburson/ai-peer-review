// @story #212
// CI-only declared platform scope; runtime operation budgets are unrelated.
import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  // This is the human-approved #190 deferral, including its first push and PR.
  if (branch === 'codex/190-installed-journeys') return 'linux-macos';
  return eventName === 'workflow_dispatch' ? requestedScope : 'all';
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const scope = resolveVerificationScope({
    eventName: process.env.APR_CI_EVENT_NAME,
    branch: process.env.APR_CI_SOURCE_BRANCH,
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
