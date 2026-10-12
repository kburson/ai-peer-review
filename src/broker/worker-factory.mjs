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
  return Object.freeze(
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
}
