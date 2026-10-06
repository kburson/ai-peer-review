import assert from 'node:assert/strict';
import test from 'node:test';
import { createClaudeStreamingExec } from '../../src/providers/claude-stream.mjs';

const args = (source) => ['--eval', source, '--', '--output-format', 'json'];
const recorder = { accept() {} };

test('expired or invalid provider deadline refuses to spawn', async () => {
  for (const deadline of ['bad', '0', String(Date.now() - 1)]) {
    let spawns = 0;
    const execute = createClaudeStreamingExec({
      recorder,
      spawnProcess() {
        spawns++;
      },
    });
    await assert.rejects(
      execute('unused', args(''), {
        env: { ...process.env, APR_PROVIDER_DEADLINE_MS: deadline },
      }),
      { code: 'APR_WAKE_OUTCOME_UNKNOWN' }
    );
    assert.equal(spawns, 0);
  }
});

test('one absolute deadline terminates a stalled provider even after terminal-looking output', async () => {
  const execute = createClaudeStreamingExec({ recorder });
  const deadline = Date.now() + 600;
  const env = { ...process.env, APR_PROVIDER_DEADLINE_MS: String(deadline) };
  await assert.rejects(
    execute(
      process.execPath,
      args(`
    console.log(JSON.stringify({type:'result',session_id:'fixture'}));
    setInterval(() => {}, 1000);
  `),
      { env }
    ),
    { code: 'APR_WAKE_OUTCOME_UNKNOWN' }
  );
  assert.ok(Date.now() - deadline < 3000);
  await assert.rejects(execute(process.execPath, args('process.exit(0)'), { env }), {
    code: 'APR_WAKE_OUTCOME_UNKNOWN',
  });
});

test('a completed provider clears its deadline and preserves its actual result', async () => {
  const execute = createClaudeStreamingExec({ recorder });
  const result = await execute(
    process.execPath,
    args(`
    console.log(JSON.stringify({type:'result',session_id:'fixture'}));
  `),
    { env: { ...process.env, APR_PROVIDER_DEADLINE_MS: String(Date.now() + 10_000) } }
  );
  assert.equal(result.exit_code, 0);
  assert.equal(JSON.parse(result.stdout).session_id, 'fixture');
});

test('owned process termination is idempotent and never signals after closure', async () => {
  const { EventEmitter } = await import('node:events');
  const { spawnProviderProcess } = await import('../../src/providers/process-lifetime.mjs');
  const child = new EventEmitter();
  child.pid = 12345;
  let signals = 0;
  child.kill = () => {
    signals++;
    child.emit('close', null);
  };
  const lifetime = spawnProviderProcess('unused', [], { env: {} }, () => child);
  await lifetime.stop();
  await lifetime.stop();
  assert.equal(signals, 1);
});
