<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "812ecd0c983caa593340b7c145d682ccf3157fca",
      "commit": "8d1f8ee35df5714bbea11e06bf671e4018b4c2fb",
      "digest": "sha256:e5328fc79fb4f119822719d0de70a943175ef2516a5410b09f02f4d6c3a73643",
      "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-selection-scope-wave1.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "940f58218740c88fbb2e4a18366b58845ac8d9d5",
      "commit": "04fc85d25c3a8c00d585549ce03c5a4cbe338085",
      "digest": "sha256:cc0f69a47959ad2cee80279bbbc8cf0e66c03254efa369d8f95a0dee6254b4dd",
      "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-selection-scope-wave1.md",
      "snapshot": null,
      "turn": 1
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-selection-scope-wave1.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-37796d74-2d15-4fd6-a316-05a5cfba3029",
      "claimed_at": "2026-10-12T05:13:04.413Z",
      "expires_at": "2026-10-12T13:13:04.413Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-12T05:13:04.413Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:e38d2b20734d8cfd976665a9c74c332106d3b338b9d9404c255f0eaacef27aed"
    },
    {
      "claim_id": "claim-f7cc5c83-e2d9-4c21-b5d3-2cb4e8483ed2",
      "claimed_at": "2026-10-12T05:15:56.646Z",
      "expires_at": "2026-10-12T13:15:56.646Z",
      "host": "codex",
      "last_activity_at": "2026-10-12T05:15:56.646Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "04fc85d25c3a8c00d585549ce03c5a4cbe338085",
  "human_decision": null,
  "identity_changes": [
    {
      "identity": {
        "evidence": {
          "model": {
            "assurance": "declared",
            "conflict": false,
            "declared_id": "gpt-6.1-sol",
            "observed_id": null,
            "requested_id": null,
            "source": "environment-declaration"
          },
          "session": {
            "assurance": "declared",
            "fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be",
            "source": "environment-declaration"
          }
        },
        "host": "codex",
        "identity_source": "runtime",
        "joined_at": "2026-10-12T05:08:51.251Z",
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
        "event_log_digest": "sha256:42ee2c52569ce5bc495a422608abcf55034e1dcca77796d4c1258744458f5bb6",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-7ab030012d59f508bd4f0466c669a3f7",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-7ab030012d59f508bd4f0466c669a3f7",
        "root_review_id": "review-7ab030012d59f508bd4f0466c669a3f7",
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
          "declared_id": "gpt-6.1-sol",
          "observed_id": null,
          "requested_id": null,
          "source": "environment-declaration"
        },
        "session": {
          "assurance": "declared",
          "fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be",
          "source": "environment-declaration"
        }
      },
      "host": "codex",
      "identity_source": "runtime",
      "joined_at": "2026-10-12T05:08:51.251Z",
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
          "fingerprint": "sha256:e38d2b20734d8cfd976665a9c74c332106d3b338b9d9404c255f0eaacef27aed",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-12T05:13:04.377Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:e38d2b20734d8cfd976665a9c74c332106d3b338b9d9404c255f0eaacef27aed"
    }
  },
  "record_id": "review-7ab030012d59f508bd4f0466c669a3f7",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-7ab030012d59f508bd4f0466c669a3f7",
  "runtime": {
    "adapter_version": "1.0.0",
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
  "startup_commit": "8d1f8ee35df5714bbea11e06bf671e4018b4c2fb",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "940f58218740c88fbb2e4a18366b58845ac8d9d5",
        "digest": "sha256:cc0f69a47959ad2cee80279bbbc8cf0e66c03254efa369d8f95a0dee6254b4dd",
        "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-selection-scope-wave1.md"
      },
      "author_response": {
        "digest": "sha256:17517d5d73e82bb9b2a8da6ade65b1fb004466195a5406048ca20712ea4ff23c",
        "path": "docs/superpowers/peer-reviews/190-selection-scope-registration-wave1/spec/2026-10-12-2026-10-12-190-selection-scope-wave1-review-7ab030012d59f508bd4f0466c669a3f7/review-7ab030012d59f508bd4f0466c669a3f7-author-response-1.md"
      },
      "commit": "04fc85d25c3a8c00d585549ce03c5a4cbe338085",
      "decision": "revisions-requested",
      "finding_ids": [],
      "reviewer_response": {
        "digest": "sha256:4e73ed415afeecbb8eb3f1ecb1af8c819fa390c017b3fb3cd479f95188b98d95",
        "path": "docs/superpowers/peer-reviews/190-selection-scope-registration-wave1/spec/2026-10-12-2026-10-12-190-selection-scope-wave1-review-7ab030012d59f508bd4f0466c669a3f7/review-7ab030012d59f508bd4f0466c669a3f7-reviewer-response-1.md"
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
        "digest": "sha256:aae2dbfa9a9fc050ea64dbe4e492d456e8870ff47a875e99f1f98fbb699233c2",
        "path": "docs/superpowers/peer-reviews/190-selection-scope-registration-wave1/spec/2026-10-12-2026-10-12-190-selection-scope-wave1-review-7ab030012d59f508bd4f0466c669a3f7/review-7ab030012d59f508bd4f0466c669a3f7-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    }
  ]
}
```
