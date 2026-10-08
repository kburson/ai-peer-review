#!/usr/bin/env node
// @story #170
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  packProcessSourceCandidate,
  bindProcessSourceCandidate,
} from './process-source/package.mjs';

export async function runProcessSourceConformance(options = {}) {
  if (!options || Object.getPrototypeOf(options) !== Object.prototype)
    throw Error('driver-options');
  if (options.mode === 'pack' && Object.keys(options).every((k) => ['mode', 'output'].includes(k)))
    return packProcessSourceCandidate(options);
  if (
    options.mode === 'bind' &&
    Object.keys(options).every((k) => ['mode', 'packagePath', 'binding'].includes(k))
  )
    return bindProcessSourceCandidate(options);
  throw Error('driver-mode-unavailable');
}
function args(values) {
  const [mode, ...rest] = values;
  const result = { mode };
  const names =
    mode === 'pack'
      ? { '--output': 'output' }
      : mode === 'bind'
        ? { '--package': 'packagePath', '--binding': 'binding' }
        : {};
  for (let i = 0; i < rest.length; i += 2) {
    const name = names[rest[i]],
      value = rest[i + 1];
    if (!name || !value || value.startsWith('--') || Object.hasOwn(result, name))
      throw Error('driver-arguments');
    result[name] = value;
  }
  return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await runProcessSourceConformance(args(process.argv.slice(2)))));
  } catch (error) {
    console.error(error.code ?? error.message);
    process.exitCode = 1;
  }
}
