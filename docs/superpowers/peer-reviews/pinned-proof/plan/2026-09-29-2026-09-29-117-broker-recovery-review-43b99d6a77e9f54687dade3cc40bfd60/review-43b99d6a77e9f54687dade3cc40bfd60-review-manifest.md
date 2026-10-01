<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "fbc081b3e91281eefa3a2075be1049ca628462a8",
      "commit": "1a9fa51f74c759b9345ef400906db9ef741a5ed3",
      "digest": "sha256:a642430a0f2fa7ac51d734bd00c2e1e221aeeb9f4d37b8854100dd547c24db11",
      "path": "docs/superpowers/plans/2026-09-29-117-broker-recovery.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "af140324d6e3beb73fbfe78ad8dcea1e976b6c1f",
      "commit": "fb69dc911e0ac9bf5ea7dcc8140277581a1ff5db",
      "digest": "sha256:3a8281ec90154a6723b15beb3febdd9bebc0aa93028fa88064365c3af69ca3bf",
      "path": "docs/superpowers/plans/2026-09-29-117-broker-recovery.md",
      "snapshot": null,
      "turn": 1
    }
  ],
  "artifact_path": "docs/superpowers/plans/2026-09-29-117-broker-recovery.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-014bf031-6350-40a9-8e76-26739bcf6618",
      "claimed_at": "2026-09-29T08:08:59.868Z",
      "expires_at": "2026-09-29T16:08:59.868Z",
      "host": "claude-code",
      "last_activity_at": "2026-09-29T08:08:59.868Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:dc9c2018cf6fe91df2b70e4b78e3a4dea131ca588375796be5c9752a715453d9"
    },
    {
      "claim_id": "claim-3c3dcd69-2dea-4f25-9029-7aa0ef50079c",
      "claimed_at": "2026-09-29T08:11:12.626Z",
      "expires_at": "2026-09-29T16:11:12.626Z",
      "host": "codex",
      "last_activity_at": "2026-09-29T08:11:12.626Z",
      "role": "author",
      "session_fingerprint": "sha256:5c30856b9b2027f149ff8df91c0ea36bc764abd58e76541ba4f224c95e438d62"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "fb69dc911e0ac9bf5ea7dcc8140277581a1ff5db",
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
            "fingerprint": "sha256:5c30856b9b2027f149ff8df91c0ea36bc764abd58e76541ba4f224c95e438d62",
            "source": "environment-declaration"
          }
        },
        "host": "codex",
        "identity_source": "runtime",
        "joined_at": "2026-09-29T08:07:33.155Z",
        "model_display": "GPT-6 Astra",
        "model_id": "gpt-6-astra",
        "provider": "openai",
        "role": "author",
        "session_fingerprint": "sha256:5c30856b9b2027f149ff8df91c0ea36bc764abd58e76541ba4f224c95e438d62"
      },
      "role": "author",
      "sequence": 3
    }
  ],
  "lineage_receipt": {
    "attempts": [
      {
        "consumed_grant_digest": null,
        "event_log_digest": "sha256:6e79527b9007a29b5649cb4f7f035ad8ef64769a58610613486403be99b7c459",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-43b99d6a77e9f54687dade3cc40bfd60",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-43b99d6a77e9f54687dade3cc40bfd60",
        "root_review_id": "review-43b99d6a77e9f54687dade3cc40bfd60",
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
          "fingerprint": "sha256:5c30856b9b2027f149ff8df91c0ea36bc764abd58e76541ba4f224c95e438d62",
          "source": "environment-declaration"
        }
      },
      "host": "codex",
      "identity_source": "runtime",
      "joined_at": "2026-09-29T08:07:33.155Z",
      "model_display": "GPT-6 Astra",
      "model_id": "gpt-6-astra",
      "provider": "openai",
      "role": "author",
      "session_fingerprint": "sha256:5c30856b9b2027f149ff8df91c0ea36bc764abd58e76541ba4f224c95e438d62"
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
          "fingerprint": "sha256:dc9c2018cf6fe91df2b70e4b78e3a4dea131ca588375796be5c9752a715453d9",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-09-29T08:08:59.830Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:dc9c2018cf6fe91df2b70e4b78e3a4dea131ca588375796be5c9752a715453d9"
    }
  },
  "record_id": "review-43b99d6a77e9f54687dade3cc40bfd60",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-43b99d6a77e9f54687dade3cc40bfd60",
  "runtime": {
    "adapter_version": "1.0.0",
    "classification": "XPR",
    "ownership": "broker",
    "project_root_digest": "797f8e2263f0741c249ec8d94b10e99f3fdbc57b4a20465c87cece16f36f9090",
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
  "startup_commit": "1a9fa51f74c759b9345ef400906db9ef741a5ed3",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "af140324d6e3beb73fbfe78ad8dcea1e976b6c1f",
        "digest": "sha256:3a8281ec90154a6723b15beb3febdd9bebc0aa93028fa88064365c3af69ca3bf",
        "path": "docs/superpowers/plans/2026-09-29-117-broker-recovery.md"
      },
      "author_response": {
        "digest": "sha256:b0fa67c05a3bb999b795c90d54731fa0991ef463201bc1dd2d319d03672d1f13",
        "path": "docs/superpowers/peer-reviews/pinned-proof/plan/2026-09-29-2026-09-29-117-broker-recovery-review-43b99d6a77e9f54687dade3cc40bfd60/review-43b99d6a77e9f54687dade3cc40bfd60-author-response-1.md"
      },
      "commit": "fb69dc911e0ac9bf5ea7dcc8140277581a1ff5db",
      "decision": "revisions-requested",
      "finding_ids": [
        "R1-F001",
        "R1-F002",
        "R1-F003",
        "R1-F004",
        "R1-F005",
        "R1-F006",
        "R1-F007",
        "R1-F008",
        "R1-F009"
      ],
      "reviewer_response": {
        "digest": "sha256:ae98a24af4abfa8288b4e6be0ca6979af6afba4db215b45ade1c23f9e9a48e1e",
        "path": "docs/superpowers/peer-reviews/pinned-proof/plan/2026-09-29-2026-09-29-117-broker-recovery-review-43b99d6a77e9f54687dade3cc40bfd60/review-43b99d6a77e9f54687dade3cc40bfd60-reviewer-response-1.md"
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
        "R2-F002",
        "R2-F003"
      ],
      "reviewer_response": {
        "digest": "sha256:6ae748ffd0b0bd68c38f7391bc87424641e177f31abd087a839223cf60716dd1",
        "path": "docs/superpowers/peer-reviews/pinned-proof/plan/2026-09-29-2026-09-29-117-broker-recovery-review-43b99d6a77e9f54687dade3cc40bfd60/review-43b99d6a77e9f54687dade3cc40bfd60-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    }
  ]
}
```
