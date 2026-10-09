import { assertBrokerTransport } from './ipc.mjs';
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
export function createLegacyBrokerServer(...args) {
  return service.createAuthenticatedBrokerServer(...args);
}
export function runBroker(...args) {
  return service.runBroker(...args);
}

export { createLegacyBrokerServer as createAuthenticatedBrokerServer };
export const IDLE_MILLISECONDS = service.IDLE_MILLISECONDS;
export function createPortableBrokerServer() {
  assertBrokerTransport('portable');
}
