// @story #133
// Internal store construction supports isolated source fixtures; it has no provider capability.
import { randomUUID, createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  realpathSync,
  renameSync,
  writeFileSync,
  unlinkSync,
} from 'node:fs';
import path from 'node:path';
import { AprError } from '../errors.mjs';
import { platformSecurity } from '../broker/platform.mjs';
import {
  verifyRuntimeInventory,
  verifyRuntimeInventorySync,
  readBoundedOrdinaryFile,
} from '../startup/runtime-inventory.mjs';

function refuse(code, message) {
  throw new AprError(code, message, {
    recovery:
      'Inspect the account and installed runtime; use the selected global CLI register-runtime --dry-run, then register-runtime --update for an explicit locator change.',
  });
}
function exact(value, keys) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join(',') === [...keys].sort().join(',')
  );
}
export function validateRuntimeSelection(value) {
  if (
    !exact(value, [
      'schema',
      'selection_id',
      'package_root',
      'node_executable',
      'package_name',
      'registered_at',
    ]) ||
    value.schema !== 'ai-peer-review.runtime-selection/v1' ||
    value.package_name !== '@kburson/ai-peer-review' ||
    !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(value.selection_id) ||
    ![value.package_root, value.node_executable].every(
      (p) => typeof p === 'string' && path.isAbsolute(p) && path.normalize(p) === p
    ) ||
    !Number.isFinite(Date.parse(value.registered_at)) ||
    new Date(value.registered_at).toISOString() !== value.registered_at
  )
    refuse('APR_RUNTIME_SELECTION_INVALID', 'Runtime selection has an invalid closed schema.');
  return value;
}
export function createSelectionStore({
  account,
  packageRoot,
  nodeExecutable = process.execPath,
  nodeVersion = process.versions.node,
  kind = process.platform,
  security = platformSecurity,
} = {}) {
  const actualRoot = realpathSync(packageRoot);
  const actualNode = realpathSync(nodeExecutable);
  const identity = (stat) =>
    [stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs].map(String).join(':');
  const nodeIdentity = identity(lstatSync(actualNode, { bigint: true }));
  const manifestFile = path.join(actualRoot, 'runtime-inventory.json');
  // A broken inventory must not make help/explain allocate unbounded input.
  let manifestAtStart = null;
  try {
    const bytes = readBoundedOrdinaryFile(manifestFile, 1048576);
    manifestAtStart = createHash('sha256').update(bytes).digest('hex');
  } catch {}
  let processInventory = null;
  let processSelectionId = null;
  async function context() {
    let user;
    try {
      user = account();
    } catch {
      refuse('APR_RUNTIME_ACCOUNT_UNAVAILABLE', 'The OS account profile is unavailable.');
    }
    if (
      !user ||
      typeof user.homedir !== 'string' ||
      !path.isAbsolute(user.homedir) ||
      !Number.isInteger(user.uid)
    )
      refuse('APR_RUNTIME_ACCOUNT_UNAVAILABLE', 'The OS account profile cannot be verified.');
    let home;
    try {
      home = realpathSync(user.homedir);
    } catch {
      refuse('APR_RUNTIME_ACCOUNT_UNAVAILABLE', 'The OS account directory is unavailable.');
    }
    const homeStat = lstatSync(home);
    if (!homeStat.isDirectory() || (kind !== 'win32' && homeStat.uid !== user.uid))
      refuse('APR_RUNTIME_ACCOUNT_UNAVAILABLE', 'The OS account directory owner does not match.');
    let native = null;
    if (kind === 'win32') {
      try {
        native = security();
        if (!native.userId()) throw new Error('missing account SID');
      } catch {
        refuse(
          'APR_RUNTIME_ACCOUNT_UNAVAILABLE',
          'Windows account ownership verification is unavailable.'
        );
      }
    }
    // Windows profile discovery uses the OS userInfo API; no environment locator is accepted.
    const parent =
      kind === 'win32' ? path.join(home, 'AppData', 'Local') : path.join(home, '.config');
    const directory = path.join(parent, 'ai-peer-review');
    return { user, directory, file: path.join(directory, 'runtime-selection.json'), home, native };
  }
  function checkComponents(ctx, create = false) {
    let current = ctx.home;
    for (const component of path.relative(ctx.home, ctx.directory).split(path.sep)) {
      current = path.join(current, component);
      if (!existsSync(current) && create) {
        if (current === ctx.directory && ctx.native) {
          const handle = ctx.native.openPrivateDirectory(current);
          handle.close();
        } else mkdirSync(current, { mode: 0o700 });
      }
      const stat = lstatSync(current);
      if (
        stat.isSymbolicLink() ||
        !stat.isDirectory() ||
        (kind !== 'win32' && stat.uid !== ctx.user.uid)
      )
        refuse(
          'APR_RUNTIME_SELECTION_INVALID',
          'Account selection directories have unsafe ownership or links.'
        );
      if (current === ctx.directory && kind !== 'win32' && stat.mode & 0o077)
        refuse('APR_RUNTIME_SELECTION_INVALID', 'Runtime selection directory must be private.');
    }
  }
  async function read() {
    const ctx = await context();
    try {
      checkComponents(ctx);
      const stat = lstatSync(ctx.file);
      if (
        !stat.isFile() ||
        stat.isSymbolicLink() ||
        stat.size > 8192 ||
        (kind !== 'win32' && (stat.uid !== ctx.user.uid || stat.mode & 0o077))
      )
        refuse(
          'APR_RUNTIME_SELECTION_INVALID',
          'Runtime selection must be a bounded private ordinary file.'
        );
      let bytes;
      if (ctx.native) {
        const handle = ctx.native.openPrivateDirectory(ctx.directory);
        try {
          bytes = handle.read('runtime-selection.json');
          if (!handle.verify()) throw new Error('directory changed');
        } finally {
          handle.close();
        }
      } else {
        try {
          bytes = readBoundedOrdinaryFile(ctx.file, 8192);
        } catch {
          refuse('APR_RUNTIME_SELECTION_INVALID', 'Selection changed during its bounded read.');
        }
      }
      if (bytes.length > 8192)
        refuse('APR_RUNTIME_SELECTION_INVALID', 'Selection exceeds its read bound.');
      const value = validateRuntimeSelection(JSON.parse(bytes));
      return Object.freeze({
        ...value,
        packageRoot: value.package_root,
        nodeExecutable: value.node_executable,
      });
    } catch (error) {
      if (error instanceof AprError) throw error;
      refuse('APR_RUNTIME_SELECTION_INVALID', 'Runtime selection is missing or unreadable.');
    }
  }
  function requireInstalledRunner() {
    if (Number(nodeVersion.split('.')[0]) < 24 || existsSync(path.join(actualRoot, '.git')))
      refuse(
        'APR_RUNTIME_INSTALLATION_INVALID',
        'Registration requires an installed global runtime and Node >=24, not a source checkout.'
      );
  }
  function installation() {
    requireInstalledRunner();
    if (identity(lstatSync(actualNode, { bigint: true })) !== nodeIdentity)
      refuse('APR_RUNTIME_CHANGED', 'Node changed after the process started.');
    const inventory = verifyRuntimeInventorySync({
      packageRoot: actualRoot,
      previousObservation: processInventory,
    });
    if (
      manifestAtStart === null ||
      createHash('sha256').update(readBoundedOrdinaryFile(manifestFile, 1048576)).digest('hex') !==
        manifestAtStart
    )
      refuse(
        'APR_RUNTIME_CHANGED',
        'Installed runtime inventory changed after the process started.'
      );
    processInventory = inventory;
    return inventory;
  }
  async function register({ dryRun = false, update = false } = {}) {
    await installation();
    const ctx = await context();
    let previous = null;
    if (existsSync(ctx.file)) previous = await read();
    const same = previous?.package_root === actualRoot && previous?.node_executable === actualNode;
    if (previous && !same && !update)
      refuse(
        'APR_RUNTIME_SELECTION_INVALID',
        'Runtime locator relocation requires explicit --update.'
      );
    const value = same
      ? Object.fromEntries(
          [
            'schema',
            'selection_id',
            'package_root',
            'node_executable',
            'package_name',
            'registered_at',
          ].map((key) => [key, previous[key]])
        )
      : {
          schema: 'ai-peer-review.runtime-selection/v1',
          selection_id: randomUUID(),
          package_root: actualRoot,
          node_executable: actualNode,
          package_name: '@kburson/ai-peer-review',
          registered_at: new Date().toISOString(),
        };
    installation();
    if (dryRun)
      return Object.freeze({
        schema: 'ai-peer-review.runtime-registration-plan/v1',
        location: ctx.file,
        before: previous,
        after: value,
      });
    checkComponents(ctx, true);
    if (ctx.native) {
      const handle = ctx.native.openPrivateDirectory(ctx.directory);
      try {
        if (!handle.verify())
          refuse('APR_RUNTIME_SELECTION_INVALID', 'Runtime directory ownership is unsafe.');
      } finally {
        handle.close();
      }
    }
    if (!same) {
      const temporary = path.join(ctx.directory, `.runtime-selection-${randomUUID()}.tmp`);
      try {
        writeFileSync(temporary, JSON.stringify(value) + '\n', { flag: 'wx', mode: 0o600 });
        renameSync(temporary, ctx.file);
      } finally {
        try {
          unlinkSync(temporary);
        } catch {}
      }
    }
    const observed = await read();
    if (
      observed.selection_id !== value.selection_id ||
      observed.package_root !== actualRoot ||
      observed.node_executable !== actualNode
    )
      refuse('APR_RUNTIME_SELECTION_INVALID', 'Runtime selection read back disagrees.');
    installation();
    processSelectionId = observed.selection_id;
    return observed;
  }
  async function assertSelected({
    executingPackageRoot = actualRoot,
    nodeExecutable: executingNode = actualNode,
    previousObservation,
  } = {}) {
    requireInstalledRunner();
    const selected = await read();
    if (processSelectionId !== null && selected.selection_id !== processSelectionId)
      refuse(
        'APR_RUNTIME_CHANGED',
        'Account selection changed after this invocation sealed its generation.'
      );
    if (
      realpathSync(executingPackageRoot) !== actualRoot ||
      realpathSync(executingNode) !== actualNode ||
      selected.package_root !== actualRoot ||
      selected.node_executable !== actualNode
    )
      refuse(
        'APR_RUNTIME_NOT_SELECTED',
        'Executing runtime/Node does not match the account selection.'
      );
    if (previousObservation && previousObservation.selection_id !== selected.selection_id)
      refuse('APR_RUNTIME_CHANGED', 'Account runtime selection changed after observation.');
    if (identity(lstatSync(actualNode, { bigint: true })) !== nodeIdentity)
      refuse('APR_RUNTIME_CHANGED', 'Node changed after the process started.');
    const inventory = await verifyRuntimeInventory({
      packageRoot: actualRoot,
      previousObservation: processInventory ?? previousObservation?.inventory,
    });
    if (
      manifestAtStart === null ||
      createHash('sha256').update(readBoundedOrdinaryFile(manifestFile, 1048576)).digest('hex') !==
        manifestAtStart
    )
      refuse(
        'APR_RUNTIME_CHANGED',
        'Installed runtime inventory changed after the process started.'
      );
    processInventory = inventory;
    const reselected = await read();
    if (
      reselected.selection_id !== selected.selection_id ||
      reselected.package_root !== selected.package_root ||
      reselected.node_executable !== selected.node_executable
    )
      refuse('APR_RUNTIME_CHANGED', 'Account selection changed during admission.');
    // No asynchronous wait may follow the final image revalidation.
    const finalInventory = installation();
    processSelectionId = selected.selection_id;
    return Object.freeze({
      ...finalInventory,
      selection_id: selected.selection_id,
      nodeExecutable: actualNode,
      inventory: finalInventory,
    });
  }
  return Object.freeze({
    location: async () => (await context()).file,
    read,
    register,
    assertSelected,
  });
}
