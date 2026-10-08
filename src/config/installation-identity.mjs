import { assertSelectedRuntime } from './runtime-selection.mjs';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { fileURLToPath } from 'node:url';
import { resolvePrimaryAuthoritySync } from './primary-authority.mjs';
import { createIntegrationChecker } from './integration-contract-core.mjs';

import { AprError } from '../errors.mjs';
import { configPaths, loadConfig } from './load.mjs';

const PACKAGE_FILE = new URL('../../package.json', import.meta.url);
const SKILL_FILE = new URL('../../skills/peer-review/SKILL.md', import.meta.url);

function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function installedPackageIdentity() {
  return Object.freeze({
    package_version: JSON.parse(readFileSync(PACKAGE_FILE, 'utf8')).version,
    skill_sha256: digest(readFileSync(SKILL_FILE)),
  });
}

export async function assertProjectSetupCompatible({
  cwd = process.cwd(),
  env = process.env,
} = {}) {
  const paths = await configPaths({ cwd, env });
  if (paths.primaryRoot) {
    const primary = await resolvePrimaryAuthoritySync({ cwd });
    return createIntegrationChecker({
      packageRoot: fileURLToPath(new URL('../..', import.meta.url)),
      home: userInfo().homedir,
    }).check(primary);
  }
  const file = paths.project;
  if (!file || !existsSync(file)) return;
  await loadConfig({ cwd, env });
  const config = JSON.parse(readFileSync(file, 'utf8'));
  if (!config.setup) return;
  throw new AprError(
    'APR_SETUP_VERSION_MISMATCH',
    'Legacy copied integrations require primary migration.',
    {
      recovery:
        'Run peer-review primary register --dry-run in the physical primary; inspect and register it, then run peer-review setup --update --dry-run --migrate and peer-review setup --update --migrate. Commit and explicitly activate the migrated owned files.',
      details: {
        observed_package_version: config.setup.package_version ?? null,
        migration_required: true,
      },
    }
  );
}

// Locator selection is independent of legacy setup-version compatibility.
export const selectedInstallationIdentity = (input) => assertSelectedRuntime(input);
