// @story #209
// Fixed readers over retained inventory. Parsed facts never grant effect authority.
import path from 'node:path';
import { PROTOCOL_STATES } from '../protocol/format-authority.mjs';
import { AprError } from '../errors.mjs';
import {
  readReconciliationInventory,
  assertReconciliationInventory,
  describeResourceReconciliationNamespaceCore,
} from './portable-reconciliation-inventory.mjs';
import { validBrokerRegistrationRecordCore } from './registration-record.mjs';
import {
  readStartupJournal,
  startupEvidence,
  inspectStartupAuthority,
} from './startup-evidence-reader.mjs';
import { inspectReviewAuthority } from '../protocol/authority-reader.mjs';
import { verifyRuntimeImage } from './runtime-image.mjs';
import { readManualLaunchHistory } from '../provider/manual-launch-ledger.mjs';
import { allWakeOperations } from '../coordinator/ledger.mjs';
import { classifyPortableReconciliationCore } from './portable-reconciliation-policy.mjs';
import { validatePortableProviderRecordsCore } from './portable-provider-records.mjs';
import { createReviewPreservationLookup } from '../config/review-history.mjs';

function refuse(reason) {
  throw new AprError('APR_BROKER_STALE', 'Reconciliation parsing is unproved.', {
    details: { reason, retrySafe: false },
    recovery: 'Preserve the exact retained stores and restore their authority.',
  });
}
function parse(bytes) {
  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch {
    refuse('reconciliation-namespace-unproved');
  }
}

