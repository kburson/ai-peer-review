// cspell:words textconv
// @story #190
// Read-only Git metadata. No result here provides operational source authority.
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import {
  captureProducerFiles,
  assertCaptureProducerFiles,
} from '../../helpers/capture-producer-freeze.mjs';
export function inspectProcessSourceProducerFreeze(options = {}) {
  if (
    !options ||
    Object.getPrototypeOf(options) !== Object.prototype ||
    Reflect.ownKeys(options).sort().join(',') !== 'after,before,root' ||
    Object.keys(options).some(
      (key) => !Object.hasOwn(Object.getOwnPropertyDescriptor(options, key), 'value')
    )
  )
    throw Error('producer-freeze-options');
  const { root, before, after } = options;
  if (
    typeof root !== 'string' ||
    !path.isAbsolute(root) ||
    path.normalize(root) !== root ||
    realpathSync(root) !== root ||
    !/^[a-f0-9]{40}$/u.test(before ?? '') ||
    !/^[a-f0-9]{40}$/u.test(after ?? '')
  )
    throw Error('producer-freeze-input');
  const git = (args) =>
    execFileSync('git', ['-C', root, ...args], {
      encoding: 'utf8',
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30000,
      maxBuffer: 16 * 1024 * 1024,
    })
      .split('\0')
      .filter(Boolean);
  const original = captureProducerFiles(git(['ls-tree', '-r', '-z', '--name-only', before]));
  const current = captureProducerFiles(git(['ls-tree', '-r', '-z', '--name-only', after]));
  const changed = git([
    'diff',
    '--no-ext-diff',
    '--no-textconv',
    '--no-renames',
    '--name-only',
    '-z',
    before,
    after,
    '--',
  ]);
  assertCaptureProducerFiles(original, current, changed);
  return Object.freeze({ verified: false, unchanged: true });
}
