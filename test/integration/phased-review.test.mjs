import {
  fixtureSelection,
  fixtureStartupDeps,
  fixtureObservation,
} from '../helpers/internal-api.mjs';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import * as api from '../helpers/internal-api.mjs';
import { createReviewWorker } from '../../src/broker/worker.mjs';
import { latestWakeOperation } from '../../src/coordinator/ledger.mjs';
import { participantIdentity } from '../../src/identity/registry.mjs';
import { inspectReviewAuthority } from '../../src/protocol/service.mjs';

const NOW = '2026-09-09T12:00:00.000Z';

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'apr-phased-'));
  execFileSync('git', ['init', '-b', 'trunk'], { cwd: root, stdio: 'ignore' });
  git(root, ['config', 'user.email', 'test@example.com']);
  git(root, ['config', 'user.name', 'Test']);
  mkdirSync(path.join(root, 'docs'));
  writeFileSync(path.join(root, 'docs/spec.md'), '# Spec\n');
  writeFileSync(path.join(root, '.git/info/exclude'), '.scratch/peer-review/\n');
  git(root, ['add', 'docs/spec.md']);
  git(root, ['commit', '-m', 'fixture']);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function identity(role) {
  return participantIdentity({
    role,
    host: 'codex',
    provider: 'openai',
    modelId: 'gpt-test',
    modelDisplay: 'GPT Test',
    sessionId: `phased-${role}`,
    source: 'runtime',
    joinedAt: NOW,
  });
}

function wakeObservation(participant, observedAt) {
  return {
    session_fingerprint: participant.session_fingerprint,
    capability: 'native-push',
    adapter: 'codex-app',
    adapter_version: '2.0.0',
    lease: {
      schema: 'ai-peer-review.resident-lease/v1',
      process_instance_id: `phased-${participant.role}-process`,
      pid: null,
      opaque_handle: `codex:${participant.role}-session`,
      host: 'codex',
      adapter_version: '2.0.0',
      heartbeat_sequence: 1,
      observed_at: observedAt,
      expires_at: '2026-09-09T12:30:00.000Z',
    },
  };
}

function replaceSection(file, heading, content) {
  const text = readFileSync(file, 'utf8');
  const pattern = new RegExp(`(## ${heading}\\r?\\n\\r?\\n)[\\s\\S]*?(?=\\r?\\n\\r?\\n## |$)`);
  writeFileSync(file, text.replace(pattern, `$1${content}`));
}

async function accept(root, workspace, response, reviewer, now) {
  replaceSection(response, 'Summary', 'Accepted as written.');
  replaceSection(response, 'Findings', 'None.');
  replaceSection(response, 'Required changes', 'None.');
  replaceSection(response, 'Optional suggestions', 'None.');
  replaceSection(response, 'Decision', 'accepted');
  return api.submitReviewTurn({
    cwd: root,
    workspace,
    identity: reviewer,
    decision: 'accepted',
    now,
  });
}

async function reconcileThroughWorker(workspace, participant, now, calls) {
  const worker = createReviewWorker({
    registration: { workspace },
    adapter: {
      automatic: true,
      observation: wakeObservation(participant, now),
      async deliver(input) {
        calls.push(input);
        return { status: 'acknowledged', reason: 'test-acknowledged' };
      },
      async reconcile() {
        return { status: 'not-submitted', reason: 'test-not-submitted' };
      },
    },
    clock: { now: () => Date.parse(now) },
  });
  await worker.start();
  await worker.reconcile();
  return latestWakeOperation(workspace);
}

