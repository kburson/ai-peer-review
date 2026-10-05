// @story #144
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const api = await import('../../scripts/check-runtime-contract-adoption.mjs').catch(() => ({}));
const cases = JSON.parse(
  readFileSync(new URL('../fixtures/runtime-contract-adoption.json', import.meta.url))
);
const hash = (b) => createHash('sha256').update(b).digest('hex');
const gitBlob = (b) =>
  createHash('sha1')
    .update(Buffer.concat([Buffer.from('blob ' + b.length + '\0'), b]))
    .digest('hex');
function fixture(assurance = 'unavailable') {
  const artifacts = new Map();
  const revision = 'a'.repeat(40);
  const add = (path, content) => {
    const bytes = Buffer.from(typeof content === 'string' ? content : JSON.stringify(content));
    const ref = { revision, path, blob: gitBlob(bytes), sha256: hash(bytes) };
    artifacts.set(revision + ':' + path, bytes);
    return ref;
  };
  const subject = add('docs/contracts/follow-up.md', 'Exact joint follow-up owner contract.');
  const plan = add('docs/plans/owner-addenda.md', 'Bounded owner plan addenda.');
  const author = 'sha256:' + '1'.repeat(64),
    reviewer = 'sha256:' + '2'.repeat(64);
  const review = (subject, suffix) => {
    const reviewId = 'review-fixture-' + suffix;
    const response = [
      '---',
      'schema: "ai-peer-review.response/v1"',
      'review_id: "' + reviewId + '"',
      'role: "reviewer"',
      'turn: 1',
      'commit_mode: "normal"',
      'authority_assurance: ' + JSON.stringify(assurance),
      'artifact_path: ' + JSON.stringify(subject.path),
      'artifact_commit: ' + JSON.stringify(subject.revision),
      'artifact_blob: ' + JSON.stringify(subject.blob),
      'artifact_digest: "sha256:' + subject.sha256 + '"',
      'agent:',
      '  host: "claude"',
      '  provider: "anthropic"',
      '  model_id: "fixture-model"',
      '  model_display: "fixture-model"',
      '  session_fingerprint: "' + reviewer + '"',
      '  identity_source: "fixture-only"',
      'started_at: "2026-10-01T00:00:00Z"',
      'submitted_at: "2026-10-01T00:00:01Z"',
      'finding_ids: []',
      'answered_finding_ids: []',
      'acknowledged_supplement_ids: []',
      '---',
      '',
      '## Summary',
      '',
      'Fixture only.',
      '',
      '## Findings',
      '',
      'None.',
      '',
      '## Required changes',
      '',
      'None.',
      '',
      '## Optional suggestions',
      '',
      'None.',
      '',
      '## Decision',
      '',
      'accepted',
      '',
    ].join('\n');
    const responseRef = add('evidence/reviews/' + reviewId + '/reviewer.md', response);
    const responsePointer = { path: responseRef.path, digest: 'sha256:' + responseRef.sha256 };
    const manifest = {
      schema: 'ai-peer-review.manifest/v1',
      review_id: reviewId,
      status: 'accepted',
      commit_mode: 'normal',
      acceptance_basis: 'reviewer-consensus',
      authority_assurance: assurance,
      final_commit: revision,
      artifact_path: subject.path,
      artifact_history: [
        {
          turn: 0,
          path: subject.path,
          commit: revision,
          blob: subject.blob,
          digest: 'sha256:' + subject.sha256,
        },
      ],
      participants: {
        author: { session_fingerprint: author },
        reviewer: { session_fingerprint: reviewer },
      },
      turns: [{ turn: 1, decision: 'accepted', reviewer_response: responsePointer }],
      lineage_receipt: {
        schema: 'ai-peer-review.lineage-receipt/v1',
        complete: true,
        attempts: [
          {
            review_id: reviewId,
            record_id: reviewId,
            root_review_id: reviewId,
            recovery_ordinal: 0,
            predecessor_review_id: null,
            successor_review_id: null,
            recovery_id: null,
            recovery_claim_digest: null,
            reciprocal_receipt_digest: null,
            consumed_grant_digest: null,
            event_log_digest: 'sha256:' + '3'.repeat(64),
          },
        ],
      },
    };
    const manifestRef = add('evidence/reviews/' + reviewId + '/manifest.json', manifest);
    const message = Buffer.from(
      'Fixture only\n\nPeer-Review-ID: ' +
        reviewId +
        '\nPeer-Review-Turn: 2\nPeer-Review-Artifact-Blob: ' +
        subject.blob +
        '\nPeer-Review-Acceptance: sha256:' +
        responseRef.sha256 +
        '\nPeer-Review-Manifest: sha256:' +
        manifestRef.sha256 +
        '\n'
    );
    const finalization = {
      revision: createHash('sha1')
        .update('fixture-' + suffix)
        .digest('hex'),
      sha256: hash(message),
    };
    artifacts.set('commit:' + finalization.revision, message);
    artifacts.set('parent:' + finalization.revision, revision);
    artifacts.set(
      'tree:' + finalization.revision + ':' + manifestRef.path,
      artifacts.get(revision + ':' + manifestRef.path)
    );
    artifacts.set(
      'tree:' + finalization.revision + ':' + responseRef.path,
      artifacts.get(revision + ':' + responseRef.path)
    );
    return { reviewId, subject, manifest: manifestRef, finalResponse: responseRef, finalization };
  };
  const jointReview = review(subject, 'joint'),
    planReview = review(plan, 'plan');
  const record = {
    schema: 'ai-peer-review.runtime-contract-adoption/v1',
    issue: 144,
    runtimePolicy: { issue: 102, contract: subject, plan, adoptionReview: jointReview, planReview },
    evidence: { issue: 30, contract: subject, plan, adoptionReview: jointReview, planReview },
    analytics: { issue: 34, contract: subject, plan, adoptionReview: jointReview, planReview },
    telemetry: { issue: 109, contract: subject, plan, adoptionReview: jointReview, planReview },
    amendment: subject,
    amendmentReview: jointReview,
    reviewedDigests: [subject.sha256, plan.sha256],
    schemas: [subject],
    decisions: {
      runtimeInstallation: 'current-global',
      policyAuthority: 'exclusive-primary',
      legacyRecovery: 'drain-before-replacement',
      evidenceIntegration: 'owner30-canonical',
      telemetryIntegration: 'exact-attempt',
      responseCompatibility: 'contextual-schema-artifacts',
    },
    unresolvedConflicts: [],
    activationBinding: {
      ownerIssue: 102,
      source: subject,
      registration: subject,
      interfaces: [
        'assertSelectedRuntime',
        'withPrimaryAdmissionFence',
        'resolvePrimaryAuthority',
        'inspectPrimaryReviewInventory',
      ],
      guarantees: ['old-family-exclusion', 'pre-replacement-drain'],
      unresolvedOverlapObligations: [],
      release: null,
      conformance: [],
    },
  };
  return { record, artifacts, add, review };
}
test('[#144] checker exposes its document-only boundary', () => {
  assert.equal(typeof api.checkRuntimeContractAdoption, 'function');
});
test('[#144] accepted fixture contract never manufactures pending activation proof', () => {
  const f = fixture(),
    result = api.checkRuntimeContractAdoption(f);
  assert.equal(result.contractAdopted, true);
  assert.equal(result.activationAuthorized, false);
  assert.equal(result.publicationAllowed, false);
  assert.ok(result.activationBlockers.includes('release-proof-incomplete'));
  assert.deepEqual(result.assurance, ['unavailable']);
});
for (const name of cases.negativeCases.filter((x) => x !== 'pending-release')) {
  test('[#144] adoption refuses ' + name, () => {
    const f = fixture(),
      r = f.record;
    const mutateManifest = (change) => {
      const ref = r.amendmentReview.manifest;
      const value = JSON.parse(f.artifacts.get(ref.revision + ':' + ref.path));
      change(value);
      const replacement = f.add(ref.path, value);
      for (const owner of ['runtimePolicy', 'evidence', 'analytics', 'telemetry'])
        r[owner].adoptionReview.manifest = replacement;
      r.amendmentReview.manifest = replacement;
    };
    switch (name) {
      case 'wrong-owner':
        r.runtimePolicy.issue = 107;
        break;
      case 'unknown-owner':
        r.unknownOwner = { issue: 999 };
        break;
      case 'digest-drift':
        f.artifacts.set(r.amendment.revision + ':' + r.amendment.path, Buffer.from('drift'));
        break;
      case 'wrong-blob':
        r.amendment.blob = 'b'.repeat(40);
        break;
      case 'unavailable-bytes':
        f.artifacts.delete(r.amendment.revision + ':' + r.amendment.path);
        break;
      case 'requested-revisions':
        mutateManifest((x) => {
          x.status = 'revisions-requested';
        });
        break;
      case 'no-commit':
        mutateManifest((x) => {
          x.commit_mode = 'no-commit';
        });
        break;
      case 'missing-response':
        f.artifacts.delete(
          r.amendmentReview.finalResponse.revision + ':' + r.amendmentReview.finalResponse.path
        );
        break;
      case 'stale-subject':
        mutateManifest((x) => {
          x.artifact_history[0].digest = 'sha256:' + '0'.repeat(64);
        });
        break;
      case 'same-session':
        mutateManifest((x) => {
          x.participants.reviewer.session_fingerprint = x.participants.author.session_fingerprint;
        });
        break;
      case 'incomplete-lineage':
        mutateManifest((x) => {
          x.lineage_receipt.complete = false;
        });
        break;
      case 'fixture-authority':
        r.amendment.path = 'test/fixtures/adoption.json';
        break;
      case 'unresolved-contract':
        r.unresolvedConflicts.push('pending policy choice');
        break;
      case 'missing-activation-binding':
        r.activationBinding = null;
        break;
      case 'overlap-obligation':
        r.activationBinding.unresolvedOverlapObligations.push('legacy writer');
        break;
      case 'path-traversal':
        r.amendment.path = '../outside.md';
        break;
      default:
        assert.fail(name);
    }
    const result = api.checkRuntimeContractAdoption(f);
    assert.equal(result.publicationAllowed, false);
    if (name === 'overlap-obligation') {
      assert.equal(result.contractAdopted, true);
      assert.equal(result.activationAuthorized, false);
      assert.ok(result.activationBlockers.includes('activation-overlap-unresolved'));
    } else {
      assert.equal(result.contractAdopted, false, name);
      assert.ok(result.contractBlockers.length > 0, name);
    }
  });
}

