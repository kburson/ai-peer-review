// @story #134
import { userInfo } from 'node:os';
import { fileURLToPath } from 'node:url';
import { assertSelectedRuntime } from './runtime-selection.mjs';
import { resolvePrimaryAuthoritySync } from './primary-authority.mjs';
import { createIntegrationChecker } from './integration-contract-core.mjs';
const packageRoot = fileURLToPath(new URL('../..', import.meta.url));
export async function assertIntegrationCurrent({ primary, runtime } = {}) {
  const selected = await assertSelectedRuntime();
  if (runtime && runtime.selection_id !== selected.selection_id)
    await assertSelectedRuntime({ previousObservation: runtime });
  const observed = resolvePrimaryAuthoritySync({
    cwd: primary?.activeWorktreeRoot ?? process.cwd(),
  });
  return createIntegrationChecker({ packageRoot, home: userInfo().homedir }).check(observed);
}
