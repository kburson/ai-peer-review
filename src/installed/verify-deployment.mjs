// @story #137
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  inspectPackageInventory,
  verifyRuntimeInventorySync,
} from '../startup/runtime-inventory.mjs';
import { validateRuntimeCompatibility } from '../protocol/compatibility.mjs';
import { AprError } from '../errors.mjs';

const packageRoot = fileURLToPath(new URL('../..', import.meta.url));
export function verifyDeployment() {
  const observation = inspectPackageInventory({ packageRoot });
  const manifest = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
  const required = [
    'provenance/runtime-compatibility.json',
    'templates/integration/contract-v1.json',
    'templates/integration/format-v1.json',
    'templates/integration/markdownlint-v1.json',
    'bin/peer-review.mjs',
    'bin/peer-review-mcp.mjs',
    'bin/peer-review-broker.mjs',
    'bin/peer-review-codex-hook.mjs',
    'bin/peer-review-claude-hook.mjs',
    'bin/verify-deployment.mjs',
    'src/public-api.mjs',
    'native/broker-security/binding.gyp',
    'native/broker-security/addon.cc',
    'native/broker-security/posix.cc',
    'native/broker-security/windows.cc',
    'scripts/build-broker-security.mjs',
  ];
  const paths = new Set(observation.entries.map((entry) => entry.path));
  if (
    required.some((entry) => !paths.has(entry)) ||
    observation.entries.some(
      (entry) =>
        /^(?:test|vendors|\.github|\.codex|\.agents)\//.test(entry.path) ||
        /^scripts\/(?:verify-release|verify-extraction|pack-runtime)/.test(entry.path) ||
        entry.path.startsWith('docs/superpowers/')
    ) ||
    manifest.devDependencies ||
    Object.keys(manifest.scripts ?? {})
      .sort()
      .join(',') !== 'build:broker-security,verify:deployment'
  )
    throw new AprError(
      'APR_DEPLOYMENT_INVALID',
      'Installed package violates the runtime-only deployment contract.'
    );
  validateRuntimeCompatibility(
    JSON.parse(
      readFileSync(path.join(packageRoot, 'provenance/runtime-compatibility.json'), 'utf8')
    )
  );
  for (const relative of required.filter((entry) => entry.endsWith('.json')))
    JSON.parse(readFileSync(path.join(packageRoot, relative), 'utf8'));
  let runtimeInventoryStatus = 'requires-bootstrap';
  // Fresh tarballs have no sealed dependency closure until bootstrap. Once
  // dependency bytes are sealed, integrity failures must remain failures.
  if (observation.entries.some((entry) => entry.path.startsWith('node_modules/'))) {
    verifyRuntimeInventorySync({ packageRoot });
    runtimeInventoryStatus = 'verified';
  }
  let nativeStatus = 'requires-build';
  if (
    paths.has('native/broker-security/build/Release/build-identity.json') &&
    paths.has('native/broker-security/build/Release/broker_security.node')
  ) {
    const identity = JSON.parse(
      readFileSync(
        path.join(packageRoot, 'native/broker-security/build/Release/build-identity.json'),
        'utf8'
      )
    );
    if (
      identity.node === process.versions.node &&
      identity.platform === process.platform &&
      identity.arch === process.arch
    )
      nativeStatus = 'built';
  }
  return Object.freeze({
    status: 'verified',
    nativeStatus,
    runtimeInventoryStatus,
    packageName: manifest.name,
    packageVersion: manifest.version,
    packageRoot: observation.packageRoot,
    inventoryDigest: observation.inventoryDigest,
  });
}
