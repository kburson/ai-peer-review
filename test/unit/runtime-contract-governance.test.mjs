// @story #144
// Closed document grammar only; these fixtures never supply adoption authority.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as evidence from '../../scripts/lib/runtime-contract-evidence.mjs';
import * as checker from '../../scripts/check-runtime-contract-adoption.mjs';
const fixture = JSON.parse(
  readFileSync(new URL('../fixtures/runtime-contract-governance.json', import.meta.url))
);
test('[#144] governed record has closed grammar without fixture adoption authority', () => {
  assert.equal(typeof checker.validateRuntimeContractRecord, 'function');
  assert.equal(checker.validateRuntimeContractRecord(fixture.record), true);
  const report = checker.checkRuntimeContractAdoption({
    record: fixture.record,
    artifacts: new Map(),
    mode: 'adoption-only',
  });
  assert.equal(report.contractAdopted, false);
  assert.equal(report.activationAuthorized, false);
  assert.equal(report.publicationAllowed, false);
});
for (const [name, change] of [
  ['missing expected root author', (r) => delete r.governance.expectedEvidenceApprover],
  ['missing checker schema refs', (r) => delete r.governance.checkerSchemas],
  ['missing exact current importer refs', (r) => delete r.governance.checkerImporterSources],
  ['missing observed interface source', (r) => delete r.activationBinding.interfaceSources],
  ['missing governance', (r) => delete r.governance],
  ['unknown governance claim', (r) => (r.governance.approved = true)],
  ['missing canonical review', (r) => delete r.governance.canonicalPlanReview],
  ['missing prior receipt', (r) => r.governance.priorLineage.pop()],
  [
    'unreviewed source closure shape',
    (r) => (r.governance.priorLineage[0].verifier = { approved: true }),
  ],
  [
    'invented detailed schema freeze',
    (r) => (r.governance.normativeTargets[0].detailedSchemaFrozen = true),
  ],
  [
    'missing original source marker',
    (r) => delete r.governance.nativeMapping.originalSourcePlanCommit,
  ],
  ['future release authority', (r) => (r.activationBinding.release = { tag: 'future' })],
  ['unknown owner field', (r) => (r.evidence.wholePlanAccepted = true)],
]) {
  test('[#144] closed governed record refuses ' + name, () => {
    const r = structuredClone(fixture.record);
    change(r);
    assert.equal(checker.validateRuntimeContractRecord(r), false);
  });
}
test('[#144] missing governed evidence cannot be interpreted as fixture success', () => {
  const report = checker.checkRuntimeContractAdoption({
    record: fixture.record,
    artifacts: new Map(),
    mode: 'adoption-only',
  });
  assert.ok(report.contractBlockers.includes('governed-evidence-incomplete'));
});

test('[#144] governed evidence cannot adopt without independently pinned normal record and native transaction', () => {
  assert.equal(typeof evidence.verifyGovernedRuntimeContractEvidence, 'function');
  const r = evidence.verifyGovernedRuntimeContractEvidence({
    record: fixture.record,
    artifacts: new Map(),
    lineageProofs: fixture.record.governance.priorLineage,
  });
  assert.equal(r.adoptionEvidenceComplete, false);
  assert.ok(r.blockers.includes('governed-evidence-incomplete'));
});

test('[#144] object-only Git reader survives the observed Windows long-ref stat boundary', () => {
  assert.equal(typeof checker.readRuntimeContractGitBlob, 'function');
  const revision = 'a'.repeat(40),
    oid = 'b'.repeat(40),
    longPath = 'docs/' + 'long-accepted-name/'.repeat(20) + 'manifest.md';
  const bytes = Buffer.from('exact retained manifest bytes');
  const reader = (args) => {
    if (args[0] === 'show') throw Error('Filename too long');
    if (args[0] === 'rev-parse') return Buffer.from(oid + '\n');
    if (args[0] === 'cat-file' && args[1] === 'blob' && args[2] === oid) return bytes;
    throw Error('Unexpected Git operation');
  };
  assert.deepEqual(checker.readRuntimeContractGitBlob(reader, revision, longPath), bytes);
  assert.throws(
    () => checker.readRuntimeContractGitBlob(reader, '--unsafe', longPath),
    /artifact-reference-invalid/
  );
});

test('[#144] approved selector refuses caller-only four-field authority without retained proof and native transaction', () => {
  const r = fixture.record.governance.priorLineage[0].receipt,
    review = fixture.record.amendmentReview;
  assert.throws(
    () =>
      checker.validateApprovedSelector(
        {
          schema: 'ai-peer-review.runtime-contract-approved-ref/v1',
          evidenceRevision: 'a'.repeat(40),
          record: r,
          approvalReview: review,
        },
        r.path
      ),
    /approved-reference-incomplete/
  );
});

