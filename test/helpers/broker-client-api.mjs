// @story #136
import { createBrokerClientOperations } from '../../src/broker/client-core.mjs';
export const { ensureBroker, bootstrapRecord, requestBroker, fenceManualRecovery } =
  createBrokerClientOperations({ performCurrentOperationEffect: (operation) => operation() });
