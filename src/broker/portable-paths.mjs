// @story #166
import path from 'node:path';
import { lstat, realpath } from 'node:fs/promises';
import { AprError } from '../errors.mjs';
function invalid() {
  return new AprError('APR_BROKER_PATH_INVALID', 'Protected paths alias or overlap.', {
    recovery: 'Use distinct canonical private and runtime roots inside the physical worktree.',
  });
}
async function canonical(value) {
  if (
    typeof value !== 'string' ||
    !path.isAbsolute(value) ||
    path.normalize(value) !== value ||
    /[\u0000-\u001f\u007f]/.test(value)
  )
    throw invalid();
  let existing = value;
  const missing = [];
  while (true) {
    try {
      const stat = await lstat(existing);
      if (stat.isSymbolicLink() || (await realpath(existing)) !== existing) throw invalid();
      return path.join(existing, ...missing);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const parent = path.dirname(existing);
      if (parent === existing) throw invalid();
      missing.unshift(path.basename(existing));
      existing = parent;
    }
  }
}
export async function assertDistinctProtectedRoots(roots) {
  if (!Array.isArray(roots) || roots.length < 2 || roots.length > 64) throw invalid();
  const values = await Promise.all(roots.map(canonical));
  for (let i = 0; i < values.length; i++)
    for (let j = i + 1; j < values.length; j++) {
      for (const [a, b] of [
        [values[i], values[j]],
        [values[j], values[i]],
      ]) {
        const relative = path.relative(a, b);
        if (
          relative === '' ||
          (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))
        )
          throw invalid();
      }
    }
  return Object.freeze(values);
}
export async function portableBrokerPaths({ worktree } = {}) {
  const root = await canonical(worktree);
  const stat = await lstat(root);
  if (!stat.isDirectory()) throw invalid();
  const base = path.join(root, '.scratch', 'peer-review');
  const privateRoot = path.join(base, 'private'),
    runtimeRoot = path.join(base, 'runtime');
  await assertDistinctProtectedRoots([privateRoot, runtimeRoot]);
  return Object.freeze({
    worktree: root,
    privateRoot,
    runtimeRoot,
    endpoint: path.join(runtimeRoot, 'endpoint.json'),
    credential: path.join(privateRoot, 'credential'),
  });
}
