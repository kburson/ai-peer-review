// @story #136
import { createCoordinatorLeaseOperations } from '../../src/coordinator/lease-core.mjs';
export const {
  inspectCoordinatorLease,
  inspectCoordinatorLeaseOptional,
  requestCoordinatorStop,
  acquireCoordinatorLease,
} = createCoordinatorLeaseOperations({ performCurrentOperationEffect: (operation) => operation() });