test('normal spec-plan session advances exactly once and finalizes terminally', async (t) => {
  const root = fixture(t);
  const author = identity('author');
  const reviewer = identity('reviewer');
  const started = await api.startReview(
    {
      ...fixtureSelection('codex', 'gpt-test'),
      cwd: root,
      artifact: 'docs/spec.md',
      artifactKind: 'spec',
      phases: 'spec,plan',
      identity: author,
      reviewId: 'phased-normal',
      maxTurns: 1,
      now: NOW,
    },
    fixtureStartupDeps
  );
  const joined = await api.joinReview({
    runtimeObservation: fixtureObservation(),
    cwd: root,
    invitation: started.paths.reviewer_invitation,
    identity: reviewer,
    now: NOW,
  });
  await accept(
    root,
    started.paths.workspace,
    joined.paths.response,
    reviewer,
    '2026-09-09T12:01:00.000Z'
  );
  const acceptedSpec = inspectReviewAuthority(started.paths.workspace).state;
  assert.equal(acceptedSpec.protocol.state, 'acceptance-pending');
  assert.equal(acceptedSpec.protocol.turns_used, 1);
  assert.equal(acceptedSpec.protocol.phases.phase_turns_used, 1);
  let commitCrash = true;
  await assert.rejects(
    api.finalizeReview(
      {
        cwd: root,
        workspace: started.paths.workspace,
        identity: author,
        now: '2026-09-09T12:02:00.000Z',
      },
      {
        checkpoint(name) {
          if (commitCrash && name === 'finalization-commit-created') {
            commitCrash = false;
            throw new Error('injected after author commit before phase event');
          }
        },
      }
    ),
    /injected after author commit before phase event/
  );
  const afterSpecAcceptance = inspectReviewAuthority(started.paths.workspace).state;
  assert.equal(afterSpecAcceptance.protocol.state, 'author-finalization');
  const phaseManifest = path.join(
    path.dirname(started.paths.reviewer_invitation),
    path
      .basename(started.paths.reviewer_invitation)
      .replace('reviewer-invitation.md', 'phase-01-spec-review-manifest.md')
  );
  const committedPhaseManifest = readFileSync(phaseManifest);
  let deliveryCrash = true;
  await assert.rejects(
    api.finalizeReview(
      {
        cwd: root,
        workspace: started.paths.workspace,
        identity: author,
        now: '2026-09-09T12:02:00.000Z',
      },
      {
        checkpoint(name) {
          if (deliveryCrash && name === 'terminal-event-appended') {
            deliveryCrash = false;
            throw new Error('injected after phase event before delivery append');
          }
        },
      }
    ),
    /injected after phase event before delivery append/
  );
  const afterSpecFinalize = inspectReviewAuthority(started.paths.workspace).state;
  assert.equal(afterSpecFinalize.protocol.state, 'awaiting-phase-artifact');
  assert.deepEqual(readFileSync(phaseManifest), committedPhaseManifest);
  const phase = await api.finalizeReview({
    cwd: root,
    workspace: started.paths.workspace,
    identity: author,
    now: '2026-09-09T12:02:00.000Z',
  });
  assert.equal(phase.state, 'awaiting-phase-artifact');
  const wakes = [];
  const authorWake = await reconcileThroughWorker(
    started.paths.workspace,
    author,
    '2026-09-09T12:02:01.000Z',
    wakes
  );
  assert.equal(authorWake.status, 'acknowledged');
  assert.equal(wakes.length, 1);
  assert.equal(wakes[0].capsule.target_role, 'author');
  assert.equal(authorWake.delivery_id, 'phase-0-to-author');
  assert.equal(
    JSON.parse(
      readFileSync(path.join(started.paths.workspace, 'deliveries/phase-0-to-author.json'))
    ).recipient,
    'author'
  );
  const authorDelivery = path.join(started.paths.workspace, 'deliveries/phase-0-to-author.json');
  const eventsBeforeFinalizeRetry = readFileSync(started.paths.events);
  rmSync(authorDelivery);
  await api.finalizeReview({
    cwd: root,
    workspace: started.paths.workspace,
    identity: author,
    now: '2026-09-09T12:02:00.000Z',
  });
  assert.equal(existsSync(authorDelivery), true);
  assert.deepEqual(readFileSync(started.paths.events), eventsBeforeFinalizeRetry);

  writeFileSync(path.join(root, 'docs/plan.md'), '# Plan\n');
  git(root, ['add', 'docs/plan.md']);
  git(root, ['commit', '-m', 'add plan']);
  await assert.rejects(
    api.advanceReview(
      {
        cwd: root,
        workspace: started.paths.workspace,
        artifact: 'docs/plan.md',
        identity: author,
        now: '2026-09-09T12:03:00.000Z',
      },
      {
        checkpoint(name) {
          if (name === 'phase-artifact-appended') {
            throw new Error('injected after phase-artifact-appended');
          }
        },
      }
    ),
    /injected after phase-artifact-appended/
  );
  const advanced = await api.advanceReview({
    cwd: root,
    workspace: started.paths.workspace,
    artifact: 'docs/plan.md',
    identity: author,
    now: '2026-09-09T12:03:00.000Z',
  });
  assert.equal(advanced.state, 'reviewer-turn');
  assert.equal(advanced.phases.cursor, 1);
  assert.equal(advanced.phases.current_kind, 'plan');
  assert.equal(advanced.phases.phase_turns_used, 0);
  assert.equal(advanced.phases.completed.length, 1);
  assert.equal(advanced.review.artifact.path, 'docs/plan.md');
  assert.equal(advanced.paths.response.endsWith('reviewer-response-2.md'), true);
  const advancedEvents = readFileSync(started.paths.events, 'utf8')
    .trim()
    .split('\n')
    .map(JSON.parse);
  assert.equal(
    advancedEvents.filter((event) => event.type === 'phase-artifact-committed').length,
    1
  );
  const afterPlanAdvance = inspectReviewAuthority(started.paths.workspace).state;
  assert.equal(afterPlanAdvance.protocol.current_actor, 'reviewer');
  assert.equal(
    afterPlanAdvance.participants.reviewer.session_fingerprint,
    reviewer.session_fingerprint
  );
  assert.equal(afterPlanAdvance.protocol.turns_used, 1);
  assert.equal(afterPlanAdvance.protocol.phases.phase_turns_used, 0);
  const reviewerWakes = [];
  const reviewerWake = await reconcileThroughWorker(
    started.paths.workspace,
    reviewer,
    '2026-09-09T12:03:01.000Z',
    reviewerWakes
  );
  assert.equal(reviewerWake.status, 'acknowledged');
  assert.equal(reviewerWake.delivery_id, 'phase-1-to-reviewer');
  assert.equal(reviewerWakes[0].capsule.target_role, 'reviewer');
  assert.equal(
    advancedEvents.filter(
      (event) =>
        event.type === 'delivery-written' &&
        event.payload.delivery.delivery_id === 'phase-1-to-reviewer'
    ).length,
    1
  );

  const beforeRetry = readFileSync(started.paths.events);
  const retried = await api.advanceReview({
    cwd: root,
    workspace: started.paths.workspace,
    artifact: 'docs/plan.md',
    identity: author,
    now: '2026-09-09T12:03:00.000Z',
  });
  assert.equal(retried.state, 'reviewer-turn');
  assert.deepEqual(readFileSync(started.paths.events), beforeRetry);

  await accept(
    root,
    started.paths.workspace,
    advanced.paths.response,
    reviewer,
    '2026-09-09T12:04:00.000Z'
  );
  const terminal = await api.finalizeReview({
    cwd: root,
    workspace: started.paths.workspace,
    identity: author,
    now: '2026-09-09T12:05:00.000Z',
  });
  assert.equal(terminal.state, 'accepted');
  assert.equal(terminal.phases.cursor, 1);
  assert.equal(terminal.phases.phase_turns_used, 1);
  const terminalAuthority = inspectReviewAuthority(started.paths.workspace);
  assert.equal(terminalAuthority.state.protocol.turns_used, 2);
  assert.equal(terminalAuthority.state.protocol.max_turns, 1);
  assert.deepEqual(
    terminalAuthority.events
      .filter((event) => event.type === 'reviewer-accepted')
      .map((event) => event.payload.turn),
    [1, 2]
  );
  const terminalManifest = readFileSync(terminal.paths.manifest);
  const finalRetry = await api.finalizeReview({
    cwd: root,
    workspace: started.paths.workspace,
    identity: author,
    now: '2026-09-09T12:05:00.000Z',
  });
  assert.equal(finalRetry.state, 'accepted');
  assert.deepEqual(readFileSync(phaseManifest), committedPhaseManifest);
  assert.deepEqual(readFileSync(terminal.paths.manifest), terminalManifest);
});

