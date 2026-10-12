import {
  selectPortableParticipantBindingsCore,
  joinedPortableLaunchMatchesCore,
} from './portable-participant-binding.mjs';
import {
  existsSync,
  mkdirSync as rawMkdirSync,
  readFileSync,
  writeFileSync as rawWriteFileSync,
} from 'node:fs';

import path from 'node:path';

import { AprError } from '../errors.mjs';

import { PROTOCOL_STATES } from '../protocol/format-authority.mjs';

import { resolveReviewPaths } from '../collateral/paths.mjs';

import { productionProviderAdapters } from '../providers/registry.mjs';

import { inspectReviewAuthority, statusReview } from '../protocol/service.mjs';

import { createProviderBridge } from './provider-bridge.mjs';

import { openParticipantBinding, openParticipantSession } from './participant-binding.mjs';

import {
  acquireProviderResource as rawAcquireProviderResource,
  providerResourceDigest,
} from './provider-resources.mjs';

import { isPortableOperations, initializePortableOperations } from './portable-platform.mjs';
import { currentOperationAuthorityContext } from '../startup/authority-fence.mjs';
import { startupEvidence } from './registry.mjs';

import { verifyRuntimeImage } from './runtime-image.mjs';

import { createReviewWorker } from './worker.mjs';

import { reconcileReviewerLaunch } from './launch.mjs';

