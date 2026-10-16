import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { AprError } from '../errors.mjs';
import { atomicCreate, atomicWrite, withReviewLock } from '../protocol/store.mjs';
import { canonicalProjection } from '../protocol/canonical-projection.mjs';
import { resolveContainedPath } from '../collateral/paths.mjs';
import { fingerprintSession } from '../identity/fingerprint.mjs';

const SCHEMA = 'ai-peer-review.manual-launch-history/v1';
const DIGEST = /^[a-f0-9]{64}$/;
const SHA = /^sha256:[a-f0-9]{64}$/;

function failure(message) {
  return new AprError('APR_WAKE_OUTCOME_UNKNOWN', message, {
    recovery:
      'Preserve every launch attempt and reconcile the exact provider outcome before retrying or retiring this review.',
  });
}

function fileFor(workspace) {
  return path.join(workspace, 'manual-launch-history.json');
}

function exact(value, fields) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join('\n') === fields.sort().join('\n')
  );
}

export function readManualLaunchHistory(workspace, { reviewId, requestDigest } = {}) {
  const file = fileFor(workspace);
  let status;
  try {
    status = lstatSync(file);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw failure('Manual launch history cannot be inspected.');
  }
  if (!status.isFile() || status.isSymbolicLink())
    throw failure('Manual launch history is not an owned regular file.');
  let value;
  try {
    value = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    throw failure('Manual launch history is unreadable.');
  }
  if (
    !exact(value, ['schema', 'review_id', 'request_digest', 'coverage', 'operations']) ||
    value.schema !== SCHEMA ||
    !['complete', 'legacy-unknown'].includes(value.coverage) ||
    value.review_id !== reviewId ||
    value.request_digest !== requestDigest ||
    !Array.isArray(value.operations) ||
    !value.operations.every(
      (entry) =>
        exact(entry, ['id', 'intent_digest', 'status']) &&
        /^manual:[a-f0-9-]{36}$/.test(entry.id) &&
        SHA.test(entry.intent_digest) &&
        ['reserved', 'not-submitted', 'submitted', 'outcome-unknown'].includes(entry.status)
    ) ||
    new Set(value.operations.map((entry) => entry.id)).size !== value.operations.length
  )
    throw failure('Manual launch history contradicts the sealed review request.');
  return value;
}

export function manualLaunchProvesNonSubmission(workspace, details) {
  const history = readManualLaunchHistory(workspace, details);
  if (
    !history ||
    history.coverage !== 'complete' ||
    history.operations.some((operation) => operation.status !== 'not-submitted')
  )
    return false;
  const observations = path.join(workspace, 'provider', 'claude', 'observations');
  const joinId = `join:${details.reviewId}`;
  const observed = [
    path.join(observations, `${createHash('sha256').update(joinId).digest('hex')}.json`),
    path.join(observations, `${joinId}.json`),
    path.join(workspace, 'provider', 'claude', 'launch-state.json'),
  ].some(existsSync);
  return !observed;
}

export function initializeManualLaunchHistory(workspace, { reviewId, requestDigest } = {}) {
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(reviewId ?? '') ||
    !DIGEST.test(requestDigest ?? '')
  )
    throw failure('Manual launch history identity is invalid.');
  const prior = readManualLaunchHistory(workspace, { reviewId, requestDigest });
  if (prior) return prior;
  const value = {
    schema: SCHEMA,
    review_id: reviewId,
    request_digest: requestDigest,
    coverage: 'complete',
    operations: [],
  };
  atomicCreate(fileFor(workspace), `${JSON.stringify(value)}\n`);
  return value;
}

export async function reserveManualLaunch(
  workspace,
  details,
  { verifyAuthority, effect = (operation) => operation() } = {}
) {
  if (
    !SHA.test(details?.intentDigest ?? '') ||
    !DIGEST.test(details?.requestDigest ?? '') ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(details?.reviewId ?? '')
  )
    throw failure('Manual launch intent is invalid.');
  return withReviewLock(
    path.join(workspace, 'dispatch'),
    () => {
      verifyAuthority?.();
      let history = readManualLaunchHistory(workspace, details);
      if (!history) {
        history = {
          schema: SCHEMA,
          review_id: details.reviewId,
          request_digest: details.requestDigest,
          coverage: 'legacy-unknown',
          operations: [],
        };
        effect(() => atomicCreate(fileFor(workspace), `${JSON.stringify(history)}\n`));
      }
      if (
        history.operations.some((entry) => ['reserved', 'outcome-unknown'].includes(entry.status))
      )
        throw failure('An earlier manual launch outcome is unresolved.');
      const operation = {
        id: `manual:${randomUUID()}`,
        intent_digest: details.intentDigest,
        status: 'reserved',
      };
      history.operations.push(operation);
      effect(() => atomicWrite(fileFor(workspace), `${JSON.stringify(history)}\n`));
      return operation;
    },
    { effect }
  );
}

