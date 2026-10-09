// @story #190
// Explicit installed-byte bootstrap. No broker, native build or source admission.
import { createHash, randomUUID } from 'node:crypto';
import {
  lstatSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  writeFileSync,
  renameSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  inspectPackageInventory,
  readBoundedOrdinaryFile,
  verifyRuntimeInventorySync,
} from '../startup/runtime-inventory.mjs';
import { assertRuntimeDependencyClosure } from './dependency-closure.mjs';
const ROOT = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const stamp = (file) => {
  const s = lstatSync(file, { bigint: true });
  return [s.dev, s.ino, s.size, s.mtimeNs, s.ctimeNs].map(String).join(':');
};
export async function bootstrapPortableInventory(options = {}) {
  if (
    !options ||
    Object.getPrototypeOf(options) !== Object.prototype ||
    Reflect.ownKeys(options).length
  )
    throw Error('portable-bootstrap-options-invalid');
  if (realpathSync(ROOT) !== ROOT) throw Error('portable-bootstrap-path-invalid');
  const original = inspectPackageInventory({ packageRoot: ROOT });
  if (original.entries.some((entry) => entry.path.startsWith('node_modules/'))) {
    const observation = verifyRuntimeInventorySync({ packageRoot: ROOT });
    return Object.freeze({
      status: 'already-bootstrapped',
      inventoryDigest: observation.inventoryDigest,
    });
  }
  const metadata = JSON.parse(readBoundedOrdinaryFile(path.join(ROOT, 'package.json'), 1048576));
  const files = original.entries.map(({ path: relative, sha256 }) => ({ path: relative, sha256 }));
  for (const [name, version] of Object.entries(metadata.dependencies ?? {})) {
    const file = path.join(ROOT, 'node_modules', name, 'package.json');
    const relative = path.relative(ROOT, realpathSync(file));
    if (
      relative.startsWith('..') ||
      path.isAbsolute(relative) ||
      JSON.parse(readBoundedOrdinaryFile(file, 1048576)).version !== version
    )
      throw Error('portable-bootstrap-dependency-mismatch');
  }
  assertRuntimeDependencyClosure(ROOT, {
    readMetadata: (relative) =>
      JSON.parse(readBoundedOrdinaryFile(path.join(ROOT, relative), 1048576)),
  });
  const links = [],
    observed = [];
  let visits = 0;
  function visit(relative) {
    const directory = path.join(ROOT, relative);
    if (lstatSync(directory).isSymbolicLink()) throw Error('portable-bootstrap-linked-directory');
    for (const name of readdirSync(directory)) {
      if (++visits > 16384) throw Error('portable-bootstrap-traversal-bound');
      const target = relative + '/' + name;
      const file = path.join(ROOT, target);
      const stat = lstatSync(file);
      if (stat.isSymbolicLink()) {
        if (
          !/^node_modules\/(?:.+\/node_modules\/)?\.bin\/[^/]+$/u.test(target) ||
          path.isAbsolute(readlinkSync(file))
        )
          throw Error('portable-bootstrap-linked-entry');
        links.push(file);
      } else if (stat.isDirectory()) visit(target);
      else if (stat.isFile() && (/\.(?:mjs|cjs|js|json|node)$/u.test(name) || stat.mode & 0o111)) {
        const before = stamp(file);
        const bytes = readBoundedOrdinaryFile(file, 16777216);
        if (stamp(file) !== before) throw Error('portable-bootstrap-dependency-changed');
        files.push({ path: target, sha256: digest(bytes) });
        observed.push({ file, stamp: before });
      } else if (!stat.isFile()) throw Error('portable-bootstrap-non-ordinary-entry');
    }
  }
  visit('node_modules');
  const declared = new Set(files.map((entry) => entry.path));
  for (const link of links) {
    const target = path.relative(ROOT, realpathSync(link)).split(path.sep).join('/');
    if (!target.startsWith('node_modules/') || !declared.has(target))
      throw Error('portable-bootstrap-link-outside-closure');
  }
  const current = inspectPackageInventory({ packageRoot: ROOT });
  if (
    current.manifestIdentity !== original.manifestIdentity ||
    current.inventoryDigest !== original.inventoryDigest ||
    current.entries.some((entry, index) => entry.identity !== original.entries[index]?.identity) ||
    observed.some((entry) => stamp(entry.file) !== entry.stamp)
  )
    throw Error('portable-bootstrap-source-changed');
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const bytes = JSON.stringify({ schema: 'ai-peer-review.runtime-inventory/v1', files }) + '\n';
  if (files.length > 4096 || Buffer.byteLength(bytes) > 1048576)
    throw Error('portable-bootstrap-inventory-bound');
  const target = path.join(ROOT, 'runtime-inventory.json');
  const temporary = target + '.' + randomUUID() + '.tmp';
  writeFileSync(temporary, bytes, { flag: 'wx', mode: 0o600 });
  try {
    renameSync(temporary, target);
  } catch (error) {
    error.obligations = [{ kind: 'inventory-publication', temporary }];
    throw error;
  }
  const observation = verifyRuntimeInventorySync({ packageRoot: ROOT });
  return Object.freeze({ status: 'bootstrapped', inventoryDigest: observation.inventoryDigest });
}
