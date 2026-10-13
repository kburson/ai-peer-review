<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "94f4e0925a60ef2e4e2fe31937638e43d0c5cfde",
      "commit": "6f0eabf87c0fb9ebee546cf8154ce8b0d77778cb",
      "digest": "sha256:a2696c8331cfb97a14e1fcf2814b994c39fbf94894675e7e2882128a05bba614",
      "path": "evidence/portable-runtime/process-source/class-reviews/190-current-wave5.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/class-reviews/190-current-wave5.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-0cc42c69-ccf4-47b8-904d-f3ed57555494",
      "claimed_at": "2026-10-11T01:34:42.826Z",
      "expires_at": "2026-10-11T09:34:42.826Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-11T01:34:42.826Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:3862993889f11895ee8dcfab91684e0be2e9aca60e9d00c0af8a5b1d8e5a0fef"
    },
    {
      "claim_id": "claim-0ccdc990-7099-4bc7-902c-33999fe9ceda",
      "claimed_at": "2026-10-11T01:38:07.833Z",
      "expires_at": "2026-10-11T09:38:07.833Z",
      "host": "codex",
      "last_activity_at": "2026-10-11T01:38:07.833Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "6f0eabf87c0fb9ebee546cf8154ce8b0d77778cb",
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
        "joined_at": "2026-10-11T01:32:53.967Z",
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
        "event_log_digest": "sha256:29f9abaf4c01f756a524b7abb79ab0dbe902e294939e9946b263ef3c9738061b",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-fda7ef8825252413e2f615d0d34dc368",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-fda7ef8825252413e2f615d0d34dc368",
        "root_review_id": "review-fda7ef8825252413e2f615d0d34dc368",
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
      "joined_at": "2026-10-11T01:32:53.967Z",
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
          "fingerprint": "sha256:3862993889f11895ee8dcfab91684e0be2e9aca60e9d00c0af8a5b1d8e5a0fef",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-11T01:34:42.795Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:3862993889f11895ee8dcfab91684e0be2e9aca60e9d00c0af8a5b1d8e5a0fef"
    }
  },
  "record_id": "review-fda7ef8825252413e2f615d0d34dc368",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-fda7ef8825252413e2f615d0d34dc368",
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
  "startup_commit": "6f0eabf87c0fb9ebee546cf8154ce8b0d77778cb",
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
        "digest": "sha256:fa1f13f8fc1844076f5339a6c897db9869eed0533424ca9b8b92fb5d762b6072",
        "path": "docs/superpowers/peer-reviews/190-class-refresh-wave5/spec/2026-10-11-190-current-wave5-review-fda7ef8825252413e2f615d0d34dc368/review-fda7ef8825252413e2f615d0d34dc368-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
