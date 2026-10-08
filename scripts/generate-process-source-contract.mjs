// @story #187
// Development-only closure generation; it never grants runtime source authority.
import { readFileSync, writeFileSync, renameSync, unlinkSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { deriveProcessSourceContract } from './verify-portable-consumers.mjs';

export function generateProcessSourceContract({ root, check = false } = {}) {
  const physical = realpathSync(root);
  const manifest = {
    schema: 'ai-peer-review.process-source-contract-files/v1',
    entry: 'src/protocol/process-source-assurance.mjs',
    files: [...deriveProcessSourceContract({ root: physical }).files],
  };
  const file = path.join(physical, 'src/protocol/process-source-contract-files.json');
  let previous = null;
  try {
    previous = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const changed = JSON.stringify(previous) !== JSON.stringify(manifest);
  if (check && changed) throw new Error('source-contract-manifest-stale: closure differs');
  if (!check && changed) {
    const temporary = file + '.' + randomUUID() + '.tmp';
    try {
      writeFileSync(temporary, JSON.stringify(manifest, null, 2) + '\n', {
        flag: 'wx',
        mode: 0o600,
      });
      renameSync(temporary, file);
    } finally {
      try {
        unlinkSync(temporary);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
  }
  return Object.freeze({ verified: false, changed, manifest: Object.freeze(manifest) });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--check') || args.length > 1)
    throw new Error('usage: generate-process-source-contract [--check]');
  const root = fileURLToPath(new URL('../', import.meta.url));
  console.log(
    JSON.stringify(generateProcessSourceContract({ root, check: args.includes('--check') }))
  );
}
