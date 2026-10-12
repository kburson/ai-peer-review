import { canonicalProjection } from '../protocol/canonical-projection.mjs';
// @story #209
// Existing-operation reconciliation only. Explicit ports never grant operational authority.
export function existingWakeOutcomeCore(value, fallback = 'outcome-unknown') {
  const status = value?.status === 'delivered' ? 'acknowledged' : value?.status;
  if (!['acknowledged', 'not-submitted', 'outcome-unknown', 'refused'].includes(status))
    return { status: fallback, reason: 'adapter-result-invalid' };
  return {
    status,
    reason:
      typeof value.reason === 'string' && value.reason.trim()
        ? value.reason.trim().slice(0, 160)
        : status === 'acknowledged'
          ? 'adapter-acknowledged'
          : 'adapter-result',
  };
}
export function existingWakeDeliveryInputCore(operation) {
  // Canonical bytes are supplied by the stock immutable ledger projection.
  return Object.freeze({
    operation_id: operation.operation_id,
    capsule: operation.capsule,
    capsule_text: `${canonicalProjection(operation.capsule)}\n`,
    capsule_digest: operation.capsule_digest,
    expected_revision: operation.protocol_revision,
    target_role: operation.target_role,
    target_session_fingerprint: operation.session_fingerprint,
  });
}
export async function reconcileExistingWakeOperationCore({
  workspace,
  operation,
  adapter,
  now,
  appendWakeOutcome,
  dispatch,
} = {}) {
  const input = existingWakeDeliveryInputCore(operation);
  const delivery = input;
  if (typeof adapter?.reconcile !== 'function')
    return appendWakeOutcome(
      workspace,
      operation.operation_id,
      { status: 'outcome-unknown', reason: 'adapter-reconciliation-unavailable' },
      new Date(now)
    );
  let result;
  try {
    result = existingWakeOutcomeCore(await dispatch(() => adapter.reconcile(delivery)));
  } catch {
    result = { status: 'outcome-unknown', reason: 'adapter-reconciliation-failed' };
  }
  return appendWakeOutcome(workspace, operation.operation_id, result, new Date(now));
}
