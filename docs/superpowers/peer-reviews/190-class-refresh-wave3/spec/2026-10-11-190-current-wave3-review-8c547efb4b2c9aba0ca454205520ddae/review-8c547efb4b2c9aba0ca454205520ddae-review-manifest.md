<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "f508e878a65622f125d2f6e0f3cda9d2e0d0a7f6",
      "commit": "7ea557a2a408761eb4567e238b96821f6aba7a19",
      "digest": "sha256:729efc93461cc43ea50c9c0fa8334d10eeac0124ae10aaad6451a593ecd5dd83",
      "path": "evidence/portable-runtime/process-source/class-reviews/190-current-wave3.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/class-reviews/190-current-wave3.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-d752fc43-da51-4b83-a75b-ca370d2f579f",
      "claimed_at": "2026-10-11T01:21:16.088Z",
      "expires_at": "2026-10-11T09:21:16.088Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-11T01:21:16.088Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:b67e3b7b0ace9a14f965730ed12e08da2c4a46fcbc719578a172be55dce388fb"
    },
    {
      "claim_id": "claim-fb3ff514-9a27-43b7-bdf2-a847ecbd562c",
      "claimed_at": "2026-10-11T01:26:47.824Z",
      "expires_at": "2026-10-11T09:26:47.824Z",
      "host": "codex",
      "last_activity_at": "2026-10-11T01:26:47.824Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "7ea557a2a408761eb4567e238b96821f6aba7a19",
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
        "joined_at": "2026-10-11T01:20:03.403Z",
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
        "event_log_digest": "sha256:3f2bbe803fd89aa5942d348d1220f4886754532a9a0be4f26e4c8d689f18401f",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-8c547efb4b2c9aba0ca454205520ddae",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-8c547efb4b2c9aba0ca454205520ddae",
        "root_review_id": "review-8c547efb4b2c9aba0ca454205520ddae",
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
      "joined_at": "2026-10-11T01:20:03.403Z",
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
          "fingerprint": "sha256:b67e3b7b0ace9a14f965730ed12e08da2c4a46fcbc719578a172be55dce388fb",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-11T01:21:16.064Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:b67e3b7b0ace9a14f965730ed12e08da2c4a46fcbc719578a172be55dce388fb"
    }
  },
  "record_id": "review-8c547efb4b2c9aba0ca454205520ddae",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-8c547efb4b2c9aba0ca454205520ddae",
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
  "startup_commit": "7ea557a2a408761eb4567e238b96821f6aba7a19",
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
        "digest": "sha256:cac25d0bbdfcd4d8eaf2b62631d7269b83181e1d710773e9931adf83e5043a71",
        "path": "docs/superpowers/peer-reviews/190-class-refresh-wave3/spec/2026-10-11-190-current-wave3-review-8c547efb4b2c9aba0ca454205520ddae/review-8c547efb4b2c9aba0ca454205520ddae-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
