const PHASE_TWO = Object.freeze([
  'mcp-connectivity',
  'resident-liveness',
  'long-timeout',
  'automatic-required',
]);

function row(id, status, required, details = null) {
  return Object.freeze({ id, status, required, details });
}

export function doctor(context = {}) {
  const requestedMode = context.requestedMode ?? 'manual';
  const transportViable =
    context.transport?.healthy &&
    (requestedMode === 'manual' ||
      (requestedMode === 'resume-only' && context.transport.mode === 'resume-only'));
  const phaseOne = [
    row('package', context.packageResolved ? 'ok' : 'unavailable', true),
    row('skill', context.skillAvailable ? 'ok' : 'unavailable', true),
    row('identity-source', context.identity?.identity_source ?? 'unavailable', true),
    row(
      'session-fingerprint',
      context.identity?.session_fingerprint ? 'available' : 'unavailable',
      true
    ),
    row('git-repository', context.git?.repository ? 'ok' : 'unavailable', true),
    row('physical-worktree', context.git?.worktreeSafe ? 'ok' : 'unsafe', true),
    row('scratch-ignore', context.git?.scratchIgnored ? 'ok' : 'unavailable', true),
    row(
      'authority-verifier',
      context.authority?.verifier?.verifier_fingerprint ?? 'unavailable',
      false
    ),
    row('authority-grade', context.authority?.verifier?.assurance_grade ?? 'unavailable', false),
    row('authority-policy', context.authority?.authority_policy ?? 'unavailable', false),
    row('transport', context.transport?.healthy ? context.transport.mode : 'unavailable', true),
    row('requested-mode', transportViable ? 'ok' : 'unavailable', true, requestedMode),
  ];
  const phaseTwo = PHASE_TWO.map((id) =>
    row(id, 'not-installed (Phase 2 optional)', requestedMode === 'automatic-required')
  );
  const rows = Object.freeze([...phaseOne, ...phaseTwo]);
  const healthy = rows.every(
    (entry) =>
      !entry.required ||
      !['unavailable', 'unsafe', 'not-installed (Phase 2 optional)'].includes(entry.status)
  );
  const input = Object.freeze({ ...context });
  return Object.freeze({
    schema: 'ai-peer-review.doctor/v1',
    requested_mode: requestedMode,
    healthy,
    rows,
    input,
  });
}
