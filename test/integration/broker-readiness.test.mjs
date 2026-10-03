import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { ensureBroker, requestBroker } from '../helpers/broker-client-api.mjs';
import { connectBroker, encodeFrame } from '../../src/broker/ipc.mjs';

const nativeAvailable = existsSync(
  new URL('../../native/broker-security/build/Release/broker_security.node', import.meta.url)
);

for (const scenario of [
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
      const { platformSecurity } = await import('../../src/broker/platform.mjs');
      const security = platformSecurity();
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
          discoveryState: () => 'missing',
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
    assert.equal(security.peerUser(accepted), security.userId());
    assert.deepEqual(accepted.readFrame(), encodeFrame(handshake));
  }
);
