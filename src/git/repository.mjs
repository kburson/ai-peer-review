import { execFileSync as nodeExecFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';

import { resolveContainedPath } from '../collateral/paths.mjs';
import { AprError } from '../errors.mjs';

// cspell:ignore ACDMRTUXB
const CHANGE_FILTER = 'ACDMRTUXB';
const REGULAR_MODES = new Set(['100644', '100755']);

function gitError(code, message, recovery, details, cause) {
  const error = new AprError(code, message, { recovery, details });
  error.cause = cause;
  return error;
}

function outputPath(cwd, value) {
  const candidate = String(value).trim();
  return realpathSync(path.isAbsolute(candidate) ? candidate : path.resolve(cwd, candidate));
}

function lines(value) {
  return String(value).split(/\r?\n/).filter(Boolean).sort();
}

function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function createGitRepository({ execFileSync = nodeExecFileSync } = {}) {
  function run(cwd, args, { buffer = false, allowStatuses = [], code = 'APR_GIT_FAILED' } = {}) {
    try {
      return execFileSync('git', args, {
        cwd,
        encoding: buffer ? null : 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
      });
    } catch (cause) {
      if (allowStatuses.includes(cause?.status)) return null;
      throw gitError(
        code,
        `Git observation failed: git ${args.join(' ')}`,
        'Verify the repository and revision, then retry the peer-review command.',
        { argv: Object.freeze([...args]) },
        cause
      );
    }
  }

  function root(cwd) {
    const value = run(cwd, ['rev-parse', '--show-toplevel'], {
      code: 'APR_REPOSITORY_NOT_FOUND',
    });
    try {
      return outputPath(cwd, value);
    } catch (cause) {
      throw gitError(
        'APR_REPOSITORY_NOT_FOUND',
        'Git did not return a canonical repository root.',
        'Run the command inside a valid Git worktree.',
        { cwd: path.resolve(cwd) },
        cause
      );
    }
  }

  function commonDir(cwd) {
    const repositoryRoot = root(cwd);
    const value = run(repositoryRoot, ['rev-parse', '--git-common-dir']);
    return outputPath(repositoryRoot, value);
  }

  function gitPath(cwd, name) {
    const segments = typeof name === 'string' ? name.split(/[\\/]/) : [];
    if (
      typeof name === 'string' &&
      (path.isAbsolute(name) || segments.some((segment) => segment === '.' || segment === '..'))
    ) {
      throw new AprError(
        'APR_GIT_PATH_OUTSIDE_REPOSITORY',
        'Git metadata path escapes the common Git directory.',
        {
          recovery: 'Use a contained Git metadata path such as info/exclude.',
          details: { name },
        }
      );
    }
    if (
      typeof name !== 'string' ||
      !name ||
      name.includes('\0') ||
      segments.some((segment) => !segment)
    ) {
      throw new AprError('APR_GIT_PATH_INVALID', 'Git path name is invalid.', {
        recovery: 'Use a non-empty repository-relative Git path such as info/exclude.',
        details: { name },
      });
    }
    const repositoryRoot = root(cwd);
    const value = run(repositoryRoot, ['rev-parse', '--git-path', name]);
    const common = commonDir(repositoryRoot);
    const absolute = path.resolve(repositoryRoot, String(value).trim());
    try {
      return resolveContainedPath(common, path.relative(common, absolute), 'Git metadata').absolute;
    } catch (cause) {
      const error = new AprError(
        'APR_GIT_PATH_OUTSIDE_REPOSITORY',
        'Git metadata path escapes the common Git directory.',
        {
          recovery: 'Use a contained Git metadata path such as info/exclude.',
          details: { name },
        }
      );
      error.cause = cause;
      throw error;
    }
  }

  function status(cwd, relative = null) {
    const repositoryRoot = root(cwd);
    const args = ['status', '--porcelain=v1', '--untracked-files=all'];
    if (relative !== null)
      args.push('--', resolveContainedPath(repositoryRoot, relative, 'status').relative);
    return lines(run(repositoryRoot, args));
  }

  function indexEntry(cwd, relative) {
    const repositoryRoot = root(cwd);
    const resolved = resolveContainedPath(repositoryRoot, relative, 'artifact');
    const value = run(repositoryRoot, ['ls-files', '--stage', '--', resolved.relative]);
    const entries = String(value).split(/\r?\n/).filter(Boolean);
    const entry = entries.find((line) => line.endsWith(`\t${resolved.relative}`));
    if (!entry) return null;
    const match = /^(\d{6}) ([0-9a-f]+) (\d+)\t(.+)$/.exec(entry);
    if (!match) {
      throw new AprError('APR_GIT_INDEX_INVALID', 'Git returned an invalid index entry.', {
        recovery: 'Repair the Git index and retry the peer-review command.',
        details: { path: resolved.relative },
      });
    }
    return Object.freeze({
      mode: match[1],
      blob: match[2],
      stage: Number(match[3]),
      path: match[4],
    });
  }

  function workingBytes(cwd, relative) {
    const repositoryRoot = root(cwd);
    const resolved = resolveContainedPath(repositoryRoot, relative, 'artifact');
    try {
      return readFileSync(resolved.absolute);
    } catch (cause) {
      throw gitError(
        'APR_ARTIFACT_UNREADABLE',
        `Artifact cannot be read: ${resolved.relative}`,
        'Restore a readable regular artifact file and retry.',
        { path: resolved.relative },
        cause
      );
    }
  }

  function artifactState(cwd, relative) {
    const repositoryRoot = root(cwd);
    const resolved = resolveContainedPath(repositoryRoot, relative, 'artifact');
    const entry = indexEntry(repositoryRoot, resolved.relative);
    if (!entry || entry.stage !== 0) {
      throw new AprError('APR_ARTIFACT_UNTRACKED', 'Artifact is not a tracked stage-zero file.', {
        recovery: `Track the artifact with git add -- ${resolved.relative}, commit it, and retry.`,
        details: { path: resolved.relative },
      });
    }
    const head = String(run(repositoryRoot, ['rev-parse', 'HEAD'])).trim();
    const treeValue = run(repositoryRoot, ['ls-tree', 'HEAD', '--', resolved.relative]);
    const treeMatch = /^(\d{6}) blob ([0-9a-f]+)\t(.+)$/.exec(String(treeValue).trim());
    if (!treeMatch) {
      throw new AprError('APR_ARTIFACT_UNCOMMITTED', 'Artifact is not present in HEAD.', {
        recovery: `Commit ${resolved.relative} before starting peer review.`,
        details: { path: resolved.relative },
      });
    }
    const [, headMode, blob] = treeMatch;
    if (!REGULAR_MODES.has(entry.mode) || !REGULAR_MODES.has(headMode)) {
      throw new AprError('APR_ARTIFACT_NOT_REGULAR', 'Artifact must be a tracked regular file.', {
        recovery: `Replace ${resolved.relative} with a regular file, commit it, and retry.`,
        details: { path: resolved.relative, headMode, indexMode: entry.mode },
      });
    }
    const worktree = workingBytes(repositoryRoot, resolved.relative);
    const headBytes = run(
      repositoryRoot,
      ['show', '--end-of-options', `HEAD:${resolved.relative}`],
      {
        buffer: true,
      }
    );
    return Object.freeze({
      path: resolved.relative,
      head,
      blob,
      worktreeDigest: digest(worktree),
      clean:
        entry.mode === headMode &&
        entry.blob === blob &&
        Buffer.compare(worktree, headBytes) === 0 &&
        run(repositoryRoot, ['diff', '--quiet', 'HEAD', '--', resolved.relative], {
          allowStatuses: [1],
        }) !== null,
    });
  }

  function commitTree(cwd, revision = 'HEAD') {
    const repositoryRoot = root(cwd);
    return String(
      run(repositoryRoot, ['rev-parse', '--verify', '--end-of-options', `${revision}^{tree}`])
    ).trim();
  }

  function changedPaths(cwd, from, to = null) {
    const repositoryRoot = root(cwd);
    const range = to === null ? [from] : [from, to];
    return lines(
      run(repositoryRoot, [
        'diff',
        '--name-only',
        `--diff-filter=${CHANGE_FILTER}`,
        '--end-of-options',
        ...range,
        '--',
      ])
    );
  }

  function checkIgnored(cwd, relative) {
    const repositoryRoot = root(cwd);
    const resolved = resolveContainedPath(repositoryRoot, relative, 'scratch');
    return (
      run(repositoryRoot, ['check-ignore', '--quiet', '--no-index', '--', resolved.relative], {
        allowStatuses: [1],
      }) !== null
    );
  }

  function baseline(cwd) {
    const repositoryRoot = root(cwd);
    const head = String(run(repositoryRoot, ['rev-parse', 'HEAD'])).trim();
    const index = run(repositoryRoot, ['ls-files', '--stage', '-z'], { buffer: true });
    const worktree = run(
      repositoryRoot,
      ['status', '--porcelain=v1', '-z', '--untracked-files=all'],
      { buffer: true }
    );
    return Object.freeze({
      head,
      index_digest: `sha256:${digest(index)}`,
      worktree_digest: `sha256:${digest(worktree)}`,
    });
  }

  return Object.freeze({
    root,
    commonDir,
    gitPath,
    status,
    artifactState,
    indexEntry,
    workingBytes,
    commitTree,
    changedPaths,
    checkIgnored,
    baseline,
  });
}
