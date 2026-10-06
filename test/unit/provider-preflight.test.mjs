import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildClaudeProviderCapability } from '../../src/config/load.mjs';
import { preflightReviewerExecution } from '../../src/provider/preflight.mjs';

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'apr-provider-preflight-'));
  const provider = path.join(root, 'claude');
  const node = path.join(root, 'node');
  const packageBin = path.join(root, 'peer-review.mjs');
  for (const file of [provider, node, packageBin]) writeFileSync(file, '#!/bin/false\n');
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { root, provider, node, packageBin };
}

function contract(fx) {
  return {
    schema: 'ai-peer-review.execution-contract/v1',
    review_id: 'review-01',
    repository_root: fx.root,
    workspace: path.join(fx.root, 'workspace'),
    invitation: path.join(fx.root, 'invitation.md'),
    response: path.join(fx.root, 'reviewer-response-1.md'),
    artifact: path.join(fx.root, 'artifact.md'),
    commands: {
      join: {
        file: fx.node,
        args: [fx.packageBin, 'join', path.join(fx.root, 'invitation.md')],
        shell: false,
      },
      submit: {
        file: fx.node,
        args: [fx.packageBin, 'submit', path.join(fx.root, 'workspace')],
        shell: false,
      },
    },
  };
}

function capability(fx) {
  return buildClaudeProviderCapability({ executable: fx.provider });
}

test('preflight resolves exact regular executables, probes without a shell, and emits name-only environment receipts', async (t) => {
  const fx = fixture(t);
  const calls = [];
  const result = await preflightReviewerExecution({
    contract: contract(fx),
    capability: capability(fx),
    env: {
      HOME: '/home/reviewer',
      PATH: '/provider/subprocess/path',
      ANTHROPIC_API_KEY: 'secret-value',
      CLAUDE_SESSION_ID: 'must-not-leak',
      ARBITRARY_INJECTED: 'must-not-leak',
    },
    async execFile(file, args, options) {
      calls.push({ file, args, options });
      return { stdout: '2.4.1 (Claude Code)\n', stderr: '' };
    },
  });

  assert.equal(result.status, 'ready');
  assert.deepEqual(calls, [
    {
      file: fx.provider,
      args: ['--version'],
      options: {
        shell: false,
        encoding: 'utf8',
        env: {
          ANTHROPIC_API_KEY: 'secret-value',
          HOME: '/home/reviewer',
          PATH: '/provider/subprocess/path',
        },
      },
    },
  ]);
  assert.deepEqual(result.environment.allowed_names, ['ANTHROPIC_API_KEY', 'HOME', 'PATH']);
  assert.deepEqual(result.environment.removed_names, ['ARBITRARY_INJECTED', 'CLAUDE_SESSION_ID']);
  assert.doesNotMatch(JSON.stringify(result), /secret-value|must-not-leak/);
  assert.deepEqual(result.child_environment, {
    ANTHROPIC_API_KEY: 'secret-value',
    HOME: '/home/reviewer',
    PATH: '/provider/subprocess/path',
  });
});

test('preflight rejects version skew, unsafe symlinks, enterprise modes, and unrepresentable permissions before dispatch', async (t) => {
  const fx = fixture(t);
  let probes = 0;
  await assert.rejects(
    preflightReviewerExecution({
      contract: contract(fx),
      capability: capability(fx),
      env: {},
      async execFile() {
        probes += 1;
        return { stdout: '1.9.9\n' };
      },
    }),
    (error) => error.code === 'APR_PROVIDER_VERSION_INCOMPATIBLE'
  );

  const link = path.join(fx.root, 'claude-link');
  symlinkSync(fx.provider, link);
  await assert.rejects(
    preflightReviewerExecution({
      contract: contract(fx),
      capability: { ...capability(fx), executable: link },
      env: {},
      execFile: async () => ({ stdout: '2.4.1\n' }),
    }),
    (error) => error.code === 'APR_PROVIDER_EXECUTABLE_UNSAFE'
  );

  await assert.rejects(
    preflightReviewerExecution({
      contract: contract(fx),
      capability: capability(fx),
      env: { CLAUDE_CODE_USE_BEDROCK: '1' },
      execFile: async () => ({ stdout: '2.4.1\n' }),
    }),
    (error) => error.code === 'APR_ENVIRONMENT_INVALID'
  );

  await assert.rejects(
    preflightReviewerExecution({
      contract: {
        ...contract(fx),
        response: path.join(fx.root, 'reviewer-response?.md'),
      },
      capability: capability(fx),
      env: {},
      execFile: async () => ({ stdout: '2.4.1\n' }),
    }),
    (error) => error.code === 'APR_PERMISSION_UNREPRESENTABLE'
  );
  assert.equal(probes, 1);
});
