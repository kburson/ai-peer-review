<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "229eb255dc7dd0e993f087ae38660a4ddb843531",
      "commit": "601090daf35b53b7b7611546ae9f03bd5b0d4d5b",
      "digest": "sha256:3b0dbeb7a3597fd90704122f4d8247219016bcf0f10b20fc7b04392af770a173",
      "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave3.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "d1520c697a503dcea66474e1c9c1af2fa2439554",
      "commit": "373a98460992c28e61d0368237af2533f0180876",
      "digest": "sha256:e4547a3c83d20e235ca99fcad001d01416b56c46481c4cdf6ad26dc33430386f",
      "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave3.md",
      "snapshot": null,
      "turn": 1
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave3.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-13937da8-94f2-4f81-b4fe-a8ec353dcd47",
      "claimed_at": "2026-10-12T08:41:32.088Z",
      "expires_at": "2026-10-12T16:41:32.088Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-12T08:41:32.088Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:8123ddb4d4b670c5795c6518c0a61763ff50e9e23ec70ceb5c3263f990a2559f"
    },
    {
      "claim_id": "claim-4fc0bbf9-dd26-4c4b-b70f-25001f866eea",
      "claimed_at": "2026-10-12T08:44:08.948Z",
      "expires_at": "2026-10-12T16:44:08.948Z",
      "host": "codex",
      "last_activity_at": "2026-10-12T08:44:08.948Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "373a98460992c28e61d0368237af2533f0180876",
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
        "joined_at": "2026-10-12T08:39:04.490Z",
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
        "event_log_digest": "sha256:93ac03aa5c2bc3d7856cbfc6ef4ba40d2264bd567238fbf1c8a37d07d5cc435a",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-1d46e84069a533817a7d5123ff1e38a7",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-1d46e84069a533817a7d5123ff1e38a7",
        "root_review_id": "review-1d46e84069a533817a7d5123ff1e38a7",
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
      "joined_at": "2026-10-12T08:39:04.490Z",
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
          "fingerprint": "sha256:8123ddb4d4b670c5795c6518c0a61763ff50e9e23ec70ceb5c3263f990a2559f",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-12T08:41:32.049Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:8123ddb4d4b670c5795c6518c0a61763ff50e9e23ec70ceb5c3263f990a2559f"
    }
  },
  "record_id": "review-1d46e84069a533817a7d5123ff1e38a7",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-1d46e84069a533817a7d5123ff1e38a7",
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
  "startup_commit": "601090daf35b53b7b7611546ae9f03bd5b0d4d5b",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "d1520c697a503dcea66474e1c9c1af2fa2439554",
        "digest": "sha256:e4547a3c83d20e235ca99fcad001d01416b56c46481c4cdf6ad26dc33430386f",
        "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave3.md"
      },
      "author_response": {
        "digest": "sha256:678d6decd4b010e45a6faee0a450a08a1c8c8548da7449c25eaea40c555b577f",
        "path": "docs/superpowers/peer-reviews/190-scope-recapture-registration-wave3/spec/2026-10-12-2026-10-12-190-scope-recapture-wave3-review-1d46e84069a533817a7d5123ff1e38a7/review-1d46e84069a533817a7d5123ff1e38a7-author-response-1.md"
      },
      "commit": "373a98460992c28e61d0368237af2533f0180876",
      "decision": "revisions-requested",
      "finding_ids": [
        "R1-F001",
        "R1-F002",
        "R1-F003",
        "R1-F004"
      ],
      "reviewer_response": {
        "digest": "sha256:be31bfaf7b50a9d49e171080e9cd72b2ecccb9a935ddd8d5e1fa2a3232314112",
        "path": "docs/superpowers/peer-reviews/190-scope-recapture-registration-wave3/spec/2026-10-12-2026-10-12-190-scope-recapture-wave3-review-1d46e84069a533817a7d5123ff1e38a7/review-1d46e84069a533817a7d5123ff1e38a7-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    },
    {
      "artifact": null,
      "author_response": null,
      "commit": null,
      "decision": "accepted",
      "finding_ids": [],
      "reviewer_response": {
        "digest": "sha256:a6060c6f3bebab559bba1da553aae2015945817f7de56a20042eb21fc7064faf",
        "path": "docs/superpowers/peer-reviews/190-scope-recapture-registration-wave3/spec/2026-10-12-2026-10-12-190-scope-recapture-wave3-review-1d46e84069a533817a7d5123ff1e38a7/review-1d46e84069a533817a7d5123ff1e38a7-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    }
  ]
}
```
