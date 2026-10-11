// @story #202
import path from 'node:path';
import { realpathSync, lstatSync, readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { authorityGit, discoverAuthorityRepository } from '../git/repository.mjs';
import { isHistoryRegistrationRelative } from './review-history-ancestry.mjs';
import { validRegistrationShape } from '../broker/registry.mjs';
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
        ['broker', 'runtimes', 'codex-hooks', 'claude-hooks'].includes(
          relative.split(path.sep)[0]
        ) &&
        !isHistoryRegistrationRelative(relative)
      )
        refuse('Reserved authority stores cannot be preserved as history.');
      const parts = relative.split(path.sep);
      const registration = isHistoryRegistrationRelative(relative);
      if (!registration && parts.length !== 1 && !(parts.length === 2 && parts[0] === 'reviews'))
        refuse('Preserve a whole inventory unit, never a partial review.');
      const status = lstatSync(target);
      if (registration) {
        if (!status.isFile() || status.size > 16384)
          refuse('Historical registration must be a bounded ordinary file.');
        let record;
        try {
          record = JSON.parse(readFileSync(target, 'utf8'));
        } catch {
          refuse('Historical registration cannot be read.');
        }
        if (
          !validRegistrationShape(record) ||
          path.basename(target) !== record.review_id + '.json' ||
          typeof record.workspace !== 'string' ||
          !path.isAbsolute(record.workspace) ||
          typeof record.project_root !== 'string' ||
          !path.isAbsolute(record.project_root)
        )
          refuse('Historical registration is outside its closed schema.');
      } else if (!status.isDirectory())
        refuse('Preservation requires a whole review or historical container.');
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
export function createReviewHistoryMaintenance({ admit, packageRoot, home, admission }) {
  if (typeof admission?.run !== 'function' || typeof admission?.assert !== 'function')
    throw new TypeError('Explicit primary admission ports required.');
  const operation =
    (kind) =>
    async ({ cwd = process.cwd(), target, reason, dryRun = false, signal, deadline } = {}) => {
      const original = Object.freeze({
        signal: signal ?? new AbortController().signal,
        deadline: deadline ?? performance.now() + 30000,
      });
      await admit(original);
      const location = locate(cwd, target);
      return admission.run(
        { commonDir: location.commonDir, dryRun, ...original },
        async (fence, context) => {
          await admit(context);
          await admission.assert(fence, context);
          const fresh = locate(cwd, target);
          if (
            fresh.worktreeRoot !== location.worktreeRoot ||
            fresh.commonDir !== location.commonDir
          )
            refuse('History membership changed.');
          if (
            kind !== 'history' &&
            isHistoryRegistrationRelative(
              path.relative(path.join(location.worktreeRoot, '.scratch/peer-review'), target)
            )
          )
            refuse('Historical registrations cannot hold or release a current review.');
          if (kind === 'hold') {
            const state = inspectReviewAuthority(target).state;
            if (state.protocol.startup.context.repository_root !== location.worktreeRoot)
              refuse('Held review belongs to another worktree.');
          }
          if (kind === 'release') {
            const primary = await resolvePrimaryAuthoritySync({ cwd, ...context });
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
        }
      );
    };
  return Object.freeze({
    preserveHistory: operation('history'),
    holdReview: operation('hold'),
    releaseReview: operation('release'),
  });
}
