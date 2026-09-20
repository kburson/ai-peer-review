import assert from 'node:assert/strict';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { Worker } from 'node:worker_threads';

import { reconcileRegistrations, registerReview } from '../../src/broker/registry.mjs';
import { pinRuntimeImage, verifyRuntimeImage } from '../../src/broker/runtime-image.mjs';

const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);
const PROJECT_DIGEST = 'c'.repeat(64);

function spawnNpmSync(args, options) {
  if (process.platform === 'win32') {
    return spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/c', 'npm', ...args], options);
  }
  return spawnSync('npm', args, options);
}

function fixture(t) {
  const scratch = path.join(process.cwd(), '.scratch', 'test');
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(path.join(scratch, 'broker-registry-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const packageRoot = path.join(root, 'package-source');
  const dependency = path.join(packageRoot, 'node_modules', 'tiny-dependency');
  const peerDependency = path.join(packageRoot, 'node_modules', 'peer-helper');
  mkdirSync(dependency, { recursive: true });
  mkdirSync(peerDependency, { recursive: true });
  writeFileSync(
    path.join(packageRoot, 'package.json'),
    `${JSON.stringify({
      name: 'runtime-fixture',
      version: '1.0.0',
      type: 'module',
      license: 'Apache-2.0',
      bin: { 'peer-review': './cli.mjs' },
      files: ['cli.mjs'],
      dependencies: { 'tiny-dependency': '1.0.0' },
      optionalDependencies: { 'absent-platform-helper': '1.0.0' },
    })}\n`
  );
  writeFileSync(
    path.join(packageRoot, 'cli.mjs'),
    "import value from 'tiny-dependency';\nconsole.log(value);\n"
  );
  writeFileSync(path.join(packageRoot, 'LICENSE'), 'fixture license\n');
  const nativeRoot = path.join(packageRoot, 'native', 'broker-security', 'build', 'Release');
  mkdirSync(nativeRoot, { recursive: true });
  writeFileSync(path.join(nativeRoot, 'broker_security.node'), 'native-fixture\n');
  writeFileSync(path.join(nativeRoot, 'build-identity.json'), '{}\n');
  mkdirSync(path.join(packageRoot, '.scratch'), { recursive: true });
  writeFileSync(path.join(packageRoot, '.scratch', 'secret.txt'), 'do not copy\n');
  writeFileSync(path.join(packageRoot, '.env'), 'TOKEN=secret\n');
  writeFileSync(
    path.join(dependency, 'package.json'),
    `${JSON.stringify({
      name: 'tiny-dependency',
      version: '1.0.0',
      main: 'index.cjs',
      peerDependencies: { 'peer-helper': '1.0.0', 'absent-peer-helper': '1.0.0' },
      peerDependenciesMeta: { 'absent-peer-helper': { optional: true } },
    })}\n`
  );
  writeFileSync(path.join(dependency, 'index.cjs'), "module.exports = 'first';\n");
  writeFileSync(
    path.join(peerDependency, 'package.json'),
    `${JSON.stringify({ name: 'peer-helper', version: '1.0.0', main: 'index.cjs' })}\n`
  );
  writeFileSync(path.join(peerDependency, 'index.cjs'), "module.exports = 'peer';\n");
  const nodeExecutable = path.join(root, 'node-fixture.exe');
  writeFileSync(nodeExecutable, 'node-v1\n');
  chmodSync(nodeExecutable, 0o755);
  const destination = path.join(root, 'images', 'runtime-v1');
  const image = pinRuntimeImage({ packageRoot, nodeExecutable, destination });
  const project = Object.freeze({
    digest: PROJECT_DIGEST,
    physicalRoot: path.join(root, 'project'),
  });
  mkdirSync(project.physicalRoot, { recursive: true });
  return {
    root,
    packageRoot,
    dependency,
    nodeExecutable,
    image,
    project,
    store: {
      root: path.join(project.physicalRoot, '.scratch', 'peer-review', 'broker', 'registrations'),
    },
  };
}

test('pinRuntimeImage preserves the package closure, node bytes, licenses, and a closed manifest', (t) => {
  const value = fixture(t);
  assert.equal(verifyRuntimeImage(value.image), true);
  assert.equal(
    verifyRuntimeImage({ ...value.image, entrypoint: value.nodeExecutable }),
    false,
    'a registration cannot substitute an executable outside the verified image'
  );
  assert.equal(readFileSync(value.image.nodeExecutable, 'utf8'), 'node-v1\n');
  assert.equal(path.basename(value.image.nodeExecutable), 'node-fixture.exe');
  assert.equal(readFileSync(value.image.entrypoint, 'utf8').includes('tiny-dependency'), true);
  assert.deepEqual(
    value.image.files,
    [...value.image.files].sort((left, right) => left.path.localeCompare(right.path))
  );
  assert.ok(value.image.files.some(({ path: name }) => name === 'package/LICENSE'));
  assert.ok(
    value.image.files.some(
      ({ path: name }) =>
        name === 'package/native/broker-security/build/Release/broker_security.node'
    )
  );
  assert.ok(!value.image.files.some(({ path: name }) => name.includes('.scratch')));
  assert.ok(!value.image.files.some(({ path: name }) => name.endsWith('/.env')));
  assert.ok(
    value.image.files.some(
      ({ path: name }) => name === 'package/node_modules/tiny-dependency/index.cjs'
    )
  );
  assert.ok(
    value.image.files.some(
      ({ path: name }) => name === 'package/node_modules/peer-helper/index.cjs'
    )
  );
  assert.equal(Object.isFrozen(value.image), true);

  writeFileSync(path.join(value.packageRoot, 'cli.mjs'), "console.log('upgraded');\n");
  writeFileSync(value.nodeExecutable, 'node-v2\n');
  assert.equal(
    verifyRuntimeImage(value.image),
    true,
    'source upgrades cannot mutate a pinned image'
  );

  writeFileSync(value.image.entrypoint, 'tampered\n');
  assert.equal(verifyRuntimeImage(value.image), false, 'changed pinned bytes must be detected');
});

test('verifyRuntimeImage rejects incomplete staging evidence', (t) => {
  const scratch = path.join(process.cwd(), '.scratch', 'test');
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(path.join(scratch, 'broker-incomplete-image-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, 'package'));
  writeFileSync(path.join(root, 'package', 'cli.mjs'), 'incomplete\n');
  assert.equal(verifyRuntimeImage({ root, digest: `sha256:${DIGEST_A}` }), false);
});

test('pinRuntimeImage fails closed for an incomplete dependency closure and occupied destination', (t) => {
  const value = fixture(t);
  rmSync(value.dependency, { recursive: true, force: true });
  assert.throws(
    () =>
      pinRuntimeImage({
        packageRoot: value.packageRoot,
        nodeExecutable: value.nodeExecutable,
        destination: path.join(value.root, 'images', 'incomplete'),
      }),
    (error) => error.code === 'APR_RUNTIME_IMAGE_INVALID' && /dependency/i.test(error.message)
  );
  assert.throws(
    () =>
      pinRuntimeImage({
        packageRoot: value.packageRoot,
        nodeExecutable: value.nodeExecutable,
        destination: value.image.root,
      }),
    (error) => error.code === 'APR_RUNTIME_IMAGE_CONFLICT'
  );
});

test('pinRuntimeImage rejects symlinked package content instead of following foreign bytes', (t) => {
  const value = fixture(t);
  const foreign = path.join(value.root, 'foreign.txt');
  writeFileSync(foreign, 'foreign\n');
  symlinkSync(foreign, path.join(value.packageRoot, 'foreign-link'));
  const manifestFile = path.join(value.packageRoot, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
  writeFileSync(
    manifestFile,
    `${JSON.stringify({ ...manifest, files: ['cli.mjs', 'foreign-link'] })}\n`
  );
  assert.throws(
    () =>
      pinRuntimeImage({
        packageRoot: value.packageRoot,
        nodeExecutable: value.nodeExecutable,
        destination: path.join(value.root, 'images', 'symlinked'),
      }),
    (error) => error.code === 'APR_RUNTIME_IMAGE_INVALID' && /symbolic link/i.test(error.message)
  );
});

test('pinRuntimeImage rejects a symlinked destination parent', (t) => {
  const value = fixture(t);
  const foreign = path.join(value.root, 'foreign-cache');
  const alias = path.join(value.root, 'cache-alias');
  mkdirSync(foreign);
  symlinkSync(foreign, alias);
  assert.throws(
    () =>
      pinRuntimeImage({
        packageRoot: value.packageRoot,
        nodeExecutable: value.nodeExecutable,
        destination: path.join(alias, 'new-parent', 'runtime-v2'),
      }),
    (error) => error.code === 'APR_RUNTIME_IMAGE_INVALID' && /destination/i.test(error.message)
  );
  assert.equal(
    existsSync(path.join(foreign, 'new-parent')),
    false,
    'rejection must not create directories through a symlinked ancestor'
  );
});

test('pinRuntimeImage resolves a hoisted installed dependency into an executable image', (t) => {
  const scratch = path.join(process.cwd(), '.scratch', 'test');
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(path.join(scratch, 'broker-hoisted-install-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const consumer = path.join(root, 'consumer');
  const sources = path.join(root, 'sources');
  const packageSource = path.join(sources, 'runtime-fixture');
  const dependencySource = path.join(sources, 'tiny-dependency');
  const tarballs = path.join(root, 'tarballs');
  mkdirSync(packageSource, { recursive: true });
  mkdirSync(dependencySource, { recursive: true });
  mkdirSync(tarballs);
  writeFileSync(
    path.join(packageSource, 'package.json'),
    `${JSON.stringify({
      name: 'runtime-fixture',
      version: '1.0.0',
      type: 'module',
      bin: './cli.mjs',
      files: ['cli.mjs'],
      dependencies: { 'tiny-dependency': '1.0.0' },
    })}\n`
  );
  writeFileSync(
    path.join(packageSource, 'cli.mjs'),
    "import value from 'tiny-dependency'; console.log(value);\n"
  );
  writeFileSync(
    path.join(dependencySource, 'package.json'),
    `${JSON.stringify({ name: 'tiny-dependency', version: '1.0.0', main: 'index.cjs' })}\n`
  );
  writeFileSync(path.join(dependencySource, 'index.cjs'), "module.exports = 'hoisted-ok';\n");
  for (const source of [packageSource, dependencySource]) {
    const packed = spawnNpmSync(['pack', '--ignore-scripts', '--pack-destination', tarballs], {
      cwd: source,
      encoding: 'utf8',
    });
    assert.equal(packed.status, 0, packed.stderr);
  }
  mkdirSync(consumer);
  writeFileSync(
    path.join(consumer, 'package.json'),
    `${JSON.stringify({ name: 'consumer', version: '1.0.0', private: true })}\n`
  );
  const installed = spawnNpmSync(
    [
      'install',
      '--ignore-scripts',
      '--offline',
      '--no-audit',
      '--no-fund',
      '--package-lock=false',
      path.join(tarballs, 'runtime-fixture-1.0.0.tgz'),
      path.join(tarballs, 'tiny-dependency-1.0.0.tgz'),
    ],
    { cwd: consumer, encoding: 'utf8' }
  );
  assert.equal(installed.status, 0, installed.stderr);
  const packageRoot = path.join(consumer, 'node_modules', 'runtime-fixture');
  assert.equal(existsSync(path.join(packageRoot, 'node_modules', 'tiny-dependency')), false);
  assert.equal(existsSync(path.join(consumer, 'node_modules', 'tiny-dependency')), true);
  const image = pinRuntimeImage({
    packageRoot,
    nodeExecutable: process.execPath,
    destination: path.join(root, 'images', 'runtime-v1'),
  });
  rmSync(consumer, { recursive: true, force: true });
  assert.equal(path.basename(image.nodeExecutable), path.basename(process.execPath));
  const execution = spawnSync(image.nodeExecutable, [image.entrypoint], { encoding: 'utf8' });
  assert.equal(execution.status, 0, execution.stderr);
  assert.equal(execution.stdout, 'hoisted-ok\n');
});

test('pinRuntimeImage preserves a root dependency nested by a hoisted version conflict', (t) => {
  const scratch = path.join(process.cwd(), '.scratch', 'test');
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(path.join(scratch, 'broker-nested-install-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const consumer = path.join(root, 'consumer');
  const packageRoot = path.join(consumer, 'node_modules', 'runtime-fixture');
  const nested = path.join(packageRoot, 'node_modules', 'tiny-dependency');
  const hoisted = path.join(consumer, 'node_modules', 'tiny-dependency');
  mkdirSync(nested, { recursive: true });
  mkdirSync(hoisted, { recursive: true });
  writeFileSync(
    path.join(packageRoot, 'package.json'),
    `${JSON.stringify({
      name: 'runtime-fixture',
      version: '1.0.0',
      type: 'module',
      bin: './cli.mjs',
      files: ['cli.mjs'],
      dependencies: { 'tiny-dependency': '1.0.0' },
    })}\n`
  );
  writeFileSync(
    path.join(packageRoot, 'cli.mjs'),
    "import value from 'tiny-dependency'; console.log(value);\n"
  );
  writeFileSync(
    path.join(nested, 'package.json'),
    `${JSON.stringify({ name: 'tiny-dependency', version: '1.0.0', main: 'index.cjs' })}\n`
  );
  writeFileSync(path.join(nested, 'index.cjs'), "module.exports = 'nested-v1';\n");
  writeFileSync(
    path.join(hoisted, 'package.json'),
    `${JSON.stringify({ name: 'tiny-dependency', version: '2.0.0', main: 'index.cjs' })}\n`
  );
  writeFileSync(path.join(hoisted, 'index.cjs'), "module.exports = 'hoisted-v2';\n");
  const nodeExecutable = path.join(root, 'node-fixture');
  writeFileSync(nodeExecutable, 'node-v1\n');
  chmodSync(nodeExecutable, 0o755);

  const image = pinRuntimeImage({
    packageRoot,
    nodeExecutable,
    destination: path.join(root, 'images', 'runtime-v1'),
  });
  rmSync(consumer, { recursive: true, force: true });
  const execution = spawnSync(process.execPath, [image.entrypoint], { encoding: 'utf8' });
  assert.equal(execution.status, 0, execution.stderr);
  assert.equal(execution.stdout, 'nested-v1\n');
});

test('pinRuntimeImage rejects a source inventory added while copying', async (t) => {
  const value = fixture(t);
  const payloadDirectory = path.join(value.packageRoot, 'payload');
  mkdirSync(payloadDirectory);
  writeFileSync(path.join(payloadDirectory, 'large.bin'), Buffer.alloc(32 * 1024 * 1024, 1));
  const manifestFile = path.join(value.packageRoot, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
  writeFileSync(
    manifestFile,
    `${JSON.stringify({ ...manifest, files: ['cli.mjs', 'payload/'] })}\n`
  );
  const destination = path.join(value.root, 'images', 'mutating');
  const added = path.join(payloadDirectory, 'added-during-copy.txt');
  const worker = new Worker(
    `
      const { existsSync, readdirSync, writeFileSync } = require('node:fs');
      const path = require('node:path');
      const { parentPort, workerData } = require('node:worker_threads');
      parentPort.postMessage('ready');
      for (;;) {
        if (existsSync(workerData.images)) {
          const stage = readdirSync(workerData.images).find((name) => name.startsWith('mutating.staging-'));
          if (stage && existsSync(path.join(workerData.images, stage, 'package', 'cli.mjs'))) {
            writeFileSync(workerData.added, 'late\\n');
            break;
          }
        }
      }
    `,
    { eval: true, workerData: { images: path.dirname(destination), added } }
  );
  t.after(() => worker.terminate());
  await new Promise((resolve) => worker.once('message', resolve));
  assert.throws(
    () =>
      pinRuntimeImage({
        packageRoot: value.packageRoot,
        nodeExecutable: value.nodeExecutable,
        destination,
      }),
    (error) => error.code === 'APR_RUNTIME_IMAGE_CHANGED'
  );
  assert.equal(existsSync(added), true);
});

test('registerReview is idempotent only for the exact immutable registration', (t) => {
  const value = fixture(t);
  const workspace = path.join(
    value.project.physicalRoot,
    '.scratch',
    'peer-review',
    'reviews',
    'review-a'
  );
  mkdirSync(workspace, { recursive: true });
  const first = registerReview(
    { project: value.project, requestDigest: DIGEST_A, workspace, runtime: value.image },
    { ...value.store, now: () => '2026-09-20T12:00:00.000Z' }
  );
  const retry = registerReview(
    { project: value.project, requestDigest: DIGEST_A, workspace, runtime: value.image },
    { ...value.store, now: () => '2026-09-20T13:00:00.000Z' }
  );
  assert.deepEqual(retry, first);

  assert.throws(
    () =>
      registerReview(
        { project: value.project, requestDigest: DIGEST_B, workspace, runtime: value.image },
        value.store
      ),
    (error) =>
      error.code === 'APR_BROKER_REGISTRATION_CONFLICT' &&
      /existing registration/i.test(error.recovery) &&
      !/output collision/i.test(error.recovery)
  );
  assert.equal(JSON.parse(readFileSync(first.registration_file, 'utf8')).request_digest, DIGEST_A);
});

test('registration identity includes the exact workspace instead of deduplicating on artifact paths', (t) => {
  const value = fixture(t);
  const reviewRoot = path.join(value.project.physicalRoot, '.scratch', 'peer-review', 'reviews');
  const workspaceA = path.join(reviewRoot, 'review-a');
  const workspaceB = path.join(reviewRoot, 'review-b');
  mkdirSync(workspaceA, { recursive: true });
  mkdirSync(workspaceB, { recursive: true });
  const first = registerReview(
    {
      project: value.project,
      requestDigest: DIGEST_A,
      workspace: workspaceA,
      runtime: value.image,
    },
    value.store
  );
  const second = registerReview(
    {
      project: value.project,
      requestDigest: DIGEST_A,
      workspace: workspaceB,
      runtime: value.image,
    },
    value.store
  );
  assert.notEqual(first.review_id, second.review_id);
  assert.notEqual(first.registration_file, second.registration_file);
});

test('registerReview rejects symlinked store and workspace ancestors without foreign writes', (t) => {
  const value = fixture(t);
  const foreignStore = path.join(value.root, 'foreign-store');
  const brokerRoot = path.join(value.project.physicalRoot, '.scratch', 'peer-review', 'broker');
  mkdirSync(foreignStore);
  mkdirSync(path.dirname(brokerRoot), { recursive: true });
  symlinkSync(foreignStore, brokerRoot);
  const workspace = path.join(
    value.project.physicalRoot,
    '.scratch',
    'peer-review',
    'reviews',
    'review-store-link'
  );
  mkdirSync(workspace, { recursive: true });
  assert.throws(
    () =>
      registerReview(
        { project: value.project, requestDigest: DIGEST_A, workspace, runtime: value.image },
        value.store
      ),
    (error) => error.code === 'APR_BROKER_REGISTRATION_INVALID'
  );
  assert.equal(existsSync(path.join(foreignStore, 'registrations')), false);

  rmSync(brokerRoot);
  const reviewRoot = path.join(value.project.physicalRoot, '.scratch', 'peer-review', 'reviews');
  const foreignReviews = path.join(value.root, 'foreign-reviews');
  rmSync(reviewRoot, { recursive: true, force: true });
  mkdirSync(foreignReviews);
  symlinkSync(foreignReviews, reviewRoot);
  const foreignWorkspace = path.join(reviewRoot, 'review-workspace-link');
  mkdirSync(foreignWorkspace);
  assert.throws(
    () =>
      registerReview(
        {
          project: value.project,
          requestDigest: DIGEST_A,
          workspace: foreignWorkspace,
          runtime: value.image,
        },
        value.store
      ),
    (error) => error.code === 'APR_BROKER_REGISTRATION_INVALID'
  );
  assert.equal(existsSync(path.join(foreignStore, 'registrations')), false);
});

test('reconcileRegistrations preserves exact live authority and fences missing or ambiguous evidence', async (t) => {
  const value = fixture(t);
  const workspace = path.join(
    value.project.physicalRoot,
    '.scratch',
    'peer-review',
    'reviews',
    'review-a'
  );
  mkdirSync(workspace, { recursive: true });
  const registration = registerReview(
    { project: value.project, requestDigest: DIGEST_A, workspace, runtime: value.image },
    value.store
  );
  const reconciled = await reconcileRegistrations({
    project: value.project,
    store: value.store,
    inspectAuthority: async ({ workspace: inspected }) => ({
      status: 'active',
      workspace: inspected,
      request_digest: DIGEST_A,
      runtime_digest: value.image.digest,
      event_authority: 'exact',
      output_reservation: 'exact',
    }),
  });
  assert.deepEqual(reconciled, [registration]);

  await assert.rejects(
    reconcileRegistrations({
      project: value.project,
      store: value.store,
      inspectAuthority: async () => ({ status: 'unknown' }),
    }),
    (error) => error.code === 'APR_BROKER_REGISTRATION_RECOVERY_REQUIRED'
  );
  rmSync(value.image.root, { recursive: true, force: true });
  await assert.rejects(
    reconcileRegistrations({
      project: value.project,
      store: value.store,
      inspectAuthority: async () => ({ status: 'active' }),
    }),
    (error) => error.code === 'APR_BROKER_RUNTIME_MISSING'
  );
});

test('reconcileRegistrations rejects a registered workspace replaced by a symlink', async (t) => {
  const value = fixture(t);
  const workspace = path.join(
    value.project.physicalRoot,
    '.scratch',
    'peer-review',
    'reviews',
    'review-replaced'
  );
  mkdirSync(workspace, { recursive: true });
  registerReview(
    { project: value.project, requestDigest: DIGEST_A, workspace, runtime: value.image },
    value.store
  );
  const foreign = path.join(value.root, 'foreign-replaced-workspace');
  mkdirSync(foreign);
  rmSync(workspace, { recursive: true });
  symlinkSync(foreign, workspace);
  let inspected = false;
  await assert.rejects(
    reconcileRegistrations({
      project: value.project,
      store: value.store,
      inspectAuthority: async () => {
        inspected = true;
        return { status: 'active' };
      },
    }),
    (error) => error.code === 'APR_BROKER_REGISTRATION_RECOVERY_REQUIRED'
  );
  assert.equal(inspected, false);
});

test('reconcileRegistrations rebuilds only exact contained authority and ignores foreign paths', async (t) => {
  const value = fixture(t);
  const reviewRoot = path.join(value.project.physicalRoot, '.scratch', 'peer-review', 'reviews');
  const workspace = path.join(reviewRoot, 'review-recovered');
  mkdirSync(workspace, { recursive: true });
  const foreign = path.join(value.root, 'foreign-review');
  mkdirSync(foreign);
  symlinkSync(foreign, path.join(reviewRoot, 'foreign-link'));

  const registrations = await reconcileRegistrations({
    project: value.project,
    store: value.store,
    inspectAuthority: async ({ workspace: inspected }) => ({
      status: 'active',
      workspace: inspected,
      request_digest: DIGEST_A,
      runtime: value.image,
      runtime_digest: value.image.digest,
      event_authority: 'exact',
      output_reservation: 'exact',
    }),
  });
  assert.equal(registrations.length, 1);
  assert.equal(registrations[0].review_id, 'review-recovered');
  assert.equal(registrations[0].workspace, workspace);
  assert.equal(
    JSON.parse(readFileSync(registrations[0].registration_file)).request_digest,
    DIGEST_A
  );

  rmSync(registrations[0].registration_file);
  await assert.rejects(
    reconcileRegistrations({
      project: value.project,
      store: value.store,
      inspectAuthority: async () => ({
        status: 'active',
        request_digest: DIGEST_A,
        runtime: value.image,
        event_authority: 'unknown',
        output_reservation: 'exact',
      }),
    }),
    (error) => error.code === 'APR_BROKER_REGISTRATION_RECOVERY_REQUIRED'
  );
});

test('reconcileRegistrations requires affirmative clear authority when project scratch is absent', async (t) => {
  const value = fixture(t);
  await assert.rejects(
    reconcileRegistrations({
      project: value.project,
      store: value.store,
      inspectAuthority: async () => ({ status: 'unknown' }),
    }),
    (error) => error.code === 'APR_BROKER_REGISTRATION_RECOVERY_REQUIRED'
  );
  assert.deepEqual(
    await reconcileRegistrations({
      project: value.project,
      store: value.store,
      inspectAuthority: async ({ workspace }) => ({
        status: workspace === null ? 'clear' : 'unknown',
        event_authority: 'exact',
        output_reservation: 'exact',
      }),
    }),
    []
  );
});

test('reconcileRegistrations fences a claimed owned record outside the closed schema', async (t) => {
  const value = fixture(t);
  const workspace = path.join(
    value.project.physicalRoot,
    '.scratch',
    'peer-review',
    'reviews',
    'review-malformed'
  );
  mkdirSync(workspace, { recursive: true });
  const registration = registerReview(
    { project: value.project, requestDigest: DIGEST_A, workspace, runtime: value.image },
    value.store
  );
  const stored = JSON.parse(readFileSync(registration.registration_file, 'utf8'));
  writeFileSync(
    registration.registration_file,
    `${JSON.stringify({ ...stored, unknown: true })}\n`
  );
  await assert.rejects(
    reconcileRegistrations({
      project: value.project,
      store: value.store,
      inspectAuthority: async () => ({
        status: 'active',
        request_digest: DIGEST_A,
        runtime_digest: value.image.digest,
        event_authority: 'exact',
        output_reservation: 'exact',
      }),
    }),
    (error) => error.code === 'APR_BROKER_REGISTRATION_RECOVERY_REQUIRED'
  );
});

test('reconcileRegistrations refuses a symlinked registration store', async (t) => {
  const value = fixture(t);
  const foreign = path.join(value.root, 'foreign-store');
  mkdirSync(foreign);
  mkdirSync(path.dirname(value.store.root), { recursive: true });
  symlinkSync(foreign, value.store.root);
  await assert.rejects(
    reconcileRegistrations({
      project: value.project,
      store: value.store,
      inspectAuthority: async () => ({
        status: 'clear',
        event_authority: 'exact',
        output_reservation: 'exact',
      }),
    }),
    (error) => error.code === 'APR_BROKER_REGISTRATION_RECOVERY_REQUIRED'
  );
});
