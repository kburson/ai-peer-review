<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "abd53d7534a43de640184a981cfc56645b0fb8a8",
      "commit": "71133938e8de94958facab026d43a1c3f87a80a3",
      "digest": "sha256:8d658008c0b646aa3fb7c29fe330ed1a85a6bd74517991a0741d5e800d648ad4",
      "path": "docs/superpowers/specs/2026-09-26-102-aipr-install-policy-design.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "3382dc77e590656fa2f340a5cc25104ac6d207df",
      "commit": "5acf6d729e2f83572e74b87b81104c5345df6897",
      "digest": "sha256:6a4a2383daa5d2ede6e634c4ac3e565bffffa04a3901869a4960517eae09ed5d",
      "path": "docs/superpowers/specs/2026-09-26-102-aipr-install-policy-design.md",
      "snapshot": null,
      "turn": 1
    }
  ],
  "artifact_path": "docs/superpowers/specs/2026-09-26-102-aipr-install-policy-design.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-663f59a9-1a02-4e80-a696-9fee5591b07a",
      "claimed_at": "2026-09-27T03:02:59.470Z",
      "expires_at": "2026-09-27T11:02:59.470Z",
      "host": "claude-code",
      "last_activity_at": "2026-09-27T03:02:59.470Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:f3f8c98cef4e244abdcd93c24f4e30bad12e74b105c365d67b8d61d8ee3bca34"
    },
    {
      "claim_id": "claim-1fc0dccf-48df-4389-958c-d07c40c5a731",
      "claimed_at": "2026-09-27T03:14:56.020Z",
      "expires_at": "2026-09-27T11:14:56.020Z",
      "host": "codex",
      "last_activity_at": "2026-09-27T03:14:56.020Z",
      "role": "author",
      "session_fingerprint": "sha256:2eee61767a59da6185e59f5c9d1baf212ae9e7303465ebd2075aeabb4642c427"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "5acf6d729e2f83572e74b87b81104c5345df6897",
  "human_decision": null,
  "identity_changes": [
    {
      "identity": {
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
            "fingerprint": "sha256:2eee61767a59da6185e59f5c9d1baf212ae9e7303465ebd2075aeabb4642c427",
            "source": "environment-declaration"
          }
        },
        "host": "codex",
        "identity_source": "runtime",
        "joined_at": "2026-09-26T23:14:57.435Z",
        "model_display": "GPT-6 Astra",
        "model_id": "gpt-6-astra",
        "provider": "openai",
        "role": "author",
        "session_fingerprint": "sha256:2eee61767a59da6185e59f5c9d1baf212ae9e7303465ebd2075aeabb4642c427"
      },
      "role": "author",
      "sequence": 3
    }
  ],
  "lineage_receipt": {
    "attempts": [
      {
        "consumed_grant_digest": null,
        "event_log_digest": "sha256:bc916b017eaa8c44649ee3835f4fdb565a06103262fbf12b535f34fa0637b50f",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-7e2f728a783cebdbe3659714f0dc0480",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-7e2f728a783cebdbe3659714f0dc0480",
        "root_review_id": "review-7e2f728a783cebdbe3659714f0dc0480",
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
          "declared_id": "gpt-6-astra",
          "observed_id": null,
          "requested_id": null,
          "source": "environment-declaration"
        },
        "session": {
          "assurance": "declared",
          "fingerprint": "sha256:2eee61767a59da6185e59f5c9d1baf212ae9e7303465ebd2075aeabb4642c427",
          "source": "environment-declaration"
        }
      },
      "host": "codex",
      "identity_source": "runtime",
      "joined_at": "2026-09-26T23:14:57.435Z",
      "model_display": "GPT-6 Astra",
      "model_id": "gpt-6-astra",
      "provider": "openai",
      "role": "author",
      "session_fingerprint": "sha256:2eee61767a59da6185e59f5c9d1baf212ae9e7303465ebd2075aeabb4642c427"
    },
    "reviewer": {
      "evidence": {
        "model": {
          "assurance": "declared",
          "conflict": false,
          "declared_id": "claude-opus-5",
          "observed_id": null,
          "requested_id": null,
          "source": "configuration"
        },
        "session": {
          "assurance": "declared",
          "fingerprint": "sha256:f3f8c98cef4e244abdcd93c24f4e30bad12e74b105c365d67b8d61d8ee3bca34",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "declared",
      "joined_at": "2026-09-27T03:02:59.465Z",
      "model_display": "Claude Opus 5",
      "model_id": "claude-opus-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:f3f8c98cef4e244abdcd93c24f4e30bad12e74b105c365d67b8d61d8ee3bca34"
    }
  },
  "record_id": "review-7e2f728a783cebdbe3659714f0dc0480",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-7e2f728a783cebdbe3659714f0dc0480",
  "runtime": {
    "adapter_version": "1.0.0",
    "classification": "XPR",
    "ownership": "broker",
    "project_root_digest": "fc3fb443843ffe772c1ec9f8d7e072bf9d964699b68e60126a324dcb78fc93f4",
    "reviewer": {
      "effort": "medium",
      "host": "claude-code",
      "model_display": "Claude Opus 5",
      "model_id": "claude-opus-5",
      "provider": "anthropic",
      "selector": "claude"
    },
    "schema": "ai-peer-review.runtime/v1",
    "transport_mode": "manual"
  },
  "schema": "ai-peer-review.manifest/v1",
  "startup_commit": "71133938e8de94958facab026d43a1c3f87a80a3",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "3382dc77e590656fa2f340a5cc25104ac6d207df",
        "digest": "sha256:6a4a2383daa5d2ede6e634c4ac3e565bffffa04a3901869a4960517eae09ed5d",
        "path": "docs/superpowers/specs/2026-09-26-102-aipr-install-policy-design.md"
      },
      "author_response": {
        "digest": "sha256:8989d73ce76a1d52f48c7c839949d067c1c8b56dd76faacd347e318f8c0be2c1",
        "path": "docs/superpowers/peer-reviews/spec/2026-09-26-2026-09-26-102-aipr-install-policy-design-review-7e2f728a783cebdbe3659714f0dc0480/review-7e2f728a783cebdbe3659714f0dc0480-author-response-1.md"
      },
      "commit": "5acf6d729e2f83572e74b87b81104c5345df6897",
      "decision": "revisions-requested",
      "finding_ids": [],
      "reviewer_response": {
        "digest": "sha256:efcb89852efa1bf4fa3faef623bc4192b818941be1bbbc1292e5a399d6bbcd2b",
        "path": "docs/superpowers/peer-reviews/spec/2026-09-26-2026-09-26-102-aipr-install-policy-design-review-7e2f728a783cebdbe3659714f0dc0480/review-7e2f728a783cebdbe3659714f0dc0480-reviewer-response-1.md"
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
        "digest": "sha256:76db10c59b9d33ef7042302161ef65e44501bf256cb2079289faded6adb5c3a2",
        "path": "docs/superpowers/peer-reviews/spec/2026-09-26-2026-09-26-102-aipr-install-policy-design-review-7e2f728a783cebdbe3659714f0dc0480/review-7e2f728a783cebdbe3659714f0dc0480-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    }
  ]
}
```