test('legacy start result and projection omit phase authority', async (t) => {
  const root = fixture(t);
  const started = await api.startReview(
    {
      ...fixtureSelection('codex', 'gpt-test'),
      cwd: root,
      artifact: 'docs/spec.md',
      artifactKind: 'spec',
      identity: identity('author'),
      reviewId: 'legacy-control',
      now: NOW,
    },
    fixtureStartupDeps
  );
  assert.equal(Object.hasOwn(started, 'phases'), false);
  assert.equal(
    Object.hasOwn(inspectReviewAuthority(started.paths.workspace).state.protocol, 'phases'),
    false
  );
});

test('second-phase revision uses its own turn budget instead of global turn exhaustion', async (t) => {
  const root = fixture(t);
  const author = identity('author');
  const reviewer = identity('reviewer');
  const started = await api.startReview(
    {
      ...fixtureSelection('codex', 'gpt-test'),
      cwd: root,
      artifact: 'docs/spec.md',
      artifactKind: 'spec',
      phases: 'spec,plan',
      identity: author,
      reviewId: 'phased-budget',
      maxTurns: 2,
      now: NOW,
    },
    fixtureStartupDeps
  );
  const joined = await api.joinReview({
    runtimeObservation: fixtureObservation(),
    cwd: root,
    invitation: started.paths.reviewer_invitation,
    identity: reviewer,
    now: NOW,
  });
  await accept(
    root,
    started.paths.workspace,
    joined.paths.response,
    reviewer,
    '2026-09-09T12:01:00.000Z'
  );
  await api.finalizeReview({
    cwd: root,
    workspace: started.paths.workspace,
    identity: author,
    now: '2026-09-09T12:02:00.000Z',
  });
  writeFileSync(path.join(root, 'docs/plan.md'), '# Plan\n');
  git(root, ['add', 'docs/plan.md']);
  git(root, ['commit', '-m', 'plan draft']);
  const advanced = await api.advanceReview({
    cwd: root,
    workspace: started.paths.workspace,
    artifact: 'docs/plan.md',
    identity: author,
    now: '2026-09-09T12:03:00.000Z',
  });
  replaceSection(advanced.paths.response, 'Summary', 'One change remains.');
  replaceSection(advanced.paths.response, 'Findings', '### R2-F001 — Repair\n\nFix the plan.');
  replaceSection(advanced.paths.response, 'Required changes', '- Address R2-F001.');
  replaceSection(advanced.paths.response, 'Optional suggestions', 'None.');
  replaceSection(advanced.paths.response, 'Decision', 'revisions-requested');
  const handoff = await api.submitReviewTurn({
    cwd: root,
    workspace: started.paths.workspace,
    identity: reviewer,
    decision: 'revisions-requested',
    now: '2026-09-09T12:04:00.000Z',
  });
  writeFileSync(path.join(root, 'docs/plan.md'), '# Plan repaired\n');
  replaceSection(handoff.paths.response, 'Summary', 'Repaired the plan.');
  replaceSection(handoff.paths.response, 'Finding dispositions', '- R2-F001: fixed');
  replaceSection(handoff.paths.response, 'Changes made', 'Updated the plan.');
  replaceSection(handoff.paths.response, 'Declined changes and rationale', 'None.');
  replaceSection(handoff.paths.response, 'Verification', 'Checked the revised plan.');
  const submitted = await api.submitAuthorTurn({
    cwd: root,
    workspace: started.paths.workspace,
    identity: author,
    now: '2026-09-09T12:05:00.000Z',
  });
  assert.equal(submitted.state, 'reviewer-turn');
  assert.equal(submitted.phases.phase_turns_used, 1);
  assert.equal(inspectReviewAuthority(started.paths.workspace).state.protocol.turns_used, 2);
});

