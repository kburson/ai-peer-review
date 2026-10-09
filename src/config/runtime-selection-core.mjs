// @story #133
// Internal store construction supports isolated source fixtures; it has no provider capability.
import { randomUUID, createHash } from 'node:crypto';
import { lstat, mkdir } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { AprError } from '../errors.mjs';
import { initializePortableSystem } from '../broker/portable-system.mjs';
import { assertProtectedSnapshotUnchanged } from '../broker/storage-protection.mjs';
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
const selectionGenerations = new WeakMap();
const sameSelectionGeneration = (a, b) =>
  a &&
  b &&
  ['location', 'identity', 'fileVersion', 'rootIdentity', 'parentIdentity'].every(
    (key) => a[key] === b[key]
  );
export function createSelectionStore({
  account,
  packageRoot,
  nodeExecutable = process.execPath,
  nodeVersion = process.versions.node,
  kind = process.platform,
} = {}) {
  const identity = (stat) =>
    [stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs].map(String).join(':');
  let actualRoot, actualNode, nodeIdentity, manifestFile, manifestAtStart;
  let processInventory = null,
    processSelectionId = null,
    processSelectionGeneration = null;
  const pendingCleanup = new Set();
  function budget(input = {}) {
    const context = {
      signal: input.signal ?? new AbortController().signal,
      deadline: input.deadline ?? performance.now() + 30000,
    };
    check(context);
    return Object.freeze(context);
  }
  function check(context) {
    if (!(context.signal instanceof AbortSignal) || !Number.isFinite(context.deadline))
      refuse('APR_RUNTIME_SELECTION_INVALID', 'Invalid selection operation context.');
    if (context.signal.aborted || performance.now() >= context.deadline)
      refuse('APR_RUNTIME_SELECTION_INVALID', 'Selection operation aborted or deadline expired.');
  }
  async function initialize(system, context) {
    check(context);
    const [root, node] = await system.canonicalPaths([packageRoot, nodeExecutable]);
    const observedNode = identity(await lstat(node, { bigint: true }));
    const file = path.join(root, 'runtime-inventory.json');
    let digest = null;
    try {
      digest = createHash('sha256').update(readBoundedOrdinaryFile(file, 1048576)).digest('hex');
    } catch {}
    check(context);
    if (actualRoot === undefined) {
      actualRoot = root;
      actualNode = node;
      nodeIdentity = observedNode;
      manifestFile = file;
      manifestAtStart = digest;
    } else if (root !== actualRoot || node !== actualNode || observedNode !== nodeIdentity)
      refuse('APR_RUNTIME_CHANGED', 'The executing installation or Node changed.');
  }
  async function operation(input = {}) {
    const context = budget(input);
    if (kind !== process.platform)
      refuse(
        'APR_RUNTIME_ACCOUNT_UNAVAILABLE',
        'Requested OS account does not match the execution host.'
      );
    const system = await initializePortableSystem(context);
    try {
      await initialize(system, context);
    } catch (error) {
      if (actualRoot !== undefined && error.code === 'ENOENT')
        refuse('APR_RUNTIME_CHANGED', 'The executing installation or Node is no longer available.');
      throw error;
    }
    return { context, system };
  }
  async function accountContext(op) {
    check(op.context);
    if (kind !== process.platform)
      refuse(
        'APR_RUNTIME_ACCOUNT_UNAVAILABLE',
        'Requested OS account does not match the execution host.'
      );
    let user, home;
    try {
      user = await account();
      check(op.context);
      if (
        !user ||
        typeof user.homedir !== 'string' ||
        !path.isAbsolute(user.homedir) ||
        !Number.isInteger(user.uid)
      )
        throw new Error('invalid profile');
      home = await op.system.canonicalPath(user.homedir);
      const stat = await lstat(home);
      if (
        !stat.isDirectory() ||
        (kind !== 'win32' &&
          (stat.uid !== user.uid || String(user.uid) !== (await op.system.userId())))
      )
        throw new Error('foreign account');
    } catch (error) {
      if (error instanceof AprError) throw error;
      refuse('APR_RUNTIME_ACCOUNT_UNAVAILABLE', 'The OS account profile cannot be verified.');
    }
    check(op.context);
    const parent =
      kind === 'win32' ? path.join(home, 'AppData', 'Local') : path.join(home, '.config');
    const directory = path.join(parent, 'ai-peer-review');
    return { user, home, directory, file: path.join(directory, 'runtime-selection.json') };
  }
  async function components(ctx, create, context) {
    let current = ctx.home;
    for (const component of path.relative(ctx.home, ctx.directory).split(path.sep)) {
      current = path.join(current, component);
      check(context);
      let stat;
      try {
        stat = await lstat(current);
      } catch (error) {
        if (error.code !== 'ENOENT' || !create) throw error;
        if (current === ctx.directory) {
          const { provisionProtectedRoot } = await import('../broker/storage-protection.mjs');
          await provisionProtectedRoot({ root: current, ...context });
        } else await mkdir(current, { mode: 0o700 });
        stat = await lstat(current);
      }
      if (
        stat.isSymbolicLink() ||
        !stat.isDirectory() ||
        (kind !== 'win32' && stat.uid !== ctx.user.uid)
      )
        refuse(
          'APR_RUNTIME_SELECTION_INVALID',
          'Account selection directories have unsafe ownership or links.'
        );
    }
  }
  async function protectedStore(ctx, op, create = false) {
    await components(ctx, create, op.context);
    const receipt = await op.system.observeProtection({ root: ctx.directory });
    if (!receipt.verified)
      refuse(
        'APR_RUNTIME_SELECTION_INVALID',
        'Runtime selection directory protection is unavailable.'
      );
    return op.system.openProtectedRoot({ receipt });
  }
  async function close(guard, error) {
    try {
      await guard.close();
    } catch (cause) {
      pendingCleanup.add(guard);
      if (error) {
        error.cause = cause;
        throw error;
      }
      throw cause;
    }
  }
  async function withStore(ctx, op, create, callback) {
    let guard;
    try {
      guard = await protectedStore(ctx, op, create);
      const result = await callback(guard);
      await guard.verify();
      check(op.context);
      await close(guard);
      return result;
    } catch (error) {
      if (guard) await close(guard, error);
      if (error instanceof AprError && error.code.startsWith('APR_RUNTIME_')) throw error;
      const wrapped = new AprError(
        'APR_RUNTIME_SELECTION_INVALID',
        'Runtime selection is missing, changed or unprotected.',
        {
          cause: error,
          recovery: 'Inspect account selection protection and retry with a fresh invocation.',
          details: error.details,
        }
      );
      wrapped.cause = error;
      throw wrapped;
    }
  }
  function decode(bytes) {
    if (bytes.length > 8192)
      refuse('APR_RUNTIME_SELECTION_INVALID', 'Selection exceeds its read bound.');
    const value = validateRuntimeSelection(JSON.parse(bytes));
    return Object.freeze({
      ...value,
      packageRoot: value.package_root,
      nodeExecutable: value.node_executable,
    });
  }
  async function readSnapshotWithin(op) {
    const ctx = await accountContext(op);
    return withStore(ctx, op, false, async (guard) => {
      const snapshot = await guard.readSnapshot('runtime-selection.json', 8192);
      return { value: decode(snapshot.bytes), snapshot };
    });
  }
  async function readWithin(op) {
    return (await readSnapshotWithin(op)).value;
  }
  async function read(input = {}) {
    return readWithin(await operation(input));
  }
  async function isProjectDependency(context) {
    const dependencyRoot = path.dirname(path.dirname(actualRoot));
    if (path.basename(dependencyRoot) !== 'node_modules') return false;
    let prefix = path.dirname(dependencyRoot);
    if (kind !== 'win32' && path.basename(prefix) === 'lib') prefix = path.dirname(prefix);
    for (;;) {
      check(context);
      for (const name of ['.git', 'package.json', 'package-lock.json', 'npm-shrinkwrap.json']) {
        try {
          await lstat(path.join(prefix, name));
          return true;
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
      }
      if (kind !== 'win32' && path.basename(path.dirname(dependencyRoot)) === 'lib') return false;
      const parent = path.dirname(prefix);
      if (parent === prefix) return false;
      prefix = parent;
    }
  }
  async function requireInstalledRunner(op) {
    let checkout = false;
    try {
      await lstat(path.join(actualRoot, '.git'));
      checkout = true;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (
      Number(nodeVersion.split('.')[0]) < 24 ||
      checkout ||
      (await isProjectDependency(op.context))
    )
      refuse(
        'APR_RUNTIME_INSTALLATION_INVALID',
        'Registration requires an installed global runtime and Node >=24, not a source checkout.'
      );
  }
  async function installation(op) {
    await requireInstalledRunner(op);
    await initialize(op.system, op.context);
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
    check(op.context);
    processInventory = inventory;
    return inventory;
  }
  async function register(input = {}) {
    const { dryRun = false, update = false } = input;
    const op = await operation(input);
    await installation(op);
    const ctx = await accountContext(op);
    let exists = false;
    try {
      await lstat(ctx.file);
      exists = true;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const transact = async (guard) => {
      const previousSnapshot = exists
        ? await guard.readSnapshot('runtime-selection.json', 8192)
        : null;
      const previous = previousSnapshot ? decode(previousSnapshot.bytes) : null;
      const same =
        previous?.package_root === actualRoot && previous?.node_executable === actualNode;
      if (previous && !same && !update)
        refuse(
          'APR_RUNTIME_SELECTION_INVALID',
          'Runtime locator relocation requires explicit --update.'
        );
      const keys = [
        'schema',
        'selection_id',
        'package_root',
        'node_executable',
        'package_name',
        'registered_at',
      ];
      const value = same
        ? Object.fromEntries(keys.map((key) => [key, previous[key]]))
        : {
            schema: 'ai-peer-review.runtime-selection/v1',
            selection_id: randomUUID(),
            package_root: actualRoot,
            node_executable: actualNode,
            package_name: '@kburson/ai-peer-review',
            registered_at: new Date().toISOString(),
          };
      await installation(op);
      if (previousSnapshot) {
        try {
          assertProtectedSnapshotUnchanged(previousSnapshot);
        } catch {
          refuse('APR_RUNTIME_CHANGED', 'Account selection changed during registration.');
        }
      }
      if (dryRun)
        return {
          plan: Object.freeze({
            schema: 'ai-peer-review.runtime-registration-plan/v1',
            location: ctx.file,
            before: previous,
            after: value,
          }),
        };
      if (!same) {
        const bytes = Buffer.from(JSON.stringify(value) + '\n');
        if (previousSnapshot)
          await guard.replace('runtime-selection.json', previousSnapshot.bytes, bytes);
        else await guard.writeExclusive('runtime-selection.json', bytes);
      }
      const readRetained = async () => {
        const current = await accountContext(op);
        if (current.directory !== ctx.directory)
          refuse('APR_RUNTIME_CHANGED', 'Account selection location changed during registration.');
        const snapshot = await guard.readSnapshot('runtime-selection.json', 8192);
        return { value: decode(snapshot.bytes), snapshot };
      };
      const observedRead = await readRetained(),
        observed = observedRead.value;
      if (
        observed.selection_id !== value.selection_id ||
        observed.package_root !== actualRoot ||
        observed.node_executable !== actualNode
      )
        refuse('APR_RUNTIME_SELECTION_INVALID', 'Runtime selection read back disagrees.');
      if (same && !sameSelectionGeneration(previousSnapshot, observedRead.snapshot))
        refuse('APR_RUNTIME_CHANGED', 'Account selection generation changed during registration.');
      await installation(op);
      const finalRead = await readRetained();
      if (!sameSelectionGeneration(observedRead.snapshot, finalRead.snapshot))
        refuse(
          'APR_RUNTIME_CHANGED',
          'Account selection generation changed during registration read-back.'
        );
      return { observed, snapshot: finalRead.snapshot };
    };
    const publication =
      dryRun && !exists ? await transact(null) : await withStore(ctx, op, !dryRun, transact);
    if (publication.plan) return publication.plan;
    try {
      assertProtectedSnapshotUnchanged(publication.snapshot);
    } catch {
      refuse('APR_RUNTIME_CHANGED', 'Selection changed during final registration protection.');
    }
    processSelectionId = publication.observed.selection_id;
    processSelectionGeneration = publication.snapshot;
    return publication.observed;
  }
  async function assertSelected(input = {}) {
    const {
      executingPackageRoot = packageRoot,
      nodeExecutable: executingNode = nodeExecutable,
      previousObservation,
    } = input;
    const op = await operation(input);
    await requireInstalledRunner(op);
    const selectedRead = await readSnapshotWithin(op),
      selected = selectedRead.value;
    if (
      processSelectionGeneration &&
      !sameSelectionGeneration(processSelectionGeneration, selectedRead.snapshot)
    )
      refuse(
        'APR_RUNTIME_CHANGED',
        'Account selection physical generation changed after observation.'
      );
    if (
      previousObservation &&
      !sameSelectionGeneration(selectionGenerations.get(previousObservation), selectedRead.snapshot)
    )
      refuse(
        'APR_RUNTIME_CHANGED',
        'Previous selection observation does not authenticate the current physical generation.'
      );
    if (processSelectionId !== null && selected.selection_id !== processSelectionId)
      refuse(
        'APR_RUNTIME_CHANGED',
        'Account selection changed after this invocation sealed its generation.'
      );
    const [currentRoot, currentNode] = await op.system.canonicalPaths([
      executingPackageRoot,
      executingNode,
    ]);
    if (
      currentRoot !== actualRoot ||
      currentNode !== actualNode ||
      selected.package_root !== actualRoot ||
      selected.node_executable !== actualNode
    )
      refuse(
        'APR_RUNTIME_NOT_SELECTED',
        'Executing runtime/Node does not match the account selection.'
      );
    if (previousObservation && previousObservation.selection_id !== selected.selection_id)
      refuse('APR_RUNTIME_CHANGED', 'Account runtime selection changed after observation.');
    await verifyRuntimeInventory({
      packageRoot: actualRoot,
      previousObservation: processInventory ?? previousObservation?.inventory,
    });
    const reselectedRead = await readSnapshotWithin(op),
      reselected = reselectedRead.value;
    if (!sameSelectionGeneration(selectedRead.snapshot, reselectedRead.snapshot))
      refuse(
        'APR_RUNTIME_CHANGED',
        'Account selection physical generation changed during admission.'
      );
    if (
      reselected.selection_id !== selected.selection_id ||
      reselected.package_root !== selected.package_root ||
      reselected.node_executable !== selected.node_executable
    )
      refuse('APR_RUNTIME_CHANGED', 'Account selection changed during admission.');
    const finalInventory = await installation(op);
    try {
      assertProtectedSnapshotUnchanged(reselectedRead.snapshot);
    } catch {
      refuse('APR_RUNTIME_CHANGED', 'Selection changed during final installed observation.');
    }
    processSelectionId = selected.selection_id;
    processSelectionGeneration = reselectedRead.snapshot;
    const result = Object.freeze({
      ...finalInventory,
      selection_id: selected.selection_id,
      nodeExecutable: actualNode,
      inventory: finalInventory,
    });
    selectionGenerations.set(result, reselectedRead.snapshot);
    return result;
  }
  return Object.freeze({
    location: async (input = {}) => (await accountContext(await operation(input))).file,
    read,
    register,
    assertSelected,
    async retryCleanup() {
      for (const guard of pendingCleanup) {
        await guard.close();
        pendingCleanup.delete(guard);
      }
    },
  });
}
