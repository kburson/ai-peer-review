const EXACT = 'official-exact-session';

function reasonIf(test, reason, reasons) {
  if (!test) reasons.push(reason);
}

export function evaluateSurfaceConformance({
  adapterVersion,
  surfaceVersion,
  evidenceSources = {},
  operations = {},
  health = {},
} = {}) {
  const reasons = [];
  reasonIf(
    typeof adapterVersion === 'string' && adapterVersion.length > 0,
    'adapter-version-missing',
    reasons
  );
  reasonIf(
    typeof surfaceVersion === 'string' && surfaceVersion.length > 0,
    'surface-version-missing',
    reasons
  );
  reasonIf(health.healthy === true && health.fresh === true, 'health-unproven', reasons);
  reasonIf(health.surfaceVersion === surfaceVersion, 'surface-version-changed', reasons);
  reasonIf(health.adapterVersion === adapterVersion, 'adapter-version-changed', reasons);
  for (const field of ['model', 'session'])
    reasonIf(evidenceSources[field] === EXACT, `${field}-not-official-exact-session`, reasons);
  reasonIf(operations.deliverToSession === 'exact', 'exact-delivery-unavailable', reasons);
  reasonIf(operations.reconcile === 'exact', 'exact-reconciliation-unavailable', reasons);
  const automatic = reasons.length === 0;
  const reviewerLaunchable = automatic && operations.launch === 'exact';
  if (!reviewerLaunchable && operations.launch !== 'exact')
    reasons.push('exact-launch-unavailable');
  return Object.freeze({
    installed: health.installed === true,
    healthy: health.healthy === true && health.fresh === true,
    automatic,
    reviewerLaunchable,
    canCreateDistinctSession: operations.createDistinctSession === 'exact',
    reasons: Object.freeze(reasons),
  });
}

export function evaluateParticipantPair({ author, reviewer, health = {} } = {}) {
  const reasons = [];
  reasonIf(health.healthy === true && health.fresh === true, 'pair-health-unproven', reasons);
  reasonIf(author?.automatic === true, 'author-not-automatic', reasons);
  reasonIf(reviewer?.automatic === true, 'reviewer-not-automatic', reasons);
  reasonIf(reviewer?.reviewerLaunchable === true, 'reviewer-launch-unavailable', reasons);
  reasonIf(author?.canCreateDistinctSession === true, 'author-distinct-session-unproven', reasons);
  reasonIf(
    reviewer?.canCreateDistinctSession === true,
    'reviewer-distinct-session-unproven',
    reasons
  );
  return Object.freeze({ automatic: reasons.length === 0, reasons: Object.freeze(reasons) });
}
