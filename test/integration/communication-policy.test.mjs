import {
  fixtureObservation,
  fixtureSelection,
  fixtureStartupDeps,
} from '../helpers/internal-api.mjs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { joinReview, resumeReview, startReview } from '../../src/cli/run.mjs';
import { participantIdentity } from '../../src/identity/registry.mjs';
import { executeRecoveryWorkspaceCommand } from '../helpers/command-roundtrip.mjs';

const NOW = '2026-09-13T06:00:00.000Z';

function repositoryFixture(t, suffix) {
  const root = mkdtempSync(path.join(os.tmpdir(), `apr-communication-${suffix}-`));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '-b', 'trunk'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: root });
  mkdirSync(path.join(root, 'docs'));
  writeFileSync(path.join(root, 'docs/example.md'), '# Example\n');
  writeFileSync(path.join(root, '.git/info/exclude'), '.scratch/peer-review/\n');
  execFileSync('git', ['add', 'docs/example.md'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'fixture'], { cwd: root, stdio: 'ignore' });
  return root;
}

function identity(session, role = 'author') {
  return participantIdentity({
    role,
    host: 'codex',
    provider: 'openai',
    modelId: 'gpt-test',
    modelDisplay: 'GPT Test',
    sessionId: session,
    source: 'runtime',
    joinedAt: NOW,
  });
}

