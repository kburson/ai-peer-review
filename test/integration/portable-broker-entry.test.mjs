// @story #189
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execute = promisify(execFile);
test('actual fixed Node broker process refuses unaccepted checkout startup and preserves bootstrap evidence', async (t) => {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'portable-broker-entry-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, '.scratch', 'peer-review', 'broker');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const file = path.join(directory, 'bootstrap-a1b2.json');
  const bytes = JSON.stringify({
    schema: 'ai-peer-review.broker-bootstrap/v2',
    retained: 'unaccepted bootstrap evidence',
  });
  await writeFile(file, bytes, { mode: 0o600 });
  const entry = fileURLToPath(new URL('../../bin/peer-review-broker.mjs', import.meta.url));
  await assert.rejects(
    execute(process.execPath, [entry, file], { shell: false, timeout: 5000, cwd: root }),
    (error) => {
      assert.equal(error.code, 1);
      assert.equal(error.killed, false);
      assert.match(error.stderr, /APR_[A-Z_]+: Portable broker startup or cleanup failed/);
      assert.equal(error.stdout, '');
      return true;
    }
  );
  assert.equal(await readFile(file, 'utf8'), bytes);
  for (const name of ['private/credential', 'private/owner.json', 'runtime/endpoint.json'])
    await assert.rejects(readFile(path.join(root, '.scratch', 'peer-review', name)), {
      code: 'ENOENT',
    });
});
