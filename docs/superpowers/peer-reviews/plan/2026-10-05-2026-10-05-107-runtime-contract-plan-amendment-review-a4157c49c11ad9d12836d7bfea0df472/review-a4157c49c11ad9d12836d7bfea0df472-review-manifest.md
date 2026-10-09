<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "d017234cf0c0bc395a78879a66280116386bcc84",
      "commit": "8587ecb1f0177e8e76f962fd0116ea98f1957923",
      "digest": "sha256:f909981af6a2b3255834040cd6ca680c43584e3a789c07ce143a3b30aa75dfeb",
      "path": "docs/superpowers/plans/2026-10-05-107-runtime-contract-plan-amendment.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "ff1a376ef81e26ec5f2402090587cfa2438b347a",
      "commit": "c4ba22817b8d558f4f9ab44c9336f60e059efbdc",
      "digest": "sha256:208a8e54a014415cdef0dda2b6d266b7745e7126d0902a34c2b7c1041b420828",
      "path": "docs/superpowers/plans/2026-10-05-107-runtime-contract-plan-amendment.md",
      "snapshot": null,
      "turn": 1
    }
  ],
  "artifact_path": "docs/superpowers/plans/2026-10-05-107-runtime-contract-plan-amendment.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-7d588cdd-9928-49fb-890d-2b6b91373228",
      "claimed_at": "2026-10-05T13:15:25.095Z",
      "expires_at": "2026-10-05T21:15:25.095Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-05T13:15:25.095Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:3d928a5cc0b4ee4fad3965576a9595482eccd4e7e7333c3f889b486bb8ee9896"
    },
    {
      "claim_id": "claim-5dcbbfe4-579d-4f14-8d4e-65318c389605",
      "claimed_at": "2026-10-05T13:18:23.332Z",
      "expires_at": "2026-10-05T21:18:23.332Z",
      "host": "codex",
      "last_activity_at": "2026-10-05T13:18:23.332Z",
      "role": "author",
      "session_fingerprint": "sha256:e82e25e503f9341ba7bbc701cbc3ffb449d00fc799e793a05a7ad151171a82c5"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "c4ba22817b8d558f4f9ab44c9336f60e059efbdc",
  "human_decision": null,
  "identity_changes": [
    {
      "identity": {
        "evidence": {
          "model": {
            "assurance": "declared",
            "conflict": false,
            "declared_id": null,
            "observed_id": null,
            "requested_id": "gpt-6.1-sol",
            "source": "launch-request"
          },
          "session": {
            "assurance": "declared",
            "fingerprint": "sha256:e82e25e503f9341ba7bbc701cbc3ffb449d00fc799e793a05a7ad151171a82c5",
            "source": "official-runtime"
          }
        },
        "host": "codex",
        "identity_source": "runtime",
        "joined_at": "2026-10-05T13:14:10.243Z",
        "model_display": "gpt-6.1-sol",
        "model_id": "gpt-6.1-sol",
        "provider": "openai",
        "role": "author",
        "session_fingerprint": "sha256:e82e25e503f9341ba7bbc701cbc3ffb449d00fc799e793a05a7ad151171a82c5"
      },
      "role": "author",
      "sequence": 3
    }
  ],
  "lineage_receipt": {
    "attempts": [
      {
        "consumed_grant_digest": null,
        "event_log_digest": "sha256:c52e59018cac1bf9efcf9295b849c8ee238666e16a3dc61a87ff38856fa83b9b",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-a4157c49c11ad9d12836d7bfea0df472",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-a4157c49c11ad9d12836d7bfea0df472",
        "root_review_id": "review-a4157c49c11ad9d12836d7bfea0df472",
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
          "declared_id": null,
          "observed_id": null,
          "requested_id": "gpt-6.1-sol",
          "source": "launch-request"
        },
        "session": {
          "assurance": "declared",
          "fingerprint": "sha256:e82e25e503f9341ba7bbc701cbc3ffb449d00fc799e793a05a7ad151171a82c5",
          "source": "official-runtime"
        }
      },
      "host": "codex",
      "identity_source": "runtime",
      "joined_at": "2026-10-05T13:14:10.243Z",
      "model_display": "gpt-6.1-sol",
      "model_id": "gpt-6.1-sol",
      "provider": "openai",
      "role": "author",
      "session_fingerprint": "sha256:e82e25e503f9341ba7bbc701cbc3ffb449d00fc799e793a05a7ad151171a82c5"
    },
    "reviewer": {
      "evidence": {
        "model": {
          "assurance": "declared",
          "conflict": false,
          "declared_id": "claude-opus-5-5",
          "observed_id": null,
          "requested_id": null,
          "source": "environment-declaration"
        },
        "session": {
          "assurance": "declared",
          "fingerprint": "sha256:3d928a5cc0b4ee4fad3965576a9595482eccd4e7e7333c3f889b486bb8ee9896",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-05T13:15:25.069Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:3d928a5cc0b4ee4fad3965576a9595482eccd4e7e7333c3f889b486bb8ee9896"
    }
  },
  "record_id": "review-a4157c49c11ad9d12836d7bfea0df472",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-a4157c49c11ad9d12836d7bfea0df472",
  "runtime": {
    "adapter_version": "1.0.0",
    "author": {
      "effort": "high",
      "host": "codex",
      "model_display": "gpt-6.1-sol",
      "model_id": "gpt-6.1-sol",
      "provider": "openai"
    },
    "classification": "XPR",
    "ownership": "broker",
    "project_root_digest": "d660344c5c5d1c54352f8c7647efc28e3e7a1c2fe9d73d339736e03af45cf22e",
    "reviewer": {
      "effort": "high",
      "host": "claude-code",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "selector": "claude"
    },
    "schema": "ai-peer-review.runtime/v1",
    "transport_mode": "manual"
  },
  "schema": "ai-peer-review.manifest/v1",
  "startup_commit": "8587ecb1f0177e8e76f962fd0116ea98f1957923",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "ff1a376ef81e26ec5f2402090587cfa2438b347a",
        "digest": "sha256:208a8e54a014415cdef0dda2b6d266b7745e7126d0902a34c2b7c1041b420828",
        "path": "docs/superpowers/plans/2026-10-05-107-runtime-contract-plan-amendment.md"
      },
      "author_response": {
        "digest": "sha256:26e3562557e0e2e4f84c6a6de541815d8f6019219a6fde5e4431d190565a9089",
        "path": "docs/superpowers/peer-reviews/plan/2026-10-05-2026-10-05-107-runtime-contract-plan-amendment-review-a4157c49c11ad9d12836d7bfea0df472/review-a4157c49c11ad9d12836d7bfea0df472-author-response-1.md"
      },
      "commit": "c4ba22817b8d558f4f9ab44c9336f60e059efbdc",
      "decision": "revisions-requested",
      "finding_ids": [
        "R1-F001",
        "R1-F002",
        "R1-F003",
        "R1-F004",
        "R1-F005"
      ],
      "reviewer_response": {
        "digest": "sha256:50e13bd336734dd81d213217ec7dfb17ac95c05f6953de48f2a18d703261fdac",
        "path": "docs/superpowers/peer-reviews/plan/2026-10-05-2026-10-05-107-runtime-contract-plan-amendment-review-a4157c49c11ad9d12836d7bfea0df472/review-a4157c49c11ad9d12836d7bfea0df472-reviewer-response-1.md"
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
        "digest": "sha256:b2b5008a358f8b7cbc0c625401d6cebbb891b0eedb51aafedef481c0ad81b274",
        "path": "docs/superpowers/peer-reviews/plan/2026-10-05-2026-10-05-107-runtime-contract-plan-amendment-review-a4157c49c11ad9d12836d7bfea0df472/review-a4157c49c11ad9d12836d7bfea0df472-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    }
  ]
}
```