// @story #136
export function createProductionWorkerOperations({
  performCurrentOperationEffect,
  ownerContext = async () => undefined,
  restorationOwner = () => false,
}) {
  const workerResources = new WeakMap();
  const operationalResources = new WeakMap();
  const retainedAcquisitions = new Set();
  const mkdirSync = async (...args) =>
    await performCurrentOperationEffect(() => rawMkdirSync(...args));
  const writeFileSync = async (...args) =>
    await performCurrentOperationEffect(() => rawWriteFileSync(...args));
  const acquireProviderResource = async (...args) => {
    // Concurrent leases only validate identity and update in-memory session state.
    // Repository write admission here would age fresh provider observations before
    // validation; provider actions retain their independent effect fences.
    if (args[0]?.descriptor?.concurrent === true) {
      const lease = await rawAcquireProviderResource(...args);
      operationalResources.set(lease, lease);
      return lease;
    }
    const lease = await performCurrentOperationEffect(() => rawAcquireProviderResource(...args));
    const wrapped = Object.freeze(
      Object.defineProperties(
        {},
        Object.fromEntries(
          Object.entries(Object.getOwnPropertyDescriptors(lease)).map(([name, descriptor]) => [
            name,
            descriptor.get
              ? { enumerable: true, get: () => lease[name] }
              : {
                  enumerable: true,
                  value:
                    typeof descriptor.value === 'function' && name !== 'assertDeliveryFresh'
                      ? async (...methodArgs) =>
                          await performCurrentOperationEffect(() =>
                            descriptor.value.apply(lease, methodArgs)
                          )
                      : descriptor.value,
                },
          ])
        )
      )
    );
    operationalResources.set(wrapped, lease);
    return wrapped;
  };

  function failure(message) {
    return new AprError('APR_BROKER_START_FAILED', message, {
      recovery: 'Preserve the registered review and restore its exact broker runtime authority.',
    });
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
        await mkdirSync(root, { recursive: true, mode: 0o700 });
        const file = path.join(root, `${registration.review_id}.json`);
        const observation = {
          schema: 'ai-peer-review.broker-recovery/v1',
          review_id: registration.review_id,
          project_digest: registration.project_digest,
          workspace: registration.workspace,
          request_digest: registration.request_digest,
          runtime_digest: registration.runtime.digest,
          protocol_state: status?.state ?? null,
        };
        if (existsSync(file)) {
          let prior;
          let bytes;
          try {
            bytes = readFileSync(file, 'utf8');
            prior = JSON.parse(bytes);
          } catch {
            throw failure('Recovery evidence conflicts.');
          }
          if (
            !prior ||
            typeof prior !== 'object' ||
            Array.isArray(prior) ||
            `${JSON.stringify(prior)}\n` !== bytes ||
            Object.keys(prior).sort().join('\n') !== Object.keys(observation).sort().join('\n') ||
            (prior.protocol_state !== null && !PROTOCOL_STATES.includes(prior.protocol_state)) ||
            Object.entries(observation).some(
              ([key, value]) => key !== 'protocol_state' && prior[key] !== value
            )
          )
            throw failure('Recovery evidence conflicts.');
          // The first protocol state is historical. Event authority may progress
          // while recovery identity and these original bytes stay fixed.
          return;
        }
        await writeFileSync(file, `${JSON.stringify(observation)}\n`, { flag: 'wx', mode: 0o600 });
      },
      async close() {},
    });
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

  async function orderedResources({ participants, capabilities, project, platform }) {
    // A later independent worker request uses its actual new admission; the
    // original acquisition object cannot extend an in-flight request budget.
    if (isPortableOperations(platform))
      platform = await initializePortableOperations(await currentOperationAuthorityContext());
    const userId = await platform.userId();
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
        return { role, adapter, descriptor, key, userId, digest: project.digest, platform };
      })
      .sort((left, right) => left.key.localeCompare(right.key));
  }

  async function createProductionReviewWorker({
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
      !(await owner?.verify?.(await ownerContext(owner))) ||
      !platform ||
      registration.project_root !== project.physicalRoot ||
      registration.project_digest !== project.digest ||
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

    const retainWorker = (worker, resources) => {
      workerResources.set(worker, resources);
      return worker;
    };
    const makeRecoveryWorker = () =>
      retainWorker(
        createReviewWorker({
          deferCoordination: restorationOwner(owner),
          registration,
          adapter: recoveryAdapter(registration),
          clock,
          inspectStatus,
        }),
        []
      );
    // Historical image equality is provenance, not executable selection.
    // The supported authority parser and exact journal/registration checks above
    // remain mandatory before current adapters may continue the review.
    if (
      runtime.transport_mode !== 'automatic-required' ||
      evidence.recovery?.fenced ||
      evidence.recovery?.suspending ||
      !['registered', 'launch-pending', 'launched', 'outcome-unknown'].includes(journal.stage)
    )
      return makeRecoveryWorker();

    const author = state.participants.author;
    const selected = await selectPortableParticipantBindingsCore({
      workspace,
      project,
      state,
      journal,
      recovery: evidence.recovery,
      adapters,
      now: new Date(clock?.now?.() ?? Date.now()),
      openBinding,
    });
    if (selected.status !== 'automatic') return makeRecoveryWorker();
    const { authorAdapter, reviewerAdapter, authorCapability, reviewerCapability } = selected;

    const leases = new Map();
    const issuedResources = new Set();
    const entries = await orderedResources({
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
          (await acquireResource(
            {
              identity: {
                userId: entry.userId,
                provider: entry.adapter.provider,
                digest: entry.digest,
              },
              reconcileProviderResource:
                typeof entry.adapter.reconcileProviderResource === 'function'
                  ? (value) =>
                      entry.adapter.reconcileProviderResource({
                        ...value,
                        role: entry.role,
                        workspace,
                        projectRoot: project.physicalRoot,
                      })
                  : undefined,
              descriptor: entry.descriptor,
              instanceId: owner.instanceId,
              nonce: owner.nonce,
            },
            entry.platform
          ));
        leases.set(entry.key, { entry, lease: acquired, prior: null });
        issuedResources.add(operationalResources.get(acquired) ?? acquired);
      }
    } catch (error) {
      // No provider action has occurred. Each lease verifies the provider is
      // available before releasing an exclusive OS lock and owned record.
      let cleanupFailure;
      for (const [key, { lease }] of [...leases].reverse()) {
        try {
          await lease.releaseUnused();
          leases.delete(key);
        } catch (cleanup) {
          cleanupFailure ??= cleanup;
        }
      }
      if (leases.size) {
        retainedAcquisitions.add(leases);
        error.cause = cleanupFailure;
        error.details = {
          ...error.details,
          reason: 'provider-resource-retained',
          outstandingObligations: [
            ...(error.details?.outstandingObligations ?? []),
            ...[...leases.keys()].map((resourceKey) => ({
              name: 'provider-resource-retained',
              resourceKey,
              outcome: 'release-unproved',
            })),
          ],
        };
      }
      throw error;
    }
    const lease = {
      async beforeDelivery(role, observation) {
        if (!(await owner.verify(await ownerContext(owner))))
          throw failure('Broker ownership changed before provider action.');
        if (role === 'reviewer' && reviewerCapability.resource.concurrent) {
          const deliveryEntry = (
            await orderedResources({
              participants: [{ role: 'reviewer', adapter: reviewerAdapter }],
              capabilities: { reviewer: reviewerCapability },
              project,
              platform,
            })
          )[0];
          if (!leases.has(deliveryEntry.key)) {
            leases.set(deliveryEntry.key, {
              entry: deliveryEntry,
              lease: await acquireResource(
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
                deliveryEntry.platform
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
        await owned.lease.beforeDelivery(observation);
        owned.prior = observation;
      },
      assertDeliveryFresh(role) {
        const owned = [...leases.values()].find(
          ({ entry }) =>
            entry.role === role ||
            (role === 'reviewer' &&
              entry.role === 'reviewer-launch' &&
              !entry.descriptor.concurrent)
        );
        if (!owned?.prior)
          throw failure('No checked resource observation for this provider action.');
        return owned.lease.assertDeliveryFresh?.();
      },
      async release() {
        for (const { entry, lease: owned, prior } of [...leases.values()].reverse()) {
          if (!prior) {
            await owned.releaseUnused();
            leases.delete(entry.key);
            continue;
          }
          const release = await entry.adapter.observeResourceRelease({
            role: entry.role,
            prior,
            workspace,
            projectRoot: project.physicalRoot,
          });
          await owned.release(release);
          leases.delete(entry.key);
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
      if (reviewer && !joinedPortableLaunchMatchesCore(currentEvidence?.journal, reviewer))
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
        if (!(await owner.verify(await ownerContext(owner))))
          throw failure('Broker ownership changed before reviewer launch.');
        lease.assertDeliveryFresh('reviewer-launch');
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
        if (!(await owner.verify(await ownerContext(owner))))
          throw failure('Broker ownership changed before launch reconciliation.');
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
    return retainWorker(
      createReviewWorker({
        deferCoordination: restorationOwner(owner),
        registration,
        adapter: bridge,
        resourceLease: {
          beforeDelivery: (observation) => lease.beforeDelivery('reviewer-launch', observation),
          assertDeliveryFresh: () => lease.assertDeliveryFresh('reviewer-launch'),
          release: () => lease.release(),
        },
        clock,
        inspectStatus,
        ...(coordinator ? { coordinator } : {}),
      }),
      issuedResources
    );
  }

  return Object.freeze({
    createProductionReviewWorker,
    get retainedAcquisitions() {
      return Object.freeze(
        [...retainedAcquisitions].flatMap((leases) =>
          [...leases.keys()].map((resourceKey) =>
            Object.freeze({ resourceKey, outcome: 'release-unproved' })
          )
        )
      );
    },
    inspectWorkerResources(worker) {
      const resources = workerResources.get(worker);
      if (!resources) throw failure('Genuine worker resource binding is required.');
      return Object.freeze({ verified: false, leases: Object.freeze([...resources]) });
    },
  });
}
