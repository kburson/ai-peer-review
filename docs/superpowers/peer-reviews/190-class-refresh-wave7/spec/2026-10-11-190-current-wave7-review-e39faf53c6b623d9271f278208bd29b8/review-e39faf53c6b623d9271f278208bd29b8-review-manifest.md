<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "77b3e3c6ff6a69900d29d67a8609b15b9f674bfb",
      "commit": "f32e63389c1dae7e42c9ec98f400573c7605040b",
      "digest": "sha256:6958aa89746e18b3f7fe97159bb06cba954b4d1e65dda672c1596dd1efe99e4b",
      "path": "evidence/portable-runtime/process-source/class-reviews/190-current-wave7.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/class-reviews/190-current-wave7.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-4e0aa2c6-14bd-4cc2-a6a1-a48056e84654",
      "claimed_at": "2026-10-11T03:30:19.448Z",
      "expires_at": "2026-10-11T11:30:19.448Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-11T03:30:19.448Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:da639e372c742b5bf73accb80ef89f47b3e608f548efaa63c2661a82d14b1f7b"
    },
    {
      "claim_id": "claim-1ea257d9-724f-470f-9238-c1d99bdeeee1",
      "claimed_at": "2026-10-11T03:34:27.254Z",
      "expires_at": "2026-10-11T11:34:27.254Z",
      "host": "codex",
      "last_activity_at": "2026-10-11T03:34:27.254Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "f32e63389c1dae7e42c9ec98f400573c7605040b",
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
        "joined_at": "2026-10-11T03:29:23.780Z",
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
        "event_log_digest": "sha256:f6a695d039ed75a1f05b6c7a20f4a56487359ec21a4fa0657bfd6de8b0bb73ba",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-e39faf53c6b623d9271f278208bd29b8",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-e39faf53c6b623d9271f278208bd29b8",
        "root_review_id": "review-e39faf53c6b623d9271f278208bd29b8",
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
      "joined_at": "2026-10-11T03:29:23.780Z",
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
          "fingerprint": "sha256:da639e372c742b5bf73accb80ef89f47b3e608f548efaa63c2661a82d14b1f7b",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-11T03:30:19.356Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:da639e372c742b5bf73accb80ef89f47b3e608f548efaa63c2661a82d14b1f7b"
    }
  },
  "record_id": "review-e39faf53c6b623d9271f278208bd29b8",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-e39faf53c6b623d9271f278208bd29b8",
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
  "startup_commit": "f32e63389c1dae7e42c9ec98f400573c7605040b",
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
        "digest": "sha256:3348a78f13100db0abe7446735cebd074a4440a6fca92fcfe31a71ab1e71ca21",
        "path": "docs/superpowers/peer-reviews/190-class-refresh-wave7/spec/2026-10-11-190-current-wave7-review-e39faf53c6b623d9271f278208bd29b8/review-e39faf53c6b623d9271f278208bd29b8-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
