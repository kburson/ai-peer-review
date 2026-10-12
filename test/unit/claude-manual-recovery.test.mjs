import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fingerprintSession } from '../../src/identity/registry.mjs';
import { canonicalProjection } from '../../src/protocol/service.mjs';

const digest = (bytes) => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'apr-completion-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const workspace = path.join(root, '.scratch', 'peer-review', 'review-one');
  const session = '11111111-1111-4111-8111-111111111111';
  const contract = {
    workspace,
    repository_root: root,
    review_id: 'review-one',
    invitation: path.join(root, 'invitation.md'),
    response: path.join(root, 'response.md'),
    model: 'claude-opus-5-5',
    effort: 'high',
  };
  const reviewer = {
    provider: 'anthropic',
    host: 'claude-code',
    model_id: contract.model,
    session_fingerprint: fingerprintSession('anthropic', session),
  };
  const state = {
    participants: { reviewer },
    protocol: {
      review_id: 'review-one',
      state: 'reviewer-turn',
      revision: 2,
      startup: {
        runtime: {
          reviewer: {
            provider: 'anthropic',
            host: 'claude-code',
            model_id: contract.model,
            effort: 'high',
          },
        },
      },
    },
  };
  const operation = {
    id: 'manual:22222222-2222-4222-8222-222222222222',
    status: 'outcome-unknown',
    intent_digest: digest(
      canonicalProjection({
        invitation: contract.invitation,
        response: contract.response,
        model: contract.model,
        effort: contract.effort,
        resume: false,
      })
    ),
  };
  const details = { reviewId: 'review-one', requestDigest: 'a'.repeat(64) };
  const provider = path.join(workspace, 'provider', 'claude');
  mkdirSync(path.join(provider, 'observations'), { recursive: true });
  const historyFile = path.join(workspace, 'manual-launch-history.json');
  const history = {
    schema: 'ai-peer-review.manual-launch-history/v1',
    review_id: details.reviewId,
    request_digest: details.requestDigest,
    coverage: 'complete',
    operations: [operation],
  };
  const writeHistory = () => writeFileSync(historyFile, JSON.stringify(history));
  writeHistory();
  const launch = {
    schema: 'ai-peer-review.claude-launch-state/v1',
    review_id: 'review-one',
    invitation: contract.invitation,
    response: contract.response,
    model: contract.model,
    effort: 'high',
    session_handle: session,
    session_fingerprint: reviewer.session_fingerprint,
    protocol_revision: 2,
  };
  writeFileSync(path.join(provider, 'launch-state.json'), JSON.stringify(launch), { mode: 0o600 });
  const observed = {
    source: 'official-exact-session',
    source_version: '2.1.284',
    observed_at: '2026-10-11T19:37:41.000Z',
    operation_id: 'join:review-one',
    provider: 'anthropic',
    host: 'claude-code',
    model_id: contract.model,
    session_id: session,
    phase: 'tool-use',
    tool_use_id: 'tool-one',
  };
  writeFileSync(
    path.join(
      provider,
      'observations',
      createHash('sha256').update('join:review-one').digest('hex') + '.json'
    ),
    JSON.stringify(observed),
    { mode: 0o600 }
  );
  const claudeHome = path.join(root, 'claude');
  const dir = path.join(claudeHome, 'projects', root.replace(/[^A-Za-z0-9]/g, '-'));
  mkdirSync(dir, { recursive: true });
  const transcript = path.join(dir, session + '.jsonl');
  const messages = [
    {
      type: 'user',
      sessionId: session,
      timestamp: '2026-10-11T19:37:40.000Z',
      message: { content: 'Open ' + contract.invitation },
    },
    {
      type: 'assistant',
      sessionId: session,
      timestamp: observed.observed_at,
      version: observed.source_version,
      message: {
        role: 'assistant',
        model: contract.model,
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 'tool-one',
            name: 'Bash',
            input: { command: 'peer-review join /sealed/invitation' },
          },
        ],
      },
    },
    {
      type: 'assistant',
      sessionId: session,
      timestamp: '2026-10-11T19:38:11.000Z',
      version: observed.source_version,
      message: {
        role: 'assistant',
        model: contract.model,
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Stopped before submitting.' }],
      },
    },
  ];
  const writeTranscript = () =>
    writeFileSync(transcript, messages.map(JSON.stringify).join('\n') + '\n', { mode: 0o600 });
  writeTranscript();
  return {
    contract,
    state,
    operation,
    details,
    history,
    writeHistory,
    claudeHome,
    transcript,
    messages,
    writeTranscript,
    now: new Date('2026-10-11T20:00:00.000Z'),
  };
}

