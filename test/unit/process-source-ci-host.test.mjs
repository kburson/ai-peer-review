// @story #170
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
test('CI clock controls refuse caller authorization and ordinary hosts before clock effects', async () => {
  let host;
  try {
    host = await import('../helpers/process-source-ci-host.mjs');
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  }
  assert.equal(typeof host?.initializeCiClockHost, 'function');
  await assert.rejects(
    () => host.initializeCiClockHost({ authorized: true, clock: () => 0 }),
    /ci-clock-options/
  );
  const url = new URL('../helpers/process-source-ci-host.mjs', import.meta.url).href;
  const env = { ...process.env };
  delete env.GITHUB_ACTIONS;
  delete env.GITHUB_RUN_ID;
  delete env.GITHUB_WORKFLOW;
  const child = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      'const m=await import(' +
        JSON.stringify(url) +
        '); try {await m.initializeCiClockHost(); process.exitCode=2;} catch(e) {process.stdout.write(e.message);}',
    ],
    { env, encoding: 'utf8', timeout: 5000 }
  );
  assert.equal(child.status, 0);
  assert.equal(child.stdout, 'ci-clock-host-unavailable');
  assert.equal(child.stderr, '');
});
