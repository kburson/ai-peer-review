// @story #136
import {
  withOperationAuthority,
  performCurrentOperationEffect,
} from '../startup/authority-fence.mjs';
import { createBrokerClientOperations } from './client-core.mjs';
const operations = createBrokerClientOperations({ performCurrentOperationEffect });
export const bootstrapRecord = operations.bootstrapRecord;
export function ensureBroker(input = {}) {
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
