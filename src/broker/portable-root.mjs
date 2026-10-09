// @story #189
import { lstat } from 'node:fs/promises';
import { AprError } from '../errors.mjs';
import { isPortableOperations, assertPortableOperationsContext } from './portable-platform.mjs';
import { provisionProtectedRoot } from './storage-protection.mjs';
import {
  currentOperationAuthorityContext,
  performCurrentOperationEffect,
} from '../startup/authority-fence.mjs';
export async function ensurePortableRootProtection({ root, operations, signal, deadline }) {
  if (!isPortableOperations(operations))
    throw new AprError(
      'APR_BROKER_PROTECTION_UNAVAILABLE',
      'Genuine stock system membership is required.',
      { recovery: 'Use the fixed portable system in the current admitted operation.' }
    );
  const context = await currentOperationAuthorityContext();
  if (signal !== context.signal || deadline !== context.deadline)
    throw new AprError('APR_BROKER_PROTECTION_UNAVAILABLE', 'Protected-root context changed.', {
      recovery: 'Retain the original admitted startup operation.',
    });
  await assertPortableOperationsContext(operations, context);
  let missing = false;
  try {
    await lstat(root);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    missing = true;
  }
  const receipt = missing
    ? await performCurrentOperationEffect(() => provisionProtectedRoot({ root, ...context }))
    : await operations.observeProtection({ root });
  await assertPortableOperationsContext(operations, context);
  return receipt;
}
