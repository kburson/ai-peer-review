// @story #202
import path from 'node:path';
import { createHash } from 'node:crypto';
import { lstatSync, realpathSync } from 'node:fs';
import { authorityGit, discoverAuthorityRepository } from '../git/repository.mjs';
import { historyUnavailable as refuse } from './review-history-snapshot.mjs';

// A byte-identical tree reached through replaced parents is not the recorded target.
export function reviewHistoryAncestry(commonDir, worktreeRoot, target) {
  try {
    const member = discoverAuthorityRepository(worktreeRoot);
    const roots = authorityGit(worktreeRoot, ['worktree', 'list', '--porcelain', '-z'])
      .split('\0')
      .filter((x) => x.startsWith('worktree '))
      .map((x) => x.slice(9));
    if (
      member.root !== worktreeRoot ||
      member.commonDir !== commonDir ||
      !roots.includes(worktreeRoot) ||
      realpathSync(target) !== target
    )
      refuse('Preserved target is no longer a canonical clone member.');
    const hash = createHash('sha256');
    let current = path.dirname(target);
    for (let depth = 0; depth < 128; depth++) {
      const s = lstatSync(current, { bigint: true });
      if (!s.isDirectory() || s.isSymbolicLink() || realpathSync(current) !== current)
        refuse('Preserved target traverses a replaced parent.');
      hash.update(
        JSON.stringify([current, String(s.dev), String(s.ino), String(s.mode), String(s.uid)])
      );
      if (current === worktreeRoot) return hash.digest('hex');
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
    refuse('Preserved ancestry exceeds its worktree boundary.');
  } catch (error) {
    if (error.code === 'APR_PRIMARY_AUTHORITY_UNAVAILABLE') throw error;
    refuse('Preserved ancestry or worktree membership cannot be verified.');
  }
}

export function isHistoryRegistrationRelative(relative) {
  const parts = relative.split(path.sep);
  return (
    parts.length === 3 &&
    parts[0] === 'broker' &&
    parts[1] === 'registrations' &&
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.json$/.test(parts[2])
  );
}
