// @story #209
// Shared closed format authorities. Public JSON projections are checked against these bytes.
// This writer provenance annotation changes with a package release. Projection
// parity is a required unit check; it never selects or admits an executable.
export const COMPATIBILITY_DECLARATION_VERSION = '0.4.0';
function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

export const RUNTIME_COMPATIBILITY = freeze({
  schema: 'ai-peer-review.runtime-compatibility/v1',
  integration_contract: 'ai-peer-review.integration/v1',
  contracts: {
    event: {
      read: ['ai-peer-review.event/v1', 'ai-peer-review.event/v2'],
      write: ['ai-peer-review.event/v1', 'ai-peer-review.event/v2'],
    },
    protocol: {
      read: ['ai-peer-review.protocol/v1', 'ai-peer-review.protocol/v2'],
      write: ['ai-peer-review.protocol/v1', 'ai-peer-review.protocol/v2'],
    },
    participants: {
      read: ['ai-peer-review.participants/v1', 'ai-peer-review.participants/v2'],
      write: ['ai-peer-review.participants/v1', 'ai-peer-review.participants/v2'],
    },
    manifest: {
      read: ['ai-peer-review.manifest/v1'],
      write: ['ai-peer-review.manifest/v1'],
    },
    phaseManifest: {
      read: ['ai-peer-review.phase-manifest/v1'],
      write: ['ai-peer-review.phase-manifest/v1'],
    },
    response: {
      read: ['ai-peer-review.response/v1'],
      write: ['ai-peer-review.response/v1'],
    },
    context: {
      read: ['ai-peer-review.context/v1', 'ai-peer-review.context/v2'],
      write: ['ai-peer-review.context/v1', 'ai-peer-review.context/v2'],
    },
    runtime: {
      read: ['ai-peer-review.runtime/v1'],
      write: ['ai-peer-review.runtime/v1'],
    },
    startup: {
      read: ['ai-peer-review.startup-request/v1'],
      write: ['ai-peer-review.startup-request/v1'],
    },
    runtimeImage: {
      read: ['ai-peer-review.runtime-image/v1'],
      write: ['ai-peer-review.runtime-image/v1'],
    },
    brokerRegistration: {
      read: ['ai-peer-review.broker-registration/v1'],
      write: ['ai-peer-review.broker-registration/v1'],
    },
    brokerBootstrap: {
      read: ['ai-peer-review.broker-bootstrap/v1', 'ai-peer-review.broker-bootstrap/v2'],
      write: ['ai-peer-review.broker-bootstrap/v2'],
    },
    reservation: {
      read: ['ai-peer-review.collateral-reservation/v1'],
      write: ['ai-peer-review.collateral-reservation/v1'],
    },
    lineage: {
      read: ['ai-peer-review.lineage-receipt/v1'],
      write: ['ai-peer-review.lineage-receipt/v1'],
    },
    invitation: {
      read: ['ai-peer-review.invitation-routing/v1'],
      write: ['ai-peer-review.invitation-routing/v1'],
    },
    archive: {
      read: ['ai-peer-review.relocation-plan/v1', 'ai-peer-review.relocation-receipt/v1'],
      write: ['ai-peer-review.relocation-plan/v1', 'ai-peer-review.relocation-receipt/v1'],
    },
  },
});
export const SUPPORTED_FORMATS = freeze({
  event: {
    read: ['ai-peer-review.event/v1', 'ai-peer-review.event/v2'],
    write: ['ai-peer-review.event/v1', 'ai-peer-review.event/v2'],
  },
  protocol: {
    read: ['ai-peer-review.protocol/v1', 'ai-peer-review.protocol/v2'],
    write: ['ai-peer-review.protocol/v1', 'ai-peer-review.protocol/v2'],
  },
  participants: {
    read: ['ai-peer-review.participants/v1', 'ai-peer-review.participants/v2'],
    write: ['ai-peer-review.participants/v1', 'ai-peer-review.participants/v2'],
  },
  manifest: {
    read: ['ai-peer-review.manifest/v1'],
    write: ['ai-peer-review.manifest/v1'],
  },
  phaseManifest: {
    read: ['ai-peer-review.phase-manifest/v1'],
    write: ['ai-peer-review.phase-manifest/v1'],
  },
  response: {
    read: ['ai-peer-review.response/v1'],
    write: ['ai-peer-review.response/v1'],
  },
  context: {
    read: ['ai-peer-review.context/v1', 'ai-peer-review.context/v2'],
    write: ['ai-peer-review.context/v1', 'ai-peer-review.context/v2'],
  },
  runtime: {
    read: ['ai-peer-review.runtime/v1'],
    write: ['ai-peer-review.runtime/v1'],
  },
  startup: {
    read: ['ai-peer-review.startup-request/v1'],
    write: ['ai-peer-review.startup-request/v1'],
  },
  runtimeImage: {
    read: ['ai-peer-review.runtime-image/v1'],
    write: ['ai-peer-review.runtime-image/v1'],
  },
  brokerRegistration: {
    read: ['ai-peer-review.broker-registration/v1'],
    write: ['ai-peer-review.broker-registration/v1'],
  },
  brokerBootstrap: {
    read: ['ai-peer-review.broker-bootstrap/v1', 'ai-peer-review.broker-bootstrap/v2'],
    write: ['ai-peer-review.broker-bootstrap/v2'],
  },
  reservation: {
    read: ['ai-peer-review.collateral-reservation/v1'],
    write: ['ai-peer-review.collateral-reservation/v1'],
  },
  lineage: {
    read: ['ai-peer-review.lineage-receipt/v1'],
    write: ['ai-peer-review.lineage-receipt/v1'],
  },
  invitation: {
    read: ['ai-peer-review.invitation-routing/v1'],
    write: ['ai-peer-review.invitation-routing/v1'],
  },
  archive: {
    read: ['ai-peer-review.relocation-plan/v1', 'ai-peer-review.relocation-receipt/v1'],
    write: ['ai-peer-review.relocation-plan/v1', 'ai-peer-review.relocation-receipt/v1'],
  },
});
export const PROTOCOL_STATES = Object.freeze([
  'awaiting-reviewer',
  'reviewer-turn',
  'author-revision',
  'acceptance-pending',
  'author-finalization',
  'awaiting-phase-artifact',
  'intervention-required',
  'accepted',
  'accepted-uncommitted',
  'accepted-over-objections',
  'accepted-over-objections-uncommitted',
  'abandoned',
  'superseded',
  'planned',
  'consolidated',
]);
