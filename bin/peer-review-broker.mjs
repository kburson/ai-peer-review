#!/usr/bin/env node

import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { createHash } from 'node:crypto';
import { assertSelectedRuntime } from '../src/config/runtime-selection.mjs';
import {
  assertCollateralCompatible,
  readRuntimeCompatibility,
  assertCurrentCleanupOwnership,
} from '../src/protocol/compatibility.mjs';
import { AprError } from '../src/errors.mjs';
import { assertBrokerTransport } from '../src/broker/ipc.mjs';
import { canonicalProjectIdentity } from '../src/broker/identity.mjs';
import { acquireBrokerOwnership } from '../src/broker/ownership.mjs';
import { brokerPaths } from '../src/broker/paths.mjs';
import { platformSecurity } from '../src/broker/platform.mjs';
import { inspectStartupAuthority, reconcileRegistrations } from '../src/broker/registry.mjs';
import { verifyRuntimeImage } from '../src/broker/runtime-image.mjs';
import { createLegacyBrokerServer, runBroker } from '../src/broker/service.mjs';
import { createProductionReviewWorker } from '../src/broker/worker-factory.mjs';
import { withOperationAuthority, performOperationEffect } from '../src/startup/authority-fence.mjs';
import { createGitRepository } from '../src/git/repository.mjs';

function exact(value, fields) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join('\n') === [...fields].sort().join('\n')
  );
}

export function readBrokerBootstrap(file, { platform = null } = {}) {
  if (typeof file !== 'string' || !path.isAbsolute(file)) {
    throw new AprError('APR_BROKER_START_FAILED', 'Broker bootstrap path is not absolute.', {
      recovery: 'Launch the broker only through the package-created bootstrap path.',
    });
  }
  const status = lstatSync(file);
  const windows = (platform?.kind ?? process.platform) === 'win32';
  const expectedRoot = path.join(
    path.dirname(path.dirname(path.dirname(path.dirname(file)))),
    '.scratch',
    'peer-review',
    'broker'
  );
  if (
    !status.isFile() ||
    status.isSymbolicLink() ||
    realpathSync(file) !== file ||
    path.dirname(file) !== expectedRoot ||
    !/^bootstrap-[a-f0-9-]+\.json$/.test(path.basename(file)) ||
    (!windows && (status.mode & 0o077) !== 0) ||
    (!windows && typeof process.getuid === 'function' && status.uid !== process.getuid())
  ) {
    throw new AprError('APR_BROKER_START_FAILED', 'Broker bootstrap is not a regular file.', {
      recovery: 'Preserve the unsafe path and create a new package-owned bootstrap.',
    });
  }
  let bytes;
  if (windows) {
    const directory = (platform ?? platformSecurity()).openPrivateDirectory(path.dirname(file));
    try {
      const changed = () =>
        new AprError('APR_BROKER_START_FAILED', 'Bootstrap authority changed.', {
          recovery:
            'Preserve the bootstrap and restore its verified owner-only directory and file.',
        });
      if (!directory.verify()) throw changed();
      bytes = directory.read(path.basename(file));
      if (bytes === null || !directory.verify()) throw changed();
    } finally {
      directory.close();
    }
  } else {
    bytes = readFileSync(file, 'utf8');
  }
  const value = JSON.parse(bytes);
  if (typeof value?.schema === 'string')
    assertCollateralCompatible({
      manifest: readRuntimeCompatibility(),
      operation: 'read',
      metadata: [{ contract: 'brokerBootstrap', schema: value.schema }],
    });
  if (
    !exact(value, [
      'project',
      'runtimeImage',
      'schema',
      'versions',
      ...(value?.schema === 'ai-peer-review.broker-bootstrap/v2' ? ['execution'] : []),
    ]) ||
    !['ai-peer-review.broker-bootstrap/v1', 'ai-peer-review.broker-bootstrap/v2'].includes(
      value.schema
    ) ||
    (value.schema === 'ai-peer-review.broker-bootstrap/v2' &&
      (!exact(value.execution, ['package_root', 'node_executable', 'package_digest']) ||
        !path.isAbsolute(value.execution.package_root ?? '') ||
        !path.isAbsolute(value.execution.node_executable ?? '') ||
        !/^[a-f0-9]{64}$/.test(value.execution.package_digest ?? ''))) ||
    !exact(value.project, ['digest', 'physicalRoot', 'tuple']) ||
    !exact(value.runtimeImage, ['digest', 'nodeExecutable', 'root']) ||
    !exact(value.versions, ['broker_protocol_version', 'node_major', 'package_version']) ||
    !/^[a-f0-9]{64}$/.test(value.project.digest ?? '') ||
    !path.isAbsolute(value.project.physicalRoot ?? '') ||
    !/^sha256:[a-f0-9]{64}$/.test(value.runtimeImage.digest ?? '') ||
    !path.isAbsolute(value.runtimeImage.root ?? '') ||
    !path.isAbsolute(value.runtimeImage.nodeExecutable ?? '') ||
    typeof value.versions.package_version !== 'string' ||
    !value.versions.package_version ||
    !Number.isSafeInteger(value.versions.broker_protocol_version) ||
    value.versions.broker_protocol_version < 1 ||
    !Number.isSafeInteger(value.versions.node_major) ||
    value.versions.node_major < 1 ||
    !Array.isArray(value.project.tuple) ||
    value.project.tuple.length !== 4
  ) {
    throw new AprError('APR_BROKER_START_FAILED', 'Broker bootstrap is malformed.', {
      recovery: 'Create a new bootstrap through the compatible local package.',
    });
  }
  return Object.freeze(value);
}

