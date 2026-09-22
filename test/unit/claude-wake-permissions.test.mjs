import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  buildClaudeWakePermissions,
  encodeClaudeEditRule,
} from '../../src/provider/claude-launch.mjs';
import {
  withoutProviderIdentity,
  PROVIDER_IDENTITY_ENVIRONMENT_KEYS,
} from '../../src/provider/preflight.mjs';

test('provider children retain execution settings but no parent identity or hook tokens', () => {
  const inherited = Object.fromEntries(
    [...PROVIDER_IDENTITY_ENVIRONMENT_KEYS, 'APR_CLAUDE_HOOK_TOKEN', 'APR_CODEX_HOOK_TOKEN'].map(
      (key) => [key, 'parent-only']
    )
  );
  const settings = { PATH: '/fixture', APR_PROVIDER_DEADLINE_MS: '1234' };
  assert.deepEqual(withoutProviderIdentity({ ...inherited, ...settings }), settings);
  assert.equal(inherited.CODEX_THREAD_ID, 'parent-only');
});

test('wake permissions authorize only the current role response and exact package actions', (t) => {
  mkdirSync('.scratch/test', { recursive: true });
  const root = mkdtempSync(path.join(process.cwd(), '.scratch/test/wake-permissions-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const workspace = path.join(root, 'workspace');
  const artifact = path.join(root, 'artifact.md');
  const prior = path.join(root, 'reviewer-response-1.md');
  for (const role of ['author', 'reviewer']) {
    const response = path.join(root, `${role}-response-2.md`);
    const state = {
      protocol: {
        current_actor: role,
        artifact: { path: 'artifact.md' },
        startup: { context: { repository_root: root } },
      },
    };
    const status = { paths: { response } };
    const rules = buildClaudeWakePermissions({ workspace, role, state, status });
    assert.ok(rules.includes(encodeClaudeEditRule(response)));
    assert.equal(rules.includes(encodeClaudeEditRule(artifact)), role === 'author');
    assert.ok(!rules.includes(encodeClaudeEditRule(prior)));
    assert.ok(!rules.includes('Bash') && !rules.includes('Edit') && !rules.includes('Write'));
    assert.ok(rules.some((rule) => rule.startsWith('Bash(peer-review resume ')));
    assert.ok(rules.some((rule) => rule.startsWith('Bash(peer-review submit ')));
    assert.throws(
      () =>
        buildClaudeWakePermissions({
          workspace,
          role: role === 'author' ? 'reviewer' : 'author',
          state,
          status,
        }),
      { code: 'APR_CLAUDE_PERMISSION_INVALID' }
    );
  }
});

test('author finalization grants exact finalize and resume without response or artifact edits', () => {
  for (const action of ['finalize-acceptance', 'commit-acceptance', 'advance-phase-artifact']) {
    const rules = buildClaudeWakePermissions({
      workspace: '/fixture/workspace',
      role: 'author',
      state: { protocol: { current_actor: 'author' } },
      status: { paths: {}, next_action: { action } },
    });
    assert.ok(rules.some((rule) => rule.startsWith('Bash(peer-review resume ')));
    assert.equal(
      rules.some((rule) => rule.startsWith('Bash(peer-review finalize ')),
      action !== 'advance-phase-artifact'
    );
    assert.ok(!rules.some((rule) => /^(?:Edit|Write)\(/.test(rule)));
    assert.ok(
      !rules.some((rule) => rule.startsWith('Bash(peer-review advance ')),
      'an unbound next artifact grants no advance authority'
    );
  }
});
