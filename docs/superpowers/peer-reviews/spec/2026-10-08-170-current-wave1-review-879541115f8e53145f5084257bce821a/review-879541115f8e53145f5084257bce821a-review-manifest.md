<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "ea1209968418dc3c009ebfa28ef7d85e5c292e8a",
      "commit": "549d5100cc0e2060058ce9ffffbfe272cee1822b",
      "digest": "sha256:3adc12c4becb9005b830abc41b95db23fc5d3c436eafcb6fd30311da970de7f0",
      "path": "evidence/portable-runtime/process-source/class-reviews/170-current-wave1.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/class-reviews/170-current-wave1.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-b196e6fa-6b25-43dc-ba32-114e53362941",
      "claimed_at": "2026-10-08T07:51:08.978Z",
      "expires_at": "2026-10-08T15:51:08.978Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-08T07:51:08.978Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:33a1d7cdf86a245e44dfed904f4ed266d896c3766226675432a06a73328d118c"
    },
    {
      "claim_id": "claim-332f7f58-8074-426c-bdef-aa8429272c53",
      "claimed_at": "2026-10-08T07:58:25.787Z",
      "expires_at": "2026-10-08T15:58:25.787Z",
      "host": "codex",
      "last_activity_at": "2026-10-08T07:58:25.787Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "549d5100cc0e2060058ce9ffffbfe272cee1822b",
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
            "requested_id": "gpt-6-astra",
            "source": "launch-request"
          },
          "session": {
            "assurance": "declared",
            "fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be",
            "source": "official-runtime"
          }
        },
        "host": "codex",
        "identity_source": "runtime",
        "joined_at": "2026-10-08T07:50:17.511Z",
        "model_display": "gpt-6-astra",
        "model_id": "gpt-6-astra",
        "provider": "openai",
        "role": "author",
        "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
      },
      "role": "author",
      "sequence": 3
    }
  ],
  "lineage_receipt": {
    "attempts": [
      {
        "consumed_grant_digest": null,
        "event_log_digest": "sha256:3774d7043e59a74a8557e09775541dec0500a902bf9232c60ddaad6b0640b507",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-879541115f8e53145f5084257bce821a",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-879541115f8e53145f5084257bce821a",
        "root_review_id": "review-879541115f8e53145f5084257bce821a",
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
          "requested_id": "gpt-6-astra",
          "source": "launch-request"
        },
        "session": {
          "assurance": "declared",
          "fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be",
          "source": "official-runtime"
        }
      },
      "host": "codex",
      "identity_source": "runtime",
      "joined_at": "2026-10-08T07:50:17.511Z",
      "model_display": "gpt-6-astra",
      "model_id": "gpt-6-astra",
      "provider": "openai",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
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
          "fingerprint": "sha256:33a1d7cdf86a245e44dfed904f4ed266d896c3766226675432a06a73328d118c",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-08T07:51:08.952Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:33a1d7cdf86a245e44dfed904f4ed266d896c3766226675432a06a73328d118c"
    }
  },
  "record_id": "review-879541115f8e53145f5084257bce821a",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-879541115f8e53145f5084257bce821a",
  "runtime": {
    "adapter_version": "1.0.0",
    "author": {
      "effort": "high",
      "host": "codex",
      "model_display": "gpt-6-astra",
      "model_id": "gpt-6-astra",
      "provider": "openai"
    },
    "classification": "XPR",
    "ownership": "broker",
    "project_root_digest": "c6bad9501e1e00130d154a23b8b6f6ea258175510ec252669b13d90bb35ab798",
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
  "startup_commit": "549d5100cc0e2060058ce9ffffbfe272cee1822b",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": null,
      "author_response": null,
      "commit": null,
      "decision": "accepted",
      "finding_ids": [],
      "reviewer_response": {
        "digest": "sha256:b933668d3b0f36d92d8ad2828c90333a08e409c3894c232800b1d39eaa8ceffc",
        "path": "docs/superpowers/peer-reviews/spec/2026-10-08-170-current-wave1-review-879541115f8e53145f5084257bce821a/review-879541115f8e53145f5084257bce821a-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
