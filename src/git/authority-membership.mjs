// cspell:words gitdir commondir
// @story #187
// Shared physical membership validation; stock authority observations supply the Git output.
import { lstatSync, readFileSync, realpathSync as nodeRealpathSync } from 'node:fs';
import path from 'node:path';
import { AprError } from '../errors.mjs';
const realpathSync = process.platform === 'win32' ? nodeRealpathSync.native : nodeRealpathSync;
function outputPath(cwd, value) {
  const candidate = String(value).trim();
  return realpathSync(path.isAbsolute(candidate) ? candidate : path.resolve(cwd, candidate));
}
function authorityMembershipError(message) {
  return new AprError('APR_REPOSITORY_NOT_FOUND', message, {
    recovery: 'Inspect physical Git membership before retrying primary authority.',
  });
}
export function validateAuthorityMembership({ cwd, discovery, worktrees }) {
  const physicalCwd = realpathSync(cwd);
  const discovered = discovery.trim().split(/\r?\n/);
  if (discovered.length !== 3 || discovered.some((value) => !path.isAbsolute(value)))
    throw authorityMembershipError('Git returned incomplete physical membership paths.');
  const [root, gitDir, commonDir] = discovered.map((value) => outputPath(physicalCwd, value));
  if (physicalCwd !== root && !physicalCwd.startsWith(root + path.sep))
    throw authorityMembershipError('Caller is outside the physical worktree.');
  const marker = path.join(root, '.git');
  const metadata = lstatSync(marker);
  if (metadata.isSymbolicLink())
    throw authorityMembershipError('Symlinked Git worktree marker is unavailable authority.');
  if (metadata.isDirectory()) {
    if (realpathSync(marker) !== gitDir || gitDir !== commonDir)
      throw authorityMembershipError(
        'Git directory membership disagrees with the physical marker.'
      );
  } else if (metadata.isFile()) {
    const match = /^gitdir: (.+)\r?\n?$/.exec(readFileSync(marker, 'utf8'));
    if (!match || outputPath(root, match[1]) !== gitDir)
      throw authorityMembershipError('Git file membership disagrees with discovery.');
    if (gitDir !== commonDir) {
      const administrators = realpathSync(path.join(commonDir, 'worktrees'));
      if (
        path.dirname(gitDir) !== administrators ||
        outputPath(gitDir, readFileSync(path.join(gitDir, 'commondir'), 'utf8')) !== commonDir ||
        outputPath(gitDir, readFileSync(path.join(gitDir, 'gitdir'), 'utf8')) !==
          realpathSync(marker)
      )
        throw authorityMembershipError('Linked worktree administrative membership is invalid.');
    }
  } else
    throw authorityMembershipError('Git worktree marker is not an ordinary file or directory.');
  const records = worktrees.split('\0\0').filter(Boolean);
  const staleWorktrees = [];
  const roots = records.map((record, index) => {
    const field = record.split('\0').find((item) => item.startsWith('worktree '));
    if (!field || record.split('\0').includes('bare'))
      throw authorityMembershipError(
        'Bare or malformed worktree inventory cannot provide authority.'
      );
    const candidate = field.slice('worktree '.length);
    try {
      return realpathSync(candidate);
    } catch (cause) {
      if (cause.code !== 'ENOENT' || index === 0 || path.resolve(candidate) === root) throw cause;
      staleWorktrees.push(candidate);
      return null;
    }
  });
  if (
    (!roots.includes(root) && !(gitDir === commonDir && roots[0] === commonDir)) ||
    new Set(roots.filter(Boolean)).size !== roots.filter(Boolean).length
  )
    throw authorityMembershipError(
      'Physical worktree is absent or ambiguous in the clone inventory.'
    );
  return Object.freeze({
    root,
    gitDir,
    commonDir,
    mainRoot: roots[0] === commonDir ? null : roots[0],
    staleWorktrees: Object.freeze(staleWorktrees),
  });
}
