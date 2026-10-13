<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "4b8bc9d8f2d66211a26977b45571451cdc76e164",
      "commit": "15907de4a303353ade044da9da8e4f6bf8f26f14",
      "digest": "sha256:3e296d261a8ca09c2af66a00a5febb09dc06ce1188402146aca6cc365ce7680a",
      "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave1.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "321204fbeef956bc544f07486800f16fcc085623",
      "commit": "e0d6f5509189fa57fcfba9c354c31daac7863693",
      "digest": "sha256:aa6d695278605fabe23df67d193916c5fa7045320f8d0a0f031a0b49a5bbcbf3",
      "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave1.md",
      "snapshot": null,
      "turn": 1
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave1.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-ea99bc7a-8d80-48a9-84c1-c69ac20f345f",
      "claimed_at": "2026-10-12T06:24:13.478Z",
      "expires_at": "2026-10-12T14:24:13.478Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-12T06:24:13.478Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:d8b9dc46f94be5bb1f510b528292153cce045bcf34be0c3d3499d43f59a89600"
    },
    {
      "claim_id": "claim-b28ad39f-fe0e-493a-89cd-a14148d3739b",
      "claimed_at": "2026-10-12T06:27:31.857Z",
      "expires_at": "2026-10-12T14:27:31.857Z",
      "host": "codex",
      "last_activity_at": "2026-10-12T06:27:31.857Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "e0d6f5509189fa57fcfba9c354c31daac7863693",
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
        "joined_at": "2026-10-12T06:20:21.381Z",
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
        "event_log_digest": "sha256:06c7a924af303e33f38e3d0702e0a9ac89df95baa122d1590a31906ce358b0a7",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-0bc28f44b37335380c9209d34cdd9069",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-0bc28f44b37335380c9209d34cdd9069",
        "root_review_id": "review-0bc28f44b37335380c9209d34cdd9069",
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
      "joined_at": "2026-10-12T06:20:21.381Z",
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
          "fingerprint": "sha256:d8b9dc46f94be5bb1f510b528292153cce045bcf34be0c3d3499d43f59a89600",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-12T06:24:13.446Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:d8b9dc46f94be5bb1f510b528292153cce045bcf34be0c3d3499d43f59a89600"
    }
  },
  "record_id": "review-0bc28f44b37335380c9209d34cdd9069",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-0bc28f44b37335380c9209d34cdd9069",
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
  "startup_commit": "15907de4a303353ade044da9da8e4f6bf8f26f14",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "321204fbeef956bc544f07486800f16fcc085623",
        "digest": "sha256:aa6d695278605fabe23df67d193916c5fa7045320f8d0a0f031a0b49a5bbcbf3",
        "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave1.md"
      },
      "author_response": {
        "digest": "sha256:569b83af4b08b8c94e7dc108da2d992b94ad2a815ad53fb7bc0492307edb21f7",
        "path": "docs/superpowers/peer-reviews/190-scope-recapture-registration-wave1/spec/2026-10-12-2026-10-12-190-scope-recapture-wave1-review-0bc28f44b37335380c9209d34cdd9069/review-0bc28f44b37335380c9209d34cdd9069-author-response-1.md"
      },
      "commit": "e0d6f5509189fa57fcfba9c354c31daac7863693",
      "decision": "revisions-requested",
      "finding_ids": [
        "R1-F001",
        "R1-F002",
        "R1-F003",
        "R1-F004"
      ],
      "reviewer_response": {
        "digest": "sha256:9565c43dba05e4d63fa263c26eb4f3a0d04600114e2ed4178111f6d3e1b6c7c9",
        "path": "docs/superpowers/peer-reviews/190-scope-recapture-registration-wave1/spec/2026-10-12-2026-10-12-190-scope-recapture-wave1-review-0bc28f44b37335380c9209d34cdd9069/review-0bc28f44b37335380c9209d34cdd9069-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    },
    {
      "artifact": null,
      "author_response": null,
      "commit": null,
      "decision": "accepted",
      "finding_ids": [
        "R2-F001"
      ],
      "reviewer_response": {
        "digest": "sha256:e8e9ad7f47065cf9ba372b3110c019b28cc624110331d2263605105b14bbfc74",
        "path": "docs/superpowers/peer-reviews/190-scope-recapture-registration-wave1/spec/2026-10-12-2026-10-12-190-scope-recapture-wave1-review-0bc28f44b37335380c9209d34cdd9069/review-0bc28f44b37335380c9209d34cdd9069-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    }
  ]
}
```
