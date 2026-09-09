#!/usr/bin/env node

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const SHA = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const SWHID = /^swh:1:(rev|dir|cnt):[0-9a-f]{40}$/;

function fail(message) {
  throw new Error(`release verification failed: ${message}`);
}

function exactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail(`${label} is not an object`);
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), `${label} keys`);
}

function text(value, label) {
  if (typeof value !== 'string' || !value) fail(`${label} is missing`);
  return value;
}

export function validateReleaseManifest(manifest) {
  exactKeys(
    manifest,
    [
      'schema',
      'package',
      'version',
      'source_commit',
      'filtered_history_tip',
      'bootstrap_commit',
      'release_commit',
      'repository',
      'tag',
      'github_release',
      'npm',
      'archives',
    ],
    'manifest'
  );
  if (manifest.schema !== 'ai-peer-review.release/v1') fail('schema mismatch');
  if (manifest.package !== 'ai-peer-review' || manifest.version !== '0.1.0')
    fail('package identity mismatch');
  for (const field of [
    'source_commit',
    'filtered_history_tip',
    'bootstrap_commit',
    'release_commit',
  ]) {
    if (!SHA.test(text(manifest[field], field))) fail(`${field} is not a commit SHA`);
  }
  exactKeys(manifest.repository, ['url', 'visibility'], 'repository');
  if (
    text(manifest.repository.url, 'repository.url') !== 'https://github.com/kburson/ai-peer-review'
  )
    fail('repository URL mismatch');
  if (manifest.repository.visibility !== 'PUBLIC') fail('repository is not public');
  exactKeys(manifest.tag, ['name', 'target_commit', 'signer_fingerprint'], 'tag');
  if (manifest.tag.name !== `v${manifest.version}`) fail('tag name mismatch');
  if (!SHA.test(text(manifest.tag.target_commit, 'tag.target_commit')))
    fail('tag target is not a commit SHA');
  text(manifest.tag.signer_fingerprint, 'tag.signer_fingerprint');
  exactKeys(
    manifest.github_release,
    ['url', 'asset_name', 'asset_sha256', 'checksums_asset_name'],
    'github_release'
  );
  text(manifest.github_release.url, 'github_release.url');
  text(manifest.github_release.asset_name, 'github_release.asset_name');
  text(manifest.github_release.checksums_asset_name, 'github_release.checksums_asset_name');
  if (!SHA256.test(text(manifest.github_release.asset_sha256, 'github_release.asset_sha256')))
    fail('GitHub asset SHA-256 is invalid');
  exactKeys(manifest.npm, ['tarball_url', 'integrity', 'sha256', 'provenance_url'], 'npm');
  text(manifest.npm.tarball_url, 'npm.tarball_url');
  if (!text(manifest.npm.integrity, 'npm.integrity').startsWith('sha512-'))
    fail('npm integrity is invalid');
  if (!SHA256.test(text(manifest.npm.sha256, 'npm.sha256'))) fail('npm SHA-256 is invalid');
  text(manifest.npm.provenance_url, 'npm.provenance_url');
  exactKeys(manifest.archives, ['zenodo', 'software_heritage'], 'archives');
  exactKeys(manifest.archives.zenodo, ['doi', 'url'], 'archives.zenodo');
  text(manifest.archives.zenodo.doi, 'archives.zenodo.doi');
  text(manifest.archives.zenodo.url, 'archives.zenodo.url');
  exactKeys(manifest.archives.software_heritage, ['swhid', 'url'], 'archives.software_heritage');
  if (
    !SWHID.test(text(manifest.archives.software_heritage.swhid, 'archives.software_heritage.swhid'))
  )
    fail('Software Heritage identifier is invalid');
  text(manifest.archives.software_heritage.url, 'archives.software_heritage.url');
  return manifest;
}

async function run(command, args, options = {}) {
  return execFileAsync(command, args, {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    ...options,
  });
}

async function sha256Url(url) {
  const response = await fetch(url);
  if (!response.ok) fail(`download failed (${response.status}): ${url}`);
  return createHash('sha256')
    .update(Buffer.from(await response.arrayBuffer()))
    .digest('hex');
}

async function textUrl(url) {
  const response = await fetch(url);
  if (!response.ok) fail(`download failed (${response.status}): ${url}`);
  return response.text();
}

