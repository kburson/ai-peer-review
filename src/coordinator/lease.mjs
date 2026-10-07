// @story #136
import { performCurrentOperationEffect } from '../startup/authority-fence.mjs';
import { createCoordinatorLeaseOperations } from './lease-core.mjs';
const operations = createCoordinatorLeaseOperations({ performCurrentOperationEffect });
export const {
  inspectCoordinatorLease,
  inspectCoordinatorLeaseOptional,
  requestCoordinatorStop,
  acquireCoordinatorLease,
} = operations;
