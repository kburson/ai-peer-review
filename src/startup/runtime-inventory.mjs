// @story #133
import { createHash } from 'node:crypto';
import {
  lstatSync,
  realpathSync,
  readdirSync,
  openSync,
  closeSync,
  fstatSync,
  readSync,
  constants,
  readlinkSync,
} from 'node:fs';
import path from 'node:path';
import { AprError } from '../errors.mjs';

const observations = new WeakSet();
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const identity = (stat) =>
  [stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs].map(String).join(':');
function invalid(message) {
  throw new AprError('APR_RUNTIME_INVENTORY_INVALID', message, {
    recovery:
      'Complete or reinstall the selected global package, then retry from a fresh invocation.',
  });
}
export function readBoundedOrdinaryFile(file, maxBytes) {
  const pathStat = lstatSync(file, { bigint: true });
  if (!pathStat.isFile() || pathStat.isSymbolicLink() || pathStat.size > BigInt(maxBytes))
    invalid('Runtime reads require bounded ordinary files.');
  const descriptor = openSync(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const before = fstatSync(descriptor, { bigint: true });
    if (identity(before) !== identity(pathStat)) invalid('Runtime file changed before opening.');
    const buffer = Buffer.alloc(Number(before.size) + 1);
    let offset = 0;
    while (offset < buffer.length) {
      const count = readSync(descriptor, buffer, offset, buffer.length - offset, offset);
      if (count === 0) break;
      offset += count;
    }
    if (
      offset !== Number(before.size) ||
      offset > maxBytes ||
      identity(before) !== identity(fstatSync(descriptor, { bigint: true })) ||
      identity(before) !== identity(lstatSync(file, { bigint: true }))
    )
      invalid('Runtime file changed during its bounded read.');
    return buffer.subarray(0, offset);
  } finally {
    closeSync(descriptor);
  }
}
function ordinary(root, relative) {
  let file = root;
  for (const part of relative.split('/')) {
    file = path.join(file, part);
    if (lstatSync(file).isSymbolicLink()) invalid('Runtime inventory paths cannot contain links.');
  }
  const stat = lstatSync(file, { bigint: true });
  if (!stat.isFile() || stat.size > 16777216n)
    invalid('Runtime inventory requires bounded ordinary files.');
  return { file, stat };
}
function stableBytes(root, relative, maxBytes = 16777216) {
  const before = ordinary(root, relative);
  const bytes = readBoundedOrdinaryFile(before.file, maxBytes);
  const after = ordinary(root, relative);
  if (identity(before.stat) !== identity(after.stat))
    invalid('Installed files changed during observation.');
  return { bytes, identity: identity(after.stat) };
}
function inspectExecutableCoverage(root, files, diagnosticOnly = false) {
  const declared = new Set(files.map((entry) => entry.path));
  const directories = [];
  const links = [];
  let count = 0;
  function walk(relative = '') {
    const directory = path.join(root, relative);
    const before = lstatSync(directory, { bigint: true });
    if (before.isSymbolicLink() || !before.isDirectory())
      invalid('Runtime directories cannot be links.');
    for (const name of readdirSync(directory)) {
      if (++count > 16384) invalid('Installed inventory traversal exceeds its bound.');
      const target = relative ? `${relative}/${name}` : name;
      const stat = lstatSync(path.join(root, target));
      if (
        diagnosticOnly &&
        (target === 'node_modules' || target === 'native/broker-security/build')
      )
        continue;
      if (stat.isSymbolicLink()) {
        if (!/^node_modules\/(?:.+\/node_modules\/)?\.bin\/[^/]+$/.test(target))
          invalid('Installed runtime contains a linked file.');
        const resolved = realpathSync(path.join(root, target));
        const relativeTarget = path.relative(root, resolved).split(path.sep).join('/');
        if (
          !declared.has(relativeTarget) ||
          !relativeTarget.startsWith('node_modules/') ||
          readlinkSync(path.join(root, target)).startsWith('/')
        )
          invalid('npm command link does not target a declared dependency executable.');
        links.push(
          Object.freeze({
            path: target,
            identity: identity(lstatSync(path.join(root, target), { bigint: true })),
          })
        );
        continue;
      }
      if (stat.isDirectory()) walk(target);
      else if (
        (/\.(?:mjs|cjs|js|json|node)$/.test(name) || stat.mode & 0o111) &&
        target !== 'runtime-inventory.json' &&
        !declared.has(target)
      )
        invalid('Installed executable/asset is absent from the declared inventory.');
    }
    const after = lstatSync(directory, { bigint: true });
    if (identity(before) !== identity(after))
      invalid('Runtime directories changed during observation.');
    directories.push(Object.freeze({ path: relative, identity: identity(after) }));
  }
  walk();
  return { directories: Object.freeze(directories), links: Object.freeze(links) };
}
function observeRuntimeInventory({
  packageRoot,
  previousObservation,
  diagnosticOnly = false,
} = {}) {
  try {
    const root = realpathSync(packageRoot);
    if (root !== path.resolve(packageRoot)) invalid('Runtime package root must be canonical.');
    const matchesObservedPaths = (entries) =>
      entries.every(
        (entry) =>
          identity(lstatSync(path.join(root, entry.path), { bigint: true })) === entry.identity
      );
    if (
      !diagnosticOnly &&
      previousObservation &&
      observations.has(previousObservation) &&
      previousObservation.packageRoot === root &&
      identity(ordinary(root, 'runtime-inventory.json').stat) ===
        previousObservation.manifestIdentity &&
      matchesObservedPaths(previousObservation.directories) &&
      matchesObservedPaths(previousObservation.links) &&
      matchesObservedPaths(previousObservation.entries) &&
      matchesObservedPaths(previousObservation.links) &&
      matchesObservedPaths(previousObservation.directories) &&
      identity(ordinary(root, 'runtime-inventory.json').stat) ===
        previousObservation.manifestIdentity
    ) {
      const renewed = Object.freeze({
        ...previousObservation,
        observedAt: new Date().toISOString(),
      });
      observations.add(renewed);
      return renewed;
    }
    const manifest = stableBytes(root, 'runtime-inventory.json', 1048576);
    const parsed = JSON.parse(manifest.bytes);
    if (
      Object.keys(parsed).sort().join(',') !== 'files,schema' ||
      parsed.schema !== 'ai-peer-review.runtime-inventory/v1' ||
      !Array.isArray(parsed.files) ||
      !parsed.files.length ||
      parsed.files.length > 4096 ||
      manifest.bytes.length > 1048576
    )
      invalid('Runtime inventory schema is invalid.');
    const entries = [];
    let prior = '',
      total = 0;
    for (const entry of parsed.files) {
      if (
        Object.keys(entry).sort().join(',') !== 'path,sha256' ||
        typeof entry.path !== 'string' ||
        !entry.path ||
        entry.path.length > 512 ||
        entry.path <= prior ||
        entry.path.includes('\\') ||
        entry.path.split('/').some((p) => !p || p === '.' || p === '..') ||
        path.isAbsolute(entry.path) ||
        !/^[a-f0-9]{64}$/.test(entry.sha256)
      )
        invalid('Runtime inventory paths/digests must be sorted, unique and bounded.');
      const observed = stableBytes(root, entry.path);
      total += observed.bytes.length;
      if (total > 67108864 || hash(observed.bytes) !== entry.sha256)
        invalid('Runtime inventory bytes disagree with the installed manifest.');
      entries.push({ path: entry.path, sha256: entry.sha256, identity: observed.identity });
      prior = entry.path;
    }
    if (!entries.some((x) => x.path === 'package.json'))
      invalid('Runtime inventory must cover package metadata.');
    const metadata = JSON.parse(stableBytes(root, 'package.json').bytes);
    if (
      metadata.name !== '@kburson/ai-peer-review' ||
      typeof metadata.version !== 'string' ||
      !/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/.test(metadata.version)
    )
      invalid('Runtime package metadata is invalid.');
    if (!diagnosticOnly) {
      for (const [name, version] of Object.entries(metadata.dependencies ?? {})) {
        const dependency = 'node_modules/' + name + '/package.json';
        if (!entries.some((entry) => entry.path === dependency))
          invalid('Runtime dependency is outside the sealed installation closure.');
        if (JSON.parse(stableBytes(root, dependency, 1048576).bytes).version !== version)
          invalid('Runtime dependency disagrees with its installed metadata.');
      }
    }
    // Recheck every identity after the whole observation, rejecting mixed replacement.
    for (const entry of entries)
      if (identity(ordinary(root, entry.path).stat) !== entry.identity)
        invalid('Runtime inventory changed during verification.');
    if (stableBytes(root, 'runtime-inventory.json', 1048576).identity !== manifest.identity)
      invalid('Runtime manifest changed during verification.');
    const { directories, links } = inspectExecutableCoverage(root, parsed.files, diagnosticOnly);
    const inventoryDigest = hash(JSON.stringify(parsed));
    if (
      previousObservation &&
      (!observations.has(previousObservation) ||
        previousObservation.packageRoot !== root ||
        previousObservation.inventoryDigest !== inventoryDigest)
    ) {
      throw new AprError(
        'APR_RUNTIME_CHANGED',
        'The selected installation changed after the process observation.',
        {
          recovery:
            'Restart using the currently selected global installation; do not replay an old runtime image.',
        }
      );
    }
    const result = Object.freeze({
      packageRoot: root,
      packageVersion: metadata.version,
      inventoryDigest,
      entries: Object.freeze(entries.map(Object.freeze)),
      directories,
      links,
      manifestIdentity: manifest.identity,
      observedAt: new Date().toISOString(),
    });
    if (!diagnosticOnly) observations.add(result);
    return result;
  } catch (error) {
    if (error instanceof AprError) throw error;
    invalid('The declared installed runtime inventory is unavailable or malformed.');
  }
}

export function verifyRuntimeInventorySync({ packageRoot, previousObservation } = {}) {
  return observeRuntimeInventory({ packageRoot, previousObservation });
}
// Read-only package inspection never creates an admissible authority observation.
export function inspectPackageInventory({ packageRoot } = {}) {
  return observeRuntimeInventory({ packageRoot, diagnosticOnly: true });
}
export async function verifyRuntimeInventory(options) {
  return verifyRuntimeInventorySync(options);
}

export const isVerifiedRuntimeInventory = (value) => observations.has(value);
