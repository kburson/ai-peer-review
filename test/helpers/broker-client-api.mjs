// @story #136
import { createBrokerClientOperations } from '../../src/broker/client-core.mjs';
export const { ensureBroker, bootstrapRecord, requestBroker, fenceManualRecovery } =
  createBrokerClientOperations({
    performCurrentOperationEffect: (operation) => operation(),
    assertCurrentOperationAuthority: () => {},
    // Explicit unverified protocol fixtures. Production fixes both dependencies.
    acquireManualRecoveryResource: async ({ deps }) =>
      deps.acquireRecoveryOwnership
        ? await deps.acquireRecoveryOwnership()
        : {
            verified: false,
            async verify() {
              return true;
            },
            async release() {},
            async retain() {},
          },
    authenticateManualOwnerConnection: async () => true,
  });
