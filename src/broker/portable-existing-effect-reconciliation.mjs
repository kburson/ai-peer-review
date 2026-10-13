// @story #209
// Fixed pre-creation producer. It never constructs a worker, reserves an operation or acquires resources.
import path from 'node:path';
import { AprError } from '../errors.mjs';
import { PROTOCOL_STATES } from '../protocol/format-authority.mjs';
import { inspectOwnerElectionLease } from './ownership-election.mjs';
import {
  readReconciliationInventory,
  assertReconciliationExistingEffectScope,
  observeReconciliationInventory,
  assertReconciliationInventory,
  retainReconciliationTransitionAnchors,
} from './portable-reconciliation-inventory.mjs';
import { comparePortableExistingEffectTransitionCore } from './portable-restoration-transition.mjs';
import { validBrokerRegistrationRecordCore } from './registration-record.mjs';
import { readPortableReconciliationProjection } from './portable-reconciliation-projection.mjs';
import { classifyPortableReconciliationCore } from './portable-reconciliation-policy.mjs';
import { readStartupJournal, inspectStartupAuthority } from './startup-evidence-reader.mjs';
import { inspectReviewAuthority } from '../protocol/authority-reader.mjs';
import { verifyRuntimeImage } from './runtime-image.mjs';
import { readManualLaunchHistory } from '../provider/manual-launch-ledger.mjs';
import { allWakeOperations, readWakeOperation, appendWakeOutcome } from '../coordinator/ledger.mjs';
import {
  reconcileExistingWakeOperationCore,
  existingWakeDeliveryInputCore,
} from '../coordinator/existing-effect-core.mjs';
import { reconcileReviewerLaunch } from './launch.mjs';
import {
  openPortableParticipantBinding,
  readPortableParticipantBinding,
  portableParticipantAuthorityCore,
  assertPortableWakeBindingCore,
} from './portable-participant-binding.mjs';
import { openParticipantSession } from './participant-binding.mjs';
import {
  withOperationAuthority,
  performCurrentOperationEffect,
} from '../startup/authority-fence.mjs';

const retained = (name) =>
  Object.freeze({
    status: 'unknown',
    verified: false,
    reason: name,
    outstandingObligations: Object.freeze([Object.freeze({ name, outcome: 'retained-unproved' })]),
  });
