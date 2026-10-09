// @story #190
// Metadata controls only; producer lists never confer installed authority.
import assert from 'node:assert/strict';
import test from 'node:test';
let freeze;
try {
  freeze = await import('../helpers/capture-producer-freeze.mjs');
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}
const files = [
  'test/helpers/process-source-ci-capture.mjs',
  'test/helpers/npm-command.mjs',
  'scripts/build-runtime-package.mjs',
  'src/broker/storage-protection.mjs',
  'schemas/process-source-class-v1.json',
  '.github/workflows/process-source-capture.yml',
  'package-lock.json',
  '.npmrc',
  'README.md',
  'evidence/portable-runtime/process-source/registration-index.json',
  'docs/superpowers/peer-reviews/normal/manifest.json',
];
test('capture freeze conservatively covers runtime, transitive packaging and workflow inputs', () => {
  assert.equal(typeof freeze?.captureProducerFiles, 'function');
  const result = freeze.captureProducerFiles(files);
  assert.ok(Object.isFrozen(result));
  assert.deepEqual(result, files.slice(0, 9).sort());
});
test('ordinary immutable authority data may be added but executable inputs never disappear into it', () => {
  assert.equal(typeof freeze?.assertCaptureProducerFiles, 'function');
  const before = freeze.captureProducerFiles(files);
  const after = freeze.captureProducerFiles([
    ...files,
    'evidence/portable-runtime/process-source/registrations/new.json',
    'docs/superpowers/peer-reviews/new/final-response.md',
  ]);
  assert.equal(freeze.assertCaptureProducerFiles(before, after), true);
  const executable = freeze.captureProducerFiles([
    ...files,
    'docs/superpowers/peer-reviews/normal/excluded-loader.mjs',
  ]);
  assert.throws(() => freeze.assertCaptureProducerFiles(before, executable), /closure-changed/);
});
test('capture freeze refuses omitted, newly introduced and renamed transitive inputs', () => {
  assert.equal(typeof freeze?.assertCaptureProducerFiles, 'function');
  const before = freeze.captureProducerFiles(files);
  for (const altered of [
    files.filter((file) => file !== 'test/helpers/npm-command.mjs'),
    [...files, 'test/helpers/new-capture-dependency.json'],
    files.map((file) =>
      file === 'scripts/build-runtime-package.mjs' ? 'scripts/renamed-package.mjs' : file
    ),
  ]) {
    assert.throws(
      () => freeze.assertCaptureProducerFiles(before, freeze.captureProducerFiles(altered)),
      /closure-changed/
    );
  }
});
test('capture metadata refuses empty, duplicate and aliased source paths', () => {
  assert.equal(typeof freeze?.captureProducerFiles, 'function');
  for (const invalid of [
    [],
    [...files, files[0]],
    ['../outside.mjs'],
    ['./src/a.mjs'],
    ['src//a.mjs'],
    ['/src/a.mjs'],
    ['src\\a.mjs'],
    ['src/a\n.mjs'],
  ]) {
    assert.throws(() => freeze.captureProducerFiles(invalid), /producer-files-invalid/);
  }
});
test('changed producer bytes refuse while separately reviewed authority data remains permitted', () => {
  const before = freeze.captureProducerFiles(files);
  assert.throws(
    () => freeze.assertCaptureProducerFiles(before, before, ['src/broker/storage-protection.mjs']),
    /producer-source-changed/
  );
  assert.equal(
    freeze.assertCaptureProducerFiles(before, before, [
      'evidence/portable-runtime/process-source/registration-index.json',
    ]),
    true
  );
});
test('hosted capture refuses a foreign branch before private binding or privilege effects', async (t) => {
  const values = {
    GITHUB_ACTIONS: 'true',
    RUNNER_ENVIRONMENT: 'github-hosted',
    GITHUB_REPOSITORY: 'kburson/ai-peer-review',
    GITHUB_WORKFLOW: 'Process source conformance capture',
    GITHUB_RUN_ID: '190',
    GITHUB_RUN_ATTEMPT: '1',
    RUNNER_OS: 'macOS',
    GITHUB_REF_NAME: 'codex/foreign-capture',
  };
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const { runCiSourceCapture } = await import('../helpers/process-source-ci-capture.mjs');
  await assert.rejects(
    () => runCiSourceCapture({ mode: 'capture' }),
    /ci-capture-branch-unavailable/
  );
});
