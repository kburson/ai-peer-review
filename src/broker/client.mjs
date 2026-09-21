import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { AprError } from '../errors.mjs';
import { connectBroker, createFrameDecoder, encodeFrame, validateCommand } from './ipc.mjs';
import { brokerPaths } from './paths.mjs';
import { verifyRuntimeImage } from './runtime-image.mjs';
import { startupEvidence } from './registry.mjs';
import { inspectReviewAuthority, canonicalProjection } from '../protocol/service.mjs';
import { atomicCreate, withReviewLock } from '../protocol/store.mjs';
import { latestWakeOperation } from '../coordinator/ledger.mjs';
import { canonicalProjectIdentity } from './identity.mjs';
import { platformSecurity } from './platform.mjs';
import { createGitRepository } from '../git/repository.mjs';

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

function createBootstrap(record, platform) {
  const root = path.join(record.project.physicalRoot, '.scratch', 'peer-review', 'broker');
  const file = path.join(root, `bootstrap-${randomUUID()}.json`);
  const bytes = `${JSON.stringify(record)}\n`;
  if ((platform?.kind ?? process.platform) === 'win32') {
    mkdirSync(path.dirname(root), { recursive: true });
    const directory = (platform ?? platformSecurity()).openPrivateDirectory(root);
    try {
      if (!directory.verify()) throw startFailure(null, { reason: 'bootstrap-directory-unsafe' });
      directory.create(path.basename(file), bytes);
      if (!directory.verify()) throw startFailure(null, { reason: 'bootstrap-directory-changed' });
    } finally {
      directory.close();
    }
  } else {
    mkdirSync(root, { recursive: true, mode: 0o700 });
    writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 });
  }
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
      : createBootstrap(record, platform);
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
      (error) =>
        error?.code === 'APR_BROKER_STALE' &&
        (missingDiscovery(project, platform) ||
          error.message === 'Broker discovery metadata is malformed.')
    );
  } catch (error) {
    throw startFailure(error, { bootstrap });
  }
}

export { bootstrapRecord };

export async function requestBroker(client, command, workspace = null) {
  const message = validateCommand({ id: randomUUID(), command, workspace });
  if (typeof client?.request === 'function') return client.request(message);
  const decoder = createFrameDecoder();
  const connection = client.takeConnection ? await client.takeConnection() : client.connection;
  let bytes;
  try {
    bytes = await connection.exchange(encodeFrame(message));
  } finally {
    connection.close?.();
  }
  const values = decoder.push(bytes);
  decoder.end();
  if (values.length !== 1 || values[0].id !== message.id || typeof values[0].ok !== 'boolean')
    throw startFailure(null, { reason: 'invalid-command-response' });
  const response = values[0];
  if (!response.ok)
    throw new AprError(response.error.code, response.error.message, {
      recovery: response.error.recovery,
    });
  return response.result;
}

export async function fenceManualRecovery(workspace, deps = {}) {
  const authority = inspectReviewAuthority(workspace);
  const evidence = startupEvidence(workspace, authority.state);
  if (!evidence || evidence.recovery.fenced) return evidence?.recovery ?? null;
  if (authority.state.protocol.startup.runtime.ownership !== 'broker') return null;
  const unknown = () =>
    new AprError(
      'APR_WAKE_OUTCOME_UNKNOWN',
      'Provider outcome must be reconciled before manual recovery.',
      { recovery: evidence.recovery.reconciliation_command }
    );
  let platform, project, paths, client, ownership;
  const location = () => {
    platform ??= deps.platform ?? platformSecurity();
    project ??= canonicalProjectIdentity({
      cwd: authority.state.protocol.startup.context.repository_root,
      platform: { ...platform, repository: createGitRepository() },
    });
    paths ??= brokerPaths({ identity: project, platform, env: process.env, home: homedir() });
    return { platform, project, paths };
  };
  try {
    try {
      client = await (
        deps.connect ??
        (() => {
          const current = location();
          return connectBroker(
            {
              identity: current.project,
              paths: current.paths,
              versions: evidence.journal.versions,
            },
            current.platform
          );
        })
      )();
    } catch (error) {
      if (!['ENOENT', 'ECONNREFUSED', 'APR_BROKER_STALE'].includes(error?.code)) throw error;
      // Hold the same OS-enforced broker lock across reconciliation and fence
      // publication. A stale file or a failed connect is never ownership proof.
      ownership = deps.acquireRecoveryOwnership
        ? await deps.acquireRecoveryOwnership()
        : (() => {
            const current = location();
            return current.platform.acquireExclusive(current.paths.lock, {
              instanceId: randomUUID(),
              nonce: randomUUID(),
            });
          })();
      if (!ownership?.verify()) throw startFailure(null, { reason: 'recovery-ownership-unproven' });
    }
    // Persist exclusion before asking the broker to remove its current worker.
    // Replacements must see it even if suspension/publication is interrupted.
    await withReviewLock(path.join(workspace, 'dispatch'), () =>
      withReviewLock(workspace, () => {
        const fresh = inspectReviewAuthority(workspace);
        const current = startupEvidence(workspace, fresh.state);
        if (current.recovery.fenced || current.recovery.suspending) return;
        atomicCreate(
          path.join(workspace, 'manual-suspension.json'),
          `${JSON.stringify({
            schema: 'ai-peer-review.manual-suspension/v1',
            review_id: fresh.state.protocol.review_id,
            request_digest: current.recovery.request_digest,
            event_revision: fresh.state.protocol.revision,
          })}\n`
        );
      })
    );
    if (client) {
      const settled = await requestBroker(client, 'suspend', workspace);
      if (!['recovery-only', 'terminal'].includes(settled?.status))
        throw startFailure(null, { reason: 'suspension-unsettled' });
    }
    return await withReviewLock(path.join(workspace, 'dispatch'), async () => {
      const observed = startupEvidence(workspace, inspectReviewAuthority(workspace).state);
      const operation = latestWakeOperation(workspace);
      if (ownership) {
        const outcome = await deps.reconcileProvider?.({
          workspace,
          journal: observed.journal,
          operation,
        });
        if (!['acknowledged', 'not-submitted', 'refused'].includes(outcome?.status))
          throw unknown();
      } else if (
        ['launch-pending', 'outcome-unknown'].includes(observed.journal.stage) ||
        ['reserved', 'outcome-unknown'].includes(operation?.status)
      )
        throw unknown();
      return await withReviewLock(workspace, () => {
        const fresh = inspectReviewAuthority(workspace);
        const current = startupEvidence(workspace, fresh.state);
        if (current.recovery.fenced) return current.recovery;
        if (canonicalProjection(latestWakeOperation(workspace)) !== canonicalProjection(operation))
          throw unknown();
        if (current.journal.stage !== observed.journal.stage) throw unknown();
        if (ownership && !ownership.verify())
          throw startFailure(null, { reason: 'recovery-ownership-lost' });
        if (fresh.state.protocol.revision !== authority.state.protocol.revision)
          throw new AprError(
            'APR_BROKER_STALE',
            'Review changed while suspending automatic delivery.',
            { recovery: evidence.recovery.reconciliation_command }
          );
        atomicCreate(
          path.join(workspace, 'manual-fence.json'),
          `${JSON.stringify({ schema: 'ai-peer-review.manual-fence/v1', review_id: fresh.state.protocol.review_id, request_digest: current.recovery.request_digest, event_revision: fresh.state.protocol.revision })}\n`
        );
        return { ...current.recovery, fenced: true, suspending: false };
      });
    });
  } finally {
    client?.close?.();
    client?.connection?.close?.();
    ownership?.release?.();
  }
}
