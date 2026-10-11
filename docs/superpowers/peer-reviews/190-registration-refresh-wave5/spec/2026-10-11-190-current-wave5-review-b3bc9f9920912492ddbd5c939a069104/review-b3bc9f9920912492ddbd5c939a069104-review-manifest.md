<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "38b6f737d6d53b074ef2f2009b24d8aad49602e7",
      "commit": "996a65538b9ec0b5c0ef6a185ecf146ea010819f",
      "digest": "sha256:d88e363d3c9617142dbb50434d63ff47fc8436c3379292e2ec6e8040d6e356c0",
      "path": "evidence/portable-runtime/process-source/registration-reviews/190-current-wave5.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/registration-reviews/190-current-wave5.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-f3a57b89-ad9b-4dfc-90a9-60857c0b5233",
      "claimed_at": "2026-10-11T01:16:02.384Z",
      "expires_at": "2026-10-11T09:16:02.384Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-11T01:16:02.384Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:88bcc28828fbb20c0987fd0daa8425de9bf9e8a6d707316b7e6a9f63408d3e89"
    },
    {
      "claim_id": "claim-c7efeda4-abcb-4d19-9031-77e9d2809b7c",
      "claimed_at": "2026-10-11T01:18:40.648Z",
      "expires_at": "2026-10-11T09:18:40.648Z",
      "host": "codex",
      "last_activity_at": "2026-10-11T01:18:40.648Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "996a65538b9ec0b5c0ef6a185ecf146ea010819f",
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
            "fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be",
            "source": "official-runtime"
          }
        },
        "host": "codex",
        "identity_source": "runtime",
        "joined_at": "2026-10-11T01:14:44.778Z",
        "model_display": "gpt-6.1-sol",
        "model_id": "gpt-6.1-sol",
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
        "event_log_digest": "sha256:55b1d849e6372e2d80e7aa76d44bbfaff96d9c436df638ebd208841b51d90f15",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-b3bc9f9920912492ddbd5c939a069104",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-b3bc9f9920912492ddbd5c939a069104",
        "root_review_id": "review-b3bc9f9920912492ddbd5c939a069104",
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
          "fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be",
          "source": "official-runtime"
        }
      },
      "host": "codex",
      "identity_source": "runtime",
      "joined_at": "2026-10-11T01:14:44.778Z",
      "model_display": "gpt-6.1-sol",
      "model_id": "gpt-6.1-sol",
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
          "fingerprint": "sha256:88bcc28828fbb20c0987fd0daa8425de9bf9e8a6d707316b7e6a9f63408d3e89",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-11T01:16:02.347Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:88bcc28828fbb20c0987fd0daa8425de9bf9e8a6d707316b7e6a9f63408d3e89"
    }
  },
  "record_id": "review-b3bc9f9920912492ddbd5c939a069104",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-b3bc9f9920912492ddbd5c939a069104",
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
    "project_root_digest": "02bdf904a0636a05d48443536bc4a5ca198fe9c057a46731c230a20a8fec74b1",
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
  "startup_commit": "996a65538b9ec0b5c0ef6a185ecf146ea010819f",
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
        "digest": "sha256:44647f109856c59eccdecc7c2d2152efc2fe3610e04a18700f9c481719a9d41c",
        "path": "docs/superpowers/peer-reviews/190-registration-refresh-wave5/spec/2026-10-11-190-current-wave5-review-b3bc9f9920912492ddbd5c939a069104/review-b3bc9f9920912492ddbd5c939a069104-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
