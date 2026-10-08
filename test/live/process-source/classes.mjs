// @story #170
// Signed capture data may propose finite coverage; this module never accepts a class.
import { verifyProcessSourceReceiptCore, processSourceRecordDigest } from './records.mjs';
const fail = (code) => {
  throw Error(code);
};
export function proposeProcessSourceClassCore(options = {}) {
  if (
    !options ||
    Object.getPrototypeOf(options) !== Object.prototype ||
    Object.keys(options).sort().join(',') !==
      'receipts,registrationIndexDigest,registrationRevision,registrations'
  )
    fail('proposal-options');
  const { receipts, registrations, registrationRevision, registrationIndexDigest } = options;
  if (
    !Array.isArray(receipts) ||
    !receipts.length ||
    receipts.length > 512 ||
    !Array.isArray(registrations) ||
    registrations.length !== receipts.length
  )
    fail('proposal-evidence-missing');
  if (new Set(receipts.map((r) => r?.captureId)).size !== receipts.length)
    fail('proposal-duplicate-capture');
  const verified = receipts.map((receipt, i) =>
    verifyProcessSourceReceiptCore({
      receipt,
      registration: registrations[i],
      packageReceipt: registrations[i]?.package,
      registrationRevision,
      registrationIndexDigest,
    })
  );
  const first = receipts[0];
  for (const receipt of receipts)
    if (
      receipt.kind !== first.kind ||
      receipt.scope.platform !== first.scope.platform ||
      receipt.package.contractDigest !== first.package.contractDigest ||
      processSourceRecordDigest(receipt.scope.probe) !==
        processSourceRecordDigest(first.scope.probe)
    )
      fail('proposal-incompatible-source');
  const unique = (values) =>
    [...new Set(values)].sort((a, b) => (typeof a === 'number' ? a - b : a.localeCompare(b)));
  const builds = unique(receipts.map((r) => r.scope.build));
  const architectures = unique(receipts.map((r) => r.scope.architecture));
  const nodeMajors = unique(receipts.map((r) => r.scope.nodeMajor));
  const tuples = new Set(
    receipts.map((r) => JSON.stringify([r.scope.build, r.scope.architecture, r.scope.nodeMajor]))
  );
  for (const build of builds)
    for (const arch of architectures)
      for (const node of nodeMajors)
        if (!tuples.has(JSON.stringify([build, arch, node]))) fail('proposal-untested-scope');
  const semantics = {
    linux: {
      absence: ['linux-pid-directory-v1', 'not-applicable'],
      creation: ['linux-start-ticks-v1', 'one-tick'],
    },
    darwin: {
      absence: ['darwin-ps-selection-v1', 'not-applicable'],
      creation: ['darwin-lstart-utc-v1', 'one-second'],
    },
    win32: {
      absence: ['windows-cim-completed-v1', 'not-applicable'],
      creation: ['windows-utc-v1', 'one-hundred-nanoseconds'],
    },
  }[first.scope.platform][first.kind];
  const packages = new Map(receipts.map((r) => [processSourceRecordDigest(r.package), r.package]));
  const content = {
    schema: 'ai-peer-review.process-source-class-proposal/v1',
    capability: first.kind,
    scope: {
      platform: first.scope.platform,
      builds,
      architectures,
      nodeMajors,
      probe: first.scope.probe,
    },
    contractDigest: first.package.contractDigest,
    semantics: semantics[0],
    precision: semantics[1],
    evidenceDigests: unique(verified.map((r) => r.receiptDigest)),
    registrationRevision,
    registrationIndexDigest,
    packageProvenance: [...packages.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v),
  };
  return Object.freeze({
    verified: false,
    classAdmitted: false,
    proposal: { ...content, classId: 'source-' + processSourceRecordDigest(content).slice(7, 39) },
  });
}

export function verifyProcessSourceProposalCore(options = {}) {
  if (
    !options ||
    Object.getPrototypeOf(options) !== Object.prototype ||
    Object.keys(options).sort().join(',') !==
      'current,proposal,receipts,registrationIndexDigest,registrationRevision,registrations'
  )
    fail('proposal-options');
  const { proposal, current, ...evidence } = options;
  const recomputed = proposeProcessSourceClassCore(evidence).proposal;
  if (processSourceRecordDigest(proposal) !== processSourceRecordDigest(recomputed))
    fail('proposal-mismatch');
  if (
    !current ||
    Object.keys(current).sort().join(',') !== 'contractDigest,scope' ||
    !current.scope
  )
    fail('proposal-current-source-invalid');
  const { scope } = current;
  const finite = proposal.scope;
  const applicable =
    current.contractDigest === proposal.contractDigest &&
    scope.platform === finite.platform &&
    finite.builds.includes(scope.build) &&
    finite.architectures.includes(scope.architecture) &&
    finite.nodeMajors.includes(scope.nodeMajor) &&
    processSourceRecordDigest(scope.probe) === processSourceRecordDigest(finite.probe);
  return Object.freeze({
    verified: false,
    applicable,
    classAdmitted: false,
    historicalPackages: proposal.packageProvenance,
    reason: applicable ? 'finite-source-match' : 'source-class-unavailable',
  });
}
