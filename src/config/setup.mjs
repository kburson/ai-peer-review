// @story #134
import { userConfigPath } from './load.mjs';
import { userInfo } from 'node:os';
import { fileURLToPath } from 'node:url';
import { AprError } from '../errors.mjs';
import { assertSelectedRuntime } from './runtime-selection.mjs';
import { createSetupMaintenanceCore } from './setup-core.mjs';
const packageRoot = fileURLToPath(new URL('../..', import.meta.url));
const allowed = new Set([
  'scope',
  'agents',
  'cwd',
  'dryRun',
  'remove',
  'update',
  'confirmScratchExclude',
  'migrate',
  'migrateUser',
]);
function core(options) {
  if (
    !options ||
    typeof options !== 'object' ||
    Array.isArray(options) ||
    Object.keys(options).some((key) => !allowed.has(key))
  )
    throw new AprError(
      'APR_SETUP_INVALID',
      'Setup accepts no caller-supplied account or installation authority.',
      { recovery: 'Use the selected global setup command with its closed maintenance options.' }
    );
  const home = userInfo().homedir;
  const userFile = userConfigPath({ home });
  return createSetupMaintenanceCore({ packageRoot, home, userFile, admit: assertSelectedRuntime });
}
export async function setup(options = {}) {
  await assertSelectedRuntime();
  return core(options).setup(options);
}
export async function planSetup(options = {}) {
  return setup({ ...options, dryRun: true });
}
export async function updateSetup(options = {}) {
  if (options.remove || options.agents?.length)
    throw new AprError('APR_SETUP_INVALID', 'Update discovers existing recorded hosts.', {
      recovery: 'Use setup --update without explicit hosts or removal.',
    });
  return setup({ ...options, update: true });
}
