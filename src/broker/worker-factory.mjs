// @story #136
import {
  withOperationAuthority,
  performCurrentOperationEffect,
} from '../startup/authority-fence.mjs';
import { createProductionWorkerOperations } from './worker-factory-core.mjs';
const operations = createProductionWorkerOperations({ performCurrentOperationEffect });
export async function createProductionReviewWorker(input = {}) {
  const authority = {
    operation: 'broker.register',
    cwd: input.registration?.project_root,
    reviewWorkspace: input.registration?.workspace,
  };
  const worker = await withOperationAuthority(authority, () =>
    operations.createProductionReviewWorker(input)
  );
  const mutations = new Set(['start', 'reconcile', 'suspend', 'close', 'launchReviewer']);
  return Object.freeze(
    Object.fromEntries(
      Object.entries(worker).map(([name, value]) => [
        name,
        mutations.has(name) && typeof value === 'function'
          ? (...args) => withOperationAuthority(authority, () => value.apply(worker, args))
          : value,
      ])
    )
  );
}
