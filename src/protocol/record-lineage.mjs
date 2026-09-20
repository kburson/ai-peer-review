import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';

import { AprError } from '../errors.mjs';
import { reduceEvents } from './reducer.mjs';

const RECEIPT_SCHEMA = 'ai-peer-review.lineage-receipt/v1';
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const DIGEST_RE = /^sha256:[0-9a-f]{64}$/;
const POST_RECEIPT_TERMINAL_EVENTS = new Set([
  'acceptance-committed',
  'acceptance-sealed-no-commit',
  'override-committed',
  'override-sealed-no-commit',
  'superseded',
]);

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function invalidResult(reasons, attempts = []) {
  return deepFreeze({
    status: 'lineage-invalid',
    reasons: [...new Set(reasons)].sort(),
    missing: [],
    attempts: structuredClone(attempts),
  });
}

function unavailableResult(receipt) {
  return deepFreeze({
    status: receipt.incomplete === true ? 'incomplete-unavailable' : 'lineage-unavailable',
    reasons: [],
    missing: [...new Set(receipt.missing ?? [])].sort(),
    attempts: structuredClone(receipt.attempts ?? []),
  });
}

function validId(value) {
  return typeof value === 'string' && ID_RE.test(value);
}

function nullableId(value) {
  return value === null || validId(value);
}

function validDigest(value) {
  return typeof value === 'string' && DIGEST_RE.test(value);
}

function sha256(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])])
    );
  }
  return value;
}

function readWorkspace(workspace) {
  const absolute = path.resolve(workspace);
  const eventsFile = path.join(absolute, 'events.jsonl');
  const receiptFile = path.join(absolute, 'lineage-receipt.json');
  if (!existsSync(absolute) || !existsSync(eventsFile)) {
    return { missing: absolute };
  }
  try {
    const eventBytes = readFileSync(eventsFile);
    const text = eventBytes.toString('utf8');
    if (!text.endsWith('\n')) return { invalid: 'event-log-corrupt' };
    const events = text
      .slice(0, -1)
      .split('\n')
      .map((line) => JSON.parse(line));
    const state = reduceEvents(events);
    const context = state.protocol.startup?.context;
    const receipt = existsSync(receiptFile) ? JSON.parse(readFileSync(receiptFile, 'utf8')) : null;
    const repositoryRoot = realpathSync(context.repository_root);
    const expectedWorkspace = realpathSync(
      path.join(repositoryRoot, '.scratch', 'peer-review', state.protocol.review_id)
    );
    if (realpathSync(absolute) !== expectedWorkspace) return { invalid: 'worktree-mismatch' };
    return {
      absolute,
      receipt,
      receiptBytes: receipt ? `${JSON.stringify(canonical(receipt))}\n` : null,
      eventLogDigest: sha256(
        Buffer.from(
          `${(POST_RECEIPT_TERMINAL_EVENTS.has(events.at(-1)?.type) ? events.slice(0, -1) : events)
            .map((event) => JSON.stringify(canonical(event)))
            .join('\n')}\n`
        )
      ),
      reviewId: state.protocol.review_id,
      recordId: context.record_id ?? state.protocol.review_id,
      repositoryRoot,
      successorReviewId:
        [...events].reverse().find((event) => event.type === 'superseded')?.payload
          .successor_review_id ?? null,
    };
  } catch {
    return { invalid: 'workspace-invalid' };
  }
}

function inspectLegacyWorkspaces(observed) {
  const reasons = [];
  const first = observed[0];
  if (
    observed.some(
      (entry) => entry.repositoryRoot !== first.repositoryRoot || entry.recordId !== first.recordId
    )
  ) {
    return invalidResult(['cross-record']);
  }
  const byId = new Map();
  const incoming = new Map();
  for (const entry of observed) {
    if (byId.has(entry.reviewId)) reasons.push('cycle');
    byId.set(entry.reviewId, entry);
    if (entry.successorReviewId) {
      incoming.set(entry.successorReviewId, (incoming.get(entry.successorReviewId) ?? 0) + 1);
    }
  }
  if ([...incoming.values()].some((count) => count > 1)) reasons.push('branch');
  const absent = observed
    .filter((entry) => entry.successorReviewId && !byId.has(entry.successorReviewId))
    .map((entry) =>
      path.join(entry.repositoryRoot, '.scratch', 'peer-review', entry.successorReviewId)
    );
  if (absent.length > 0) {
    return deepFreeze({
      status: 'lineage-unavailable',
      reasons: [],
      missing: [...new Set(absent)].sort(),
      attempts: [],
    });
  }
  const roots = observed.filter((entry) => !incoming.has(entry.reviewId));
  if (roots.length !== 1) reasons.push(roots.length === 0 ? 'cycle' : 'branch');
  if (reasons.length > 0) return invalidResult(reasons);
  const ordered = [];
  const seen = new Set();
  let current = roots[0];
  while (current) {
    if (seen.has(current.reviewId)) return invalidResult(['cycle']);
    seen.add(current.reviewId);
    ordered.push(current);
    current = current.successorReviewId ? byId.get(current.successorReviewId) : null;
  }
  if (ordered.length !== observed.length) return invalidResult(['branch']);
  const rootReviewId = ordered[0].reviewId;
  return deepFreeze({
    status: 'complete',
    legacy: true,
    reasons: [],
    missing: [],
    attempts: ordered.map((entry, index) => ({
      review_id: entry.reviewId,
      record_id: entry.recordId,
      root_review_id: rootReviewId,
      recovery_ordinal: index,
      predecessor_review_id: ordered[index - 1]?.reviewId ?? null,
      successor_review_id: entry.successorReviewId,
      recovery_id: null,
      recovery_claim_digest: null,
      reciprocal_receipt_digest: null,
      consumed_grant_digest: null,
      event_log_digest: entry.eventLogDigest,
    })),
  });
}

