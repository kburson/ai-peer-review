// @story #190
// Closed diagnostic data only. Never expose command text, host UUIDs, SIDs or output bytes.
import { parseRawJson } from '../../src/api/canonical-json.mjs';
export function stockDiagnosticDetails(kind, { error, stdout, stderr } = {}) {
  const codes = ['ETIMEDOUT', 'ABORT_ERR', 'ENOENT', 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'];
  const details = {
    errorCode: error
      ? codes.includes(error.code)
        ? error.code
        : Number.isInteger(error.code)
          ? 'exit-nonzero'
          : 'other'
      : null,
    killed: error?.killed === true,
    exitSignal: ['SIGTERM', 'SIGKILL'].includes(error?.signal) ? error.signal : null,
    stderrEmpty: stderr === '',
  };
  if (kind !== 'host-identity') return details;
  details.hostRecord = 'not-observed';
  if (error) return details;
  if (stderr !== '') {
    details.hostRecord = 'stderr-present';
    return details;
  }
  try {
    const value = parseRawJson(stdout);
    const uuid = typeof value?.uuid === 'string' ? value.uuid.toLowerCase() : '';
    details.hostRecord =
      value &&
      Object.keys(value).sort().join(',') === 'completed,uuid' &&
      value.completed === true &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u.test(uuid) &&
      uuid !== '00000000-0000-0000-0000-000000000000'
        ? 'valid-shape'
        : 'invalid-shape';
  } catch {
    details.hostRecord = 'invalid-shape';
  }
  return details;
}
