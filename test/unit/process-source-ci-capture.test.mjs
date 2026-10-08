// @story #170
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
test('hosted capture producer refuses ordinary hosts and approval override flags before effects', async () => {
  let capture;
  try {
    capture = await import('../helpers/process-source-ci-capture.mjs');
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  }
  assert.equal(typeof capture?.runCiSourceCapture, 'function');
  await assert.rejects(
    () => capture.runCiSourceCapture({ mode: 'prepare', accepted: true }),
    /ci-capture-options/
  );
  const env = { ...process.env };
  delete env.GITHUB_ACTIONS;
  delete env.GITHUB_WORKFLOW;
  delete env.GITHUB_RUN_ID;
  const url = new URL('../helpers/process-source-ci-capture.mjs', import.meta.url).href;
  const child = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      'const m=await import(' +
        JSON.stringify(url) +
        '); try {await m.runCiSourceCapture({mode:"prepare"});process.exitCode=2;}catch(e){process.stdout.write(e.message);}',
    ],
    { env, encoding: 'utf8', timeout: 5000 }
  );
  assert.equal(child.status, 0);
  assert.equal(child.stdout, 'ci-capture-host-unavailable');
  assert.equal(child.stderr, '');
});
