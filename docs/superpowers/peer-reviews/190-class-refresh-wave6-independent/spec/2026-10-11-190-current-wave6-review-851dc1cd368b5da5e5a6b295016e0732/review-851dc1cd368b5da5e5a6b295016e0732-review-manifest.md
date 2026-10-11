<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "20350c169f5453e2720fd40d35576d28f970d136",
      "commit": "7feaa7faa3155fea0f1409b0ce9025620d63b416",
      "digest": "sha256:185d5c578d19db7551ba797da89ea221880b370a0534dc3e468d382880ac3064",
      "path": "evidence/portable-runtime/process-source/class-reviews/190-current-wave6.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/class-reviews/190-current-wave6.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-777162f2-a76a-45a9-a386-4dfd00e198ae",
      "claimed_at": "2026-10-11T03:24:08.871Z",
      "expires_at": "2026-10-11T11:24:08.871Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-11T03:24:08.871Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:01e0433c6dc5002264102b074d734303769be2af31f92cd04691ce6a5b27e433"
    },
    {
      "claim_id": "claim-1236f374-ff78-4956-a2e2-09b35325f35d",
      "claimed_at": "2026-10-11T03:27:33.450Z",
      "expires_at": "2026-10-11T11:27:33.450Z",
      "host": "codex",
      "last_activity_at": "2026-10-11T03:27:33.450Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "7feaa7faa3155fea0f1409b0ce9025620d63b416",
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
        "joined_at": "2026-10-11T03:23:17.947Z",
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
        "event_log_digest": "sha256:b2a7389313c74f7844ee4399afc3ecbd92e3a999886dfd8ed3541f3ca344b08b",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-851dc1cd368b5da5e5a6b295016e0732",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-851dc1cd368b5da5e5a6b295016e0732",
        "root_review_id": "review-851dc1cd368b5da5e5a6b295016e0732",
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
      "joined_at": "2026-10-11T03:23:17.947Z",
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
          "fingerprint": "sha256:01e0433c6dc5002264102b074d734303769be2af31f92cd04691ce6a5b27e433",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-11T03:24:08.842Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:01e0433c6dc5002264102b074d734303769be2af31f92cd04691ce6a5b27e433"
    }
  },
  "record_id": "review-851dc1cd368b5da5e5a6b295016e0732",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-851dc1cd368b5da5e5a6b295016e0732",
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
  "startup_commit": "7feaa7faa3155fea0f1409b0ce9025620d63b416",
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
        "digest": "sha256:20dd11cb08ee20c7aa4adf68667c0f820ab978db8e79f62b3a3fe5b9651f1234",
        "path": "docs/superpowers/peer-reviews/190-class-refresh-wave6-independent/spec/2026-10-11-190-current-wave6-review-851dc1cd368b5da5e5a6b295016e0732/review-851dc1cd368b5da5e5a6b295016e0732-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
