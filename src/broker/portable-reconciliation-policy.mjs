import { validBrokerRegistrationRecordCore } from './registration-record.mjs';
// @story #209
// Pure disposition policy over parsing projections. No fixture, flag or result grants authority.
const HASH = /^[a-f0-9]{64}$/u;
const FINGERPRINT = /^sha256:[a-f0-9]{64}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const exact = (value, keys) =>
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const instant = (value) =>
  typeof value === 'string' &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() === value;
function validRegistration(record, project) {
  return (
    validBrokerRegistrationRecordCore(record) &&
    record.project_digest === project.digest &&
    record.project_root === project.physicalRoot &&
    typeof record.workspace === 'string' &&
    ['root', 'entrypoint', 'nodeExecutable'].every(
      (key) => typeof record.runtime[key] === 'string' && record.runtime[key]
    )
  );
}
function validManualHistory(history, review) {
  return (
    exact(history, ['schema', 'review_id', 'request_digest', 'coverage', 'operations']) &&
    history.schema === 'ai-peer-review.manual-launch-history/v1' &&
    history.review_id === review.review_id &&
    history.request_digest === review.startup?.request_digest &&
    history.coverage === 'complete' &&
    Array.isArray(history.operations) &&
    history.operations.length <= 4096 &&
    new Set(history.operations.map((operation) => operation?.id)).size ===
      history.operations.length &&
    history.operations.every(
      (operation) =>
        exact(operation, ['id', 'intent_digest', 'status']) &&
        /^manual:[a-f0-9-]{36}$/u.test(operation.id) &&
        FINGERPRINT.test(operation.intent_digest) &&
        operation.status === 'not-submitted'
    )
  );
}
function acknowledgedLaunch(review) {
  const operation = review.startup?.provider_operation;
  return (
    review.startup?.stage === 'launched' &&
    operation?.status === 'acknowledged' &&
    FINGERPRINT.test(operation.session_fingerprint ?? '') &&
    operation.session_fingerprint === review.participants?.reviewer?.session_fingerprint
  );
}
function validProviderRecord(resource) {
  const record = resource.record;
  return (
    HASH.test(resource.key ?? '') &&
    exact(record, [
      'schema',
      'resource_digest',
      'owner_project_root_digest',
      'instance_id',
      'nonce_digest',
      'acquired_at',
      'heartbeat_at',
      'diagnostic_at',
    ]) &&
    record.schema === 'ai-peer-review.provider-resource/v1' &&
    record.resource_digest === resource.key &&
    ['owner_project_root_digest', 'instance_id', 'nonce_digest'].every((key) =>
      HASH.test(record[key] ?? '')
    ) &&
    ['acquired_at', 'heartbeat_at', 'diagnostic_at'].every((key) => instant(record[key]))
  );
}
function validManualRecord(resource) {
  const record = resource.record;
  return (
    HASH.test(resource.key ?? '') &&
    exact(record, [
      'schema',
      'review_id',
      'request_digest',
      'workspace',
      'contender_id',
      ...(Object.hasOwn(record ?? {}, 'durable_fence_digest') ? ['durable_fence_digest'] : []),
    ]) &&
    record.schema === 'ai-peer-review.manual-resource/v1' &&
    ID.test(record.review_id ?? '') &&
    HASH.test(record.request_digest ?? '') &&
    typeof record.workspace === 'string' &&
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/u.test(record.contender_id ?? '') &&
    (!Object.hasOwn(record, 'durable_fence_digest') || HASH.test(record.durable_fence_digest))
  );
}

