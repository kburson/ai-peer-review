import { createHash } from 'node:crypto';

import { AprError } from '../errors.mjs';

const MAX_AGE_MS = 5 * 60 * 1000;

function conflict() {
  throw new AprError(
    'APR_IDENTITY_CONFLICT',
    'Provider session evidence is not current or exact.',
    {
      recovery: 'Preserve the operation and re-observe the exact provider session.',
    }
  );
}

function text(value) {
  return typeof value === 'string' && value.length > 0 && value.trim() === value;
}

function digest(value) {
  return `sha256:${createHash('sha256').update(value, 'utf8').digest('hex')}`;
}

export function verifyProviderEvidence({
  expected,
  providerEvidence,
  adapterAttestation,
  authorFingerprint = null,
  now = new Date(),
} = {}) {
  const observed = providerEvidence;
  const attested = adapterAttestation;
  const current = new Date(now).valueOf();
  const observedAt = new Date(observed?.observed_at).valueOf();
  if (
    !expected ||
    !observed ||
    !attested ||
    !Number.isFinite(current) ||
    !Number.isFinite(observedAt) ||
    observedAt > current + 30_000 ||
    current - observedAt > MAX_AGE_MS ||
    observed.source !== 'official-exact-session' ||
    !text(observed.source_version) ||
    !text(observed.session_id) ||
    !text(observed.operation_id) ||
    !text(observed.tool_use_id) ||
    observed.phase !== 'tool-use' ||
    observed.provider !== expected.provider ||
    observed.host !== expected.host ||
    observed.model_id !== expected.model_id ||
    observed.operation_id !== expected.operation_id ||
    attested.source !== 'pinned-runtime' ||
    attested.adapter_version !== expected.adapter_version ||
    attested.surface_version !== observed.source_version
  )
    conflict();

  const sessionFingerprint = digest(
    `ai-peer-review.session/v1\n${observed.provider}\n${observed.session_id}`
  );
  if (authorFingerprint && authorFingerprint === sessionFingerprint) conflict();
  const evidenceDigest = digest(
    JSON.stringify({
      source: observed.source,
      source_version: observed.source_version,
      observed_at: observed.observed_at,
      operation_id: observed.operation_id,
      tool_use_id: observed.tool_use_id,
      provider: observed.provider,
      host: observed.host,
      model_id: observed.model_id,
      session_fingerprint: sessionFingerprint,
      adapter_version: attested.adapter_version,
    })
  );
  return Object.freeze({
    provider: observed.provider,
    host: observed.host,
    model_id: observed.model_id,
    effort: expected.effort,
    effort_source: 'requested',
    adapter_version: attested.adapter_version,
    session_fingerprint: sessionFingerprint,
    assurance: 'runtime',
    evidence_digest: evidenceDigest,
  });
}

export function verifyDormantSessionSnapshot({
  expected,
  providerSnapshot,
  adapterAttestation,
  now = new Date(),
} = {}) {
  const observedAt = new Date(providerSnapshot?.observed_at).valueOf();
  const lastTurnAt = new Date(providerSnapshot?.last_turn_at).valueOf();
  const current = new Date(now).valueOf();
  if (
    !expected ||
    !Number.isFinite(current) ||
    !Number.isFinite(observedAt) ||
    !Number.isFinite(lastTurnAt) ||
    observedAt > current + 30_000 ||
    current - observedAt > MAX_AGE_MS ||
    lastTurnAt > observedAt + 30_000 ||
    providerSnapshot.source !== 'official-session-record' ||
    providerSnapshot.phase !== 'terminal-snapshot' ||
    !text(providerSnapshot.source_version) ||
    !text(providerSnapshot.session_id) ||
    providerSnapshot.provider !== expected.provider ||
    providerSnapshot.host !== expected.host ||
    providerSnapshot.model_id !== expected.model_id ||
    adapterAttestation?.source !== 'pinned-runtime' ||
    adapterAttestation.adapter_version !== expected.adapter_version ||
    adapterAttestation.surface_version !== providerSnapshot.source_version
  )
    conflict();
  const sessionFingerprint = digest(
    `ai-peer-review.session/v1\n${providerSnapshot.provider}\n${providerSnapshot.session_id}`
  );
  return Object.freeze({
    provider: providerSnapshot.provider,
    host: providerSnapshot.host,
    model_id: providerSnapshot.model_id,
    adapter_version: adapterAttestation.adapter_version,
    session_fingerprint: sessionFingerprint,
    assurance: 'dormant-session-snapshot',
    evidence_digest: digest(
      JSON.stringify({
        source: providerSnapshot.source,
        source_version: providerSnapshot.source_version,
        observed_at: providerSnapshot.observed_at,
        last_turn_at: providerSnapshot.last_turn_at,
        model_id: providerSnapshot.model_id,
        session_fingerprint: sessionFingerprint,
        adapter_version: adapterAttestation.adapter_version,
      })
    ),
  });
}
