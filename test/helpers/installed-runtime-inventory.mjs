// @story #135
// Disposable installed-artifact fixture sealing; never called by production.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
export function sealInstalledRuntimeFixture(root) {
  const files = [];
  const visit = (relative = '') => {
    for (const entry of readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (name === 'runtime-inventory.json') continue;
      if (entry.isDirectory()) visit(name);
      else if (entry.isFile())
        files.push({
          path: name,
          sha256: createHash('sha256')
            .update(readFileSync(path.join(root, name)))
            .digest('hex'),
        });
      else throw new Error('Installed fixture contains an unsafe file');
    }
  };
  visit();
  files.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
  writeFileSync(
    path.join(root, 'runtime-inventory.json'),
    JSON.stringify({ schema: 'ai-peer-review.runtime-inventory/v1', files })
  );
}