export function classifyPortableReconciliationCore(input = {}) {
  const names = new Set(),
    dispositions = [];
  const add = (name) => names.add(name);
  const result = () =>
    Object.freeze({
      verified: false,
      status: names.size ? 'unknown' : 'clear',
      reason: names.size ? [...names][0] : 'reconciliation-clear-unverified',
      outstandingObligations: Object.freeze(
        [...names].slice(0, 64).map((name) => Object.freeze({ name, outcome: 'retained-unproved' }))
      ),
      dispositions: Object.freeze(dispositions.map((entry) => Object.freeze(entry))),
    });
  if (
    !exact(input, ['project', 'registrations', 'reviews', 'resources']) ||
    !HASH.test(input.project?.digest ?? '') ||
    typeof input.project?.physicalRoot !== 'string' ||
    !input.project.physicalRoot ||
    ![input.registrations, input.reviews, input.resources].every(Array.isArray)
  ) {
    add('reconciliation-namespace-unproved');
    return result();
  }
  const { project, registrations, reviews, resources } = input;
  if (registrations.length + reviews.length + resources.length > 4096) {
    add('reconciliation-inventory-overflow');
    return result();
  }
  const registered = new Map(),
    observed = new Map();
  for (const record of registrations) {
    if (!validRegistration(record, project) || registered.has(record.review_id))
      add('registry-reconciliation-unproved');
    else registered.set(record.review_id, record);
  }
  for (const review of reviews) {
    if (
      !review ||
      !ID.test(review.review_id ?? '') ||
      typeof review.workspace !== 'string' ||
      observed.has(review.review_id) ||
      ![review.wake, review.providerObservations, review.locks].every(Array.isArray)
    ) {
      add('reconciliation-namespace-unproved');
      continue;
    }
    observed.set(review.review_id, review);
    const registration = registered.get(review.review_id),
      authority = review.authority,
      journal = review.startup;
    if (!journal) {
      add('review-initialization-unproved');
      continue;
    }
    for (const lock of review.locks)
      add(
        lock?.kind === 'coordinator' ? 'coordinator-generation-retained' : 'review-lock-retained'
      );
    if (review.suspension && !review.fence) add('manual-suspension-unproved');
    if (
      journal.review_id !== review.review_id ||
      journal.workspace !== review.workspace ||
      !HASH.test(journal.request_digest ?? '')
    )
      add('review-authority-unproved');
    // A reserved journal without initialized events has no worker to restore. Complete production
    // inventory and the stock journal parser must establish this projection before classification.
    if (
      authority?.status === 'absent' &&
      journal.stage === 'reserved' &&
      !registration &&
      !review.manualHistory &&
      !review.wake.length &&
      !review.providerObservations.length &&
      !review.locks.length &&
      !review.fence &&
      !review.suspension
    ) {
      dispositions.push({ review_id: review.review_id, disposition: 'preserved' });
      continue;
    }
    // Retiring a terminal registration does not erase the independently parsed
    // event/journal authority. Unknown effect evidence still prevents preservation.
    if (
      !registration &&
      authority?.status === 'terminal' &&
      authority.review_id === review.review_id &&
      authority.workspace === review.workspace &&
      authority.event_authority === 'exact' &&
      authority.output_reservation === 'exact' &&
      authority.request_digest === journal.request_digest &&
      authority.runtime_digest === journal.runtime?.digest &&
      journal.descriptor?.project_root_digest === project.digest &&
      validManualHistory(review.manualHistory, review) &&
      acknowledgedLaunch(review) &&
      !review.suspension &&
      !review.fence &&
      !review.locks.length &&
      review.wake.every(
        (operation) =>
          ['acknowledged', 'not-submitted', 'refused', 'superseded'].includes(operation?.status) &&
          (operation.status !== 'acknowledged' ||
            operation.session_fingerprint ===
              review.participants?.[operation.target_role]?.session_fingerprint)
      )
    ) {
      dispositions.push({ review_id: review.review_id, disposition: 'preserved' });
      continue;
    }
    if (
      !registration ||
      registration.workspace !== review.workspace ||
      registration.request_digest !== journal.request_digest ||
      !['active', 'terminal'].includes(authority?.status) ||
      authority.review_id !== review.review_id ||
      authority.workspace !== review.workspace ||
      authority.event_authority !== 'exact' ||
      authority.output_reservation !== 'exact' ||
      authority.request_digest !== journal.request_digest ||
      authority.runtime_digest !== registration.runtime.digest
    )
      add('review-authority-unproved');
    if (!validManualHistory(review.manualHistory, review)) add('manual-launch-unproved');
    for (const operation of review.wake) {
      if (!['acknowledged', 'not-submitted', 'refused', 'superseded'].includes(operation?.status))
        add('wake-outcome-unproved');
      if (
        operation?.status === 'acknowledged' &&
        (!FINGERPRINT.test(operation.session_fingerprint ?? '') ||
          operation.session_fingerprint !==
            review.participants?.[operation.target_role]?.session_fingerprint)
      )
        add('wake-outcome-unproved');
    }
    const launched = acknowledgedLaunch(review);
    const prelaunch =
      journal.stage === 'registered' &&
      !review.participants?.reviewer &&
      (!journal.provider_operation || journal.provider_operation.status === 'not-submitted');
    const fenced =
      review.fence?.review_id === review.review_id &&
      review.fence?.request_digest === journal.request_digest;
    if (!launched && !prelaunch && !fenced) add('existing-effect-reconciliation-unproved');
    const authorIdentityOnly = review.providerObservations.every((record) => {
      const author = review.participants?.author;
      return (
        record?.operation_id === 'start:' + review.review_id &&
        record.provider === author?.provider &&
        record.host === author?.host &&
        record.model_id === author?.model_id &&
        ((record.schema === 'ai-peer-review.participant-binding/v1' &&
          record.role === 'author' &&
          record.review_id === review.review_id &&
          record.session_fingerprint === author?.session_fingerprint) ||
          record.source === 'official-exact-session')
      );
    });
    // The fixed projection has already validated each closed record and its
    // participant/session joins. Author identity is not a reviewer effect.
    if (
      review.providerObservations.length &&
      !launched &&
      !fenced &&
      !(prelaunch && authorIdentityOnly)
    )
      add('existing-effect-reconciliation-unproved');
    dispositions.push({
      review_id: review.review_id,
      disposition: authority?.status === 'terminal' || fenced ? 'preserved' : 'restorable',
    });
  }
  for (const reviewId of registered.keys())
    if (!observed.has(reviewId)) add('registry-reconciliation-unproved');
  for (const resource of resources) {
    if (!resource || !Array.isArray(resource.elections)) {
      add('resource-association-unproved');
      continue;
    }
    if (resource.kind === 'provider-resources') {
      if (!validProviderRecord(resource)) add('resource-association-unproved');
      else if (resource.record.owner_project_root_digest === project.digest)
        add('provider-resource-retained');
      // A closed foreign record remains retained and independent, including its own election.
    } else if (resource.kind === 'manual-resources') {
      if (
        !validManualRecord(resource) ||
        !HASH.test(resource.association?.project_digest ?? '') ||
        resource.association.workspace !== resource.record.workspace
      ) {
        add('resource-association-unproved');
        continue;
      }
      if (resource.association.project_digest !== project.digest) continue;
      const review = observed.get(resource.record.review_id),
        settlement = resource.settlement;
      if (
        !review ||
        review.workspace !== resource.record.workspace ||
        review.startup?.request_digest !== resource.record.request_digest ||
        review.fence?.review_id !== resource.record.review_id ||
        review.fence?.request_digest !== resource.record.request_digest ||
        !HASH.test(resource.record.durable_fence_digest ?? '') ||
        settlement?.fenceDigest !== resource.record.durable_fence_digest ||
        settlement?.reviewProtection !== 'C1' ||
        settlement?.electionWithdrawn !== true ||
        resource.elections.length
      )
        add('manual-resource-retained');
    } else add('resource-association-unproved');
  }
  return result();
}
