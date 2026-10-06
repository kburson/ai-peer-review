import assert from 'node:assert/strict';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { readBrokerBootstrap } from '../../bin/peer-review-broker.mjs';
import { ensureBroker } from '../../src/broker/client.mjs';

function fixture(t) {
  const scratch = new URL('../../.scratch/test/', import.meta.url);
  mkdirSync(scratch, { recursive: true });
  const root = realpathSync(mkdtempSync(path.join(fileURLToPath(scratch), 'bootstrap-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const directory = path.join(root, '.scratch/peer-review/broker');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const file = path.join(directory, 'bootstrap-a1b2.json');
  const record = {
    schema: 'ai-peer-review.broker-bootstrap/v1',
    project: {
      digest: 'a'.repeat(64),
      physicalRoot: root,
      tuple: ['ai-peer-review.broker-root/v1', root, null, 'user'],
    },
    versions: { package_version: '0.3.0', broker_protocol_version: 1, node_major: 26 },
    runtimeImage: {
      root: path.join(root, 'image'),
      nodeExecutable: path.join(root, 'image/node'),
      digest: `sha256:${'b'.repeat(64)}`,
    },
  };
  writeFileSync(file, JSON.stringify(record), { mode: 0o600 });
  return { root, directory, file, record };
}

test('Windows bootstrap reads authenticated bytes and refuses failed directory or file security', (t) => {
  const fx = fixture(t);
  const trusted = Buffer.from(JSON.stringify(fx.record));
  // The native seam owns ACL/reparse enforcement; unreadable JSON on disk must
  // never replace the bytes returned from its verified handle.
  writeFileSync(fx.file, 'not trusted JSON');
  let closed = 0;
  const platform = {
    kind: 'win32',
    openPrivateDirectory: () => ({
      verify: () => true,
      read: () => trusted,
      close: () => closed++,
    }),
  };
  assert.deepEqual(readBrokerBootstrap(fx.file, { platform }), fx.record);
  assert.equal(closed, 1);
  for (const failAt of ['open', 'verify', 'read', 'missing', 'verify-after']) {
    let verifications = 0;
    const unsafe = {
      kind: 'win32',
      openPrivateDirectory() {
        if (failAt === 'open')
          throw Object.assign(new Error('foreign directory ACL'), { code: 'APR_BROKER_STALE' });
        return {
          verify: () => failAt !== 'verify' && !(failAt === 'verify-after' && verifications++ > 0),
          read() {
            if (failAt === 'read')
              throw Object.assign(new Error('unsafe file ACL or reparse point'), {
                code: 'APR_BROKER_STALE',
              });
            return failAt === 'missing' ? null : trusted;
          },
          close() {},
        };
      },
    };
    assert.throws(() => readBrokerBootstrap(fx.file, { platform: unsafe }));
  }
});

test(
  'POSIX bootstrap still refuses group or other readable files',
  { skip: process.platform === 'win32' },
  (t) => {
    const fx = fixture(t);
    assert.deepEqual(readBrokerBootstrap(fx.file), fx.record);
    chmodSync(fx.file, 0o644);
    assert.throws(() => readBrokerBootstrap(fx.file), { code: 'APR_BROKER_START_FAILED' });
  }
);

test('Windows bootstrap creation uses the native exclusive owner-only writer', async (t) => {
  const fx = fixture(t);
  let attempted = 0;
  let created;
  const client = { request() {} };
  await ensureBroker({
    project: fx.record.project,
    versions: fx.record.versions,
    runtimeImage: fx.record.runtimeImage,
    platform: {
      kind: 'win32',
      verifyRuntimeImage: () => true,
      connect: async () => {
        if (attempted++ === 0) throw Object.assign(new Error('missing'), { code: 'ENOENT' });
        return client;
      },
      openPrivateDirectory(directory) {
        assert.equal(directory, fx.directory);
        return {
          verify: () => true,
          create(name, bytes) {
            created = { name, record: JSON.parse(bytes) };
          },
          close() {},
        };
      },
      spawn(_executable, args) {
        assert.ok(
          created,
          'bootstrap must be created through native ACL enforcement before launch'
        );
        assert.equal(path.basename(args[1]), created.name);
        assert.deepEqual(created.record, fx.record);
        return { ready: Promise.resolve(), unref() {} };
      },
    },
  });
  assert.ok(created);
  assert.equal(readFileSync(fx.file, 'utf8'), JSON.stringify(fx.record));
});
