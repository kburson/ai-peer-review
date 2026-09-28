<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "ff15cf3889e5c0e41468aaaea760b92123f0ef8e",
      "commit": "417c30951e67e37afd6c4d76ef635deac788e7f4",
      "digest": "sha256:048276df160ae486ed7ecf4462e350f41d04ab59f3f2b222409c1edd93a79fdf",
      "path": "docs/superpowers/specs/20260927-111-spec.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "c929bb3d4f18de4e43c2bb93197de2157f438cbc",
      "commit": "e27eebed4dd2fbcfda41f321bd55390c594add06",
      "digest": "sha256:ffd94625ab35fd73bd44e61f1264c5970c09f7e3dde10f18edf98811511ec018",
      "path": "docs/superpowers/specs/20260927-111-spec.md",
      "snapshot": null,
      "turn": 1
    }
  ],
  "artifact_path": "docs/superpowers/specs/20260927-111-spec.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-fafa3233-15cb-4ed4-9614-0e5f3b0d0428",
      "claimed_at": "2026-09-28T04:24:23.205Z",
      "expires_at": "2026-09-28T12:24:23.205Z",
      "host": "claude-code",
      "last_activity_at": "2026-09-28T04:24:23.205Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:4470c577451013bd160c8d21404026ebbf5ac26e5d84d2839c15ba814d83cb4b"
    },
    {
      "claim_id": "claim-61e50fed-756f-402c-9bb0-10ae9731c661",
      "claimed_at": "2026-09-28T04:28:25.522Z",
      "expires_at": "2026-09-28T12:28:25.522Z",
      "host": "codex",
      "last_activity_at": "2026-09-28T04:28:25.522Z",
      "role": "author",
      "session_fingerprint": "sha256:02f18e851df868c88e6dbf81b64eb2db551c072126db9560b0afa5fe33b40ed6"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "e27eebed4dd2fbcfda41f321bd55390c594add06",
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
            "fingerprint": "sha256:02f18e851df868c88e6dbf81b64eb2db551c072126db9560b0afa5fe33b40ed6",
            "source": "environment-declaration"
          }
        },
        "host": "codex",
        "identity_source": "runtime",
        "joined_at": "2026-09-28T04:23:16.097Z",
        "model_display": "GPT-6 Astra",
        "model_id": "gpt-6-astra",
        "provider": "openai",
        "role": "author",
        "session_fingerprint": "sha256:02f18e851df868c88e6dbf81b64eb2db551c072126db9560b0afa5fe33b40ed6"
      },
      "role": "author",
      "sequence": 3
    }
  ],
  "lineage_receipt": {
    "attempts": [
      {
        "consumed_grant_digest": null,
        "event_log_digest": "sha256:238713fd686f1e146c7af8c64a98b2acec46d84c2712d2afa22e1ffe72c02429",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-f81fd40702ce2b18f9a79f7f8ab5cbed",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-f81fd40702ce2b18f9a79f7f8ab5cbed",
        "root_review_id": "review-f81fd40702ce2b18f9a79f7f8ab5cbed",
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
          "fingerprint": "sha256:02f18e851df868c88e6dbf81b64eb2db551c072126db9560b0afa5fe33b40ed6",
          "source": "environment-declaration"
        }
      },
      "host": "codex",
      "identity_source": "runtime",
      "joined_at": "2026-09-28T04:23:16.097Z",
      "model_display": "GPT-6 Astra",
      "model_id": "gpt-6-astra",
      "provider": "openai",
      "role": "author",
      "session_fingerprint": "sha256:02f18e851df868c88e6dbf81b64eb2db551c072126db9560b0afa5fe33b40ed6"
    },
    "reviewer": {
      "evidence": {
        "model": {
          "assurance": "declared",
          "conflict": false,
          "declared_id": "claude-opus-5",
          "observed_id": null,
          "requested_id": null,
          "source": "environment-declaration"
        },
        "session": {
          "assurance": "declared",
          "fingerprint": "sha256:4470c577451013bd160c8d21404026ebbf5ac26e5d84d2839c15ba814d83cb4b",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-09-28T04:24:23.179Z",
      "model_display": "claude-opus-5",
      "model_id": "claude-opus-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:4470c577451013bd160c8d21404026ebbf5ac26e5d84d2839c15ba814d83cb4b"
    }
  },
  "record_id": "review-f81fd40702ce2b18f9a79f7f8ab5cbed",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-f81fd40702ce2b18f9a79f7f8ab5cbed",
  "runtime": {
    "adapter_version": "1.0.0",
    "classification": "XPR",
    "ownership": "broker",
    "project_root_digest": "42680a607bfee2c10b23273033297d5166e3b857d3067949d86a4f8ceabf8f0c",
    "reviewer": {
      "effort": "medium",
      "host": "claude-code",
      "model_display": "Claude Opus 5",
      "model_id": "claude-opus-5",
      "provider": "anthropic",
      "selector": "claude"
    },
    "schema": "ai-peer-review.runtime/v1",
    "transport_mode": "manual"
  },
  "schema": "ai-peer-review.manifest/v1",
  "startup_commit": "417c30951e67e37afd6c4d76ef635deac788e7f4",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "c929bb3d4f18de4e43c2bb93197de2157f438cbc",
        "digest": "sha256:ffd94625ab35fd73bd44e61f1264c5970c09f7e3dde10f18edf98811511ec018",
        "path": "docs/superpowers/specs/20260927-111-spec.md"
      },
      "author_response": {
        "digest": "sha256:b68cbb8d01cac9da96e1cc40fe1cafc9430e01981557810262bad0a12277d091",
        "path": "docs/superpowers/peer-reviews/111/spec/review-f81fd40702ce2b18f9a79f7f8ab5cbed/review-f81fd40702ce2b18f9a79f7f8ab5cbed-author-response-1.md"
      },
      "commit": "e27eebed4dd2fbcfda41f321bd55390c594add06",
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
        "digest": "sha256:8ac1c9e88ee45a24eb5f52194456790a518aae63ffa6700adacc3397532ef613",
        "path": "docs/superpowers/peer-reviews/111/spec/review-f81fd40702ce2b18f9a79f7f8ab5cbed/review-f81fd40702ce2b18f9a79f7f8ab5cbed-reviewer-response-1.md"
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
        "R2-F001",
        "R2-F002"
      ],
      "reviewer_response": {
        "digest": "sha256:086b44ba3ee8fca37968d3195a221adbd4cdbccbf0b6f840add99c5160426ca2",
        "path": "docs/superpowers/peer-reviews/111/spec/review-f81fd40702ce2b18f9a79f7f8ab5cbed/review-f81fd40702ce2b18f9a79f7f8ab5cbed-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    }
  ]
}
```
