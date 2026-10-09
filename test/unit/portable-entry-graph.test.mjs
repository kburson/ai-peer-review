// @story #189
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
test('portable entry modules cannot reach native platform, IPC or legacy ownership implementations', () => {
  const root = new URL('../../', import.meta.url);
  const pending = [
    'bin/peer-review-broker.mjs',
    'src/broker/client.mjs',
    'src/startup/runtime.mjs',
    'src/config/setup.mjs',
    'src/cli/run.mjs',
  ].map((name) => new URL(name, root));
  const seen = new Set();
  const forbidden = /\/(?:platform|ipc|legacy-(?:entry|ownership|client-core|service-core))\.mjs$/u;
  while (pending.length) {
    const file = pending.pop();
    if (seen.has(file.href)) continue;
    seen.add(file.href);
    assert.equal(forbidden.test(file.pathname), false, fileURLToPath(file));
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(
      /(?:from\s*|import\s*\(\s*|import\s*)['"]([^'"]+\.mjs)['"]/gu
    )) {
      if (match[1].startsWith('.')) pending.push(new URL(match[1], file));
    }
  }
});
