import { createHmac, timingSafeEqual } from 'node:crypto';

const PRIVATE_HEADERS = ['authorization', 'x-apr-instance', 'x-apr-worktree'];

export function validatePrivateBinding(binding) {
  return ['credential', 'instanceId', 'worktree'].every((key) =>
    /^[a-f0-9]{64}$/.test(binding?.[key] ?? '')
  );
}

function equal(actual, expected) {
  const a = Buffer.from(actual ?? '', 'utf8');
  const b = Buffer.from(expected ?? '', 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function authenticateLoopback(rawHeaders, binding) {
  const headers = new Map();
  for (let i = 0; i < rawHeaders.length; i += 2) {
    const name = rawHeaders[i].toLowerCase();
    const values = headers.get(name) ?? [];
    values.push(rawHeaders[i + 1]);
    headers.set(name, values);
  }
  if (headers.get('host')?.length !== 1 || headers.get('host')[0] !== `127.0.0.1:${binding.port}`)
    return { ok: false, status: 400 };
  if (
    headers.has('origin') ||
    [...headers.keys()].some((name) => name.startsWith('sec-fetch-')) ||
    headers.has('upgrade')
  )
    return { ok: false, status: 403 };
  if (
    !validatePrivateBinding(binding) ||
    PRIVATE_HEADERS.some((name) => headers.get(name)?.length !== 1)
  )
    return { ok: false, status: 401 };
  if (
    !equal(headers.get('authorization')[0], `Bearer ${binding.credential}`) ||
    !equal(headers.get('x-apr-instance')[0], binding.instanceId) ||
    !equal(headers.get('x-apr-worktree')[0], binding.worktree)
  )
    return { ok: false, status: 401 };
  return Object.freeze({ ok: true, instanceId: binding.instanceId, worktree: binding.worktree });
}

const HEX = /^[a-f0-9]{64}$/;
export function authenticateOwnerProof(rawHeaders, binding) {
  const headers = new Map();
  for (let i = 0; i < rawHeaders.length; i += 2) {
    const name = rawHeaders[i].toLowerCase();
    const values = headers.get(name) ?? [];
    values.push(rawHeaders[i + 1]);
    headers.set(name, values);
  }
  if (headers.get('host')?.length !== 1 || headers.get('host')[0] !== `127.0.0.1:${binding.port}`)
    return { ok: false, status: 400 };
  if (
    headers.has('origin') ||
    [...headers.keys()].some((name) => name.startsWith('sec-fetch-')) ||
    headers.has('upgrade')
  )
    return { ok: false, status: 403 };
  if (
    !validatePrivateBinding(binding) ||
    !HEX.test(binding.ownerVersion ?? '') ||
    PRIVATE_HEADERS.some((name) => headers.has(name)) ||
    headers.get('x-apr-challenge')?.length !== 1 ||
    !HEX.test(headers.get('x-apr-challenge')[0]) ||
    headers.get('content-length')?.length !== 1 ||
    headers.get('content-length')[0] !== '0' ||
    headers.has('transfer-encoding') ||
    headers.has('expect')
  )
    return { ok: false, status: 400 };
  return { ok: true, challenge: headers.get('x-apr-challenge')[0] };
}
function proofMessage(value) {
  return (
    'APR owner proof v1\0' +
    JSON.stringify([
      value.challenge,
      value.instanceId,
      value.worktree,
      value.ownerVersion,
      value.port,
      value.localAddress,
      value.localPort,
      value.remoteAddress,
      value.remotePort,
    ])
  );
}
export function createOwnerProof(binding, challenge, socket) {
  const value = {
    schema: 'ai-peer-review.owner-proof/v1',
    challenge,
    instanceId: binding.instanceId,
    worktree: binding.worktree,
    ownerVersion: binding.ownerVersion,
    port: binding.port,
    localAddress: socket.localAddress,
    localPort: socket.localPort,
    remoteAddress: socket.remoteAddress,
    remotePort: socket.remotePort,
  };
  return {
    ...value,
    mac: createHmac('sha256', Buffer.from(binding.credential, 'hex'))
      .update(proofMessage(value))
      .digest('hex'),
  };
}
export function verifyOwnerProof(value, { challenge, expected, endpoint, credential, socket }) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(',') !==
      'challenge,instanceId,localAddress,localPort,mac,ownerVersion,port,remoteAddress,remotePort,schema,worktree' ||
    value.schema !== 'ai-peer-review.owner-proof/v1' ||
    value.challenge !== challenge ||
    !HEX.test(value.mac ?? '')
  )
    return 'malformed-proof';
  if (['instanceId', 'worktree', 'ownerVersion'].some((key) => value[key] !== expected[key]))
    return 'owner-binding-mismatch';
  if (
    value.port !== endpoint.port ||
    value.localAddress !== '127.0.0.1' ||
    value.remoteAddress !== '127.0.0.1' ||
    value.localAddress !== socket.remoteAddress ||
    value.localPort !== socket.remotePort ||
    value.remoteAddress !== socket.localAddress ||
    value.remotePort !== socket.localPort
  )
    return 'channel-mismatch';
  const mac = createHmac('sha256', Buffer.from(credential, 'hex'))
    .update(proofMessage(value))
    .digest('hex');
  return equal(value.mac, mac) ? null : 'owner-proof-refused';
}
