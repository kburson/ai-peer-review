// @story #134
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { devNull } from 'node:os';
import { AprError } from '../errors.mjs';
const cli = createRequire(import.meta.url).resolve('prettier/bin/prettier.cjs');
const reference = fileURLToPath(
  new URL('../../templates/integration/format-v1.json', import.meta.url)
);
const cache = new Map();
function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sorted(value[key])])
    );
  return value;
}
export function ownedContentDigest(bytes, kind = 'markdown') {
  const input = bytes.toString().replaceAll('\r\n', '\n');
  if (Buffer.byteLength(input) > 1024 * 1024)
    throw new AprError(
      'APR_SETUP_VERSION_MISMATCH',
      'Owned integration content exceeds its bound.',
      { recovery: 'Restore bounded generated owned integrations.' }
    );
  const key = kind + ':' + createHash('sha256').update(input).digest('hex');
  if (cache.has(key)) return cache.get(key);
  let normalized;
  try {
    normalized =
      kind === 'json'
        ? JSON.stringify(sorted(JSON.parse(input)))
        : execFileSync(
            process.execPath,
            [
              cli,
              '--parser',
              'markdown',
              '--config',
              reference,
              '--ignore-path',
              devNull,
              '--prose-wrap',
              'always',
            ],
            {
              input,
              encoding: 'utf8',
              timeout: 15000,
              maxBuffer: 2 * 1024 * 1024,
              stdio: ['pipe', 'pipe', 'pipe'],
            }
          );
  } catch (cause) {
    throw new AprError(
      'APR_SETUP_VERSION_MISMATCH',
      'Owned integration content cannot be normalized.',
      {
        recovery: 'Restore valid package-owned content and repeat setup --update --dry-run.',
        details: { reason: cause.message },
      }
    );
  }
  const digest = createHash('sha256').update(normalized).digest('hex');
  if (cache.size >= 64) cache.delete(cache.keys().next().value);
  cache.set(key, digest);
  return digest;
}
