<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "1aca187b794be8562b9f6472b8b856ba5726a2b2",
      "commit": "66b1a7a5fe061336bcf484d26fab3973a3b19c77",
      "digest": "sha256:7cc1b294ee454ec63ec337947477f17c5c15ee52ef4e68778702f3e9ba069e99",
      "path": "docs/superpowers/specs/2026-10-03-107-runtime-policy-reconciliation-design.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "dcb99da9191789472bbd1840beb72448bf755fba",
      "commit": "4d8815b2fabf861d24d25fa9735b953865e99f55",
      "digest": "sha256:4e8d38f06fb53b963089cfe5835e2722cc31a3053ac3ba7076467d93e6973405",
      "path": "docs/superpowers/specs/2026-10-03-107-runtime-policy-reconciliation-design.md",
      "snapshot": null,
      "turn": 1
    }
  ],
  "artifact_path": "docs/superpowers/specs/2026-10-03-107-runtime-policy-reconciliation-design.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-0b9b17c9-4d1d-4816-8016-7fc0cd7950e4",
      "claimed_at": "2026-10-05T11:18:13.034Z",
      "expires_at": "2026-10-05T19:18:13.034Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-05T11:18:13.034Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:3a89e4dd2bc35ce46c13a43ae5588baea492f1a3b436b0ccdf85c333a45f82ed"
    },
    {
      "claim_id": "claim-77030638-90d0-4d07-9d3f-a29ce6c849fd",
      "claimed_at": "2026-10-05T11:20:23.555Z",
      "expires_at": "2026-10-05T19:20:23.555Z",
      "host": "codex",
      "last_activity_at": "2026-10-05T11:20:23.555Z",
      "role": "author",
      "session_fingerprint": "sha256:e82e25e503f9341ba7bbc701cbc3ffb449d00fc799e793a05a7ad151171a82c5"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "4d8815b2fabf861d24d25fa9735b953865e99f55",
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
        "joined_at": "2026-10-05T11:14:38.604Z",
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
        "event_log_digest": "sha256:67f157fd242c20727907a832c89188990afa35e0f1ffaf5d2ed513a18f3dc592",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-58b490491800f0c13d64191cb58071b5",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-58b490491800f0c13d64191cb58071b5",
        "root_review_id": "review-58b490491800f0c13d64191cb58071b5",
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
      "joined_at": "2026-10-05T11:14:38.604Z",
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
          "fingerprint": "sha256:3a89e4dd2bc35ce46c13a43ae5588baea492f1a3b436b0ccdf85c333a45f82ed",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-05T11:18:12.993Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:3a89e4dd2bc35ce46c13a43ae5588baea492f1a3b436b0ccdf85c333a45f82ed"
    }
  },
  "record_id": "review-58b490491800f0c13d64191cb58071b5",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-58b490491800f0c13d64191cb58071b5",
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
  "startup_commit": "66b1a7a5fe061336bcf484d26fab3973a3b19c77",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "dcb99da9191789472bbd1840beb72448bf755fba",
        "digest": "sha256:4e8d38f06fb53b963089cfe5835e2722cc31a3053ac3ba7076467d93e6973405",
        "path": "docs/superpowers/specs/2026-10-03-107-runtime-policy-reconciliation-design.md"
      },
      "author_response": {
        "digest": "sha256:2e4149e25b442596fdffc103789415c9e030234c918e334f7a89bc2283975283",
        "path": "docs/superpowers/peer-reviews/spec/2026-10-05-2026-10-03-107-runtime-policy-reconciliation-design-review-58b490491800f0c13d64191cb58071b5/review-58b490491800f0c13d64191cb58071b5-author-response-1.md"
      },
      "commit": "4d8815b2fabf861d24d25fa9735b953865e99f55",
      "decision": "revisions-requested",
      "finding_ids": [
        "R1-F001",
        "R1-F002",
        "R1-F003",
        "R1-F004",
        "R1-F005",
        "R1-F006",
        "R1-F007",
        "R1-F008"
      ],
      "reviewer_response": {
        "digest": "sha256:707c84ed029f45a744d95ff361c748cea9bc3e3bc422fe8aa8849ccf9476807d",
        "path": "docs/superpowers/peer-reviews/spec/2026-10-05-2026-10-03-107-runtime-policy-reconciliation-design-review-58b490491800f0c13d64191cb58071b5/review-58b490491800f0c13d64191cb58071b5-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    },
    {
      "artifact": null,
      "author_response": null,
      "commit": null,
      "decision": "accepted",
      "finding_ids": [
        "R2-F001",
        "R2-F002"
      ],
      "reviewer_response": {
        "digest": "sha256:2fdfb6635210ee77d793aa1a9779fb908b072e7801a8adbc7f7575cd59c76958",
        "path": "docs/superpowers/peer-reviews/spec/2026-10-05-2026-10-03-107-runtime-policy-reconciliation-design-review-58b490491800f0c13d64191cb58071b5/review-58b490491800f0c13d64191cb58071b5-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    }
  ]
}
```