export async function settleManualLaunch(
  workspace,
  details,
  operationId,
  status,
  { effect = (operation) => operation() } = {}
) {
  if (!['not-submitted', 'submitted', 'outcome-unknown'].includes(status))
    throw failure('Manual launch settlement is invalid.');
  return withReviewLock(
    path.join(workspace, 'dispatch'),
    () => {
      const history = readManualLaunchHistory(workspace, details);
      const operation = history?.operations.find((entry) => entry.id === operationId);
      if (
        !operation ||
        operation.intent_digest !== details.intentDigest ||
        operation.status !== 'reserved'
      )
        throw failure('Manual launch operation changed before settlement.');
      operation.status = status;
      effect(() => atomicWrite(fileFor(workspace), `${JSON.stringify(history)}\n`));
      return operation;
    },
    { effect }
  );
}

// An explicit new recovery operation observes the original session. It does not
// extend the old launch deadline, replay a turn, or manufacture a review decision.
export async function reconcileSubmittedManualLaunch({
  workspace,
  root,
  invitation,
  details,
  authority,
  observeTerminal,
  effect = (operation) => operation(),
}) {
  const history = readManualLaunchHistory(workspace, details);
  const pending =
    history?.operations.filter((x) => ['reserved', 'outcome-unknown'].includes(x.status)) ?? [];
  if (!pending.length) return { reconciled: false };
  if (pending.length !== 1 || pending[0].status !== 'reserved')
    throw failure('Manual launch remains uncertain; preserve its exact outcome.');
  const observed = await observeTerminal();
  const { binding, snapshot } = observed ?? {};
  const participant = authority.state.participants.reviewer;
  const selected = authority.state.protocol.startup.runtime.reviewer;
  if (
    !binding ||
    snapshot?.source !== 'official-session-record' ||
    snapshot.phase !== 'terminal-snapshot' ||
    snapshot.session_id !== binding.handle_locator ||
    snapshot.model_id !== selected.model_id ||
    binding.model_id !== selected.model_id ||
    binding.session_fingerprint !== participant?.session_fingerprint ||
    fingerprintSession('anthropic', snapshot.session_id) !== participant.session_fingerprint
  )
    throw failure('The exact reviewer has no matching terminal session proof.');
  const hash = (bytes) => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
  const match = authority.events.find((event) => {
    if (
      !['reviewer-revisions-requested', 'reviewer-accepted'].includes(event.type) ||
      event.actor !== participant.session_fingerprint
    )
      return false;
    const response = resolveContainedPath(
      root,
      path.join(root, event.payload.response.path),
      'sealed reviewer response'
    ).absolute;
    if (hash(readFileSync(response)) !== event.payload.response.digest)
      throw failure('Submitted reviewer notes changed before launch reconciliation.');
    return [false, true].some(
      (resume) =>
        hash(
          canonicalProjection({
            invitation,
            response,
            model: selected.model_id,
            effort: selected.effort,
            resume,
          })
        ) === pending[0].intent_digest
    );
  });
  if (!match) throw failure('No exact submitted reviewer turn matches the reserved launch.');
  const launchState = {
    schema: 'ai-peer-review.claude-launch-state/v1',
    review_id: details.reviewId,
    invitation,
    response: path.join(root, match.payload.response.path),
    model: selected.model_id,
    effort: selected.effort,
    session_handle: binding.handle_locator,
    session_fingerprint: participant.session_fingerprint,
    protocol_revision: match.revision,
  };
  return withReviewLock(
    path.join(workspace, 'dispatch'),
    async () => {
      const fresh = readManualLaunchHistory(workspace, details);
      const operation = fresh.operations.find((x) => x.id === pending[0].id);
      if (operation?.status !== 'reserved' || operation.intent_digest !== pending[0].intent_digest)
        throw failure('Manual launch changed during reconciliation.');
      const stateFile = path.join(workspace, 'provider', 'claude', 'launch-state.json');
      resolveContainedPath(root, stateFile, 'Claude launch state');
      if (existsSync(stateFile)) {
        const prior = JSON.parse(readFileSync(stateFile, 'utf8'));
        if (
          !lstatSync(stateFile).isFile() ||
          prior.schema !== launchState.schema ||
          prior.invitation !== invitation ||
          !Number.isSafeInteger(prior.protocol_revision) ||
          prior.protocol_revision > authority.state.protocol.revision ||
          !authority.events.some(
            (event) =>
              event.payload?.response &&
              path.join(root, event.payload.response.path) === prior.response
          ) ||
          prior.review_id !== details.reviewId ||
          prior.session_fingerprint !== participant.session_fingerprint ||
          prior.session_handle !== binding.handle_locator ||
          prior.model !== selected.model_id ||
          prior.effort !== selected.effort
        )
          throw failure('Retained launch state differs from the exact terminal session.');
      } else await effect(() => atomicCreate(stateFile, JSON.stringify(launchState) + '\n'));
      operation.status = 'submitted';
      await effect(() => atomicWrite(fileFor(workspace), JSON.stringify(fresh) + '\n'));
      return { reconciled: true, operation_id: operation.id };
    },
    { effect }
  );
}
