// @story #136
import { createCoordinatorOperations } from '../../src/coordinator/service-core.mjs';
import * as lease from './coordinator-lease-api.mjs';
import * as ledger from './coordinator-ledger-api.mjs';
export const { reconcileWake, coordinatorStatus, runCoordinator } = createCoordinatorOperations({
  performCurrentOperationEffect: (operation) => operation(),
  ...lease,
  ...ledger,
});
