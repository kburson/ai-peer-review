import { execFile } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { promisify } from 'node:util';

import { buildClaudeProviderCapability } from '../../src/config/load.mjs';
import { buildClaudeReviewerLaunchFromExecution } from '../../src/provider/claude-launch.mjs';
import { buildReviewerExecutionContract } from '../../src/provider/execution-contract.mjs';
import { preflightReviewerExecution } from '../../src/provider/preflight.mjs';

const execute = promisify(execFile);

test('bootstrap preflight uses one non-model probe and passes only the closed child environment', async (t) => {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'apr-claude-bootstrap-')));
  const workspace = path.join(root, '.scratch', 'peer-review', 'review-bootstrap');
  const packageBin = path.join(root, 'bin', 'peer-review.mjs');
  mkdirSync(path.dirname(packageBin), { recursive: true });
  mkdirSync(workspace, { recursive: true });
  writeFileSync(path.join(workspace, 'reviewer-invitation.md'), 'invitation\n');
  writeFileSync(path.join(root, 'artifact.md'), 'artifact\n');
  writeFileSync(packageBin, '#!/usr/bin/env node\n');
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const contract = buildReviewerExecutionContract({
    workspace,
    host: 'claude',
    model: 'claude-opus-5',
    effort: 'high',
    packageBin,
    inspectAuthority: () => ({
      events: [],
      state: {
        protocol: {
          review_id: 'review-bootstrap',
          sequence: 1,
          revision: 1,
          state: 'reviewer-turn',
          current_actor: 'reviewer',
          turns_used: 0,
          artifact: { path: 'artifact.md' },
          startup: { context: { repository_root: root } },
        },
        participants: { reviewer: null },
      },
    }),
  });
  const capability = buildClaudeProviderCapability({
    executable: process.execPath,
  });
  let probes = 0;
  let modelDispatches = 0;
  const preflight = await preflightReviewerExecution({
    contract,
    capability,
    env: {
      HOME: root,
      PATH: process.env.PATH ?? '',
      ANTHROPIC_API_KEY: 'credential-value',
      CLAUDE_MODEL_ID: 'inherited-author-model',
      ARBITRARY_INJECTED: 'must-not-reach-child',
    },
    async execFile(file, args, options) {
      probes += 1;
      if (args.includes('-p')) modelDispatches += 1;
      return execute(file, args, options);
    },
  });
  const launch = buildClaudeReviewerLaunchFromExecution({ contract, preflight });

  assert.equal(probes, 1);
  assert.equal(modelDispatches, 0);
  assert.equal(launch.command.file, process.execPath);
  assert.equal(launch.environment.ARBITRARY_INJECTED, undefined);
  assert.equal(launch.environment.CLAUDE_MODEL_ID, undefined);
  assert.equal(launch.environment.ANTHROPIC_API_KEY, 'credential-value');
  assert.deepEqual(preflight.environment.removed_names, ['ARBITRARY_INJECTED', 'CLAUDE_MODEL_ID']);
  assert.doesNotMatch(JSON.stringify(preflight), /credential-value|inherited-author-model/);
});