test('[#144] immutable record pin still requires accepted record review proof', () => {
  const f = fixture(),
    recordReference = f.add('evidence/portable-runtime/contracts/adoption.json', f.record);
  const approvalReview = f.review(recordReference, 'record');
  const value = JSON.parse(
    f.artifacts.get(approvalReview.manifest.revision + ':' + approvalReview.manifest.path)
  );
  value.status = 'revisions-requested';
  approvalReview.manifest = f.add(approvalReview.manifest.path, value);
  const result = api.checkRuntimeContractAdoption({ ...f, recordReference, approvalReview });
  assert.equal(result.contractAdopted, false);
  assert.ok(result.contractBlockers.includes('review-not-accepted'));
});
test('[#144] accepted review needs exact finalization transaction receipt', () => {
  const f = fixture();
  f.record.amendmentReview.finalization = null;
  const result = api.checkRuntimeContractAdoption(f);
  assert.equal(result.contractAdopted, false);
  assert.ok(result.contractBlockers.includes('review-finalization-incomplete'));
});
test('[#144] CLI refuses unknown or duplicate flags without authority effects', () => {
  for (const args of [
    [],
    ['--force', 'yes'],
    ['--record', 'a', '--record', 'b', '--approved-ref', 'c'],
    ['--record', 'a', '--approved-ref'],
    ['--record', 'a', '--approved-ref', '--force'],
  ])
    assert.throws(() => api.parseAdoptionArgs(args), /usage-invalid/);
  assert.deepEqual(api.parseAdoptionArgs(['--record', 'a', '--approved-ref', 'b']), {
    record: 'a',
    approvedRef: 'b',
  });
});

