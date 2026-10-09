// @story #187
// Disposable genuine npm installation; fixture inventory records actual bytes
// and never supplies source-class approval or operational admission.
import { createHash } from 'node:crypto';
import { lstatSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { packRuntime } from './runtime-package.mjs';
import { runNpm } from './npm-command.mjs';

export async function portableOwnerInstalledFixture(t) {
  const packed = packRuntime(t);
  const prefix = path.join(packed.directory, 'global portable runtime');
  runNpm(
    'npm',
    [
      'install',
      '--global',
      '--prefix',
      prefix,
      '--ignore-scripts',
      '--offline',
      '--no-audit',
      '--no-fund',
      packed.tarball,
    ],
    { encoding: 'utf8' }
  );
  const installed = path.join(
    prefix,
    ...(process.platform === 'win32' ? [] : ['lib']),
    'node_modules/@kburson/ai-peer-review'
  );
  const files = JSON.parse(readFileSync(path.join(installed, 'runtime-inventory.json'))).files;
  const visit = (relative) => {
    for (const name of readdirSync(path.join(installed, relative))) {
      const file = relative + '/' + name;
      const stat = lstatSync(path.join(installed, file));
      if (stat.isDirectory()) visit(file);
      else if (stat.isFile() && (/\.(mjs|cjs|js|json|node)$/.test(name) || stat.mode & 0o111))
        files.push({
          path: file,
          sha256: createHash('sha256')
            .update(readFileSync(path.join(installed, file)))
            .digest('hex'),
        });
    }
  };
  visit('node_modules');
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  writeFileSync(
    path.join(installed, 'runtime-inventory.json'),
    JSON.stringify({ schema: 'ai-peer-review.runtime-inventory/v1', files }) + '\n'
  );
  const load = (relative) => import(pathToFileURL(path.join(installed, relative)).href);
  const inventory = await load('src/startup/runtime-inventory.mjs');
  inventory.verifyRuntimeInventorySync({ packageRoot: installed });
  return { load, installed, verified: false };
}
