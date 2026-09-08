#!/usr/bin/env node

import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const SHA256_RE = /^[a-f0-9]{64}$/;
const GIT_SHA_RE = /^[a-f0-9]{40}$/;
const AUTHORIZATION_STATEMENT =
  'I, Kendrick Burson, as copyright holder, approve relicensing the extracted ai-peer-review code covered by AITM source commit 4b3bcd43cba141a611da4a2b861433b915462806 under Apache-2.0, accept the proprietary-fork consequence, and authorize use of my existing SSH Ed25519 key to sign the declaration and proceed with public publication.';

export const EXPECTED_HOLDER_IDENTITIES = Object.freeze([
  'kendrick burson <kpburson@pm.me>',
  'Kendrick Burson <spam.kpb@gmail.com>',
]);

function isPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function matchesClosedGlob(pathname, pattern) {
  if (pattern === 'scripts/tests/**/*co-review*') {
    return pathname.startsWith('scripts/tests/') && pathname.slice('scripts/tests/'.length).includes('co-review');
  }
  for (const kind of ['specs', 'plans']) {
    if (pattern === `docs/superpowers/${kind}/*co-review*`) {
      const prefix = `docs/superpowers/${kind}/`;
      const remainder = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : '';
      return remainder !== '' && !remainder.includes('/') && remainder.includes('co-review');
    }
  }
  throw new TypeError(`unsupported retained glob: ${pattern}`);
}

export function matchesRetainedRule(pathname, rules) {
  return (
    rules.exact.includes(pathname) ||
    rules.prefixes.some((prefix) => isPrefix(pathname, prefix)) ||
    rules.globs.some((glob) => matchesClosedGlob(pathname, glob))
  );
}

function matchesLegacyRule(pathname, rules) {
  return (
    rules.prefixes.some((prefix) => isPrefix(pathname, prefix)) ||
    rules.globs.some((glob) => matchesClosedGlob(pathname, glob))
  );
}

export function assertStandaloneLayout(currentPaths, {
  standaloneRules,
  legacyRules,
  requireLegacyRemoved = false,
}) {
  const paths = String(currentPaths).split('\n').filter(Boolean);
  const legacy = paths.filter((pathname) => matchesLegacyRule(pathname, legacyRules));
  if (requireLegacyRemoved && legacy.length) {
    throw new Error(`legacy retained paths: ${legacy.join(', ')}`);
  }
  const foreign = paths.filter(
    (pathname) =>
      !standaloneRules.exact.includes(pathname) &&
      !standaloneRules.prefixes.some((prefix) => isPrefix(pathname, prefix)) &&
      !(legacy.length && matchesLegacyRule(pathname, legacyRules))
  );
  if (foreign.length) throw new Error(`foreign standalone paths: ${foreign.join(', ')}`);
}

function assertDigest(value, label) {
  if (!SHA256_RE.test(value ?? '')) throw new Error(`${label} must be a SHA-256 digest`);
}

