// @story #198
// Producer executes only the actual declared test commands in hosted CI.
import { execFileSync } from 'node:child_process';
import { mkdirSync, openSync, closeSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { runNpm } from '../../test/helpers/npm-command.mjs';
import { receiptCommands as commands } from './receipt-core.mjs';
const lane = process.argv[2];
if (
  process.argv.length !== 3 ||
  !commands[lane] ||
  process.env.GITHUB_ACTIONS !== 'true' ||
  process.env.RUNNER_ENVIRONMENT !== 'github-hosted' ||
  process.env.GITHUB_REPOSITORY !== 'kburson/ai-peer-review' ||
  !['node-24', 'preferred-node', 'phase-2-boundary'].includes(process.env.GITHUB_JOB)
)
  throw Error('receipt-host-unavailable');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const sourceHead = event.pull_request?.head.sha ?? process.env.GITHUB_SHA;
const testedHead = git('rev-parse', 'HEAD'),
  testedTree = git('rev-parse', 'HEAD^{tree}');
if (testedHead !== process.env.GITHUB_SHA || !/^[0-9a-f]{40}$/.test(sourceHead))
  throw Error('receipt-source-unavailable');
const dir = path.join('.scratch', 'ci-command-receipts');
mkdirSync(dir, { recursive: true });
const logFile = path.join(dir, lane + '.log'),
  fd = openSync(logFile, 'wx');
let exitCode = 0,
  signal = null;
try {
  runNpm('npm', commands[lane], { stdio: ['ignore', fd, fd], timeout: 800000 });
} catch (error) {
  exitCode = error.status ?? null;
  signal = error.signal ?? null;
} finally {
  closeSync(fd);
}
const log = readFileSync(logFile);
const record = {
  schema: 'ai-peer-review.ci-command-receipt/v1',
  repository: process.env.GITHUB_REPOSITORY,
  sourceHead,
  testedHead,
  testedTree,
  runId: process.env.GITHUB_RUN_ID,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT,
  job: process.env.GITHUB_JOB,
  platform: process.platform,
  node: process.versions.node,
  command: 'npm ' + commands[lane].join(' '),
  exitCode,
  signal,
  logSha256: createHash('sha256').update(log).digest('hex'),
};
writeFileSync(path.join(dir, lane + '.json'), JSON.stringify(record, null, 2) + '\n', {
  flag: 'wx',
});
console.log(log.toString('utf8').split(/\r?\n/).slice(-24).join('\n'));
console.log(JSON.stringify(record));
process.exitCode = exitCode === 0 && signal === null ? 0 : 1;
