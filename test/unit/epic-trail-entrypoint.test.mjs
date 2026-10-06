import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

test('declared epic DoD verifier delegates to the installed AITM command', () => {
  const entrypoint = fileURLToPath(
    new URL('../../scripts/task-tracker/verify-epic-trail.mjs', import.meta.url)
  );
  const result = spawnSync(process.execPath, [entrypoint, '--unrecognized'], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /verify-epic-trail: unknown flag\(s\): --unrecognized/);
});
