import { AprError } from '../errors.mjs';
import {
  resolvePortableWorkerOwner,
  isPreparedPortableOwner,
  preparedPortableOwnerContext,
  publishedPortableBrokerOwner,
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
const workerMembers = new WeakMap();
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
  const authority = {
    operation: 'broker.register',
    cwd: input.registration?.project_root,
    reviewWorkspace: input.registration?.workspace,
    ...(isPreparedPortableOwner(owner) ? preparedPortableOwnerContext(owner) : {}),
  };
  const worker = await withOperationAuthority(authority, async () => {
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
              return withOperationAuthority(current, () => value.apply(worker, args));
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
  });
  return wrapped;
}

export async function inspectPortableWorkerResources(input = {}) {
  const record = workerMembers.get(input.worker);
  if (
    Object.keys(input).sort().join(',') !== 'deadline,owner,signal,worker' ||
    !record ||
    input.owner !== record.owner ||
    !record.context ||
    !isPreparedPortableOwner(record.owner) ||
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
  resolvePortableWorkerOwner(record.owner);
  await record.owner.verify(record.context);
  const resources = operations.inspectWorkerResources(record.worker);
  const facts = [];
  for (const lease of resources.leases)
    facts.push(
      await inspectProviderResourceLease({ lease, signal: input.signal, deadline: input.deadline })
    );
  await record.owner.verify(record.context);
  return Object.freeze({
    verified: false,
    registration: structuredClone(record.registration),
    resources: Object.freeze(facts),
  });
}
