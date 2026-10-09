// @story #136
import { createLiveWaitOperations } from '../../src/transport/live-wait-core.mjs';
export const { createLiveDeliverySource, createLiveWaitTransport } = createLiveWaitOperations({
  performCurrentOperationEffect: (operation) => operation(),
});
