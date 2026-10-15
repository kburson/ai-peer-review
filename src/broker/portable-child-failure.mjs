// @story #209
// Diagnostic data only: no paths, credentials, generations, raw stderr or authority.
const schema = 'ai-peer-review.broker-child-failure/v1';
const prefix = 'APR_BROKER_FAILURE_V1:';
const reasons = new Set([
  'broker-startup-incomplete',
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
