import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  chmodSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { acquireBrokerOwnership } from '../../src/broker/ownership.mjs';
import { createFrameDecoder, encodeFrame, validateHandshake } from '../../src/broker/ipc.mjs';

const identity = {
  tuple: ['ai-peer-review.broker-root/v1', '/project', null, '501'],
  userId: '501',
};
const paths = {
  authorityDirectories: ['/cache/ai-peer-review', '/cache/ai-peer-review/brokers', '/cache'],
  endpointDirectories: ['/run/ai-peer-review', '/run/ai-peer-review/v1'],
  directory: '/cache',
  lock: '/cache/broker.lock',
  metadata: '/cache/broker.json',
  endpoint: '/cache/broker.sock',
};
const versions = { package_version: '0.2.2', broker_protocol_version: 1, node_major: 26 };

function fixture() {
  let valid = true,
    locked = false,
    metadata = null,
    released = 0,
    abandoned = 0;
  const opened = [];
  const platform = {
    userId: () => '501',
    openPrivateDirectory(value) {
      opened.push(value);
      return {
        verify: () => valid,
        read: () => metadata,
        create: (_name, bytes) => {
          metadata = bytes;
        },
        close() {},
      };
    },
    acquireExclusive(_path, values) {
      if (locked) throw Object.assign(new Error('owned'), { code: 'APR_BROKER_OWNED' });
      locked = true;
      return {
        ...values,
        fresh: true,
        verify: () => valid,
        release: () => {
          released++;
          locked = false;
          return valid;
        },
        abandon: () => {
          abandoned++;
          locked = false;
        },
      };
    },
    listenPrivate() {
      return { verify: () => valid, close() {} };
    },
  };
  return {
    platform,
    invalidate: () => {
      valid = false;
    },
    tamper: () => {
      metadata = Buffer.from('{}');
    },
    released: () => released,
    abandoned: () => abandoned,
    opened: () => opened,
  };
}

test('ownership provisions each private authority and endpoint directory in order', () => {
  const f = fixture();
  const owner = acquireBrokerOwnership(
    { identity, paths, versions, reconcile: () => true },
    f.platform
  );
  assert.deepEqual(f.opened(), [...paths.authorityDirectories, ...paths.endpointDirectories]);
  assert.equal(owner.release(), true);
});

test('ownership closes every retained directory when a later directory is unsafe', () => {
  let opened = 0,
    closed = 0;
  const f = fixture();
  f.platform.openPrivateDirectory = () => {
    opened++;
    return { verify: () => opened < 2, close: () => closed++ };
  };
  assert.throws(
    () => acquireBrokerOwnership({ identity, paths, versions, reconcile: () => true }, f.platform),
    { code: 'APR_BROKER_STALE' }
  );
  assert.equal(opened, 2);
  assert.equal(closed, 2);
});

test('live OS ownership defeats dead-looking discovery and a second instance', () => {
  const f = fixture();
  const owner = acquireBrokerOwnership(
    { identity, paths, versions, reconcile: () => true },
    f.platform
  );
  assert.equal(owner.verify(), true);
  assert.throws(
    () => acquireBrokerOwnership({ identity, paths, versions, reconcile: () => true }, f.platform),
    { code: 'APR_BROKER_OWNED' }
  );
  assert.equal(f.released(), 0);
  assert.equal(owner.release(), true);
});

test('missing cache evidence requires explicit registry and provider reconciliation', () => {
  const f = fixture();
  assert.throws(() => acquireBrokerOwnership({ identity, paths, versions }, f.platform), {
    code: 'APR_BROKER_STALE',
  });
  assert.equal(f.released(), 0);
  assert.equal(f.abandoned(), 1);
});

for (const observation of ['symlink', 'reparse-point', 'foreign-owner', 'permissive-directory']) {
  test(`refuses hostile ${observation} observations without authenticating or deleting`, () => {
    const f = fixture();
    f.platform.openPrivateDirectory = () => {
      throw Object.assign(new Error(observation), { code: 'APR_BROKER_STALE' });
    };
    assert.throws(
      () =>
        acquireBrokerOwnership({ identity, paths, versions, reconcile: () => true }, f.platform),
      { code: 'APR_BROKER_STALE' }
    );
    assert.equal(f.released(), 0);
  });
}

test('replacement or unlink permanently fences owner and refuses destructive release', () => {
  const f = fixture();
  const owner = acquireBrokerOwnership(
    { identity, paths, versions, reconcile: () => true },
    f.platform
  );
  f.invalidate();
  assert.equal(owner.verify(), false);
  assert.equal(owner.release(), false);
});

