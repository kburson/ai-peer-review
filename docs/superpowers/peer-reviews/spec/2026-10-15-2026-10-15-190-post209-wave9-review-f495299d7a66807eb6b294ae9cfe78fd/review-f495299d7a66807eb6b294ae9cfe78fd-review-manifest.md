<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "e2814930a0b563a84a2655421587a42b165b93ed",
      "commit": "af4bb1cba12fd68dbf0c79ded09e9f053695fbe1",
      "digest": "sha256:a71fd3fccc7cd19f91d9adf4c952a86a07cdf4757ca6b4d29c89958be55afdf7",
      "path": "evidence/portable-runtime/process-source/class-reviews/2026-10-15-190-post209-wave9.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/class-reviews/2026-10-15-190-post209-wave9.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-10dac985-c387-4010-a5be-b75ee4da5b2f",
      "claimed_at": "2026-10-15T23:05:50.901Z",
      "expires_at": "2026-10-16T07:05:50.901Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-15T23:05:50.901Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:fe687f8621421682eb85c1aeca8b2d189d7e09e3a2c992ec890121dfe5a72859"
    },
    {
      "claim_id": "claim-0b3648c9-ff1d-4a22-9119-cb7fe168981c",
      "claimed_at": "2026-10-15T23:09:29.575Z",
      "expires_at": "2026-10-16T07:09:29.575Z",
      "host": "codex",
      "last_activity_at": "2026-10-15T23:09:29.575Z",
      "role": "author",
      "session_fingerprint": "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "af4bb1cba12fd68dbf0c79ded09e9f053695fbe1",
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
        "joined_at": "2026-10-15T23:02:28.107Z",
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
        "event_log_digest": "sha256:3feeb1ee45faf60da87a69038d4a740533d0fc32511c2623be2c424399c0ca33",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-f495299d7a66807eb6b294ae9cfe78fd",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-f495299d7a66807eb6b294ae9cfe78fd",
        "root_review_id": "review-f495299d7a66807eb6b294ae9cfe78fd",
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
      "joined_at": "2026-10-15T23:02:28.107Z",
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
          "fingerprint": "sha256:fe687f8621421682eb85c1aeca8b2d189d7e09e3a2c992ec890121dfe5a72859",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-15T23:05:50.867Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:fe687f8621421682eb85c1aeca8b2d189d7e09e3a2c992ec890121dfe5a72859"
    }
  },
  "record_id": "review-f495299d7a66807eb6b294ae9cfe78fd",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-f495299d7a66807eb6b294ae9cfe78fd",
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
  "startup_commit": "af4bb1cba12fd68dbf0c79ded09e9f053695fbe1",
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
        "digest": "sha256:e7841d76d6e3e173ec6b664b53be78563d1e9a9f7afbee92bc19d8d156444e24",
        "path": "docs/superpowers/peer-reviews/spec/2026-10-15-2026-10-15-190-post209-wave9-review-f495299d7a66807eb6b294ae9cfe78fd/review-f495299d7a66807eb6b294ae9cfe78fd-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
