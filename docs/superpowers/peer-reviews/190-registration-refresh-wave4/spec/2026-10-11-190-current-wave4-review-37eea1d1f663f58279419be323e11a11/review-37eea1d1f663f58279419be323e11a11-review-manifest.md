<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "3942f67518474c6884049faa7340fd57432e1301",
      "commit": "c6b6485dc17cfc5f632a658bdb50c627a4384c66",
      "digest": "sha256:803b017f9907ebdc889a635ae4af6e2c8adf212702707c040438c5d110121029",
      "path": "evidence/portable-runtime/process-source/registration-reviews/190-current-wave4.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/registration-reviews/190-current-wave4.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-e1285f60-9c16-4d00-b6b3-2bca9aab59af",
      "claimed_at": "2026-10-11T01:00:39.127Z",
      "expires_at": "2026-10-11T09:00:39.127Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-11T01:00:39.127Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:c20153efec3e0ee66d921ee05aab2a27b49f1d74a4658c0d1c4358aafb81b0c5"
    },
    {
      "claim_id": "claim-070e4a29-782f-4297-9737-73c0716a8a67",
      "claimed_at": "2026-10-11T01:02:32.869Z",
      "expires_at": "2026-10-11T09:02:32.869Z",
      "host": "codex",
      "last_activity_at": "2026-10-11T01:02:32.869Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "c6b6485dc17cfc5f632a658bdb50c627a4384c66",
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
        "joined_at": "2026-10-11T00:59:43.365Z",
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
        "event_log_digest": "sha256:1b22ac4f44dc6a33ee423de9643ffe126b47f2f5ec4467251ffb5908113c8d85",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-37eea1d1f663f58279419be323e11a11",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-37eea1d1f663f58279419be323e11a11",
        "root_review_id": "review-37eea1d1f663f58279419be323e11a11",
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
      "joined_at": "2026-10-11T00:59:43.365Z",
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
          "fingerprint": "sha256:c20153efec3e0ee66d921ee05aab2a27b49f1d74a4658c0d1c4358aafb81b0c5",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-11T01:00:39.099Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:c20153efec3e0ee66d921ee05aab2a27b49f1d74a4658c0d1c4358aafb81b0c5"
    }
  },
  "record_id": "review-37eea1d1f663f58279419be323e11a11",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-37eea1d1f663f58279419be323e11a11",
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
  "startup_commit": "c6b6485dc17cfc5f632a658bdb50c627a4384c66",
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
        "digest": "sha256:2d538e4a05428b54c4b157583726ce6b9faf7c76dcf078dc64a5c62c199f2b32",
        "path": "docs/superpowers/peer-reviews/190-registration-refresh-wave4/spec/2026-10-11-190-current-wave4-review-37eea1d1f663f58279419be323e11a11/review-37eea1d1f663f58279419be323e11a11-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
