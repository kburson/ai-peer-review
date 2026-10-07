// @story #136
import { performCurrentOperationEffect } from '../startup/authority-fence.mjs';
import { createLiveWaitOperations } from './live-wait-core.mjs';
export const { createLiveDeliverySource, createLiveWaitTransport } = createLiveWaitOperations({
  performCurrentOperationEffect,
});
