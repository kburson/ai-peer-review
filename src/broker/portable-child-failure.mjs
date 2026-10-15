// @story #209
// Diagnostic data only: no paths, credentials, generations, raw stderr or authority.
const schema = 'ai-peer-review.broker-child-failure/v1';
const prefix = 'APR_BROKER_FAILURE_V1:';
const reasons = new Set([
  // Preserve the entrypoint's existing closed startup categories across the frame.
  'broker-startup-incomplete',
  'bootstrap-budget-unproved',
  'bootstrap-generation-changed',
  'bootstrap-locator-changed',
  'bootstrap-file-missing',
  'executing-bootstrap-provenance-required',
  'bootstrap-executing-runtime-changed',
  'bootstrap-project-changed',
  'bootstrap-cleanup-unproved',
  'root-protection-changed',
  'private-file-unproved',
  'service-startup-context-mismatch',
  'service-project-changed',
  'another-owner-already-live',
  'prepared-cleanup-owner-unproved',
  'owner-operation-not-admitted',
  'owner-guard-budget-mismatch',
  'operation-budget-unproved',
  'protected-snapshot-changed',
  'snapshot-ancestor-changed',
  'genuine-protected-snapshot-required',
  'credential-observation-budget-mismatch',
  'credential-observation-busy',
  'credential-observation-changed',
  'credential-observation-options-invalid',
  'credential-observation-unavailable',
  'credential-publication-invalid',
  'genuine-mutation-snapshot-required',
  'genuine-private-guard-required',
  'genuine-protected-guard-required',
  'genuine-quarantine-receipt-required',
  'lease-budget-mismatch',
  'mutation-release-unproved',
  'mutation-resource-busy',
  'operation-clock-unproved',
  'owned-publication-busy',
  'owned-publication-changed',
  'owned-publication-fenced',
  'owned-publication-generation-changed',
  'owned-publication-retired',
  'owned-withdrawal-unproved',
  'private-bytes-changed',
  'private-file-changed',
  'private-generation-changed',
  'private-read-bound-changed',
  'protected-root-closed',
  'publication-budget-mismatch',
  'quarantine-destination-occupied',
  'quarantine-generation-changed',
  'retired-publication-generation-changed',
  'root-descriptor-changed',
  'slot-count-unproved',
  'stock-replacement-unconfirmed',
  'binding-close-unproved',
  'bootstrap-image-unproved',
  'bootstrap-path-unproved',
  'bootstrap-publication-unproved',
  'bootstrap-root-unproved',
  'bootstrap-writer-cleanup-unproved',
  'bootstrap-writer-options-unproved',
  'bootstrap-writer-project-unproved',
  'bootstrap-writer-runtime-unproved',
  'conflicting-owner-evidence',
  'credential-observation-unproved',
  'endpoint-evidence-unproved',
  'fixed-service-input-required',
  'genuine-bootstrap-required',
  'genuine-owner-binding-required',
  'genuine-owner-completion-unproved',
  'genuine-owner-observation-required',
  'genuine-prepared-owner-required',
  'genuine-prepared-service-required',
  'genuine-published-owner-required',
  'genuine-readiness-producers-required',
  'genuine-service-lifecycle-required',
  'genuine-service-owner-required',
  'genuine-service-readiness-required',
  'genuine-service-request-required',
  'genuine-worker-owner-required',
  'joined-client-budget-mismatch',
  'joined-client-busy',
  'joined-client-close-unproved',
  'joined-client-resources-unproved',
  'nested-owner-transaction',
  'original-process-death-unproved',
  'original-process-unproved',
  'orphan-owner-state',
  'owner-binding-unproved',
  'owner-creation-unproved',
  'owner-effect-unproved',
  'owner-generation-changed',
  'owner-live-withdrawal-unproved',
  'owner-observation-close-unproved',
  'owner-options-invalid',
  'owner-paths-unproved',
  'owner-preparation-unproved',
  'owner-quarantine-unproved',
  'owner-readiness-unproved',
  'owner-release-unproved',
  'owner-service-drain-unproved',
  'owner-state-format-unproved',
  'owner-state-unproved',
  'owner-transport-close-unproved',
  'ownership-unproved',
  'portable-consumer-unavailable',
  'prepared-owner-budget-mismatch',
  'prepared-owner-fenced',
  'prepared-owner-publication-refused',
  'prepared-owner-release-unproved',
  'prepared-service-already-bound',
  'prepared-service-binding-mismatch',
  'prepared-service-start-refused',
  'protocol-lifecycle-required',
  'proved-socket-lost',
  'readiness-budget-unproved',
  'reconciliation-options-invalid',
  'service-lifecycle-phase-unproved',
  'service-lifecycle-root-mismatch',
  'service-startup-incomplete',
  'slot-withdrawal-unproved',
  'startup-already-completed',
  'startup-incomplete',
  'transaction-obligations-unproved',
  'transaction-ports-unproved',
  'unverified-client-required',
  'operation-deadline',
  'operation-aborted',
  'invalid-context-input',
  'owner-reconciliation-unproved',
  'source-class-unavailable',
  'existing-effect-reconciliation-unproved',
  'provider-resource-retained',
  'manual-resource-retained',
  'coordinator-generation-retained',
  'review-lock-retained',
  'review-initialization-unproved',
  'review-authority-unproved',
  'registry-reconciliation-unproved',
  'resource-association-unproved',
  'manual-launch-unproved',
  'manual-suspension-unproved',
  'wake-outcome-unproved',
  'reconciliation-inventory-overflow',
  'reconciliation-namespace-unproved',
  'reconciliation-deadline',
  'reconciliation-aborted',
  'reconciliation-close-unproved',
  'reconciliation-generation-changed',
  'reconciliation-context-unproved',
]);
export function encodePortableBrokerChildFailure(error) {
  let reason = 'broker-startup-incomplete',
    current = error;
  const seen = new Set();
  for (let depth = 0; current && depth < 4 && !seen.has(current); depth++) {
    seen.add(current);
    if (reasons.has(current.details?.reason)) {
      reason = current.details.reason;
      break;
    }
    current = current.cause;
  }
  const obligations = [
    ...new Set(
      (Array.isArray(error?.details?.outstandingObligations)
        ? error.details.outstandingObligations
        : []
      )
        .map((entry) => entry?.name)
        .filter((name) => reasons.has(name))
    ),
  ].slice(0, 32);
  return prefix + JSON.stringify({ schema, reason, obligations }) + '\n';
}
export function decodePortableBrokerChildFailure(bytes) {
  if (!(typeof bytes === 'string' || Buffer.isBuffer(bytes)) || Buffer.byteLength(bytes) > 4096)
    return null;
  const text = bytes.toString('utf8');
  if (!text.startsWith(prefix) || !text.endsWith('\n') || text.slice(0, -1).includes('\n'))
    return null;
  let value;
  try {
    value = JSON.parse(text.slice(prefix.length));
  } catch {
    return null;
  }
  if (
    !value ||
    Object.keys(value).sort().join(',') !== 'obligations,reason,schema' ||
    value.schema !== schema ||
    !reasons.has(value.reason) ||
    !Array.isArray(value.obligations) ||
    value.obligations.length > 32 ||
    new Set(value.obligations).size !== value.obligations.length ||
    value.obligations.some((name) => !reasons.has(name)) ||
    text !==
      prefix +
        JSON.stringify({ schema, reason: value.reason, obligations: value.obligations }) +
        '\n'
  )
    return null;
  return Object.freeze({
    schema,
    reason: value.reason,
    obligations: Object.freeze([...value.obligations]),
  });
}
export function createPortableBrokerFailureChannel() {
  let chunks = [],
    size = 0,
    overflow = false;
  return Object.freeze({
    append(bytes) {
      if (overflow) return;
      size += bytes.length;
      if (size > 4096) {
        overflow = true;
        chunks = [];
        return;
      }
      chunks.push(Buffer.from(bytes));
    },
    read() {
      return overflow ? null : decodePortableBrokerChildFailure(Buffer.concat(chunks));
    },
  });
}
export function projectPortableBrokerChildDiagnostic(error) {
  const child = error?.details?.childFailure;
  if (!child || typeof child !== 'object') return null;
  const closed = decodePortableBrokerChildFailure(
    encodePortableBrokerChildFailure({
      details: {
        reason: child.reason,
        outstandingObligations: (Array.isArray(child.obligations) ? child.obligations : []).map(
          (name) => ({ name })
        ),
      },
    })
  );
  const exit = error?.details?.childExit;
  const validExit =
    exit &&
    Object.keys(exit).sort().join(',') === 'code,signal' &&
    (exit.code === null || Number.isSafeInteger(exit.code)) &&
    (exit.signal === null ||
      (typeof exit.signal === 'string' && /^SIG[A-Z0-9]{1,16}$/u.test(exit.signal)));
  return Object.freeze({
    verified: false,
    code: 'APR_BROKER_START_FAILED',
    message: 'Portable broker startup did not complete.',
    reason: closed.reason,
    obligations: closed.obligations,
    ...(validExit ? { child_exit: Object.freeze({ ...exit }) } : {}),
  });
}
