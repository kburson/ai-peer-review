// @story #209
// Diagnostic only: reuse the unchanged 800000ms host ceiling; no acceptance receipt.
import { mkdirSync, writeFileSync } from 'node:fs';
import { captureCommand } from '../../scripts/ci/receipt.mjs';
const scope = process.env.APR_PRIMARY_DIAGNOSTIC_SCOPE ?? 'focused';
if (
  ![
    'focused',
    'file',
    'inventory',
    'preservation',
    'inventory-file',
    'preservation-file',
    'identity-lane',
    'contract-source',
    'github-source',
    'github-source-sampled',
    'github-source-no-telemetry',
    'acl-probe-comparison',
  ].includes(scope)
)
  throw Error('Unsupported diagnostic scope');
if (scope === 'github-source-sampled') {
  process.env.GH_TELEMETRY = 'enabled';
  process.env.GH_TELEMETRY_SAMPLE_RATE = '100';
}
if (scope === 'github-source-no-telemetry') process.env.GH_TELEMETRY = '0';
const result = captureCommand(
  process.execPath,
  scope === 'acl-probe-comparison'
    ? ['test/helpers/windows-probe-comparison.mjs']
    : scope === 'identity-lane'
      ? ['test/helpers/run-suite.mjs', 'unit', '--portable-unit-shard', 'identity']
      : scope === 'contract-source' || scope.startsWith('github-source')
        ? [
            '--test',
            ...(scope === 'contract-source'
              ? ['test/integration/runtime-contract-verification-input.test.mjs']
              : []),
            'test/integration/runtime-contract-github-source.test.mjs',
          ]
        : [
            '--test',
            ...(scope === 'focused'
              ? ['--test-name-pattern=actual activation preserves|committed activation retains']
              : scope === 'inventory'
                ? ['--test-name-pattern=fixed genuine-path inventory']
                : scope === 'preservation'
                  ? ['--test-name-pattern=genuine hold retains locks/review.lock$']
                  : []),
            scope.startsWith('inventory')
              ? 'test/unit/portable-reconciliation-inventory.test.mjs'
              : scope.startsWith('preservation')
                ? 'test/unit/portable-reconciliation-preservation.test.mjs'
                : 'test/unit/primary-operation-core.test.mjs',
          ]
);
const directory = '.scratch/209-primary-diagnostic/' + scope;
mkdirSync(directory, { recursive: true });
writeFileSync(directory + '/controls.log', result.output);
writeFileSync(
  directory + '/outcome.json',
  JSON.stringify({
    scope,
    verified: false,
    operationalAuthority: 'unavailable',
    sourceHead: process.env.GITHUB_SHA ?? null,
    exitCode: result.exitCode,
    signal: result.signal,
  }) + '\n'
);
process.stdout.write(result.output);
process.exitCode = result.exitCode ?? 1;