function defaultObservers(root) {
  return {
    async extraction() {
      await run(
        process.execPath,
        [path.join(root, 'scripts/verify-extraction.mjs'), '--require-legacy-removed'],
        {
          cwd: root,
        }
      );
      return true;
    },
    async tag(name) {
      const verified = await run(
        'git',
        [
          '-c',
          `gpg.ssh.allowedSignersFile=${path.join(root, 'provenance/allowed-signers')}`,
          'verify-tag',
          name,
        ],
        { cwd: root }
      );
      const { stdout } = await run('git', ['rev-parse', `${name}^{}`], { cwd: root });
      const fingerprint = `${verified.stdout}\n${verified.stderr}`.match(
        /key (SHA256:[A-Za-z0-9+/]+={0,2})/
      )?.[1];
      if (!fingerprint) fail('signed tag verifier did not report a signer fingerprint');
      return { target_commit: stdout.trim(), signer_fingerprint: fingerprint };
    },
    async head() {
      const { stdout } = await run('git', ['rev-parse', 'HEAD'], { cwd: root });
      return stdout.trim();
    },
    async repository() {
      const { stdout } = await run(
        'gh',
        ['repo', 'view', 'kburson/ai-peer-review', '--json', 'url,visibility'],
        { cwd: root }
      );
      return JSON.parse(stdout);
    },
    async githubRelease(name) {
      const { stdout } = await run(
        'gh',
        [
          'release',
          'view',
          name,
          '--repo',
          'kburson/ai-peer-review',
          '--json',
          'url,tagName,assets',
        ],
        { cwd: root }
      );
      return JSON.parse(stdout);
    },
    async npmPackage(spec) {
      const { stdout } = await run('npm', ['view', spec, 'dist', '--json'], { cwd: root });
      return JSON.parse(stdout);
    },
    sha256Url,
    textUrl,
    async reachable(url) {
      const response = await fetch(url, { redirect: 'follow' });
      return response.ok;
    },
  };
}

export async function verifyRelease({ root, manifest, observers } = {}) {
  validateReleaseManifest(manifest);
  const observed = observers ?? defaultObservers(root);
  await observed.extraction();

  const extraction = JSON.parse(
    await readFile(path.join(root, 'provenance/extraction-manifest.json'), 'utf8')
  );
  if (
    manifest.source_commit !== extraction.source_commit ||
    manifest.filtered_history_tip !== extraction.filtered_history_tip
  )
    fail('extraction boundary mismatch');
  const { stdout: bootstrapParent } = await run(
    'git',
    ['rev-parse', `${manifest.bootstrap_commit}^`],
    { cwd: root }
  );
  if (bootstrapParent.trim() !== manifest.filtered_history_tip) fail('bootstrap parent mismatch');

  const tag = await observed.tag(manifest.tag.name);
  const head = await observed.head();
  if (
    tag.target_commit !== manifest.tag.target_commit ||
    manifest.tag.target_commit !== manifest.release_commit ||
    manifest.release_commit !== head
  )
    fail('signed tag, release commit, and checkout HEAD do not match');
  if (tag.signer_fingerprint !== manifest.tag.signer_fingerprint)
    fail('signed tag fingerprint mismatch');

  const repository = await observed.repository();
  if (repository.url !== manifest.repository.url || repository.visibility !== 'PUBLIC')
    fail('public repository observation mismatch');

  const release = await observed.githubRelease(manifest.tag.name);
  if (release.url !== manifest.github_release.url || release.tagName !== manifest.tag.name)
    fail('GitHub release observation mismatch');
  const releaseAsset = release.assets.find(
    (asset) => asset.name === manifest.github_release.asset_name
  );
  if (!releaseAsset) fail('GitHub release tarball asset is missing');
  const releaseAssetDigest = await observed.sha256Url(releaseAsset.url);
  if (releaseAssetDigest !== manifest.github_release.asset_sha256)
    fail('GitHub release tarball checksum mismatch');
  const checksumsAsset = release.assets.find(
    (asset) => asset.name === manifest.github_release.checksums_asset_name
  );
  if (!checksumsAsset) fail('GitHub release checksum asset is missing');
  const checksumLines = (await observed.textUrl(checksumsAsset.url)).trim().split(/\r?\n/);
  const expectedChecksum = `${manifest.github_release.asset_sha256}  ${manifest.github_release.asset_name}`;
  if (checksumLines.length !== 1 || checksumLines[0] !== expectedChecksum)
    fail('GitHub release checksum asset does not bind the tarball');

  const npm = await observed.npmPackage(`${manifest.package}@${manifest.version}`);
  const provenanceUrl = npm.attestations?.provenance?.url ?? npm.attestations?.url;
  if (
    npm.tarball !== manifest.npm.tarball_url ||
    npm.integrity !== manifest.npm.integrity ||
    provenanceUrl !== manifest.npm.provenance_url
  )
    fail('npm registry observation mismatch');
  const npmDigest = await observed.sha256Url(npm.tarball);
  if (npmDigest !== manifest.npm.sha256 || npmDigest !== manifest.github_release.asset_sha256)
    fail('npm and GitHub tarballs do not share the recorded checksum');

  for (const archive of [manifest.archives.zenodo, manifest.archives.software_heritage]) {
    if (!(await observed.reachable(archive.url))) fail(`archive is not reachable: ${archive.url}`);
  }

  return Object.freeze({
    releaseCommit: manifest.release_commit,
    tag: manifest.tag.name,
    package: `${manifest.package}@${manifest.version}`,
    checksum: manifest.npm.sha256,
  });
}

async function main() {
  if (process.argv.length !== 2) fail('usage: node scripts/verify-release.mjs');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const manifest = JSON.parse(
    await readFile(path.join(root, 'provenance/release-manifest.json'), 'utf8')
  );
  process.stdout.write(`${JSON.stringify(await verifyRelease({ root, manifest }))}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
