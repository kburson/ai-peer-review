import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { validateReleaseManifest, verifyRelease } from '../../scripts/verify-release.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const digest = createHash('sha256').update('release tarball').digest('hex');
const releaseCommit = '37a30d8ec124f831aee7974957df12ac226bacbf';

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

function observers(value = manifest()) {
  return {
    extraction: async () => true,
    tag: async () => ({ target_commit: value.release_commit }),
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
    reachable: async () => true,
  };
}

test('release verifier binds extraction, public release, npm provenance, checksum, and archives', async () => {
  const value = manifest();
  const verified = await verifyRelease({ root, manifest: value, observers: observers(value) });
  assert.equal(verified.releaseCommit, releaseCommit);
  assert.equal(verified.checksum, digest);
});

test('release manifest fails closed on draft or substituted public evidence', async () => {
  const draft = manifest();
  draft.release_commit = null;
  assert.throws(() => validateReleaseManifest(draft), /release_commit/);
  const changed = manifest();
  changed.github_release.asset_sha256 = '0'.repeat(64);
  await assert.rejects(
    verifyRelease({ root, manifest: changed, observers: observers(manifest()) }),
    /checksum mismatch/
  );
});
