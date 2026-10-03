import { timingSafeEqual } from 'node:crypto';

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
