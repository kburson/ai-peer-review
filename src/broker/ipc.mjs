import path from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { AprError } from '../errors.mjs';

const MAX_FRAME = 65536;
const COMMANDS = new Set(['status', 'register', 'suspend', 'stop', 'reconcile']);
const HASH = /^[a-f0-9]{64}$/;

export function brokerError(code, message) {
  return new AprError(code, message, {
    recovery:
      'Preserve broker evidence. Restore the recorded compatible runtime and reconcile registry/provider ownership before retrying.',
  });
}

function closed(value, fields) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === fields.length &&
    fields.every((key) => Object.hasOwn(value, key))
  );
}

export function encodeFrame(value) {
  const body = Buffer.from(JSON.stringify(value), 'utf8');
  if (!body.length || body.length > MAX_FRAME)
    throw brokerError('APR_BROKER_PROTOCOL', 'Broker frame exceeds the 64 KiB bound.');
  const prefix = Buffer.alloc(4);
  prefix.writeUInt32BE(body.length);
  return Buffer.concat([prefix, body]);
}

export function createFrameDecoder() {
  let pending = Buffer.alloc(0),
    failed = false;
  return {
    push(bytes) {
      if (failed) throw brokerError('APR_BROKER_PROTOCOL', 'Broker framing is fenced.');
      const frames = [];
      try {
        // Consume in bounded pieces: no allocation follows an untrusted claimed length.
        for (let offset = 0; offset < bytes.length; ) {
          const target = pending.length < 4 ? 4 : 4 + pending.readUInt32BE(0);
          if ((target < 5 && pending.length >= 4) || target > MAX_FRAME + 4)
            throw new Error('length');
          const size = Math.min(target - pending.length, bytes.length - offset);
          pending = Buffer.concat([pending, bytes.subarray(offset, offset + size)]);
          offset += size;
          if (pending.length >= 4) {
            const length = pending.readUInt32BE(0);
            if (!length || length > MAX_FRAME) throw new Error('length');
            if (pending.length === length + 4) {
              const text = new TextDecoder('utf-8', { fatal: true }).decode(pending.subarray(4));
              frames.push(JSON.parse(text));
              pending = Buffer.alloc(0);
            }
          }
        }
        return frames;
      } catch {
        failed = true;
        throw brokerError('APR_BROKER_PROTOCOL', 'Invalid broker frame.');
      }
    },
    end() {
      if (pending.length || failed)
        throw brokerError('APR_BROKER_PROTOCOL', 'Truncated broker frame.');
    },
  };
}

export function validateHandshake(message, expected, kernelUser) {
  if (
    !closed(message, ['schema', 'tuple', 'versions', 'instance_id', 'nonce']) ||
    message.schema !== 'ai-peer-review.broker-handshake/v1' ||
    !closed(message.versions, ['package_version', 'broker_protocol_version', 'node_major']) ||
    typeof message.versions.package_version !== 'string' ||
    !message.versions.package_version ||
    !Number.isSafeInteger(message.versions.broker_protocol_version) ||
    message.versions.broker_protocol_version < 1 ||
    !Number.isSafeInteger(message.versions.node_major) ||
    message.versions.node_major < 1 ||
    !Array.isArray(message.tuple) ||
    message.tuple.length !== 4 ||
    message.tuple[0] !== 'ai-peer-review.broker-root/v1' ||
    typeof message.tuple[1] !== 'string' ||
    (message.tuple[2] !== null && typeof message.tuple[2] !== 'string') ||
    typeof message.tuple[3] !== 'string' ||
    !HASH.test(message.instance_id) ||
    !HASH.test(message.nonce)
  ) {
    throw brokerError('APR_BROKER_AUTH_FAILED', 'Malformed broker handshake.');
  }
  if (
    JSON.stringify(message.tuple) !== JSON.stringify(expected.tuple) ||
    kernelUser !== message.tuple[3] ||
    message.instance_id !== expected.instance_id ||
    !timingSafeEqual(Buffer.from(message.nonce), Buffer.from(expected.nonce))
  ) {
    throw brokerError('APR_BROKER_AUTH_FAILED', 'Broker ownership proof does not match.');
  }
  if (
    Object.keys(message.versions).some((key) => message.versions[key] !== expected.versions[key])
  ) {
    throw brokerError(
      'APR_BROKER_INCOMPATIBLE',
      'Broker package, protocol and Node major must all match.'
    );
  }
  return true;
}

export function validateCommand(message) {
  if (
    !closed(message, ['id', 'command', 'workspace']) ||
    !/^[a-zA-Z0-9-]{1,64}$/.test(message.id) ||
    !COMMANDS.has(message.command) ||
    (['status', 'stop'].includes(message.command)
      ? message.workspace !== null
      : typeof message.workspace !== 'string' ||
        message.workspace.includes('\0') ||
        !(path.posix.isAbsolute(message.workspace) || path.win32.isAbsolute(message.workspace)))
  ) {
    throw brokerError('APR_BROKER_PROTOCOL', 'Unknown or malformed broker command.');
  }
  return message;
}

function expectedHandshake(identity, versions, discovery) {
  return Object.freeze({
    schema: 'ai-peer-review.broker-handshake/v1',
    tuple: identity.tuple,
    versions,
    instance_id: discovery.instance_id,
    nonce: discovery.nonce,
  });
}

function openAuthorityDirectory(paths, platform) {
  const values = paths.authorityDirectories ?? [paths.directory];
  const directories = [];
  try {
    for (const value of values) directories.push(platform.openPrivateDirectory(value));
    const retained = directories.pop();
    for (const directory of directories) directory.close();
    return retained;
  } catch (error) {
    for (const directory of directories.reverse()) directory.close();
    throw error;
  }
}

export async function connectBroker({ identity, paths, versions }, platform) {
  const directory = openAuthorityDirectory(paths, platform);
  let connection = null;
  try {
    const metadataName = path.basename(paths.metadata);
    const bytes = directory.read(metadataName);
    if (!Buffer.isBuffer(bytes)) {
      throw brokerError('APR_BROKER_STALE', 'Broker discovery metadata is unavailable.');
    }
    let discovery;
    try {
      discovery = JSON.parse(bytes.toString('utf8'));
    } catch {
      throw brokerError('APR_BROKER_STALE', 'Broker discovery metadata is malformed.');
    }
    const expected = expectedHandshake(identity, versions, discovery);
    validateHandshake(discovery, expected, platform.userId());
    connection = await platform.connectPrivate(paths.endpoint);
    const responseBytes = await connection.exchange(encodeFrame(expected));
    const decoder = createFrameDecoder();
    const responses = decoder.push(responseBytes);
    decoder.end();
    if (responses.length !== 1) {
      throw brokerError(
        'APR_BROKER_PROTOCOL',
        'Broker handshake returned an invalid response count.'
      );
    }
    validateHandshake(responses[0], expected, platform.peerUser(connection));
    return Object.freeze({ handshake: responses[0], connection });
  } catch (error) {
    connection?.close?.();
    throw error;
  } finally {
    directory.close();
  }
}
