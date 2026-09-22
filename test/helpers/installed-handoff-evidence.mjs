import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function fail(code, stage, reason) {
  throw Object.assign(new Error(`${code}: ${stage}: ${reason}`), { code, stage, reason });
}

export function inspectInstalledHandoffWorkspaces({ host, authorSettled = false }) {
  const reviewsRoot = path.join(host, '.scratch', 'peer-review');
  const workspaces = existsSync(reviewsRoot)
    ? readdirSync(reviewsRoot)
        .map((name) => path.join(reviewsRoot, name))
        .filter((candidate) => existsSync(path.join(candidate, 'events.jsonl')))
    : [];
  if (authorSettled && workspaces.length === 0)
    fail('APR_LIVE_HANDOFF_UNPROVEN', 'author-start', 'no-review-progress');
  return workspaces;
}

export async function inspectInstalledHandoff({ installed, workspace, head }) {
  const load = (file) => import(pathToFileURL(path.join(installed, file)));
  const { inspectReviewAuthority } = await load('src/protocol/service.mjs');
  const { readWakeOperation } = await load('src/coordinator/ledger.mjs');
  const directory = path.join(workspace, 'wake', 'operations');
  const wakes = existsSync(directory)
    ? readdirSync(directory)
        .filter((name) => /^[a-f0-9]{64}\.json$/.test(name))
        .map((name) => readWakeOperation(workspace, `sha256:${name.slice(0, -5)}`))
    : [];
  // Read authority after the ledger: an acknowledgment must not race an older
  // event snapshot and appear to be a completed turn with no submission.
  const authority = inspectReviewAuthority(workspace);
  if (authority.state.protocol.commit_mode !== 'normal') return null;
  for (const wake of wakes) {
    if (['outcome-unknown', 'refused'].includes(wake.status))
      fail('APR_LIVE_HANDOFF_UNPROVEN', `${wake.target_role}-wake`, `wake-${wake.status}`);
  }
  const acknowledged = wakes.filter((wake) => wake.status === 'acknowledged');
  const participants = authority.state.participants;
  const progress = new Map();
  for (const wake of acknowledged) {
    if (
      wake.review_id !== authority.state.protocol.review_id ||
      wake.session_fingerprint !== participants[wake.target_role]?.session_fingerprint ||
      wake.adapter_version !== '1.0.0'
    )
      fail('APR_LIVE_BINDING_CONFLICT', `${wake.target_role}-wake`, 'wake-session-conflict');
    if (wake.capsule.reason !== 'role-actionable') continue;
    const types =
      wake.target_role === 'author'
        ? ['author-revision-committed', 'author-closing-round-committed', 'acceptance-committed']
        : ['reviewer-revisions-requested', 'reviewer-accepted'];
    const submitted = authority.events.find(
      (event) =>
        types.includes(event.type) &&
        (event.revision === wake.protocol_revision + 1 ||
          (event.type === 'acceptance-committed' &&
            event.revision === wake.protocol_revision + 2 &&
            authority.events.some(
              (step) =>
                step.type === 'finalization-started' &&
                step.revision === wake.protocol_revision + 1 &&
                step.actor === wake.session_fingerprint
            ))) &&
        event.actor === wake.session_fingerprint
    );
    if (!submitted)
      fail(
        'APR_LIVE_HANDOFF_UNPROVEN',
        `${wake.target_role}-submission`,
        'acknowledged-without-protocol-progress'
      );
    progress.set(wake.operation_id, submitted);
  }
  const authorWake = acknowledged.find(
    (wake) =>
      wake.target_role === 'author' &&
      progress.get(wake.operation_id)?.type === 'author-revision-committed'
  );
  const authorSubmission = authorWake && progress.get(authorWake.operation_id);
  const reviewerWake = acknowledged.find(
    (wake) =>
      wake.target_role === 'reviewer' &&
      wake.protocol_revision === authorSubmission?.revision &&
      progress.has(wake.operation_id)
  );
  const initialReview =
    authorWake &&
    authority.events.find(
      (event) =>
        event.type === 'reviewer-revisions-requested' &&
        event.revision === authorWake.protocol_revision &&
        event.actor === participants.reviewer?.session_fingerprint
    );
  const joined = authority.events.find((event) => event.type === 'reviewer-joined');
  if (authorWake && reviewerWake && initialReview && joined?.sequence < initialReview.sequence) {
    const readBinding = (role) => {
      const binding = JSON.parse(
        readFileSync(path.join(workspace, 'provider', 'bindings', `${role}.json`), 'utf8')
      );
      const participant = participants[role];
      if (
        binding.schema !== 'ai-peer-review.participant-binding/v1' ||
        binding.review_id !== authority.state.protocol.review_id ||
        binding.role !== role ||
        binding.session_fingerprint !== participant?.session_fingerprint ||
        binding.provider !== 'anthropic' ||
        binding.provider !== participant.provider ||
        binding.host !== 'claude-code' ||
        binding.host !== participant.host ||
        binding.model_id !== participant.model_id ||
        binding.adapter_version !== '1.0.0' ||
        !/^sha256:[a-f0-9]{64}$/.test(binding.evidence_digest ?? '')
      )
        fail('APR_LIVE_BINDING_CONFLICT', `${role}-binding`, 'bound-session-evidence-conflict');
      return binding;
    };
    const authorBinding = readBinding('author');
    const reviewerBinding = readBinding('reviewer');
    if (authorBinding.session_fingerprint === reviewerBinding.session_fingerprint)
      fail('APR_LIVE_BINDING_CONFLICT', 'participant-binding', 'shared-session');
    return {
      schema: 'ai-peer-review.installed-broker-handoff/v1',
      package_head: head,
      package_version: '0.3.0',
      provider: 'anthropic',
      host: 'claude-code',
      surface_version: '2.1.278',
      adapter_version: '1.0.0',
      commit_mode: authority.state.protocol.commit_mode,
      author_session_digest: participants.author.session_fingerprint,
      reviewer_session_digest: participants.reviewer.session_fingerprint,
      author_evidence_source: 'official-exact-session',
      reviewer_evidence_source: 'official-exact-session',
      author_evidence_digest: authorBinding.evidence_digest,
      reviewer_evidence_digest: reviewerBinding.evidence_digest,
      author_wake_operation: authorWake.operation_id,
      reviewer_wake_operation: reviewerWake.operation_id,
      reviewer_join_sequence: joined.sequence,
      initial_reviewer_submission_sequence: initialReview.sequence,
      author_submission_sequence: authorSubmission.sequence,
      return_reviewer_submission_sequence: progress.get(reviewerWake.operation_id).sequence,
      outcome: 'two-way-acknowledged',
    };
  }
  return null;
}
