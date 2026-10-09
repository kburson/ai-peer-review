<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "aba62e3222f303788c306805caa867a871734455",
      "commit": "75d9d024666601998d23666dc5133c1777c95135",
      "digest": "sha256:156db01cb75bdb21fe09298739507dcb21f5024d84d485d360b2c90a6fe93ccf",
      "path": "evidence/portable-runtime/process-source/class-reviews/190-current-wave1.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/class-reviews/190-current-wave1.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-a973feed-cbed-47de-a32d-bc6d6099af11",
      "claimed_at": "2026-10-09T13:56:04.909Z",
      "expires_at": "2026-10-09T21:56:04.909Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-09T13:56:04.909Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:ecb166856f7cba7fc8154648df6d5ae89f6cbf5552862c47874f71697054773a"
    },
    {
      "claim_id": "claim-b4bf87b9-f18f-4af5-93f5-487d1ffff840",
      "claimed_at": "2026-10-09T14:06:50.344Z",
      "expires_at": "2026-10-09T22:06:50.344Z",
      "host": "codex",
      "last_activity_at": "2026-10-09T14:06:50.344Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "75d9d024666601998d23666dc5133c1777c95135",
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
        "joined_at": "2026-10-09T13:54:53.952Z",
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
        "event_log_digest": "sha256:1e5a034dd9ee64ffeb04011951b961f32f2691ae9962e0ef2fe3362a7185ce09",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-6eb727f6de30ed23f41d2cc748ee864b",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-6eb727f6de30ed23f41d2cc748ee864b",
        "root_review_id": "review-6eb727f6de30ed23f41d2cc748ee864b",
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
      "joined_at": "2026-10-09T13:54:53.952Z",
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
          "fingerprint": "sha256:ecb166856f7cba7fc8154648df6d5ae89f6cbf5552862c47874f71697054773a",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-09T13:56:04.883Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:ecb166856f7cba7fc8154648df6d5ae89f6cbf5552862c47874f71697054773a"
    }
  },
  "record_id": "review-6eb727f6de30ed23f41d2cc748ee864b",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-6eb727f6de30ed23f41d2cc748ee864b",
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
  "startup_commit": "75d9d024666601998d23666dc5133c1777c95135",
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
        "digest": "sha256:3597acc5c881733327cd436d13ed9cfcb28331532aa33f9f0c9fbdbdcf137b3a",
        "path": "docs/superpowers/peer-reviews/190-class-wave1-doc-checkpoint/spec/2026-10-09-190-current-wave1-review-6eb727f6de30ed23f41d2cc748ee864b/review-6eb727f6de30ed23f41d2cc748ee864b-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
