// cspell:words textconv
// @story #190
// Actual temporary Git histories; metadata results never provide source-class authority.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
async function verifier() {
  try {
    return await import('../live/process-source/producer-freeze.mjs');
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
    throw error;
  }
}
function history(t) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'apr-frozen-git-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync('git', ['-C', root, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  const write = (file, text) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), text);
  };
  git('init');
  git('config', 'user.name', 'Freeze Metadata');
  git('config', 'user.email', 'freeze@example.invalid');
  write('producer.mjs', 'export const value = 1;\n');
  git('add', '.');
  git('commit', '-m', 'original producer');
  const before = git('rev-parse', 'HEAD');
  const commit = () => {
    git('add', '.');
    git('commit', '-m', 'changed input');
    return git('rev-parse', 'HEAD');
  };
  return { root, before, git, write, commit };
}
test('durable freeze permits only ordinary authority data and reports no capability', async (t) => {
  const api = await verifier();
  assert.equal(
    typeof api.inspectProcessSourceProducerFreeze,
    'function',
    'durable frozen Git producer verifier missing'
  );
  const h = history(t);
  h.write('evidence/portable-runtime/process-source/record.json', '{}\n');
  h.write('docs/superpowers/peer-reviews/response.md', '# Response\n');
  assert.deepEqual(
    api.inspectProcessSourceProducerFreeze({ root: h.root, before: h.before, after: h.commit() }),
    { verified: false, unchanged: true }
  );
});
test('durable freeze refuses executable evidence, changed producer bytes and introduced inputs', async (t) => {
  const api = await verifier();
  assert.equal(
    typeof api.inspectProcessSourceProducerFreeze,
    'function',
    'durable frozen Git producer verifier missing'
  );
  for (const file of [
    'evidence/portable-runtime/process-source/changed.mjs',
    'docs/superpowers/peer-reviews/changed.sh',
    'producer.mjs',
    'new-helper.mjs',
  ]) {
    const h = history(t);
    h.write(file, 'changed producer bytes\n');
    assert.throws(
      () =>
        api.inspectProcessSourceProducerFreeze({
          root: h.root,
          before: h.before,
          after: h.commit(),
        }),
      /source-changed|producer/
    );
  }
});
test('durable freeze never executes repository external-diff or textconv commands', async (t) => {
  const api = await verifier();
  assert.equal(
    typeof api.inspectProcessSourceProducerFreeze,
    'function',
    'durable frozen Git producer verifier missing'
  );
  const h = history(t);
  h.git('config', 'diff.external', 'not-a-permitted-program');
  h.git('config', 'diff.unsafe.textconv', 'not-a-permitted-program');
  h.write('.gitattributes', 'producer.mjs diff=unsafe\n');
  h.git('add', '.');
  h.git('commit', '-m', 'attributes');
  const before = h.git('rev-parse', 'HEAD');
  h.write('producer.mjs', 'changed\n');
  assert.throws(
    () => api.inspectProcessSourceProducerFreeze({ root: h.root, before, after: h.commit() }),
    /source-changed/
  );
});
