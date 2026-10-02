// @story #134
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCommand } from '../../src/cli/parse.mjs';
test('primary maintenance grammar is explicit and cannot select a foreign primary', () => {
  assert.equal(parseCommand(['primary', 'register', '--dry-run']).command, 'primary');
  assert.equal(parseCommand(['primary', 'activate', '--dry-run']).options.dryRun, true);
  assert.throws(() => parseCommand(['primary', 'activate', '--primary', 'foreign']));
  assert.throws(() => parseCommand(['primary', 'activate', '--force']));
});

test('source primary maintenance dispatch refuses runtime authority before writing', async (t) => {
  const { setupHostFixture } = await import('../helpers/setup-host-fixture.mjs');
  const f = await setupHostFixture(t);
  const { run } = await import('../../src/cli/run.mjs');
  const out = [],
    errors = [];
  const result = await run(['primary', 'register', '--dry-run', '--json'], {
    cwd: f.root,
    env: {},
    stdout: { write: (value) => out.push(value) },
    stderr: { write: (value) => errors.push(value) },
  });
  assert.equal(result, 1);
  assert.match(errors.join(''), /APR_RUNTIME_/);
  assert.equal(out.length, 0);
});
