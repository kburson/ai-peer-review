// @story #144
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { identityEvidence } from '../../src/identity/evidence.mjs';
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
  const plan = add(
    'docs/plans/owner-addenda.md',
    [102, 30, 34, 109]
      .map(
        (issue) =>
          '### #' +
          issue +
          ' — bounded owner contract\n\nExact bounded intent for owner #' +
          issue +
          '.\n'
      )
      .join('\n')
  );
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
      record_id: reviewId,
      residual_risk: assurance === 'unavailable' ? ['human-authority-unavailable'] : [],
      startup_commit: revision,
      identity_changes: [],
      claims: [],
      recoveries: [],
      supplements: [],
      authority: { policy: 'unavailable', verifier: null, acceptance_attestation: null },
      human_decision: null,
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
          snapshot: null,
        },
      ],
      participants: {
        ...Object.fromEntries(
          [
            ['author', author, 'codex'],
            ['reviewer', reviewer, 'claude-code'],
          ].map(([role, session_fingerprint, host]) => [
            role,
            {
              role,
              host,
              provider: host,
              model_id: 'fixture-model',
              model_display: 'fixture-model',
              session_fingerprint,
              identity_source: 'fixture-only',
              joined_at: '2026-10-01T00:00:00Z',
              evidence: identityEvidence({
                sessionFingerprint: session_fingerprint,
                sessionSource: 'explicit-declaration',
                modelId: 'fixture-model',
                modelSource: 'explicit-declaration',
              }),
            },
          ])
        ),
      },
      turns: [
        {
          turn: 1,
          decision: 'accepted',
          reviewer_response: responsePointer,
          finding_ids: [],
          author_response: null,
          artifact: null,
          commit: null,
          snapshot: null,
        },
      ],
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
  for (const role of ['runtimePolicy', 'evidence', 'analytics', 'telemetry']) {
    const owner = record[role];
    const issue = owner.issue;
    const section = '### #' + issue + ' — bounded owner contract';
    const text = section + '\n\nExact bounded intent for owner #' + issue + '.';
    const ownedKey = 'runtime-contract-adoption.144-v1';
    const body =
      '# Bounded contract adoption — #' +
      issue +
      '\nBundle: A\n' +
      plan.path +
      '\n' +
      plan.blob +
      '\n' +
      plan.sha256 +
      '\n' +
      planReview.reviewId +
      '\n' +
      subject.sha256 +
      '\n' +
      text +
      '\n<!-- aitm-owned-comment key="' +
      ownedKey +
      '" -->';
    const bodyRef = add('evidence/owners/' + issue + '.md', body);
    const facts = {
      ownerIssue: issue,
      repository: 'kburson/ai-peer-review',
      authenticatedActor: 'fixture-actor',
      comment: {
        nodeId: 'IC-fixture-' + issue,
        id: 1000 + issue,
        url:
          'https://github.com/kburson/ai-peer-review/issues/' +
          issue +
          '#issuecomment-' +
          (1000 + issue),
        ownedKey,
        sha256: bodyRef.sha256,
        authoredBy: 'fixture-actor',
        createdAt: '2026-10-01T00:00:00Z',
      },
      issueBody: { version: 1, sha256: '5'.repeat(64), ordinaryMetadataAndMarkersPreserved: true },
      acceptedOwnerPlan: {
        revision: planReview.finalization.revision,
        blob: plan.blob,
        sha256: plan.sha256,
        reviewId: planReview.reviewId,
      },
      native: {
        commentExit: 0,
        bodyExit: 0,
        bindingVerified: true,
        role: 'agent',
        branch: 'fixture/owner-' + issue,
        lifecycleStatePreserved: 'plan',
        pauseExit: 0,
        occupancyReleaseExit: 0,
        paused: true,
        timerOpen: false,
        activeBindingAbsent: true,
        sourceAndOldCollateralPreserved: true,
      },
      jointAdoptionClaim: false,
      fullCanonicalPlanAndContractActivationGatesPending: true,
      recordedAt: '2026-10-01T00:00:01Z',
    };
    record[role] = {
      issue,
      boundedSubsection: section,
      bundle: 'A',
      reconciliation: subject,
      boundedPlan: plan,
      planReview,
      nativeAdoption: {
        kind: 'aitm-owned-comment',
        repository: facts.repository,
        ownerIssue: issue,
        ownedCommentKey: ownedKey,
        commentDatabaseId: facts.comment.id,
        commentNodeId: facts.comment.nodeId,
        url: facts.comment.url,
        body: bodyRef,
        bodySha256: bodyRef.sha256,
        nativeReceipt: add('evidence/owners/' + issue + '-receipt.json', facts),
        publishedAt: facts.comment.createdAt,
        observedAt: facts.recordedAt,
      },
      preservedBaselines: [{ kind: 'broader-plan', status: 'unaccepted', reference: plan }],
      remainingObligations: ['Implementation and exact release activation remain pending.'],
    };
  }
  return { record, artifacts, add, review };
}
test('[#144] checker exposes its document-only boundary', () => {
  assert.equal(typeof api.checkRuntimeContractAdoption, 'function');
});
test('[#144] structural fixture never manufactures contract or activation authority', () => {
  const f = fixture(),
    result = api.checkRuntimeContractAdoption(f);
  assert.equal(result.contractAdopted, false);
  assert.equal(result.activationAuthorized, false);
  assert.equal(result.publicationAllowed, false);
  assert.ok(result.activationBlockers.includes('activation-addendum-missing'));
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
      assert.equal(result.contractAdopted, false);
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
    mode: 'publication',
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
test('[#144] contract release fields cannot substitute for separate installed conformance', () => {
  const f = fixture();
  releaseFixture(f);
  f.record.activationBinding.conformance = conformanceCases.map((name) => ({
    case: name,
    artifact: f.record.amendment,
    review: f.record.amendmentReview,
  }));
  const result = api.checkRuntimeContractAdoption(f);
  assert.equal(result.contractAdopted, false);
  assert.equal(result.activationAuthorized, false);
  assert.ok(result.contractBlockers.includes('contract-release-identity-forbidden'));
});
test('[#144] illustrative reviewed operational claims cannot put release identity in immutable contract', () => {
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
  assert.equal(report.contractAdopted, false);
  assert.equal(report.activationAuthorized, false);
  assert.equal(report.publicationAllowed, false);
  assert.ok(report.contractBlockers.includes('contract-release-identity-forbidden'));
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
  test('[#144] collateral grammar preserves assurance without adopting: ' + strength, () => {
    const result = api.checkRuntimeContractAdoption(fixture(strength));
    assert.equal(result.contractAdopted, false);
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

function changeJointManifest(f, mutate) {
  const proof = f.record.amendmentReview;
  const original = JSON.parse(f.artifacts.get(proof.manifest.revision + ':' + proof.manifest.path));
  mutate(original);
  proof.manifest = f.add(proof.manifest.path, original);
  return api.checkRuntimeContractAdoption(f);
}
// Missing full normal manifest fields must never be interpreted as accepted proof.
for (const key of [
  'record_id',
  'residual_risk',
  'startup_commit',
  'identity_changes',
  'claims',
  'recoveries',
  'supplements',
  'authority',
  'human_decision',
]) {
  test('[#144] review proof refuses missing closed manifest field ' + key, () => {
    const result = changeJointManifest(fixture(), (manifest) => {
      delete manifest[key];
    });
    assert.equal(result.contractAdopted, false);
    assert.ok(result.contractBlockers.includes('review-manifest-invalid'));
  });
}
for (const [label, mutate] of [
  [
    'unknown top-level field',
    (m) => {
      m.ignored_authority = true;
    },
  ],
  [
    'unknown participant field',
    (m) => {
      m.participants.author.raw_handle = 'forbidden';
    },
  ],
  [
    'missing participant role',
    (m) => {
      delete m.participants.reviewer.role;
    },
  ],
  [
    'invalid startup object',
    (m) => {
      m.startup_commit = null;
    },
  ],
  [
    'non-array claims',
    (m) => {
      m.claims = {};
    },
  ],
  [
    'missing turn finding list',
    (m) => {
      delete m.turns[0].finding_ids;
    },
  ],
  [
    'unknown authority field',
    (m) => {
      m.authority.accepted = true;
    },
  ],
  [
    'malformed lineage member',
    (m) => {
      m.lineage_receipt.attempts[0].extra = true;
    },
  ],
]) {
  test('[#144] full normal manifest grammar refuses ' + label, () => {
    const result = changeJointManifest(fixture(), mutate);
    assert.equal(result.contractAdopted, false);
    assert.ok(result.contractBlockers.includes('review-manifest-invalid'));
  });
}

function completeActivationFixture() {
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
  return f;
}
test('[#144] adoption-only never grants activation even with complete illustrative operational inputs', () => {
  const report = api.checkRuntimeContractAdoption({
    ...separateActivationFixture(),
    mode: 'adoption-only',
  });
  assert.equal(report.contractAdopted, false);
  assert.equal(report.activationAuthorized, false);
  assert.equal(report.publicationAllowed, false);
  assert.equal(report.mode, 'adoption-only');
});
test('[#144] default mode preserves publication requirement', () => {
  const report = api.checkRuntimeContractAdoption(separateActivationFixture());
  assert.equal(report.mode, 'publication');
  assert.equal(report.publicationAllowed, false);
});
test('[#144] unknown direct checker mode refuses instead of silently publishing', () => {
  const report = api.checkRuntimeContractAdoption({
    ...completeActivationFixture(),
    mode: 'contract',
  });
  assert.equal(report.contractAdopted, false);
  assert.equal(report.publicationAllowed, false);
  assert.ok(report.contractBlockers.includes('verification-mode-invalid'));
});
test('[#144] CLI mode is explicit closed data and defaults to publication', () => {
  assert.deepEqual(
    api.parseAdoptionArgs(['--mode', 'adoption-only', '--record', 'a', '--approved-ref', 'b']),
    {
      mode: 'adoption-only',
      record: 'a',
      approvedRef: 'b',
    }
  );
  for (const mode of ['contract', '', 'ADOPTION-ONLY']) {
    assert.throws(
      () => api.parseAdoptionArgs(['--record', 'a', '--approved-ref', 'b', '--mode', mode]),
      /verification-mode-invalid/
    );
  }
});
for (let bits = 1; bits < 7; bits++) {
  test('[#144] mixed Runtime Policy Prior-journal bundle refuses combination ' + bits, () => {
    const f = fixture();
    if (bits & 1) f.record.decisions.runtimeInstallation = 'reviewed-coexistence';
    if (bits & 2) f.record.decisions.policyAuthority = 'reviewed-layered-policy';
    if (bits & 4) f.record.decisions.legacyRecovery = 'reviewed-retained-runtime-recovery';
    const report = api.checkRuntimeContractAdoption(f);
    assert.equal(report.contractAdopted, false);
    assert.ok(report.contractBlockers.includes('coupled-bundle-incomplete'));
  });
}
test('[#144] complete B names alone cannot substitute for separately accepted coexistence amendment', () => {
  const f = fixture();
  f.record.decisions.runtimeInstallation = 'reviewed-coexistence';
  f.record.decisions.policyAuthority = 'reviewed-layered-policy';
  f.record.decisions.legacyRecovery = 'reviewed-retained-runtime-recovery';
  const report = api.checkRuntimeContractAdoption(f);
  assert.equal(report.contractAdopted, false);
  assert.ok(report.contractBlockers.includes('coexistence-amendment-missing'));
});

function separateActivationFixture() {
  const f = completeActivationFixture();
  const release = f.record.activationBinding.release;
  const conformance = f.record.activationBinding.conformance;
  f.record.activationBinding.release = null;
  f.record.activationBinding.conformance = [];
  f.recordReference = f.add('evidence/portable-runtime/contracts/adoption.json', f.record);
  f.approvalReview = f.review(f.recordReference, 'record');
  const addendum = f.add('evidence/portable-runtime/contracts/activation/v-fixture/addendum.json', {
    schema: 'ai-peer-review.runtime-activation-addendum/v1',
    contractDigest: f.recordReference.sha256,
    release,
    registration: f.record.activationBinding.registration,
    conformance,
    unresolvedOverlapObligations: [],
  });
  f.activationAddendum = {
    record: addendum,
    ownerReviews: [102, 107, 30].map((issue) => ({
      issue,
      review: f.review(addendum, 'activation-' + issue),
    })),
  };
  return f;
}
test('[#144] separate activation claims await owned accepted conformance grammar', () => {
  const f = separateActivationFixture();
  const report = api.checkRuntimeContractAdoption(f);
  assert.equal(report.contractAdopted, false);
  assert.equal(report.activationAuthorized, false);
  assert.equal(report.publicationAllowed, false);
  assert.ok(report.activationBlockers.includes('activation-schema-owner-acceptance-pending'));
});
test('[#144] activation sibling with a different parent contract digest refuses', () => {
  const f = separateActivationFixture(),
    ref = f.activationAddendum.record;
  const value = JSON.parse(f.artifacts.get(ref.revision + ':' + ref.path));
  value.contractDigest = 'f'.repeat(64);
  f.activationAddendum.record = f.add(ref.path, value);
  f.activationAddendum.ownerReviews = [102, 107, 30].map((issue) => ({
    issue,
    review: f.review(f.activationAddendum.record, 'bad-parent-' + issue),
  }));
  const report = api.checkRuntimeContractAdoption(f);
  assert.equal(report.contractAdopted, false);
  assert.equal(report.publicationAllowed, false);
  assert.ok(report.activationBlockers.includes('activation-contract-digest-mismatch'));
});
test('[#144] missing activation owner cannot be inferred from one common review', () => {
  const f = separateActivationFixture();
  f.activationAddendum.ownerReviews.pop();
  const report = api.checkRuntimeContractAdoption(f);
  assert.equal(report.contractAdopted, false);
  assert.equal(report.publicationAllowed, false);
  assert.ok(report.activationBlockers.includes('activation-owner-reviews-incomplete'));
});

test('[#144] shared accepted Plan cannot replace an owner native transaction', () => {
  const f = fixture();
  delete f.record.evidence.nativeAdoption;
  const report = api.checkRuntimeContractAdoption(f);
  assert.equal(report.contractAdopted, false);
  assert.ok(report.contractBlockers.includes('evidence-owner-mismatch'));
});
const nativeFailures = [
  [
    'different-owner',
    (x) => {
      x.ownerIssue = 34;
    },
  ],
  [
    'different-repository',
    (x) => {
      x.repository = 'other/project';
    },
  ],
  [
    'unverified-binding',
    (x) => {
      x.native.bindingVerified = false;
    },
  ],
  [
    'failed-comment',
    (x) => {
      x.native.commentExit = 1;
    },
  ],
  [
    'failed-pointer',
    (x) => {
      x.native.bodyExit = 1;
    },
  ],
  [
    'changed-ordinary-authority',
    (x) => {
      x.issueBody.ordinaryMetadataAndMarkersPreserved = false;
    },
  ],
  [
    'changed-source',
    (x) => {
      x.native.sourceAndOldCollateralPreserved = false;
    },
  ],
  [
    'wrong-plan-bytes',
    (x) => {
      x.acceptedOwnerPlan.sha256 = 'e'.repeat(64);
    },
  ],
  [
    'wrong-plan-review',
    (x) => {
      x.acceptedOwnerPlan.reviewId = 'unrelated-review';
    },
  ],
  [
    'different-comment-author',
    (x) => {
      x.comment.authoredBy = 'other';
    },
  ],
  [
    'different-comment-id',
    (x) => {
      x.comment.id += 1;
    },
  ],
  [
    'different-body',
    (x) => {
      x.comment.sha256 = 'e'.repeat(64);
    },
  ],
  [
    'fabricated-joint-adoption',
    (x) => {
      x.jointAdoptionClaim = true;
    },
  ],
  [
    'unknown-receipt-field',
    (x) => {
      x.callerApproved = true;
    },
  ],
];
for (const [name, mutate] of nativeFailures)
  test('[#144] native owner receipt refuses ' + name, () => {
    const f = fixture(),
      proof = f.record.evidence.nativeAdoption;
    const receipt = JSON.parse(
      f.artifacts.get(proof.nativeReceipt.revision + ':' + proof.nativeReceipt.path)
    );
    mutate(receipt);
    proof.nativeReceipt = f.add(proof.nativeReceipt.path, receipt);
    const report = api.checkRuntimeContractAdoption(f);
    assert.equal(report.contractAdopted, false);
    assert.ok(report.contractBlockers.includes('owner-native-proof-invalid'));
  });
test('[#144] native source bytes cannot be normalized by adding terminal newline', () => {
  const f = fixture(),
    proof = f.record.evidence.nativeAdoption;
  const bytes = f.artifacts.get(proof.body.revision + ':' + proof.body.path);
  proof.body = f.add(proof.body.path, bytes.toString() + '\n');
  const report = api.checkRuntimeContractAdoption(f);
  assert.equal(report.contractAdopted, false);
  assert.ok(report.contractBlockers.includes('owner-native-proof-invalid'));
});
test('[#144] owner disposition must contain its exact accepted bounded subsection', () => {
  const f = fixture(),
    proof = f.record.evidence.nativeAdoption;
  const bytes = f.artifacts.get(proof.body.revision + ':' + proof.body.path);
  proof.body = f.add(
    proof.body.path,
    bytes.toString().replace('Exact bounded intent for owner #30.', 'Different intent.')
  );
  proof.bodySha256 = proof.body.sha256;
  const receipt = JSON.parse(
    f.artifacts.get(proof.nativeReceipt.revision + ':' + proof.nativeReceipt.path)
  );
  receipt.comment.sha256 = proof.body.sha256;
  proof.nativeReceipt = f.add(proof.nativeReceipt.path, receipt);
  const report = api.checkRuntimeContractAdoption(f);
  assert.equal(report.contractAdopted, false);
  assert.ok(report.contractBlockers.includes('owner-native-proof-invalid'));
});

test('[#144] standalone normal collateral validation preserves complete exact source transaction', () => {
  const f = fixture();
  const result = api.checkNormalRuntimeReview({
    proof: f.record.amendmentReview,
    artifacts: f.artifacts,
    producerVersion: '0.4.0',
  });
  assert.equal(result.collateralComplete, true);
  assert.equal(result.privateEventReplay, 'not-checked');
});
test('[#144] standalone normal collateral cannot accept unavailable exact member bytes', () => {
  const f = fixture(),
    proof = f.record.amendmentReview;
  f.artifacts.delete(proof.finalResponse.revision + ':' + proof.finalResponse.path);
  const result = api.checkNormalRuntimeReview({
    proof,
    artifacts: f.artifacts,
    producerVersion: '0.4.0',
  });
  assert.equal(result.collateralComplete, false);
  assert.ok(result.blockers.includes('artifact-unavailable'));
});
test('[#144] standalone normal collateral cannot infer terminal parent from valid trailers', () => {
  const f = fixture(),
    proof = f.record.amendmentReview;
  f.artifacts.set('parent:' + proof.finalization.revision, 'b'.repeat(40));
  const result = api.checkNormalRuntimeReview({
    proof,
    artifacts: f.artifacts,
    producerVersion: '0.4.0',
  });
  assert.equal(result.collateralComplete, false);
  assert.ok(result.blockers.includes('review-finalization-parent-mismatch'));
});

test('[#144] structural fixture cannot adopt when its own record acceptance is omitted', () => {
  const result = api.checkRuntimeContractAdoption(fixture());
  assert.equal(result.contractAdopted, false);
  assert.ok(result.contractBlockers.includes('record-acceptance-required'));
});
test('[#144] own normal collateral cannot substitute for retained lineage and governed evidence approval', () => {
  const f = fixture();
  const recordReference = f.add('evidence/portable-runtime/contracts/adoption.json', f.record);
  const approvalReview = f.review(recordReference, 'record');
  const result = api.checkRuntimeContractAdoption({ ...f, recordReference, approvalReview });
  assert.equal(result.contractAdopted, false);
  assert.ok(result.contractBlockers.includes('lineage-proofs-missing'));
  assert.ok(result.contractBlockers.includes('approved-evidence-transaction-missing'));
});

for (const [field, value] of [
  ['artifact_history', {}],
  ['turns', {}],
  ['artifact_history', null],
  ['turns', null],
  ['participants', null],
  ['runtime', []],
  ['lineage_receipt', []],
]) {
  test(
    '[#144] malformed ' + field + ' gives typed refusal through normal and adoption seams',
    () => {
      const f = fixture(),
        p = f.record.amendmentReview;
      const manifest = JSON.parse(f.artifacts.get(p.manifest.revision + ':' + p.manifest.path));
      manifest[field] = value;
      p.manifest = f.add(p.manifest.path, manifest);
      const normal = api.checkNormalRuntimeReview({
        proof: p,
        artifacts: f.artifacts,
        producerVersion: '0.4.1',
      });
      assert.equal(normal.collateralComplete, false);
      assert.ok(normal.blockers.includes('review-manifest-invalid'));
      const report = api.checkRuntimeContractAdoption(f);
      assert.equal(report.contractAdopted, false);
      assert.ok(report.contractBlockers.includes('review-manifest-invalid'));
    }
  );
}
