// @story #187
// Hosted baseline: portable unit cases execute on independently verified workers.
import { spawnSync } from 'node:child_process';
if (process.argv.length !== 2 || process.env.CI !== 'true' || process.env.GITHUB_ACTIONS !== 'true')
  throw Error('Expected hosted Windows baseline context');
for (const args of [['unit', '--exclude-portable-unit'], ['golden']]) {
  const result = spawnSync(process.execPath, ['test/helpers/run-suite.mjs', ...args], {
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0 || result.signal !== null) {
    process.exitCode = result.status || 1;
    break;
  }
}
