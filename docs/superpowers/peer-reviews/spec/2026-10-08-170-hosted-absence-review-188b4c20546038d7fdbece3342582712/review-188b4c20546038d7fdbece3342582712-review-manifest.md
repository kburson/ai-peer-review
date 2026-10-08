<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "d5ec1552807456c191c31bbde426a8d597edcddc",
      "commit": "030425d7a82aaff635b9d50dc47665d3dac6df80",
      "digest": "sha256:0ebb7443f7a302924a460ee0cc76b2a71b1e1d6e33e686ff1579cd79f6d24132",
      "path": "evidence/portable-runtime/process-source/registration-reviews/170-hosted-absence.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/registration-reviews/170-hosted-absence.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-5d96e330-5419-4599-9d1d-5270c985773f",
      "claimed_at": "2026-10-08T06:24:05.422Z",
      "expires_at": "2026-10-08T14:24:05.422Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-08T06:24:05.422Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:fb25daffd12f2487876e889f90990e3121d8ee289b7a749307e4099b0df748ae"
    },
    {
      "claim_id": "claim-c6756921-5f36-4e27-b9d1-c4eeeb223b21",
      "claimed_at": "2026-10-08T06:34:05.433Z",
      "expires_at": "2026-10-08T14:34:05.433Z",
      "host": "codex",
      "last_activity_at": "2026-10-08T06:34:05.433Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "030425d7a82aaff635b9d50dc47665d3dac6df80",
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
        "joined_at": "2026-10-08T06:23:05.243Z",
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
        "event_log_digest": "sha256:f3881a8ec801b199a0b3c4feb3d8074ef15d4e9f4277b2c33be535e314778af5",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-188b4c20546038d7fdbece3342582712",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-188b4c20546038d7fdbece3342582712",
        "root_review_id": "review-188b4c20546038d7fdbece3342582712",
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
      "joined_at": "2026-10-08T06:23:05.243Z",
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
          "fingerprint": "sha256:fb25daffd12f2487876e889f90990e3121d8ee289b7a749307e4099b0df748ae",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-08T06:24:05.382Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:fb25daffd12f2487876e889f90990e3121d8ee289b7a749307e4099b0df748ae"
    }
  },
  "record_id": "review-188b4c20546038d7fdbece3342582712",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-188b4c20546038d7fdbece3342582712",
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
  "startup_commit": "030425d7a82aaff635b9d50dc47665d3dac6df80",
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
        "digest": "sha256:fc69539d953e9bb3aaa8ab42f867c3ae3d3b5501920c9447fc32627ee2022a27",
        "path": "docs/superpowers/peer-reviews/spec/2026-10-08-170-hosted-absence-review-188b4c20546038d7fdbece3342582712/review-188b4c20546038d7fdbece3342582712-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
