import { execFileSync as nodeExecFileSync } from 'node:child_process';
import { chmodSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import { createGitRepository } from '../../src/git/repository.mjs';
import { createRepositoryFixture, sha256 } from '../helpers/repository-fixture.mjs';

test('discovers canonical roots and Git paths from a linked worktree', (t) => {
  const fixture = createRepositoryFixture(t);
  const repository = createGitRepository({ execFileSync: nodeExecFileSync });

  assert.equal(repository.root(path.join(fixture.root, 'docs')), fixture.root);
  assert.equal(repository.root(path.join(fixture.linked, 'docs')), fixture.linked);
  assert.equal(repository.commonDir(fixture.root), fixture.commonDir);
  assert.equal(repository.commonDir(fixture.linked), fixture.commonDir);
  assert.equal(
    repository.gitPath(fixture.linked, 'info/exclude'),
    path.join(fixture.commonDir, 'info/exclude')
  );
});

test('observes a clean tracked artifact without disturbing unrelated changes', (t) => {
  const fixture = createRepositoryFixture(t);
  const repository = createGitRepository();

  assert.deepEqual(repository.artifactState(fixture.root, 'docs/artifact.md'), {
    path: 'docs/artifact.md',
    head: fixture.head,
    blob: fixture.artifactBlob,
    worktreeDigest: fixture.artifactDigest,
    clean: true,
  });
  assert.deepEqual(repository.indexEntry(fixture.root, 'docs/artifact.md'), {
    mode: '100644',
    blob: fixture.artifactBlob,
    stage: 0,
    path: 'docs/artifact.md',
  });
  assert.deepEqual(
    repository.workingBytes(fixture.root, 'docs/artifact.md'),
    fixture.artifactBytes
  );
  assert.match(repository.status(fixture.root).join('\n'), /tracked-staged\.txt/);
  assert.match(repository.status(fixture.root).join('\n'), /tracked-unstaged\.txt/);

  writeFileSync(path.join(fixture.root, 'docs', 'artifact.md'), 'changed\n');
  const changed = repository.artifactState(fixture.root, 'docs/artifact.md');
  assert.equal(changed.clean, false);
  assert.equal(changed.worktreeDigest, sha256(Buffer.from('changed\n')));
});

test('reports commit trees, changed paths, and ignored probes', (t) => {
  const fixture = createRepositoryFixture(t);
  const repository = createGitRepository();

  assert.match(repository.commitTree(fixture.root, 'HEAD'), /^[0-9a-f]{40}$/);
  assert.deepEqual(repository.changedPaths(fixture.root, 'HEAD', 'HEAD'), []);
  assert.equal(repository.checkIgnored(fixture.root, '.scratch/peer-review/probe'), true);
  assert.equal(repository.checkIgnored(fixture.root, '.scratch/not-peer-review'), false);
});

test('refuses untracked artifacts with a stable APR error', (t) => {
  const fixture = createRepositoryFixture(t);
  const repository = createGitRepository();

  assert.throws(
    () => repository.artifactState(fixture.root, '.scratch/not-peer-review'),
    (error) =>
      error.code === 'APR_ARTIFACT_UNTRACKED' &&
      error.details.path === '.scratch/not-peer-review' &&
      /git add/.test(error.recovery)
  );
});

test('refuses tracked symlinks', (t) => {
  const fixture = createRepositoryFixture(t);
  const repository = createGitRepository();

  assert.throws(
    () => repository.artifactState(fixture.root, 'docs/tracked-link.md'),
    (error) => error.code === 'APR_ARTIFACT_NOT_REGULAR'
  );
});

test('observes executable-bit-only changes where the filesystem supports them', (t) => {
  const fixture = createRepositoryFixture(t);
  if (!fixture.fileMode) {
    t.skip('Git reports that file-mode tracking is disabled on this filesystem');
    return;
  }
  const repository = createGitRepository();

  chmodSync(path.join(fixture.root, 'docs', 'artifact.md'), 0o755);
  assert.equal(repository.artifactState(fixture.root, 'docs/artifact.md').clean, false);
  nodeExecFileSync('git', ['add', '--', 'docs/artifact.md'], {
    cwd: fixture.root,
    stdio: 'ignore',
    shell: false,
  });
  assert.equal(repository.artifactState(fixture.root, 'docs/artifact.md').clean, false);
});

test('gitPath refuses lexical traversal and physical symlink escape', (t) => {
  const fixture = createRepositoryFixture(t);
  const repository = createGitRepository();

  assert.throws(
    () => repository.gitPath(fixture.root, '../README.md'),
    (error) => error.code === 'APR_GIT_PATH_OUTSIDE_REPOSITORY'
  );
  symlinkSync(fixture.outside, path.join(fixture.commonDir, 'escape-link'));
  assert.throws(
    () => repository.gitPath(fixture.root, 'escape-link/file.md'),
    (error) => error.code === 'APR_GIT_PATH_OUTSIDE_REPOSITORY'
  );
});

test('uses literal argument arrays with shell disabled', () => {
  const calls = [];
  const cwd = process.cwd();
  const repository = createGitRepository({
    execFileSync(command, args, options) {
      calls.push({ command, args, options });
      return `${cwd}\n`;
    },
  });

  repository.root(cwd);
  assert.deepEqual(calls[0].args, ['rev-parse', '--show-toplevel']);
  assert.equal(calls[0].command, 'git');
  assert.equal(calls[0].options.shell, false);
});
