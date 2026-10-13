<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "2c92fd04de4fb198e44b2e0f742c06427f628430",
      "commit": "5e02025b0faf9d6fae1c72fa4a2fa303104ae52c",
      "digest": "sha256:4c2e4daa5910630a3f1da3204f8b7d911b92c53d032a39a92127f0bec123b97f",
      "path": "evidence/portable-runtime/process-source/registration-reviews/190-current-wave1.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/registration-reviews/190-current-wave1.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-cc80f1c2-93bf-42b2-96b9-68ad3f852288",
      "claimed_at": "2026-10-09T13:06:56.659Z",
      "expires_at": "2026-10-09T21:06:56.659Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-09T13:06:56.659Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:178f8392def0a12f77adf5086eeb6bbe541e3c648626343f2796883037f05a5e"
    },
    {
      "claim_id": "claim-c1f5fe8f-c041-4b2a-8b33-1dd263ee2092",
      "claimed_at": "2026-10-09T13:08:42.617Z",
      "expires_at": "2026-10-09T21:08:42.617Z",
      "host": "codex",
      "last_activity_at": "2026-10-09T13:08:42.617Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "5e02025b0faf9d6fae1c72fa4a2fa303104ae52c",
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
        "joined_at": "2026-10-09T13:05:50.746Z",
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
        "event_log_digest": "sha256:8a9efb60b5e55cc524d703d580b3a31243b837ea3a37b49ddbeb708e6b4ab2b0",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-4150df18b119645227fc80629e12c2c1",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-4150df18b119645227fc80629e12c2c1",
        "root_review_id": "review-4150df18b119645227fc80629e12c2c1",
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
      "joined_at": "2026-10-09T13:05:50.746Z",
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
          "declared_id": "claude-sonnet-5-5",
          "observed_id": null,
          "requested_id": null,
          "source": "environment-declaration"
        },
        "session": {
          "assurance": "declared",
          "fingerprint": "sha256:178f8392def0a12f77adf5086eeb6bbe541e3c648626343f2796883037f05a5e",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-09T13:06:56.608Z",
      "model_display": "claude-sonnet-5-5",
      "model_id": "claude-sonnet-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:178f8392def0a12f77adf5086eeb6bbe541e3c648626343f2796883037f05a5e"
    }
  },
  "record_id": "review-4150df18b119645227fc80629e12c2c1",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-4150df18b119645227fc80629e12c2c1",
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
      "effort": "medium",
      "host": "claude-code",
      "model_display": "claude-sonnet-5-5",
      "model_id": "claude-sonnet-5-5",
      "provider": "anthropic",
      "selector": "claude"
    },
    "schema": "ai-peer-review.runtime/v1",
    "transport_mode": "manual"
  },
  "schema": "ai-peer-review.manifest/v1",
  "startup_commit": "5e02025b0faf9d6fae1c72fa4a2fa303104ae52c",
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
        "digest": "sha256:b1c85599c38e2284dee650b8f46e346ca3e8faac83c66808b5ad17d88aa8df3f",
        "path": "docs/superpowers/peer-reviews/190-registration-wave1-independent/spec/2026-10-09-190-current-wave1-review-4150df18b119645227fc80629e12c2c1/review-4150df18b119645227fc80629e12c2c1-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
