<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "228dbbbf16047138dc0d5796697497d5c3ef3870",
      "commit": "da74e66ac6ecffab6b1a4f802b95d3a468098b23",
      "digest": "sha256:0c83299c90cad064b2f2f68269bf334a6af34c061da08341739a9d9e381f7344",
      "path": "evidence/portable-runtime/process-source/class-reviews/190-current-wave2.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/class-reviews/190-current-wave2.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-1c5e913e-939b-4d70-bcf1-b4929c05a6b7",
      "claimed_at": "2026-10-09T14:18:41.178Z",
      "expires_at": "2026-10-09T22:18:41.178Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-09T14:18:41.178Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:efc7b113ed1a12ffb2cc9e2c618fcd9b27dd27d3c90644b398814d03bd7bbfae"
    },
    {
      "claim_id": "claim-e210d639-8ddd-4e52-9ede-82fd14d2896b",
      "claimed_at": "2026-10-09T14:27:21.517Z",
      "expires_at": "2026-10-09T22:27:21.517Z",
      "host": "codex",
      "last_activity_at": "2026-10-09T14:27:21.517Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "da74e66ac6ecffab6b1a4f802b95d3a468098b23",
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
        "joined_at": "2026-10-09T14:16:48.635Z",
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
        "event_log_digest": "sha256:7bf6f3eb51c47b7a5f4436249995cc50a6ab57f46dcc0cf4e80cafbf23b5ca34",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-58ce3c1cef222b307232208b248fdb84",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-58ce3c1cef222b307232208b248fdb84",
        "root_review_id": "review-58ce3c1cef222b307232208b248fdb84",
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
      "joined_at": "2026-10-09T14:16:48.635Z",
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
          "fingerprint": "sha256:efc7b113ed1a12ffb2cc9e2c618fcd9b27dd27d3c90644b398814d03bd7bbfae",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-09T14:18:41.139Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:efc7b113ed1a12ffb2cc9e2c618fcd9b27dd27d3c90644b398814d03bd7bbfae"
    }
  },
  "record_id": "review-58ce3c1cef222b307232208b248fdb84",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-58ce3c1cef222b307232208b248fdb84",
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
  "startup_commit": "da74e66ac6ecffab6b1a4f802b95d3a468098b23",
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
        "digest": "sha256:59d4c806e3be74df8872a5d123fc28925f29be3a6204dd31ba625f94fbac23ec",
        "path": "docs/superpowers/peer-reviews/190-class-wave2/spec/2026-10-09-190-current-wave2-review-58ce3c1cef222b307232208b248fdb84/review-58ce3c1cef222b307232208b248fdb84-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
