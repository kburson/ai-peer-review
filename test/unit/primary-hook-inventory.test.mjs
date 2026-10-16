// @story #190
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { inspectPrimaryReviewInventory } from '../../src/config/primary-inventory.mjs';
import { discoverAuthorityRepository } from '../../src/git/repository.mjs';

function fixture(t) {
  const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'apr-hook-inventory-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-b', 'trunk', root], { stdio: 'ignore' });
  const location = discoverAuthorityRepository(root);
  const directory = path.join(location.root, '.scratch', 'peer-review', 'codex-hooks');
  mkdirSync(directory, { recursive: true });
  const file = path.join(directory, 'a'.repeat(32) + '.json');
  const record = {
    schema: 'ai-peer-review.codex-hook/v1',
    source: 'official-exact-session',
    source_version: '0.4.1',
    observed_at: '2026-10-11T12:00:00.000Z',
    provider: 'openai',
    host: 'codex',
    model_id: 'gpt-6-astra',
    session_id: 'session-one',
    turn_id: 'turn-one',
    tool_use_id: 'call-one',
    command: 'npx --no-install peer-review start /artifact --issue 40',
    phase: 'tool-use',
    runtime_session_id: null,
    tool_name: 'Bash',
    code_mode_commands: null,
  };
  const write = () => writeFileSync(file, JSON.stringify(record), { mode: 0o600 });
  write();
  return {
    file,
    record,
    write,
    inspect: () => inspectPrimaryReviewInventory(location.commonDir, location.root),
  };
}

test('inventories historical extended Bash observations as unchanged evidence', async (t) => {
  const fx = fixture(t);
  const before = readFileSync(fx.file);
  const result = await fx.inspect();
  assert.deepEqual(readFileSync(fx.file), before);
  assert.deepEqual(result.reviews, []);
  fx.record.observed_at = '2026-10-11T12:01:00.000Z';
  fx.write();
  assert.notEqual((await fx.inspect()).digest, result.digest);
});

test('unknown historical shapes and nullable-field misuse still refuse inventory', async (t) => {
  for (const change of ['unknown', 'tool', 'runtime', 'commands', 'model', 'command']) {
    await t.test(change, async (t) => {
      const fx = fixture(t);
      if (change === 'unknown') fx.record.extra = 'unrecognized';
      if (change === 'tool') fx.record.tool_name = 'code_mode';
      if (change === 'runtime') fx.record.runtime_session_id = 42;
      if (change === 'commands') fx.record.code_mode_commands = ['peer-review join /other'];
      if (change === 'model') fx.record.model_id = null;
      if (change === 'command') fx.record.command = 'npx --no-install peer-review abandon /other';
      fx.write();
      const before = readFileSync(fx.file);
      await assert.rejects(fx.inspect, {
        code: 'APR_PRIMARY_AUTHORITY_UNAVAILABLE',
        message: 'Hook observation has an unknown or malformed record.',
      });
      assert.deepEqual(readFileSync(fx.file), before);
    });
  }
});