test('tampered metadata fences an otherwise live retained lock', () => {
  const f = fixture();
  const owner = acquireBrokerOwnership(
    { identity, paths, versions, reconcile: () => true },
    f.platform
  );
  f.tamper();
  assert.equal(owner.verify(), false);
  assert.equal(owner.release(), false);
});

const nativeAvailable = existsSync(
  new URL('../../native/broker-security/build/Release/broker_security.node', import.meta.url)
);
test(
  'native ownership and authenticated IPC work across the hosted platform boundary',
  { skip: !nativeAvailable && !process.env.CI && !process.env.APR_NATIVE_REQUIRED },
  async (t) => {
    if (
      !existsSync(
        new URL('../../native/broker-security/build/Release/broker_security.node', import.meta.url)
      )
    ) {
      const executableDirectory = path.dirname(process.execPath);
      const provisionedDevelopmentRoot = process.env.APR_NODEDIR_BASE
        ? path.join(process.env.APR_NODEDIR_BASE, process.versions.node)
        : null;
      const nodeDevelopmentRoot = [
        provisionedDevelopmentRoot,
        executableDirectory,
        path.dirname(executableDirectory),
      ].find(
        (candidate) =>
          candidate !== null && existsSync(path.join(candidate, 'include', 'node', 'node_api.h'))
      );
      assert.ok(nodeDevelopmentRoot, 'hosted CI must provision the complete Node development tree');
      const build = spawnSync(
        process.execPath,
        [
          new URL('../../scripts/build-broker-security.mjs', import.meta.url).pathname,
          '--nodedir',
          nodeDevelopmentRoot,
        ],
        { encoding: 'utf8', shell: false }
      );
      assert.equal(build.status, 0, `${build.stdout}\n${build.stderr}`);
    }
    const { platformSecurity } = await import('../../src/broker/platform.mjs');
    const security = platformSecurity();
    const scratch = new URL('../../.scratch/test/', import.meta.url);
    mkdirSync(scratch, { recursive: true });
    const directory = mkdtempSync(new URL('broker-native-', scratch).pathname);
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const endpointRoot =
      process.platform === 'win32' ? null : mkdtempSync(path.join(tmpdir(), 'apr-native-'));
    if (endpointRoot !== null) {
      t.after(() => rmSync(endpointRoot, { recursive: true, force: true }));
    }
    const nestedAuthority = [
      path.join(directory, 'authority'),
      path.join(directory, 'authority', 'brokers'),
      path.join(directory, 'authority', 'brokers', 'root'),
    ];
    const nestedEndpoints =
      process.platform === 'win32'
        ? []
        : [path.join(endpointRoot, 'runtime'), path.join(endpointRoot, 'runtime', 'v1')];
    const provisioningEndpoint =
      process.platform === 'win32'
        ? `\\\\.\\pipe\\ai-peer-review-provision-${process.pid}-${Date.now()}`
        : path.join(nestedEndpoints.at(-1), 'broker.sock');
    assert.ok(
      process.platform === 'win32' ||
        Buffer.byteLength(provisioningEndpoint, 'utf8') <= security.maxEndpointLength,
      'native test endpoint must fit the observed Unix socket limit'
    );
    const provisioned = acquireBrokerOwnership(
      {
        identity: {
          tuple: ['ai-peer-review.broker-root/v1', directory, null, security.userId()],
        },
        paths: {
          authorityDirectories: nestedAuthority,
          endpointDirectories: nestedEndpoints,
          directory: nestedAuthority.at(-1),
          lock: path.join(nestedAuthority.at(-1), 'broker.lock'),
          metadata: path.join(nestedAuthority.at(-1), 'broker.json'),
          endpoint: provisioningEndpoint,
        },
        versions,
        reconcile: () => true,
      },
      security
    );
    assert.equal(provisioned.verify(), true);
    assert.equal(provisioned.release(), true);
    const privatePath = path.join(directory, 'private');
    const ownedDirectory = security.openPrivateDirectory(privatePath);
    assert.equal(ownedDirectory.verify(), true);
    ownedDirectory.create('data', Buffer.from('private'));
    assert.equal(ownedDirectory.read('data').toString(), 'private');
    const target = path.join(privatePath, 'broker.lock');
    const lock = security.acquireExclusive(target, {
      instanceId: 'a'.repeat(64),
      nonce: 'b'.repeat(64),
    });
    assert.equal(lock.verify(), true);
    const child = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import {platformSecurity} from ${JSON.stringify(new URL('../../src/broker/platform.mjs', import.meta.url).href)}; try { platformSecurity().acquireExclusive(process.argv[1], {instanceId:'c'.repeat(64),nonce:'d'.repeat(64)}); process.exit(2); } catch(e) { console.log(e.code); }`,
        target,
      ],
      { encoding: 'utf8', shell: false }
    );
    assert.equal(child.status, 0);
    assert.match(child.stdout, /APR_BROKER_OWNED/);

    const endpointPath =
      process.platform === 'win32'
        ? `\\\\.\\pipe\\ai-peer-review-native-${process.pid}-${Date.now()}`
        : path.join(endpointRoot, 'native.sock');
    assert.ok(
      process.platform === 'win32' ||
        Buffer.byteLength(endpointPath, 'utf8') <= security.maxEndpointLength,
      'native IPC endpoint must fit the observed Unix socket limit'
    );
    const endpoint = security.listenPrivate(endpointPath);
    const nativeHandshake = {
      schema: 'ai-peer-review.broker-handshake/v1',
      tuple: ['ai-peer-review.broker-root/v1', directory, null, security.userId()],
      versions,
      instance_id: 'e'.repeat(64),
      nonce: 'f'.repeat(64),
    };
    const clientSource = `
      import assert from 'node:assert/strict';
      import { platformSecurity } from ${JSON.stringify(new URL('../../src/broker/platform.mjs', import.meta.url).href)};
      import { createFrameDecoder, encodeFrame, validateHandshake } from ${JSON.stringify(new URL('../../src/broker/ipc.mjs', import.meta.url).href)};
      const platform = platformSecurity();
      const expected = JSON.parse(process.argv[2]);
      const connection = platform.connectPrivate(process.argv[1]);
      assert.equal(platform.peerUser(connection), platform.userId());
      connection.write(encodeFrame(expected));
      const decoder = createFrameDecoder();
      const frames = decoder.push(connection.readFrame());
      decoder.end();
      assert.equal(frames.length, 1);
      validateHandshake(frames[0], expected, platform.peerUser(connection));
      connection.close();
      process.stdout.write('AUTHENTICATED');
    `;
    const ipcChild = spawn(
      process.execPath,
      ['--input-type=module', '-e', clientSource, endpointPath, JSON.stringify(nativeHandshake)],
      { shell: false, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    const ipcExit = once(ipcChild, 'exit');
    let ipcStdout = '';
    let ipcStderr = '';
    ipcChild.stdout.setEncoding('utf8');
    ipcChild.stderr.setEncoding('utf8');
    ipcChild.stdout.on('data', (bytes) => {
      ipcStdout += bytes;
    });
    ipcChild.stderr.on('data', (bytes) => {
      ipcStderr += bytes;
    });
    const accepted = endpoint.accept();
    const decoder = createFrameDecoder();
    const frames = decoder.push(accepted.readFrame());
    decoder.end();
    assert.equal(frames.length, 1);
    validateHandshake(frames[0], nativeHandshake, security.peerUser(accepted));
    accepted.write(encodeFrame(nativeHandshake));
    accepted.close();
    const [ipcStatus] = await ipcExit;
    assert.equal(ipcStatus, 0, ipcStderr);
    assert.equal(ipcStdout, 'AUTHENTICATED');

    const partialSource = `
      import { platformSecurity } from ${JSON.stringify(new URL('../../src/broker/platform.mjs', import.meta.url).href)};
      const connection = platformSecurity().connectPrivate(process.argv[1]);
      connection.write(Buffer.from([0, 0, 0, 16, 123]));
      setTimeout(() => {}, 20000);
    `;
    const partialChild = spawn(
      process.execPath,
      ['--input-type=module', '-e', partialSource, endpointPath],
      { shell: false, stdio: ['ignore', 'ignore', 'pipe'] }
    );
    const partialExit = once(partialChild, 'exit');
    const partial = endpoint.accept();
    const started = Date.now();
    assert.throws(() => partial.readFrame(), { code: 'APR_BROKER_PROTOCOL' });
    assert.ok(Date.now() - started < 7500, 'partial frame must hit the bounded native deadline');
    partial.close();
    partialChild.kill();
    await partialExit;
    endpoint.close();

    if (process.platform !== 'win32') {
      renameSync(target, `${target}.held`);
      writeFileSync(target, 'foreign', { mode: 0o600 });
      assert.equal(lock.verify(), false);
      assert.equal(lock.release(), false);
      assert.equal(existsSync(target), true);
      const alias = path.join(directory, 'alias');
      symlinkSync(privatePath, alias);
      assert.throws(() => security.openPrivateDirectory(alias), { code: 'APR_BROKER_STALE' });
      chmodSync(privatePath, 0o755);
      assert.throws(() => security.openPrivateDirectory(privatePath), { code: 'APR_BROKER_STALE' });
    } else {
      const inheritedPath = path.join(directory, 'inherited-security');
      mkdirSync(inheritedPath);
      assert.throws(() => security.openPrivateDirectory(inheritedPath), {
        code: 'APR_BROKER_STALE',
      });
      assert.equal(lock.release(), true);
    }
    ownedDirectory.close();
  }
);
