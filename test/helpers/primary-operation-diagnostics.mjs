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
  ].includes(scope)
)
  throw Error('Unsupported diagnostic scope');
const result = captureCommand(
  process.execPath,
  scope === 'identity-lane'
    ? ['test/helpers/run-suite.mjs', 'unit', '--portable-unit-shard', 'identity']
    : ['contract-source', 'github-source'].includes(scope)
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