export async function readPortableReconciliationProjection(input = {}) {
  if (Object.keys(input).sort().join(',') !== 'deadline,inventory,paths,signal')
    refuse('reconciliation-context-unproved');
  const { inventory: observation, paths, signal, deadline } = input;
  const binding = { observation, paths, signal, deadline };
  // Membership and the original context are checked before even reading caller data.
  const data = await readReconciliationInventory(binding);
  const projected = await projectRecords(data, { signal, deadline }, () =>
    assertReconciliationInventory(binding)
  );
  await assertReconciliationInventory(binding);
  return projected;
}
// Explicit read-only parser core. Caller data can never create an inventory/owner capability.
export async function readPortableReconciliationRecordsCore(input = {}) {
  if (Object.keys(input).sort().join(',') !== 'data,deadline,signal')
    refuse('reconciliation-context-unproved');
  const { data, signal, deadline } = input;
  const assertContext = () => {
    if (
      !(signal instanceof AbortSignal) ||
      signal.aborted ||
      !Number.isFinite(deadline) ||
      performance.now() >= deadline ||
      deadline - performance.now() > 30000
    )
      refuse('reconciliation-context-unproved');
  };
  assertContext();
  return projectRecords(data, { signal, deadline }, assertContext);
}
async function projectRecords(data, context, assertCurrent) {
  const lookup =
    data.project.commonDirectory === null || data.project.commonDirectory === undefined
      ? null
      : createReviewPreservationLookup(
          data.project.commonDirectory,
          path.join(data.project.physicalRoot, '.scratch', 'peer-review', 'broker', 'registrations')
        );
  const preservedRegistrations = [],
    preservedWorkspaces = [];
  const registrations = [],
    reviews = [],
    resources = [];
  const recovery = [];
  for (const namespace of data.namespaces) {
    if (namespace.kind === 'owner-legacy') refuse('owner-reconciliation-unproved');
    if (namespace.kind === 'registrations') {
      for (const file of namespace.files) {
        await assertCurrent();
        const filePath = path.join(namespace.root, file.name);
        if (lookup && (await lookup.registration(filePath, context))) {
          preservedRegistrations.push(Object.freeze({ file: filePath }));
          continue;
        }
        const record = parse(file.bytes);
        if (
          lookup &&
          typeof record?.workspace === 'string' &&
          path.isAbsolute(record.workspace) &&
          path.normalize(record.workspace) === record.workspace &&
          (await lookup.workspace(record.workspace, context))
        ) {
          preservedRegistrations.push(
            Object.freeze({ file: filePath, workspace: record.workspace })
          );
          continue;
        }
        if (!validBrokerRegistrationRecordCore(record) || file.name !== record.review_id + '.json')
          refuse('registry-reconciliation-unproved');
        registrations.push(record);
      }
    } else if (namespace.kind === 'recovery') {
      recovery.push(...namespace.files.map((file) => ({ file, record: parse(file.bytes) })));
    } else if (namespace.kind === 'review') {
      await assertCurrent();
      const workspace = namespace.root;
      if (lookup && (await lookup.workspace(workspace, context))) {
        preservedWorkspaces.push(workspace);
        continue;
      }
      const journal = readStartupJournal(workspace);
      const authority = inspectStartupAuthority({ workspace, project: data.project });
      const initialized = namespace.files.some(({ name }) => name === 'events.jsonl');
      const eventAuthority = initialized ? inspectReviewAuthority(workspace) : null;
      const state = eventAuthority?.state ?? null;
      if (state) startupEvidence(workspace, state);
      const provider = validatePortableProviderRecordsCore({
        files: namespace.files.filter(({ name }) => name.startsWith('provider/')),
        state,
        journal,
        ...(eventAuthority ? { events: eventAuthority.events } : {}),
      });
      if (provider.status !== 'valid') refuse('review-authority-unproved');
      const file = (name) => namespace.files.find((entry) => entry.name === name);
      const record = (name) => (file(name) ? parse(file(name).bytes) : null);
      if (journal && !verifyRuntimeImage(journal.runtime)) refuse('review-authority-unproved');
      reviews.push({
        review_id: path.basename(workspace),
        workspace,
        authority,
        startup: journal,
        participants: state?.participants ?? null,
        manualHistory: readManualLaunchHistory(workspace, {
          reviewId: path.basename(workspace),
          requestDigest: journal?.request_digest,
        }),
        wake: allWakeOperations(workspace),
        providerObservations: provider.records,
        locks: namespace.entries
          .filter(
            ({ relativePath }) =>
              relativePath === 'coordinator/coordinator.lock' ||
              relativePath === 'coordinator/coordinator-lease.json' ||
              /(^|\/)locks\/review\.lock$/u.test(relativePath)
          )
          .map(({ relativePath }) => ({
            kind: relativePath.startsWith('coordinator/') ? 'coordinator' : 'review',
          })),
        fence: record('manual-fence.json'),
        suspension: record('manual-suspension.json'),
      });
    } else if (['provider-resources', 'manual-resources'].includes(namespace.kind)) {
      if (!namespace.files.length) continue;
      const key = path.basename(namespace.root);
      const publication = describeResourceReconciliationNamespaceCore({
        root: namespace.root,
        entries: namespace.entries,
      });
      const records = namespace.files.filter(({ name }) => name.startsWith('apr-resource-'));
      if (
        namespace.files.some(({ name }) => ['resource.json', 'resource.lock'].includes(name)) ||
        records.length !== 1
      )
        refuse('resource-association-unproved');
      const resource = {
        kind: namespace.kind,
        key,
        record: parse(records[0].bytes),
        elections: namespace.files
          .filter(({ name }) => name.startsWith('apr-election-'))
          .map(({ bytes }) => parse(bytes)),
        association: namespace.association,
        settlement: namespace.settlement,
      };
      for (const file of namespace.files.filter(({ name }) => name.startsWith('apr-election-'))) {
        const election = parse(file.bytes);
        if (
          Object.keys(election).sort().join(',') !==
            'choosing,contenderId,identity,resourceKey,schema,ticket' ||
          election.schema !== 'ai-peer-review.election-slot/v1' ||
          election.resourceKey !== publication.resourceKey ||
          file.name !==
            'apr-election-' + publication.resourceKey + '-' + election.contenderId + '.json' ||
          !/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/u.test(election.contenderId) ||
          typeof election.identity?.host !== 'string' ||
          !election.identity.host ||
          election.identity.host.length > 256 ||
          !Number.isSafeInteger(election.identity?.pid) ||
          election.identity.pid <= 0 ||
          typeof election.choosing !== 'boolean' ||
          (election.choosing
            ? election.ticket !== null
            : !/^[1-9]\d{0,29}$/u.test(election.ticket ?? ''))
        )
          refuse('resource-association-unproved');
      }
      // A manual association cannot be inferred from a caller's project flag or pathname.
      // Current-project records are joined to the independently parsed exact startup authority.
      if (namespace.kind === 'manual-resources' && !resource.association) {
        const review = reviews.find((entry) => entry.workspace === resource.record.workspace);
        if (review?.startup?.descriptor?.project_root_digest === data.project.digest)
          resource.association = {
            project_digest: data.project.digest,
            workspace: review.workspace,
          };
      }
      resources.push(resource);
    }
  }
  for (const { file, record } of recovery) {
    let registration = registrations.find((entry) => entry.review_id === record?.review_id);
    if (!registration) {
      const preserved = preservedRegistrations.find(
        (entry) => path.basename(entry.file) === record?.review_id + '.json'
      );
      const retainedFile =
        preserved &&
        data.namespaces
          .find(
            (entry) => entry.kind === 'registrations' && entry.root === path.dirname(preserved.file)
          )
          ?.files.find((file) => file.name === path.basename(preserved.file));
      if (retainedFile) {
        const historical = parse(retainedFile.bytes);
        if (validBrokerRegistrationRecordCore(historical)) registration = historical;
      }
    }
    if (
      !registration ||
      file.name !== registration.review_id + '.json' ||
      Object.keys(record).sort().join(',') !==
        'project_digest,protocol_state,request_digest,review_id,runtime_digest,schema,workspace' ||
      record.schema !== 'ai-peer-review.broker-recovery/v1' ||
      record.project_digest !== registration.project_digest ||
      record.workspace !== registration.workspace ||
      record.request_digest !== registration.request_digest ||
      record.runtime_digest !== registration.runtime.digest ||
      (record.protocol_state !== null && !PROTOCOL_STATES.includes(record.protocol_state))
    )
      refuse('review-authority-unproved');
  }
  await assertCurrent();
  const classification = classifyPortableReconciliationCore({
    project: data.project,
    registrations,
    reviews,
    resources,
  });
  return Object.freeze({
    verified: false,
    project: data.project,
    registrations: Object.freeze(registrations),
    reviews: Object.freeze(reviews),
    resources: Object.freeze(resources),
    preservedRegistrations: Object.freeze(preservedRegistrations),
    preservedWorkspaces: Object.freeze(preservedWorkspaces),
    classification,
  });
}
