// @story #136
import {
  withOperationAuthority,
  assertCurrentOperationAuthority,
} from '../startup/authority-fence.mjs';
import { reserveReviewerLaunch, settleReservedReviewerLaunch } from './launch.mjs';
import { createBrokerService } from './service-core.mjs';
const service = createBrokerService({
  withOperationAuthority,
  assertCurrentOperationAuthority,
  reserveReviewerLaunch,
  settleReservedReviewerLaunch,
});
export function createAuthenticatedBrokerServer(...args) {
  return service.createAuthenticatedBrokerServer(...args);
}
export function runBroker(...args) {
  return service.runBroker(...args);
}
