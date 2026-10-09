// @story #189
// Explicit unverified manual protocol ports; production dependencies are fixed.
import { createManualRecoveryOperations } from '../../src/broker/manual-recovery-core.mjs';
export function createBrokerClientOperations({
  performCurrentOperationEffect,
  acquireManualRecoveryResource,
  authenticateManualOwnerConnection = async () => false,
}) {
  return createManualRecoveryOperations({
    performCurrentOperationEffect,
    acquireManualRecoveryResource,
    authenticateManualOwnerConnection,
    connectManualOwner: (_cwd, deps) => deps.connect(),
    requestBroker: (client, command, workspace) => client.request({ command, workspace }),
    closeManualOwner: async (client) => {
      const outcomes = await Promise.allSettled([
        Promise.resolve().then(() => client?.close?.()),
        Promise.resolve().then(() => client?.connection?.close?.()),
      ]);
      const failure = outcomes.find((value) => value.status === 'rejected');
      if (failure) throw failure.reason;
    },
  });
}