test('[#144] fixed versioned consumer pins preserve unrelated source evolution and refuse importer drift', () => {
  assert.equal(typeof evidence.checkRuntimeContractConsumerPins, 'function');
  const g = structuredClone(fixture.record.governance),
    artifacts = new Map();
  for (const r of [...g.checkerSchemas, ...g.checkerImporterSources]) {
    const bytes = readFileSync(new URL('../../' + r.path, import.meta.url));
    r.sha256 = createHash('sha256').update(bytes).digest('hex');
    r.blob = createHash('sha1')
      .update(Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes]))
      .digest('hex');
    artifacts.set(r.revision + ':' + r.path, bytes);
  }
  assert.equal(evidence.checkRuntimeContractConsumerPins({ governance: g, artifacts }), true);
  artifacts.set('unrelated:new-schema.json', Buffer.from('{}'));
  assert.equal(evidence.checkRuntimeContractConsumerPins({ governance: g, artifacts }), true);
  const drift = structuredClone(g);
  drift.checkerImporterSources.pop();
  assert.equal(evidence.checkRuntimeContractConsumerPins({ governance: drift, artifacts }), false);
  const forged = structuredClone(g);
  forged.checkerSchemas[0].sha256 = 'f'.repeat(64);
  assert.equal(evidence.checkRuntimeContractConsumerPins({ governance: forged, artifacts }), false);
  const changed = structuredClone(g),
    r = changed.checkerImporterSources[0],
    bytes = Buffer.from('unreviewed importer');
  r.sha256 = createHash('sha256').update(bytes).digest('hex');
  r.blob = createHash('sha1')
    .update(Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes]))
    .digest('hex');
  artifacts.set(r.revision + ':' + r.path, bytes);
  assert.equal(
    evidence.checkRuntimeContractConsumerPins({ governance: changed, artifacts }),
    false
  );
});

function approvalGrammarFixture() {
  const g = fixture.record.governance,
    prior = g.priorLineage,
    lineage = [...prior, structuredClone(prior[0])];
  return {
    schema: 'ai-peer-review.runtime-contract-evidence-approval/v1',
    issue: 144,
    scope: 'document-contract-adoption-only',
    record: prior[0].review.subject,
    approvalReview: prior[0].review,
    canonicalPlanReview: g.canonicalPlanReview,
    nativeMapping: g.nativeMapping,
    lineageProofs: lineage,
    nativeTransaction: {
      issue: 144,
      role: 'orchestrator',
      command: 'aitm comment',
      ownedCommentKey: 'runtime-contract-approved-evidence.' + prior[0].review.reviewId,
      bindingVerified: true,
      lifecycleApproval: false,
      observedAt: '2026-10-05T00:00:00Z',
      actorSessionFingerprint: 'a'.repeat(64),
      bindingGenerationId: '00000000-0000-0000-0000-000000000000',
    },
    rootInspection: {
      method: 'independent-local-source-and-complete-lineage-inspection',
      receiptReferences: lineage.map((x) => x.receipt),
      verifierReferences: lineage.map((x) => x.verifier),
      limitations: ['Fixture grammar only; no native transaction or adoption authority.'],
    },
    authorityAssurance: 'unavailable',
    activationAuthorized: false,
    publicationAllowed: false,
    remainingObligations: ['Task18 accepted schema and live installed conformance unavailable.'],
    observedAt: '2026-10-05T00:00:00Z',
  };
}
test('[#144] closed approval payload grammar never supplies a native transaction', () => {
  assert.equal(checker.validateRuntimeContractEvidenceApproval(approvalGrammarFixture()), true);
});
for (const [name, change] of [
  ['missing genuine actor field', (p) => delete p.nativeTransaction.actorSessionFingerprint],
  ['missing actual occupancy generation', (p) => delete p.nativeTransaction.bindingGenerationId],
  ['future comment exit claim', (p) => (p.nativeTransaction.exitCode = 0)],
  ['lifecycle approval', (p) => (p.nativeTransaction.lifecycleApproval = true)],
  ['stronger assurance', (p) => (p.authorityAssurance = 'host-verified')],
  ['invented own terminal', (p) => p.lineageProofs.pop()],
  ['unknown inspection authority', (p) => (p.rootInspection.humanApproved = true)],
  ['operational publication', (p) => (p.publicationAllowed = true)],
])
  test('[#144] approval grammar refuses ' + name, () => {
    const p = approvalGrammarFixture();
    change(p);
    assert.equal(checker.validateRuntimeContractEvidenceApproval(p), false);
  });
