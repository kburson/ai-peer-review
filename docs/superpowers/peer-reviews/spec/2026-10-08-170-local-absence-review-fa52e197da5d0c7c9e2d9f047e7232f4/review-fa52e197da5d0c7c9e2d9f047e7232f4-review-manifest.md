<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "059a6ca159aaa039e9453f92f4ae8f86184a18ee",
      "commit": "1f8b1b50900ca9d04d0ca31cea690406fddb7761",
      "digest": "sha256:c98e266e0cbd77489b7f969cd93af3283f355e7853f529d655e4b0b612606717",
      "path": "evidence/portable-runtime/process-source/registration-reviews/170-local-absence.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "b15da5905a801d1c7f8748c5b7ed1a4bb30eaab6",
      "commit": "bdfba992550e3b49895c5faac64ab81522bb2b4a",
      "digest": "sha256:3ef0af7588296cacd3a6c704603fc36efddd8901d6be810a90cef91e192bca99",
      "path": "evidence/portable-runtime/process-source/registration-reviews/170-local-absence.md",
      "snapshot": null,
      "turn": 1
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/registration-reviews/170-local-absence.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-f42be8f6-b0dd-4377-9c2c-3133a89b0c67",
      "claimed_at": "2026-10-08T05:16:52.796Z",
      "expires_at": "2026-10-08T13:16:52.796Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-08T05:16:52.796Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:87e42d5fe013dbc6536fe4e2f306921d6f040334a156941f7e322f4d8c2d79c6"
    },
    {
      "claim_id": "claim-29d5b49f-be8e-4f40-ad2c-3890b822590a",
      "claimed_at": "2026-10-08T05:19:12.131Z",
      "expires_at": "2026-10-08T13:19:12.131Z",
      "host": "codex",
      "last_activity_at": "2026-10-08T05:19:12.131Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "bdfba992550e3b49895c5faac64ab81522bb2b4a",
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
        "joined_at": "2026-10-08T05:16:06.113Z",
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
        "event_log_digest": "sha256:6149cc9739f29d9c0ddbf79e5e2fc463d5e03d435ceb08d1ef1ba53ff7c35485",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-fa52e197da5d0c7c9e2d9f047e7232f4",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-fa52e197da5d0c7c9e2d9f047e7232f4",
        "root_review_id": "review-fa52e197da5d0c7c9e2d9f047e7232f4",
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
      "joined_at": "2026-10-08T05:16:06.113Z",
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
          "fingerprint": "sha256:87e42d5fe013dbc6536fe4e2f306921d6f040334a156941f7e322f4d8c2d79c6",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-08T05:16:52.769Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:87e42d5fe013dbc6536fe4e2f306921d6f040334a156941f7e322f4d8c2d79c6"
    }
  },
  "record_id": "review-fa52e197da5d0c7c9e2d9f047e7232f4",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-fa52e197da5d0c7c9e2d9f047e7232f4",
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
  "startup_commit": "1f8b1b50900ca9d04d0ca31cea690406fddb7761",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "b15da5905a801d1c7f8748c5b7ed1a4bb30eaab6",
        "digest": "sha256:3ef0af7588296cacd3a6c704603fc36efddd8901d6be810a90cef91e192bca99",
        "path": "evidence/portable-runtime/process-source/registration-reviews/170-local-absence.md"
      },
      "author_response": {
        "digest": "sha256:b3b92a9a1a643fb743e7bf5816ebb49c72d82252d2bd37357553646e405940d9",
        "path": "docs/superpowers/peer-reviews/spec/2026-10-08-170-local-absence-review-fa52e197da5d0c7c9e2d9f047e7232f4/review-fa52e197da5d0c7c9e2d9f047e7232f4-author-response-1.md"
      },
      "commit": "bdfba992550e3b49895c5faac64ab81522bb2b4a",
      "decision": "revisions-requested",
      "finding_ids": [
        "R1-F001",
        "R1-F002",
        "R1-F003"
      ],
      "reviewer_response": {
        "digest": "sha256:a3fb9f7d87962d7c9cd9e8b690a1c32966c10a908a70e7bdba40bf29ee559422",
        "path": "docs/superpowers/peer-reviews/spec/2026-10-08-170-local-absence-review-fa52e197da5d0c7c9e2d9f047e7232f4/review-fa52e197da5d0c7c9e2d9f047e7232f4-reviewer-response-1.md"
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
        "digest": "sha256:6827714db67cac19b19dc566c22b2e093008efd89126f149317e1c0bc9d63b16",
        "path": "docs/superpowers/peer-reviews/spec/2026-10-08-170-local-absence-review-fa52e197da5d0c7c9e2d9f047e7232f4/review-fa52e197da5d0c7c9e2d9f047e7232f4-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    }
  ]
}
```
