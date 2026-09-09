import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  observeReleaseDelta,
  validateReleaseManifest,
  verifyRelease,
} from '../../scripts/verify-release.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const digest = createHash('sha256').update('release tarball').digest('hex');
const releaseCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: root,
  encoding: 'utf8',
}).trim();
const evidenceCommit = 'e'.repeat(40);

function manifest() {
  return {
    schema: 'ai-peer-review.release/v1',
    package: 'ai-peer-review',
    version: '0.1.0',
    source_commit: '4b3bcd43cba141a611da4a2b861433b915462806',
    filtered_history_tip: 'bfc6f9ffabd8281a815c7bd0e0824f3bacb84d9d',
    bootstrap_commit: 'fd2e636356b6b8049930d5dc6bddf383c6d56c8d',
    release_commit: releaseCommit,
    repository: { url: 'https://github.com/kburson/ai-peer-review', visibility: 'PUBLIC' },
    tag: {
      name: 'v0.1.0',
      target_commit: releaseCommit,
      signer_fingerprint: 'SHA256:5coWixpZ2nPevuuMFWsJkk7oc3UN8zybVaMpA12HNPI',
    },
    github_release: {
      url: 'https://github.com/kburson/ai-peer-review/releases/tag/v0.1.0',
      asset_name: 'ai-peer-review-0.1.0.tgz',
      asset_sha256: digest,
      checksums_asset_name: 'SHA256SUMS',
    },
    npm: {
      tarball_url: 'https://registry.npmjs.org/ai-peer-review/-/ai-peer-review-0.1.0.tgz',
      integrity: 'sha512-fixture',
      sha256: digest,
      provenance_url: 'https://registry.npmjs.org/-/npm/v1/attestations/fixture',
    },
    archives: {
      zenodo: { doi: '10.5281/zenodo.1234567', url: 'https://doi.org/10.5281/zenodo.1234567' },
      software_heritage: {
        swhid: 'swh:1:rev:37a30d8ec124f831aee7974957df12ac226bacbf',
        url: 'https://archive.softwareheritage.org/swh:1:rev:37a30d8ec124f831aee7974957df12ac226bacbf',
      },
    },
  };
}

function manifestBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function observers(value = manifest()) {
  return {
    extraction: async () => true,
    head: async () => evidenceCommit,
    tag: async () => ({
      target_commit: value.release_commit,
      signer_fingerprint: value.tag.signer_fingerprint,
    }),
    releaseDelta: async (base, head) => {
      assert.equal(base, value.release_commit);
      assert.equal(head, evidenceCommit);
      return {
        ancestor: true,
        commitCount: 1,
        paths: ['provenance/release-manifest.json'],
      };
    },
    releaseManifestBlobs: async () => {
      const bytes = manifestBytes(value);
      return { head: bytes, index: bytes };
    },
    repository: async () => value.repository,
    githubRelease: async () => ({
      url: value.github_release.url,
      tagName: value.tag.name,
      assets: [
        { name: value.github_release.asset_name, url: 'fixture:tarball' },
        { name: value.github_release.checksums_asset_name, url: 'fixture:checksums' },
      ],
    }),
    npmPackage: async () => ({
      tarball: value.npm.tarball_url,
      integrity: value.npm.integrity,
      attestations: { provenance: { url: value.npm.provenance_url } },
    }),
    sha256Url: async () => digest,
    textUrl: async () => `${digest}  ${value.github_release.asset_name}\n`,
    reachable: async () => true,
  };
}

function verify(value, observed = observers(value), bytes = manifestBytes(value)) {
  return verifyRelease({ root, manifest: value, manifestBytes: bytes, observers: observed });
}

function git(cwd, args, options = {}) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', ...options }).trim();
}

function temporaryRepository() {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'ai-peer-review-release-'));
  git(directory, ['init']);
  git(directory, ['config', 'user.name', 'Release Test']);
  git(directory, ['config', 'user.email', 'release-test@example.invalid']);
  mkdirSync(path.join(directory, 'provenance'), { recursive: true });
  writeFileSync(path.join(directory, 'provenance/release-manifest.json'), '{"draft":true}\n');
  git(directory, ['add', '.']);
  git(directory, ['commit', '--no-gpg-sign', '-m', 'base']);
  return directory;
}

test('release verifier binds the release commit to the signed tag target', async () => {
  const value = manifest();
  const verified = await verify(value);
  assert.equal(verified.releaseCommit, releaseCommit);
  assert.equal(verified.checksum, digest);

  const substituted = manifest();
  substituted.tag.target_commit = '0'.repeat(40);
  const observed = observers(substituted);
  observed.tag = async () => ({
    target_commit: releaseCommit,
    signer_fingerprint: substituted.tag.signer_fingerprint,
  });
  await assert.rejects(
    verify(substituted, observed),
    /signed tag target and release commit do not match/
  );
});

test('release verifier permits one evidence-only descendant', async () => {
  const value = manifest();
  const verified = await verify(value);
  assert.equal(verified.releaseCommit, releaseCommit);
});

