// @story #136
import { createLiveDeliverySource } from './live-wait-api.mjs';
import { createHandoffMcpImplementation } from '../../src/mcp/server-core.mjs';
const mcp = createHandoffMcpImplementation({
  createLiveDeliverySource,
  withOperationAuthority: async (_input, operation) => operation(),
});
export const { createHandoffMcpServer, serveHandoffMcpStdio } = mcp;
