import { readFileSync } from 'node:fs';
import { acquireBrokerOwnership } from '../../src/broker/ownership.mjs';
import { platformSecurity } from '../../src/broker/platform.mjs';
import { createAuthenticatedBrokerServer, runBroker } from '../../src/broker/service.mjs';

const { identity, paths, versions } = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const platform = platformSecurity();
const owner = acquireBrokerOwnership(
  { identity, paths, versions, reconcile: () => true, deferPublication: true },
  platform
);
const registration = { project_digest: identity.digest, review_id: 'slow', workspace: '/slow' };
let registrations = [registration];
await runBroker({
  identity,
  owner,
  versions,
  registry: { list: () => registrations, get: () => registration },
  workerFactory: () => ({
    async start() {
      process.send({ recovering: true });
      // Longer than the native handshake deadline, as on a loaded restart.
      await new Promise((resolve) => setTimeout(resolve, 6_000));
    },
    workState: () => 'terminal',
    async close() {
      registrations = [];
    },
  }),
  clock: { now: Date.now, setTimeout, clearTimeout },
  server: createAuthenticatedBrokerServer(owner, platform),
});
process.disconnect();
