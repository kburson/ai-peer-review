import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createBrokerClientOperations } from '../../src/broker/client-core.mjs';
import { connectBroker, encodeFrame } from '../../src/broker/ipc.mjs';

const nativeAvailable = existsSync(
  new URL('../../native/broker-security/build/Release/broker_security.node', import.meta.url)
);

for (const scenario of [
  {
    name: 'reacquires an empty broker retiring during an unsent stop handshake',
    recoveryMs: 0,
    commandMs: 0,
    prepareMs: 0,
    idleRetire: true,
    retireDuringHandshake: true,
  },
  {
    name: 'refuses an empty broker retiring during a handshake after authority drift',
    recoveryMs: 0,
    commandMs: 0,
    prepareMs: 0,
    idleRetire: true,
    retireDuringHandshake: true,
    authorityDrift: true,
  },
  {
    name: 'refuses reacquiring a retired empty broker after authority drift',
    recoveryMs: 0,
    commandMs: 0,
    prepareMs: 0,
    idleRetire: true,
    authorityDrift: true,
  },
  {
    name: 'reacquires a normally retired empty broker before an unsent stop',
    recoveryMs: 0,
    commandMs: 0,
    prepareMs: 0,
    idleRetire: true,
  },
  {
    name: 'does not expose a handshake while slow recovery holds ownership',
    recoveryMs: 40_000,
    commandMs: 0,
    prepareMs: 0,
  },
  {
    name: 'allows slow authenticated command replies after a prompt handshake',
    recoveryMs: 0,
    commandMs: 6_000,
    prepareMs: 0,
  },
  {
    name: 'authenticates a fresh command connection after slow client preparation',
    recoveryMs: 0,
    commandMs: 0,
    prepareMs: 6_000,
  },
  {
    name: 'authenticates a command after an occupied broker exceeds one handshake window',
    recoveryMs: 0,
    commandMs: 0,
    prepareMs: 0,
    occupiedMs: 12_000,
  },
])
  test(
    `native broker ${scenario.name}`,
    {
      skip: !nativeAvailable && !process.env.CI && !process.env.APR_NATIVE_REQUIRED,
      timeout: 60_000,
    },
    async (t) => {
      let authorityCurrent = true;
      const drift = Object.assign(new Error('Authority changed after readiness.'), {
        code: 'APR_TEST_AUTHORITY_CHANGED',
      });
      const assertAuthority = () => {
        if (!authorityCurrent) throw drift;
      };
      const { ensureBroker, requestBroker } = createBrokerClientOperations({
        performCurrentOperationEffect(operation) {
          assertAuthority();
          return operation();
        },
        assertCurrentOperationAuthority: assertAuthority,
      });
      const { platformSecurity } = await import('../../src/broker/platform.mjs');
      const nativeSecurity = platformSecurity();
      let retireDuringHandshake = false;
      let discoveryReads = 0;
      const security = {
        ...nativeSecurity,
        openPrivateDirectory(...args) {
          const directory = nativeSecurity.openPrivateDirectory(...args);
          return {
            ...directory,
            read(name) {
              if (retireDuringHandshake && name === 'broker.json' && ++discoveryReads === 2) {
                // Delay only the parent's reread. The real independent broker
                // performs its ordinary idle retirement and native cleanup.
                Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 6_000);
                if (scenario.authorityDrift) authorityCurrent = false;
                retireDuringHandshake = false;
              }
              return directory.read(name);
            },
          };
        },
      };
      const root = mkdtempSync(path.join(tmpdir(), 'apr-ready-'));
      const directory = path.join(root, 'authority');
      const identity = {
        digest: 'e'.repeat(64),
        physicalRoot: root,
        tuple: ['ai-peer-review.broker-root/v1', root, null, security.userId()],
      };
      const paths = {
        directory,
        lock: path.join(directory, 'broker.lock'),
        metadata: path.join(directory, 'broker.json'),
        endpoint:
          process.platform === 'win32'
            ? `\\\\.\\pipe\\apr-ready-${process.pid}-${Date.now()}`
            : path.join(root, 'broker.sock'),
      };
      const versions = {
        package_version: '0.3.0',
        broker_protocol_version: 1,
        node_major: Number(process.versions.node.split('.')[0]),
      };
      const bootstrap = path.join(root, 'bootstrap.json');
      writeFileSync(
        bootstrap,
        JSON.stringify({
          identity,
          paths,
          versions,
          recoveryMs: scenario.recoveryMs,
          commandMs: scenario.commandMs,
          occupiedMs: scenario.occupiedMs ?? 0,
          idleRetire: scenario.idleRetire ?? false,
        })
      );
      let child;
      let exited;
      let diagnostics = '';
      let observedRecovery = false;
      let advertisedDuringRecovery;
      let launches = 0;
      let observeOccupied;
      const occupied = new Promise((resolve) => {
        observeOccupied = resolve;
      });
      t.after(async () => {
        if (child && child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
        child?.ref();
        await exited;
        rmSync(root, { recursive: true, force: true });
      });
      const client = await ensureBroker({
        project: identity,
        versions,
        runtimeImage: { root, nodeExecutable: process.execPath },
        platform: {
          ...security,
          verifyRuntimeImage: () => true,
          discoveryState: () => (existsSync(paths.metadata) ? 'present' : 'missing'),
          connect: () => connectBroker({ identity, paths, versions }, security),
          createBootstrap: () => bootstrap,
          spawn() {
            launches++;
            child = spawn(
              process.execPath,
              [
                fileURLToPath(new URL('../helpers/slow-broker-recovery.mjs', import.meta.url)),
                bootstrap,
              ],
              { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] }
            );
            exited = new Promise((resolve) => child.once('close', resolve));
            child.stderr.on('data', (data) => {
              diagnostics += data;
            });
            child.on('message', (message) => {
              if (message.occupied) observeOccupied();
              if (message.recovering) {
                observedRecovery = true;
                advertisedDuringRecovery = message.advertised;
              }
            });
            return child;
          },
        },
      }).catch((error) => {
        error.message += `\nChild diagnostics: ${diagnostics}`;
        throw error;
      });
      assert.equal(launches, 1);
      if (scenario.retireDuringHandshake) {
        const originalChild = child;
        const originalExit = exited;
        originalChild.ref();
        retireDuringHandshake = true;
        if (scenario.authorityDrift) {
          await assert.rejects(requestBroker(client, 'stop'), (error) => error === drift);
          assert.equal(launches, 1);
          assert.equal(existsSync(paths.metadata), false);
        } else {
          assert.equal((await requestBroker(client, 'stop')).status, 'stopping');
          assert.equal(launches, 2);
          child.ref();
          assert.equal(await exited, 0, diagnostics);
        }
        assert.equal(await originalExit, 0, diagnostics);
        assert.equal(discoveryReads, 2);
        return;
      }
      if (scenario.idleRetire) {
        child.ref();
        assert.equal(await exited, 0, diagnostics);
        assert.equal(existsSync(paths.metadata), false);
        if (scenario.authorityDrift) {
          authorityCurrent = false;
          await assert.rejects(requestBroker(client, 'stop'), (error) => error === drift);
          assert.equal(launches, 1);
          return;
        }
        assert.equal((await requestBroker(client, 'stop')).status, 'stopping');
        assert.equal(launches, 2);
        child.ref();
        assert.equal(await exited, 0, diagnostics);
        return;
      }
      if (scenario.prepareMs)
        await new Promise((resolve) => setTimeout(resolve, scenario.prepareMs));
      assert.equal((await requestBroker(client, 'status')).status, 'running');
      if (scenario.occupiedMs) await occupied;
      assert.equal((await requestBroker(client, 'stop')).status, 'stopping');
      child.ref();
      assert.equal(await exited, 0, diagnostics);
      assert.equal(observedRecovery, true);
      assert.equal(advertisedDuringRecovery, false);
    }
  );

