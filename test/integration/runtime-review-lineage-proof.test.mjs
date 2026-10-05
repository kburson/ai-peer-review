// @story #144
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { verifyRuntimeReviewLineage } from '../../scripts/lib/runtime-review-lineage-proof.mjs';
const r = {
  revision: 'a'.repeat(40),
  path: 'docs/artifact.md',
  blob: 'b'.repeat(40),
  sha256: 'c'.repeat(64),
};
const reviewReference = {
  reviewId: 'review-invalid-original',
  subject: r,
  manifest: r,
  finalResponse: r,
  finalization: { revision: 'd'.repeat(40), sha256: 'e'.repeat(64) },
};
for (const [name, write, want] of [
  ['truncated original journal', (p) => writeFileSync(p, '{}'), /event-log-corrupt/],
  [
    'duplicate original envelope key',
    (p) => writeFileSync(p, '{"schema":"first","schema":"second"}\n'),
    /duplicate/,
  ],
  ['non-regular original journal', (p) => mkdirSync(p), /private-source-file-unsafe/],
])
  test('[#144] actual-workspace verifier refuses ' + name, () => {
    const base = path.join(process.cwd(), '.scratch');
    mkdirSync(base, { recursive: true });
    const workspace = mkdtempSync(path.join(base, 'lineage-proof-test-'));
    try {
      write(path.join(workspace, 'events.jsonl'));
      assert.throws(
        () => verifyRuntimeReviewLineage({ workspace, reviewReference, producerProfile: '0.4.1' }),
        want
      );
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

// Genuine temporary Git fixtures; never touch governed branch/worktree refs.
import { execFileSync } from 'node:child_process';
const { assertReviewVerifierRepository } =
  await import('../../scripts/lib/runtime-review-lineage-proof.mjs').catch(() => ({}));
function gitFixture() {
  const base = path.join(process.cwd(), '.scratch');
  mkdirSync(base, { recursive: true });
  const p = mkdtempSync(path.join(base, 'lineage-git-test-'));
  const repository = path.join(p, 'source');
  mkdirSync(repository);
  const git = (args, cwd = repository) => execFileSync('git', args, { cwd, encoding: 'utf8' });
  git(['init', '-q']);
  writeFileSync(path.join(repository, 'artifact.txt'), 'fixture\n');
  git(['add', 'artifact.txt']);
  git([
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'commit',
    '-qm',
    'fixture',
  ]);
  return { p, repository, git };
}
test('[#144] verifier source and original review may use distinct linked worktrees in one real repository', () => {
  const f = gitFixture();
  const linked = path.join(f.p, 'linked');
  try {
    f.git(['worktree', 'add', '-q', '--detach', linked]);
    assert.equal(
      assertReviewVerifierRepository({ reviewRoot: f.repository, verifierRoot: linked }),
      true
    );
  } finally {
    f.git(['worktree', 'remove', '--force', linked]);
    rmSync(f.p, { recursive: true, force: true });
  }
});
test('[#144] identical Git objects in an independent clone cannot substitute for shared review repository provenance', () => {
  const f = gitFixture();
  const clone = path.join(f.p, 'clone');
  try {
    f.git(['clone', '-q', f.repository, clone]);
    assert.throws(
      () => assertReviewVerifierRepository({ reviewRoot: f.repository, verifierRoot: clone }),
      /verifier-repository-mismatch/
    );
  } finally {
    rmSync(f.p, { recursive: true, force: true });
  }
});

// These fixture journals exercise actor refusal only; they never supply adoption evidence.
import { sequence, FINGERPRINTS, claim } from '../helpers/review-fixture.mjs';
for (const terminalType of ['finalization-started', 'acceptance-committed'])
  for (const [actorName, actor] of [
    ['system', 'system'],
    ['reviewer', FINGERPRINTS.reviewer],
    ['foreign session', FINGERPRINTS.replacement],
  ])
    test('[#144] local verifier refuses ' + actorName + ' on ' + terminalType, () => {
      const base = path.join(process.cwd(), '.scratch');
      mkdirSync(base, { recursive: true });
      const workspace = mkdtempSync(path.join(base, 'lineage-actor-test-'));
      try {
        const events = sequence(
          [
            'review-created',
            'reviewer-joined',
            'turn-claimed',
            'reviewer-accepted',
            'finalization-started',
            'acceptance-committed',
          ],
          {
            1: { actor: FINGERPRINTS.reviewer },
            2: { actor: FINGERPRINTS.reviewer, payload: { claim: claim('reviewer') } },
            3: { actor: FINGERPRINTS.reviewer },
            4: { actor: FINGERPRINTS.author },
            5: { actor: FINGERPRINTS.author },
          }
        );
        events[0].payload.startup.context.repository_root = workspace;
        events[0].payload.startup.runtime = {
          schema: 'ai-peer-review.runtime/v1',
          classification: 'XPR',
          ownership: 'broker',
          transport_mode: 'manual',
          author: {
            provider: 'openai',
            host: 'codex',
            model_id: 'fixture',
            model_display: 'fixture',
            effort: 'high',
          },
          reviewer: {
            selector: 'claude',
            provider: 'anthropic',
            host: 'claude-code',
            model_id: 'fixture',
            model_display: 'fixture',
            effort: 'high',
          },
          adapter_version: '1',
          project_root_digest: 'd'.repeat(64),
        };
        events.find((event) => event.type === terminalType).actor = actor;
        writeFileSync(
          path.join(workspace, 'events.jsonl'),
          events.map((event) => JSON.stringify(event)).join('\n') + '\n'
        );
        assert.throws(
          () =>
            verifyRuntimeReviewLineage({
              workspace,
              reviewReference: { ...reviewReference, reviewId: 'review-01' },
              producerProfile: '0.4.1',
            }),
          /persisted-terminal-author-conflict/
        );
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    });
