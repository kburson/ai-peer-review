<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "07e6ea981e916c022a0804a58ed46659fe73a054",
      "commit": "3e582711f89f5eef61379015c2c57bc827d70e93",
      "digest": "sha256:ef7c5cd5367a20c297df350f057208c62a70850a2d898282db630b08c1d1a2ab",
      "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-15-190-repair-wave10.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-15-190-repair-wave10.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-f535f392-9b77-4136-9013-ffca387484bd",
      "claimed_at": "2026-10-16T00:10:11.116Z",
      "expires_at": "2026-10-16T08:10:11.116Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-16T00:10:11.116Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:da24e4c4a9702ec967153e193471ac663036a8341cbae71e5ecdaeee08a5d232"
    },
    {
      "claim_id": "claim-d291e6be-7ce0-4dcc-a1f5-d606ec5c3872",
      "claimed_at": "2026-10-16T00:13:49.217Z",
      "expires_at": "2026-10-16T08:13:49.217Z",
      "host": "codex",
      "last_activity_at": "2026-10-16T00:13:49.217Z",
      "role": "author",
      "session_fingerprint": "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "3e582711f89f5eef61379015c2c57bc827d70e93",
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
        "joined_at": "2026-10-16T00:05:56.479Z",
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
        "event_log_digest": "sha256:be0ca6c383b15e6b44f59e1fe90e713678ee2f5da8783bc4e558385fa443dcd5",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-61539a36b3d65ec9cbd8e189da6883e0",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-61539a36b3d65ec9cbd8e189da6883e0",
        "root_review_id": "review-61539a36b3d65ec9cbd8e189da6883e0",
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
      "joined_at": "2026-10-16T00:05:56.479Z",
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
          "fingerprint": "sha256:da24e4c4a9702ec967153e193471ac663036a8341cbae71e5ecdaeee08a5d232",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-16T00:10:11.079Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:da24e4c4a9702ec967153e193471ac663036a8341cbae71e5ecdaeee08a5d232"
    }
  },
  "record_id": "review-61539a36b3d65ec9cbd8e189da6883e0",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-61539a36b3d65ec9cbd8e189da6883e0",
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
  "startup_commit": "3e582711f89f5eef61379015c2c57bc827d70e93",
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
        "digest": "sha256:ad26754952bffcc3d6db6d1bce9d40b8765b1c6f62f501ead10eaf4ed9791bec",
        "path": "docs/superpowers/peer-reviews/spec/2026-10-16-2026-10-15-190-repair-wave10-review-61539a36b3d65ec9cbd8e189da6883e0/review-61539a36b3d65ec9cbd8e189da6883e0-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
