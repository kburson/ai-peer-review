<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "5d4b87c34c58fedb989f9dfe75cc373c75117ad5",
      "commit": "b0d89bea635ff4b4f1de538ad719222fd5669936",
      "digest": "sha256:67ce21977bf6c32a931bcb82a8aaf727f46958175325a4ad90a01b9e249d4b86",
      "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-15-190-post209-wave9.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-15-190-post209-wave9.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-aded1122-ac6a-47df-aca8-9b971321e465",
      "claimed_at": "2026-10-15T22:47:41.746Z",
      "expires_at": "2026-10-16T06:47:41.746Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-15T22:47:41.746Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:ccbc42daf17b416b6e410c17b3bef6e9862d51007841df97a61cbef0c58c0023"
    },
    {
      "claim_id": "claim-d113bde0-a42d-4ceb-9273-0828ead70e33",
      "claimed_at": "2026-10-15T22:50:20.099Z",
      "expires_at": "2026-10-16T06:50:20.099Z",
      "host": "codex",
      "last_activity_at": "2026-10-15T22:50:20.099Z",
      "role": "author",
      "session_fingerprint": "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "b0d89bea635ff4b4f1de538ad719222fd5669936",
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
        "joined_at": "2026-10-15T22:44:11.591Z",
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
        "event_log_digest": "sha256:225213916c6c8cd4259d8b862c30c34e784c72f33696116bcd3d07a8bffdd2f5",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-317003bd6b6b94c1e32adde17c4ce13e",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-317003bd6b6b94c1e32adde17c4ce13e",
        "root_review_id": "review-317003bd6b6b94c1e32adde17c4ce13e",
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
      "joined_at": "2026-10-15T22:44:11.591Z",
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
          "fingerprint": "sha256:ccbc42daf17b416b6e410c17b3bef6e9862d51007841df97a61cbef0c58c0023",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-15T22:47:41.720Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:ccbc42daf17b416b6e410c17b3bef6e9862d51007841df97a61cbef0c58c0023"
    }
  },
  "record_id": "review-317003bd6b6b94c1e32adde17c4ce13e",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-317003bd6b6b94c1e32adde17c4ce13e",
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
  "startup_commit": "b0d89bea635ff4b4f1de538ad719222fd5669936",
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
        "digest": "sha256:4a95fbcfc2462a9a565febf1a6f90121fb7e0619b3e93a130829a6dd58387e9c",
        "path": "docs/superpowers/peer-reviews/spec/2026-10-15-2026-10-15-190-post209-wave9-review-317003bd6b6b94c1e32adde17c4ce13e/review-317003bd6b6b94c1e32adde17c4ce13e-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