const conformanceCases = [
  'changed-current-selection',
  'unsupported-active-fenced-journals',
  'mixed-policy',
  'old-launcher-after-probe',
  'simultaneous-native-portable-start',
  'pre-replacement-drain',
  'broker-crash-window',
  'configured-roots',
];
function releaseFixture(f) {
  const release = {
    sourceRevision: 'a'.repeat(40),
    tag: 'v-fixture',
    tarball: f.add('evidence/release/fixture.tgz', 'illustrative tarball bytes'),
  };
  f.artifacts.set('tag:' + release.tag, release.sourceRevision);
  f.record.activationBinding.release = release;
  return release;
}
test('[#144] unrelated accepted follow-up cannot substitute for installed conformance', () => {
  const f = fixture();
  releaseFixture(f);
  f.record.activationBinding.conformance = conformanceCases.map((name) => ({
    case: name,
    artifact: f.record.amendment,
    review: f.record.amendmentReview,
  }));
  const result = api.checkRuntimeContractAdoption(f);
  assert.equal(result.contractAdopted, true);
  assert.equal(result.activationAuthorized, false);
  assert.ok(result.activationBlockers.includes('activation-conformance-invalid'));
});
test('[#144] complete illustrative reviewed proof exercises activation without becoming CLI authority', () => {
  const f = fixture(),
    release = releaseFixture(f);
  f.record.activationBinding.conformance = conformanceCases.map((name) => {
    const artifact = f.add('evidence/conformance/' + name + '.json', {
      schema: 'ai-peer-review.activation-conformance/v1',
      ownerIssue: 102,
      case: name,
      sourceRevision: release.sourceRevision,
      releaseTag: release.tag,
      tarballSha256: release.tarball.sha256,
      observations: ['darwin', 'linux', 'win32'].map((platform) => ({
        platform,
        outcome: 'passed',
        mode: 'genuine-installed-process',
        observedAt: '2026-10-01T00:00:00Z',
        receipt: f.add('evidence/conformance/' + name + '-' + platform + '.json', {
          case: name,
          platform,
          sourceRevision: release.sourceRevision,
          tarballSha256: release.tarball.sha256,
          outcome: 'passed',
          mode: 'genuine-installed-process',
          observedAt: '2026-10-01T00:00:00Z',
        }),
      })),
    });
    return { case: name, artifact, review: f.review(artifact, name) };
  });
  const report = api.checkRuntimeContractAdoption(f);
  assert.equal(report.contractAdopted, true);
  assert.equal(report.activationAuthorized, true);
  assert.equal(report.publicationAllowed, true);
});

