// @story #190
// Independent comparison frontend: only the existing optional core scope port differs.
// It never rewrites installed source, account/protection ports, signals or clocks.
import { readFileSync, writeFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { userInfo } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { startSelectionAttribution } from './selection-attribution.mjs';
import { summarizeScopeOperation } from './selection-scope-operation-report.mjs';
const mode = process.env.APR_SCOPE_MODE,
  operation = process.env.APR_SCOPE_OPERATION;
if (
  process.argv.length !== 2 ||
  process.platform !== 'linux' ||
  process.env.GITHUB_ACTIONS !== 'true' ||
  process.env.GITHUB_WORKFLOW !== 'Selection scope operation comparison' ||
  process.env.GITHUB_REPOSITORY !== 'kburson/ai-peer-review' ||
  process.env.RUNNER_ENVIRONMENT !== 'github-hosted' ||
  !['scoped', 'unscoped'].includes(mode) ||
  !['register', 'activate'].includes(operation) ||
  process.env.NODE_OPTIONS ||
  !path.isAbsolute(process.env.NODE_V8_COVERAGE ?? '') ||
  process.env.NODE_V8_COVERAGE !== process.env.APR_SCOPE_PRIVATE_COVERAGE
)
  throw Error('scope-comparison-host-unavailable');
const root = process.env.APR_SCOPE_INSTALLED_ROOT,
  project = process.env.APR_SCOPE_PROJECT,
  output = process.env.APR_SCOPE_REPORT;
if (![root, project, output].every((value) => typeof value === 'string' && path.isAbsolute(value)))
  throw Error('scope-comparison-private-input-unavailable');
const imported = (relative) => import(pathToFileURL(path.join(root, relative)).href);
const runtime = await imported('src/config/runtime-selection.mjs');
const { createPrimaryMaintenanceCore } = await imported('src/config/primary-maintenance.mjs');
const admission = await imported('src/config/primary-admission.mjs');
const { INTEGRATION_CONTRACT } = await imported('src/config/integration-assets.mjs');
const home = userInfo().homedir;
const selectionDirectory = path.join(home, '.config/ai-peer-review');
const targets = [],
  sources = {};
for (const [relative, marker, variable, kind] of [
  [
    'src/config/runtime-selection-core.mjs',
    'const context = budget(input);',
    'context',
    'selection',
  ],
  ['src/config/primary-maintenance.mjs', 'await admit(original);', 'original', 'original'],
]) {
  const absolute = path.join(root, relative),
    text = readFileSync(absolute, 'utf8');
  const at = kind === 'original' ? text.lastIndexOf(marker) : text.indexOf(marker);
  if (at < 0) throw Error('scope-comparison-source-target-unavailable');
  sources[relative] = createHash('sha256').update(text).digest('hex');
  targets.push({
    kind,
    variable,
    url: pathToFileURL(absolute).href,
    lineNumber: text.slice(0, at).split('\n').length - (kind === 'original' ? 1 : 0),
  });
}
const observer = await startSelectionAttribution(targets),
  opened = [],
  originalOpen = fs.open;
let freshSnapshots = 0,
  operationExitObserved = false,
  operationError = null;
fs.open = function (...args) {
  const stack = new Error().stack;
  const acquisition = args[0] === selectionDirectory && /\bat openProtectedRoot \(/.test(stack);
  if (
    args[0] === path.join(selectionDirectory, 'runtime-selection.json') &&
    /\bat readObserved \(/.test(stack)
  )
    freshSnapshots++;
  const pending = Reflect.apply(originalOpen, this, args);
  if (acquisition)
    pending.then(
      (handle) => {
        opened.push(handle);
      },
      () => {}
    );
  return pending;
};
syncBuiltinESMExports();
try {
  const core = createPrimaryMaintenanceCore({
    packageRoot: root,
    home,
    admit: runtime.assertSelectedRuntime,
    integrationContract: INTEGRATION_CONTRACT,
    admission: {
      run: admission.withPrimaryAdmissionFence,
      assert: admission.assertPrimaryAdmissionFence,
    },
    ...(mode === 'scoped' ? { selectionScope: runtime.withSelectionReadScope } : {}),
  });
  await core[operation]({ cwd: project });
  operationExitObserved = true;
} catch (error) {
  operationError = /^APR_[A-Z0-9_]+$/.test(error?.code ?? '') ? error.code : 'unclassified-refusal';
  // Retain raw failure privately; upload only the closed projection below.
  writeFileSync(output + '.private-error', String(error?.stack ?? error), {
    flag: 'wx',
    mode: 0o600,
  });
} finally {
  fs.open = originalOpen;
  syncBuiltinESMExports();
}
let trace;
try {
  trace = await observer.close();
} catch {
  trace = {
    verified: false,
    operationalAuthority: 'unavailable',
    observerExitObserved: false,
    unavailable: 1,
    observations: [],
  };
}
const report = summarizeScopeOperation(
  {
    ...trace,
    acquisitions: opened.length,
    freshSnapshots,
    descriptorsClosed: opened.filter((handle) => handle.fd === -1).length,
    operationExitObserved,
  },
  mode
);
writeFileSync(
  output,
  JSON.stringify(
    {
      schema: 'ai-peer-review.selection-scope-comparison/v1',
      ...report,
      operation,
      sources,
      operationError,
      classification: operationExitObserved
        ? report.comparisonMatched
          ? 'matched'
          : 'failed-prediction'
        : 'inconclusive',
      currentSourceAdmissionObserved: operationExitObserved,
      fixtureCleanup: 'unproved',
      observations: trace.observations,
    },
    null,
    2
  ) + '\n',
  { flag: 'wx', mode: 0o600 }
);
if (!report.comparisonMatched) process.exitCode = 1;
