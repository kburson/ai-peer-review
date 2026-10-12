import { AprError } from '../errors.mjs';
import {
  resolvePortableWorkerOwner,
  isPreparedPortableOwner,
  preparedPortableOwnerContext,
  publishedPortableBrokerOwner,
  inspectPreparedPortableRestorationOwner,
} from './portable-ownership.mjs';
// @story #136
import {
  withOperationAuthority,
  performCurrentOperationEffect,
  currentOperationAuthorityContext,
} from '../startup/authority-fence.mjs';
import { initializePortableOperations } from './portable-platform.mjs';
import { createProductionWorkerOperations } from './worker-factory-core.mjs';
import { inspectProviderResourceLease } from './provider-resources.mjs';
import {
  observeReconciliationInventory,
  readReconciliationInventory,
} from './portable-reconciliation-inventory.mjs';
import { readPortableRestorationBaseline } from './portable-reconciliation.mjs';
import { inspectReviewAuthority } from '../protocol/authority-reader.mjs';
const workerMembers = new WeakMap();
const restorationReceipts = new WeakMap();
const retainedRestorations = new Set();
const retainedRestorationWorkers = new Set();
const restorationStages = new Set(['start', 'suspend', 'close']);
async function beginRestoration(owner) {
  const context = preparedPortableOwnerContext(owner);
  const binding = await inspectPreparedPortableRestorationOwner({ owner, ...context });
  return {
    binding,
    before: await readPortableRestorationBaseline({
      observation: binding.observation,
      paths: binding.paths,
      ...context,
    }),
  };
}
async function finishRestoration(worker, stage, baseline) {
  const record = workerMembers.get(worker);
  const context = record.context;
  const facts = await inspectPortableWorkerResources({ worker, owner: record.owner, ...context });
  const after = await observeReconciliationInventory({ paths: baseline.binding.paths, ...context });
  const retained = {
    worker,
    owner: record.owner,
    registration: record.registration,
    context,
    authority: record.authority,
    stage,
    before: baseline.before,
    after,
    resources: facts.resources,
    protocolState: inspectReviewAuthority(record.registration.workspace).state.protocol.state,
  };
  retainedRestorations.add(retained);
  await readReconciliationInventory({
    observation: after,
    paths: baseline.binding.paths,
    ...context,
  });
  const receipt = Object.freeze({ verified: false, stage });
  restorationReceipts.set(receipt, retained);
  record.receipts.set(stage, receipt);
}
const operations = createProductionWorkerOperations({
  performCurrentOperationEffect,
  restorationOwner: isPreparedPortableOwner,
  ownerContext: async (owner) => {
    resolvePortableWorkerOwner(owner);
    return isPreparedPortableOwner(owner)
      ? preparedPortableOwnerContext(owner)
      : await currentOperationAuthorityContext();
  },
});
export async function createProductionReviewWorker(input = {}) {
  if (
    Object.keys(input).some(
      (key) => !['registration', 'project', 'runtimeImage', 'owner'].includes(key)
    )
  )
    throw new AprError(
      'APR_BROKER_START_FAILED',
      'Production worker requires fixed portable dependencies.',
      { recovery: 'Start workers through the current portable broker service.' }
    );
  const owner = resolvePortableWorkerOwner(input.owner);
  const restoring = isPreparedPortableOwner(owner);
  const authority = {
    operation: 'broker.register',
    cwd: input.registration?.project_root,
    reviewWorkspace: input.registration?.workspace,
    ...(isPreparedPortableOwner(owner) ? preparedPortableOwnerContext(owner) : {}),
  };
  let baseline;
  const worker = await withOperationAuthority(authority, async () => {
    if (restoring) baseline = await beginRestoration(owner);
    const context = await currentOperationAuthorityContext();
    const platform = await initializePortableOperations(context);
    return await operations.createProductionReviewWorker({
      ...input,
      owner,
      platform,
      clock: { now: () => Date.now(), setTimeout, clearTimeout },
    });
  });
  const mutations = new Set([
    'start',
    'activate',
    'reconcile',
    'suspend',
    'close',
    'launchReviewer',
  ]);
  const wrapped = Object.freeze(
    Object.fromEntries(
      Object.entries(worker).map(([name, value]) => [
        name,
        mutations.has(name) && typeof value === 'function'
          ? (...args) => {
              resolvePortableWorkerOwner(owner);
              if (name === 'activate') publishedPortableBrokerOwner(owner);
              const current = isPreparedPortableOwner(owner)
                ? { ...authority, ...preparedPortableOwnerContext(owner) }
                : {
                    operation: authority.operation,
                    cwd: authority.cwd,
                    reviewWorkspace: authority.reviewWorkspace,
                  };
              return withOperationAuthority(current, async () => {
                const before =
                  isPreparedPortableOwner(owner) && restorationStages.has(name)
                    ? await beginRestoration(owner)
                    : null;
                const result = await value.apply(worker, args);
                if (before) await finishRestoration(wrapped, name, before);
                return result;
              });
            }
          : value,
      ])
    )
  );
  workerMembers.set(wrapped, {
    worker,
    owner,
    registration: structuredClone(input.registration),
    context: isPreparedPortableOwner(owner) ? preparedPortableOwnerContext(owner) : null,
    authority,
    receipts: new Map(),
  });
  // Retain the completed factory worker if its first receipt fails before the
  // service receives it; its acquired handles must remain recoverable.
  if (restoring) retainedRestorationWorkers.add(wrapped);
  if (baseline)
    await withOperationAuthority(authority, () => finishRestoration(wrapped, 'created', baseline));
  return wrapped;
}

