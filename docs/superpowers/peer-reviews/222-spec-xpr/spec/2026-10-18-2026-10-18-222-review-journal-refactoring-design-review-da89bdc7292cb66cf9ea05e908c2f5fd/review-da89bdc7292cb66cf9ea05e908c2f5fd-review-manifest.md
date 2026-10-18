<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

> **LOCAL JOURNAL MODE** — authority assurance: `unavailable`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "cfd6831c94c49ac787f1dfea20ef91d1b6c70da7",
      "commit": "fa8bf27dd7b917cbb16c988eed8666ed68a367c5",
      "digest": "sha256:0dc6616aa4f055b823c8f61fee8a05ee4d5888fc67344ac43ffc50fa889f7805",
      "path": "docs/superpowers/specs/2026-10-18-222-review-journal-refactoring-design.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "7a0c0698cac4b01d020cadcb55e7fde702218a58",
      "commit": null,
      "digest": "sha256:c6bc93ef5d0b6ce0084d75d149469204a6f90a4060c429e436b78d06869133db",
      "path": "docs/superpowers/specs/2026-10-18-222-review-journal-refactoring-design.md",
      "snapshot": {
        "digest": "sha256:c6bc93ef5d0b6ce0084d75d149469204a6f90a4060c429e436b78d06869133db",
        "path": "artifacts/turn-1.md"
      },
      "turn": 1
    }
  ],
  "artifact_path": "docs/superpowers/specs/2026-10-18-222-review-journal-refactoring-design.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-be5f1023-97f5-4d8b-bf6a-793412a0d6f8",
      "claimed_at": "2026-10-18T13:40:35.237Z",
      "expires_at": "2026-10-18T21:40:35.237Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-18T13:40:35.237Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:c3c1aa603f6b0f5f6db59dbf72b467887b07c3bd79642f971d06a71028c7b84a"
    },
    {
      "claim_id": "claim-12b7efb2-906c-48a3-b2d0-e6079f932972",
      "claimed_at": "2026-10-18T13:43:07.939Z",
      "expires_at": "2026-10-18T21:43:07.939Z",
      "host": "codex",
      "last_activity_at": "2026-10-18T13:43:07.939Z",
      "role": "author",
      "session_fingerprint": "sha256:85d1c6a9c1ebe90260c63b31953367bdbaf52c3963d1fc0e07248164513d8200"
    }
  ],
  "commit_mode": "no-commit",
  "final_commit": null,
  "human_decision": null,
  "identity_changes": [
    {
      "identity": {
        "evidence": {
          "model": {
            "assurance": "declared",
            "conflict": false,
            "declared_id": "gpt-6-astra",
            "observed_id": null,
            "requested_id": null,
            "source": "environment-declaration"
          },
          "session": {
            "assurance": "declared",
            "fingerprint": "sha256:85d1c6a9c1ebe90260c63b31953367bdbaf52c3963d1fc0e07248164513d8200",
            "source": "environment-declaration"
          }
        },
        "host": "codex",
        "identity_source": "runtime",
        "joined_at": "2026-10-18T13:39:43.529Z",
        "model_display": "gpt-6-astra",
        "model_id": "gpt-6-astra",
        "provider": "openai",
        "role": "author",
        "session_fingerprint": "sha256:85d1c6a9c1ebe90260c63b31953367bdbaf52c3963d1fc0e07248164513d8200"
      },
      "role": "author",
      "sequence": 3
    }
  ],
  "lineage_receipt": {
    "attempts": [
      {
        "consumed_grant_digest": null,
        "event_log_digest": "sha256:8e823a4c7eb0b4e964e16c8a57e398cda0f72bee62a2ea01a6f07d5da3998afa",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-da89bdc7292cb66cf9ea05e908c2f5fd",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-da89bdc7292cb66cf9ea05e908c2f5fd",
        "root_review_id": "review-da89bdc7292cb66cf9ea05e908c2f5fd",
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
          "declared_id": "gpt-6-astra",
          "observed_id": null,
          "requested_id": null,
          "source": "environment-declaration"
        },
        "session": {
          "assurance": "declared",
          "fingerprint": "sha256:85d1c6a9c1ebe90260c63b31953367bdbaf52c3963d1fc0e07248164513d8200",
          "source": "environment-declaration"
        }
      },
      "host": "codex",
      "identity_source": "runtime",
      "joined_at": "2026-10-18T13:39:43.529Z",
      "model_display": "gpt-6-astra",
      "model_id": "gpt-6-astra",
      "provider": "openai",
      "role": "author",
      "session_fingerprint": "sha256:85d1c6a9c1ebe90260c63b31953367bdbaf52c3963d1fc0e07248164513d8200"
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
          "fingerprint": "sha256:c3c1aa603f6b0f5f6db59dbf72b467887b07c3bd79642f971d06a71028c7b84a",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-18T13:40:35.205Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:c3c1aa603f6b0f5f6db59dbf72b467887b07c3bd79642f971d06a71028c7b84a"
    }
  },
  "record_id": "review-da89bdc7292cb66cf9ea05e908c2f5fd",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-da89bdc7292cb66cf9ea05e908c2f5fd",
  "runtime": {
    "adapter_version": "1.0.0",
    "classification": "XPR",
    "ownership": "broker",
    "project_root_digest": "27454cb2265e8f459e70ff0e93fda9a0bf75aecf32dcfeed3dd80422593badd8",
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
  "startup_commit": "fa8bf27dd7b917cbb16c988eed8666ed68a367c5",
  "status": "accepted-uncommitted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "7a0c0698cac4b01d020cadcb55e7fde702218a58",
        "digest": "sha256:c6bc93ef5d0b6ce0084d75d149469204a6f90a4060c429e436b78d06869133db",
        "path": "docs/superpowers/specs/2026-10-18-222-review-journal-refactoring-design.md"
      },
      "author_response": {
        "digest": "sha256:283e2dc3b0c5f319824e23cfcd797b99cf1113d49300a6726e0630e8920b7f62",
        "path": "docs/superpowers/peer-reviews/222-spec-xpr/spec/2026-10-18-2026-10-18-222-review-journal-refactoring-design-review-da89bdc7292cb66cf9ea05e908c2f5fd/review-da89bdc7292cb66cf9ea05e908c2f5fd-author-response-1.md"
      },
      "commit": null,
      "decision": "revisions-requested",
      "finding_ids": [],
      "reviewer_response": {
        "digest": "sha256:fcac756568c3641c435bcdd81b68bf27295aae9d8436f017acd4c9fba1b9b6f5",
        "path": "docs/superpowers/peer-reviews/222-spec-xpr/spec/2026-10-18-2026-10-18-222-review-journal-refactoring-design-review-da89bdc7292cb66cf9ea05e908c2f5fd/review-da89bdc7292cb66cf9ea05e908c2f5fd-reviewer-response-1.md"
      },
      "snapshot": {
        "digest": "sha256:c6bc93ef5d0b6ce0084d75d149469204a6f90a4060c429e436b78d06869133db",
        "path": "artifacts/turn-1.md"
      },
      "turn": 1
    },
    {
      "artifact": null,
      "author_response": null,
      "commit": null,
      "decision": "accepted",
      "finding_ids": [],
      "reviewer_response": {
        "digest": "sha256:ee9ce3b538187fda6669acbc9212467575dd451db10a201cbd74e7b6dc9d6a82",
        "path": "docs/superpowers/peer-reviews/222-spec-xpr/spec/2026-10-18-2026-10-18-222-review-journal-refactoring-design-review-da89bdc7292cb66cf9ea05e908c2f5fd/review-da89bdc7292cb66cf9ea05e908c2f5fd-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    }
  ]
}
```
