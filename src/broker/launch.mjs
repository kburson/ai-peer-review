// @story #136
import {
  withOperationAuthority,
  performCurrentOperationEffect,
} from '../startup/authority-fence.mjs';
import { createBrokerLaunchOperations } from './launch-core.mjs';
const operations = createBrokerLaunchOperations({ performCurrentOperationEffect });
export function reserveReviewerLaunch(input) {
  return withOperationAuthority(
    {
      operation: 'broker.launch',
      cwd: input?.registration?.workspace,
      reviewWorkspace: input?.registration?.workspace,
    },
    () => operations.reserveReviewerLaunch(input)
  );
}
export function settleReservedReviewerLaunch(input) {
  return withOperationAuthority(
    {
      operation: 'broker.launch',
      cwd: input?.registration?.workspace,
      reviewWorkspace: input?.registration?.workspace,
    },
    () => operations.settleReservedReviewerLaunch(input)
  );
}
export function launchReviewerOperation(input) {
  return withOperationAuthority(
    {
      operation: 'broker.launch',
      cwd: input?.registration?.workspace,
      reviewWorkspace: input?.registration?.workspace,
    },
    () => operations.launchReviewerOperation(input)
  );
}
export function reconcileReviewerLaunch(input) {
  return withOperationAuthority(
    {
      operation: 'broker.launch',
      cwd: input?.registration?.workspace,
      reviewWorkspace: input?.registration?.workspace,
    },
    () => operations.reconcileReviewerLaunch(input)
  );
}