test('no-commit phase advance seals next artifact bytes without Git mutation', async (t) => {
  const root = fixture(t);
  writeFileSync(path.join(root, 'docs/plan.md'), '# Plan baseline\n');
  git(root, ['add', 'docs/plan.md']);
  git(root, ['commit', '-m', 'plan baseline']);
  const baseline = git(root, ['rev-parse', 'HEAD']);
  const author = identity('author');
  const reviewer = identity('reviewer');
  const started = await api.startReview(
    {
      ...fixtureSelection('codex', 'gpt-test'),
      cwd: root,
      artifact: 'docs/spec.md',
      artifactKind: 'spec',
      phases: 'spec,plan',
      noCommit: true,
      identity: author,
      reviewId: 'phased-no-commit',
      now: NOW,
    },
    fixtureStartupDeps
  );
  const joined = await api.joinReview({
    runtimeObservation: fixtureObservation(),
    cwd: root,
    invitation: started.paths.reviewer_invitation,
    identity: reviewer,
    now: NOW,
  });
  await accept(
    root,
    started.paths.workspace,
    joined.paths.response,
    reviewer,
    '2026-09-09T12:01:00.000Z'
  );
  await api.finalizeReview({
    cwd: root,
    workspace: started.paths.workspace,
    identity: author,
    now: '2026-09-09T12:02:00.000Z',
  });
  writeFileSync(path.join(root, 'docs/plan.md'), '# Plan working bytes\n');
  const advanced = await api.advanceReview({
    cwd: root,
    workspace: started.paths.workspace,
    artifact: 'docs/plan.md',
    identity: author,
    now: '2026-09-09T12:03:00.000Z',
  });
  assert.equal(advanced.state, 'reviewer-turn');
  assert.equal(advanced.review.commit, null);
  assert.equal(
    readFileSync(path.join(started.paths.workspace, advanced.review.snapshot.path), 'utf8'),
    '# Plan working bytes\n'
  );
  assert.equal(git(root, ['rev-parse', 'HEAD']), baseline);
});

test('invalid phase declarations fail before creating review authority', async (t) => {
  const root = fixture(t);
  for (const phases of ['', 'spec,spec', 'spec,report', 'plan,spec']) {
    await assert.rejects(
      api.startReview(
        {
          ...fixtureSelection('codex', 'gpt-test'),
          cwd: root,
          artifact: 'docs/spec.md',
          artifactKind: 'spec',
          phases,
          identity: identity('author'),
          reviewId: `invalid-${phases || 'empty'}`.replaceAll(',', '-'),
          now: NOW,
        },
        fixtureStartupDeps
      ),
      { code: 'APR_PHASE_INVALID' }
    );
  }
});
