import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseNpmPackOutput, runNpm } from './npm-command.mjs';

export function warmPackedCache({ root, scratch, npm = runNpm }) {
  mkdirSync(scratch, { recursive: true });
  const output = npm('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', scratch], {
    cwd: root,
    encoding: 'utf8',
  });
  const packed = parseNpmPackOutput(output, {
    expectedPackageName: '@kburson/ai-peer-review',
    requireFilename: true,
  });
  const tarball = path.join(scratch, packed.filename);
  if (!existsSync(tarball)) throw new Error('Packed release tarball is missing.');
  const host = path.join(scratch, 'host');
  mkdirSync(host, { recursive: true });
  writeFileSync(path.join(host, 'package.json'), '{"private":true}\n');
  npm('npm', ['install', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund', tarball], {
    cwd: host,
    stdio: 'inherit',
  });
  return tarball;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../..', import.meta.url));
  warmPackedCache({ root, scratch: path.join(root, '.scratch/test/apr-cache-warm') });
}
