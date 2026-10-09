import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { run } from '../helpers/operations-api.mjs';

function io(buildBrokerSecurity) {
  const stdout = [];
  const stderr = [];
  return {
    cwd: path.dirname(path.dirname(import.meta.dirname)),
    env: {},
    stdout: { write: (value) => stdout.push(String(value)) },
    stderr: { write: (value) => stderr.push(String(value)) },
    stdoutBytes: stdout,
    stderrBytes: stderr,
    buildBrokerSecurity,
  };
}

test('portable CLI refuses broker builds before invoking any injected compiler', async () => {
  let calls = 0;
  const output = io(async () => {
    calls += 1;
    return { stdout: 'built' };
  });
  assert.equal(await run(['build', 'broker-security'], output), 2);
  assert.equal(calls, 0);
  assert.equal(output.stdoutBytes.join(''), '');
  assert.equal(JSON.parse(output.stderrBytes.at(-1)).code, 'APR_USAGE');
});
