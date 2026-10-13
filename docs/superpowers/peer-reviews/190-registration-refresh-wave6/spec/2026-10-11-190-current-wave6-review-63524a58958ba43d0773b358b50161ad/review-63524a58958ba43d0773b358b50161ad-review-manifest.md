<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "2b12948280ab7d0d6d7334fc2884f8849537d2bf",
      "commit": "d12322a53de877676b3f7094479bd681b9c59cc0",
      "digest": "sha256:953f50236d5e8771a22014699176bfc45643594585c6e4a3d3dfd57e6752b11a",
      "path": "evidence/portable-runtime/process-source/registration-reviews/190-current-wave6.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/registration-reviews/190-current-wave6.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-a7eabdf6-e020-4aba-9080-7a13aeb2d5ac",
      "claimed_at": "2026-10-11T02:58:29.262Z",
      "expires_at": "2026-10-11T10:58:29.262Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-11T02:58:29.262Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:ac10bc18f74d831ae576744e4c25b2c0ec26942b7debaeb5dca4fa8da06645b0"
    },
    {
      "claim_id": "claim-f2f70efd-6690-4dab-b687-0f211caeef2b",
      "claimed_at": "2026-10-11T03:02:07.336Z",
      "expires_at": "2026-10-11T11:02:07.336Z",
      "host": "codex",
      "last_activity_at": "2026-10-11T03:02:07.336Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "d12322a53de877676b3f7094479bd681b9c59cc0",
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
        "joined_at": "2026-10-11T02:56:07.456Z",
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
        "event_log_digest": "sha256:48da6548d3ca77465de6f7e99919cb4d74c1e63307d6937e0189965e931575a5",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-63524a58958ba43d0773b358b50161ad",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-63524a58958ba43d0773b358b50161ad",
        "root_review_id": "review-63524a58958ba43d0773b358b50161ad",
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
      "joined_at": "2026-10-11T02:56:07.456Z",
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
          "fingerprint": "sha256:ac10bc18f74d831ae576744e4c25b2c0ec26942b7debaeb5dca4fa8da06645b0",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-11T02:58:29.237Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:ac10bc18f74d831ae576744e4c25b2c0ec26942b7debaeb5dca4fa8da06645b0"
    }
  },
  "record_id": "review-63524a58958ba43d0773b358b50161ad",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-63524a58958ba43d0773b358b50161ad",
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
  "startup_commit": "d12322a53de877676b3f7094479bd681b9c59cc0",
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
        "digest": "sha256:2441187455b72db2395f64cb3870de8eb0b20be6e07fd18301610ab3a3732f6c",
        "path": "docs/superpowers/peer-reviews/190-registration-refresh-wave6/spec/2026-10-11-190-current-wave6-review-63524a58958ba43d0773b358b50161ad/review-63524a58958ba43d0773b358b50161ad-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