const completedTransitions = new WeakMap();
const retainedCompletedTransitions = new Set();
const partialTransitions = new Set();
export async function readPortableExistingEffectTransition(input = {}) {
  const record = completedTransitions.get(input.result);
  if (
    Object.keys(input).sort().join(',') !== 'deadline,inventory,lease,paths,result,signal' ||
    !record ||
    input.inventory !== record.beforeInventory ||
    input.lease !== record.lease ||
    input.paths !== record.paths ||
    input.signal !== record.signal ||
    input.deadline !== record.deadline
  )
    refuse('reconciliation-observation-unproved');
  await inspectOwnerElectionLease({
    lease: record.lease,
    paths: record.paths,
    signal: record.signal,
    deadline: record.deadline,
  });
  await assertReconciliationInventory({
    observation: record.after,
    paths: record.paths,
    signal: record.signal,
    deadline: record.deadline,
  });
  return record.after;
}
function refuse(reason) {
  throw new AprError('APR_BROKER_STALE', 'Existing-effect reconciliation is unproved.', {
    details: { reason, retrySafe: false },
    recovery: 'Preserve the exact operation and restore its official observation capability.',
  });
}
function parse(bytes) {
  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch {
    throw refuse('reconciliation-namespace-unproved');
  }
}
// Read-only selection over already parsed data; this core result grants no effect authority.
export function selectPortableExistingEffectCandidatesCore(data, projection) {
  const registrations = new Map(),
    reviews = new Map(),
    recovery = [];
  for (const namespace of data.namespaces) {
    if (namespace.kind === 'registrations')
      for (const file of namespace.files) {
        const record = parse(file.bytes);
        if (
          !validBrokerRegistrationRecordCore(record) ||
          record.project_digest !== data.project.digest ||
          record.project_root !== data.project.physicalRoot ||
          file.name !== record.review_id + '.json' ||
          registrations.has(record.review_id)
        )
          refuse('registry-reconciliation-unproved');
        registrations.set(
          record.review_id,
          Object.freeze({ ...record, runtime: Object.freeze({ ...record.runtime }) })
        );
      }
    else if (namespace.kind === 'review') reviews.set(namespace.root, namespace);
    else if (namespace.kind === 'recovery')
      for (const file of namespace.files) recovery.push({ file, record: parse(file.bytes) });
    else if (namespace.kind === 'owner-legacy') return retained('owner-reconciliation-unproved');
  }
  for (const { file, record } of recovery) {
    const registration = registrations.get(record?.review_id);
    if (
      !registration ||
      Object.keys(record).sort().join(',') !==
        'project_digest,protocol_state,request_digest,review_id,runtime_digest,schema,workspace' ||
      record.schema !== 'ai-peer-review.broker-recovery/v1' ||
      file.name !== record.review_id + '.json' ||
      record.project_digest !== registration.project_digest ||
      record.workspace !== registration.workspace ||
      record.request_digest !== registration.request_digest ||
      record.runtime_digest !== registration.runtime.digest ||
      (record.protocol_state !== null && !PROTOCOL_STATES.includes(record.protocol_state))
    )
      refuse('review-authority-unproved');
  }
  const result = [];
  for (const [workspace, namespace] of reviews) {
    const registration = registrations.get(path.basename(workspace));
    const preservedReview = projection.reviews?.find((review) => review.workspace === workspace);
    const localPreservation =
      !registration &&
      preservedReview &&
      classifyPortableReconciliationCore({
        project: data.project,
        registrations: [],
        reviews: [preservedReview],
        resources: [],
      });
    if (
      localPreservation?.status === 'clear' &&
      localPreservation.dispositions.some(
        (entry) => entry.review_id === path.basename(workspace) && entry.disposition === 'preserved'
      )
    ) {
      const preservedAuthority = inspectStartupAuthority({ workspace, project: data.project });
      if (preservedAuthority.status === 'terminal') continue;
      const reservation = readStartupJournal(workspace);
      if (
        preservedAuthority.status === 'absent' &&
        reservation?.stage === 'reserved' &&
        !reservation.provider_operation &&
        reservation.descriptor?.project_root_digest === data.project.digest &&
        verifyRuntimeImage(reservation.runtime)
      )
        continue;
    }
    if (!registration || registration.workspace !== workspace)
      return retained('review-authority-unproved');
    if (
      namespace.entries.some(({ relativePath }) =>
        ['coordinator/coordinator.lock', 'coordinator/coordinator-lease.json'].includes(
          relativePath
        )
      )
    )
      return retained('coordinator-generation-retained');
    if (
      namespace.entries.some(({ relativePath }) => /(^|\/)locks\/review\.lock$/u.test(relativePath))
    )
      return retained('review-lock-retained');
    const authority = inspectStartupAuthority({ workspace, project: data.project });
    const journal = readStartupJournal(workspace);
    if (
      !journal ||
      authority.event_authority !== 'exact' ||
      authority.output_reservation !== 'exact' ||
      authority.request_digest !== registration.request_digest ||
      authority.runtime_digest !== registration.runtime.digest ||
      !verifyRuntimeImage(registration.runtime)
    )
      return retained('review-authority-unproved');
    if (authority.status === 'terminal') continue;
    const history = readManualLaunchHistory(workspace, {
      reviewId: registration.review_id,
      requestDigest: registration.request_digest,
    });
    if (
      !history ||
      history.coverage !== 'complete' ||
      history.operations.some((operation) => operation.status !== 'not-submitted')
    )
      return retained('manual-launch-unproved');
    const { state } = inspectReviewAuthority(workspace);
    if (
      journal.review_id !== registration.review_id ||
      journal.workspace !== registration.workspace ||
      journal.request_digest !== registration.request_digest ||
      state.protocol.startup?.runtime?.project_root_digest !== data.project.digest
    )
      return retained('review-authority-unproved');
    if (namespace.files.some(({ name }) => name === 'manual-fence.json')) continue;
    if (namespace.files.some(({ name }) => name === 'manual-suspension.json'))
      return retained('manual-suspension-unproved');
    const wake = allWakeOperations(workspace);
    if (wake.some((operation) => operation.status === 'outcome-unknown'))
      return retained('wake-outcome-unproved');
    result.push({ registration, journal, wake });
  }
  for (const registration of registrations.values())
    if (!reviews.has(registration.workspace)) return retained('registry-reconciliation-unproved');
  return { verified: false, project: data.project, reviews: result };
}

