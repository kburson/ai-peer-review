// @story #170
import { execFileSync } from 'node:child_process';
import { createHash, generateKeyPairSync, randomBytes } from 'node:crypto';
import {
  constants,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseRawJson } from '../../../src/api/canonical-json.mjs';
import { readBoundedOrdinaryFile } from '../../../src/startup/runtime-inventory.mjs';
import { processSourceContractDigest } from '../../../src/protocol/process-source-assurance.mjs';
import {
  processSourceRecordDigest,
  validateProcessSourcePackage,
  validateProcessSourceRegistration,
} from './records.mjs';
import { parseNpmPackOutput } from '../../helpers/npm-command.mjs';

const ROOT = realpathSync(fileURLToPath(new URL('../../../', import.meta.url)));
const hash = (bytes) => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const fail = (code) => {
  throw new Error(code);
};
function scratchPath(value) {
  if (typeof value !== 'string') fail('capture-scratch-path');
  const target = path.resolve(value);
  const prefix = path.join(ROOT, '.scratch', 'peer-review') + path.sep;
  if (!target.startsWith(prefix)) fail('capture-scratch-path');
  let cursor = ROOT;
  for (const part of path.relative(ROOT, path.dirname(target)).split(path.sep)) {
    cursor = path.join(cursor, part);
    let observed;
    try {
      observed = lstatSync(cursor);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      try {
        mkdirSync(cursor, { mode: 0o700 });
      } catch (created) {
        if (created.code !== 'EEXIST') throw created;
      }
      observed = lstatSync(cursor);
    }
    if (observed.isSymbolicLink() || !observed.isDirectory() || realpathSync(cursor) !== cursor)
      fail('capture-scratch-alias');
  }
  return target;
}
function fresh(file) {
  try {
    lstatSync(file);
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  fail('capture-output-exists');
}
function writePublic(file, value) {
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
function npmCli() {
  const executable = realpathSync(process.execPath);
  const choices = [
    process.env.npm_execpath,
    path.join(path.dirname(executable), 'node_modules/npm/bin/npm-cli.js'),
    path.join(path.dirname(executable), '../lib/node_modules/npm/bin/npm-cli.js'),
  ].filter(Boolean);
  const selected = choices.find((v) => existsSync(v) && lstatSync(v).isFile());
  if (!selected) fail('npm-cli-unavailable');
  return realpathSync(selected);
}
function npm(args, cwd) {
  return execFileSync(process.execPath, [npmCli(), ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, APR_SKIP_NATIVE_BROKER_TESTS: '1' },
  });
}
function git(args) {
  return execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', timeout: 30000 }).trim();
}
function sourceHead() {
  const manifest = parseRawJson(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const paths = ['package.json', 'scripts/pack-runtime.mjs', ...manifest.files];
  if (git(['status', '--porcelain', '--untracked-files=all', '--', ...paths]))
    fail('package-source-dirty');
  const head = git(['rev-parse', 'HEAD']);
  if (!/^[a-f0-9]{40}$/u.test(head)) fail('package-source-head');
  return head;
}
function archiveMembers(archive) {
  const tar = gunzipSync(archive, { maxOutputLength: 64 * 1024 * 1024 });
  const members = new Map();
  let offset = 0;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    if (members.size >= 16384) fail('package-archive-bound');
    const name = header.subarray(0, 100).toString('utf8').split('\0')[0];
    const prefix = header.subarray(345, 500).toString('utf8').split('\0')[0];
    const sizeText = header.subarray(124, 136).toString('ascii').replaceAll('\0', '').trim();
    const checksumText = header.subarray(148, 156).toString('ascii').replaceAll('\0', '').trim();
    const checksum = header.reduce((sum, byte, i) => sum + (i >= 148 && i < 156 ? 32 : byte), 0);
    if (
      !/^[0-7]+$/u.test(sizeText) ||
      !/^[0-7]+$/u.test(checksumText) ||
      Number.parseInt(checksumText, 8) !== checksum ||
      prefix ||
      ![0, 48].includes(header[156]) ||
      !name.startsWith('package/')
    )
      fail('package-archive-invalid');
    const relative = name.slice(8);
    if (
      !relative ||
      path.posix.normalize(relative) !== relative ||
      relative.split('/').some((part) => !part || part === '.' || part === '..') ||
      relative.includes('\\') ||
      members.has(relative)
    )
      fail('package-archive-path');
    const size = Number.parseInt(sizeText, 8);
    const start = offset + 512,
      end = start + size;
    if (!Number.isSafeInteger(size) || size > 16777216 || end > tar.length)
      fail('package-archive-size');
    members.set(relative, tar.subarray(start, end));
    offset = start + Math.ceil(size / 512) * 512;
  }
  if (!members.has('runtime-inventory.json')) fail('package-inventory-invalid');
  return members;
}
function archiveInventory(archive) {
  const inventory = parseRawJson(
    archiveMembers(archive).get('runtime-inventory.json').toString('utf8')
  );
  if (inventory.schema !== 'ai-peer-review.runtime-inventory/v1') fail('package-inventory-invalid');
  return hash(JSON.stringify(inventory));
}
function validateArchiveSource(archive, receipt) {
  const members = archiveMembers(archive);
  const inventory = parseRawJson(members.get('runtime-inventory.json').toString('utf8'));
  if (
    inventory.schema !== 'ai-peer-review.runtime-inventory/v1' ||
    Object.keys(inventory).sort().join(',') !== 'files,schema' ||
    !Array.isArray(inventory.files) ||
    inventory.files.length < 1 ||
    members.size !== inventory.files.length + 1 ||
    hash(JSON.stringify(inventory)) !== receipt.inventoryDigest
  )
    fail('package-source-mismatch');
  try {
    git(['merge-base', '--is-ancestor', receipt.sourceCommit, 'HEAD']);
  } catch {
    fail('package-source-mismatch');
  }
  const tree = new Map();
  for (const line of git(['ls-tree', '-r', '-z', receipt.sourceCommit])
    .split('\0')
    .filter(Boolean)) {
    const match = /^([0-7]{6}) blob ([a-f0-9]{40})\t([\s\S]+)$/u.exec(line);
    if (match) tree.set(match[3], { mode: match[1], oid: match[2] });
  }
  const wanted = new Map();
  let prior = '';
  for (const entry of inventory.files) {
    if (
      !entry ||
      Object.keys(entry).sort().join(',') !== 'path,sha256' ||
      typeof entry.path !== 'string' ||
      entry.path <= prior ||
      !/^[a-f0-9]{64}$/u.test(entry.sha256) ||
      !members.has(entry.path) ||
      hash(members.get(entry.path)).slice(7) !== entry.sha256
    )
      fail('package-source-mismatch');
    prior = entry.path;
    const source = tree.get(entry.path);
    if (!source || !['100644', '100755'].includes(source.mode)) fail('package-source-mismatch');
    wanted.set(entry.path, source.oid);
  }
  const ids = [...new Set(wanted.values())];
  const batch = execFileSync('git', ['-C', ROOT, 'cat-file', '--batch'], {
    input: ids.join('\n') + '\n',
    timeout: 30000,
    maxBuffer: 64 * 1024 * 1024,
  });
  const objects = new Map();
  let cursor = 0;
  for (const oid of ids) {
    const newline = batch.indexOf(10, cursor);
    const header = batch.subarray(cursor, newline).toString('ascii');
    const match = /^([a-f0-9]{40}) blob ([0-9]+)$/u.exec(header);
    if (newline < 0 || !match || match[1] !== oid) fail('package-source-mismatch');
    const size = Number(match[2]),
      start = newline + 1,
      end = start + size;
    if (!Number.isSafeInteger(size) || size > 16777216 || end >= batch.length || batch[end] !== 10)
      fail('package-source-mismatch');
    objects.set(oid, batch.subarray(start, end));
    cursor = end + 1;
  }
  const original = parseRawJson(objects.get(wanted.get('package.json')).toString('utf8'));
  const files = original.files.filter(
    (entry) =>
      !['docs/', 'scripts/verify-extraction.mjs', 'scripts/verify-release.mjs'].includes(entry)
  );
  files.push(
    'docs/releases/',
    'docs/dependency-audit-mcp.md',
    'docs/dependency-audit-broker-build.md',
    'docs/manual-cross-provider-peer-review.md',
    'docs/claude-launch-api-migration.md',
    'docs/spdx-policy.md'
  );
  const expected = { ...original };
  delete expected.devDependencies;
  delete expected.scripts;
  delete expected.files;
  expected.scripts = {
    'build:broker-security': original.scripts['build:broker-security'],
    'verify:deployment': 'node bin/verify-deployment.mjs',
  };
  expected.files = [...files, 'runtime-inventory.json'];
  if (
    processSourceRecordDigest(parseRawJson(members.get('package.json').toString('utf8'))) !==
    processSourceRecordDigest(expected)
  )
    fail('package-source-mismatch');
  for (const [relative, oid] of wanted) {
    if (relative !== 'package.json' && !members.get(relative).equals(objects.get(oid)))
      fail('package-source-mismatch');
  }
  return members;
}
function inspectInstalledMembers(installation, members) {
  try {
    const root = path.resolve(installation);
    if (realpathSync(root) !== root) fail('package-installed-source-mismatch');
    for (const [relative, bytes] of members) {
      let current = root;
      const parts = relative.split('/');
      for (let i = 0; i < parts.length; i += 1) {
        current = path.join(current, parts[i]);
        const metadata = lstatSync(current);
        if (
          metadata.isSymbolicLink() ||
          (i < parts.length - 1 ? !metadata.isDirectory() : !metadata.isFile())
        )
          fail('package-installed-source-mismatch');
      }
      if (!readBoundedOrdinaryFile(current, 16777216).equals(bytes))
        fail('package-installed-source-mismatch');
    }
  } catch {
    fail('package-installed-source-mismatch');
  }
}
export function inspectInstalledCandidateSource({ packagePath, installation } = {}) {
  const archive = scratchPath(packagePath);
  const receipt = parseRawJson(
    readBoundedOrdinaryFile(archive + '.receipt.json', 1048576).toString('utf8')
  );
  validateProcessSourcePackage(receipt);
  const bytes = readBoundedOrdinaryFile(archive, 16777216);
  if (hash(bytes) !== receipt.tarballDigest) fail('package-digest-mismatch');
  inspectInstalledMembers(installation, validateArchiveSource(bytes, receipt));
  return Object.freeze({ verified: false, sourceMatched: true, package: receipt });
}

export async function packProcessSourceCandidate({ output } = {}) {
  const target = scratchPath(output);
  fresh(target);
  fresh(target + '.receipt.json');
  const sourceCommit = sourceHead();
  const contractDigest = await processSourceContractDigest();
  const stage = mkdtempSync(path.join(path.dirname(target), 'pack-stage-'));
  try {
    const report = parseNpmPackOutput(
      execFileSync(
        process.execPath,
        [path.join(ROOT, 'scripts/pack-runtime.mjs'), '--json', '--pack-destination', stage],
        {
          cwd: ROOT,
          encoding: 'utf8',
          timeout: 120000,
          env: { ...process.env, npm_execpath: npmCli(), APR_SKIP_NATIVE_BROKER_TESTS: '1' },
        }
      ),
      { expectedPackageName: '@kburson/ai-peer-review', requireFilename: true }
    );
    const source = path.join(stage, report.filename);
    const bytes = readFileSync(source);
    if (sourceHead() !== sourceCommit || (await processSourceContractDigest()) !== contractDigest)
      fail('package-source-changed');
    const receipt = {
      schema: 'ai-peer-review.process-source-package/v1',
      sourceCommit,
      tarballDigest: hash(bytes),
      inventoryDigest: archiveInventory(bytes),
      contractDigest,
    };
    validateProcessSourcePackage(receipt);
    copyFileSync(source, target, constants.COPYFILE_EXCL);
    if (hash(readFileSync(target)) !== receipt.tarballDigest) fail('package-copy-changed');
    writePublic(target + '.receipt.json', receipt);
    return { verified: false, mode: 'packed', output: target, package: receipt };
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}
export async function bindProcessSourceCandidate({ packagePath, binding } = {}) {
  const archive = scratchPath(packagePath);
  const bindingFile = scratchPath(binding);
  fresh(bindingFile);
  fresh(bindingFile + '.registration.json');
  const receipt = parseRawJson(readFileSync(archive + '.receipt.json', 'utf8'));
  validateProcessSourcePackage(receipt);
  if (hash(readFileSync(archive)) !== receipt.tarballDigest) fail('package-digest-mismatch');
  const archiveBytes = readBoundedOrdinaryFile(archive, 16777216);
  const approvedMembers = validateArchiveSource(archiveBytes, receipt);
  const captureId = 'source-' + randomBytes(16).toString('hex');
  const installPrefix = path.join(path.dirname(bindingFile), captureId + '-installation');
  mkdirSync(installPrefix, { mode: 0o700 });
  const pinnedArchive = path.join(installPrefix, 'candidate.tgz');
  writeFileSync(pinnedArchive, archiveBytes, { flag: 'wx', mode: 0o600 });
  npm(
    [
      'install',
      '--global',
      '--prefix',
      installPrefix,
      '--offline',
      '--omit=dev',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      pinnedArchive,
    ],
    installPrefix
  );
  const installation = realpathSync(
    path.join(
      installPrefix,
      ...(process.platform === 'win32' ? [] : ['lib']),
      'node_modules/@kburson/ai-peer-review'
    )
  );
  inspectInstalledMembers(installation, approvedMembers);
  const load = (relative) => import(pathToFileURL(path.join(installation, relative)).href);
  const inventoryApi = await load('src/startup/runtime-inventory.mjs');
  const inventory = inventoryApi.inspectPackageInventory({ packageRoot: installation });
  const sourceApi = await load('src/protocol/process-source-assurance.mjs');
  if (
    'sha256:' + inventory.inventoryDigest !== receipt.inventoryDigest ||
    (await sourceApi.processSourceContractDigest()) !== receipt.contractDigest
  )
    fail('package-loaded-source-mismatch');
  const context = { signal: new AbortController().signal, deadline: performance.now() + 30000 };
  const identity = await load('src/protocol/process-identity.mjs');
  const probe = await identity.observeProcessSourceContext(context);
  if (!probe) fail('package-probe-unclassified');
  const hostId = await identity.observeExecutionHostIdentity(context);
  if (!/^sha256:[a-f0-9]{64}$/u.test(hostId ?? '')) fail('package-host-unclassified');
  const protection = await load('src/broker/storage-protection.mjs');
  const privateRoot = path.join(path.dirname(bindingFile), captureId + '-private');
  const protectedReceipt = await protection.provisionProtectedRoot({
    root: privateRoot,
    ...context,
  });
  const guard = await protection.openProtectedRoot({ receipt: protectedReceipt, ...context });
  let keyGeneration, registration;
  const privateKeyName = 'signing-key.pem';
  try {
    const keys = generateKeyPairSync('ed25519');
    const publicBytes = keys.publicKey.export({ type: 'spki', format: 'der' });
    const privateBytes = keys.privateKey.export({ type: 'pkcs8', format: 'pem' });
    await guard.writeExclusive(privateKeyName, Buffer.from(privateBytes));
    const snapshot = await guard.readSnapshot(privateKeyName);
    keyGeneration = {
      identity: snapshot.identity,
      fileVersion: snapshot.fileVersion,
      rootIdentity: snapshot.rootIdentity,
    };
    registration = {
      schema: 'ai-peer-review.process-source-registration/v1',
      captureId,
      hostId,
      publicKey: publicBytes.toString('base64'),
      keyId: hash(publicBytes),
      package: receipt,
      scope: {
        platform: process.platform,
        build: (await import('node:os')).default.release(),
        architecture: process.arch,
        nodeMajor: Number(process.versions.node.split('.')[0]),
        probe,
      },
      kinds: ['absence'],
      transitions: [],
    };
    validateProcessSourceRegistration(registration);
    const currentInventory = inventoryApi.inspectPackageInventory({ packageRoot: installation });
    if (
      currentInventory.inventoryDigest !== inventory.inventoryDigest ||
      currentInventory.entries.some(
        (entry, index) => entry.identity !== inventory.entries[index]?.identity
      )
    )
      fail('package-loaded-source-changed');
    if (
      (await sourceApi.processSourceContractDigest()) !== receipt.contractDigest ||
      hash(readFileSync(archive)) !== receipt.tarballDigest
    )
      fail('package-binding-changed');
  } finally {
    await guard.close();
  }
  writePublic(bindingFile + '.registration.json', registration);
  writePublic(bindingFile, {
    schema: 'ai-peer-review.process-source-binding/v1',
    verified: false,
    runtimeAuthority: 'unavailable',
    captureId,
    hostId,
    package: receipt,
    packagePath: archive,
    installation,
    privateRoot,
    privateKeyName,
    keyGeneration,
    registrationPath: bindingFile + '.registration.json',
  });
  return {
    verified: false,
    mode: 'bound',
    binding: bindingFile,
    registration: bindingFile + '.registration.json',
    captureId,
  };
}