test(
  'native private directory creation can atomically refuse an existing admission directory',
  { skip: !nativeAvailable && !process.env.CI && !process.env.APR_NATIVE_REQUIRED },
  async (t) => {
    const { platformSecurity } = await import('../../src/broker/platform.mjs');
    const security = platformSecurity();
    const root = mkdtempSync(path.join(tmpdir(), 'apr-private-admission-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const directory = path.join(root, 'admission.lock');
    const owned = security.openPrivateDirectory(directory, { exclusive: true });
    assert.equal(owned.verify(), true);
    owned.create('owner.json', 'owned proof');
    owned.close();
    assert.throws(() => security.openPrivateDirectory(directory, { exclusive: true }), {
      code: 'EEXIST',
    });
    const observed = security.openPrivateDirectory(directory);
    try {
      assert.equal(observed.read('owner.json').toString(), 'owned proof');
    } finally {
      observed.close();
    }
  }
);

// @story #137
test(
  'native Windows endpoint accepts an authenticated client after an abandoned connection',
  { skip: process.platform !== 'win32', timeout: 15_000 },
  async (t) => {
    const { platformSecurity } = await import('../../src/broker/platform.mjs');
    const security = platformSecurity();
    const name = String.raw`\\.\pipe\apr-abandoned-${process.pid}-${Date.now()}`;
    const endpoint = security.listenPrivate(name);
    t.after(() => endpoint.close());
    const abandoned = security.connectPrivate(name);
    abandoned.close();
    try {
      endpoint.accept().close();
    } catch (error) {
      assert.equal(error.code, 'APR_BROKER_START_FAILED');
    }
    assert.equal(endpoint.verify(), true);
    const current = security.connectPrivate(name);
    t.after(() => current.close());
    const handshake = {
      schema: 'ai-peer-review.broker-handshake/v1',
      tuple: ['ai-peer-review.broker-root/v1', 'C:/fixture', null, security.userId()],
      versions: { package_version: '0.4.0', broker_protocol_version: 1, node_major: 26 },
      instance_id: 'a'.repeat(64),
      nonce: 'b'.repeat(64),
    };
    current.write(encodeFrame(handshake));
    const accepted = endpoint.accept();
    t.after(() => accepted.close());
    // Match the production server: consume the client's frame before Windows
    // authenticates the security context associated with its last read.
    assert.deepEqual(accepted.readFrame(), encodeFrame(handshake));
    assert.equal(security.peerUser(accepted), security.userId());
  }
);

// @story #137
// Retained regression specification; execution paused at user direction.
test(
  'a new broker invocation retries only an unsent frame-prefix timeout',
  {
    skip: 'Broker verification paused for #102/#107',
  },
  async () => {
    const { ensureBroker } = createBrokerClientOperations({
      performCurrentOperationEffect: (operation) => operation(),
      assertCurrentOperationAuthority() {},
    });
    const client = { connection: { close() {} } };
    let attempts = 0;
    const timeout = Object.assign(new Error('Broker frame prefix timed out.'), {
      code: 'APR_BROKER_PROTOCOL',
    });
    const input = {
      project: { digest: 'a'.repeat(64), physicalRoot: process.cwd() },
      versions: {},
      runtimeImage: { root: process.cwd(), nodeExecutable: process.execPath },
      platform: {
        verifyRuntimeImage: () => true,
        connect: async () => {
          if (++attempts <= 2) throw timeout;
          return client;
        },
        delay: async () => {},
        spawn: () => {
          throw Error('An occupied owner must not launch another broker.');
        },
      },
    };
    assert.equal(await ensureBroker(input), client);
    assert.equal(attempts, 3);
    for (const message of [
      'Broker frame prefix is malformed.',
      'Broker frame is truncated.',
      'Broker authentication denied.',
    ]) {
      const terminal = Object.assign(new Error(message), { code: 'APR_BROKER_PROTOCOL' });
      await assert.rejects(
        ensureBroker({
          ...input,
          platform: {
            ...input.platform,
            connect: async () => {
              throw terminal;
            },
          },
        }),
        (error) => error === terminal
      );
    }
  }
);
