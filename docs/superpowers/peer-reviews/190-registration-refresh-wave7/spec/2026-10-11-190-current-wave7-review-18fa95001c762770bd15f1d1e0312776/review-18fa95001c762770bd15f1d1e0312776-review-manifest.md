<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "26224eebd9582be6a5f78ee01358d0a3cb5f4022",
      "commit": "a049cd90faf2e4db186521a878fbc1d68eeb23bd",
      "digest": "sha256:7998c0860dd17d6a793319a2be2cc87c007bc4bdc65e3d8cf76aec5718d14c1f",
      "path": "evidence/portable-runtime/process-source/registration-reviews/190-current-wave7.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/registration-reviews/190-current-wave7.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-2afc0e75-cfdd-4ef2-bc5b-531be6be14f5",
      "claimed_at": "2026-10-11T03:09:32.587Z",
      "expires_at": "2026-10-11T11:09:32.587Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-11T03:09:32.587Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:2eae9c72d1cf8d3a09d6ef140efeedf26fd75b6c7500bfc3a85c3c883f84a1e8"
    },
    {
      "claim_id": "claim-278c71fb-62d7-4180-9307-af3e3d5b6ecb",
      "claimed_at": "2026-10-11T03:11:29.029Z",
      "expires_at": "2026-10-11T11:11:29.029Z",
      "host": "codex",
      "last_activity_at": "2026-10-11T03:11:29.029Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "a049cd90faf2e4db186521a878fbc1d68eeb23bd",
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
        "joined_at": "2026-10-11T03:08:41.253Z",
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
        "event_log_digest": "sha256:0ce1670419be799e11d90208f967570dde3b127e2ad510d6cfbc8001f8da6ec0",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-18fa95001c762770bd15f1d1e0312776",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-18fa95001c762770bd15f1d1e0312776",
        "root_review_id": "review-18fa95001c762770bd15f1d1e0312776",
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
      "joined_at": "2026-10-11T03:08:41.253Z",
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
          "fingerprint": "sha256:2eae9c72d1cf8d3a09d6ef140efeedf26fd75b6c7500bfc3a85c3c883f84a1e8",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-11T03:09:32.559Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:2eae9c72d1cf8d3a09d6ef140efeedf26fd75b6c7500bfc3a85c3c883f84a1e8"
    }
  },
  "record_id": "review-18fa95001c762770bd15f1d1e0312776",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-18fa95001c762770bd15f1d1e0312776",
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
  "startup_commit": "a049cd90faf2e4db186521a878fbc1d68eeb23bd",
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
        "digest": "sha256:f97770cacf4acbdd0a91d668c115356ea4d20dfb39cd5cad5030434e51168f8a",
        "path": "docs/superpowers/peer-reviews/190-registration-refresh-wave7/spec/2026-10-11-190-current-wave7-review-18fa95001c762770bd15f1d1e0312776/review-18fa95001c762770bd15f1d1e0312776-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
