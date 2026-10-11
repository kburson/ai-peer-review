// @story #202
import path from 'node:path';
import { realpathSync, lstatSync } from 'node:fs';
import { authorityGit, discoverAuthorityRepository } from '../git/repository.mjs';
import { withPrimaryAdmissionFence } from './primary-admission.mjs';
import { inspectReviewAuthority } from '../protocol/service.mjs';
import { preserveReviewHistory, releaseReviewHold } from './review-history.mjs';
import { historyUnavailable as refuse } from './review-history-snapshot.mjs';
import { resolvePrimaryAuthoritySync } from './primary-authority.mjs';
import { createIntegrationChecker } from './integration-contract-core.mjs';
function locate(cwd, target) {
  const location = discoverAuthorityRepository(cwd);
  if (location.root !== location.mainRoot || location.gitDir !== location.commonDir)
    refuse('History maintenance requires the physical primary checkout.');
  if (
    typeof target !== 'string' ||
    !path.isAbsolute(target) ||
    path.normalize(target) !== target ||
    realpathSync(target) !== target
  )
    refuse('Preservation target must be canonical and absolute.');
  const roots = authorityGit(location.root, ['worktree', 'list', '--porcelain', '-z'])
    .split('\0')
    .filter((x) => x.startsWith('worktree '))
    .map((x) => x.slice(9));
  let worktreeRoot;
  for (const root of roots) {
    const scratch = path.join(root, '.scratch/peer-review');
    const relative = path.relative(scratch, target);
    if (
      relative &&
      relative !== '..' &&
      !relative.startsWith('..' + path.sep) &&
      !path.isAbsolute(relative)
    ) {
      if (
        ['broker', 'runtimes', 'codex-hooks', 'claude-hooks', 'reviews'].includes(
          relative.split(path.sep)[0]
        ) &&
        relative.split(path.sep).length === 1
      )
        refuse('Reserved authority stores cannot be preserved as history.');
      if (
        ['broker', 'runtimes', 'codex-hooks', 'claude-hooks'].includes(relative.split(path.sep)[0])
      )
        refuse('Reserved authority stores cannot be preserved as history.');
      const member = discoverAuthorityRepository(realpathSync(root));
      if (member.root !== root || member.commonDir !== location.commonDir)
        refuse('History target crosses clone authority.');
      let parent = path.dirname(target);
      while (parent !== root) {
        if (
          !lstatSync(parent).isDirectory() ||
          lstatSync(parent).isSymbolicLink() ||
          realpathSync(parent) !== parent
        )
          refuse('Historical target traverses an unsafe parent.');
        parent = path.dirname(parent);
      }
      worktreeRoot = root;
      break;
    }
  }
  if (!worktreeRoot) refuse('History target is outside this clone’s review scratch.');
  return { ...location, worktreeRoot };
}
export function createReviewHistoryMaintenance({ admit, packageRoot, home }) {
  const operation =
    (kind) =>
    async ({ cwd = process.cwd(), target, reason, dryRun = false } = {}) => {
      await admit();
      const location = locate(cwd, target);
      return withPrimaryAdmissionFence({ commonDir: location.commonDir, dryRun }, async () => {
        await admit();
        const fresh = locate(cwd, target);
        if (fresh.worktreeRoot !== location.worktreeRoot || fresh.commonDir !== location.commonDir)
          refuse('History membership changed.');
        if (kind === 'hold') {
          const state = inspectReviewAuthority(target).state;
          if (state.protocol.startup.context.repository_root !== location.worktreeRoot)
            refuse('Held review belongs to another worktree.');
        }
        if (kind === 'release') {
          const primary = resolvePrimaryAuthoritySync({ cwd });
          createIntegrationChecker({ packageRoot, home }).check(primary, { primaryOnly: true });
          return releaseReviewHold(location.commonDir, target, { dryRun });
        }
        return preserveReviewHistory({
          commonDir: location.commonDir,
          worktreeRoot: location.worktreeRoot,
          target,
          kind,
          reason,
          dryRun,
        });
      });
    };
  return Object.freeze({
    preserveHistory: operation('history'),
    holdReview: operation('hold'),
    releaseReview: operation('release'),
  });
}