test('reconciliation proves this joined operation ended without inventing a reviewer decision', async (t) => {
  const { observeClaudeManualCompletion } =
    await import('../../src/provider/claude-manual-recovery.mjs');
  const fx = fixture(t);
  const proof = observeClaudeManualCompletion(fx);
  assert.equal(proof.session_fingerprint, fx.state.participants.reviewer.session_fingerprint);
  assert.equal(proof.transcript_digest, digest(readFileSync(fx.transcript)));
  assert.equal(proof.last_turn_at, '2026-10-11T19:38:11.000Z');
  assert.equal(proof.protocol_revision, 2);
  assert.equal(fx.state.protocol.state, 'reviewer-turn');
  assert.doesNotMatch(JSON.stringify(proof), /11111111-1111/);
});

test('changed identity, intent, pending turn, unrelated terminal turn, or stale join never permits resume', async (t) => {
  const { observeClaudeManualCompletion } =
    await import('../../src/provider/claude-manual-recovery.mjs');
  for (const change of [
    'identity',
    'intent',
    'active',
    'new-prompt',
    'stale-terminal',
    'join-tool',
    'model',
    'protocol',
  ]) {
    await t.test(change, (t) => {
      const fx = fixture(t);
      if (change === 'identity')
        fx.state.participants.reviewer.session_fingerprint = digest('other');
      if (change === 'intent') fx.operation.intent_digest = digest('other');
      if (change === 'active') fx.messages.at(-1).message.stop_reason = 'tool_use';
      if (change === 'new-prompt')
        fx.messages.splice(2, 0, {
          ...fx.messages[0],
          timestamp: '2026-10-11T19:38:00.000Z',
          message: { content: 'Unrelated prompt' },
        });
      if (change === 'stale-terminal') fx.messages.at(-1).timestamp = '2026-10-11T19:37:00.000Z';
      if (change === 'join-tool') fx.messages[1].message.content[0].id = 'other';
      if (change === 'model') fx.messages.at(-1).message.model = 'other-model';
      if (change === 'protocol') fx.state.protocol.state = 'acceptance-pending';
      fx.writeTranscript();
      assert.throws(() => observeClaudeManualCompletion(fx));
    });
  }
});

test('old terminal cannot settle a later resume; only that unique native prompt can', async (t) => {
  const { observeClaudeManualCompletion } =
    await import('../../src/provider/claude-manual-recovery.mjs');
  const fx = fixture(t);
  fx.history.operations.push(
    (fx.operation = {
      ...fx.operation,
      id: 'manual:33333333-3333-4333-8333-333333333333',
      intent_digest: digest(
        canonicalProjection({
          invitation: fx.contract.invitation,
          response: fx.contract.response,
          model: fx.contract.model,
          effort: 'high',
          resume: true,
        })
      ),
    })
  );
  fx.writeHistory();
  assert.throws(() => observeClaudeManualCompletion(fx), { code: 'APR_WAKE_OUTCOME_UNKNOWN' });
  fx.messages.splice(2, 0, {
    ...fx.messages[0],
    timestamp: '2026-10-11T19:38:00.000Z',
    message: {
      content: `Continue. APR_MANUAL_OPERATION ${fx.operation.id} ${fx.operation.intent_digest}`,
    },
  });
  fx.writeTranscript();
  assert.equal(observeClaudeManualCompletion(fx).last_turn_at, '2026-10-11T19:38:11.000Z');
});

test('native stale-claim intervention preserves same-session completion and reclaim path', async (t) => {
  const { observeClaudeManualCompletion } =
    await import('../../src/provider/claude-manual-recovery.mjs');
  const fx = fixture(t);
  fx.state.protocol.state = 'intervention-required';
  fx.state.protocol.revision = 3;
  fx.state.protocol.intervention = { reason: 'stale-claim', interrupted_state: 'reviewer-turn' };
  assert.equal(observeClaudeManualCompletion(fx).protocol_revision, 3);
  fx.state.protocol.intervention.reason = 'other';
  assert.throws(() => observeClaudeManualCompletion(fx));
});
