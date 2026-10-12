<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "96066626ee2d366e9e749a52ceae59ec0886e7c9",
      "commit": "eea3ca1a9811ce3facc94e94bad2c55a7ce0de14",
      "digest": "sha256:5813d718cd538dc1dda541075b625b54f10dcd2563ad1d850dec0dfe6b188b7b",
      "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave5.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave5.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-bba28daf-d750-4f60-96b0-8c633f2f73b0",
      "claimed_at": "2026-10-12T09:24:25.425Z",
      "expires_at": "2026-10-12T17:24:25.425Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-12T09:24:25.425Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:956af94f9a7132c1c5b33a3a41c9d1479b9d77dd9d581c1609d0add9bf1ee882"
    },
    {
      "claim_id": "claim-d2d7044c-a6e4-4cf9-881c-5e3a2d3888ca",
      "claimed_at": "2026-10-12T09:26:55.363Z",
      "expires_at": "2026-10-12T17:26:55.363Z",
      "host": "codex",
      "last_activity_at": "2026-10-12T09:26:55.363Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "eea3ca1a9811ce3facc94e94bad2c55a7ce0de14",
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
        "joined_at": "2026-10-12T09:22:42.593Z",
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
        "event_log_digest": "sha256:33d4f43bd999b2f05b5d972fdea7a8e4a7a56899d2aeb529dfedabf6ca062cd5",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-cbdf7244263d35d14a975502c0fc45ba",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-cbdf7244263d35d14a975502c0fc45ba",
        "root_review_id": "review-cbdf7244263d35d14a975502c0fc45ba",
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
      "joined_at": "2026-10-12T09:22:42.593Z",
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
          "fingerprint": "sha256:956af94f9a7132c1c5b33a3a41c9d1479b9d77dd9d581c1609d0add9bf1ee882",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-12T09:24:25.393Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:956af94f9a7132c1c5b33a3a41c9d1479b9d77dd9d581c1609d0add9bf1ee882"
    }
  },
  "record_id": "review-cbdf7244263d35d14a975502c0fc45ba",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-cbdf7244263d35d14a975502c0fc45ba",
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
  "startup_commit": "eea3ca1a9811ce3facc94e94bad2c55a7ce0de14",
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
        "digest": "sha256:39815ea6d784d3c874beaae0a6b3b7c6c6a8cf8faa103a7023b47e247f169ffd",
        "path": "docs/superpowers/peer-reviews/190-scope-recapture-registration-wave5/spec/2026-10-12-2026-10-12-190-scope-recapture-wave5-review-cbdf7244263d35d14a975502c0fc45ba/review-cbdf7244263d35d14a975502c0fc45ba-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