test('[#144] pinned conformance reports load each referenced platform receipt', () => {
  const f = fixture();
  const receipt = f.add('evidence/runtime/linux-receipt.json', { outcome: 'passed' });
  const artifact = f.add('evidence/runtime/conformance.json', {
    schema: 'ai-peer-review.activation-conformance/v1',
    observations: [{ receipt }],
  });
  const seen = [];
  api.collectConformanceReceipts(
    { activationBinding: { conformance: [{ artifact }] } },
    (ref) => f.artifacts.get(ref.revision + ':' + ref.path),
    (ref) => seen.push(ref)
  );
  assert.deepEqual(seen, [receipt]);
});
test('[#144] incomplete approved selector fails before consulting Git', () => {
  assert.equal(typeof api.validateApprovedSelector, 'function');
  assert.throws(
    () =>
      api.validateApprovedSelector(
        {
          schema: 'ai-peer-review.runtime-contract-approved-ref/v1',
          evidenceRevision: 'a'.repeat(40),
          record: {
            revision: 'a'.repeat(40),
            path: 'evidence/portable-runtime/contracts/record.json',
          },
          approvalReview: null,
        },
        'evidence/portable-runtime/contracts/record.json'
      ),
    /approved-reference-incomplete/
  );
});

for (const strength of ['cryptographic-external', 'hardware-presence', 'host-verified']) {
  test('[#144] actual collateral assurance is preserved: ' + strength, () => {
    const result = api.checkRuntimeContractAdoption(fixture(strength));
    assert.equal(result.contractAdopted, true);
    assert.deepEqual(result.assurance, [strength]);
  });
}
test('[#144] test signer assurance cannot adopt a production contract', () => {
  const result = api.checkRuntimeContractAdoption(fixture('unverified-test'));
  assert.equal(result.contractAdopted, false);
  assert.ok(result.contractBlockers.includes('review-assurance-invalid'));
});

test('[#144] trailers alone cannot replace exact finalization tree and parent proof', () => {
  const f = fixture();
  const finalization = f.record.amendmentReview.finalization;
  f.artifacts.delete(
    'tree:' + finalization.revision + ':' + f.record.amendmentReview.manifest.path
  );
  f.artifacts.set('parent:' + finalization.revision, 'b'.repeat(40));
  const result = api.checkRuntimeContractAdoption(f);
  assert.equal(result.contractAdopted, false);
  assert.ok(result.contractBlockers.includes('review-finalization-tree-mismatch'));
  assert.ok(result.contractBlockers.includes('review-finalization-parent-mismatch'));
});
