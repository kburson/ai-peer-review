// @story #137
import { existsSync, realpathSync, lstatSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { AprError } from '../errors.mjs';

// Follow Node's package lookup directories without loading dependency code.
// Optional packages may be absent, but any available package must be sealed.
export function assertRuntimeDependencyClosure(packageRoot, { readMetadata, isDeclared } = {}) {
  const root = realpathSync(packageRoot);
  const pending = [path.join(root, 'package.json')];
  const seen = new Set();
  function invalid(message) {
    throw new AprError('APR_RUNTIME_INVENTORY_INVALID', message, {
      recovery: 'Reinstall the selected global package with its complete runtime dependencies.',
    });
  }
  while (pending.length) {
    const file = pending.pop();
    if (seen.has(file)) continue;
    if (seen.size >= 4096) invalid('Runtime dependency graph exceeds its bound.');
    seen.add(file);
    const metadata = readMetadata(path.relative(root, file).split(path.sep).join('/'));
    const dependencies = new Map();
    for (const [name, version] of Object.entries(metadata.dependencies ?? {}))
      dependencies.set(name, { version, optional: false });
    for (const [name, version] of Object.entries(metadata.peerDependencies ?? {}))
      if (!dependencies.has(name))
        dependencies.set(name, {
          version,
          optional: metadata.peerDependenciesMeta?.[name]?.optional === true,
        });
    for (const [name, version] of Object.entries(metadata.optionalDependencies ?? {}))
      dependencies.set(name, { version, optional: true });
    const resolver = createRequire(file);
    for (const [name, requirement] of dependencies) {
      if (
        !/^(?:@[a-zA-Z0-9._-]+\/)?[a-zA-Z0-9._-]+$/.test(name) ||
        name.split('/').some((part) => part === '.' || part === '..') ||
        typeof requirement.version !== 'string'
      )
        invalid('Runtime dependency metadata is invalid.');
      let executable = null;
      try {
        executable = resolver.resolve(name);
      } catch (error) {
        // SDK/subpath-only and type-only packages need not expose a root entry.
        if (!['MODULE_NOT_FOUND', 'ERR_PACKAGE_PATH_NOT_EXPORTED'].includes(error.code))
          invalid('Runtime dependency entrypoint cannot be resolved safely: ' + name);
      }
      if (executable && path.isAbsolute(executable)) {
        const physicalEntry = realpathSync(executable);
        const entry = path.relative(root, physicalEntry).split(path.sep).join('/');
        if (
          entry === '..' ||
          entry.startsWith('../') ||
          path.isAbsolute(entry) ||
          (isDeclared && !isDeclared(entry))
        )
          invalid(
            'Runtime dependency entrypoint is outside the sealed installation closure: ' + name
          );
      }
      let candidate;
      for (const directory of resolver.resolve.paths(name) ?? []) {
        const target = path.join(directory, name);
        if (
          [target, target + '.js', target + '.json', target + '.node'].some(
            (value) => existsSync(value) && lstatSync(value).isFile()
          )
        )
          invalid('Runtime dependency resolves without sealed package metadata: ' + name);
        const manifest = path.join(target, 'package.json');
        if (existsSync(manifest)) {
          candidate = manifest;
          break;
        }
      }
      if (!candidate) {
        if (executable && path.isAbsolute(executable))
          invalid('Runtime dependency entrypoint has no sealed package metadata: ' + name);
        if (requirement.optional) continue;
        invalid('Required runtime dependency is unavailable: ' + name);
      }
      const physical = realpathSync(candidate);
      const relative = path.relative(root, physical).split(path.sep).join('/');
      if (
        physical !== path.resolve(candidate) ||
        relative === '..' ||
        relative.startsWith('../') ||
        path.isAbsolute(relative) ||
        (isDeclared && !isDeclared(relative))
      )
        invalid('Runtime dependency is outside the sealed installation closure: ' + name);
      pending.push(physical);
    }
  }
}
