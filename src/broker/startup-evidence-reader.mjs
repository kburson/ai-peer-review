// @story #209
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { canonicalProjection } from '../protocol/canonical-projection.mjs';
import { inspectReviewAuthority } from '../protocol/authority-reader.mjs';
import { reserveCollateral } from '../collateral/responses.mjs';
import { resolveReviewPaths } from '../collateral/paths.mjs';
import {
  assertCollateralCompatible,
  readRuntimeCompatibility,
} from '../protocol/compatibility-read.mjs';
import { AprError } from '../errors.mjs';
export function readStartupJournal(workspace) {
  const file = path.join(workspace, 'startup-request.json');
  if (!lstatExists(file)) return null;
  try {
    const stat = lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('unsafe journal');
    const journal = JSON.parse(readFileSync(file, 'utf8'));
    assertCollateralCompatible({
      manifest: readRuntimeCompatibility(),
      operation: 'read',
      metadata: [{ contract: 'startup', schema: journal?.schema }],
    });
    const fields = [
      'schema',
      'request_digest',
      'request',
      'workspace',
      'review_id',
      'runtime',
      'versions',
      'descriptor',
      'stage',
      ...(Object.hasOwn(journal, 'registration_file') ? ['registration_file'] : []),
      ...(Object.hasOwn(journal, 'created_at') ? ['created_at'] : []),
      ...(Object.hasOwn(journal, 'provider_operation') ? ['provider_operation'] : []),
    ].sort();
    if (
      !exactFields(journal, fields) ||
      journal.schema !== 'ai-peer-review.startup-request/v1' ||
      (Object.hasOwn(journal, 'created_at') &&
        (!Number.isFinite(Date.parse(journal.created_at)) ||
          new Date(journal.created_at).toISOString() !== journal.created_at)) ||
      ![
        'reserved',
        'authority',
        'registered',
        'launch-pending',
        'outcome-unknown',
        'launched',
        'manual',
      ].includes(journal.stage) ||
      journal.request_digest !==
        createHash('sha256').update(canonicalProjection(journal.request)).digest('hex') ||
      (Object.hasOwn(journal, 'provider_operation') &&
        (!exactFields(journal.provider_operation, [
          'intent_digest',
          'operation_id',
          'session_fingerprint',
          'status',
        ]) ||
          !/^launch:[a-f0-9]{64}$/.test(journal.provider_operation.operation_id) ||
          !/^sha256:[a-f0-9]{64}$/.test(journal.provider_operation.intent_digest) ||
          !['reserved', 'acknowledged', 'not-submitted', 'outcome-unknown'].includes(
            journal.provider_operation.status
          ) ||
          (journal.provider_operation.session_fingerprint !== null &&
            !/^sha256:[a-f0-9]{64}$/.test(journal.provider_operation.session_fingerprint)))) ||
      journal.workspace !== realpathSync(workspace) ||
      journal.review_id !== path.basename(workspace) ||
      canonicalProjection(journal.descriptor) !==
        canonicalProjection(journal.request.startup.runtime)
    )
      throw new Error('journal authority');
    return journal;
  } catch (cause) {
    if (cause?.code === 'APR_REVIEW_RUNTIME_UNSUPPORTED') throw cause;
    authorityFailure(
      'Startup journal is unreadable or contradicts its reserved request.',
      { file },
      cause
    );
  }
}

export function startupEvidence(workspace, state) {
  workspace = realpathSync(workspace);
  const file = path.join(workspace, 'startup-request.json');
  if (!lstatExists(file)) {
    const root = state.protocol.startup?.context?.repository_root;
    const registration =
      root &&
      path.join(
        root,
        '.scratch',
        'peer-review',
        'broker',
        'registrations',
        `${state.protocol.review_id}.json`
      );
    // A durable registration makes this a transaction, not historical history.
    // Even damaged registration bytes must not turn missing evidence into permission.
    if (registration && lstatExists(registration))
      authorityFailure('Registered review is missing its startup journal.', { file, registration });
    return null;
  }
  if (!lstatSync(file).isFile() || lstatSync(file).isSymbolicLink())
    authorityFailure('Startup journal is not an owned regular file.', { file });
  const journal = readStartupJournal(workspace);
  const initial = JSON.parse(
    readFileSync(path.join(workspace, 'events.jsonl'), 'utf8').split('\n')[0]
  );
  const digest = createHash('sha256').update(canonicalProjection(initial.payload)).digest('hex');
  if (
    journal.schema !== 'ai-peer-review.startup-request/v1' ||
    journal.request_digest !== digest ||
    journal.workspace !== workspace ||
    journal.review_id !== state.protocol.review_id ||
    canonicalProjection(journal.descriptor) !== canonicalProjection(state.protocol.startup.runtime)
  )
    authorityFailure('Startup journal contradicts review authority.', { file });
  const records = {};
  for (const kind of ['fence', 'suspension']) {
    const fenceFile = path.join(workspace, `manual-${kind}.json`);
    let fence = null;
    if (lstatExists(fenceFile)) {
      if (!lstatSync(fenceFile).isFile() || lstatSync(fenceFile).isSymbolicLink())
        authorityFailure('Manual fence is not an owned regular file.', { fenceFile });
      try {
        fence = JSON.parse(readFileSync(fenceFile, 'utf8'));
      } catch {
        authorityFailure('Manual fence is unreadable.', { fenceFile });
      }
      if (
        fence.schema !== `ai-peer-review.manual-${kind}/v1` ||
        fence.request_digest !== digest ||
        fence.review_id !== state.protocol.review_id ||
        !Number.isSafeInteger(fence.event_revision) ||
        fence.event_revision > state.protocol.revision ||
        fence.event_revision < 1
      )
        authorityFailure('Manual fence contradicts review authority.', { fenceFile });
    }
    records[kind] = fence;
  }
  return {
    journal,
    recovery: {
      request_digest: digest,
      stage: journal.stage,
      fenced: records.fence !== null,
      suspending: records.suspension !== null && records.fence === null,
      event_revision: state.protocol.revision,
      reconciliation_command: `peer-review broker reconcile '${workspace.replaceAll("'", "'\\''")}'`,
    },
  };
}

