import { existsSync, readFileSync } from 'node:fs';
import { acquireBrokerOwnership } from '../../src/broker/ownership.mjs';
import { platformSecurity } from '../../src/broker/platform.mjs';
import { createAuthenticatedBrokerServer, runBroker } from '../helpers/broker-service-api.mjs';

const { identity, paths, versions, recoveryMs, commandMs, occupiedMs, idleRetire } = JSON.parse(
  readFileSync(process.argv[2], 'utf8')
);
const platform = platformSecurity();
const owner = acquireBrokerOwnership(
  { identity, paths, versions, reconcile: () => true, deferPublication: true },
  platform
);
const registration = { project_digest: identity.digest, review_id: 'slow', workspace: '/slow' };
let registrations = idleRetire ? [] : [registration];
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
  clock: {
    now: Date.now,
    setTimeout(callback, milliseconds) {
      // Accelerate only the genuine empty broker's ordinary idle timer.
      return setTimeout(callback, idleRetire && milliseconds === 60_000 ? 5_000 : milliseconds);
    },
    clearTimeout,
  },
  server: {
    ...server,
    start(dispatch) {
      server.start(async (command) => {
        if (command.command === 'status' && commandMs) {
          await new Promise((resolve) => setTimeout(resolve, commandMs));
        }
        const result = await dispatch(command);
        if (command.command === 'status' && occupiedMs) {
          setTimeout(() => {
            process.send({ occupied: true });
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, occupiedMs);
          }, 0);
        }
        return result;
      });
    },
  },
});
process.disconnect();
