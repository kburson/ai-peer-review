// @story #136
import { reserveReviewerLaunch, settleReservedReviewerLaunch } from './broker-launch-api.mjs';
import { createBrokerService } from '../../src/broker/service-core.mjs';
const service = createBrokerService({
  withOperationAuthority: async (_input, operation) => operation(),
  assertCurrentOperationAuthority: () => {},
  reserveReviewerLaunch,
  settleReservedReviewerLaunch,
});
export const { runBroker } = service;
export { createLegacyBrokerServer as createAuthenticatedBrokerServer } from '../../src/broker/legacy-service-core.mjs';
