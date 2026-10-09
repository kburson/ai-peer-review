export { bootstrapRecord } from './bootstrap-core.mjs';
// @story #189
import { realpath, lstat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as waitFor } from 'node:timers/promises';
import path from 'node:path';
import { AprError } from '../errors.mjs';
import { assertBrokerTransport } from './broker-protocol.mjs';
import { createPortableClientCore } from './client-core.mjs';
import { createManualRecoveryOperations } from './manual-recovery-core.mjs';
import { acquireManualRecoveryResource } from './manual-recovery-resource.mjs';
import { initializePortableOperations } from './portable-platform.mjs';
import { canonicalPortableProjectIdentity } from './identity.mjs';
import { portableBrokerPaths } from './portable-paths.mjs';
import { bindOwnerElectionPaths, inspectOwnerElectionPaths } from './ownership-election.mjs';
import {
  observeAuthenticatedOwner,
  joinVerifiedBroker,
  disposeAuthenticatedOwnerObservation,
} from './portable-ownership.mjs';
import { writePortableBrokerBootstrap } from './portable-bootstrap.mjs';
import { isInstalledProcessSourceAssurance } from '../protocol/process-source-assurance.mjs';
import {
  withOperationAuthority,
  currentOperationAuthorityContext,
  performCurrentOperationEffect,
  assertCurrentOperationAuthority,
} from '../startup/authority-fence.mjs';
const locators = new WeakMap();
const retained = new Set();
const stale = (reason, details = {}) =>
  new AprError('APR_BROKER_STALE', 'Portable broker observation is unproved.', {
    recovery: 'Preserve exact owner obligations and reconcile before retrying.',
    details: { reason, ...details },
  });
