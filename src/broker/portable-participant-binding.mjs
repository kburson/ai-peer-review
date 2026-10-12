import { createHash } from 'node:crypto';
import path from 'node:path';
import { inspectOwnerElectionPaths } from './ownership-election.mjs';
import { initializePortableOperations } from './portable-platform.mjs';
import { canonicalPortableProjectIdentity } from './identity.mjs';
import { inspectOwnerElectionLease } from './ownership-election.mjs';
import {
  assertCurrentOperationAuthority,
  currentOperationAuthorityContext,
} from '../startup/authority-fence.mjs';
import { inspectReviewAuthority } from '../protocol/authority-reader.mjs';
import { canonicalProjection } from '../protocol/canonical-projection.mjs';
import { validBrokerRegistrationRecordCore } from './registration-record.mjs';
import { startupEvidence } from './startup-evidence-reader.mjs';
import { productionProviderAdapters } from '../providers/registry.mjs';
import { openParticipantBinding } from './participant-binding.mjs';
// @story #209
// Shared read-only selection core. Returned projections are never operational membership.
import { AprError } from '../errors.mjs';
function failure(message) {
  return new AprError('APR_BROKER_START_FAILED', message, {
    recovery: 'Preserve the exact participant bindings and startup authority.',
  });
}
function selectorFor(host) {
  return { codex: 'codex', 'claude-code': 'claude', grok: 'grok' }[host];
}
export function portableParticipantAuthorityCore(role, state) {
  const participant = state.participants[role],
    runtime = state.protocol.startup.runtime;
  return {
    review_id: state.protocol.review_id,
    selector: selectorFor(participant.host),
    provider: participant.provider,
    host: participant.host,
    model_id: participant.model_id,
    adapter_version: runtime.adapter_version,
    operation_id: `${role === 'author' ? 'start' : 'join'}:${state.protocol.review_id}`,
  };
}
export function joinedPortableLaunchMatchesCore(journal, reviewer) {
  const operation = journal?.provider_operation;
  return (
    (journal?.stage === 'launch-pending' &&
      operation?.status === 'reserved' &&
      operation.session_fingerprint === null) ||
    (journal?.stage === 'outcome-unknown' &&
      operation?.status === 'outcome-unknown' &&
      operation.session_fingerprint === null) ||
    (journal?.stage === 'launched' &&
      operation?.status === 'acknowledged' &&
      operation.session_fingerprint === reviewer.session_fingerprint)
  );
}
function eligible(adapter, capability, launch = false) {
  return (
    capability?.available === true &&
    capability.automatic === true &&
    [
      'observeBoundSession',
      'attestVersion',
      'observeTransport',
      'deliverToSession',
      'reconcileDelivery',
      'observeResource',
      'observeResourceRelease',
    ].every((name) => typeof adapter?.[name] === 'function') &&
    (!launch ||
      (capability.reviewerLaunchable === true &&
        typeof adapter.launchReviewer === 'function' &&
        typeof adapter.observeLaunchResource === 'function'))
  );
}
export async function selectPortableParticipantBindingsCore({
  workspace,
  project,
  state,
  journal,
  recovery,
  adapters,
  openBinding,
  now,
} = {}) {
  const runtime = state?.protocol?.startup?.runtime;
  if (
    runtime?.transport_mode !== 'automatic-required' ||
    recovery?.fenced ||
    recovery?.suspending ||
    !['registered', 'launch-pending', 'launched', 'outcome-unknown'].includes(journal?.stage)
  )
    return Object.freeze({ verified: false, status: 'recovery' });
  const author = state.participants.author;
  const authorSelector = selectorFor(author?.host),
    reviewerSelector = runtime.reviewer?.selector;
  const get = (selector) =>
    adapters instanceof Map ? adapters.get(selector) : adapters?.[selector];
  const authorAdapter = get(authorSelector),
    reviewerAdapter = get(reviewerSelector);
  const authorCapability = await authorAdapter?.observeCapabilities?.();
  const reviewerCapability = await reviewerAdapter?.observeCapabilities?.();
  if (
    !eligible(authorAdapter, authorCapability) ||
    !eligible(reviewerAdapter, reviewerCapability, true) ||
    authorAdapter.adapter_version !== runtime.adapter_version ||
    reviewerAdapter.adapter_version !== runtime.adapter_version
  )
    return Object.freeze({ verified: false, status: 'recovery' });
  if (typeof openBinding !== 'function')
    throw failure('Exact participant binding reader is unavailable.');
  const bySelector = new Map([
    [authorSelector, authorAdapter],
    [reviewerSelector, reviewerAdapter],
  ]);
  const authorBinding = await openBinding({
    workspace,
    role: 'author',
    authority: portableParticipantAuthorityCore('author', state),
    adapters: bySelector,
    projectRoot: project.physicalRoot,
    now,
  });
  if (authorBinding.session_fingerprint !== author.session_fingerprint)
    throw failure('Author binding differs from sealed startup participant.');
  let reviewerBinding = null;
  if (state.participants.reviewer) {
    if (!joinedPortableLaunchMatchesCore(journal, state.participants.reviewer))
      throw failure('Reviewer join differs from acknowledged launch session.');
    reviewerBinding = await openBinding({
      workspace,
      role: 'reviewer',
      authority: portableParticipantAuthorityCore('reviewer', state),
      adapters: bySelector,
      projectRoot: project.physicalRoot,
      now,
    });
    if (reviewerBinding.session_fingerprint !== state.participants.reviewer.session_fingerprint)
      throw failure('Reviewer binding differs from sealed join participant.');
  }
  return Object.freeze({
    verified: false,
    status: 'automatic',
    authorAdapter,
    reviewerAdapter,
    authorCapability,
    reviewerCapability,
    authorBinding,
    reviewerBinding,
  });
}

