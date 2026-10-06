// @story #102
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { run, statusReview } from '../../src/cli/run.mjs';
import { canonicalProjection } from '../../src/protocol/service.mjs';
import { reviewerTurnEvents } from '../helpers/review-fixture.mjs';
import { setupHostFixture } from '../helpers/setup-host-fixture.mjs';

test(
  'CLI status preserves the typed read result when primary policy becomes dirty',
  { skip: process.platform === 'win32' ? 'Native security fixture paused for #102/#107' : false },
  async (t) => {
    const f = await setupHostFixture(t);
    const originalUserInfo = os.userInfo;
    os.userInfo = (options) => ({ ...originalUserInfo(options), homedir: f.home });
    syncBuiltinESMExports();
    t.after(() => {
      os.userInfo = originalUserInfo;
      syncBuiltinESMExports();
    });
    await f.core.setup({ cwd: f.root, agents: ['grok'], confirmScratchExclude: true });
    f.git('add', '.');
    f.git('commit', '-m', 'activated policy');
    await f.core.activate({ cwd: f.root });
    const workspace = path.join(f.root, '.scratch/peer-review/review-01');
    mkdirSync(workspace, { recursive: true });
    const events = reviewerTurnEvents();
    const startup = events[0].payload.startup;
    startup.context.repository_root = f.root;
    startup.context_digest =
      'sha256:' + createHash('sha256').update(canonicalProjection(startup.context)).digest('hex');
    writeFileSync(
      path.join(workspace, 'events.jsonl'),
      events.map(JSON.stringify).join('\n') + '\n'
    );
    const invoke = async () => {
      let stdout = '';
      let stderr = '';
      const code = await run(['status', workspace, '--json'], {
        cwd: f.root,
        env: {},
        stdout: { write: (value) => (stdout += value) },
        stderr: { write: (value) => (stderr += value) },
      });
      return { code, stdout, stderr };
    };
    const clean = await invoke();
    assert.equal(clean.code, 0, clean.stderr);
    const expected = JSON.parse(clean.stdout);
    assert.equal(expected.schema, 'ai-peer-review.cli-result/v1');
    assert.equal(clean.stderr, '');
    const policy = path.join(f.root, '.ai-peer-review/config.json');
    writeFileSync(policy, readFileSync(policy, 'utf8') + ' ');
    assert.equal(statusReview(workspace).schema, 'ai-peer-review.cli-result/v1');
    const dirty = await invoke();
    assert.equal(dirty.code, 0, dirty.stderr);
    assert.deepEqual(JSON.parse(dirty.stdout), expected);
    assert.equal(JSON.parse(dirty.stderr).code, 'APR_PRIMARY_AUTHORITY_UNAVAILABLE');
  }
);
