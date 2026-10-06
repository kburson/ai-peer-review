<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "63b268c6aefb714bb291534d6c79b9ae284d4099",
      "commit": "6b58cbed105ecf97efc4e5e1376a409dbb9e0d3d",
      "digest": "sha256:cfc32c539018e805c59319d47ff7e4de5083048329f8cbdc67a2b49fc752d725",
      "path": "docs/superpowers/plans/2026-10-05-144-contract-owner-adoption-addendum.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "95a44172d2683c9c5b213c6e9b7be4cd7b690149",
      "commit": "bdd842694a0494da963c538de686d1c85d689d4d",
      "digest": "sha256:3f04358b465b4722bc0d5880c2896e19df44445a1ee3839887749f24cbb935d8",
      "path": "docs/superpowers/plans/2026-10-05-144-contract-owner-adoption-addendum.md",
      "snapshot": null,
      "turn": 1
    }
  ],
  "artifact_path": "docs/superpowers/plans/2026-10-05-144-contract-owner-adoption-addendum.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-5a42b7de-cc69-492f-859b-707a4d5a9345",
      "claimed_at": "2026-10-05T12:39:01.177Z",
      "expires_at": "2026-10-05T20:39:01.177Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-05T12:39:01.177Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:e4b622b375b867a957ed0ad0ab080fbd829d8187bb9717070565109d60235c7a"
    },
    {
      "claim_id": "claim-2c8f9eef-5c95-4a8b-8e81-ffbe89b8213a",
      "claimed_at": "2026-10-05T12:46:11.877Z",
      "expires_at": "2026-10-05T20:46:11.877Z",
      "host": "codex",
      "last_activity_at": "2026-10-05T12:46:11.877Z",
      "role": "author",
      "session_fingerprint": "sha256:e82e25e503f9341ba7bbc701cbc3ffb449d00fc799e793a05a7ad151171a82c5"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "bdd842694a0494da963c538de686d1c85d689d4d",
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
            "fingerprint": "sha256:e82e25e503f9341ba7bbc701cbc3ffb449d00fc799e793a05a7ad151171a82c5",
            "source": "official-runtime"
          }
        },
        "host": "codex",
        "identity_source": "runtime",
        "joined_at": "2026-10-05T12:37:16.980Z",
        "model_display": "gpt-6.1-sol",
        "model_id": "gpt-6.1-sol",
        "provider": "openai",
        "role": "author",
        "session_fingerprint": "sha256:e82e25e503f9341ba7bbc701cbc3ffb449d00fc799e793a05a7ad151171a82c5"
      },
      "role": "author",
      "sequence": 3
    }
  ],
  "lineage_receipt": {
    "attempts": [
      {
        "consumed_grant_digest": null,
        "event_log_digest": "sha256:8731e1478626b977d4878a7d371f65ec6bbeb5416d8cea2393295ad2cfc35017",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-057079566301a0106537dde070ea518a",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-057079566301a0106537dde070ea518a",
        "root_review_id": "review-057079566301a0106537dde070ea518a",
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
          "fingerprint": "sha256:e82e25e503f9341ba7bbc701cbc3ffb449d00fc799e793a05a7ad151171a82c5",
          "source": "official-runtime"
        }
      },
      "host": "codex",
      "identity_source": "runtime",
      "joined_at": "2026-10-05T12:37:16.980Z",
      "model_display": "gpt-6.1-sol",
      "model_id": "gpt-6.1-sol",
      "provider": "openai",
      "role": "author",
      "session_fingerprint": "sha256:e82e25e503f9341ba7bbc701cbc3ffb449d00fc799e793a05a7ad151171a82c5"
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
          "fingerprint": "sha256:e4b622b375b867a957ed0ad0ab080fbd829d8187bb9717070565109d60235c7a",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-05T12:39:01.143Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:e4b622b375b867a957ed0ad0ab080fbd829d8187bb9717070565109d60235c7a"
    }
  },
  "record_id": "review-057079566301a0106537dde070ea518a",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-057079566301a0106537dde070ea518a",
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
    "project_root_digest": "d660344c5c5d1c54352f8c7647efc28e3e7a1c2fe9d73d339736e03af45cf22e",
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
  "startup_commit": "6b58cbed105ecf97efc4e5e1376a409dbb9e0d3d",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "95a44172d2683c9c5b213c6e9b7be4cd7b690149",
        "digest": "sha256:3f04358b465b4722bc0d5880c2896e19df44445a1ee3839887749f24cbb935d8",
        "path": "docs/superpowers/plans/2026-10-05-144-contract-owner-adoption-addendum.md"
      },
      "author_response": {
        "digest": "sha256:353b1668b94af0767c7b4361d22824caff8ed29fb7c9fd157bd666b3a385d941",
        "path": "docs/superpowers/peer-reviews/plan/2026-10-05-2026-10-05-144-contract-owner-adoption-addendum-review-057079566301a0106537dde070ea518a/review-057079566301a0106537dde070ea518a-author-response-1.md"
      },
      "commit": "bdd842694a0494da963c538de686d1c85d689d4d",
      "decision": "revisions-requested",
      "finding_ids": [
        "R1-F001",
        "R1-F002",
        "R1-F003",
        "R1-F004",
        "R1-F005",
        "R1-F006",
        "R1-F007"
      ],
      "reviewer_response": {
        "digest": "sha256:52750334907540f620118ea9bf8fc85b038ad007c5aab19b489e24f6a78a01de",
        "path": "docs/superpowers/peer-reviews/plan/2026-10-05-2026-10-05-144-contract-owner-adoption-addendum-review-057079566301a0106537dde070ea518a/review-057079566301a0106537dde070ea518a-reviewer-response-1.md"
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
        "digest": "sha256:b29bdd2209341f29b6f8a8affd13576f55d58a20410b9f4aac541b468710ee94",
        "path": "docs/superpowers/peer-reviews/plan/2026-10-05-2026-10-05-144-contract-owner-adoption-addendum-review-057079566301a0106537dde070ea518a/review-057079566301a0106537dde070ea518a-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    }
  ]
}
```