test('release verifier rejects unrelated post-release changes', async () => {
  const unrelated = observers(manifest());
  unrelated.releaseDelta = async () => ({
    ancestor: true,
    commitCount: 1,
    paths: ['provenance/release-manifest.json', 'src/public-api.mjs'],
  });
  await assert.rejects(
    verify(manifest(), unrelated),
    /post-release changes are not restricted to provenance\/release-manifest\.json/
  );

  const unrelatedHistory = observers(manifest());
  unrelatedHistory.releaseDelta = async () => ({
    ancestor: false,
    commitCount: 0,
    paths: [],
  });
  await assert.rejects(
    verify(manifest(), unrelatedHistory),
    /release commit is not an ancestor of checkout HEAD/
  );

  const multipleEvidenceCommits = observers(manifest());
  multipleEvidenceCommits.releaseDelta = async () => ({
    ancestor: true,
    commitCount: 2,
    paths: ['provenance/release-manifest.json'],
  });
  await assert.rejects(
    verify(manifest(), multipleEvidenceCommits),
    /not exactly one evidence commit/
  );
});

test('release observer preserves adversarial path bytes and exposes renames', async (t) => {
  const whitespaceRepo = temporaryRepository();
  t.after(() => rmSync(whitespaceRepo, { recursive: true, force: true }));
  const whitespaceBase = git(whitespaceRepo, ['rev-parse', 'HEAD']);
  const blob = git(whitespaceRepo, ['hash-object', '-w', '--stdin'], { input: 'substitute\n' });
  git(whitespaceRepo, [
    'update-index',
    '--add',
    // cspell:disable-next-line
    '--cacheinfo',
    '100644',
    blob,
    'provenance/release-manifest.json ',
  ]);
  git(whitespaceRepo, ['commit', '--no-gpg-sign', '-m', 'adversarial path']);
  const whitespaceHead = git(whitespaceRepo, ['rev-parse', 'HEAD']);
  const whitespaceDelta = await observeReleaseDelta(whitespaceRepo, whitespaceBase, whitespaceHead);
  assert.deepEqual(whitespaceDelta.paths, ['provenance/release-manifest.json ']);

  const renameRepo = temporaryRepository();
  t.after(() => rmSync(renameRepo, { recursive: true, force: true }));
  mkdirSync(path.join(renameRepo, 'src'));
  writeFileSync(path.join(renameRepo, 'src/old.mjs'), 'export const value = 1;\n');
  git(renameRepo, ['add', '.']);
  git(renameRepo, ['commit', '--no-gpg-sign', '-m', 'add source']);
  const renameBase = git(renameRepo, ['rev-parse', 'HEAD']);
  renameSync(path.join(renameRepo, 'src/old.mjs'), path.join(renameRepo, 'src/new.mjs'));
  writeFileSync(path.join(renameRepo, 'provenance/release-manifest.json'), '{"draft":false}\n');
  git(renameRepo, ['add', '-A']);
  git(renameRepo, ['commit', '--no-gpg-sign', '-m', 'evidence and rename']);
  const renameHead = git(renameRepo, ['rev-parse', 'HEAD']);
  const renameDelta = await observeReleaseDelta(renameRepo, renameBase, renameHead);
  assert.deepEqual(renameDelta.paths.sort(), [
    'provenance/release-manifest.json',
    'src/new.mjs',
    'src/old.mjs',
  ]);
});

test('release verifier rejects dirty or staged release-manifest bytes', async () => {
  const value = manifest();
  const dirtyBytes = Buffer.concat([manifestBytes(value), Buffer.from(' ')]);
  await assert.rejects(
    verify(value, observers(value), dirtyBytes),
    /working release manifest does not match the committed evidence blob/
  );

  const staged = observers(value);
  staged.releaseManifestBlobs = async () => ({
    head: manifestBytes(value),
    index: dirtyBytes,
  });
  await assert.rejects(
    verify(value, staged),
    /index release manifest does not match the committed evidence blob/
  );
});

test('release manifest fails closed on draft or substituted public evidence', async () => {
  const draft = manifest();
  draft.release_commit = null;
  assert.throws(() => validateReleaseManifest(draft), /release_commit/);
  const changed = manifest();
  changed.github_release.asset_sha256 = '0'.repeat(64);
  const changedObservers = observers(changed);
  changedObservers.sha256Url = async () => digest;
  await assert.rejects(verify(changed, changedObservers), /checksum mismatch/);

  const wrongSigner = observers(manifest());
  wrongSigner.tag = async () => ({
    target_commit: releaseCommit,
    signer_fingerprint: 'SHA256:substitute',
  });
  await assert.rejects(verify(manifest(), wrongSigner), /fingerprint mismatch/);

  const wrongChecksums = observers(manifest());
  wrongChecksums.textUrl = async () => `${'f'.repeat(64)}  ai-peer-review-0.1.0.tgz\n`;
  await assert.rejects(verify(manifest(), wrongChecksums), /checksum asset does not bind/);
});
