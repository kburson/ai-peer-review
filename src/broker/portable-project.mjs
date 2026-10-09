// @story #189
import { initializePortableOperations } from './portable-platform.mjs';
import { canonicalPortableProjectIdentity } from './identity.mjs';
import {
  currentOperationAuthorityContext,
  assertCurrentOperationAuthority,
} from '../startup/authority-fence.mjs';
export async function observePortableProject({ cwd }) {
  const context = await currentOperationAuthorityContext();
  const operations = await initializePortableOperations(context);
  const project = await canonicalPortableProjectIdentity({ cwd, operations, ...context });
  await assertCurrentOperationAuthority();
  return project;
}
export async function observeReadOnlyPortableProject({ cwd }) {
  const context = Object.freeze({
    signal: new AbortController().signal,
    deadline: performance.now() + 30000,
  });
  const operations = await initializePortableOperations(context);
  return await canonicalPortableProjectIdentity({ cwd, operations, ...context });
}
export async function inspectPortableBrokerSupport({ cwd }) {
  const context = Object.freeze({
    signal: new AbortController().signal,
    deadline: performance.now() + 30000,
  });
  try {
    const operations = await initializePortableOperations(context);
    await canonicalPortableProjectIdentity({ cwd, operations, ...context });
    const { isInstalledProcessSourceAssurance } =
      await import('../protocol/process-source-assurance.mjs');
    const source = await operations.observeSource();
    return Object.freeze({
      healthy: isInstalledProcessSourceAssurance(source),
      substrate: 'node-http',
      reason: isInstalledProcessSourceAssurance(source)
        ? 'source-accepted'
        : 'source-class-unavailable',
    });
  } catch (error) {
    return Object.freeze({
      healthy: false,
      substrate: 'node-http',
      reason: error.details?.reason ?? 'stock-support-unavailable',
    });
  }
}
