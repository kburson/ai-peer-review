import assert from 'node:assert/strict';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { reconcileRegistrations, registerReview } from '../../src/broker/registry.mjs';
import { pinRuntimeImage, verifyRuntimeImage } from '../../src/broker/runtime-image.mjs';

const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);
const PROJECT_DIGEST = 'c'.repeat(64);

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
      dependencies: { 'tiny-dependency': '1.0.0' },
      optionalDependencies: { 'absent-platform-helper': '1.0.0' },
    })}\n`
  );
  writeFileSync(
    path.join(packageRoot, 'cli.mjs'),
    "import value from 'tiny-dependency';\nconsole.log(value);\n"
  );
  writeFileSync(path.join(packageRoot, 'LICENSE'), 'fixture license\n');
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
  const nodeExecutable = path.join(root, 'node-fixture');
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
  assert.equal(readFileSync(value.image.entrypoint, 'utf8').includes('tiny-dependency'), true);
  assert.deepEqual(
    value.image.files,
    [...value.image.files].sort((left, right) => left.path.localeCompare(right.path))
  );
  assert.ok(value.image.files.some(({ path: name }) => name === 'package/LICENSE'));
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
        destination: path.join(alias, 'runtime-v2'),
      }),
    (error) => error.code === 'APR_RUNTIME_IMAGE_INVALID' && /destination/i.test(error.message)
  );
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
