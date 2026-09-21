import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { AprError } from '../errors.mjs';
import { connectBroker } from './ipc.mjs';
import { brokerPaths } from './paths.mjs';
import { verifyRuntimeImage } from './runtime-image.mjs';

function startFailure(cause, details = {}) {
  const error = new AprError(
    'APR_BROKER_START_FAILED',
    'Project broker did not become authentically ready.',
    {
      recovery:
        'Preserve broker ownership and bootstrap evidence, inspect the recorded compatible runtime, and retry only after reconciliation.',
      details,
    }
  );
  if (cause) error.cause = cause;
  return error;
}

function bootstrapRecord({ project, versions, runtimeImage }) {
  return Object.freeze({
    schema: 'ai-peer-review.broker-bootstrap/v1',
    project: Object.freeze({
      digest: project.digest,
      physicalRoot: project.physicalRoot,
      tuple: project.tuple ?? null,
    }),
    versions: Object.freeze({ ...versions }),
    runtimeImage: Object.freeze({
      root: runtimeImage.root,
      nodeExecutable: runtimeImage.nodeExecutable,
      digest: runtimeImage.digest,
    }),
  });
}

function createBootstrap(record) {
  const root = path.join(record.project.physicalRoot, '.scratch', 'peer-review', 'broker');
  mkdirSync(root, { recursive: true, mode: 0o700 });
  const file = path.join(root, `bootstrap-${randomUUID()}.json`);
  writeFileSync(file, `${JSON.stringify(record)}\n`, { flag: 'wx', mode: 0o600 });
  return file;
}

function defaultConnect(project, versions, platform) {
  const paths = brokerPaths({
    identity: project,
    platform,
    env: process.env,
    home: homedir(),
  });
  return connectBroker({ identity: project, paths, versions }, platform);
}

async function connectUntilReady(connect, platform, retryable = () => false) {
  let last;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      return await connect();
    } catch (error) {
      if (
        !['ENOENT', 'ECONNREFUSED', 'APR_BROKER_START_FAILED'].includes(error?.code) &&
        !retryable(error)
      )
        throw error;
      last = error;
    }
    if (typeof platform?.delay === 'function') await platform.delay(25);
    else await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw last;
}

function missingDiscovery(project, platform) {
  if (typeof platform?.discoveryState === 'function') {
    return platform.discoveryState({ project }) === 'missing';
  }
  let directory;
  try {
    const paths = brokerPaths({ identity: project, platform, env: process.env, home: homedir() });
    const values = paths.authorityDirectories ?? [paths.directory];
    directory = platform.openPrivateDirectory(values.at(-1));
    return directory.read(path.basename(paths.metadata)) === null;
  } catch {
    return false;
  } finally {
    directory?.close?.();
  }
}

function observeLaunch(child) {
  if (child?.ready && typeof child.ready.then === 'function') return child.ready;
  if (!child || typeof child.once !== 'function') return Promise.resolve();
  return new Promise((resolve, reject) => {
    child.once('spawn', resolve);
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code !== null || signal !== null) {
        reject(
          Object.assign(new Error('Broker process exited before readiness.'), { code, signal })
        );
      }
    });
  });
}

export async function ensureBroker({ project, versions, runtimeImage, platform } = {}) {
  if (
    !project ||
    !/^[a-f0-9]{64}$/.test(project.digest ?? '') ||
    typeof runtimeImage?.root !== 'string' ||
    typeof runtimeImage?.nodeExecutable !== 'string' ||
    !versions
  ) {
    throw startFailure(null, { reason: 'invalid-startup-input' });
  }
  const runtimeVerified = platform?.verifyRuntimeImage ?? verifyRuntimeImage;
  if (!runtimeVerified(runtimeImage)) {
    throw startFailure(null, { reason: 'runtime-image-invalid' });
  }
  const connect = () =>
    typeof platform?.connect === 'function'
      ? platform.connect({ project, versions, runtimeImage })
      : defaultConnect(project, versions, platform);
  try {
    return await connect();
  } catch (error) {
    const launchable =
      ['ENOENT', 'ECONNREFUSED', 'APR_BROKER_OWNED'].includes(error?.code) ||
      (error?.code === 'APR_BROKER_STALE' && missingDiscovery(project, platform));
    if (!launchable) throw error;
  }

  const record = bootstrapRecord({ project, versions, runtimeImage });
  const bootstrap =
    typeof platform?.createBootstrap === 'function'
      ? platform.createBootstrap({ project, versions, runtimeImage, record })
      : createBootstrap(record);
  const entrypoint = path.join(runtimeImage.root, 'package', 'bin', 'peer-review-broker.mjs');
  const launch = platform?.spawn ?? spawn;
  let child;
  try {
    child = launch(runtimeImage.nodeExecutable, [entrypoint, bootstrap], {
      shell: false,
      detached: true,
      stdio: 'ignore',
    });
    await observeLaunch(child);
    child?.unref?.();
  } catch (error) {
    try {
      return await connect();
    } catch (connectError) {
      throw startFailure(connectError, { bootstrap, launch_error: error?.code ?? 'unknown' });
    }
  }
  try {
    return await connectUntilReady(
      connect,
      platform,
      (error) => error?.code === 'APR_BROKER_STALE' && missingDiscovery(project, platform)
    );
  } catch (error) {
    throw startFailure(error, { bootstrap });
  }
}

export { bootstrapRecord };
