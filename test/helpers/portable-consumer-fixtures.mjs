// @story #186
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export function consumerFixture(t, files, { entries = ['bin/peer-review.mjs'], omit = [] } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'apr-consumers-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [file, source] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), source);
  }
  const inventory = {
    schema: 'ai-peer-review.portable-consumer-inventory/v1',
    entries,
    modules: Object.keys(files)
      .filter((file) => !omit.includes(file))
      .map((file) => ({
        path: file,
        owner: 186,
        disposition: 'portable',
      })),
  };
  return { root, inventory };
}

export async function faultedPortableSystem({ filesystemModule, protectionModule }) {
  const source = readFileSync(
    new URL('../../src/broker/portable-system.mjs', import.meta.url),
    'utf8'
  )
    .replace(
      "from 'node:fs/promises'",
      'from ' + JSON.stringify(filesystemModule ?? 'node:fs/promises')
    )
    .replace(
      "from '../errors.mjs'",
      'from ' + JSON.stringify(new URL('../../src/errors.mjs', import.meta.url).href)
    )
    .replaceAll(
      "import('./storage-protection.mjs')",
      'import(' +
        JSON.stringify(
          protectionModule ??
            new URL('../../src/broker/storage-protection.mjs', import.meta.url).href
        ) +
        ')'
    );
  return import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
}
