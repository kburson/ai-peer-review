// @story #136
import {
  performCurrentOperationEffect,
  withOperationAuthority,
} from '../startup/authority-fence.mjs';
import { createCoordinatorOperations } from './service-core.mjs';
const operations = createCoordinatorOperations({ performCurrentOperationEffect });
export function reconcileWake(input = {}) {
  return withOperationAuthority(
    { operation: 'broker.reconcile', cwd: input.workspace, reviewWorkspace: input.workspace },
    () => operations.reconcileWake(input)
  );
}
export const coordinatorStatus = operations.coordinatorStatus;
export function runCoordinator(input = {}) {
  return withOperationAuthority(
    { operation: 'broker.reconcile', cwd: input.workspace, reviewWorkspace: input.workspace },
    () => operations.runCoordinator(input)
  );
}
