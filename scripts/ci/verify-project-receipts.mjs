// @story #212
// @story #215
// Native project gate: exact approved POSIX refs; all-platform proof elsewhere.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { resolveVerificationScope, POSIX_REPAIR_SOURCE_BRANCHES } from './verification-scope.mjs';
import { verifyCloudReceipts } from './verify-receipts.mjs';

const cumulativeSourceBranches = Object.freeze({
  141: 'feature/child/141',
  171: 'codex/171-fresh-continuation',
  191: 'codex/171-fresh-continuation',
  ...POSIX_REPAIR_SOURCE_BRANCHES,
});

export function projectReceiptScope(branch, context = {}) {
  // AITM Test uses a detached worktree and supplies its issue number. That
  // context only selects the approved request; it cannot supply CI evidence.
  // Require both real source refs to bind this request to the published source.
  // The cumulative continuation has its own exact issue and source branch pair.
  if (
    branch === 'HEAD' &&
    ([190, 212].includes(context.issueNumber) ||
      (typeof context.sourceBranch === 'string' &&
        context.sourceBranch === cumulativeSourceBranches[context.issueNumber])) &&
    /^[a-f0-9]{40}$/.test(context.sourceHead ?? '') &&
    context.sourceHead === context.branchHead &&
    context.sourceHead === context.publishedHead
  )
    return 'linux-macos';
  return resolveVerificationScope({
    eventName: 'push',
    branch,
    sourceRepository: 'kburson/ai-peer-review',
    refType: 'branch',
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error('usage: verify-project-receipts');
  const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    encoding: 'utf8',
  }).trim();
  const context = { issueNumber: Number(process.env.AITM_TEST_ISSUE_NUMBER) };
  if (
    branch === 'HEAD' &&
    ([190, 212].includes(context.issueNumber) ||
      Object.hasOwn(cumulativeSourceBranches, context.issueNumber))
  ) {
    const ref = (name) => {
      try {
        return execFileSync('git', ['rev-parse', '--verify', name], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }).trim();
      } catch {
        return null; // Missing or unreadable refs never request the exception.
      }
    };
    context.sourceBranch =
      cumulativeSourceBranches[context.issueNumber] ?? 'codex/190-installed-journeys';
    context.sourceHead = ref('HEAD');
    context.branchHead = ref('refs/heads/' + context.sourceBranch);
    context.publishedHead = ref('refs/remotes/origin/' + context.sourceBranch);
  }
  console.log(
    JSON.stringify(verifyCloudReceipts({ scope: projectReceiptScope(branch, context) }), null, 2)
  );
}
