import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AprError } from '../errors.mjs';
import { fingerprintSession } from '../identity/registry.mjs';
import { readManualLaunchHistory } from './manual-launch-ledger.mjs';
import { canonicalProjection } from '../protocol/service.mjs';
import {
  readClaudeSessionSnapshot,
  readClaudeStreamObservation,
} from '../providers/claude-stream.mjs';

const digest = (bytes) => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
function refuse() {
  throw new AprError(
    'APR_WAKE_OUTCOME_UNKNOWN',
    'Exact completed Claude launch cannot be proven.',
    {
      recovery:
        'Preserve the exact launch, transcript and review; do not replace or replay an uncertain session.',
    }
  );
}

// A terminal provider turn proves completion, never a protocol decision. This
// observer is called under the manual dispatch lock after fresh review admission.
export function observeClaudeManualCompletion({
  contract,
  state,
  operation,
  details,
  claudeHome = path.join(os.homedir(), '.claude'),
  now = new Date(),
}) {
  const reviewer = state.participants.reviewer;
  const selected = state.protocol.startup?.runtime?.reviewer;
  if (
    !reviewer ||
    state.protocol.review_id !== contract.review_id ||
    !(
      state.protocol.state === 'reviewer-turn' ||
      (state.protocol.state === 'intervention-required' &&
        state.protocol.intervention?.reason === 'stale-claim' &&
        state.protocol.intervention?.interrupted_state === 'reviewer-turn')
    ) ||
    operation.status !== 'outcome-unknown'
  )
    refuse();
  const file = path.join(contract.workspace, 'provider', 'claude', 'launch-state.json');
  const stat = lstatSync(file);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.size > 1024 * 1024 ||
    (process.platform !== 'win32' && (stat.uid !== process.getuid() || stat.mode & 0o077))
  )
    refuse();
  const launch = JSON.parse(readFileSync(file, 'utf8'));
  if (
    launch.schema !== 'ai-peer-review.claude-launch-state/v1' ||
    launch.review_id !== contract.review_id ||
    launch.invitation !== contract.invitation ||
    launch.response !== contract.response ||
    launch.model !== contract.model ||
    launch.effort !== contract.effort ||
    launch.protocol_revision > state.protocol.revision ||
    launch.session_fingerprint !== reviewer.session_fingerprint ||
    fingerprintSession('anthropic', launch.session_handle) !== reviewer.session_fingerprint ||
    reviewer.provider !== 'anthropic' ||
    reviewer.host !== 'claude-code' ||
    reviewer.model_id !== contract.model ||
    selected?.model_id !== contract.model ||
    selected?.provider !== 'anthropic' ||
    selected?.host !== 'claude-code' ||
    selected?.effort !== contract.effort
  )
    refuse();
  const history = readManualLaunchHistory(contract.workspace, details);
  const storedOperation = history?.operations.find((entry) => entry.id === operation.id);
  if (
    history?.coverage !== 'complete' ||
    storedOperation?.intent_digest !== operation.intent_digest ||
    storedOperation.status !== 'outcome-unknown'
  )
    refuse();
  // Both an initial launch and a prior same-session resume have sealed intent.
  if (
    ![false, true].some(
      (resume) =>
        operation.intent_digest ===
        digest(
          canonicalProjection({
            invitation: contract.invitation,
            response: contract.response,
            model: contract.model,
            effort: contract.effort,
            resume,
          })
        )
    )
  )
    refuse();
  const observed = readClaudeStreamObservation({
    workspace: contract.workspace,
    operationId: `join:${contract.review_id}`,
    handleLocator: launch.session_handle,
  });
  const snapshot = readClaudeSessionSnapshot({
    projectRoot: contract.repository_root,
    sessionId: launch.session_handle,
    claudeHome,
    now,
  });
  if (
    observed.provider !== 'anthropic' ||
    observed.host !== 'claude-code' ||
    observed.phase !== 'tool-use' ||
    observed.model_id !== contract.model ||
    snapshot.model_id !== contract.model ||
    observed.source_version !== snapshot.source_version ||
    !Number.isFinite(Date.parse(observed.observed_at)) ||
    Date.parse(snapshot.last_turn_at) < Date.parse(observed.observed_at)
  )
    refuse();
  const transcript = path.join(
    claudeHome,
    'projects',
    contract.repository_root.replace(/[^A-Za-z0-9]/g, '-'),
    launch.session_handle + '.jsonl'
  );
  const bytes = readFileSync(transcript);
  const messages = bytes
    .toString('utf8')
    .trimEnd()
    .split('\n')
    .map(JSON.parse)
    .filter((entry) => ['user', 'assistant'].includes(entry.type));
  const joins = messages.filter(
    (entry) =>
      entry.type === 'assistant' &&
      entry.sessionId === launch.session_handle &&
      entry.timestamp === observed.observed_at &&
      entry.message?.model === contract.model &&
      entry.message?.content?.some(
        (part) =>
          part.type === 'tool_use' && part.name === 'Bash' && part.id === observed.tool_use_id
      )
  );
  if (joins.length !== 1) refuse();
  const joinIndex = messages.indexOf(joins[0]);
  const marker = `APR_MANUAL_OPERATION ${operation.id} ${operation.intent_digest}`;
  const prompts = messages.filter(
    (entry) =>
      entry.type === 'user' &&
      typeof entry.message?.content === 'string' &&
      entry.message.content.includes(marker)
  );
  let boundary;
  if (prompts.length === 1) {
    boundary = messages.indexOf(prompts[0]);
  } else if (
    prompts.length === 0 &&
    history.operations.length === 1 &&
    operation.intent_digest ===
      digest(
        canonicalProjection({
          invitation: contract.invitation,
          response: contract.response,
          model: contract.model,
          effort: contract.effort,
          resume: false,
        })
      )
  ) {
    // Compatibility applies only to the first original launch, never a resume.
    const prompt = messages
      .slice(0, joinIndex)
      .filter((entry) => entry.type === 'user' && typeof entry.message?.content === 'string')
      .at(-1);
    if (!prompt?.message.content.includes(contract.invitation)) refuse();
    boundary = joinIndex;
  } else refuse();
  if (
    messages
      .slice(boundary + 1)
      .some(
        (entry) =>
          entry.type === 'user' &&
          typeof entry.message?.content === 'string' &&
          entry.isMeta !== true
      )
  )
    refuse();
  const last = messages.at(-1);
  if (
    last?.type !== 'assistant' ||
    last.message?.stop_reason !== 'end_turn' ||
    last.message.model !== snapshot.model_id ||
    last.sessionId !== launch.session_handle ||
    new Date(last.timestamp).toISOString() !== snapshot.last_turn_at
  )
    refuse();
  // Detect concurrent transcript changes before recording completion custody.
  if (!readFileSync(transcript).equals(bytes)) refuse();
  return Object.freeze({
    schema: 'ai-peer-review.manual-completion-proof/v1',
    session_fingerprint: reviewer.session_fingerprint,
    transcript_digest: digest(bytes),
    last_turn_at: snapshot.last_turn_at,
    protocol_revision: state.protocol.revision,
  });
}
