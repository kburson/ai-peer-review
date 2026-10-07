// @story #175
import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

// Isolate filesystem fault schedules and retain every case in the declared
// verifier. Isolated processes bound probe overhead without weakening checks.
test(
  '[#175] retained publication and quarantine controls',
  { concurrency: process.platform === 'win32' ? 4 : 2 },
  async (t) => {
    await Promise.all(
      ['generations', 'quarantine', 'budget', 'faults'].map((group) =>
        t.test(group, async (child) => {
          const source = new URL('./owner-publication-cases/' + group + '.mjs', import.meta.url);
          const env = { ...process.env };
          delete env.NODE_TEST_CONTEXT;
          const processUnderTest = spawn(
            process.execPath,
            ['--test', '--test-reporter=tap', fileURLToPath(source)],
            { stdio: ['ignore', 'pipe', 'pipe'], env }
          );
          let stdout = '',
            stderr = '';
          processUnderTest.stdout.on('data', (bytes) => {
            stdout += bytes;
          });
          processUnderTest.stderr.on('data', (bytes) => {
            stderr += bytes;
          });
          const result = await new Promise((resolve, reject) => {
            processUnderTest.once('error', reject);
            processUnderTest.once('exit', (code, signal) => resolve({ code, signal }));
          });
          assert.match(stdout, /^# tests [1-9]\d*$/m, 'Child must report actual executed cases.');
          child.diagnostic(stdout);
          if (stderr) child.diagnostic(stderr);
          assert.equal(result.signal, null, stderr);
          assert.equal(result.code, 0, stdout + stderr);
        })
      )
    );
  }
);