function inspectWorkspaces(workspaces) {
  if (
    workspaces.length === 0 ||
    new Set(workspaces.map((item) => path.resolve(item))).size !== workspaces.length
  ) {
    return invalidResult(['workspace-set']);
  }
  const observed = workspaces.map(readWorkspace);
  const missing = observed.flatMap((entry) => (entry.missing ? [entry.missing] : []));
  if (missing.length > 0) {
    return deepFreeze({
      status: 'lineage-unavailable',
      reasons: [],
      missing: missing.sort(),
      attempts: [],
    });
  }
  const workspaceReasons = observed.flatMap((entry) => (entry.invalid ? [entry.invalid] : []));
  if (workspaceReasons.length > 0) return invalidResult(workspaceReasons);
  if (observed.every((entry) => entry.receipt === null)) return inspectLegacyWorkspaces(observed);
  if (observed.some((entry) => entry.receipt === null)) {
    return deepFreeze({
      status: 'lineage-unavailable',
      reasons: [],
      missing: observed
        .filter((entry) => entry.receipt === null)
        .map((entry) => path.join(entry.absolute, 'lineage-receipt.json'))
        .sort(),
      attempts: [],
    });
  }
  if (
    observed.some(
      (entry) =>
        entry.repositoryRoot !== observed[0].repositoryRoot ||
        entry.recordId !== observed[0].recordId ||
        entry.receiptBytes !== observed[0].receiptBytes
    )
  ) {
    return invalidResult(['workspace-receipt-conflict']);
  }
  const inspected = validateCompleteReceipt(observed[0].receipt);
  if (inspected.status !== 'complete') return inspected;
  const byId = new Map(observed.map((entry) => [entry.reviewId, entry]));
  const reasons = [];
  for (const attempt of inspected.attempts) {
    const actual = byId.get(attempt.review_id);
    if (!actual) reasons.push('workspace-missing');
    else if (actual.eventLogDigest !== attempt.event_log_digest)
      reasons.push('event-log-digest-conflict');
  }
  if (reasons.length > 0) return invalidResult(reasons, inspected.attempts);
  return inspected;
}

function nullableDigest(value) {
  return value === null || validDigest(value);
}

function validateAttemptShape(attempt, index, reasons) {
  if (!attempt || typeof attempt !== 'object' || Array.isArray(attempt)) {
    reasons.push('attempt-shape');
    return;
  }
  for (const key of ['review_id', 'record_id', 'root_review_id']) {
    if (!validId(attempt[key])) reasons.push(`${key.replaceAll('_', '-')}-invalid`);
  }
  for (const key of ['predecessor_review_id', 'successor_review_id', 'recovery_id']) {
    if (!nullableId(attempt[key])) reasons.push(`${key.replaceAll('_', '-')}-invalid`);
  }
  for (const key of [
    'recovery_claim_digest',
    'reciprocal_receipt_digest',
    'consumed_grant_digest',
    'event_log_digest',
  ]) {
    if (!nullableDigest(attempt[key])) reasons.push(`${key.replaceAll('_', '-')}-invalid`);
  }
  if (!Number.isSafeInteger(attempt.recovery_ordinal) || attempt.recovery_ordinal < 0) {
    reasons.push('ordinal-invalid');
  }
  if (index === 0 && attempt.recovery_ordinal !== 0) reasons.push('root-ordinal');
}

