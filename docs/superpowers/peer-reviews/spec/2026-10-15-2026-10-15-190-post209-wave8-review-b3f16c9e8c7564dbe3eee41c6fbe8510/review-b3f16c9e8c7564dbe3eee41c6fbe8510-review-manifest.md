<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "67ab34ef5ce5a1a84c69950ce0573c0c42924488",
      "commit": "5357a5f82c90d880a46fe25d8e009c42df5bb534",
      "digest": "sha256:687d8cb2152c99dfb42ff1bc87ed9de0a8b51ea68cf659e186ff89cf024be623",
      "path": "evidence/portable-runtime/process-source/class-reviews/2026-10-15-190-post209-wave8.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/class-reviews/2026-10-15-190-post209-wave8.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-80d4365f-f7cc-40eb-a516-9367ebc3c2b5",
      "claimed_at": "2026-10-15T22:57:56.198Z",
      "expires_at": "2026-10-16T06:57:56.198Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-15T22:57:56.198Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:453232d1bec6cf4835f47ace98e66828b0c9bb985189e6c63a2b5a2225c816b1"
    },
    {
      "claim_id": "claim-ce1e3327-e363-451c-b208-cf34f255255c",
      "claimed_at": "2026-10-15T23:01:31.256Z",
      "expires_at": "2026-10-16T07:01:31.256Z",
      "host": "codex",
      "last_activity_at": "2026-10-15T23:01:31.256Z",
      "role": "author",
      "session_fingerprint": "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "5357a5f82c90d880a46fe25d8e009c42df5bb534",
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
            "fingerprint": "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096",
            "source": "environment-declaration"
          }
        },
        "host": "codex",
        "identity_source": "runtime",
        "joined_at": "2026-10-15T22:54:08.666Z",
        "model_display": "gpt-6.1-sol",
        "model_id": "gpt-6.1-sol",
        "provider": "openai",
        "role": "author",
        "session_fingerprint": "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096"
      },
      "role": "author",
      "sequence": 3
    }
  ],
  "lineage_receipt": {
    "attempts": [
      {
        "consumed_grant_digest": null,
        "event_log_digest": "sha256:969ebf447e237b81870991516f066355741467641eac6f60866a75b94f6b5686",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-b3f16c9e8c7564dbe3eee41c6fbe8510",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-b3f16c9e8c7564dbe3eee41c6fbe8510",
        "root_review_id": "review-b3f16c9e8c7564dbe3eee41c6fbe8510",
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
          "fingerprint": "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096",
          "source": "environment-declaration"
        }
      },
      "host": "codex",
      "identity_source": "runtime",
      "joined_at": "2026-10-15T22:54:08.666Z",
      "model_display": "gpt-6.1-sol",
      "model_id": "gpt-6.1-sol",
      "provider": "openai",
      "role": "author",
      "session_fingerprint": "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096"
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
          "fingerprint": "sha256:453232d1bec6cf4835f47ace98e66828b0c9bb985189e6c63a2b5a2225c816b1",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-15T22:57:56.167Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:453232d1bec6cf4835f47ace98e66828b0c9bb985189e6c63a2b5a2225c816b1"
    }
  },
  "record_id": "review-b3f16c9e8c7564dbe3eee41c6fbe8510",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-b3f16c9e8c7564dbe3eee41c6fbe8510",
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
  "startup_commit": "5357a5f82c90d880a46fe25d8e009c42df5bb534",
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
        "digest": "sha256:6aee82eb8a9fc0ef7b918f7989b8a4a8495d89deb3f1d932bf9edbb363aa0b56",
        "path": "docs/superpowers/peer-reviews/spec/2026-10-15-2026-10-15-190-post209-wave8-review-b3f16c9e8c7564dbe3eee41c6fbe8510/review-b3f16c9e8c7564dbe3eee41c6fbe8510-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
