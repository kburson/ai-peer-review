// @story #137
import { createHash, randomUUID } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  readlinkSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { inspectPackageInventory, readBoundedOrdinaryFile } from '../startup/runtime-inventory.mjs';
const digest = (file) =>
  createHash('sha256').update(readBoundedOrdinaryFile(file, 16777216)).digest('hex');
export function prepareNativeInventory(packageRoot) {
  const file = path.join(packageRoot, 'runtime-inventory.json');
  if (!existsSync(file)) {
    if (!existsSync(path.join(packageRoot, '.git')))
      throw new Error('Installed native build requires its shipped inventory.');
    return null;
  }
  const observed = inspectPackageInventory({ packageRoot });
  const metadata = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
  for (const [name, version] of Object.entries(metadata.dependencies ?? {})) {
    const dependency = path.join(packageRoot, 'node_modules', name, 'package.json');
    if (!existsSync(dependency))
      throw new Error('Runtime dependency must remain inside the installed closure: ' + name);
    const relative = path.relative(packageRoot, realpathSync(dependency));
    if (relative.startsWith('..') || path.isAbsolute(relative))
      throw new Error('Runtime dependency leaves its installed closure: ' + name);
    if (JSON.parse(readBoundedOrdinaryFile(dependency, 1048576)).version !== version)
      throw new Error('Missing or mismatched installed runtime dependency: ' + name);
  }
  return observed.entries.filter(
    (entry) =>
      !entry.path.startsWith('native/broker-security/build/') &&
      !entry.path.startsWith('node_modules/')
  );
}
export function finishNativeInventory(packageRoot, originalEntries) {
  if (originalEntries === null) return;
  for (const entry of originalEntries)
    if (digest(path.join(packageRoot, entry.path)) !== entry.sha256)
      throw new Error('Package changed during native bootstrap: ' + entry.path);
  const files = originalEntries.map(({ path: name, sha256 }) => ({ path: name, sha256 }));
  const links = [];
  let visits = 0;
  function visit(relative) {
    const directory = path.join(packageRoot, relative);
    if (lstatSync(directory).isSymbolicLink()) throw new Error('Dependency directory is linked.');
    for (const name of readdirSync(directory)) {
      if (++visits > 16384) throw new Error('Installed dependency inventory exceeds its bound.');
      const target = relative + '/' + name;
      const file = path.join(packageRoot, target);
      const stat = lstatSync(file);
      if (stat.isSymbolicLink()) {
        if (
          !/^node_modules\/(?:.+\/node_modules\/)?\.bin\/[^/]+$/.test(target) ||
          path.isAbsolute(readlinkSync(file))
        )
          throw new Error('Installed dependency has an unsafe link: ' + target);
        links.push(file);
      } else if (stat.isDirectory()) visit(target);
      else if (stat.isFile() && (/\.(?:mjs|cjs|js|json|node)$/.test(name) || stat.mode & 0o111))
        files.push({ path: target, sha256: digest(file) });
      else if (!stat.isFile()) throw new Error('Installed dependency has an unsafe entry.');
    }
  }
  if (existsSync(path.join(packageRoot, 'node_modules'))) visit('node_modules');
  for (const name of ['broker_security.node', 'build-identity.json']) {
    const relative = 'native/broker-security/build/Release/' + name;
    files.push({ path: relative, sha256: digest(path.join(packageRoot, relative)) });
  }
  const declared = new Set(files.map((entry) => entry.path));
  for (const file of links) {
    const target = path.relative(packageRoot, realpathSync(file)).split(path.sep).join('/');
    if (!target.startsWith('node_modules/') || !declared.has(target))
      throw new Error('npm command link leaves the sealed executable dependency closure.');
  }
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const bytes = JSON.stringify({ schema: 'ai-peer-review.runtime-inventory/v1', files }) + '\n';
  if (files.length > 4096 || Buffer.byteLength(bytes) > 1048576)
    throw new Error('Native inventory exceeds its closed bounds.');
  const file = path.join(packageRoot, 'runtime-inventory.json');
  const temporary = file + '.' + randomUUID() + '.tmp';
  writeFileSync(temporary, bytes, { flag: 'wx', mode: 0o600 });
  renameSync(temporary, file);
}
