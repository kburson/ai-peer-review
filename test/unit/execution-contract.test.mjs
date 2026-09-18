import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildReviewerExecutionContract } from '../../src/provider/execution-contract.mjs';

function fixture(t) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'apr-execution-contract-')));
  const workspace = path.join(root, '.scratch', 'peer-review', 'review-01');
  mkdirSync(workspace, { recursive: true });
  const invitation = path.join(workspace, 'reviewer-invitation.md');
  const artifact = path.join(root, 'artifact.md');
  writeFileSync(invitation, 'invitation\n');
  writeFileSync(artifact, 'artifact\n');
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { root, workspace, invitation, artifact };
}

function authority(fx, { turns = 0, reviewer = null } = {}) {
  return {
    events: [],
    state: {
      protocol: {
        review_id: 'review-01',
        sequence: 3 + turns,
        revision: 2 + turns,
        state: 'reviewer-turn',
        current_actor: 'reviewer',
        turns_used: turns,
        artifact: { path: 'artifact.md' },
        startup: { context: { repository_root: fx.root } },
      },
      participants: { reviewer },
    },
  };
}

function commandPaths(root) {
  return {
    packageBin: path.join(root, 'opt', 'ai-peer-review', 'bin', 'peer-review.mjs'),
    nodeExecutable: path.join(root, 'opt', 'node', 'bin', 'node'),
  };
}

test('first-turn execution contract uses absolute Node/package argv and requires join', (t) => {
  const fx = fixture(t);
  const commands = commandPaths(path.parse(fx.root).root);
  const contract = buildReviewerExecutionContract({
    workspace: fx.workspace,
    host: 'claude',
    model: 'claude-opus-5',
    effort: 'high',
    inspectAuthority: () => authority(fx),
    ...commands,
  });

  assert.equal(contract.join_required, true);
  assert.equal(contract.response, path.join(fx.workspace, 'reviewer-response-1.md'));
  assert.deepEqual(contract.commands.join, {
    file: commands.nodeExecutable,
    args: [commands.packageBin, 'join', fx.invitation],
    shell: false,
  });
  assert.equal(contract.commands.submit.file, commands.nodeExecutable);
  assert.deepEqual(contract.commands.submit.args, [commands.packageBin, 'submit', fx.workspace]);
});

test('later-turn execution contract omits join and rotates to the current response', (t) => {
  const fx = fixture(t);
  const contract = buildReviewerExecutionContract({
    workspace: fx.workspace,
    host: 'claude',
    model: 'claude-opus-5',
    effort: 'medium',
    inspectAuthority: () =>
      authority(fx, {
        turns: 1,
        reviewer: { session_fingerprint: `sha256:${'b'.repeat(64)}` },
      }),
    ...commandPaths(path.parse(fx.root).root),
  });

  assert.equal(contract.join_required, false);
  assert.equal(contract.commands.join, null);
  assert.equal(contract.response, path.join(fx.workspace, 'reviewer-response-2.md'));
  assert.equal(contract.authority.sequence, 4);
  assert.equal(contract.authority.revision, 3);
});

test('invitation is collateral only and cannot override event-derived workspace routing', (t) => {
  const fx = fixture(t);
  const outside = path.join(fx.root, 'other-invitation.md');
  writeFileSync(outside, 'stale invitation\n');
  const contract = buildReviewerExecutionContract({
    workspace: fx.workspace,
    invitation: outside,
    host: 'claude',
    model: 'claude-opus-5',
    effort: 'low',
    inspectAuthority: () => authority(fx),
    ...commandPaths(path.parse(fx.root).root),
  });
  assert.equal(contract.invitation, fx.invitation);
  assert.notEqual(contract.invitation, outside);
});
