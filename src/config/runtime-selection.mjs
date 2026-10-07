// @story #133
import { userInfo } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createSelectionStore } from './runtime-selection-core.mjs';
export { validateRuntimeSelection } from './runtime-selection-core.mjs';
const store = createSelectionStore({
  account: userInfo,
  packageRoot: fileURLToPath(new URL('../..', import.meta.url)),
});
export const readRuntimeSelection = () => store.read();
export const registerRuntimeSelection = (options) => store.register(options);
export const assertSelectedRuntime = (input) => store.assertSelected(input);
export const verifiedAccountSelectionPath = () => store.location();

export async function inspectRuntimeSelection() {
  try {
    const selected = await readRuntimeSelection();
    const observation = await assertSelectedRuntime();
    return Object.freeze({
      status: 'selected',
      selection_id: selected.selection_id,
      packageRoot: observation.packageRoot,
      nodeExecutable: observation.nodeExecutable,
      packageVersion: observation.packageVersion,
      inventoryDigest: observation.inventoryDigest,
    });
  } catch (error) {
    return Object.freeze({
      status: 'unavailable',
      code: error.code ?? 'APR_RUNTIME_SELECTION_INVALID',
      recovery: error.recovery ?? 'Inspect the OS account and global installation.',
    });
  }
}