function validateCompleteReceipt(receipt) {
  const attempts = Array.isArray(receipt.attempts) ? receipt.attempts : [];
  const reasons = [];
  if (attempts.length === 0) reasons.push('attempts-empty');
  attempts.forEach((attempt, index) => validateAttemptShape(attempt, index, reasons));
  if (reasons.length > 0) return invalidResult(reasons, attempts);

  const root = attempts[0];
  const seen = new Set();
  for (let index = 0; index < attempts.length; index += 1) {
    const current = attempts[index];
    const previous = attempts[index - 1] ?? null;
    const next = attempts[index + 1] ?? null;
    if (seen.has(current.review_id)) reasons.push('cycle');
    seen.add(current.review_id);
    if (current.record_id !== root.record_id) reasons.push('cross-record');
    if (current.root_review_id !== root.root_review_id) reasons.push('root-mismatch');
    if (current.review_id === current.predecessor_review_id) reasons.push('self-reference');
    if (current.review_id === current.successor_review_id) reasons.push('self-reference');
    if (current.recovery_ordinal !== index) reasons.push('ordinal-gap');
    if ((previous?.review_id ?? null) !== current.predecessor_review_id) {
      reasons.push('predecessor-mismatch');
    }
    if ((next?.review_id ?? null) !== current.successor_review_id) {
      reasons.push(
        current.successor_review_id && seen.has(current.successor_review_id) ? 'cycle' : 'branch'
      );
    }
    if (index === 0) {
      if (
        current.recovery_id !== null ||
        current.recovery_claim_digest !== null ||
        current.consumed_grant_digest !== null
      ) {
        reasons.push('root-recovery');
      }
    } else {
      if (!validId(current.recovery_id) || !validDigest(current.recovery_claim_digest)) {
        reasons.push('recovery-gap');
      }
      if (current.recovery_ordinal === 1 && current.consumed_grant_digest !== null) {
        reasons.push('built-in-grant-conflict');
      }
      if (current.recovery_ordinal > 1 && !validDigest(current.consumed_grant_digest)) {
        reasons.push('grant-gap');
      }
      if (
        current.reciprocal_receipt_digest !== previous.reciprocal_receipt_digest ||
        !validDigest(current.reciprocal_receipt_digest)
      ) {
        reasons.push('digest-conflict');
      }
    }
    if (!validDigest(current.event_log_digest)) reasons.push('event-log-digest-missing');
  }
  if (reasons.length > 0) return invalidResult(reasons, attempts);
  return deepFreeze({
    status: 'complete',
    reasons: [],
    missing: [],
    attempts: structuredClone(attempts),
  });
}

export function inspectRecordLineage(workspacesOrReceipt) {
  if (Array.isArray(workspacesOrReceipt)) return inspectWorkspaces(workspacesOrReceipt);
  if (workspacesOrReceipt?.schema === 'ai-peer-review.manifest/v1') {
    if (workspacesOrReceipt.lineage_receipt) {
      return inspectRecordLineage(workspacesOrReceipt.lineage_receipt);
    }
    return deepFreeze({
      status: 'incomplete-unavailable',
      reasons: [],
      missing: [`lineage_receipt:${workspacesOrReceipt.review_id ?? 'unknown'}`],
      attempts: [],
    });
  }
  if (
    !workspacesOrReceipt ||
    typeof workspacesOrReceipt !== 'object' ||
    Array.isArray(workspacesOrReceipt) ||
    workspacesOrReceipt.schema !== RECEIPT_SCHEMA
  ) {
    return invalidResult(['receipt-shape']);
  }
  if (workspacesOrReceipt.complete !== true) return unavailableResult(workspacesOrReceipt);
  return validateCompleteReceipt(workspacesOrReceipt);
}

export function validateSuccessor({ predecessor, successor } = {}) {
  const reasons = [];
  validateAttemptShape(predecessor, predecessor?.recovery_ordinal, reasons);
  validateAttemptShape(successor, successor?.recovery_ordinal, reasons);
  if (reasons.length === 0) {
    if (predecessor.review_id === successor.review_id) reasons.push('self-reference');
    if (predecessor.record_id !== successor.record_id) reasons.push('cross-record');
    if (predecessor.root_review_id !== successor.root_review_id) reasons.push('root-mismatch');
    if (successor.recovery_ordinal !== predecessor.recovery_ordinal + 1) {
      reasons.push('ordinal-gap');
    }
    if (predecessor.successor_review_id !== successor.review_id) reasons.push('branch');
    if (successor.predecessor_review_id !== predecessor.review_id) {
      reasons.push('predecessor-mismatch');
    }
    if (
      !validDigest(predecessor.reciprocal_receipt_digest) ||
      predecessor.reciprocal_receipt_digest !== successor.reciprocal_receipt_digest
    ) {
      reasons.push('digest-conflict');
    }
    if (!validId(successor.recovery_id) || !validDigest(successor.recovery_claim_digest)) {
      reasons.push('recovery-gap');
    }
    if (successor.recovery_ordinal === 1 && successor.consumed_grant_digest !== null) {
      reasons.push('built-in-grant-conflict');
    }
    if (successor.recovery_ordinal > 1 && !validDigest(successor.consumed_grant_digest)) {
      reasons.push('grant-gap');
    }
  }
  if (reasons.length > 0) {
    throw new AprError('APR_LINEAGE_INVALID', 'Successor lineage evidence is contradictory.', {
      recovery: 'Preserve both attempts and repair their exact reciprocal lineage evidence.',
      details: { reasons: [...new Set(reasons)].sort() },
    });
  }
  return deepFreeze({
    predecessor_review_id: predecessor.review_id,
    successor_review_id: successor.review_id,
    recovery_id: successor.recovery_id,
    recovery_ordinal: successor.recovery_ordinal,
  });
}
