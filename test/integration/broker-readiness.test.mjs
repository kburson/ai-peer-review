import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { ensureBroker, requestBroker } from '../../src/broker/client.mjs';
import { connectBroker } from '../../src/broker/ipc.mjs';

const nativeAvailable = existsSync(
  new URL('../../native/broker-security/build/Release/broker_security.node', import.meta.url)
);

test(
  'native broker does not expose a handshake while slow recovery holds ownership',
  {
    skip: !nativeAvailable && !process.env.CI && !process.env.APR_NATIVE_REQUIRED,
    timeout: 45_000,
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
    writeFileSync(bootstrap, JSON.stringify({ identity, paths, versions }));
    let child;
    let exited;
    let diagnostics = '';
    let observedRecovery = false;
    let advertisedDuringRecovery;
    let launches = 0;
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
          child.on('message', () => {
            observedRecovery = true;
            advertisedDuringRecovery = existsSync(paths.metadata);
          });
          return child;
        },
      },
    }).catch((error) => {
      error.message += `\nChild diagnostics: ${diagnostics}`;
      throw error;
    });
    assert.equal(observedRecovery, true);
    assert.equal(advertisedDuringRecovery, false);
    assert.equal(launches, 1);
    assert.equal((await requestBroker(client, 'status')).status, 'running');
    assert.equal((await requestBroker(client, 'stop')).status, 'stopping');
    child.ref();
    assert.equal(await exited, 0, diagnostics);
  }
);
