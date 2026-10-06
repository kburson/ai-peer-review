import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { run } from '../../src/cli/run.mjs';

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

test('build broker-security derives the Node root and runs before project setup checks', async () => {
  let invocation;
  const output = io(async (input) => {
    invocation = input;
    return { stdout: 'Built broker security.\n' };
  });
  assert.equal(await run(['build', 'broker-security'], output), 0, output.stderrBytes.join(''));
  assert.equal(invocation.nodeExecutable, process.execPath);
  assert.equal(invocation.nodeRoot, path.dirname(path.dirname(process.execPath)));
  assert.equal(path.basename(invocation.script), 'build-broker-security.mjs');
  assert.equal(path.basename(path.dirname(invocation.script)), 'scripts');
  assert.equal(output.stdoutBytes.join(''), 'Built broker security.\n');
});

test('build broker-security reports compiler failures without claiming success', async () => {
  const output = io(async () => {
    throw Object.assign(new Error('missing compiler'), { stderr: 'missing compiler' });
  });
  assert.equal(await run(['build', 'broker-security'], output), 1);
  const error = JSON.parse(output.stderrBytes.at(-1));
  assert.equal(error.code, 'APR_BROKER_BUILD_FAILED');
  assert.match(error.details.reason, /missing compiler/);
});
