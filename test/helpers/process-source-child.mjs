// @story #170
// Owned conformance child: no provider, descendants, filesystem effects or secrets.
let nonce = null;
const timeout = setTimeout(() => process.exit(2), 30000);
process.on('message', (message) => {
  if (message?.op === 'start' && nonce === null && /^[a-f0-9]{64}$/u.test(message.nonce)) {
    nonce = message.nonce;
    process.send?.({ event: 'ready', nonce, pid: process.pid });
  } else if (message?.op === 'ping' && message.nonce === nonce) {
    process.send?.({ event: 'alive', nonce, pid: process.pid });
  } else if (message?.op === 'stop' && message.nonce === nonce) {
    clearTimeout(timeout);
    process.disconnect();
    process.exitCode = 0;
  }
});