export function canonicalRelicensingPayload(declaration) {
  assert.equal(
    declaration.schema,
    'ai-peer-review.relicensing-declaration/v1',
    'relicensing declaration schema'
  );
  assert.equal(declaration.copyright_holder, 'Kendrick Burson', 'copyright holder');
  assert.equal(
    declaration.covered_source_repository,
    'https://github.com/kburson/ai-task-manager',
    'covered source repository'
  );
  assert.equal(
    declaration.covered_source_commit,
    '4b3bcd43cba141a611da4a2b861433b915462806',
    'covered source commit'
  );
  assert.equal(declaration.license_grant, 'Apache-2.0', 'license grant');
  assert.equal(
    declaration.proprietary_fork_consequence_accepted,
    true,
    'proprietary fork consequence acceptance'
  );
  assert.equal(declaration.authorization_statement, AUTHORIZATION_STATEMENT, 'authorization statement');
  assert.equal(declaration.signature_type, 'ssh-ed25519', 'signature type');
  assert.equal(
    declaration.signature_namespace,
    'ai-peer-review-relicensing',
    'signature namespace'
  );
  assert.equal(declaration.signer_identity, 'copyright-holder', 'signer identity');
  if (!/^ssh-ed25519 [A-Za-z0-9+/=]+(?: .*)?$/.test(declaration.signer_public_key ?? '')) {
    throw new Error('signer public key must be an SSH Ed25519 public key');
  }
  if (!/^SHA256:[A-Za-z0-9+/]+$/.test(declaration.signer_fingerprint ?? '')) {
    throw new Error('signer fingerprint must be an SSH SHA-256 fingerprint');
  }
  if (Number.isNaN(Date.parse(declaration.signed_at ?? ''))) {
    throw new Error('signed at must be an ISO-8601 timestamp');
  }

  const payload = {
    schema: declaration.schema,
    copyright_holder: declaration.copyright_holder,
    covered_source_repository: declaration.covered_source_repository,
    covered_source_commit: declaration.covered_source_commit,
    license_grant: declaration.license_grant,
    proprietary_fork_consequence_accepted: declaration.proprietary_fork_consequence_accepted,
    authorization_statement: declaration.authorization_statement,
    signature_type: declaration.signature_type,
    signature_namespace: declaration.signature_namespace,
    signer_identity: declaration.signer_identity,
    signer_public_key: declaration.signer_public_key,
    signer_fingerprint: declaration.signer_fingerprint,
    signed_at: declaration.signed_at,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

async function runSshVerify({
  identity,
  namespace,
  publicKey,
  signature,
  payload,
  scratchRoot,
}) {
  const scratchParent = path.join(scratchRoot, '.scratch', 'peer-review');
  await mkdir(scratchParent, { recursive: true });
  const tempRoot = await mkdtemp(path.join(scratchParent, 'signature-'));
  const allowedSignersPath = path.join(tempRoot, 'allowed_signers');
  const signaturePath = path.join(tempRoot, 'declaration.sig');
  try {
    await writeFile(allowedSignersPath, `${identity} ${publicKey}\n`, { mode: 0o600 });
    await writeFile(signaturePath, signature, { mode: 0o600 });
    await new Promise((resolve, reject) => {
      const child = spawn(
        'ssh-keygen',
        [
          '-Y',
          'verify',
          '-f',
          allowedSignersPath,
          '-I',
          identity,
          '-n',
          namespace,
          '-s',
          signaturePath,
        ],
        { stdio: ['pipe', 'pipe', 'pipe'] }
      );
      let stdout = '';
      let stderr = '';
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk) => (stdout += chunk));
      child.stderr.on('data', (chunk) => (stderr += chunk));
      child.once('error', reject);
      child.once('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`SSH signature verification failed: ${stderr || stdout}`.trim()));
      });
      child.stdin.end(payload);
    });
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

export async function verifyRelicensingDeclaration({
  root = process.cwd(),
  declarationBytes,
  runSshVerify: verifySignature = runSshVerify,
}) {
  const declaration = JSON.parse(Buffer.from(declarationBytes).toString('utf8'));
  const payload = canonicalRelicensingPayload(declaration);
  if (
    typeof declaration.signature !== 'string' ||
    !declaration.signature.startsWith('-----BEGIN SSH SIGNATURE-----\n') ||
    !declaration.signature.endsWith('-----END SSH SIGNATURE-----\n')
  ) {
    throw new Error('signature must be an armored SSH signature');
  }
  await verifySignature({
    identity: declaration.signer_identity,
    namespace: declaration.signature_namespace,
    publicKey: declaration.signer_public_key,
    signature: declaration.signature,
    payload,
    scratchRoot: root,
  });
  return createHash('sha256').update(declarationBytes).digest('hex');
}

function validateManifest(manifest) {
  assert.equal(manifest.schema, 'ai-peer-review.extraction/v1', 'extraction manifest schema');
  if (!GIT_SHA_RE.test(manifest.source_commit ?? '')) throw new Error('source commit is malformed');
  if (!GIT_SHA_RE.test(manifest.filtered_history_tip ?? '')) {
    throw new Error('filtered history tip is malformed');
  }
  if (
    !Array.isArray(manifest.prefilter_ref_inventory) ||
    manifest.prefilter_ref_inventory.length !== 1 ||
    manifest.prefilter_ref_inventory[0]?.ref !== 'refs/heads/extraction-source' ||
    manifest.prefilter_ref_inventory[0]?.object !== manifest.source_commit
  ) {
    throw new Error('prefilter ref inventory must contain only the ratified source ref');
  }
  if (
    !Array.isArray(manifest.retained_path_inventory?.paths) ||
    manifest.retained_path_inventory.paths.length === 0
  ) {
    throw new Error('retained path inventory must be non-empty');
  }
  assertDigest(manifest.retained_path_inventory.digest, 'retained path inventory digest');
  if (
    !Array.isArray(manifest.contributor_audit?.normalized_result) ||
    JSON.stringify(manifest.contributor_audit.normalized_result) !==
      JSON.stringify(EXPECTED_HOLDER_IDENTITIES)
  ) {
    throw new Error('contributor audit does not match expected holder identities');
  }
  assertDigest(manifest.contributor_audit.digest, 'contributor audit digest');
  if (manifest.secret_scan?.tool !== 'gitleaks') throw new Error('secret scan tool must be gitleaks');
  if (!/^\d+\.\d+\.\d+/.test(manifest.secret_scan?.tool_version ?? '')) {
    throw new Error('secret scan version is missing or malformed');
  }
  if (manifest.secret_scan?.result !== 'pass') throw new Error('secret scan result must be pass');
  assertDigest(manifest.secret_scan.config_digest, 'secret scan config digest');
  assertDigest(manifest.secret_scan.report_digest, 'secret scan report digest');
  if (!GIT_SHA_RE.test(manifest.secret_scan.scanned_ref ?? '')) {
    throw new Error('secret scan ref is missing or malformed');
  }
  assertDigest(manifest.relicensing_declaration_digest, 'relicensing declaration digest');
}

export async function verifyExtraction({
  root,
  manifest,
  runGit,
  requireLegacyRemoved = false,
}) {
  validateManifest(manifest);
  const paths = await runGit(root, [
    'log',
    manifest.filtered_history_tip,
    '--name-only',
    '--format=',
  ]);
  const foreign = [...new Set(paths.split('\n').filter(Boolean))].filter(
    (file) => !matchesRetainedRule(file, manifest.retained_path_rules)
  );
  if (foreign.length) throw new Error(`foreign retained paths: ${foreign.join(', ')}`);
  const currentPaths = await runGit(root, ['ls-tree', '-r', '--name-only', 'HEAD']);
  assertStandaloneLayout(currentPaths, {
    standaloneRules: manifest.standalone_path_rules,
    legacyRules: manifest.legacy_retained_path_rules,
    requireLegacyRemoved,
  });
  return Object.freeze({
    sourceCommit: manifest.source_commit,
    filteredTip: manifest.filtered_history_tip,
  });
}

async function runGit(root, args) {
  const { stdout } = await execFileAsync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--require-legacy-removed') || args.length > 1) {
    throw new Error('usage: node scripts/verify-extraction.mjs [--require-legacy-removed]');
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const manifest = JSON.parse(
    await readFile(path.join(root, 'provenance/extraction-manifest.json'), 'utf8')
  );
  const declarationBytes = await readFile(
    path.join(root, 'provenance/relicensing-declaration.json')
  );
  const declarationDigest = await verifyRelicensingDeclaration({ root, declarationBytes });
  if (declarationDigest !== manifest.relicensing_declaration_digest) {
    throw new Error('relicensing declaration digest does not match manifest');
  }
  const result = await verifyExtraction({
    root,
    manifest,
    runGit,
    requireLegacyRemoved: args[0] === '--require-legacy-removed',
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
