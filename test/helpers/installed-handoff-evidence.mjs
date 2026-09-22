import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function inspectInstalledHandoff({ installed, workspace, head }) {
  const load = (file) => import(pathToFileURL(path.join(installed, file)));
  const { inspectReviewAuthority } = await load('src/protocol/service.mjs');
  const { readWakeOperation } = await load('src/coordinator/ledger.mjs');
  const authority = inspectReviewAuthority(workspace);
  if (authority.state.protocol.commit_mode !== 'normal') return null;
  const directory = path.join(workspace, 'wake', 'operations');
  const wakes = existsSync(directory)
    ? readdirSync(directory)
        .filter((name) => /^[a-f0-9]{64}\.json$/.test(name))
        .map((name) => readWakeOperation(workspace, `sha256:${name.slice(0, -5)}`))
    : [];
  const acknowledged = wakes.filter((wake) => wake.status === 'acknowledged');
  const authorWake = acknowledged.find((wake) => wake.target_role === 'author');
  const reviewerWake = acknowledged.find((wake) => wake.target_role === 'reviewer');
  const events = authority.events.map((event) => event.type);
  if (authorWake && reviewerWake && events.some((type) => type.startsWith('author-'))) {
    const participants = authority.state.participants;
    if (!participants.author || !participants.reviewer)
      throw new Error('APR_LIVE_BINDING_MISSING: both participants must be bound.');
    const authorBinding = JSON.parse(
      readFileSync(path.join(workspace, 'provider', 'bindings', 'author.json'), 'utf8')
    );
    const reviewerBinding = JSON.parse(
      readFileSync(path.join(workspace, 'provider', 'bindings', 'reviewer.json'), 'utf8')
    );
    if (
      authorBinding.session_fingerprint !== participants.author.session_fingerprint ||
      reviewerBinding.session_fingerprint !== participants.reviewer.session_fingerprint ||
      authorBinding.session_fingerprint === reviewerBinding.session_fingerprint ||
      authorBinding.adapter_version !== '1.0.0' ||
      reviewerBinding.adapter_version !== '1.0.0'
    )
      throw new Error('APR_LIVE_BINDING_CONFLICT: sealed and observed sessions differ.');
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
      outcome: 'two-way-acknowledged',
    };
  }
  return null;
}
