<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "48fdb269581a297daf374388ace3506371a7e62d",
      "commit": "ebb8c02ba47e93b5888ae33c01e8e62409f8e9ba",
      "digest": "sha256:b31e352780cfe8853927187b22219c6bc4ee934d9af8473fc2b42e7e0bfc814c",
      "path": "evidence/portable-runtime/process-source/registration-reviews/170-refreshed-wave1.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "0cefc5749a30d9552eb85ddf937322412eb31061",
      "commit": "6a5c4299bca5c9f9e7555221cb03fbed0089412d",
      "digest": "sha256:a3c5a97ff7588bfc7bb3acfbdb13e5747fd3bda1ab9e6293e701fc25bd257aae",
      "path": "evidence/portable-runtime/process-source/registration-reviews/170-refreshed-wave1.md",
      "snapshot": null,
      "turn": 1
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/registration-reviews/170-refreshed-wave1.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-f72b9493-f865-4297-b678-242a2e0c4709",
      "claimed_at": "2026-10-08T07:17:54.216Z",
      "expires_at": "2026-10-08T15:17:54.216Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-08T07:17:54.216Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:b910acba92aa9952fc4e8319abe4d37369ab7a3f3a6c5f72c24bb1ebd0574a18"
    },
    {
      "claim_id": "claim-2ac4aa35-1ca0-4205-b224-bf50ee1690ce",
      "claimed_at": "2026-10-08T07:23:13.096Z",
      "expires_at": "2026-10-08T15:23:13.096Z",
      "host": "codex",
      "last_activity_at": "2026-10-08T07:23:13.096Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "6a5c4299bca5c9f9e7555221cb03fbed0089412d",
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
        "joined_at": "2026-10-08T07:17:16.693Z",
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
        "event_log_digest": "sha256:e9048407fe14c98753cdb1510a0cdee20005ef3dca12b81c9af639db5cf2ab72",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-8cae4328f7a9e2b5fc34aae68b1d225f",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-8cae4328f7a9e2b5fc34aae68b1d225f",
        "root_review_id": "review-8cae4328f7a9e2b5fc34aae68b1d225f",
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
      "joined_at": "2026-10-08T07:17:16.693Z",
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
          "fingerprint": "sha256:b910acba92aa9952fc4e8319abe4d37369ab7a3f3a6c5f72c24bb1ebd0574a18",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-08T07:17:54.154Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:b910acba92aa9952fc4e8319abe4d37369ab7a3f3a6c5f72c24bb1ebd0574a18"
    }
  },
  "record_id": "review-8cae4328f7a9e2b5fc34aae68b1d225f",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-8cae4328f7a9e2b5fc34aae68b1d225f",
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
  "startup_commit": "ebb8c02ba47e93b5888ae33c01e8e62409f8e9ba",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "0cefc5749a30d9552eb85ddf937322412eb31061",
        "digest": "sha256:a3c5a97ff7588bfc7bb3acfbdb13e5747fd3bda1ab9e6293e701fc25bd257aae",
        "path": "evidence/portable-runtime/process-source/registration-reviews/170-refreshed-wave1.md"
      },
      "author_response": {
        "digest": "sha256:bb3ff27578e629beacbbfaac62aaf82219fe1f17899e1d77ffea44e172aa9800",
        "path": "docs/superpowers/peer-reviews/spec/2026-10-08-170-refreshed-wave1-review-8cae4328f7a9e2b5fc34aae68b1d225f/review-8cae4328f7a9e2b5fc34aae68b1d225f-author-response-1.md"
      },
      "commit": "6a5c4299bca5c9f9e7555221cb03fbed0089412d",
      "decision": "revisions-requested",
      "finding_ids": [
        "R1-F001",
        "R1-F002",
        "R1-F003",
        "R1-F004",
        "R1-F005",
        "R1-F006"
      ],
      "reviewer_response": {
        "digest": "sha256:a48471ac1fd143a4e1454eb17ef94c8b8f01025e1d72b543d0640c425eab29f0",
        "path": "docs/superpowers/peer-reviews/spec/2026-10-08-170-refreshed-wave1-review-8cae4328f7a9e2b5fc34aae68b1d225f/review-8cae4328f7a9e2b5fc34aae68b1d225f-reviewer-response-1.md"
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
        "digest": "sha256:2de89127d22f4c1c187429b073dd40154e95aba959afcaafc3e1746202e2d161",
        "path": "docs/superpowers/peer-reviews/spec/2026-10-08-170-refreshed-wave1-review-8cae4328f7a9e2b5fc34aae68b1d225f/review-8cae4328f7a9e2b5fc34aae68b1d225f-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    }
  ]
}
```
