import { ensurePortableRootProtection } from './portable-root.mjs';
import {
  currentOperationAuthorityContext,
  currentOperationAuthorityWorktree,
  performCurrentOperationEffect,
} from '../startup/authority-fence.mjs';
// @story #189
import path from 'node:path';
import { realpath, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { AprError } from '../errors.mjs';
import { initializePortableOperations } from './portable-platform.mjs';
import { canonicalPortableProjectIdentity } from './identity.mjs';
import {
  parseBrokerBootstrapCore,
  brokerRuntimeImageRecordCore,
  encodeBrokerBootstrapCore,
} from './bootstrap-core.mjs';
import { assertSelectedRuntime } from '../config/runtime-selection.mjs';
import { verifyRuntimeInventorySync } from '../startup/runtime-inventory.mjs';
import { assertProtectedSnapshotUnchanged } from './storage-protection.mjs';
import { verifyRuntimeImage } from './runtime-image.mjs';
import {
  assertCollateralCompatible,
  readRuntimeCompatibility,
} from '../protocol/compatibility.mjs';
const loadedRoot = fileURLToPath(new URL('../../', import.meta.url));
const members = new WeakMap();
const retained = new Set();
function fail(reason, cause) {
  const error = new AprError(
    'APR_BROKER_START_FAILED',
    'Protected broker bootstrap is unavailable.',
    {
      recovery:
        'Create a fresh bootstrap through the current selected package; retain uncertain startup evidence.',
      details: { reason },
    }
  );
  if (cause) error.cause = cause;
  return error;
}
function bounded(context) {
  if (
    !(context?.signal instanceof AbortSignal) ||
    !Number.isFinite(context.deadline) ||
    context.signal.aborted ||
    context.deadline <= performance.now() ||
    context.deadline - performance.now() > 30000
  )
    throw fail('bootstrap-budget-unproved');
}
export function isPortableBrokerBootstrap(value) {
  const record = members.get(value);
  return !!record && !record.closed && !record.failed;
}
export function portableBrokerBootstrapFacts(value) {
  if (!isPortableBrokerBootstrap(value)) throw fail('genuine-bootstrap-required');
  const record = members.get(value);
  bounded(record.context);
  return record.value;
}
export function portableBrokerBootstrapContext(value) {
  portableBrokerBootstrapFacts(value);
  return members.get(value).context;
}
export async function assertPortableBrokerBootstrap(value) {
  portableBrokerBootstrapFacts(value);
  const record = members.get(value);
  try {
    await record.guard.verify();
    const fresh = await record.guard.readSnapshot(path.basename(record.file));
    if (
      !fresh ||
      ['identity', 'fileVersion', 'rootIdentity', 'parentIdentity'].some(
        (key) => fresh[key] !== record.snapshot[key]
      ) ||
      !fresh.bytes.equals(record.snapshot.bytes)
    )
      throw fail('bootstrap-generation-changed');
    await assertSelectedRuntime({ previousObservation: record.runtime, ...record.context });
    assertProtectedSnapshotUnchanged(fresh);
    assertProtectedSnapshotUnchanged(record.snapshot);
    bounded(record.context);
    return record.value;
  } catch (error) {
    record.failed = true;
    throw error;
  }
}
export async function closePortableBrokerBootstrap(value) {
  const record = members.get(value);
  if (!record) throw fail('genuine-bootstrap-required');
  if (record.closed) return true;
  await record.guard.close();
  record.closed = true;
  retained.delete(record);
  return true;
}
export async function readPortableBrokerBootstrap(input = {}) {
  if (
    Object.keys(input).sort().join(',') !== 'deadline,file,signal' ||
    typeof input.file !== 'string' ||
    !path.isAbsolute(input.file) ||
    path.normalize(input.file) !== input.file ||
    !/^bootstrap-[a-f0-9-]+\.json$/u.test(path.basename(input.file))
  )
    throw fail('bootstrap-path-unproved');
  const context = Object.freeze({ signal: input.signal, deadline: input.deadline });
  bounded(context);
  const directory = path.dirname(input.file);
  const worktree = path.dirname(path.dirname(path.dirname(directory)));
  if (directory !== path.join(worktree, '.scratch', 'peer-review', 'broker'))
    throw fail('bootstrap-root-unproved');
  let guard;
  try {
    const operations = await initializePortableOperations(context);
    if (
      (await operations.canonicalPath(directory)) !== directory ||
      (await operations.canonicalPath(input.file)) !== input.file
    )
      throw fail('bootstrap-locator-changed');
    const receipt = await operations.observeProtection({ root: directory });
    guard = await operations.openProtectedRoot({ receipt });
    const snapshot = await guard.readSnapshot(path.basename(input.file));
    if (!snapshot) throw fail('bootstrap-file-missing');
    const value = parseBrokerBootstrapCore(snapshot.bytes);
    assertCollateralCompatible({
      manifest: readRuntimeCompatibility(),
      operation: 'read',
      metadata: [{ contract: 'brokerBootstrap', schema: value.schema }],
    });
    if (value.schema !== 'ai-peer-review.broker-bootstrap/v2')
      throw fail('executing-bootstrap-provenance-required');
    const runtime = await assertSelectedRuntime(context);
    const executingRoot = await realpath(loadedRoot);
    const node = await realpath(process.execPath);
    const packageBytes = await readFile(path.join(executingRoot, 'package.json'));
    verifyRuntimeInventorySync({
      packageRoot: executingRoot,
      previousObservation: runtime.inventory,
    });
    if (
      runtime.packageRoot !== executingRoot ||
      value.execution.package_root !== executingRoot ||
      value.execution.node_executable !== node ||
      value.execution.package_digest !== createHash('sha256').update(packageBytes).digest('hex') ||
      value.versions.package_version !== runtime.packageVersion ||
      value.versions.broker_protocol_version !== 1 ||
      value.versions.node_major !== Number(process.versions.node.split('.')[0]) ||
      !verifyRuntimeImage(value.runtimeImage)
    )
      throw fail('bootstrap-executing-runtime-changed');
    const project = await canonicalPortableProjectIdentity({
      cwd: worktree,
      operations,
      ...context,
    });
    if (
      value.project.physicalRoot !== project.physicalRoot ||
      value.project.digest !== project.digest ||
      JSON.stringify(value.project.tuple) !== JSON.stringify(project.tuple)
    )
      throw fail('bootstrap-project-changed');
    await assertSelectedRuntime({ previousObservation: runtime, ...context });
    assertProtectedSnapshotUnchanged(snapshot);
    bounded(context);
    const capability = Object.freeze({});
    const record = {
      value,
      context,
      file: input.file,
      snapshot,
      guard,
      runtime,
      closed: false,
      failed: false,
    };
    members.set(capability, record);
    retained.add(record);
    guard = null;
    return capability;
  } catch (error) {
    if (guard) {
      try {
        await guard.close();
      } catch (cleanup) {
        retained.add({ guard, context, file: input.file, failure: error });
        throw fail('bootstrap-cleanup-unproved', cleanup);
      }
    }
    throw error;
  }
}

export async function writePortableBrokerBootstrap(input = {}) {
  if (
    Object.keys(input).sort().join(',') !== 'project,runtimeImage' ||
    !input.project ||
    !input.runtimeImage
  )
    throw fail('bootstrap-writer-options-unproved');
  const image = structuredClone(input.runtimeImage);
  if (!verifyRuntimeImage(image)) throw fail('bootstrap-image-unproved');
  const context = await currentOperationAuthorityContext();
  const admittedRoot = await currentOperationAuthorityWorktree();
  const operations = await initializePortableOperations(context);
  const project = await canonicalPortableProjectIdentity({
    cwd: input.project.physicalRoot,
    operations,
    ...context,
  });
  if (
    project.physicalRoot !== admittedRoot ||
    input.project.digest !== project.digest ||
    JSON.stringify(input.project.tuple) !== JSON.stringify(project.tuple)
  )
    throw fail('bootstrap-writer-project-unproved');
  const runtime = await assertSelectedRuntime(context);
  const executingRoot = await realpath(loadedRoot);
  if (runtime.packageRoot !== executingRoot) throw fail('bootstrap-writer-runtime-unproved');
  const node = await realpath(process.execPath);
  const packageBytes = await readFile(path.join(executingRoot, 'package.json'));
  verifyRuntimeInventorySync({
    packageRoot: executingRoot,
    previousObservation: runtime.inventory,
  });
  const value = parseBrokerBootstrapCore(
    JSON.stringify({
      schema: 'ai-peer-review.broker-bootstrap/v2',
      execution: {
        package_root: executingRoot,
        node_executable: node,
        package_digest: createHash('sha256').update(packageBytes).digest('hex'),
      },
      project: { digest: project.digest, physicalRoot: project.physicalRoot, tuple: project.tuple },
      runtimeImage: brokerRuntimeImageRecordCore(image),
      versions: {
        package_version: runtime.packageVersion,
        broker_protocol_version: 1,
        node_major: Number(process.versions.node.split('.')[0]),
      },
    })
  );
  const directory = path.join(project.physicalRoot, '.scratch', 'peer-review', 'broker');
  const file = path.join(directory, 'bootstrap-' + randomUUID() + '.json');
  let guard;
  try {
    await performCurrentOperationEffect(async () => {
      const receipt = await ensurePortableRootProtection({
        root: directory,
        operations,
        ...context,
      });
      guard = await operations.openProtectedRoot({ receipt });
      const bytes = encodeBrokerBootstrapCore(value);
      await guard.writeExclusive(path.basename(file), bytes);
      const snapshot = await guard.readSnapshot(path.basename(file));
      if (!snapshot || !snapshot.bytes.equals(bytes)) throw fail('bootstrap-publication-unproved');
      await assertSelectedRuntime({ previousObservation: runtime, ...context });
      assertProtectedSnapshotUnchanged(snapshot);
    });
    await guard.close();
    guard = null;
    bounded(context);
    return Object.freeze({ file, value });
  } catch (error) {
    if (guard) {
      try {
        await guard.close();
      } catch (cleanup) {
        retained.add({ guard, context, file, failure: error });
        throw fail('bootstrap-writer-cleanup-unproved', cleanup);
      }
    }
    throw error;
  }
}
