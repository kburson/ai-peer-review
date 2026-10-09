// @story #140
import path from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { LANES, fail, sha256, captureCommand, projectState } from './receipt.mjs';

const [lane, ...extra] = process.argv.slice(2);
if (!LANES[lane] || extra.length || process.env.GITHUB_ACTIONS !== 'true')
  fail('usage: CI only: node scripts/ci/record-tests.mjs <lane>');
const before = projectState();
const identity = {
  repository: process.env.GITHUB_REPOSITORY,
  sourceHead: process.env.APR_CI_SOURCE_HEAD,
  testedCommit: before.head,
  runId: process.env.GITHUB_RUN_ID,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT,
  jobKey: process.env.APR_CI_JOB_KEY,
  matrixNode: process.env.APR_CI_MATRIX_NODE,
  runnerOS: process.env.RUNNER_OS,
};
if (
  !/^[a-f0-9]{40}$/.test(identity.sourceHead ?? '') ||
  !/^[1-9]\d*$/.test(identity.runId ?? '') ||
  !/^[1-9]\d*$/.test(identity.runAttempt ?? '') ||
  !/^[a-z0-9-]+$/.test(identity.jobKey ?? '') ||
  identity.repository !== 'kburson/ai-peer-review'
)
  fail('CI identity');
const [command, ...args] = LANES[lane].command;
const result = captureCommand(command, args);
const dir = path.resolve('.scratch/ci-results');
mkdirSync(dir, { recursive: true });
writeFileSync(path.join(dir, lane + '.log'), result.output, { flag: 'wx' });
const { output, ...execution } = result;
writeFileSync(
  path.join(dir, lane + '.json'),
  JSON.stringify(
    {
      schema: 'apr.ci-test-lane/v1',
      lane,
      ...identity,
      command: LANES[lane].command,
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      fingerprint: before.fingerprint,
      inventory: before.inventories[lane],
      ...execution,
      logSha256: sha256(output),
    },
    null,
    2
  ) + '\n',
  { flag: 'wx' }
);
process.stdout.write(output);
if (result.exitCode === 0 && !isDeepStrictEqual(before, projectState()))
  fail('source changed during execution');
process.exitCode = result.exitCode ?? 1;
