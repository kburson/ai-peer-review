<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "d11777a69d3ea88f9ed4e7c69c16780ce465e584",
      "commit": "877e107592c3f61ae08f39017bc3b60e3d894afb",
      "digest": "sha256:f2092d5ab0ffc3dd18733d2b79b7032bfc3d8a57b6148d05d5683087546762d3",
      "path": "docs/superpowers/specs/2026-09-26-106-manual-xpr-startup-design.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "21ddfe7f73cbaccf80d6b7dc4ca35ac94ca066e1",
      "commit": "21c4bdb90e77b653bbf9c5d8892eae901cc4b612",
      "digest": "sha256:ece3b291ac908fd44d25a82248e50ea8ff94323930aa9aeb087fe70bbc8557ff",
      "path": "docs/superpowers/specs/2026-09-26-106-manual-xpr-startup-design.md",
      "snapshot": null,
      "turn": 1
    }
  ],
  "artifact_path": "docs/superpowers/specs/2026-09-26-106-manual-xpr-startup-design.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-cd9ea96c-af9e-4731-a6f1-cdffecb17b02",
      "claimed_at": "2026-09-26T23:53:38.889Z",
      "expires_at": "2026-09-27T07:53:38.889Z",
      "host": "claude-code",
      "last_activity_at": "2026-09-26T23:53:38.889Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:90eea9d89a947209c001ee7a09bda0560fdf35194b34d988ab207010d59d72c8"
    },
    {
      "claim_id": "claim-252745d4-b70a-4b7c-bf27-1e25c5fdd616",
      "claimed_at": "2026-09-27T00:05:52.972Z",
      "expires_at": "2026-09-27T08:05:52.972Z",
      "host": "codex",
      "last_activity_at": "2026-09-27T00:05:52.972Z",
      "role": "author",
      "session_fingerprint": "sha256:2eee61767a59da6185e59f5c9d1baf212ae9e7303465ebd2075aeabb4642c427"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "21c4bdb90e77b653bbf9c5d8892eae901cc4b612",
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
            "fingerprint": "sha256:2eee61767a59da6185e59f5c9d1baf212ae9e7303465ebd2075aeabb4642c427",
            "source": "environment-declaration"
          }
        },
        "host": "codex",
        "identity_source": "runtime",
        "joined_at": "2026-09-26T23:52:22.101Z",
        "model_display": "GPT-6 Astra",
        "model_id": "gpt-6-astra",
        "provider": "openai",
        "role": "author",
        "session_fingerprint": "sha256:2eee61767a59da6185e59f5c9d1baf212ae9e7303465ebd2075aeabb4642c427"
      },
      "role": "author",
      "sequence": 3
    }
  ],
  "lineage_receipt": {
    "attempts": [
      {
        "consumed_grant_digest": null,
        "event_log_digest": "sha256:2ebb78a1eb3a2f16337c1db0d9b5bdf147727198195ad307b24f44ff7330dec3",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-b9a20b7ba40e0363b2cecb59a3293f6e",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-b9a20b7ba40e0363b2cecb59a3293f6e",
        "root_review_id": "review-b9a20b7ba40e0363b2cecb59a3293f6e",
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
          "fingerprint": "sha256:2eee61767a59da6185e59f5c9d1baf212ae9e7303465ebd2075aeabb4642c427",
          "source": "environment-declaration"
        }
      },
      "host": "codex",
      "identity_source": "runtime",
      "joined_at": "2026-09-26T23:52:22.101Z",
      "model_display": "GPT-6 Astra",
      "model_id": "gpt-6-astra",
      "provider": "openai",
      "role": "author",
      "session_fingerprint": "sha256:2eee61767a59da6185e59f5c9d1baf212ae9e7303465ebd2075aeabb4642c427"
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
          "fingerprint": "sha256:90eea9d89a947209c001ee7a09bda0560fdf35194b34d988ab207010d59d72c8",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-09-26T23:53:38.861Z",
      "model_display": "claude-opus-5",
      "model_id": "claude-opus-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:90eea9d89a947209c001ee7a09bda0560fdf35194b34d988ab207010d59d72c8"
    }
  },
  "record_id": "review-b9a20b7ba40e0363b2cecb59a3293f6e",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-b9a20b7ba40e0363b2cecb59a3293f6e",
  "runtime": {
    "adapter_version": "1.0.0",
    "classification": "XPR",
    "ownership": "broker",
    "project_root_digest": "3202e9ccdb118ca52363495f14c2335f2e77bad33c9468d1c89897a1114499bf",
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
  "startup_commit": "877e107592c3f61ae08f39017bc3b60e3d894afb",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "21ddfe7f73cbaccf80d6b7dc4ca35ac94ca066e1",
        "digest": "sha256:ece3b291ac908fd44d25a82248e50ea8ff94323930aa9aeb087fe70bbc8557ff",
        "path": "docs/superpowers/specs/2026-09-26-106-manual-xpr-startup-design.md"
      },
      "author_response": {
        "digest": "sha256:25247f21381fd84d959fbe846c8617e372e36b0e84a71d68544e54e759db895f",
        "path": "docs/superpowers/peer-reviews/spec/2026-09-26-2026-09-26-106-manual-xpr-startup-design-review-b9a20b7ba40e0363b2cecb59a3293f6e/review-b9a20b7ba40e0363b2cecb59a3293f6e-author-response-1.md"
      },
      "commit": "21c4bdb90e77b653bbf9c5d8892eae901cc4b612",
      "decision": "revisions-requested",
      "finding_ids": [],
      "reviewer_response": {
        "digest": "sha256:63911537a0b6c22e1f2d4b46c2b2b19906ec47b38382a588353789877773020e",
        "path": "docs/superpowers/peer-reviews/spec/2026-09-26-2026-09-26-106-manual-xpr-startup-design-review-b9a20b7ba40e0363b2cecb59a3293f6e/review-b9a20b7ba40e0363b2cecb59a3293f6e-reviewer-response-1.md"
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
        "digest": "sha256:7ab3950b0282856ece658951a5338e32b1b3fb12478aa8a7d6a6eed6f9aa5a11",
        "path": "docs/superpowers/peer-reviews/spec/2026-09-26-2026-09-26-106-manual-xpr-startup-design-review-b9a20b7ba40e0363b2cecb59a3293f6e/review-b9a20b7ba40e0363b2cecb59a3293f6e-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    }
  ]
}
```
