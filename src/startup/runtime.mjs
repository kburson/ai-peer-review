import {
  performCurrentOperationEffect,
  withOperationAuthority,
  revalidateOperationAuthority,
} from './authority-fence.mjs';
// @story #136
import { startReview } from '../cli/run.mjs';
import { ensureBroker } from '../broker/client.mjs';
import { productionProviderAdapters } from '../providers/registry.mjs';
import { createStartupRuntime } from './runtime-core.mjs';
let runtime;
const preparationFences = new WeakMap();
export function prepareStartup(input, ...args) {
  return withOperationAuthority({ operation: 'start', cwd: input?.cwd }, async (fence) => {
    runtime ??= createStartupRuntime({
      startReview: (...args) => startReview(...args),
      ensureBroker,
      productionProviderAdapters,
      performCurrentOperationEffect,
    });
    const prepared = await runtime.prepareStartup(input, ...args);
    preparationFences.set(prepared, fence);
    return prepared;
  });
}
export function requireStartupIssue(...args) {
  runtime ??= createStartupRuntime({
    startReview: (...args) => startReview(...args),
    ensureBroker,
    productionProviderAdapters,
    performCurrentOperationEffect,
  });
  return runtime.requireStartupIssue(...args);
}
export async function activateStartup(input, ...args) {
  if (preparationFences.has(input))
    await revalidateOperationAuthority(preparationFences.get(input));
  return withOperationAuthority({ operation: 'start', cwd: input?.paths?.root }, () => {
    runtime ??= createStartupRuntime({
      startReview: (...args) => startReview(...args),
      ensureBroker,
      productionProviderAdapters,
      performCurrentOperationEffect,
    });
    return runtime.activateStartup(input, ...args);
  });
}
export function validateRuntimeDescriptor(...args) {
  runtime ??= createStartupRuntime({
    startReview: (...args) => startReview(...args),
    ensureBroker,
    productionProviderAdapters,
    performCurrentOperationEffect,
  });
  return runtime.validateRuntimeDescriptor(...args);
}
export function assertRequestedReviewer(...args) {
  runtime ??= createStartupRuntime({
    startReview: (...args) => startReview(...args),
    ensureBroker,
    productionProviderAdapters,
    performCurrentOperationEffect,
  });
  return runtime.assertRequestedReviewer(...args);
}
export function selectRuntime(...args) {
  runtime ??= createStartupRuntime({
    startReview: (...args) => startReview(...args),
    ensureBroker,
    productionProviderAdapters,
    performCurrentOperationEffect,
  });
  return runtime.selectRuntime(...args);
}
export function observeSelectedRuntime(...args) {
  runtime ??= createStartupRuntime({
    startReview: (...args) => startReview(...args),
    ensureBroker,
    productionProviderAdapters,
    performCurrentOperationEffect,
  });
  return runtime.observeSelectedRuntime(...args);
}
