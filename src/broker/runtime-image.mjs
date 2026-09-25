import { createHash, randomUUID } from 'node:crypto';
import {
  chmodSync,
  closeSync,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import { AprError } from '../errors.mjs';

const IMAGE_SCHEMA = 'ai-peer-review.runtime-image/v1';
const MANIFEST_FILE = 'runtime-image.json';

function failure(code, message, recovery, details = {}, cause) {
  const error = new AprError(code, message, { recovery, details });
  if (cause !== undefined) error.cause = cause;
  return error;
}

function digest(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function contained(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return (
    relative !== '' &&
    !relative.startsWith(`..${path.sep}`) &&
    relative !== '..' &&
    !path.isAbsolute(relative)
  );
}

function samePhysicalPath(value) {
  try {
    return realpathSync(value) === value;
  } catch {
    return false;
  }
}

function ensureCanonicalDirectory(directory, label) {
  const missing = [];
  let existing = directory;
  while (!existsSync(existing)) {
    missing.unshift(existing);
    const parent = path.dirname(existing);
    if (parent === existing) break;
    existing = parent;
  }
  directoryStatus(existing, label);
  if (!samePhysicalPath(existing)) {
    throw failure(
      'APR_RUNTIME_IMAGE_INVALID',
      `${label} has a symbolic-link or noncanonical ancestor.`,
      'Use the exact non-symlink package-owned project cache directory.',
      { directory }
    );
  }
  for (const child of missing) {
    mkdirSync(child, { mode: 0o700 });
    directoryStatus(child, label);
    if (!samePhysicalPath(child)) {
      throw failure(
        'APR_RUNTIME_IMAGE_INVALID',
        `${label} changed to a symbolic-link or noncanonical path while it was created.`,
        'Preserve the path for inspection and retry only with an exact owned directory.',
        { directory: child }
      );
    }
  }
}

function regularFile(file, label) {
  let status;
  try {
    status = lstatSync(file);
  } catch (cause) {
    throw failure(
      'APR_RUNTIME_IMAGE_INVALID',
      `${label} is missing or unreadable.`,
      'Restore the complete installed package and selected Node executable, then retry.',
      { file },
      cause
    );
  }
  if (status.isSymbolicLink()) {
    throw failure(
      'APR_RUNTIME_IMAGE_INVALID',
      `${label} cannot be a symbolic link.`,
      'Use an installed package whose runtime closure contains only owned regular files and directories.',
      { file }
    );
  }
  if (!status.isFile()) {
    throw failure(
      'APR_RUNTIME_IMAGE_INVALID',
      `${label} must be a regular file.`,
      'Restore the complete installed package and selected Node executable, then retry.',
      { file }
    );
  }
  return status;
}

function directoryStatus(directory, label) {
  let status;
  try {
    status = lstatSync(directory);
  } catch (cause) {
    throw failure(
      'APR_RUNTIME_IMAGE_INVALID',
      `${label} is missing or unreadable.`,
      'Restore the complete installed package and retry.',
      { directory },
      cause
    );
  }
  if (status.isSymbolicLink()) {
    throw failure(
      'APR_RUNTIME_IMAGE_INVALID',
      `${label} cannot be a symbolic link.`,
      'Use an installed package whose runtime closure contains only owned regular files and directories.',
      { directory }
    );
  }
  if (!status.isDirectory()) {
    throw failure(
      'APR_RUNTIME_IMAGE_INVALID',
      `${label} must be a directory.`,
      'Restore the complete installed package and retry.',
      { directory }
    );
  }
  return status;
}

function parsePackage(packageDirectory) {
  const manifestFile = path.join(packageDirectory, 'package.json');
  regularFile(manifestFile, 'Package manifest');
  let value;
  try {
    value = JSON.parse(readFileSync(manifestFile, 'utf8'));
  } catch (cause) {
    throw failure(
      'APR_RUNTIME_IMAGE_INVALID',
      'Package manifest is not valid JSON.',
      'Restore the exact installed package and retry.',
      { manifestFile },
      cause
    );
  }
  if (
    !value ||
    typeof value !== 'object' ||
    typeof value.name !== 'string' ||
    typeof value.version !== 'string'
  ) {
    throw failure(
      'APR_RUNTIME_IMAGE_INVALID',
      'Package manifest is missing its exact name or version.',
      'Restore the exact installed package and retry.',
      { manifestFile }
    );
  }
  return value;
}

function entrypointFor(manifest) {
  if (typeof manifest.bin === 'string') return manifest.bin;
  if (!manifest.bin || typeof manifest.bin !== 'object' || Array.isArray(manifest.bin)) return null;
  return (
    manifest.bin['ai-peer-review'] ??
    manifest.bin['peer-review'] ??
    Object.values(manifest.bin).sort()[0] ??
    null
  );
}

function installationBoundary(packageRoot) {
  let boundary = packageRoot;
  let current = packageRoot;
  while (path.dirname(current) !== current) {
    if (path.basename(current) === 'node_modules') boundary = path.dirname(current);
    current = path.dirname(current);
  }
  return boundary;
}

function resolveDependency(packageDirectory, boundary, name, { optional = false } = {}) {
  let current = packageDirectory;
  for (;;) {
    const candidate = path.join(current, 'node_modules', ...name.split('/'));
    if (existsSync(candidate)) {
      directoryStatus(candidate, `Runtime dependency ${name}`);
      if (!contained(boundary, candidate) || !samePhysicalPath(candidate)) break;
      return candidate;
    }
    if (current === boundary) break;
    const parent = path.dirname(current);
    if (!contained(boundary, parent) && parent !== boundary) break;
    current = parent;
  }
  if (optional) return null;
  throw failure(
    'APR_RUNTIME_IMAGE_INVALID',
    `Runtime dependency ${name} is missing from the installed package closure.`,
    'Restore every installed production dependency without fetching during review startup, then retry.',
    { dependency: name, packageDirectory }
  );
}

const ALWAYS_INCLUDED_PACKAGE_FILE =
  /^(?:package\.json|readme(?:\.[^/]*)?|license(?:\.[^/]*)?|licence(?:\.[^/]*)?|notice(?:\.[^/]*)?|copying(?:\.[^/]*)?|changelog(?:\.[^/]*)?)$/i;
const DEFAULT_EXCLUDED_PACKAGE_ENTRY = new Set([
  '.ai-task-manager',
  '.codex',
  '.git',
  '.github',
  '.scratch',
  'test',
  'tests',
]);

function normalizedPackageRule(value) {
  return String(value).replace(/^\.\//, '').replaceAll('\\', '/').replace(/\/$/, '');
}

function packageFileRules(manifest, packageDirectory) {
  const rules = Array.isArray(manifest.files)
    ? manifest.files
        .filter((value) => typeof value === 'string' && value.trim())
        .map(normalizedPackageRule)
    : null;
  const declared = [];
  const addDeclared = (value) => {
    if (typeof value === 'string' && value && !path.isAbsolute(value)) {
      declared.push(normalizedPackageRule(value));
    }
  };
  addDeclared(manifest.main);
  addDeclared(manifest.module);
  if (typeof manifest.bin === 'string') addDeclared(manifest.bin);
  else if (manifest.bin && typeof manifest.bin === 'object') {
    for (const value of Object.values(manifest.bin)) addDeclared(value);
  }
  const nativeRoot = path.join(packageDirectory, 'native', 'broker-security', 'build', 'Release');
  const native = ['broker_security.node', 'build-identity.json']
    .map((name) => `native/broker-security/build/Release/${name}`)
    .filter((relative) => existsSync(path.join(packageDirectory, ...relative.split('/'))));
  if (native.length === 1) {
    throw failure(
      'APR_RUNTIME_IMAGE_INVALID',
      'The package-owned native helper is incomplete.',
      'Rebuild the exact installed native helper and retry runtime-image creation.',
      { nativeRoot }
    );
  }
  return { rules, declared: [...new Set([...declared, ...native])] };
}

function includedPackageFile(relative, selection) {
  const portable = relative.split(path.sep).join('/');
  const basename = path.posix.basename(portable);
  if (!portable.includes('/') && ALWAYS_INCLUDED_PACKAGE_FILE.test(basename)) return true;
  if (selection.declared.includes(portable)) return true;
  if (selection.rules === null) {
    const first = portable.split('/')[0];
    return !DEFAULT_EXCLUDED_PACKAGE_ENTRY.has(first) && !first.startsWith('.');
  }
  return selection.rules.some(
    (rule) =>
      portable === rule ||
      portable.startsWith(`${rule}/`) ||
      path.matchesGlob(portable, rule) ||
      path.matchesGlob(portable, `${rule}/**`)
  );
}

function includedPackageDirectory(relative, selection) {
  const portable = relative.split(path.sep).join('/');
  if (selection.rules === null) {
    const first = portable.split('/')[0];
    return !DEFAULT_EXCLUDED_PACKAGE_ENTRY.has(first) && !first.startsWith('.');
  }
  const candidates = [...selection.rules, ...selection.declared];
  return candidates.some(
    (rule) =>
      rule === portable ||
      rule.startsWith(`${portable}/`) ||
      portable.startsWith(`${rule}/`) ||
      /[*?[]/.test(rule)
  );
}

function packageInventory(packageDirectory, manifest) {
  const selection = packageFileRules(manifest, packageDirectory);
  const files = [];
  const visit = (relative = '') => {
    const directory = relative ? path.join(packageDirectory, relative) : packageDirectory;
    directoryStatus(directory, `Runtime package directory ${relative || '.'}`);
    for (const name of readdirSync(directory).sort()) {
      if (!relative && name === 'node_modules') continue;
      const childRelative = relative ? path.join(relative, name) : name;
      const child = path.join(packageDirectory, childRelative);
      const status = lstatSync(child);
      if (status.isDirectory()) {
        if (includedPackageDirectory(childRelative, selection)) visit(childRelative);
      } else if (status.isFile()) {
        if (includedPackageFile(childRelative, selection)) files.push(childRelative);
      } else if (status.isSymbolicLink()) {
        if (includedPackageFile(childRelative, selection)) {
          throw failure(
            'APR_RUNTIME_IMAGE_INVALID',
            `Runtime package contains a selected symbolic link: ${child}`,
            'Use an installed package whose package-owned runtime files are regular files and directories.',
            { path: child }
          );
        }
      } else if (includedPackageFile(childRelative, selection)) {
        throw failure(
          'APR_RUNTIME_IMAGE_INVALID',
          `Runtime package contains a selected unsupported filesystem object: ${child}`,
          'Restore the package using regular files and directories only.',
          { path: child }
        );
      }
    }
  };
  visit();
  return files.sort((left, right) => left.localeCompare(right));
}

function packageTarget(sourceRoot, boundary, packageDirectory) {
  if (packageDirectory === sourceRoot) return 'package';
  if (contained(sourceRoot, packageDirectory)) {
    const nested = path.relative(sourceRoot, packageDirectory);
    if (nested.startsWith(`node_modules${path.sep}`)) {
      return `package/${nested.split(path.sep).join('/')}`;
    }
  }
  const relative = path.relative(boundary, packageDirectory);
  if (!contained(boundary, packageDirectory) || !relative.startsWith(`node_modules${path.sep}`)) {
    throw failure(
      'APR_RUNTIME_IMAGE_INVALID',
      'Runtime dependency resolves outside the canonical installation boundary.',
      'Install the complete dependency closure within the exact package installation.',
      { packageDirectory, boundary }
    );
  }
  return `package/${relative.split(path.sep).join('/')}`;
}

function publicDescriptor(root, manifest) {
  return Object.freeze({
    root,
    entrypoint: path.join(root, ...manifest.package.entrypoint.split('/')),
    nodeExecutable: path.join(root, ...manifest.node.path.split('/')),
    digest: manifest.digest,
    files: Object.freeze(manifest.files.map((entry) => Object.freeze({ ...entry }))),
  });
}

function readManifest(root) {
  const manifestFile = path.join(root, MANIFEST_FILE);
  regularFile(manifestFile, 'Runtime image manifest');
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
  return manifest;
}

function listImageFiles(root, relative = '') {
  const directory = relative ? path.join(root, relative) : root;
  const files = [];
  for (const name of readdirSync(directory).sort()) {
    const childRelative = relative ? path.join(relative, name) : name;
    const child = path.join(root, childRelative);
    const status = lstatSync(child);
    if (status.isSymbolicLink()) return null;
    if (status.isDirectory()) {
      const nested = listImageFiles(root, childRelative);
      if (nested === null) return null;
      files.push(...nested);
    } else if (status.isFile()) {
      files.push(childRelative.split(path.sep).join('/'));
    } else {
      return null;
    }
  }
  return files;
}

export function verifyRuntimeImage(image) {
  try {
    const root = typeof image === 'string' ? image : image?.root;
    if (typeof root !== 'string' || !path.isAbsolute(root)) return false;
    directoryStatus(root, 'Runtime image');
    const manifest = readManifest(root);
    if (
      manifest?.schema !== IMAGE_SCHEMA ||
      !manifest.package ||
      !manifest.node ||
      !Array.isArray(manifest.files) ||
      !Array.isArray(manifest.licenses) ||
      typeof manifest.digest !== 'string'
    ) {
      return false;
    }
    const { digest: observedDigest, ...core } = manifest;
    if (digest(canonicalJson(core)) !== observedDigest) return false;
    if (typeof image === 'object' && image !== null) {
      const expectedEntrypoint = path.join(root, ...manifest.package.entrypoint.split('/'));
      const expectedNode = path.join(root, ...manifest.node.path.split('/'));
      if (
        image.digest !== observedDigest ||
        (image.entrypoint !== undefined && image.entrypoint !== expectedEntrypoint) ||
        (image.nodeExecutable !== undefined && image.nodeExecutable !== expectedNode) ||
        (image.files !== undefined && canonicalJson(image.files) !== canonicalJson(manifest.files))
      )
        return false;
    }
    const listed = manifest.files.map(({ path: name }) => name);
    if (
      new Set(listed).size !== listed.length ||
      [...listed].sort((left, right) => left.localeCompare(right)).join('\n') !== listed.join('\n')
    )
      return false;
    const actual = listImageFiles(root);
    if (actual === null) return false;
    const expected = [...listed, MANIFEST_FILE].sort((left, right) => left.localeCompare(right));
    if (actual.sort((left, right) => left.localeCompare(right)).join('\n') !== expected.join('\n'))
      return false;
    for (const entry of manifest.files) {
      if (
        !entry ||
        typeof entry.path !== 'string' ||
        !Number.isSafeInteger(entry.size) ||
        !Number.isSafeInteger(entry.mode) ||
        !/^sha256:[a-f0-9]{64}$/.test(entry.digest)
      ) {
        return false;
      }
      const file = path.join(root, ...entry.path.split('/'));
      if (!contained(root, file)) return false;
      const status = regularFile(file, 'Runtime image file');
      const bytes = readFileSync(file);
      if (
        status.size !== entry.size ||
        (status.mode & 0o777) !== entry.mode ||
        digest(bytes) !== entry.digest
      )
        return false;
    }
    if (!listed.includes(manifest.package.entrypoint) || !listed.includes(manifest.node.path))
      return false;
    return true;
  } catch {
    return false;
  }
}

export function pinRuntimeImage({ packageRoot, nodeExecutable, destination } = {}) {
  const sourceRoot = path.resolve(packageRoot ?? '');
  const target = path.resolve(destination ?? '');
  if (
    !path.isAbsolute(packageRoot ?? '') ||
    !path.isAbsolute(nodeExecutable ?? '') ||
    !path.isAbsolute(destination ?? '')
  ) {
    throw failure(
      'APR_RUNTIME_IMAGE_INVALID',
      'Runtime image inputs must be absolute paths.',
      'Use the exact installed package, selected Node executable, and contained cache destination.',
      { packageRoot, nodeExecutable, destination }
    );
  }
  directoryStatus(sourceRoot, 'Installed package root');
  if (!samePhysicalPath(sourceRoot)) {
    throw failure(
      'APR_RUNTIME_IMAGE_INVALID',
      'Installed package root is not its canonical physical path.',
      'Use the exact non-symlink installed package path.',
      { packageRoot: sourceRoot }
    );
  }
  const nodeStatus = regularFile(nodeExecutable, 'Selected Node executable');
  if (!samePhysicalPath(nodeExecutable)) {
    throw failure(
      'APR_RUNTIME_IMAGE_INVALID',
      'Selected Node executable is not its canonical physical path.',
      'Select the exact non-symlink Node executable used for broker startup.',
      { nodeExecutable }
    );
  }
  if (process.platform !== 'win32' && (nodeStatus.mode & 0o111) === 0) {
    throw failure(
      'APR_RUNTIME_IMAGE_INVALID',
      'Selected Node executable is not executable.',
      'Select the exact executable Node binary used for broker startup.',
      { nodeExecutable }
    );
  }
  if (target === sourceRoot || contained(sourceRoot, target)) {
    throw failure(
      'APR_RUNTIME_IMAGE_INVALID',
      'Runtime image destination cannot be inside the installed package.',
      'Use a distinct package-owned runtime-image cache destination.',
      { destination: target }
    );
  }
  if (existsSync(target)) {
    throw failure(
      'APR_RUNTIME_IMAGE_CONFLICT',
      'Runtime image destination is already occupied.',
      'Preserve the occupied image, verify its manifest, and select the digest-addressed destination.',
      { destination: target }
    );
  }

  const parent = path.dirname(target);
  ensureCanonicalDirectory(parent, 'Runtime image destination parent');
  const stage = `${target}.staging-${process.pid}-${randomUUID()}`;
  const lock = `${target}.lock`;
  let lockDescriptor;
  let lockIdentity;
  const copiedSources = [];
  try {
    lockDescriptor = openSync(lock, 'wx', 0o600);
    lockIdentity = fstatSync(lockDescriptor);
    mkdirSync(stage, { recursive: false, mode: 0o700 });
    const files = [];
    const licenses = [];
    const packages = new Set();
    const packageSnapshots = [];
    const dependencyEdges = [];
    const boundary = installationBoundary(sourceRoot);
    directoryStatus(boundary, 'Runtime installation boundary');
    if (!samePhysicalPath(boundary)) {
      throw failure(
        'APR_RUNTIME_IMAGE_INVALID',
        'Runtime installation boundary is not its canonical physical path.',
        'Use an exact non-symlink package installation.',
        { boundary }
      );
    }

    const copyFile = (source, relative) => {
      const status = regularFile(source, `Runtime file ${relative}`);
      const bytes = readFileSync(source);
      const before = digest(bytes);
      const destinationFile = path.join(stage, ...relative.split('/'));
      mkdirSync(path.dirname(destinationFile), { recursive: true });
      writeFileSync(destinationFile, bytes, { mode: status.mode & 0o777 });
      chmodSync(destinationFile, status.mode & 0o777);
      const copied = readFileSync(destinationFile);
      if (digest(copied) !== before) {
        throw failure(
          'APR_RUNTIME_IMAGE_CHANGED',
          'Runtime bytes changed while the immutable image was being copied.',
          'Retry from a quiescent exact package installation.',
          { source }
        );
      }
      files.push({ path: relative, digest: before, size: bytes.length, mode: status.mode & 0o777 });
      copiedSources.push({ source, digest: before, mode: status.mode & 0o777, size: status.size });
    };

    const copyPackage = (packageDirectory) => {
      if (packages.has(packageDirectory)) return;
      packages.add(packageDirectory);
      const manifest = parsePackage(packageDirectory);
      const relativeTarget = packageTarget(sourceRoot, boundary, packageDirectory);
      const inventory = packageInventory(packageDirectory, manifest);
      packageSnapshots.push({ packageDirectory, manifest, inventory });
      for (const relative of inventory) {
        copyFile(
          path.join(packageDirectory, relative),
          `${relativeTarget}/${relative.split(path.sep).join('/')}`
        );
      }
      licenses.push({
        name: manifest.name,
        version: manifest.version,
        license: manifest.license ?? null,
      });
      const optionalDependencies = new Set(Object.keys(manifest.optionalDependencies ?? {}));
      for (const name of Object.keys(manifest.dependencies ?? {})
        .filter((name) => !optionalDependencies.has(name))
        .sort()) {
        const resolved = resolveDependency(packageDirectory, boundary, name);
        dependencyEdges.push({ packageDirectory, name, optional: false, resolved });
        copyPackage(resolved);
      }
      for (const name of [...optionalDependencies].sort()) {
        const dependency = resolveDependency(packageDirectory, boundary, name, {
          optional: true,
        });
        dependencyEdges.push({ packageDirectory, name, optional: true, resolved: dependency });
        if (dependency !== null) copyPackage(dependency);
      }
      for (const name of Object.keys(manifest.peerDependencies ?? {}).sort()) {
        const optional = manifest.peerDependenciesMeta?.[name]?.optional === true;
        const dependency = resolveDependency(packageDirectory, boundary, name, { optional });
        dependencyEdges.push({ packageDirectory, name, optional, resolved: dependency });
        if (dependency !== null) copyPackage(dependency);
      }
    };

    const rootPackage = parsePackage(sourceRoot);
    const entrypoint = entrypointFor(rootPackage);
    if (typeof entrypoint !== 'string' || !entrypoint || path.isAbsolute(entrypoint)) {
      throw failure(
        'APR_RUNTIME_IMAGE_INVALID',
        'Installed package does not declare a usable executable entrypoint.',
        'Restore a package with the ai-peer-review or peer-review bin entrypoint.',
        { packageRoot: sourceRoot }
      );
    }
    const normalizedEntrypoint = path.normalize(entrypoint.replace(/^\.\//, ''));
    const sourceEntrypoint = path.join(sourceRoot, normalizedEntrypoint);
    if (!contained(sourceRoot, sourceEntrypoint)) {
      throw failure(
        'APR_RUNTIME_IMAGE_INVALID',
        'Package entrypoint escapes the installed package root.',
        'Restore the exact installed package and retry.',
        { entrypoint }
      );
    }
    regularFile(sourceEntrypoint, 'Package entrypoint');
    copyPackage(sourceRoot);
    const nodeRelative = `node/${path.basename(nodeExecutable)}`;
    copyFile(nodeExecutable, nodeRelative);
    files.sort((left, right) => left.path.localeCompare(right.path));
    licenses.sort((left, right) =>
      `${left.name}@${left.version}`.localeCompare(`${right.name}@${right.version}`)
    );
    for (const copied of copiedSources) {
      const current = regularFile(copied.source, 'Runtime source file');
      if (
        current.size !== copied.size ||
        (current.mode & 0o777) !== copied.mode ||
        digest(readFileSync(copied.source)) !== copied.digest
      ) {
        throw failure(
          'APR_RUNTIME_IMAGE_CHANGED',
          'Runtime source changed before the immutable image could be published.',
          'Retry from a quiescent exact package installation.',
          { source: copied.source }
        );
      }
    }
    for (const snapshot of packageSnapshots) {
      const currentManifest = parsePackage(snapshot.packageDirectory);
      const currentInventory = packageInventory(snapshot.packageDirectory, currentManifest);
      if (canonicalJson(currentInventory) !== canonicalJson(snapshot.inventory)) {
        throw failure(
          'APR_RUNTIME_IMAGE_CHANGED',
          'Runtime package membership changed before the immutable image could be published.',
          'Retry from a quiescent exact package installation.',
          { packageDirectory: snapshot.packageDirectory }
        );
      }
    }
    for (const edge of dependencyEdges) {
      const current = resolveDependency(edge.packageDirectory, boundary, edge.name, {
        optional: edge.optional,
      });
      if (current !== edge.resolved) {
        throw failure(
          'APR_RUNTIME_IMAGE_CHANGED',
          'Runtime dependency resolution changed before the immutable image could be published.',
          'Retry from a quiescent exact package installation.',
          { packageDirectory: edge.packageDirectory, dependency: edge.name }
        );
      }
    }
    const core = {
      schema: IMAGE_SCHEMA,
      package: {
        name: rootPackage.name,
        version: rootPackage.version,
        entrypoint: `package/${normalizedEntrypoint.split(path.sep).join('/')}`,
      },
      node: { path: nodeRelative },
      files,
      licenses,
    };
    const manifest = { ...core, digest: digest(canonicalJson(core)) };
    writeFileSync(path.join(stage, MANIFEST_FILE), `${canonicalJson(manifest)}\n`, { mode: 0o600 });
    const staged = publicDescriptor(stage, manifest);
    if (!verifyRuntimeImage(staged)) {
      throw failure(
        'APR_RUNTIME_IMAGE_INVALID',
        'Completed runtime image did not match its closed manifest.',
        'Preserve the source installation, remove only the operation staging path, and retry.',
        { stage }
      );
    }
    if (existsSync(target)) {
      throw failure(
        'APR_RUNTIME_IMAGE_CONFLICT',
        'Runtime image destination became occupied before publication.',
        'Preserve the occupied path and staging evidence, then inspect the concurrent operation.',
        { destination: target }
      );
    }
    renameSync(stage, target);
    const published = publicDescriptor(target, manifest);
    if (!verifyRuntimeImage(published)) {
      throw failure(
        'APR_RUNTIME_IMAGE_INVALID',
        'Published runtime image did not match its closed manifest.',
        'Preserve the image for inspection and do not start the broker.',
        { destination: target }
      );
    }
    return published;
  } catch (cause) {
    if (cause instanceof AprError) throw cause;
    if (cause?.code === 'EEXIST') {
      throw failure(
        'APR_RUNTIME_IMAGE_CONFLICT',
        'Another operation already owns or published this runtime image destination.',
        'Preserve the existing image or lock, verify its exact manifest, and retry explicit recovery.',
        { destination: target },
        cause
      );
    }
    throw failure(
      'APR_RUNTIME_IMAGE_INVALID',
      'Runtime image could not be created atomically.',
      'Preserve the installed package and inspect the operation-specific failure before retrying.',
      { destination: target },
      cause
    );
  } finally {
    if (lockDescriptor !== undefined) closeSync(lockDescriptor);
    try {
      const current = lstatSync(lock);
      if (lockIdentity && current.dev === lockIdentity.dev && current.ino === lockIdentity.ino) {
        unlinkSync(lock);
      }
    } catch {
      // A missing or replaced lock is preserved as recovery evidence; never unlink by path alone.
    }
    rmSync(stage, { recursive: true, force: true });
  }
}
