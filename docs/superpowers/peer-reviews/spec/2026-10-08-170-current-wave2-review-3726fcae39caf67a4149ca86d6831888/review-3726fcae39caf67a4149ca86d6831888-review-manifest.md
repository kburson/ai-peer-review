<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "bc88c17b4123b8a11f5b1769daf79e5cdd0d43ce",
      "commit": "eb7fec18a85c40f56a40270dd63ba0f19ea16683",
      "digest": "sha256:44de8c97721c5458b311b3553ae0c2a5efdd9a2c8fec148189c1aed64c126509",
      "path": "evidence/portable-runtime/process-source/class-reviews/170-current-wave2.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/class-reviews/170-current-wave2.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-be061c80-2257-4aec-bcf7-4d70fd1f49e2",
      "claimed_at": "2026-10-08T08:00:04.033Z",
      "expires_at": "2026-10-08T16:00:04.033Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-08T08:00:04.033Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:c6ec773ce692a3126327772726213d3a4f35f0a2a7cf71298dea9480a913c091"
    },
    {
      "claim_id": "claim-54ab10af-13b0-4666-b969-52c32ddd9664",
      "claimed_at": "2026-10-08T08:02:55.083Z",
      "expires_at": "2026-10-08T16:02:55.083Z",
      "host": "codex",
      "last_activity_at": "2026-10-08T08:02:55.083Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "eb7fec18a85c40f56a40270dd63ba0f19ea16683",
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
            "requested_id": "gpt-6-astra",
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
        "joined_at": "2026-10-08T07:59:13.683Z",
        "model_display": "gpt-6-astra",
        "model_id": "gpt-6-astra",
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
        "event_log_digest": "sha256:1b23556e18e12fa2202fd88a4e676e83057800c8697cac32a74a992a50f4afbe",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-3726fcae39caf67a4149ca86d6831888",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-3726fcae39caf67a4149ca86d6831888",
        "root_review_id": "review-3726fcae39caf67a4149ca86d6831888",
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
          "requested_id": "gpt-6-astra",
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
      "joined_at": "2026-10-08T07:59:13.683Z",
      "model_display": "gpt-6-astra",
      "model_id": "gpt-6-astra",
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
          "fingerprint": "sha256:c6ec773ce692a3126327772726213d3a4f35f0a2a7cf71298dea9480a913c091",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-08T08:00:04.005Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:c6ec773ce692a3126327772726213d3a4f35f0a2a7cf71298dea9480a913c091"
    }
  },
  "record_id": "review-3726fcae39caf67a4149ca86d6831888",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-3726fcae39caf67a4149ca86d6831888",
  "runtime": {
    "adapter_version": "1.0.0",
    "author": {
      "effort": "high",
      "host": "codex",
      "model_display": "gpt-6-astra",
      "model_id": "gpt-6-astra",
      "provider": "openai"
    },
    "classification": "XPR",
    "ownership": "broker",
    "project_root_digest": "c6bad9501e1e00130d154a23b8b6f6ea258175510ec252669b13d90bb35ab798",
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
  "startup_commit": "eb7fec18a85c40f56a40270dd63ba0f19ea16683",
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
        "digest": "sha256:4c9cac4475d2f88210bcb2e4f5303ba31caa2c89d81e5cc82bbd384c105d0827",
        "path": "docs/superpowers/peer-reviews/spec/2026-10-08-170-current-wave2-review-3726fcae39caf67a4149ca86d6831888/review-3726fcae39caf67a4149ca86d6831888-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