function validateInput(input) {
  assertBrokerTransport(input.transport ?? 'portable');
  if (
    Object.keys(input).some(
      (key) => !['project', 'runtimeImage', 'versions', 'transport'].includes(key)
    ) ||
    !path.isAbsolute(input.project?.physicalRoot ?? '')
  )
    throw new AprError('APR_BROKER_PROTOCOL', 'Portable broker inputs are unsupported.', {
      recovery: 'Use the fixed portable client with a canonical project and pinned image.',
    });
}
function locator(input) {
  const handle = Object.freeze({
    async close() {
      return { closed: true };
    },
  });
  locators.set(handle, structuredClone(input));
  return handle;
}
async function observe(input, context) {
  let bound, observation, client;
  const pending = { bound: null, client: null, context };
  retained.add(pending);
  try {
    const operations = await initializePortableOperations(context);
    if (!isInstalledProcessSourceAssurance(await operations.observeSource()))
      throw stale('source-class-unavailable');
    const project = await canonicalPortableProjectIdentity({
      cwd: input.project.physicalRoot,
      operations,
      ...context,
    });
    if (
      input.project.digest !== undefined &&
      (input.project.digest !== project.digest ||
        JSON.stringify(input.project.tuple) !== JSON.stringify(project.tuple))
    )
      throw stale('project-identity-changed');
    const paths = await portableBrokerPaths({ worktree: project.physicalRoot });
    const statuses = await Promise.all(
      [paths.privateRoot, paths.runtimeRoot].map(async (root) => {
        try {
          await lstat(root);
          return 'present';
        } catch (error) {
          if (error.code === 'ENOENT') return 'missing';
          throw error;
        }
      })
    );
    if (statuses.every((value) => value === 'missing')) {
      await assertCurrentOperationAuthority();
      retained.delete(pending);
      return { status: 'missing' };
    }
    if (statuses.includes('missing')) throw stale('partial-owner-roots');
    const receipts = await Promise.all(
      [paths.privateRoot, paths.runtimeRoot].map((root) => operations.observeProtection({ root }))
    );
    bound = await bindOwnerElectionPaths({
      receipt: receipts[0],
      effectReceipts: [receipts[1]],
      resource: { kind: 'broker-owner' },
      ...context,
    });
    pending.bound = bound;
    const view = await inspectOwnerElectionPaths({ paths: bound, ...context });
    const states = await Promise.all(
      [
        [view.privateGuard, 'owner.json'],
        [view.privateGuard, 'credential'],
        [view.runtimeGuard, 'endpoint.json'],
      ].map(async ([guard, name]) => {
        try {
          return await guard.readSnapshot(name);
        } catch (error) {
          if (error.code === 'ENOENT') return null;
          throw error;
        }
      })
    );
    if (states.every((value) => value === null)) {
      await assertCurrentOperationAuthority();
      await bound.close();
      retained.delete(pending);
      return { status: 'missing' };
    }
    if (states.some((value) => value === null)) throw stale('partial-owner-publication');
    observation = await observeAuthenticatedOwner({ paths: bound, ...context });
    if (observation.status !== 'authenticated-live')
      throw stale(observation.reason || 'owner-not-authenticated', {
        outstandingObligations: observation.outstandingObligations,
      });
    client = await joinVerifiedBroker({ binding: observation.owner.binding, ...context });
    pending.client = client;
    observation = null;
    await assertCurrentOperationAuthority();
    return Object.freeze({
      status: 'live',
      request: (value) => client.request(value),
      async close() {
        await client.close(context);
        await bound.close();
        retained.delete(pending);
      },
    });
  } catch (error) {
    if (observation) await disposeAuthenticatedOwnerObservation({ observation });
    if (client) await client.close(context);
    if (bound) await bound.close();
    retained.delete(pending);
    return { status: 'unknown', error };
  }
}
async function launch(input) {
  const bootstrap = await writePortableBrokerBootstrap({
    project: input.project,
    runtimeImage: input.runtimeImage,
  });
  const executable = await realpath(process.execPath);
  const entry = fileURLToPath(new URL('../../bin/peer-review-broker.mjs', import.meta.url));
  let child,
    exited = false,
    ready;
  await performCurrentOperationEffect(() => {
    child = spawn(executable, [entry, bootstrap.file], {
      shell: false,
      detached: true,
      stdio: 'ignore',
    });
    ready = new Promise((resolve, reject) => {
      child.once('spawn', resolve);
      child.once('error', reject);
      child.once('exit', (code, signal) => {
        exited = true;
        reject(stale('process-exited', { code, signal }));
      });
    });
    ready.catch(() => {});
  });
  return Object.freeze({ ready, exited: () => exited, unref: () => child.unref() });
}
const core = createPortableClientCore({
  observe,
  launch,
  current: assertCurrentOperationAuthority,
  effect: performCurrentOperationEffect,
  delay: (ms, context) => waitFor(ms, undefined, { signal: context.signal }),
});
export async function ensureBroker(input = {}) {
  validateInput(input);
  return withOperationAuthority(
    { operation: 'broker.start', cwd: input.project.physicalRoot },
    async () => {
      await core.ensure(input, await currentOperationAuthorityContext());
      return locator(input);
    }
  );
}
export async function connectPortableBroker({ cwd } = {}) {
  if (!path.isAbsolute(cwd ?? '')) throw stale('project-root-unproved');
  return locator({ project: { physicalRoot: cwd } });
}
export async function requestBroker(client, command, workspace = null) {
  const input = locators.get(client);
  if (!input) throw stale('genuine-client-locator-required');
  const context =
    command === 'status'
      ? Object.freeze({ signal: new AbortController().signal, deadline: performance.now() + 30000 })
      : null;
  return withOperationAuthority(
    {
      operation: 'broker.' + command,
      cwd: input.project.physicalRoot,
      reviewWorkspace: workspace ?? undefined,
    },
    async () =>
      core.request(input, command, workspace, context ?? (await currentOperationAuthorityContext()))
  );
}
const manualClients = new WeakMap();
const manual = createManualRecoveryOperations({
  performCurrentOperationEffect,
  acquireManualRecoveryResource,
  authenticateManualOwnerConnection: (client) => manualClients.has(client),
  connectManualOwner: async (cwd) => {
    const context = await currentOperationAuthorityContext();
    const state = await observe({ project: { physicalRoot: cwd } }, context);
    if (state.status !== 'live') throw stale('manual-owner-unavailable');
    const client = Object.freeze({});
    manualClients.set(client, { state, context });
    return client;
  },
  closeManualOwner: async (client) => {
    const held = manualClients.get(client);
    if (held) {
      await held.state.close();
      manualClients.delete(client);
    }
  },
  requestBroker: async (client, command, workspace) => {
    const held = manualClients.get(client);
    if (!held) throw stale('manual-owner-unproved');
    const { randomUUID } = await import('node:crypto');
    const result = await held.state.request({
      operation: command,
      body: { workspace },
      actionId: randomUUID(),
      ...held.context,
    });
    if (!result.ok) throw stale('manual-suspend-refused');
    return result.result;
  },
});
export async function fenceManualRecovery(workspace, deps = {}) {
  if (Object.keys(deps).length)
    throw new AprError('APR_BROKER_PROTOCOL', 'Manual production dependencies are fixed.', {
      recovery: 'Run manual recovery through the current selected package.',
    });
  return withOperationAuthority(
    { operation: 'broker.suspend', cwd: workspace, reviewWorkspace: workspace },
    () => manual.fenceManualRecovery(workspace)
  );
}