function sameIdentity(actual, expected) {
  return (
    actual.digest === expected.digest &&
    actual.physicalRoot === expected.physicalRoot &&
    JSON.stringify(actual.tuple) === JSON.stringify(expected.tuple)
  );
}

async function assertExecutingRuntime(bootstrap) {
  const root = realpathSync(fileURLToPath(new URL('..', import.meta.url)));
  const currentNode = realpathSync(process.execPath);
  const bytes = readFileSync(path.join(root, 'package.json'));
  if (
    bootstrap.execution.package_root !== root ||
    bootstrap.execution.node_executable !== currentNode ||
    bootstrap.execution.package_digest !== createHash('sha256').update(bytes).digest('hex')
  )
    throw new AprError(
      'APR_RUNTIME_CHANGED',
      'Broker bootstrap does not identify the executing current installation.',
      {
        recovery:
          'Start a fresh broker with the current selected global installation; retain old images as evidence.',
      }
    );
  const observation = await assertSelectedRuntime();
  if (
    bootstrap.versions.package_version !== observation.packageVersion ||
    bootstrap.versions.broker_protocol_version !== 1 ||
    bootstrap.versions.node_major !== Number(process.versions.node.split('.')[0])
  )
    throw new AprError(
      'APR_REVIEW_RUNTIME_UNSUPPORTED',
      'Broker protocol or current execution provenance is unsupported.',
      { recovery: 'Preserve broker evidence and restart the current selected global broker.' }
    );
  return observation;
}

function registrationSnapshotCurrent(store, registrations) {
  const expected = registrations
    .map((registration) => path.basename(registration.registration_file))
    .sort();
  const actual = existsSync(store.root)
    ? readdirSync(store.root)
        .filter((name) => name.endsWith('.json'))
        .sort()
    : [];
  if (actual.join('\n') !== expected.join('\n')) return false;
  return registrations.every((registration) => {
    const { registration_file: file, ...record } = registration;
    try {
      return readFileSync(file, 'utf8') === `${JSON.stringify(record)}\n`;
    } catch {
      return false;
    }
  });
}

export async function runBrokerEntrypoint(file, { transport = 'legacy' } = {}) {
  assertBrokerTransport(transport);
  const bootstrap = readBrokerBootstrap(file);
  assertCollateralCompatible({
    manifest: readRuntimeCompatibility(),
    operation: 'write',
    metadata: [{ contract: 'brokerBootstrap', schema: bootstrap.schema }],
  });
  return withOperationAuthority(
    { operation: 'broker.start', cwd: bootstrap.project.physicalRoot },
    async (fence) => {
      const runtimeObservation = await assertExecutingRuntime(bootstrap);
      if (!verifyRuntimeImage(bootstrap.runtimeImage)) {
        throw new AprError('APR_BROKER_START_FAILED', 'Pinned broker runtime is incomplete.', {
          recovery: 'Restore the exact immutable runtime image and retry.',
        });
      }
      const packageRoot = runtimeObservation.packageRoot;
      const security = platformSecurity({ root: packageRoot });
      const platform = Object.freeze({ ...security, repository: createGitRepository() });
      const identity = canonicalProjectIdentity({ cwd: bootstrap.project.physicalRoot, platform });
      if (!sameIdentity(identity, bootstrap.project)) {
        throw new AprError('APR_BROKER_AUTH_FAILED', 'Bootstrap project identity changed.', {
          recovery: 'Discard the bootstrap and restart from the canonical project root.',
        });
      }
      const store = {
        root: path.join(
          identity.physicalRoot,
          '.scratch',
          'peer-review',
          'broker',
          'registrations'
        ),
      };
      const loadRegistrations = () =>
        reconcileRegistrations({
          project: identity,
          store,
          inspectAuthority: inspectStartupAuthority,
        });
      const registrations = await loadRegistrations();
      const paths = brokerPaths({
        identity,
        platform,
        env: process.env,
        home: homedir(),
      });
      const owner = performOperationEffect(fence, () =>
        acquireBrokerOwnership(
          {
            identity,
            paths,
            versions: bootstrap.versions,
            deferPublication: true,
            reconcile: () => registrationSnapshotCurrent(store, registrations),
          },
          platform
        )
      );
      const server = createLegacyBrokerServer(owner, platform);
      await runBroker({
        identity,
        owner,
        versions: bootstrap.versions,
        cleanupGuard: async () => {
          const current = await assertSelectedRuntime({ previousObservation: runtimeObservation });
          assertCurrentCleanupOwnership({
            owner,
            protocol: bootstrap.versions.broker_protocol_version,
            runtime: current.inventory,
          });
        },
        registry: {
          list: loadRegistrations,
          async get(workspace) {
            const current = await loadRegistrations();
            return current.find((entry) => entry.workspace === workspace) ?? null;
          },
        },
        workerFactory: (registration) =>
          createProductionReviewWorker({
            registration,
            project: identity,
            runtimeImage: bootstrap.runtimeImage,
            owner,
            platform,
            clock: {
              now: () => Date.now(),
              setTimeout: (callback, delay) => setTimeout(callback, delay),
              clearTimeout: (timer) => clearTimeout(timer),
            },
          }),
        clock: {
          now: () => Date.now(),
          setTimeout: (callback, delay) => setTimeout(callback, delay),
          clearTimeout: (timer) => clearTimeout(timer),
        },
        server,
      });
    }
  );
}

async function main(argv = process.argv.slice(2)) {
  if (argv.length !== 1) throw new Error('usage: peer-review-broker <absolute-bootstrap-file>');
  await runBrokerEntrypoint(argv[0]);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    process.stderr.write(`${error.code ?? 'APR_BROKER_START_FAILED'}: ${error.message}\n`);
    process.exitCode = 1;
  });
}
