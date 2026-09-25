import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { AprError } from '../errors.mjs';
import { verifyDormantSessionSnapshot, verifyProviderEvidence } from '../providers/evidence.mjs';
import { atomicWrite } from '../protocol/store.mjs';

const ROLES = new Set(['author', 'reviewer']);
const SCHEMA = 'ai-peer-review.participant-binding/v1';

function conflict(message) {
  throw new AprError('APR_IDENTITY_CONFLICT', message, {
    recovery: 'Preserve the review and re-observe both exact participant sessions.',
  });
}

function bindingFile(workspace, role) {
  if (
    !path.isAbsolute(workspace ?? '') ||
    path.normalize(workspace) !== workspace ||
    !ROLES.has(role)
  )
    conflict('Participant binding location is invalid.');
  return path.join(workspace, 'provider', 'bindings', `${role}.json`);
}

function readBinding(workspace, role, { optional = false } = {}) {
  const file = bindingFile(workspace, role);
  let value;
  try {
    const stat = lstatSync(file);
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      (process.platform !== 'win32' && stat.mode & 0o077)
    )
      conflict('Participant binding file is not owner-only.');
    value = JSON.parse(readFileSync(file, 'utf8'));
  } catch (cause) {
    if (optional && cause?.code === 'ENOENT') return null;
    if (cause instanceof AprError) throw cause;
    conflict('Participant binding cannot be read safely.');
  }
  if (
    value?.schema !== SCHEMA ||
    value.role !== role ||
    typeof value.review_id !== 'string' ||
    typeof value.handle_locator !== 'string' ||
    !value.handle_locator ||
    !/^sha256:[0-9a-f]{64}$/.test(value.session_fingerprint ?? '')
  )
    conflict('Participant binding record is invalid.');
  return value;
}

function publicBinding(record) {
  return Object.freeze({
    role: record.role,
    provider: record.provider,
    host: record.host,
    adapter_version: record.adapter_version,
    session_fingerprint: record.session_fingerprint,
    evidence_digest: record.evidence_digest,
  });
}

function checkAuthority(record, authority) {
  if (
    record.review_id !== authority?.review_id ||
    record.selector !== authority.selector ||
    record.provider !== authority.provider ||
    record.host !== authority.host ||
    record.model_id !== authority.model_id ||
    record.adapter_version !== authority.adapter_version ||
    record.operation_id !== authority.operation_id
  )
    conflict('Participant binding differs from sealed review authority.');
}

export function recordParticipantBinding({
  workspace,
  role,
  authority,
  providerEvidence,
  adapterAttestation,
  handleLocator,
  now = new Date(),
} = {}) {
  if (
    !ROLES.has(role) ||
    typeof authority?.review_id !== 'string' ||
    !authority.review_id ||
    typeof handleLocator !== 'string' ||
    handleLocator !== providerEvidence?.session_id
  )
    conflict('Participant binding does not identify the observed session.');
  const verified = verifyProviderEvidence({
    expected: authority,
    providerEvidence,
    adapterAttestation,
    now,
  });
  const other = readBinding(workspace, role === 'author' ? 'reviewer' : 'author', {
    optional: true,
  });
  if (other?.session_fingerprint === verified.session_fingerprint)
    conflict('Author and reviewer bindings cannot share one provider session.');
  const prior = readBinding(workspace, role, { optional: true });
  if (prior && prior.session_fingerprint !== verified.session_fingerprint)
    conflict('Existing participant binding cannot be replaced implicitly.');
  const record = {
    schema: SCHEMA,
    review_id: authority.review_id,
    role,
    selector: authority.selector,
    provider: verified.provider,
    host: verified.host,
    model_id: verified.model_id,
    adapter_version: verified.adapter_version,
    operation_id: authority.operation_id,
    session_fingerprint: verified.session_fingerprint,
    evidence_digest: verified.evidence_digest,
    handle_locator: handleLocator,
  };
  atomicWrite(bindingFile(workspace, role), `${JSON.stringify(record)}\n`);
  return publicBinding(record);
}

async function verifyParticipantSession({
  workspace,
  role,
  authority,
  adapters,
  projectRoot,
  now = new Date(),
} = {}) {
  const record = readBinding(workspace, role);
  checkAuthority(record, authority);
  const adapter =
    adapters instanceof Map ? adapters.get(record.selector) : adapters?.[record.selector];
  if (
    typeof adapter?.observeBoundSession !== 'function' ||
    typeof adapter?.attestVersion !== 'function'
  )
    conflict('Participant adapter cannot re-observe the exact session.');
  const providerSnapshot = await adapter.observeBoundSession({
    expected: authority,
    workspace,
    projectRoot,
    handleLocator: record.handle_locator,
    now,
  });
  const adapterAttestation = await adapter.attestVersion({ authority });
  const verified =
    providerSnapshot?.source === 'official-exact-session'
      ? verifyProviderEvidence({
          expected: authority,
          providerEvidence: providerSnapshot,
          adapterAttestation,
          now,
        })
      : verifyDormantSessionSnapshot({
          expected: authority,
          providerSnapshot,
          adapterAttestation,
          now,
        });
  if (verified.session_fingerprint !== record.session_fingerprint)
    conflict('Re-observed participant session differs from its binding.');
  return Object.freeze({ ...record, evidence_digest: verified.evidence_digest });
}

export async function openParticipantBinding(input) {
  return publicBinding(await verifyParticipantSession(input));
}

// Broker-internal only: the raw locator stays in the owner-only binding store and
// must never be projected into tracked collateral or broker IPC responses.
export async function openParticipantSession(input) {
  return verifyParticipantSession(input);
}