function historicInvitation(bytes) {
  const current = bytes.toString('utf8');
  const old = current
    .replace(
      /^<!-- ai-peer-review-template version="1" digest="sha256:[0-9a-f]{64}" -->/,
      '<!-- ai-peer-review-template version="1" digest="sha256:67647a97b95d0d88ad485fdc636134e56a7bf2688c4aab40d4acdfdcac1a98af" -->'
    )
    .replace(/^- Reviewer: .*\n- Runtime: .*\n/m, '')
    .replace(
      /## Project-local broker and recovery\n\n([\s\S]*?)\n\nRole: reviewer\./,
      `## Durable coordinator\n\nPhased sessions remain event-authoritative. After a non-final acceptance, the registered author finalizes and advances the exact next artifact; resume only from the generated reviewer response and never infer or skip a phase from chat.\n\nWhen the host reports that the durable coordinator is active, yield after each handoff. The coordinator sleeps outside participant context and wakes only the exact configured session for an actionable protocol revision; do not poll or repeat wait calls. If durable wake is unavailable, use only the bounded manual fallback \`peer-review status <workspace> --next\`.\n\nRole: reviewer.`
    );
  assert.notEqual(old, current);
  assert.match(old, /## Durable coordinator/);
  assert.doesNotMatch(old, /Project-local broker/);
  return Buffer.from(old);
}

test('an intact pre-upgrade sealed invitation joins without regenerating it', async (t) => {
  const root = repositoryFixture(t, 'historic-invitation');
  const input = {
    ...fixtureSelection('codex', 'gpt-test'),
    cwd: root,
    artifact: 'docs/example.md',
    artifactKind: 'spec',
    identity: identity('historic-author'),
    reviewId: 'review-historic-invitation',
    now: NOW,
  };
  const started = await startReview(input, fixtureStartupDeps);
  const oldBytes = historicInvitation(readFileSync(started.paths.reviewer_invitation));
  const lines = readFileSync(started.paths.events, 'utf8').trimEnd().split('\n');
  const created = JSON.parse(lines[0]);
  created.payload.startup.reviewer_invitation_digest = `sha256:${createHash('sha256').update(oldBytes).digest('hex')}`;
  lines[0] = JSON.stringify(created);
  writeFileSync(started.paths.events, `${lines.join('\n')}\n`);
  writeFileSync(started.paths.reviewer_invitation, oldBytes);
  const retried = await startReview(
    { ...input, runtime: created.payload.startup.runtime },
    { ...fixtureStartupDeps, validatedStartup: true }
  );
  assert.equal(retried.review_id, started.review_id);
  assert.deepEqual(readFileSync(started.paths.reviewer_invitation), oldBytes);
  const joined = await joinReview({
    cwd: root,
    invitation: started.paths.reviewer_invitation,
    identity: identity('historic-reviewer', 'reviewer'),
    runtimeObservation: fixtureObservation(),
    now: NOW,
  });
  assert.equal(joined.state, 'reviewer-turn');
  assert.deepEqual(readFileSync(started.paths.reviewer_invitation), oldBytes);
  writeFileSync(
    started.paths.reviewer_invitation,
    Buffer.concat([oldBytes, Buffer.from('tampered')])
  );
  await assert.rejects(
    joinReview({
      cwd: root,
      invitation: started.paths.reviewer_invitation,
      identity: identity('historic-reviewer', 'reviewer'),
      runtimeObservation: fixtureObservation(),
      now: NOW,
    }),
    { code: 'APR_INVITATION_INVALID' }
  );
});

function automaticObservation() {
  return {
    capability: 'live-wait',
    adapter_version: '2.0.0',
    lease: {
      schema: 'ai-peer-review.resident-lease/v1',
      process_instance_id: 'codex-process-01',
      pid: null,
      opaque_handle: 'codex:author-session',
      host: 'codex',
      adapter_version: '2.0.0',
      heartbeat_sequence: 1,
      observed_at: '2026-09-13T05:59:55.000Z',
      expires_at: '2026-09-13T06:00:30.000Z',
    },
  };
}

const MODES = [
  ['manual', {}],
  ['resume-only', { transportMode: 'resume-only', transportCapability: 'resume-only' }],
  [
    'automatic-required',
    { transportMode: 'automatic-required', transportObservation: automaticObservation() },
  ],
  ['no-commit', { noCommit: true, testHumanAuthority: 'communication-policy-fixture' }],
];

for (const [mode, options] of MODES) {
  test(`${mode} startup directs both participants to durable documents and keeps resume bounded`, async (t) => {
    const root = repositoryFixture(t, mode === 'manual' ? 'manual path' : mode);
    const started = await startReview(
      {
        ...fixtureSelection('codex', 'gpt-test'),
        cwd: root,
        artifact: 'docs/example.md',
        artifactKind: 'spec',
        identity: identity(`author-${mode}`),
        reviewId: `review-communication-${mode}`,
        now: NOW,
        ...options,
      },
      fixtureStartupDeps
    );
    assert.equal(started.review.runtime.reviewer.effort, 'medium');
    assert.equal(started.review.runtime.reviewer.model_id, 'gpt-test');
    assert.equal(started.review.runtime.classification, 'SPR');
    assert.equal(started.review.runtime.ownership, 'native');

    for (const file of [started.paths.author_startup, started.paths.reviewer_invitation]) {
      const bytes = readFileSync(file, 'utf8');
      assert.match(bytes, /Reviewer: `gpt-test` \(`gpt-test`\), effort: `medium`/);
      assert.match(bytes, /Runtime: SPR, provider-native/);
      assert.match(bytes, /## Communication policy \(v1\)/);
      assert.match(bytes, /do not rely on a chat summary/i);
      assert.match(bytes, /unless the human explicitly requests it/i);
      const reconcile = bytes.match(/run `(peer-review broker reconcile [^`]+)` only/);
      const bounded = bytes.match(/bounded `(peer-review status [^`]+)` recovery/);
      assert.ok(reconcile);
      assert.ok(bounded);
      assert.equal(executeRecoveryWorkspaceCommand(reconcile[1]), started.paths.workspace);
      assert.equal(executeRecoveryWorkspaceCommand(bounded[1]), started.paths.workspace);
    }

    const resumed = resumeReview(started.paths.workspace, { now: NOW });
    assert.equal(
      resumed.instructions,
      `Join from the exact sealed invitation: ${resumed.next_action.command}`
    );
    assert.doesNotMatch(resumed.instructions, /findings|dispositions|verification evidence/i);
  });
}
