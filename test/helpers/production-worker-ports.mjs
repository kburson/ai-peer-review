// @story #189
// Isolated unverified source harness: replace only lower authority/stock ports.
// Main ownership membership remains genuine; this cannot enroll any production worker.
import { readFileSync } from 'node:fs';
const asModule = (source) =>
  'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
export async function productionWorkerPortFixture() {
  const shimUrl = asModule(`
    export const state = { authority: 0, stock: 0 };
    const context = { signal: new AbortController().signal, deadline: performance.now() + 30000 };
    export async function withOperationAuthority(_input, operation) { state.authority++; return operation(); }
    export async function performCurrentOperationEffect(operation) { return operation(); }
    export async function currentOperationAuthorityContext() { return context; }
    export async function initializePortableOperations() { state.stock++; return {}; }
  `);
  const url = new URL('../../src/broker/worker-factory.mjs', import.meta.url);
  let source = readFileSync(url, 'utf8').replace(
    /from '((?:\.\.?\/)[^']+)'/gu,
    (_all, target) => 'from ' + JSON.stringify(new URL(target, url).href)
  );
  source = source.replaceAll(
    JSON.stringify(new URL('../../src/startup/authority-fence.mjs', import.meta.url).href),
    JSON.stringify(shimUrl)
  );
  source = source.replaceAll(
    JSON.stringify(new URL('../../src/broker/portable-platform.mjs', import.meta.url).href),
    JSON.stringify(shimUrl)
  );
  const shim = await import(shimUrl);
  return { verified: false, api: await import(asModule(source)), state: shim.state };
}
