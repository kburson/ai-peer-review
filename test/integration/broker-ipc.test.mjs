import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  connectBroker,
  createFrameDecoder,
  encodeFrame,
  validateCommand,
  validateHandshake,
} from '../../src/broker/ipc.mjs';

const handshake = {
  schema: 'ai-peer-review.broker-handshake/v1',
  tuple: ['ai-peer-review.broker-root/v1', '/project', null, '501'],
  versions: { package_version: '0.2.2', broker_protocol_version: 1, node_major: 26 },
  instance_id: 'a'.repeat(64),
  nonce: 'b'.repeat(64),
};

test('length-prefixed JSON accepts fragmented and coalesced frames up to 64 KiB', () => {
  const decoder = createFrameDecoder();
  const a = encodeFrame({ command: 'status' });
  assert.deepEqual(decoder.push(a.subarray(0, 3)), []);
  assert.deepEqual(decoder.push(Buffer.concat([a.subarray(3), a])), [
    { command: 'status' },
    { command: 'status' },
  ]);
  decoder.end();
  assert.equal(encodeFrame('x'.repeat(65534)).length, 65540);
  assert.throws(() => encodeFrame('x'.repeat(65535)), { code: 'APR_BROKER_PROTOCOL' });
});

test('oversized, truncated, invalid JSON and malformed UTF-8 frames fail closed', () => {
  for (const bytes of [
    Buffer.from([0, 1, 0, 1]),
    Buffer.from([0, 0, 0, 1, 120]),
    Buffer.from([0, 0, 0, 3, 34, 255, 34]),
  ]) {
    assert.throws(() => createFrameDecoder().push(bytes), { code: 'APR_BROKER_PROTOCOL' });
  }
  const decoder = createFrameDecoder();
  decoder.push(Buffer.from([0, 0, 0]));
  assert.throws(() => decoder.end(), { code: 'APR_BROKER_PROTOCOL' });
});

test('handshake binds every tuple/version/instance/nonce field and kernel user', () => {
  assert.equal(validateHandshake(handshake, handshake, '501'), true);
  for (const value of [
    { ...handshake, extra: true },
    { ...handshake, instance_id: 'c'.repeat(64) },
    { ...handshake, nonce: 'c'.repeat(64) },
    { ...handshake, tuple: ['ai-peer-review.broker-root/v1', '/other', null, '501'] },
    { ...handshake, versions: { ...handshake.versions, package_version: '0.3.0' } },
    { ...handshake, versions: { ...handshake.versions, broker_protocol_version: 2 } },
    { ...handshake, versions: { ...handshake.versions, node_major: 24 } },
    { ...handshake, versions: { ...handshake.versions, extra: true } },
  ])
    assert.throws(() => validateHandshake(value, handshake, '501'));
  assert.throws(() => validateHandshake(handshake, handshake, '502'), {
    code: 'APR_BROKER_AUTH_FAILED',
  });
});

test('commands admit only a closed local control vocabulary', () => {
  for (const command of ['status', 'register', 'launch', 'suspend', 'stop', 'reconcile']) {
    assert.equal(
      validateCommand({
        id: '1',
        command,
        workspace: command === 'status' || command === 'stop' ? null : '/project/review',
      }).command,
      command
    );
  }
  for (const message of [
    { id: '1', command: 'exec', workspace: null },
    { id: '1', command: 'status', workspace: null, shell: 'sh' },
    { id: '1', command: 'register', workspace: '../other' },
  ]) {
    assert.throws(() => validateCommand(message), { code: 'APR_BROKER_PROTOCOL' });
  }
});

test('authenticated connect binds discovery, live nonce proof, versions and kernel peer user', async () => {
  const metadata = Buffer.from(JSON.stringify(handshake));
  const opened = [];
  const connection = {
    async exchange(bytes) {
      const decoder = createFrameDecoder();
      assert.deepEqual(decoder.push(bytes), [handshake]);
      decoder.end();
      return encodeFrame(handshake);
    },
    close() {},
  };
  const platform = {
    userId: () => '501',
    openPrivateDirectory: (value) => {
      opened.push(value);
      return { read: () => metadata, close() {} };
    },
    connectPrivate: async () => connection,
    peerUser: () => '501',
  };
  const client = await connectBroker(
    {
      identity: { tuple: handshake.tuple },
      paths: {
        authorityDirectories: ['/cache/ai-peer-review', '/cache/ai-peer-review/brokers', '/cache'],
        directory: '/cache',
        metadata: '/cache/broker.json',
        endpoint: '/cache/broker.sock',
      },
      versions: handshake.versions,
    },
    platform
  );
  assert.deepEqual(client.handshake, handshake);
  assert.equal(client.connection, connection);
  assert.deepEqual(opened, ['/cache/ai-peer-review', '/cache/ai-peer-review/brokers', '/cache']);
});

test('authenticated connect preserves evidence and refuses peer, version and response substitution', async () => {
  const fixture = (response, peer = '501') => ({
    userId: () => '501',
    openPrivateDirectory: () => ({
      read: () => Buffer.from(JSON.stringify(handshake)),
      close() {},
    }),
    connectPrivate: async () => ({
      exchange: async () => encodeFrame(response),
      close() {},
    }),
    peerUser: () => peer,
  });
  const input = {
    identity: { tuple: handshake.tuple },
    paths: { directory: '/cache', metadata: '/cache/broker.json', endpoint: '/cache/broker.sock' },
    versions: handshake.versions,
  };
  await assert.rejects(connectBroker(input, fixture(handshake, '502')), {
    code: 'APR_BROKER_AUTH_FAILED',
  });
  await assert.rejects(
    connectBroker(
      input,
      fixture({ ...handshake, versions: { ...handshake.versions, node_major: 24 } })
    ),
    { code: 'APR_BROKER_INCOMPATIBLE' }
  );
  await assert.rejects(connectBroker(input, fixture({ ...handshake, extra: true })), {
    code: 'APR_BROKER_AUTH_FAILED',
  });
});

test('broker schema closes handshake, command and reply projections', () => {
  const schema = JSON.parse(
    readFileSync(new URL('../../schemas/broker-v1.json', import.meta.url), 'utf8')
  );
  assert.equal(schema.$id, 'ai-peer-review.broker/v1');
  assert.equal(schema.additionalProperties, false);
  for (const name of ['handshake', 'command', 'reply']) {
    assert.equal(schema.$defs[name].additionalProperties, false);
  }
});
