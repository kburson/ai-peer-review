import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { validateHandshake } from '../../src/broker/ipc.mjs';
import { reconcileRegistrations, registerReview } from '../../src/broker/registry.mjs';
import { pinRuntimeImage, verifyRuntimeImage } from '../../src/broker/runtime-image.mjs';

test('an installed-package and node upgrade leaves an active review on its verified pinned runtime', async (t) => {
  const scratch = path.join(process.cwd(), '.scratch', 'test');
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(path.join(scratch, 'broker-upgrade-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const packageRoot = path.join(root, 'installed-package');
  mkdirSync(packageRoot, { recursive: true });
  writeFileSync(
    path.join(packageRoot, 'package.json'),
    `${JSON.stringify({
      name: 'upgrade-fixture',
      version: '1.0.0',
      type: 'module',
      license: 'Apache-2.0',
      bin: './cli.mjs',
    })}\n`
  );
  writeFileSync(path.join(packageRoot, 'cli.mjs'), "console.log('release-one');\n");
  writeFileSync(path.join(packageRoot, 'LICENSE'), 'license one\n');
  const installedNode = path.join(root, 'installed-node');
  writeFileSync(installedNode, 'node-release-one\n');
  chmodSync(installedNode, 0o755);
  const image = pinRuntimeImage({
    packageRoot,
    nodeExecutable: installedNode,
    destination: path.join(root, 'runtime-images', 'release-one'),
  });
  const project = { digest: 'd'.repeat(64), physicalRoot: path.join(root, 'project') };
  const workspace = path.join(
    project.physicalRoot,
    '.scratch',
    'peer-review',
    'reviews',
    'review-one'
  );
  mkdirSync(workspace, { recursive: true });
  const store = {
    root: path.join(project.physicalRoot, '.scratch', 'peer-review', 'broker', 'registrations'),
  };
  const registration = registerReview(
    { project, requestDigest: 'e'.repeat(64), workspace, runtime: image },
    store
  );

  writeFileSync(path.join(packageRoot, 'cli.mjs'), "console.log('release-two');\n");
  writeFileSync(installedNode, 'node-release-two\n');
  const registrations = await reconcileRegistrations({
    project,
    store,
    inspectAuthority: async () => ({
      status: 'active',
      workspace,
      request_digest: registration.request_digest,
      runtime_digest: registration.runtime.digest,
      event_authority: 'exact',
      output_reservation: 'exact',
    }),
  });

  assert.equal(verifyRuntimeImage(image), true);
  assert.equal(readFileSync(image.entrypoint, 'utf8'), "console.log('release-one');\n");
  assert.equal(readFileSync(image.nodeExecutable, 'utf8'), 'node-release-one\n');
  assert.equal(registrations[0].runtime.root, image.root);
  assert.equal(registrations[0].runtime.digest, image.digest);

  const handshake = {
    schema: 'ai-peer-review.broker-handshake/v1',
    tuple: ['ai-peer-review.broker-root/v1', project.physicalRoot, null, '501'],
    versions: { package_version: '1.0.0', broker_protocol_version: 1, node_major: 26 },
    instance_id: 'f'.repeat(64),
    nonce: '0'.repeat(64),
  };
  for (const versions of [
    { ...handshake.versions, package_version: '2.0.0' },
    { ...handshake.versions, broker_protocol_version: 2 },
    { ...handshake.versions, node_major: 27 },
  ]) {
    assert.throws(
      () => validateHandshake({ ...handshake, versions }, handshake, '501'),
      (error) =>
        error.code === 'APR_BROKER_INCOMPATIBLE' &&
        /restore the recorded compatible runtime/i.test(error.recovery)
    );
    assert.equal(verifyRuntimeImage(image), true, 'mismatch must not replace the draining image');
    assert.equal(readFileSync(registration.registration_file, 'utf8').length > 0, true);
  }
});
