import { ensurePortableRootProtection } from './portable-root.mjs';
// @story #189
// Fixed production composition. Protocol callbacks are not caller dependencies.
import path from 'node:path';
import { AprError } from '../errors.mjs';
import { initializePortableOperations } from './portable-platform.mjs';
import { canonicalPortableProjectIdentity } from './identity.mjs';
import { portableBrokerPaths } from './portable-paths.mjs';
import {
  preparePortableOwner,
  isPreparedPortableOwner,
  publishedPortableBrokerOwner,
} from './portable-ownership.mjs';
import {
  assertPortableBrokerBootstrap,
  portableBrokerBootstrapContext,
} from './portable-bootstrap.mjs';
import { createPortableBrokerServer, portableBrokerLifecycleAdmission } from './service.mjs';
import { createBrokerService } from './service-core.mjs';
import { reconcileRegistrations, inspectStartupAuthority } from './registry.mjs';
import { createProductionReviewWorker } from './worker-factory.mjs';
import { reserveReviewerLaunch, settleReservedReviewerLaunch } from './launch.mjs';
import { assertSelectedRuntime } from '../config/runtime-selection.mjs';
import { assertCurrentCleanupOwnership } from '../protocol/compatibility.mjs';
import {
  withOperationAuthority,
  withPortableBrokerLifecycleAuthority,
  assertCurrentOperationAuthority,
  currentOperationAuthorityContext,
  currentOperationAuthorityWorktree,
} from '../startup/authority-fence.mjs';
const members = new WeakMap();
const retained = new Set();
function fail(reason, cause) {
  const error = new AprError(
    'APR_BROKER_START_FAILED',
    'Portable broker service could not be established.',
    {
      recovery:
        'Retain exact bootstrap, worker and owner obligations and reconcile before retrying.',
      details: { reason },
    }
  );
  if (cause) error.cause = cause;
  return error;
}
export async function startPortableBrokerService(input = {}) {
  if (Object.keys(input).join(',') !== 'bootstrap') throw fail('fixed-service-input-required');
  const bootstrap = await assertPortableBrokerBootstrap(input.bootstrap);
  const context = portableBrokerBootstrapContext(input.bootstrap);
  const current = await currentOperationAuthorityContext();
  if (
    current.signal !== context.signal ||
    current.deadline !== context.deadline ||
    (await currentOperationAuthorityWorktree()) !== bootstrap.project.physicalRoot
  )
    throw fail('service-startup-context-mismatch');
  const operations = await initializePortableOperations(context);
  const identity = await canonicalPortableProjectIdentity({
    cwd: bootstrap.project.physicalRoot,
    operations,
    ...context,
  });
  if (
    identity.digest !== bootstrap.project.digest ||
    JSON.stringify(identity.tuple) !== JSON.stringify(bootstrap.project.tuple)
  )
    throw fail('service-project-changed');
  const paths = await portableBrokerPaths({ worktree: identity.physicalRoot });
  const protection = {
    private: await ensurePortableRootProtection({
      root: paths.privateRoot,
      operations,
      ...context,
    }),
    runtime: await ensurePortableRootProtection({
      root: paths.runtimeRoot,
      operations,
      ...context,
    }),
  };
  await assertPortableBrokerBootstrap(input.bootstrap);
  await assertCurrentOperationAuthority();
  const owner = await preparePortableOwner({
    worktree: identity.physicalRoot,
    paths,
    protection,
    reconcile: async () => {},
    ...context,
  });
  if (!isPreparedPortableOwner(owner)) {
    const joined = { bootstrap: input.bootstrap, owner, identity, paths };
    retained.add(joined);
    await owner.close(context);
    retained.delete(joined);
    throw fail('another-owner-already-live');
  }
  const server = createPortableBrokerServer({ owner });
  const record = { bootstrap: input.bootstrap, owner, server, identity, run: null };
  retained.add(record);
  const runtime = await assertSelectedRuntime(context);
  const store = {
    root: path.join(identity.physicalRoot, '.scratch', 'peer-review', 'broker', 'registrations'),
  };
  const registrations = () =>
    reconcileRegistrations({ project: identity, store, inspectAuthority: inspectStartupAuthority });
  const service = createBrokerService({
    withOperationAuthority,
    assertCurrentOperationAuthority,
    reserveReviewerLaunch,
    settleReservedReviewerLaunch,
    withLifecycleAuthority: async (authority, operation) => {
      if (isPreparedPortableOwner(owner)) {
        if (authority.cwd !== identity.physicalRoot) throw fail('service-lifecycle-root-mismatch');
        return withOperationAuthority({ ...authority, ...context }, operation);
      }
      const phase = authority.operation === 'broker.stop' ? 'cleanup' : 'reconcile';
      return withPortableBrokerLifecycleAuthority(
        portableBrokerLifecycleAdmission(server, phase),
        operation
      );
    },
  });
  const run = service.startBroker({
    identity,
    versions: bootstrap.versions,
    owner: {
      instanceId: owner.instanceId,
      async publish() {
        await assertPortableBrokerBootstrap(input.bootstrap);
        await assertCurrentOperationAuthority();
        const result = await owner.publish();
        await assertCurrentOperationAuthority();
        return result;
      },
      release: async () => owner.release(await currentOperationAuthorityContext()),
    },
    registry: {
      list: registrations,
      async get(workspace) {
        return (await registrations()).find((value) => value.workspace === workspace) ?? null;
      },
    },
    workerFactory: (registration) =>
      createProductionReviewWorker({
        registration,
        project: identity,
        runtimeImage: bootstrap.runtimeImage,
        owner,
      }),
    cleanupGuard: async () => {
      const cleanupContext = await currentOperationAuthorityContext();
      const selected = await assertSelectedRuntime({
        previousObservation: runtime,
        ...cleanupContext,
      });
      if (isPreparedPortableOwner(owner)) {
        await assertPortableBrokerBootstrap(input.bootstrap);
        if ((await owner.verify(context)) !== true) throw fail('prepared-cleanup-owner-unproved');
        return;
      }
      await assertCurrentCleanupOwnership({
        owner: publishedPortableBrokerOwner(owner),
        protocol: bootstrap.versions.broker_protocol_version,
        runtime: selected.inventory,
        context: cleanupContext,
      });
    },
    clock: { now: () => Date.now(), setTimeout, clearTimeout },
    server,
  });
  record.run = run;
  const lifecycle = Object.freeze({ ready: run.ready, untilStopped: run.untilStopped });
  members.set(lifecycle, record);
  run.untilStopped.then(
    () => retained.delete(record),
    () => {}
  );
  return lifecycle;
}
export function isPortableBrokerService(value) {
  return members.has(value);
}
