// @story #136
import { withOperationAuthority } from '../startup/authority-fence.mjs';
import { createLiveDeliverySource } from '../transport/live-wait.mjs';
import { createHandoffMcpImplementation } from './server-core.mjs';
const mcp = createHandoffMcpImplementation({ withOperationAuthority, createLiveDeliverySource });
export function createHandoffMcpServer(...args) {
  return mcp.createHandoffMcpServer(...args);
}
export function serveHandoffMcpStdio(...args) {
  return mcp.serveHandoffMcpStdio(...args);
}
