// @story #178
// Test-owned process/crash schedule only; no installed source-class admission.
import { transactionFixture, deadOriginal } from './portable-owner-transaction.mjs';
import { actualElection } from './portable-owner-election.mjs';
import { acquirePortableOwnerCore } from '../../src/broker/portable-ownership-core.mjs';
const [root, phase] = process.argv.slice(2),
  t = { after() {} };
setInterval(() => {}, 1000);
const fixture = await transactionFixture(t, { root });
const marker = () => console.log(JSON.stringify({ pid: process.pid, phase, root }));
const hold = async () => {
  marker();
  await new Promise(() => {});
};
if (phase === 'choosing') {
  fixture.ports.elect = (context) =>
    actualElection(t, {
      root: fixture.privateRoot,
      budget: context,
      onTransition: async (name) => {
        if (name === 'choosing-published') await hold();
      },
    });
} else if (phase === 'owner') {
  const create = fixture.ports.create;
  fixture.ports.create = async (...args) => {
    const result = await create(...args);
    await hold();
    return result;
  };
} else if (phase === 'quarantine') {
  const identity = await deadOriginal(t);
  await fixture.seed(identity);
  fixture.ports.observeProcess = async () => ({
    status: 'dead',
    host: identity.host,
    pid: identity.pid,
    scope: 'original-process-only',
  });
  const quarantine = fixture.ports.quarantine;
  fixture.ports.quarantine = async (...args) => {
    const result = await quarantine(...args);
    await hold();
    return result;
  };
} else throw Error('unknown crash phase');
await acquirePortableOwnerCore({ ports: fixture.ports, budget: fixture.startup });
throw Error('crash barrier not reached');
