// @story #137
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseNpmPackOutput } from './npm-command.mjs';

export const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export function packRuntime(t) {
  const directory = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'apr runtime package ')));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const script = path.join(sourceRoot, 'scripts/pack-runtime.mjs');
  const output = execFileSync(
    process.execPath,
    [script, '--json', '--pack-destination', directory],
    { cwd: sourceRoot, encoding: 'utf8' }
  );
  const report = parseNpmPackOutput(output, {
    expectedPackageName: '@kburson/ai-peer-review',
    requireFilename: true,
  });
  const tarball = path.join(directory, report.filename);
  const extracted = path.join(directory, 'package');
  execFileSync('tar', ['-xf', tarball, '-C', directory]);
  return { directory, report, tarball, extracted };
}
