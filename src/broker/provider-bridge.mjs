import { createHash } from 'node:crypto';

import { AprError } from '../errors.mjs';
import { inspectReviewAuthority, statusReview, canonicalProjection } from '../protocol/service.mjs';
import { validateAutomaticParticipant } from '../transport/registry.mjs';
import { openParticipantSession } from './participant-binding.mjs';

const ROLE = new Set(['author', 'reviewer']);
const SELECTOR = Object.freeze({ codex: 'codex', 'claude-code': 'claude', grok: 'grok' });
const HASH = /^sha256:[0-9a-f]{64}$/;

function conflict(message) {
  throw new AprError('APR_IDENTITY_CONFLICT', message, {
    recovery: 'Preserve the wake operation and re-observe the exact sealed participant session.',
  });
}

function unavailable(message) {
  throw new AprError('APR_TRANSPORT_UNAVAILABLE', message, {
    recovery: 'Use governed manual recovery or restore both verified resident provider sessions.',
  });
}

function digest(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function defaultRoleAuthority(role, inspected) {
  const state = inspected.state;
  const participant = state.participants[role];
  const runtime = state.protocol.startup?.runtime;
  const selector = SELECTOR[participant?.host];
  if (!participant || !runtime || !selector) conflict('Role has no sealed provider authority.');
  return Object.freeze({
    review_id: state.protocol.review_id,
    selector,
    provider: participant.provider,
    host: participant.host,
    model_id: participant.model_id,
    adapter_version: runtime.adapter_version,
    operation_id: `${role === 'author' ? 'start' : 'join'}:${state.protocol.review_id}`,
  });
}

function checkWake(input, inspected) {
  const protocol = inspected?.state?.protocol;
  const participant = inspected?.state?.participants?.[input?.target_role];
  if (
    !ROLE.has(input?.target_role) ||
    !participant ||
    protocol?.current_actor !== input.target_role ||
    protocol.revision !== input.expected_revision ||
    protocol.review_id !== input.capsule?.review_id ||
    input.capsule?.target_role !== input.target_role ||
    input.capsule?.expected_revision !== input.expected_revision ||
    !HASH.test(input.target_session_fingerprint ?? '') ||
    participant.session_fingerprint !== input.target_session_fingerprint ||
    !HASH.test(input.capsule_digest ?? '') ||
    input.capsule_digest !== digest(`${canonicalProjection(input.capsule)}\n`) ||
    input.operation_id !==
      digest(
        canonicalProjection({
          review_id: protocol.review_id,
          protocol_revision: protocol.revision,
          target_role: input.target_role,
          session_fingerprint: participant.session_fingerprint,
        })
      )
  )
    conflict('Wake operation differs from sealed role, revision, capsule, or session.');
}

function adapterFor(adapters, binding) {
  const adapter =
    adapters instanceof Map
      ? adapters.get(`${binding.provider}:${binding.host}`)
      : adapters?.[`${binding.provider}:${binding.host}`];
  if (!adapter) unavailable('Role-specific provider adapter is unavailable.');
  return adapter;
}

export function createProviderBridge({
  registration,
  authority = {},
  bindings = {},
  adapters,
  lease,
  owner,
  launchReviewer,
  resourceObservation,
  clock,
} = {}) {
  const workspace = registration?.workspace;
  if (typeof workspace !== 'string' || !owner || !adapters || !lease)
    throw new TypeError('provider-bridge: registration, owner, adapters, and lease required');
  const inspect = authority.inspect ?? inspectReviewAuthority;
  const status = authority.status ?? statusReview;
  const forRole = authority.forRole ?? defaultRoleAuthority;
  const open = bindings.open ?? openParticipantSession;
  const now = () => new Date(clock?.now?.() ?? Date.now());

  const guarded = () => {
    const inspected = inspect(workspace);
    const recovery = status(workspace, { now: now() })?.review?.recovery;
    if (recovery?.fenced || recovery?.suspending)
      conflict('Wake delivery is fenced for manual recovery.');
    return inspected;
  };

  const bound = async (role, inspected) => {
    const binding = await open({
      workspace,
      role,
      authority: forRole(role, inspected),
      adapters:
        adapters instanceof Map
          ? new Map(
              [...adapters.values()].filter(Boolean).map((adapter) => [adapter.selector, adapter])
            )
          : adapters,
      projectRoot: inspected.state.protocol.startup?.context?.repository_root,
      now: now(),
    });
    if (binding.session_fingerprint !== inspected.state.participants[role]?.session_fingerprint)
      conflict('Re-observed role binding differs from event authority.');
    return { binding, adapter: adapterFor(adapters, binding) };
  };

  const observeRole = async (role, inspected) => {
    const { binding, adapter } = await bound(role, inspected);
    if (typeof adapter.observeTransport !== 'function')
      unavailable('Role-specific resident health observation is unavailable.');
    const observation = await adapter.observeTransport({
      binding,
      workspace,
      projectRoot: inspected.state.protocol.startup?.context?.repository_root,
      now: now(),
    });
    if (observation?.session_fingerprint !== binding.session_fingerprint)
      conflict('Resident transport observation differs from bound provider session.');
    validateAutomaticParticipant(
      (({ session_fingerprint: ignored, ...value }) => {
        void ignored;
        return value;
      })(observation),
      now().valueOf()
    );
    return { binding, adapter, observation };
  };

  const observation = async () => {
    const inspected = guarded();
    const current = inspected.state.protocol.current_actor;
    if (
      !ROLE.has(current) ||
      !inspected.state.participants.author ||
      !inspected.state.participants.reviewer
    )
      unavailable('Both participant bindings are required for automatic delivery.');
    const author = await observeRole('author', inspected);
    const reviewer = await observeRole('reviewer', inspected);
    return current === 'author' ? author.observation : reviewer.observation;
  };

  const target = async (input) => {
    const inspected = guarded();
    checkWake(input, inspected);
    const result = await observeRole(input.target_role, inspected);
    if (result.binding.session_fingerprint !== input.target_session_fingerprint)
      conflict('Wake target differs from sealed participant.');
    return {
      ...result,
      projectRoot: inspected.state.protocol.startup?.context?.repository_root,
    };
  };

  const bridge = {
    bootstrap: true,
    automatic: true,
    coordinatorInput: Object.freeze({
      owner: Object.freeze({ kind: 'app-host', pid: process.pid }),
      leaseOptions: Object.freeze({ instanceId: owner.instanceId, nonce: owner.nonce }),
      observe: observation,
    }),
    observation,
    async deliver(input) {
      const selected = await target(input);
      if (typeof selected.adapter.deliverToSession !== 'function')
        unavailable('Role-specific exact wake is unavailable.');
      if (typeof selected.adapter.observeResource !== 'function')
        unavailable('Role-specific provider resource observation is unavailable.');
      const resource = await selected.adapter.observeResource({
        binding: selected.binding,
        role: input.target_role,
        workspace,
        projectRoot: selected.projectRoot,
      });
      lease.beforeDelivery(input.target_role, resource);
      // Re-open event authority after the lease check, immediately before provider action.
      checkWake(input, guarded());
      return selected.adapter.deliverToSession({
        binding: selected.binding,
        wakeOperationId: input.operation_id,
        capsule: input.capsule,
        capsuleDigest: input.capsule_digest,
        expectedRevision: input.expected_revision,
        workspace,
        projectRoot: selected.projectRoot,
      });
    },
    async reconcile(input) {
      const selected = await target(input);
      if (typeof selected.adapter.reconcileDelivery !== 'function')
        return { status: 'outcome-unknown', reason: 'provider-reconciliation-unavailable' };
      const result = await selected.adapter.reconcileDelivery({
        binding: selected.binding,
        wakeOperationId: input.operation_id,
        capsuleDigest: input.capsule_digest,
        workspace,
        projectRoot: selected.projectRoot,
      });
      return ['acknowledged', 'not-submitted', 'outcome-unknown'].includes(result?.status)
        ? result
        : { status: 'outcome-unknown', reason: 'provider-reconciliation-invalid' };
    },
    async close() {},
  };
  if (typeof launchReviewer === 'function' && typeof resourceObservation === 'function') {
    bridge.launchReviewer = launchReviewer;
    bridge.resourceObservation = resourceObservation;
  }
  return Object.freeze(bridge);
}