export function inspectStartupAuthority({ workspace, project } = {}) {
  if (workspace === null) {
    if (!project || reviewWorkspaces(project).length) return { status: 'recovery-required' };
    return { status: 'clear', event_authority: 'exact', output_reservation: 'exact' };
  }
  const journalFile = path.join(workspace, 'startup-request.json');
  const eventFile = path.join(workspace, 'events.jsonl');
  if (!existsSync(eventFile)) {
    if (!existsSync(journalFile)) return { status: 'absent' };
    const journal = readStartupJournal(workspace);
    if (
      journal.stage === 'reserved' &&
      journal.workspace === workspace &&
      journal.request_digest ===
        createHash('sha256').update(canonicalProjection(journal.request)).digest('hex')
    )
      return { status: 'absent' };
    return { status: 'recovery-required' };
  }
  const { state } = inspectReviewAuthority(workspace);
  if (!state.protocol.startup?.runtime || state.protocol.startup.runtime.ownership !== 'broker')
    return { status: 'absent' };
  const evidence = startupEvidence(workspace, state);
  const terminal = [
    'accepted',
    'accepted-uncommitted',
    'accepted-over-objections',
    'accepted-over-objections-uncommitted',
    'abandoned',
    'superseded',
  ].includes(state.protocol.state);
  const reserved = existsSync(path.join(workspace, 'collateral-reservation.json'));
  if (!evidence || (!reserved && !terminal)) return { status: 'recovery-required' };
  const context = state.protocol.startup.context;
  const paths = resolveReviewPaths({
    root: context.repository_root,
    reviewsRoot: context.reviews_root,
    reviewPathTemplate: context.review_path_template,
    issue: context.issue,
    kind: context.artifact_kind,
    name: context.artifact_name,
    date: context.review_date,
    reviewId: context.review_id,
    recordId: context.record_id ?? context.review_id,
  });
  if (reserved) reserveCollateral({ ...state, paths }, { write: false });
  return {
    status: terminal ? 'terminal' : 'active',
    review_id: state.protocol.review_id,
    workspace,
    event_authority: 'exact',
    output_reservation: 'exact',
    request_digest: evidence.recovery.request_digest,
    runtime: evidence.journal.runtime,
    runtime_digest: evidence.journal.runtime?.digest,
  };
}

function failure(code, message, recovery, details = {}, cause) {
  const error = new AprError(code, message, { recovery, details });
  if (cause !== undefined) error.cause = cause;
  return error;
}

function exactFields(value, fields) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join('\n') === fields.join('\n')
  );
}

function lstatExists(file) {
  try {
    lstatSync(file);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

function reviewWorkspaces(project) {
  const root = path.join(project.physicalRoot, '.scratch', 'peer-review', 'reviews');
  const scratch = path.dirname(root);
  const transactions = lstatExists(scratch)
    ? readdirSync(scratch, { withFileTypes: true })
        .filter(
          (entry) => entry.isDirectory() && !['reviews', 'broker', 'runtimes'].includes(entry.name)
        )
        .map((entry) => path.join(scratch, entry.name))
        .filter(
          (workspace) =>
            existsSync(path.join(workspace, 'startup-request.json')) ||
            existsSync(path.join(workspace, 'events.jsonl'))
        )
    : [];
  if (!lstatExists(root)) return transactions;
  let status;
  try {
    status = lstatSync(root);
  } catch (cause) {
    throw failure(
      'APR_BROKER_REGISTRATION_RECOVERY_REQUIRED',
      'Project review root cannot be inspected safely.',
      'Fence broker automation, preserve project scratch evidence, and restore exact read access.',
      { root },
      cause
    );
  }
  if (!status.isDirectory() || status.isSymbolicLink()) {
    throw failure(
      'APR_BROKER_REGISTRATION_RECOVERY_REQUIRED',
      'Project review root is not an owned directory.',
      'Fence broker automation and restore the exact non-symlink project review root.',
      { root }
    );
  }
  return [
    ...transactions,
    ...readdirSync(root, { withFileTypes: true })
      .filter(
        (entry) => entry.isDirectory() && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(entry.name)
      )
      .map((entry) => path.join(root, entry.name))
      .filter((workspace) => {
        const entry = lstatSync(workspace);
        return entry.isDirectory() && !entry.isSymbolicLink();
      })
      .sort(),
  ];
}

function authorityFailure(message, details = {}, cause) {
  throw failure(
    'APR_BROKER_REGISTRATION_RECOVERY_REQUIRED',
    message,
    'Fence broker automation, preserve registration, event, and output-reservation evidence, then reconcile their exact values manually.',
    details,
    cause
  );
}
