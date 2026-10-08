// @story #186
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
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
