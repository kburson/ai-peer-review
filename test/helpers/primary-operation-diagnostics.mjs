// @story #209
// Diagnostic only: reuse the unchanged 800000ms host ceiling; no acceptance receipt.
import { mkdirSync, writeFileSync } from 'node:fs';
import { captureCommand } from '../../scripts/ci/receipt.mjs';
const scope = process.env.APR_PRIMARY_DIAGNOSTIC_SCOPE ?? 'focused';
if (!['focused', 'file'].includes(scope)) throw Error('Unsupported diagnostic scope');
const result = captureCommand(process.execPath, [
  '--test',
  ...(scope === 'focused'
    ? ['--test-name-pattern=actual activation preserves|committed activation retains']
    : []),
  'test/unit/primary-operation-core.test.mjs',
]);
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