export async function inspectPortableWorkerResources(input = {}) {
  const record = workerMembers.get(input.worker);
  if (
    Object.keys(input).sort().join(',') !== 'deadline,owner,signal,worker' ||
    !record ||
    input.owner !== record.owner ||
    !record.context ||
    input.signal !== record.context.signal ||
    input.deadline !== record.context.deadline
  )
    throw new AprError(
      'APR_BROKER_START_FAILED',
      'Genuine restoration worker binding is required.',
      {
        recovery: 'Retain the original prepared owner, worker and startup context.',
      }
    );
  await inspectPreparedPortableRestorationOwner({ owner: record.owner, ...record.context });
  const resources = operations.inspectWorkerResources(record.worker);
  const facts = [];
  for (const lease of resources.leases)
    facts.push(
      await inspectProviderResourceLease({ lease, signal: input.signal, deadline: input.deadline })
    );
  await inspectPreparedPortableRestorationOwner({ owner: record.owner, ...record.context });
  return Object.freeze({
    verified: false,
    registration: structuredClone(record.registration),
    resources: Object.freeze(facts),
    workState: record.worker.workState(),
  });
}
export function portableWorkerRestorationReceipt(input = {}) {
  const record = workerMembers.get(input.worker);
  if (
    Object.keys(input).sort().join(',') !== 'stage,worker' ||
    !record ||
    !record.receipts.has(input.stage)
  )
    throw new AprError(
      'APR_BROKER_START_FAILED',
      'Genuine worker restoration receipt is required.',
      { recovery: 'Retain the original completed worker transition.' }
    );
  return record.receipts.get(input.stage);
}
export async function inspectPortableWorkerRestorationReceipt(input = {}) {
  const record = restorationReceipts.get(input.receipt);
  if (
    Object.keys(input).sort().join(',') !== 'deadline,owner,receipt,signal' ||
    !record ||
    input.owner !== record.owner ||
    input.signal !== record.context.signal ||
    input.deadline !== record.context.deadline
  )
    throw new AprError(
      'APR_BROKER_START_FAILED',
      'Genuine worker restoration receipt is required.',
      { recovery: 'Retain the original owner, worker, receipt and startup context.' }
    );
  const fresh = await inspectPortableWorkerRestorationResources(input);
  const binding = await inspectPreparedPortableRestorationOwner({
    owner: record.owner,
    ...record.context,
  });
  await readReconciliationInventory({
    observation: record.after,
    paths: binding.paths,
    ...record.context,
  });
  return Object.freeze({ ...record, resources: fresh.resources });
}
export async function inspectPortableWorkerRestorationResources(input = {}) {
  const record = restorationReceipts.get(input.receipt);
  if (
    Object.keys(input).sort().join(',') !== 'deadline,owner,receipt,signal' ||
    !record ||
    input.owner !== record.owner ||
    input.signal !== record.context.signal ||
    input.deadline !== record.context.deadline
  )
    throw new AprError(
      'APR_BROKER_START_FAILED',
      'Genuine worker restoration receipt is required.',
      { recovery: 'Retain the exact original restoration receipt and leases.' }
    );
  return withOperationAuthority(record.authority, () =>
    inspectPortableWorkerResources({
      worker: record.worker,
      owner: record.owner,
      ...record.context,
    })
  );
}
