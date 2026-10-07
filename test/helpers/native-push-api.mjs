// @story #136
import { createNativePushOperations } from '../../src/transport/native-push-core.mjs';
export const { createNativePushTransport } = createNativePushOperations({
  withOperationAuthority: async (_input, operation) => operation(),
  performCurrentOperationEffect: (operation) => operation(),
});
