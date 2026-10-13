<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "a708dc334fb457e05d826697c049bb80d00d85c4",
      "commit": "ba59707afeb5da730d8f19879f0a54068119ec67",
      "digest": "sha256:fbc61642c772f372c3881a942596fbe6dbc9a166c69fde937f6482e6a3971c30",
      "path": "docs/superpowers/specs/2026-10-11-190-selection-read-scope-design.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "fe4781a3da8585a72577d05381293400e1fd3f97",
      "commit": "bb659a195bc456cb8b5c985c6954b3867b808687",
      "digest": "sha256:d7aff3831ecd08fa1fa34fe3c19514edc62d5e702dcbd75371c3bd9ef695dc39",
      "path": "docs/superpowers/specs/2026-10-11-190-selection-read-scope-design.md",
      "snapshot": null,
      "turn": 1
    }
  ],
  "artifact_path": "docs/superpowers/specs/2026-10-11-190-selection-read-scope-design.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-abb13532-ab57-492f-b096-161f0a87bf3d",
      "claimed_at": "2026-10-12T01:58:45.260Z",
      "expires_at": "2026-10-12T09:58:45.260Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-12T01:58:45.260Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:4aa1751fafeeca10ee6b721c7a2bc83321a82bec1a1b883fcec0648e211b5805"
    },
    {
      "claim_id": "claim-45a3d745-9e91-4a26-9c8f-0033aa66ce4d",
      "claimed_at": "2026-10-12T02:02:44.998Z",
      "expires_at": "2026-10-12T10:02:44.998Z",
      "host": "codex",
      "last_activity_at": "2026-10-12T02:02:44.998Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "bb659a195bc456cb8b5c985c6954b3867b808687",
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
        "joined_at": "2026-10-12T01:54:54.202Z",
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
        "event_log_digest": "sha256:c280102becf2a45d819ddad1f186ddc7e7dac6462db67aaad3028bc688ee640a",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-5c332d239bdb1535dd319816d3228888",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-5c332d239bdb1535dd319816d3228888",
        "root_review_id": "review-5c332d239bdb1535dd319816d3228888",
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
      "joined_at": "2026-10-12T01:54:54.202Z",
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
          "fingerprint": "sha256:4aa1751fafeeca10ee6b721c7a2bc83321a82bec1a1b883fcec0648e211b5805",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-12T01:58:45.231Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:4aa1751fafeeca10ee6b721c7a2bc83321a82bec1a1b883fcec0648e211b5805"
    }
  },
  "record_id": "review-5c332d239bdb1535dd319816d3228888",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-5c332d239bdb1535dd319816d3228888",
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
  "startup_commit": "ba59707afeb5da730d8f19879f0a54068119ec67",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "fe4781a3da8585a72577d05381293400e1fd3f97",
        "digest": "sha256:d7aff3831ecd08fa1fa34fe3c19514edc62d5e702dcbd75371c3bd9ef695dc39",
        "path": "docs/superpowers/specs/2026-10-11-190-selection-read-scope-design.md"
      },
      "author_response": {
        "digest": "sha256:adde91d5ecd584de7b8070daacdc6e5954545e9f17c51447846bc336a30fdf69",
        "path": "docs/superpowers/peer-reviews/190-selection-read-scope/spec/2026-10-12-2026-10-11-190-selection-read-scope-design-review-5c332d239bdb1535dd319816d3228888/review-5c332d239bdb1535dd319816d3228888-author-response-1.md"
      },
      "commit": "bb659a195bc456cb8b5c985c6954b3867b808687",
      "decision": "revisions-requested",
      "finding_ids": [],
      "reviewer_response": {
        "digest": "sha256:6e138b871874ec2990c81768e6a26fbea34e9bda2bfe908176a2fa78485a2e68",
        "path": "docs/superpowers/peer-reviews/190-selection-read-scope/spec/2026-10-12-2026-10-11-190-selection-read-scope-design-review-5c332d239bdb1535dd319816d3228888/review-5c332d239bdb1535dd319816d3228888-reviewer-response-1.md"
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
        "digest": "sha256:a1f9d9f13f4244ee59b0ad0d7027eb66c218c5481e367587749419c9eef750d6",
        "path": "docs/superpowers/peer-reviews/190-selection-read-scope/spec/2026-10-12-2026-10-11-190-selection-read-scope-design-review-5c332d239bdb1535dd319816d3228888/review-5c332d239bdb1535dd319816d3228888-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    }
  ]
}
```
