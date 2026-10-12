// @story #135
import {
  isVerifiedRuntimeInventory,
  verifyRuntimeInventorySync,
} from '../startup/runtime-inventory.mjs';
import { verifyCleanupOwnerCore } from './cleanup-ownership-core.mjs';
import { isPortableBrokerOwner } from '../broker/portable-owner-lifecycle.mjs';
import { isAuthenticatedBrokerOwner } from '../broker/ownership.mjs';
import { COMPATIBILITY_DECLARATION_VERSION } from './format-authority.mjs';

import { AprError } from '../errors.mjs';

import {
  EVENT_V1_SCHEMA,
  EVENT_V2_SCHEMA,
  validateCompatibility,
  assertReaderWriterCompatibility,
  assertReaderCompatibility,
  readRuntimeCompatibility,
  assertCollateralCompatible,
  validateRuntimeCompatibility,
} from './compatibility-read.mjs';
export {
  EVENT_V1_SCHEMA,
  EVENT_V2_SCHEMA,
  validateCompatibility,
  assertReaderWriterCompatibility,
  assertReaderCompatibility,
  readRuntimeCompatibility,
  assertCollateralCompatible,
  validateRuntimeCompatibility,
};
import { inspectUnsupportedReview as inspectUnsupportedReviewRead } from './compatibility-read.mjs';
export function currentCompatibility() {
  return Object.freeze({
    minimum_reader_version: COMPATIBILITY_DECLARATION_VERSION,
    minimum_writer_version: COMPATIBILITY_DECLARATION_VERSION,
    accepted_event_schemas: Object.freeze([EVENT_V1_SCHEMA, EVENT_V2_SCHEMA]),
  });
}

export function compatibilityDeclared(state, compatibility, { at } = {}) {
  validateCompatibility(compatibility);
  const sequence = state.sequence + 1;
  return {
    schema: EVENT_V2_SCHEMA,
    review_id: state.review_id,
    sequence,
    revision: state.revision,
    type: 'compatibility-declared',
    actor: 'system',
    at: at ?? new Date().toISOString(),
    payload: { compatibility },
  };
}

function unsupported(message, details = {}) {
  return new AprError('APR_REVIEW_RUNTIME_UNSUPPORTED', message, {
    recovery:
      'Preserve this review read-only. Use the current selected global installation with explicitly supported collateral or start an independent review with distinct IDs and paths; never execute retained images.',
    details: { package_version: COMPATIBILITY_DECLARATION_VERSION, ...details },
  });
}
export function inspectUnsupportedReview(input) {
  return Object.freeze({
    ...inspectUnsupportedReviewRead(input),
    package_version: COMPATIBILITY_DECLARATION_VERSION,
  });
}
export async function assertCurrentCleanupOwnership({ owner, protocol, runtime, context } = {}) {
  if (
    !isAuthenticatedBrokerOwner(owner) ||
    (isPortableBrokerOwner(owner) && context === undefined) ||
    !(await verifyCleanupOwnerCore(owner, context)) ||
    protocol !== 1 ||
    Object.keys(owner.handshake?.versions || {})
      .sort()
      .join(',') !== 'broker_protocol_version,node_major,package_version' ||
    !Number.isSafeInteger(owner.handshake?.versions?.node_major) ||
    owner.handshake.versions.node_major < 24 ||
    !isVerifiedRuntimeInventory(runtime) ||
    owner.handshake?.versions?.broker_protocol_version !== protocol ||
    owner.handshake?.versions?.package_version !== runtime.packageVersion
  )
    throw unsupported('Cleanup requires proven current runtime ownership and supported protocol.');
  verifyRuntimeInventorySync({ packageRoot: runtime.packageRoot, previousObservation: runtime });
}
