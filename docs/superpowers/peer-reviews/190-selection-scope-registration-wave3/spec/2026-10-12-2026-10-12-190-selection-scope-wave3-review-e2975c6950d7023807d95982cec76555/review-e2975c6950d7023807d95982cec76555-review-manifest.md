<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "a072ec5fca612f489ee393464098dddb12156208",
      "commit": "6520483b889b82b76ae362ebdb45e8dcbf07d26a",
      "digest": "sha256:f1d06aa59a67658213bd55d88075e3b50a3196407863018a19505f83c8b639d9",
      "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-selection-scope-wave3.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "176cb75c5bb21d863fcc74d91d0885527cb6017d",
      "commit": "61f71ab06cedec25d13988094af9f0a7a0970ffb",
      "digest": "sha256:40348eae3cf2f9f8845f1a62074724febf6b05b401d0c87fc37f507b7c0e15ac",
      "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-selection-scope-wave3.md",
      "snapshot": null,
      "turn": 1
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-selection-scope-wave3.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-8e5c0076-1f14-46f2-9786-740c06de5525",
      "claimed_at": "2026-10-12T05:54:49.718Z",
      "expires_at": "2026-10-12T13:54:49.718Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-12T05:54:49.718Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:29e535f868a32c3404d85eb74e79d5fe297285e6b653e483df7c69fe623e76a2"
    },
    {
      "claim_id": "claim-4c8ee6ca-b1d0-44b9-93a0-5f75bedb0092",
      "claimed_at": "2026-10-12T05:56:40.875Z",
      "expires_at": "2026-10-12T13:56:40.875Z",
      "host": "codex",
      "last_activity_at": "2026-10-12T05:56:40.875Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "61f71ab06cedec25d13988094af9f0a7a0970ffb",
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
        "joined_at": "2026-10-12T05:49:19.388Z",
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
        "event_log_digest": "sha256:7cade6fdfc63fac365f010c4b2569c99e937032580655c8e639f2ea36ae646af",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-e2975c6950d7023807d95982cec76555",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-e2975c6950d7023807d95982cec76555",
        "root_review_id": "review-e2975c6950d7023807d95982cec76555",
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
      "joined_at": "2026-10-12T05:49:19.388Z",
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
          "fingerprint": "sha256:29e535f868a32c3404d85eb74e79d5fe297285e6b653e483df7c69fe623e76a2",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-12T05:54:49.687Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:29e535f868a32c3404d85eb74e79d5fe297285e6b653e483df7c69fe623e76a2"
    }
  },
  "record_id": "review-e2975c6950d7023807d95982cec76555",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-e2975c6950d7023807d95982cec76555",
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
  "startup_commit": "6520483b889b82b76ae362ebdb45e8dcbf07d26a",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "176cb75c5bb21d863fcc74d91d0885527cb6017d",
        "digest": "sha256:40348eae3cf2f9f8845f1a62074724febf6b05b401d0c87fc37f507b7c0e15ac",
        "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-selection-scope-wave3.md"
      },
      "author_response": {
        "digest": "sha256:8500c233a90b9528a030b293319237f3a42fb4936b9693a303840229488ad24e",
        "path": "docs/superpowers/peer-reviews/190-selection-scope-registration-wave3/spec/2026-10-12-2026-10-12-190-selection-scope-wave3-review-e2975c6950d7023807d95982cec76555/review-e2975c6950d7023807d95982cec76555-author-response-1.md"
      },
      "commit": "61f71ab06cedec25d13988094af9f0a7a0970ffb",
      "decision": "revisions-requested",
      "finding_ids": [],
      "reviewer_response": {
        "digest": "sha256:ac420ffcea1dd51733c29995483ff9d8bb1ba68f0a90127316a1f4ea407400e2",
        "path": "docs/superpowers/peer-reviews/190-selection-scope-registration-wave3/spec/2026-10-12-2026-10-12-190-selection-scope-wave3-review-e2975c6950d7023807d95982cec76555/review-e2975c6950d7023807d95982cec76555-reviewer-response-1.md"
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
        "digest": "sha256:57672b05addbb5afd5f89347f70ff8f5314bb5d2e9f321593fe3d31f47328857",
        "path": "docs/superpowers/peer-reviews/190-selection-scope-registration-wave3/spec/2026-10-12-2026-10-12-190-selection-scope-wave3-review-e2975c6950d7023807d95982cec76555/review-e2975c6950d7023807d95982cec76555-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    }
  ]
}
```
