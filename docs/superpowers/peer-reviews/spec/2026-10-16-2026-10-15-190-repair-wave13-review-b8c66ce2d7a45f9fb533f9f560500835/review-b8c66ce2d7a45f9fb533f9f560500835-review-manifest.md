<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "3949a50a6468238d28a231f1c26b55a1ae7db5ff",
      "commit": "451015b03d8bd6c748f95832762e31827b7c1a3b",
      "digest": "sha256:b06778f9d23f13dfa080a5c76e5ef9c6b48efb81c9d98c69592da77984c40ab7",
      "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-15-190-repair-wave13.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-15-190-repair-wave13.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-82e20279-4391-42f7-aa58-3e365b63cac3",
      "claimed_at": "2026-10-16T01:25:23.304Z",
      "expires_at": "2026-10-16T09:25:23.304Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-16T01:25:23.304Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:c3364bbd60b691a802884d89ad390da13a5624a0da75cd038b60ab3e6b85a4bc"
    },
    {
      "claim_id": "claim-52978591-a8ad-483d-9c40-84da080ef271",
      "claimed_at": "2026-10-16T01:27:56.336Z",
      "expires_at": "2026-10-16T09:27:56.336Z",
      "host": "codex",
      "last_activity_at": "2026-10-16T01:27:56.336Z",
      "role": "author",
      "session_fingerprint": "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "451015b03d8bd6c748f95832762e31827b7c1a3b",
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
            "fingerprint": "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096",
            "source": "environment-declaration"
          }
        },
        "host": "codex",
        "identity_source": "runtime",
        "joined_at": "2026-10-16T01:23:03.157Z",
        "model_display": "gpt-6.1-sol",
        "model_id": "gpt-6.1-sol",
        "provider": "openai",
        "role": "author",
        "session_fingerprint": "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096"
      },
      "role": "author",
      "sequence": 3
    }
  ],
  "lineage_receipt": {
    "attempts": [
      {
        "consumed_grant_digest": null,
        "event_log_digest": "sha256:5b3778412b13fff3fbc9c98d15b56763fb6d0bf8049f4055edae51d2a1a2f472",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-b8c66ce2d7a45f9fb533f9f560500835",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-b8c66ce2d7a45f9fb533f9f560500835",
        "root_review_id": "review-b8c66ce2d7a45f9fb533f9f560500835",
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
          "fingerprint": "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096",
          "source": "environment-declaration"
        }
      },
      "host": "codex",
      "identity_source": "runtime",
      "joined_at": "2026-10-16T01:23:03.157Z",
      "model_display": "gpt-6.1-sol",
      "model_id": "gpt-6.1-sol",
      "provider": "openai",
      "role": "author",
      "session_fingerprint": "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096"
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
          "fingerprint": "sha256:c3364bbd60b691a802884d89ad390da13a5624a0da75cd038b60ab3e6b85a4bc",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-16T01:25:23.265Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:c3364bbd60b691a802884d89ad390da13a5624a0da75cd038b60ab3e6b85a4bc"
    }
  },
  "record_id": "review-b8c66ce2d7a45f9fb533f9f560500835",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-b8c66ce2d7a45f9fb533f9f560500835",
  "runtime": {
    "adapter_version": "1.0.0",
    "classification": "XPR",
    "ownership": "broker",
    "project_root_digest": "daa2d9b192cbfa47259ddb731215d23519fd9f7f3f059f6371f65f8220608698",
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
  "startup_commit": "451015b03d8bd6c748f95832762e31827b7c1a3b",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": null,
      "author_response": null,
      "commit": null,
      "decision": "accepted",
      "finding_ids": [],
      "reviewer_response": {
        "digest": "sha256:09e7aa980df7e73989e5bac452e2becd2a8234b309f59e8480537a9ad750f38b",
        "path": "docs/superpowers/peer-reviews/spec/2026-10-16-2026-10-15-190-repair-wave13-review-b8c66ce2d7a45f9fb533f9f560500835/review-b8c66ce2d7a45f9fb533f9f560500835-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
