import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { AprError } from '../errors.mjs';
import { resolveReviewPaths } from '../collateral/paths.mjs';
import { productionProviderAdapters } from '../providers/registry.mjs';
import { inspectReviewAuthority, statusReview } from '../protocol/service.mjs';
import { createProviderBridge } from './provider-bridge.mjs';
import { openParticipantBinding, openParticipantSession } from './participant-binding.mjs';
import { acquireProviderResource, providerResourceDigest } from './provider-resources.mjs';
import { startupEvidence } from './registry.mjs';
import { verifyRuntimeImage } from './runtime-image.mjs';
import { createReviewWorker } from './worker.mjs';
import { reconcileReviewerLaunch } from './launch.mjs';

function failure(message) {
  return new AprError('APR_BROKER_START_FAILED', message, {
    recovery: 'Preserve the registered review and restore its exact broker runtime authority.',
  });
}

function joinedLaunchMatches(journal, reviewer) {
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

function recoveryAdapter(registration) {
  return Object.freeze({
    automatic: false,
    async persistRecovery({ status }) {
      const root = path.join(
        registration.project_root,
        '.scratch',
        'peer-review',
        'broker',
        'recovery'
      );
      mkdirSync(root, { recursive: true, mode: 0o700 });
      const file = path.join(root, `${registration.review_id}.json`);
      const value = `${JSON.stringify({
        schema: 'ai-peer-review.broker-recovery/v1',
        review_id: registration.review_id,
        project_digest: registration.project_digest,
        workspace: registration.workspace,
        request_digest: registration.request_digest,
        runtime_digest: registration.runtime.digest,
        protocol_state: status?.state ?? null,
      })}\n`;
      if (existsSync(file)) {
        if (readFileSync(file, 'utf8') !== value) throw failure('Recovery evidence conflicts.');
        return;
      }
      writeFileSync(file, value, { flag: 'wx', mode: 0o600 });
    },
    async close() {},
  });
}

function selectorFor(host) {
  return { codex: 'codex', 'claude-code': 'claude', grok: 'grok' }[host];
}

function sealedAuthority(role, state) {
  const participant = state.participants[role];
  const runtime = state.protocol.startup.runtime;
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

function invitationFor(state) {
  const context = state.protocol.startup.context;
  return resolveReviewPaths({
    root: context.repository_root,
    reviewsRoot: context.reviews_root,
    reviewPathTemplate: context.review_path_template,
    issue: context.issue,
    kind: context.artifact_kind,
    name: context.artifact_name,
    date: context.review_date,
    reviewId: context.review_id,
    recordId: context.record_id ?? context.review_id,
  }).reviewerInvitation.absolute;
}

function eligible(adapter, capability, { launch = false } = {}) {
  return (
    capability?.available === true &&
    capability.automatic === true &&
    typeof adapter?.observeBoundSession === 'function' &&
    typeof adapter?.attestVersion === 'function' &&
    typeof adapter?.observeTransport === 'function' &&
    typeof adapter?.deliverToSession === 'function' &&
    typeof adapter?.reconcileDelivery === 'function' &&
    typeof adapter?.observeResource === 'function' &&
    typeof adapter?.observeResourceRelease === 'function' &&
    (!launch ||
      (capability.reviewerLaunchable === true &&
        typeof adapter.launchReviewer === 'function' &&
        typeof adapter.observeLaunchResource === 'function'))
  );
}

function orderedResources({ participants, capabilities, project, platform }) {
  const userId = platform.userId();
  return participants
    .map(({ role, adapter }) => {
      const descriptor = capabilities[role].resource;
      const key = descriptor.concurrent
        ? `${adapter.provider}:${adapter.host}:${role}`
        : providerResourceDigest({
            userId,
            provider: adapter.provider,
            resourceId: descriptor.resource_id,
          });
      return { role, adapter, descriptor, key, userId, digest: project.digest };
    })
    .sort((left, right) => left.key.localeCompare(right.key));
}

export async function createProductionReviewWorker({
  registration,
  project,
  runtimeImage,
  owner,
  platform,
  clock,
  adapters = productionProviderAdapters(),
  verifyImage = verifyRuntimeImage,
  inspect = inspectReviewAuthority,
  inspectStatus = statusReview,
  startup = startupEvidence,
  openBinding = openParticipantBinding,
  openSession = openParticipantSession,
  acquireResource = acquireProviderResource,
  coordinator,
  invitationPath,
  reconcileLaunch = reconcileReviewerLaunch,
} = {}) {
  if (
    !registration ||
    !project ||
    !runtimeImage ||
    !owner?.verify?.() ||
    !platform ||
    registration.project_root !== project.physicalRoot ||
    registration.project_digest !== project.digest ||
    registration.runtime?.digest !== runtimeImage.digest ||
    !verifyImage(runtimeImage)
  )
    throw failure('Production worker registration or pinned image is invalid.');
  const workspace = registration.workspace;
  const inspected = inspect(workspace);
  const state = inspected.state;
  const evidence = startup(workspace, state);
  const journal = evidence?.journal;
  const runtime = state.protocol.startup?.runtime;
  if (
    state.protocol.review_id !== registration.review_id ||
    journal?.request_digest !== registration.request_digest ||
    (journal?.workspace !== undefined && journal.workspace !== workspace) ||
    runtime?.ownership !== 'broker' ||
    runtime?.project_root_digest !== project.digest ||
    (registration.runtime.digest !== journal.runtime?.digest && journal.runtime !== undefined)
  )
    throw failure('Production worker startup authority differs from registration.');

  const makeRecoveryWorker = () =>
    createReviewWorker({
      registration,
      adapter: recoveryAdapter(registration),
      clock,
      inspectStatus,
    });
  if (
    runtime.transport_mode !== 'automatic-required' ||
    evidence.recovery?.fenced ||
    evidence.recovery?.suspending ||
    !['registered', 'launch-pending', 'launched', 'outcome-unknown'].includes(journal.stage)
  )
    return makeRecoveryWorker();

  const author = state.participants.author;
  const reviewerSelector = runtime.reviewer?.selector;
  const authorSelector = selectorFor(author?.host);
  const authorAdapter =
    adapters instanceof Map ? adapters.get(authorSelector) : adapters?.[authorSelector];
  const reviewerAdapter =
    adapters instanceof Map ? adapters.get(reviewerSelector) : adapters?.[reviewerSelector];
  const authorCapability = await authorAdapter?.observeCapabilities?.();
  const reviewerCapability = await reviewerAdapter?.observeCapabilities?.();
  if (
    !eligible(authorAdapter, authorCapability) ||
    !eligible(reviewerAdapter, reviewerCapability, { launch: true }) ||
    authorAdapter.adapter_version !== runtime.adapter_version ||
    reviewerAdapter.adapter_version !== runtime.adapter_version
  )
    return makeRecoveryWorker();

  const bySelector = new Map([
    [authorSelector, authorAdapter],
    [reviewerSelector, reviewerAdapter],
  ]);
  const now = new Date(clock?.now?.() ?? Date.now());
  const authorBinding = await openBinding({
    workspace,
    role: 'author',
    authority: sealedAuthority('author', state),
    adapters: bySelector,
    projectRoot: project.physicalRoot,
    now,
  });
  if (authorBinding.session_fingerprint !== author.session_fingerprint)
    throw failure('Author binding differs from sealed startup participant.');
  if (state.participants.reviewer) {
    if (!joinedLaunchMatches(journal, state.participants.reviewer))
      throw failure('Reviewer join differs from acknowledged launch session.');
    const reviewerBinding = await openBinding({
      workspace,
      role: 'reviewer',
      authority: sealedAuthority('reviewer', state),
      adapters: bySelector,
      projectRoot: project.physicalRoot,
      now,
    });
    if (reviewerBinding.session_fingerprint !== state.participants.reviewer.session_fingerprint)
      throw failure('Reviewer binding differs from sealed join participant.');
  }

  const leases = new Map();
  const entries = orderedResources({
    participants: [
      { role: 'author', adapter: authorAdapter },
      { role: 'reviewer-launch', adapter: reviewerAdapter },
    ],
    capabilities: { author: authorCapability, 'reviewer-launch': reviewerCapability },
    project,
    platform,
  });
  try {
    for (const entry of entries) {
      const acquired =
        leases.get(entry.key)?.lease ??
        acquireResource(
          {
            identity: {
              userId: entry.userId,
              provider: entry.adapter.provider,
              digest: entry.digest,
            },
            descriptor: entry.descriptor,
            instanceId: owner.instanceId,
            nonce: owner.nonce,
          },
          platform
        );
      leases.set(entry.key, { entry, lease: acquired, prior: null });
    }
  } catch (error) {
    // No provider action has occurred. Each lease verifies the provider is
    // available before releasing an exclusive OS lock and owned record.
    for (const { lease } of [...leases.values()].reverse()) await lease.releaseUnused();
    throw error;
  }
  const lease = {
    beforeDelivery(role, observation) {
      if (!owner.verify()) throw failure('Broker ownership changed before provider action.');
      if (role === 'reviewer' && reviewerCapability.resource.concurrent) {
        const deliveryEntry = orderedResources({
          participants: [{ role: 'reviewer', adapter: reviewerAdapter }],
          capabilities: { reviewer: reviewerCapability },
          project,
          platform,
        })[0];
        if (!leases.has(deliveryEntry.key)) {
          leases.set(deliveryEntry.key, {
            entry: deliveryEntry,
            lease: acquireResource(
              {
                identity: {
                  userId: deliveryEntry.userId,
                  provider: reviewerAdapter.provider,
                  digest: project.digest,
                },
                descriptor: deliveryEntry.descriptor,
                instanceId: owner.instanceId,
                nonce: owner.nonce,
              },
              platform
            ),
            prior: null,
          });
        }
      }
      const entry =
        entries.find(
          (candidate) =>
            candidate.role === role ||
            (role === 'reviewer' &&
              candidate.role === 'reviewer-launch' &&
              !candidate.descriptor.concurrent)
        ) ??
        (role === 'reviewer'
          ? leases.get(`${reviewerAdapter.provider}:${reviewerAdapter.host}:reviewer`)?.entry
          : null);
      const owned = leases.get(entry?.key);
      if (!owned) throw failure('Role has no owned provider resource.');
      owned.lease.beforeDelivery(observation);
      owned.prior = observation;
    },
    async release() {
      for (const { entry, lease: owned, prior } of [...leases.values()].reverse()) {
        if (!prior) {
          await owned.releaseUnused();
          continue;
        }
        const release = await entry.adapter.observeResourceRelease({
          role: entry.role,
          prior,
          workspace,
          projectRoot: project.physicalRoot,
        });
        await owned.release(release);
      }
    },
  };
  const roleAdapters = new Map(
    [authorAdapter, reviewerAdapter].map((adapter) => [
      `${adapter.provider}:${adapter.host}`,
      adapter,
    ])
  );
  const checkedInspect = (root) => {
    const current = inspect(root);
    const currentEvidence = startup(root, current.state);
    const reviewer = current.state.participants.reviewer;
    if (reviewer && !joinedLaunchMatches(currentEvidence?.journal, reviewer))
      throw failure('Current reviewer differs from exact launch acknowledgment.');
    return current;
  };
  const bridge = createProviderBridge({
    registration,
    authority: { inspect: checkedInspect, status: inspectStatus },
    bindings: { open: openSession },
    adapters: roleAdapters,
    lease,
    owner,
    clock,
    launchReviewer: async ({ operationId }) => {
      if (!owner.verify()) throw failure('Broker ownership changed before reviewer launch.');
      return reviewerAdapter.launchReviewer({
        invitationPath: invitationPath ?? invitationFor(state),
        expected: {
          ...runtime.reviewer,
          adapter_version: runtime.adapter_version,
        },
        effort: runtime.reviewer.effort,
        operationId,
        authorSessionFingerprint: author.session_fingerprint,
        scratchRoot: workspace,
      });
    },
    reconcileLaunch: async () => {
      if (!owner.verify()) throw failure('Broker ownership changed before launch reconciliation.');
      if (
        typeof reconcileLaunch !== 'function' ||
        typeof reviewerAdapter.reconcileReviewerLaunch !== 'function'
      )
        return { status: 'outcome-unknown' };
      return reconcileLaunch({
        registration,
        observe: ({ operationId }) =>
          reviewerAdapter.reconcileReviewerLaunch({
            operationId,
            scratchRoot: workspace,
            expected: { ...runtime.reviewer, adapter_version: runtime.adapter_version },
            authorSessionFingerprint: author.session_fingerprint,
            projectRoot: project.physicalRoot,
          }),
      });
    },
    resourceObservation: (input) =>
      reviewerAdapter.observeLaunchResource({ workspace, operationId: input.operationId }),
  });
  return createReviewWorker({
    registration,
    adapter: bridge,
    resourceLease: {
      beforeDelivery: (observation) => lease.beforeDelivery('reviewer-launch', observation),
      release: () => lease.release(),
    },
    clock,
    inspectStatus,
    ...(coordinator ? { coordinator } : {}),
  });
}
