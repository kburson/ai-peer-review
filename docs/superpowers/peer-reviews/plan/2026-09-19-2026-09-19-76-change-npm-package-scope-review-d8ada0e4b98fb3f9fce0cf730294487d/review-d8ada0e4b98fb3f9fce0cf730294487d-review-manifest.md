<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "f02b3d82e4d0b5dac07cbd214bc8050de6d5efd0",
      "commit": "7d12ab16e3eb0912af4340842ef63853b722b12a",
      "digest": "sha256:52a62532cdbbbfbe1db5e729ae7e401db9bd504d23f5ff66b36a10954dee2e30",
      "path": "docs/superpowers/plans/2026-09-19-76-change-npm-package-scope.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "7e96f9d52f4eb3a374f1c2c1d7f232f6589cccd5",
      "commit": "c996e2f1b4390e5505d621c06fe6565a1bcf2f4f",
      "digest": "sha256:b8547152fa599388b236cbb7b99210169bd16ef0d5f631f79025de225e7fa432",
      "path": "docs/superpowers/plans/2026-09-19-76-change-npm-package-scope.md",
      "snapshot": null,
      "turn": 1
    },
    {
      "blob": "fa59476e34963fe00ee4d2df19bdb00e23d0c9e7",
      "commit": "03b091b44ea9b9aae1bc1249cacfe447a2c2908b",
      "digest": "sha256:1036880f69bb843005a2a72cd0e704a83fcebfbc711abd6998836cde818ba7d1",
      "path": "docs/superpowers/plans/2026-09-19-76-change-npm-package-scope.md",
      "snapshot": null,
      "turn": 2
    },
    {
      "blob": "d3246dced444411b6df8e5cc88fb19aeea70247a",
      "commit": "1a80a386b24430492d779d89de0597ff386c78c9",
      "digest": "sha256:3be18cdced2b76a20896cdbe1a044e46fbd72c1fb893920560a28bbf6622024d",
      "path": "docs/superpowers/plans/2026-09-19-76-change-npm-package-scope.md",
      "snapshot": null,
      "turn": 3
    }
  ],
  "artifact_path": "docs/superpowers/plans/2026-09-19-76-change-npm-package-scope.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-40c72aac-7e1b-4162-8285-f9609d137d55",
      "claimed_at": "2026-09-19T06:03:46.502Z",
      "expires_at": "2026-09-19T14:03:46.502Z",
      "host": "claude-code",
      "last_activity_at": "2026-09-19T06:03:46.502Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:8bef3e3392cbb1a4b2dabe6ee890822f519a6563c893a3f731947ce2e108eaa8"
    },
    {
      "claim_id": "claim-7da25fe1-0471-43b4-b1bb-6eb7b126e7d5",
      "claimed_at": "2026-09-19T06:08:17.102Z",
      "expires_at": "2026-09-19T14:08:17.102Z",
      "host": "codex",
      "last_activity_at": "2026-09-19T06:08:17.102Z",
      "role": "author",
      "session_fingerprint": "sha256:286257c5b018fc8c99b26c21f4352855bd6b5b39eb660cb2632ef4fdbd00349d"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "1a80a386b24430492d779d89de0597ff386c78c9",
  "human_decision": null,
  "identity_changes": [],
  "lineage_receipt": {
    "attempts": [
      {
        "consumed_grant_digest": null,
        "event_log_digest": "sha256:3eaee3d71032d4f3e8a00ff94b3a08d977309725b7fd8f3ca7c8d9a6da4e2060",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-d8ada0e4b98fb3f9fce0cf730294487d",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-d8ada0e4b98fb3f9fce0cf730294487d",
        "root_review_id": "review-d8ada0e4b98fb3f9fce0cf730294487d",
        "successor_review_id": null
      }
    ],
    "complete": true,
    "schema": "ai-peer-review.lineage-receipt/v1"
  },
  "participants": {
    "author": {
      "host": "codex",
      "identity_source": "runtime",
      "joined_at": "2026-09-19T05:55:49.585Z",
      "model_display": "GPT-6 Astra",
      "model_id": "gpt-6-astra",
      "provider": "openai",
      "role": "author",
      "session_fingerprint": "sha256:286257c5b018fc8c99b26c21f4352855bd6b5b39eb660cb2632ef4fdbd00349d"
    },
    "reviewer": {
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-09-19T06:03:46.500Z",
      "model_display": "Claude Opus 5",
      "model_id": "claude-opus-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:8bef3e3392cbb1a4b2dabe6ee890822f519a6563c893a3f731947ce2e108eaa8"
    }
  },
  "record_id": "review-d8ada0e4b98fb3f9fce0cf730294487d",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-d8ada0e4b98fb3f9fce0cf730294487d",
  "schema": "ai-peer-review.manifest/v1",
  "startup_commit": "7d12ab16e3eb0912af4340842ef63853b722b12a",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "7e96f9d52f4eb3a374f1c2c1d7f232f6589cccd5",
        "digest": "sha256:b8547152fa599388b236cbb7b99210169bd16ef0d5f631f79025de225e7fa432",
        "path": "docs/superpowers/plans/2026-09-19-76-change-npm-package-scope.md"
      },
      "author_response": {
        "digest": "sha256:c21d1e692c75b71b591ffc71af808c477da1c6889d9afb11ae109aa1a1153782",
        "path": "docs/superpowers/peer-reviews/plan/2026-09-19-2026-09-19-76-change-npm-package-scope-review-d8ada0e4b98fb3f9fce0cf730294487d/review-d8ada0e4b98fb3f9fce0cf730294487d-author-response-1.md"
      },
      "commit": "c996e2f1b4390e5505d621c06fe6565a1bcf2f4f",
      "decision": "revisions-requested",
      "finding_ids": [],
      "reviewer_response": {
        "digest": "sha256:724604fdd26cf3d28a4b348f207eed1d08e2c5cb516601e1dc6b7a05408e3fd8",
        "path": "docs/superpowers/peer-reviews/plan/2026-09-19-2026-09-19-76-change-npm-package-scope-review-d8ada0e4b98fb3f9fce0cf730294487d/review-d8ada0e4b98fb3f9fce0cf730294487d-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    },
    {
      "artifact": {
        "blob": "fa59476e34963fe00ee4d2df19bdb00e23d0c9e7",
        "digest": "sha256:1036880f69bb843005a2a72cd0e704a83fcebfbc711abd6998836cde818ba7d1",
        "path": "docs/superpowers/plans/2026-09-19-76-change-npm-package-scope.md"
      },
      "author_response": {
        "digest": "sha256:73a04c91ccbccbf4e5dc6ab050bb3226447d750407c8a14dbf149e6612c329a5",
        "path": "docs/superpowers/peer-reviews/plan/2026-09-19-2026-09-19-76-change-npm-package-scope-review-d8ada0e4b98fb3f9fce0cf730294487d/review-d8ada0e4b98fb3f9fce0cf730294487d-author-response-2.md"
      },
      "commit": "03b091b44ea9b9aae1bc1249cacfe447a2c2908b",
      "decision": "revisions-requested",
      "finding_ids": [],
      "reviewer_response": {
        "digest": "sha256:7835b4a5c5106173a7f3a3c33ef8e7cedcf60ac2c5f67ca2d3d99f1e561fba13",
        "path": "docs/superpowers/peer-reviews/plan/2026-09-19-2026-09-19-76-change-npm-package-scope-review-d8ada0e4b98fb3f9fce0cf730294487d/review-d8ada0e4b98fb3f9fce0cf730294487d-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    },
    {
      "artifact": {
        "blob": "d3246dced444411b6df8e5cc88fb19aeea70247a",
        "digest": "sha256:3be18cdced2b76a20896cdbe1a044e46fbd72c1fb893920560a28bbf6622024d",
        "path": "docs/superpowers/plans/2026-09-19-76-change-npm-package-scope.md"
      },
      "author_response": {
        "digest": "sha256:c874c9e580b65fabd81d0b94004e5769b2df1aaa8c738584b780c6de7d6bfec9",
        "path": "docs/superpowers/peer-reviews/plan/2026-09-19-2026-09-19-76-change-npm-package-scope-review-d8ada0e4b98fb3f9fce0cf730294487d/review-d8ada0e4b98fb3f9fce0cf730294487d-author-response-3.md"
      },
      "commit": "1a80a386b24430492d779d89de0597ff386c78c9",
      "decision": "revisions-requested",
      "finding_ids": [],
      "reviewer_response": {
        "digest": "sha256:44b6f038b2606000ac0f8638bbab23423b05d164c64fbf4abd7e064afe91df5e",
        "path": "docs/superpowers/peer-reviews/plan/2026-09-19-2026-09-19-76-change-npm-package-scope-review-d8ada0e4b98fb3f9fce0cf730294487d/review-d8ada0e4b98fb3f9fce0cf730294487d-reviewer-response-3.md"
      },
      "snapshot": null,
      "turn": 3
    },
    {
      "artifact": null,
      "author_response": null,
      "commit": null,
      "decision": "accepted",
      "finding_ids": [],
      "reviewer_response": {
        "digest": "sha256:03459b093dc275e744677bd0a616d01ea98e55036d8110010271452ac0e6a78f",
        "path": "docs/superpowers/peer-reviews/plan/2026-09-19-2026-09-19-76-change-npm-package-scope-review-d8ada0e4b98fb3f9fce0cf730294487d/review-d8ada0e4b98fb3f9fce0cf730294487d-reviewer-response-4.md"
      },
      "snapshot": null,
      "turn": 4
    }
  ]
}
```