const portableBindings = new WeakMap();
function stale(reason) {
  return new AprError('APR_BROKER_STALE', 'Existing participant reconciliation is unproved.', {
    details: { reason, retrySafe: false },
    recovery: 'Preserve the exact operation and participant sessions.',
  });
}
async function assertBindingElection({ lease, paths, project, signal, deadline }) {
  await inspectOwnerElectionLease({ lease, paths, signal, deadline });
  const owner = await inspectOwnerElectionPaths({ paths, signal, deadline });
  const worktree = path.resolve(owner.privateRoot, '../../..');
  if (project?.physicalRoot !== worktree) throw stale('reconciliation-project-unproved');
  const operations = await initializePortableOperations({ signal, deadline });
  const observed = await canonicalPortableProjectIdentity({
    cwd: worktree,
    operations,
    signal,
    deadline,
  });
  if (observed.digest !== project.digest) throw stale('reconciliation-project-unproved');

  await assertCurrentOperationAuthority();
  const current = await currentOperationAuthorityContext();
  if (current.signal !== signal || current.deadline !== deadline)
    throw stale('reconciliation-context-unproved');
}
function inspectBindingReview(registration, project) {
  if (
    !validBrokerRegistrationRecordCore(registration) ||
    registration.project_digest !== project?.digest ||
    registration.project_root !== project?.physicalRoot
  )
    throw stale('review-authority-unproved');
  const authority = inspectReviewAuthority(registration.workspace);
  const state = authority.state;
  const evidence = startupEvidence(registration.workspace, state);
  if (
    state.protocol.review_id !== registration.review_id ||
    evidence?.journal?.request_digest !== registration.request_digest ||
    evidence.journal.workspace !== registration.workspace ||
    state.protocol.startup?.runtime?.ownership !== 'broker' ||
    state.protocol.startup.runtime.project_root_digest !== project.digest ||
    state.protocol.startup.context.repository_root !== project.physicalRoot ||
    evidence.journal.runtime?.digest !== registration.runtime.digest
  )
    throw stale('review-authority-unproved');
  return { authority, state, evidence };
}
// Fixed stock facade: no caller adapter, reader, worker or provider-resource acquisition is accepted.
export async function openPortableParticipantBinding(input = {}) {
  if (Object.keys(input).sort().join(',') !== 'deadline,lease,paths,project,registration,signal')
    throw stale('reconciliation-context-unproved');
  const { registration, project, lease, paths, signal, deadline } = input;
  await assertBindingElection({ lease, paths, project, signal, deadline });
  const context = Object.freeze({ signal, deadline });
  const before = inspectBindingReview(registration, project);
  const selected = await selectPortableParticipantBindingsCore({
    workspace: registration.workspace,
    project,
    state: before.state,
    journal: before.evidence.journal,
    recovery: before.evidence.recovery,
    adapters: productionProviderAdapters(),
    openBinding: openParticipantBinding,
    now: new Date(),
  });
  if (selected.status !== 'automatic') throw stale('existing-effect-reconciliation-unproved');
  await assertBindingElection({ lease, paths, project, ...context });
  const after = inspectBindingReview(registration, project);
  if (
    canonicalProjection(before.state) !== canonicalProjection(after.state) ||
    canonicalProjection(before.evidence) !== canonicalProjection(after.evidence)
  )
    throw stale('reconciliation-generation-changed');
  const binding = Object.freeze({ verified: true, reviewId: registration.review_id });
  portableBindings.set(binding, {
    registration: Object.freeze({
      ...registration,
      runtime: Object.freeze({ ...registration.runtime }),
    }),
    project: Object.freeze({ ...project }),
    lease,
    paths,
    context,
    state: after.state,
    evidence: after.evidence,
    selected,
  });
  return binding;
}
export async function readPortableParticipantBinding(input = {}) {
  if (Object.keys(input).sort().join(',') !== 'binding,deadline,signal')
    throw stale('reconciliation-context-unproved');
  const record = portableBindings.get(input.binding);
  if (!record) throw stale('reconciliation-binding-unproved');
  if (input.signal !== record.context.signal || input.deadline !== record.context.deadline)
    throw stale('reconciliation-context-unproved');
  await assertBindingElection({
    lease: record.lease,
    paths: record.paths,
    project: record.project,
    ...record.context,
  });
  const fresh = inspectBindingReview(record.registration, record.project);
  if (
    canonicalProjection(fresh.state) !== canonicalProjection(record.state) ||
    canonicalProjection(fresh.evidence) !== canonicalProjection(record.evidence)
  )
    throw stale('reconciliation-generation-changed');
  return Object.freeze({
    registration: record.registration,
    project: record.project,
    state: fresh.state,
    evidence: fresh.evidence,
    selected: record.selected,
  });
}

