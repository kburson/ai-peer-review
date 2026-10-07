// @story #175
import path from 'node:path';
import { provisionProtectedRoot, openProtectedRoot } from '../../src/broker/storage-protection.mjs';

// Actual owned-filesystem crash control; no production owner capability is claimed.
const root = process.argv[2];
const context = {
  signal: new AbortController().signal,
  deadline: performance.now() + (process.platform === 'win32' ? 180000 : 30000),
};
const receipt = await provisionProtectedRoot({ root, ...context });
const guard = await openProtectedRoot({ receipt, ...context });
await guard.writeExclusive('fixture-owner', Buffer.from('retained-through-crash'));
const expected = await guard.readSnapshot('fixture-owner');
const moved = await guard.quarantine('fixture-owner', expected, {
  destination: 'fixture-quarantine',
});
process.send({ status: moved.status, identity: moved.identity, root: path.basename(root) });
setInterval(() => {}, 1000);
