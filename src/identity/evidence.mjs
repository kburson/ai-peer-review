const SOURCES = new Set([
  'official-runtime',
  'provider-result',
  'environment-declaration',
  'configuration',
  'launch-request',
  'explicit-declaration',
  'legacy-unclassified',
]);

function evidenceSource(source) {
  if (!SOURCES.has(source)) throw new TypeError(`Unknown identity evidence source: ${source}`);
  return source;
}

function assurance(source) {
  return source === 'provider-result' ? 'observed' : 'declared';
}

function modelClaims(modelId, source) {
  return {
    requested_id: source === 'launch-request' ? modelId : null,
    declared_id: source === 'provider-result' || source === 'launch-request' ? null : modelId,
    observed_id: source === 'provider-result' ? modelId : null,
  };
}

function conflict({ requested_id, declared_id, observed_id }) {
  return (
    new Set([requested_id, declared_id, observed_id].filter((value) => value !== null)).size > 1
  );
}

function frozen(value) {
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') Object.freeze(child);
  }
  return Object.freeze(value);
}

// This accepts only a fingerprint, never a provider-native session handle.
export function identityEvidence({ sessionFingerprint, sessionSource, modelId, modelSource }) {
  const resolvedSessionSource = evidenceSource(sessionSource);
  const resolvedModelSource = evidenceSource(modelSource);
  const claims = modelClaims(modelId, resolvedModelSource);
  return frozen({
    session: {
      fingerprint: sessionFingerprint,
      source: resolvedSessionSource,
      assurance: assurance(resolvedSessionSource),
    },
    model: {
      ...claims,
      source: resolvedModelSource,
      assurance: assurance(resolvedModelSource),
      conflict: conflict(claims),
    },
  });
}

export function mergeObservedIdentity(prior, observation) {
  if (
    !prior?.evidence ||
    observation?.source !== 'provider-result' ||
    observation.session_fingerprint !== prior.session_fingerprint ||
    typeof observation.model_id !== 'string' ||
    !observation.model_id
  ) {
    throw new TypeError('Provider observation must bind the registered participant fingerprint.');
  }
  const model = {
    ...prior.evidence.model,
    observed_id: observation.model_id,
    source: 'provider-result',
    assurance: 'observed',
  };
  model.conflict = conflict(model);
  return frozen({
    ...prior,
    model_id: observation.model_id,
    model_display: observation.model_display ?? observation.model_id,
    evidence: {
      session: {
        fingerprint: prior.session_fingerprint,
        source: 'provider-result',
        assurance: 'observed',
      },
      model,
    },
  });
}

export function v1Participant(identity) {
  return Object.freeze({
    role: identity.role,
    host: identity.host,
    provider: identity.provider,
    model_id: identity.model_id,
    model_display: identity.model_display,
    session_fingerprint: identity.session_fingerprint,
    identity_source: identity.identity_source,
    joined_at: identity.joined_at,
  });
}
