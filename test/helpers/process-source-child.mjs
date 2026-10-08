// @story #170
// Owned conformance child: no provider, descendants, filesystem effects or secrets.
let nonce = null;
let sequence = 0;
let stopping = false;
let timeout = setTimeout(() => process.exit(2), 5000);
process.on('message', (message) => {
  if (
    message?.op === 'start' &&
    nonce === null &&
    /^[a-f0-9]{64}$/u.test(message.nonce) &&
    Number.isSafeInteger(message.lifetimeMs) &&
    message.lifetimeMs > 0 &&
    message.lifetimeMs <= 800000
  ) {
    nonce = message.nonce;
    clearTimeout(timeout);
    timeout = setTimeout(() => process.exit(2), message.lifetimeMs);
    process.send?.({ event: 'ready', nonce, pid: process.pid });
  } else if (
    message?.op === 'ping' &&
    message.nonce === nonce &&
    Number.isSafeInteger(message.sequence) &&
    message.sequence === sequence + 1
  ) {
    sequence = message.sequence;
    process.send?.({ event: 'alive', nonce, pid: process.pid, sequence });
  } else if (message?.op === 'stop' && message.nonce === nonce) {
    stopping = true;
    clearTimeout(timeout);
    process.disconnect();
    process.exitCode = 0;
  }
});

process.on('disconnect', () => {
  clearTimeout(timeout);
  if (!stopping) process.exitCode = 2;
});
