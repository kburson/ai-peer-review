import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
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

test('installed npx wake commands have exact grants without permitting other workspaces or flags', (t) => {
  const root = mkdtempSync(path.join(process.cwd(), '.scratch/test/wake npx '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const packageRoot = path.join(root, 'node_modules/@kburson/ai-peer-review');
  mkdirSync(path.join(packageRoot, 'bin'), { recursive: true });
  writeFileSync(
    path.join(packageRoot, 'package.json'),
    JSON.stringify({
      name: '@kburson/ai-peer-review',
      version: '0.3.0',
      bin: { 'peer-review': './bin/peer-review.mjs' },
    })
  );
  writeFileSync(path.join(packageRoot, 'bin/peer-review.mjs'), '');
  const workspace = path.join(root, 'workspace');
  const state = {
    protocol: {
      current_actor: 'author',
      artifact: { path: 'artifact.md' },
      startup: { context: { repository_root: root } },
    },
  };
  const status = { paths: { response: path.join(root, 'author-response-1.md') } };
  const input = { workspace, role: 'author', state, status };
  assert.ok(
    !buildClaudeWakePermissions(input).some((rule) => rule.startsWith('Bash(npx ')),
    'manifest alone does not prove npm bin resolution'
  );
  const binDir = path.join(root, 'node_modules/.bin');
  mkdirSync(binDir);
  const shim = path.join(binDir, process.platform === 'win32' ? 'peer-review.cmd' : 'peer-review');
  if (process.platform === 'win32') writeFileSync(shim, '"%dp0%\\..\\wrong.mjs" %*');
  else symlinkSync(path.join(packageRoot, 'package.json'), shim);
  assert.ok(
    !buildClaudeWakePermissions(input).some((rule) => rule.startsWith('Bash(npx ')),
    'a stale or colliding bin is not the installed package'
  );
  rmSync(shim);
  if (process.platform === 'win32')
    writeFileSync(shim, '"%dp0%\\..\\@kburson\\ai-peer-review\\bin\\peer-review.mjs" %*');
  else symlinkSync(path.join(packageRoot, 'bin/peer-review.mjs'), shim);
  const rules = buildClaudeWakePermissions(input);
  const portable = workspace.replaceAll('\\', '/');
  assert.ok(rules.includes(`Bash(npx peer-review resume '${portable}')`));
  assert.ok(rules.includes(`Bash(npx --no-install peer-review submit '${portable}')`));
  assert.ok(
    rules.includes(
      `Bash(npx peer-review submit '${portable}' --no-artifact-change --reason 'No artifact change is required for this response.')`
    )
  );
  assert.ok(!rules.includes(`Bash(npx peer-review resume '${portable}-neighbor')`));
  assert.ok(!rules.some((rule) => rule.includes('*') || rule === 'Bash(npx:*)'));
  rmSync(path.join(root, 'node_modules'), { recursive: true });
  assert.ok(
    !buildClaudeWakePermissions({ workspace, role: 'author', state, status }).some((rule) =>
      rule.startsWith('Bash(npx ')
    ),
    'no npx fallback without the project-local installed package'
  );
});