function wakeConflict(message) {
  throw new AprError('APR_IDENTITY_CONFLICT', message, {
    recovery: 'Preserve the wake operation and re-observe the exact sealed participant session.',
  });
}
function wakeDigest(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

export function assertPortableWakeBindingCore(input, inspected) {
  const protocol = inspected?.state?.protocol;
  const participant = inspected?.state?.participants?.[input?.target_role];
  if (
    !new Set(['author', 'reviewer']).has(input?.target_role) ||
    !participant ||
    protocol?.current_actor !== input.target_role ||
    protocol.revision !== input.expected_revision ||
    protocol.review_id !== input.capsule?.review_id ||
    input.capsule?.target_role !== input.target_role ||
    input.capsule?.expected_revision !== input.expected_revision ||
    !/^sha256:[0-9a-f]{64}$/u.test(input.target_session_fingerprint ?? '') ||
    participant.session_fingerprint !== input.target_session_fingerprint ||
    !/^sha256:[0-9a-f]{64}$/u.test(input.capsule_digest ?? '') ||
    input.capsule_digest !== wakeDigest(`${canonicalProjection(input.capsule)}\n`) ||
    input.operation_id !==
      wakeDigest(
        canonicalProjection({
          review_id: protocol.review_id,
          protocol_revision: protocol.revision,
          target_role: input.target_role,
          session_fingerprint: participant.session_fingerprint,
        })
      )
  )
    wakeConflict('Wake operation differs from sealed role, revision, capsule, or session.');
}
