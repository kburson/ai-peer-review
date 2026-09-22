import assert from 'node:assert/strict';
import net from 'node:net';
// Run before isolation and from both the host and pinned Node after isolation.
const expected = process.argv[2];
assert.ok(['open', 'blocked'].includes(expected));
const connected = await new Promise((resolve) => {
  const socket = net.connect({ host: '1.1.1.1', port: 443 });
  const finish = (value) => {
    socket.destroy();
    resolve(value);
  };
  socket.once('connect', () => finish(true));
  socket.once('error', () => finish(false));
  socket.setTimeout(2000, () => finish(false));
});
assert.equal(connected, expected === 'open', `Expected outbound TCP to be ${expected}`);
console.log(`Outbound TCP verified ${expected}.`);
