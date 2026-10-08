// @story #134
import { userInfo } from 'node:os';
import { fileURLToPath } from 'node:url';
import { assertSelectedRuntime } from './runtime-selection.mjs';
import { createPrimaryMaintenance } from './primary-maintenance.mjs';
import { resolvePrimaryAuthoritySync } from './primary-authority.mjs';
import { assertIntegrationCurrent } from './integration-contract.mjs';
import { INTEGRATION_CONTRACT } from './integration-assets.mjs';
const packageRoot = fileURLToPath(new URL('../..', import.meta.url));
function maintenance() {
  return createPrimaryMaintenance({
    packageRoot,
    home: userInfo().homedir,
    admit: assertSelectedRuntime,
    integrationContract: INTEGRATION_CONTRACT,
  });
}
export async function registerPrimary(options = {}) {
  return maintenance().register(options);
}
export async function activatePrimaryPolicy(options = {}) {
  return maintenance().activate(options);
}
export async function inspectPrimary({ cwd = process.cwd() } = {}) {
  const runtime = await assertSelectedRuntime();
  const primary = await resolvePrimaryAuthoritySync({ cwd });
  const integration = await assertIntegrationCurrent({ primary, runtime });
  return Object.freeze({
    schema: 'ai-peer-review.primary-inspection/v1',
    root: primary.root,
    skillPath: integration.skillPath,
    activationDigest: primary.activationDigest,
    integrationContract: integration.contract,
  });
}
