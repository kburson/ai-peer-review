// @story #189
// Actual subprocess passthrough controls, never installed-source admission.
import assert from 'node:assert/strict';
import test from 'node:test';
import { execFile, ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
await import('../helpers/windows-authority-trace.mjs');
test('stock timing tap keeps callback inputs/results and the actual child handle', async () => {
  const args = ['-e', "process.stdout.write('callback-ok')"];
  const options = { encoding: 'utf8', timeout: 2000, shell: false };
  let child;
  const result = await new Promise((resolve, reject) => {
    child = execFile(process.execPath, args, options, (error, stdout, stderr) =>
      error ? reject(error) : resolve({ stdout, stderr })
    );
  });
  assert.ok(child instanceof ChildProcess);
  assert.ok(child.pid > 0);
  assert.deepEqual(result, { stdout: 'callback-ok', stderr: '' });
  assert.deepEqual(args, ['-e', "process.stdout.write('callback-ok')"]);
  assert.deepEqual(options, { encoding: 'utf8', timeout: 2000, shell: false });
});
test('stock timing tap preserves the original promisified result and child PID', async () => {
  const pending = promisify(execFile)(
    process.execPath,
    ['-e', "process.stdout.write('promise-ok')"],
    { encoding: 'utf8', timeout: 2000, shell: false }
  );
  assert.ok(pending.child instanceof ChildProcess);
  assert.ok(pending.child.pid > 0);
  assert.deepEqual(await pending, { stdout: 'promise-ok', stderr: '' });
});
test('stock timing tap reports bounded timeout facts without changing the actual failure', async () => {
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      './test/helpers/windows-authority-trace.mjs',
      '-e',
      `
    const {execFile}=require('node:child_process');
    const args=['-e','setInterval(()=>{},1000)'];
    const options={encoding:'utf8',timeout:100,shell:false};
    const child=execFile(process.execPath,args,options,(error)=>{
      console.log(JSON.stringify({killed:error.killed,signal:error.signal,code:error.code,pid:child.pid,timeout:options.timeout}));
    });
  `,
    ],
    { encoding: 'utf8', timeout: 5000 }
  );
  assert.equal(result.status, 0);
  const failure = JSON.parse(result.stdout);
  const report = JSON.parse(result.stderr.trim());
  assert.ok(failure.pid > 0);
  assert.equal(failure.timeout, 100);
  assert.equal(failure.killed, true);
  assert.equal(report.timeoutMs, 100);
  assert.equal(report.killed, failure.killed);
  assert.equal(report.signal, failure.signal);
  assert.equal(report.code, failure.code);
  assert.equal(report.outcome, 'refused');
  assert.equal(report.kind, 'other');
  assert.ok(!result.stderr.includes('setInterval'));
});
