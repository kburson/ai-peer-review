import { existsSync, readFileSync } from 'node:fs';
import { acquireBrokerOwnership } from '../../src/broker/ownership.mjs';
import { platformSecurity } from '../../src/broker/platform.mjs';
import { createAuthenticatedBrokerServer, runBroker } from '../../src/broker/service.mjs';

const { identity, paths, versions, recoveryMs, commandMs } = JSON.parse(
  readFileSync(process.argv[2], 'utf8')
);
const platform = platformSecurity();
const owner = acquireBrokerOwnership(
  { identity, paths, versions, reconcile: () => true, deferPublication: true },
  platform
);
const registration = { project_digest: identity.digest, review_id: 'slow', workspace: '/slow' };
let registrations = [registration];
const server = createAuthenticatedBrokerServer(owner, platform);
await runBroker({
  identity,
  owner,
  versions,
  registry: { list: () => registrations, get: () => registration },
  workerFactory: () => ({
    async start() {
      process.send({ recovering: true, advertised: existsSync(paths.metadata) });
      // Longer than the native handshake deadline, as on a loaded restart.
      await new Promise((resolve) => setTimeout(resolve, recoveryMs));
    },
    workState: () => 'terminal',
    async close() {
      registrations = [];
    },
  }),
  clock: { now: Date.now, setTimeout, clearTimeout },
  server: {
    ...server,
    start(dispatch) {
      server.start(async (command) => {
        if (command.command === 'status' && commandMs) {
          await new Promise((resolve) => setTimeout(resolve, commandMs));
        }
        return dispatch(command);
      });
    },
  },
});
process.disconnect();