export async function reconcilePortableExistingEffects(input = {}) {
  if (Object.keys(input).sort().join(',') !== 'deadline,inventory,lease,paths,signal')
    refuse('reconciliation-context-unproved');
  const { paths, lease, inventory, signal, deadline } = input;
  const context = Object.freeze({ signal, deadline });
  let effect;
  const assert = async () => {
    await inspectOwnerElectionLease({ lease, paths, ...context });
    await assertReconciliationExistingEffectScope({
      observation: inventory,
      paths,
      ...context,
      ...(effect ? { effect } : {}),
    });
  };
  await assert();
  const data = await readReconciliationInventory({ observation: inventory, paths, ...context });
  const projection = await readPortableReconciliationProjection({ inventory, paths, ...context });
  const resourceObligation = projection.classification.outstandingObligations.find(({ name }) =>
    [
      'provider-resource-retained',
      'manual-resource-retained',
      'resource-association-unproved',
    ].includes(name)
  );
  if (resourceObligation) return retained(resourceObligation.name);
  const selected = selectPortableExistingEffectCandidatesCore(data, projection);
  if (selected.status === 'unknown') return selected;
  await assert();

  for (const candidate of selected.reviews) {
    const { registration, journal, wake } = candidate;
    if (
      !['launch-pending', 'outcome-unknown'].includes(journal.stage) &&
      !wake.some((operation) => operation.status === 'reserved')
    )
      continue;
    effect = { workspace: registration.workspace, mutableFiles: [] };
    let transition, result, after;
    try {
      result = await withOperationAuthority(
        {
          operation: 'broker.reconcile',
          cwd: selected.project.physicalRoot,
          reviewWorkspace: registration.workspace,
          ...context,
        },
        async () => {
          const binding = await openPortableParticipantBinding({
            registration,
            project: selected.project,
            lease,
            paths,
            ...context,
          });
          if (['launch-pending', 'outcome-unknown'].includes(journal.stage)) {
            const current = await readPortableParticipantBinding({ binding, ...context });
            const adapter = current.selected.reviewerAdapter;
            if (typeof adapter.reconcileReviewerLaunch !== 'function')
              return retained('existing-effect-reconciliation-unproved');
            await assert();
            const outcome = await reconcileReviewerLaunch({
              registration,
              beforeWrite: assert,
              observe: async ({ operationId }) => {
                const fresh = await readPortableParticipantBinding({ binding, ...context });
                await assert();
                const result = await adapter.reconcileReviewerLaunch({
                  operationId,
                  scratchRoot: registration.workspace,
                  expected: {
                    ...fresh.state.protocol.startup.runtime.reviewer,
                    adapter_version: fresh.state.protocol.startup.runtime.adapter_version,
                  },
                  authorSessionFingerprint: fresh.state.participants.author.session_fingerprint,
                  projectRoot: selected.project.physicalRoot,
                });
                await assert();
                return result;
              },
            });
            if (outcome.status === 'launched') effect.mutableFiles = ['startup-request.json'];
            await assert();
            transition = {
              workspace: registration.workspace,
              kind: 'launch',
              operationId: journal.provider_operation.operation_id,
              selector: current.state.protocol.startup.runtime.reviewer.selector,
              role: 'reviewer',
              sessionFingerprint: readStartupJournal(registration.workspace).provider_operation
                .session_fingerprint,
            };
            return outcome.status === 'launched'
              ? { status: 'changed' }
              : retained('existing-effect-reconciliation-unproved');
          }
          for (const original of wake.filter((operation) => operation.status === 'reserved')) {
            const operation = readWakeOperation(registration.workspace, original.operation_id);
            if (operation.status !== 'reserved') return retained('wake-outcome-unproved');
            const current = await readPortableParticipantBinding({ binding, ...context });
            const wakeInput = existingWakeDeliveryInputCore(operation);
            assertPortableWakeBindingCore(wakeInput, { state: current.state });
            const role = operation.target_role;
            const participant = current.state.participants[role];
            if (
              !participant ||
              participant.session_fingerprint !== operation.session_fingerprint ||
              current.state.protocol.revision !== operation.protocol_revision ||
              current.state.protocol.current_actor !== role
            )
              return retained('wake-outcome-unproved');
            const adapters = new Map([
              ['codex', current.selected.authorAdapter],
              [
                current.state.protocol.startup.runtime.reviewer.selector,
                current.selected.reviewerAdapter,
              ],
            ]);
            // Select by the actual sealed participant selector, never a caller-provided target.
            const authority = portableParticipantAuthorityCore(role, current.state);
            adapters.set(
              authority.selector,
              role === 'author' ? current.selected.authorAdapter : current.selected.reviewerAdapter
            );
            const session = await openParticipantSession({
              workspace: registration.workspace,
              role,
              authority,
              adapters,
              projectRoot: selected.project.physicalRoot,
              now: new Date(),
            });
            const adapter =
              role === 'author' ? current.selected.authorAdapter : current.selected.reviewerAdapter;
            const outcome = await reconcileExistingWakeOperationCore({
              workspace: registration.workspace,
              operation,
              now: Date.now(),
              appendWakeOutcome: async (...args) => {
                await assert();
                const fresh = await readPortableParticipantBinding({ binding, ...context });
                assertPortableWakeBindingCore(wakeInput, { state: fresh.state });
                const result = await appendWakeOutcome(...args);
                effect.mutableFiles = [
                  'wake/outcomes/' +
                    operation.operation_id.slice(7) +
                    '/' +
                    String(result.outcomes.length).padStart(6, '0') +
                    '.json',
                ];
                return result;
              },
              dispatch: async (operation) => {
                await assert();
                const result = await performCurrentOperationEffect(operation);
                await assert();
                return result;
              },
              adapter: {
                reconcile: async () => {
                  const fresh = await readPortableParticipantBinding({ binding, ...context });
                  assertPortableWakeBindingCore(wakeInput, { state: fresh.state });
                  await assert();
                  return adapter.reconcileDelivery({
                    binding: session,
                    wakeOperationId: operation.operation_id,
                    capsuleDigest: operation.capsule_digest,
                    workspace: registration.workspace,
                    projectRoot: selected.project.physicalRoot,
                  });
                },
              },
            });
            if (
              !['acknowledged', 'not-submitted', 'refused', 'superseded'].includes(outcome.status)
            )
              return retained('wake-outcome-unproved');
            transition = {
              workspace: registration.workspace,
              kind: 'wake',
              operationId: operation.operation_id,
              selector: authority.selector,
              role,
              sessionFingerprint: operation.session_fingerprint,
            };
            return { status: 'changed' };
          }
          return { status: 'changed' };
        }
      );
      await assert();
      after = await observeReconciliationInventory({ paths, ...context });
      await retainReconciliationTransitionAnchors({ before: inventory, after, paths, ...context });
      const afterData = await readReconciliationInventory({
        observation: after,
        paths,
        ...context,
      });
      await readPortableReconciliationProjection({ inventory: after, paths, ...context });
      if (result.status === 'unknown') {
        partialTransitions.add({ before: data, after: afterData, outcome: result, context });
        await after.close();
        return result;
      }
      const compared = comparePortableExistingEffectTransitionCore({
        before: data,
        after: afterData,
        ...transition,
      });
      if (!['transition', 'unchanged'].includes(compared.status))
        refuse('reconciliation-generation-changed');
      const completed = Object.freeze({
        verified: false,
        status: 'changed',
        outstandingObligations: Object.freeze([]),
      });
      const completedRecord = {
        beforeInventory: inventory,
        after,
        lease,
        paths,
        signal,
        deadline,
      };
      completedTransitions.set(completed, completedRecord);
      retainedCompletedTransitions.add(completedRecord);
      return completed;
    } catch (error) {
      // Observe partial effects again under the same original budget. Failure stays
      // unknown; it never produces an adoptable transition or grants clearance.
      let currentData, observationError;
      try {
        after ??= await observeReconciliationInventory({ paths, ...context });
        currentData = await readReconciliationInventory({ observation: after, paths, ...context });
      } catch (caught) {
        observationError = caught;
      }
      partialTransitions.add({
        before: data,
        after: currentData,
        error,
        observationError,
        context,
      });
      if (after) await after.close();
      throw error;
    }
  }
  await assert();
  return Object.freeze({
    verified: false,
    status: 'unchanged',
    outstandingObligations: Object.freeze([]),
  });
}
