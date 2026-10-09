import { assertBrokerTransport } from './ipc.mjs';
// @story #136
import {
  withOperationAuthority,
  performCurrentOperationEffect,
  assertCurrentOperationAuthority,
} from '../startup/authority-fence.mjs';
import { createBrokerClientOperations } from './client-core.mjs';
const operations = createBrokerClientOperations({
  performCurrentOperationEffect,
  assertCurrentOperationAuthority,
});
export const bootstrapRecord = operations.bootstrapRecord;
export async function ensureBroker(input = {}) {
  assertBrokerTransport(input.transport ?? 'legacy');
  return withOperationAuthority(
    { operation: 'broker.start', cwd: input.project?.physicalRoot },
    () => operations.ensureBroker(input)
  );
}
export function requestBroker(client, command, workspace = null) {
  if (command === 'status') return operations.requestBroker(client, command, workspace);
  return withOperationAuthority(
    {
      operation: 'broker.' + command,
      cwd: client?.handshake?.tuple?.[1] ?? workspace,
      reviewWorkspace: workspace ?? undefined,
    },
    () => operations.requestBroker(client, command, workspace)
  );
}
export function fenceManualRecovery(workspace, deps = {}) {
  return withOperationAuthority(
    { operation: 'broker.suspend', cwd: workspace, reviewWorkspace: workspace },
    () => operations.fenceManualRecovery(workspace, deps)
  );
}
