<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "810718b7cb22c7f52b6d97948a6b3e96d9b5f3a7",
      "commit": "01bb4775eaf6385028ece41a047f04f48f79759c",
      "digest": "sha256:f2b9552864c7d5d708022c3434c992a80e92164c80d3b55aa7642702114ad753",
      "path": "docs/superpowers/plans/2026-09-21-88-provider-authority-broker-reconciliation.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "dbf44a27fd1be3e2773cac5f3618b308de29152e",
      "commit": "9931f83c2cf43d8892fdaa638fb59e533c7cf830",
      "digest": "sha256:e029ee44cfccf1e532b303f215be44933ac48738d04c38da7d7813c18cc367bd",
      "path": "docs/superpowers/plans/2026-09-21-88-provider-authority-broker-reconciliation.md",
      "snapshot": null,
      "turn": 1
    }
  ],
  "artifact_path": "docs/superpowers/plans/2026-09-21-88-provider-authority-broker-reconciliation.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-897ce787-cb36-49e4-a1d7-ba2a7263814d",
      "claimed_at": "2026-09-21T10:40:41.449Z",
      "expires_at": "2026-09-21T18:40:41.449Z",
      "host": "codex",
      "last_activity_at": "2026-09-21T10:40:41.449Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:706896de9db444dc4253481b351e0923eca8a5010ba54289015855215aba2814"
    },
    {
      "claim_id": "claim-47e39e74-6502-48f2-b299-a7995809bc82",
      "claimed_at": "2026-09-21T10:42:42.644Z",
      "expires_at": "2026-09-21T18:42:42.644Z",
      "host": "codex",
      "last_activity_at": "2026-09-21T10:42:42.644Z",
      "role": "author",
      "session_fingerprint": "sha256:54ec6462e7ba980192a3e0c7da02bb65e18a27be1889673d6688f7e6b0532506"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "9931f83c2cf43d8892fdaa638fb59e533c7cf830",
  "human_decision": null,
  "identity_changes": [
    {
      "identity": {
        "evidence": {
          "model": {
            "assurance": "declared",
            "conflict": false,
            "declared_id": "gpt-5.6-sol",
            "observed_id": null,
            "requested_id": null,
            "source": "environment-declaration"
          },
          "session": {
            "assurance": "declared",
            "fingerprint": "sha256:54ec6462e7ba980192a3e0c7da02bb65e18a27be1889673d6688f7e6b0532506",
            "source": "environment-declaration"
          }
        },
        "host": "codex",
        "identity_source": "runtime",
        "joined_at": "2026-09-21T10:34:39.388Z",
        "model_display": "GPT-5.6 Sol",
        "model_id": "gpt-5.6-sol",
        "provider": "openai",
        "role": "author",
        "session_fingerprint": "sha256:54ec6462e7ba980192a3e0c7da02bb65e18a27be1889673d6688f7e6b0532506"
      },
      "role": "author",
      "sequence": 3
    }
  ],
  "lineage_receipt": {
    "attempts": [
      {
        "consumed_grant_digest": null,
        "event_log_digest": "sha256:a1bf00b6becc9ee8ca95180e5752a4c05d66b43301a1f5ecd2ca2884ff91bff1",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-bd65fa3d0a76ec9f39a096656662a981",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-bd65fa3d0a76ec9f39a096656662a981",
        "root_review_id": "review-bd65fa3d0a76ec9f39a096656662a981",
        "successor_review_id": null
      }
    ],
    "complete": true,
    "schema": "ai-peer-review.lineage-receipt/v1"
  },
  "participants": {
    "author": {
      "evidence": {
        "model": {
          "assurance": "declared",
          "conflict": false,
          "declared_id": "gpt-5.6-sol",
          "observed_id": null,
          "requested_id": null,
          "source": "environment-declaration"
        },
        "session": {
          "assurance": "declared",
          "fingerprint": "sha256:54ec6462e7ba980192a3e0c7da02bb65e18a27be1889673d6688f7e6b0532506",
          "source": "environment-declaration"
        }
      },
      "host": "codex",
      "identity_source": "runtime",
      "joined_at": "2026-09-21T10:34:39.388Z",
      "model_display": "GPT-5.6 Sol",
      "model_id": "gpt-5.6-sol",
      "provider": "openai",
      "role": "author",
      "session_fingerprint": "sha256:54ec6462e7ba980192a3e0c7da02bb65e18a27be1889673d6688f7e6b0532506"
    },
    "reviewer": {
      "evidence": {
        "model": {
          "assurance": "declared",
          "conflict": false,
          "declared_id": "gpt-6-astra",
          "observed_id": null,
          "requested_id": null,
          "source": "environment-declaration"
        },
        "session": {
          "assurance": "declared",
          "fingerprint": "sha256:706896de9db444dc4253481b351e0923eca8a5010ba54289015855215aba2814",
          "source": "environment-declaration"
        }
      },
      "host": "codex",
      "identity_source": "runtime",
      "joined_at": "2026-09-21T10:40:41.445Z",
      "model_display": "gpt-6-astra",
      "model_id": "gpt-6-astra",
      "provider": "openai",
      "role": "reviewer",
      "session_fingerprint": "sha256:706896de9db444dc4253481b351e0923eca8a5010ba54289015855215aba2814"
    }
  },
  "record_id": "review-bd65fa3d0a76ec9f39a096656662a981",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-bd65fa3d0a76ec9f39a096656662a981",
  "runtime": {
    "adapter_version": "1.0.0",
    "classification": "SPR",
    "ownership": "broker",
    "project_root_digest": "b6c221aa5100f316bb200cc655db9ff7417f9eb071d523395f6cb9c2e2f86320",
    "reviewer": {
      "effort": "high",
      "host": "codex",
      "model_display": "GPT-6 Astra",
      "model_id": "gpt-6-astra",
      "provider": "openai",
      "selector": "codex"
    },
    "schema": "ai-peer-review.runtime/v1",
    "transport_mode": "manual"
  },
  "schema": "ai-peer-review.manifest/v1",
  "startup_commit": "01bb4775eaf6385028ece41a047f04f48f79759c",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "dbf44a27fd1be3e2773cac5f3618b308de29152e",
        "digest": "sha256:e029ee44cfccf1e532b303f215be44933ac48738d04c38da7d7813c18cc367bd",
        "path": "docs/superpowers/plans/2026-09-21-88-provider-authority-broker-reconciliation.md"
      },
      "author_response": {
        "digest": "sha256:3cf54830381e2c74d478c3ed9f792681b4ee3e56284e80127f280422ed94a663",
        "path": "docs/superpowers/peer-reviews/plan/2026-09-21-2026-09-21-88-provider-authority-broker-reconciliation-review-bd65fa3d0a76ec9f39a096656662a981/review-bd65fa3d0a76ec9f39a096656662a981-author-response-1.md"
      },
      "commit": "9931f83c2cf43d8892fdaa638fb59e533c7cf830",
      "decision": "revisions-requested",
      "finding_ids": [
        "R1-F001",
        "R1-F002"
      ],
      "reviewer_response": {
        "digest": "sha256:ca35dc74f928a5428bd26ab48de7b95bcf12958f5d53b23c2bfc66f35f719253",
        "path": "docs/superpowers/peer-reviews/plan/2026-09-21-2026-09-21-88-provider-authority-broker-reconciliation-review-bd65fa3d0a76ec9f39a096656662a981/review-bd65fa3d0a76ec9f39a096656662a981-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    },
    {
      "artifact": null,
      "author_response": null,
      "commit": null,
      "decision": "accepted",
      "finding_ids": [],
      "reviewer_response": {
        "digest": "sha256:eef4b138e9f7707a78900f9882e70e47b067ce51f2027c22a08efbcbc08d2210",
        "path": "docs/superpowers/peer-reviews/plan/2026-09-21-2026-09-21-88-provider-authority-broker-reconciliation-review-bd65fa3d0a76ec9f39a096656662a981/review-bd65fa3d0a76ec9f39a096656662a981-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    }
  ]
}
```
