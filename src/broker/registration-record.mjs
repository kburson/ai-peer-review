// @story #209
// Closed record shape only; filesystem, project association and effect authority remain separate.
const REGISTRATION_SCHEMA = 'ai-peer-review.broker-registration/v1';
const DIGEST_RE = /^[a-f0-9]{64}$/;
const REGISTRATION_FIELDS = [
  'created_at',
  'project_digest',
  'project_root',
  'request_digest',
  'review_id',
  'runtime',
  'schema',
  'workspace',
];
const RUNTIME_FIELDS = ['digest', 'entrypoint', 'nodeExecutable', 'root'];

function exactFields(value, fields) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join('\n') === fields.join('\n')
  );
}

export function validBrokerRegistrationRecordCore(registration) {
  if (
    !exactFields(registration, REGISTRATION_FIELDS) ||
    !exactFields(registration.runtime, RUNTIME_FIELDS) ||
    registration.schema !== REGISTRATION_SCHEMA ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(registration.review_id ?? '') ||
    !DIGEST_RE.test(registration.project_digest ?? '') ||
    !DIGEST_RE.test(registration.request_digest ?? '') ||
    !/^sha256:[a-f0-9]{64}$/.test(registration.runtime.digest ?? '')
  ) {
    return false;
  }
  try {
    return new Date(registration.created_at).toISOString() === registration.created_at;
  } catch {
    return false;
  }
}
