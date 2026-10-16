<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "123abd5ac09cdb5dfdc80bfb7e1acd2e79a1c7ff",
      "commit": "91fa4acdfdd5f3a16930cdbc4ad1a735ef440443",
      "digest": "sha256:8d29da6abf4c489739308189ae110f7b2a0057afe6239941a45b03bfcf5f4649",
      "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-15-190-repair-wave11.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "ec9af602a57533b289001c7bf210491cf201c9c0",
      "commit": "00b670ecf5a17aa6bfd95997dfb9d60f95096328",
      "digest": "sha256:8e51562129ce974343fc33e35e8310bd217b68ee718ad4040d5d05f89ca60b24",
      "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-15-190-repair-wave11.md",
      "snapshot": null,
      "turn": 1
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-15-190-repair-wave11.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-b3b1b8f9-8bd3-4d33-b9e5-22d60c4f3f86",
      "claimed_at": "2026-10-16T00:58:45.795Z",
      "expires_at": "2026-10-16T08:58:45.795Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-16T00:58:45.795Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:7ede98a76f71d3299e07dd1c10caff8001ccaf249e04376fdaee8c0a555bb2ce"
    },
    {
      "claim_id": "claim-74b77b2c-5b14-4743-b4f7-4a8cadae001b",
      "claimed_at": "2026-10-16T01:00:18.336Z",
      "expires_at": "2026-10-16T09:00:18.336Z",
      "host": "codex",
      "last_activity_at": "2026-10-16T01:00:18.336Z",
      "role": "author",
      "session_fingerprint": "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "00b670ecf5a17aa6bfd95997dfb9d60f95096328",
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
        "joined_at": "2026-10-16T00:57:13.441Z",
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
        "event_log_digest": "sha256:fc8fb3c5764e5bc87e41cda18a370039ceb1ccbd7268307b4be8bd911acb8e71",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-1a8a872f54baab9ed9aabc4a99fd9b5a",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-1a8a872f54baab9ed9aabc4a99fd9b5a",
        "root_review_id": "review-1a8a872f54baab9ed9aabc4a99fd9b5a",
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
      "joined_at": "2026-10-16T00:57:13.441Z",
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
          "fingerprint": "sha256:7ede98a76f71d3299e07dd1c10caff8001ccaf249e04376fdaee8c0a555bb2ce",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-16T00:58:45.761Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:7ede98a76f71d3299e07dd1c10caff8001ccaf249e04376fdaee8c0a555bb2ce"
    }
  },
  "record_id": "review-1a8a872f54baab9ed9aabc4a99fd9b5a",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-1a8a872f54baab9ed9aabc4a99fd9b5a",
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
  "startup_commit": "91fa4acdfdd5f3a16930cdbc4ad1a735ef440443",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "ec9af602a57533b289001c7bf210491cf201c9c0",
        "digest": "sha256:8e51562129ce974343fc33e35e8310bd217b68ee718ad4040d5d05f89ca60b24",
        "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-15-190-repair-wave11.md"
      },
      "author_response": {
        "digest": "sha256:ba9a3e40856453763e702ce97158190fa92cbfe5384578e25c0663923e97725e",
        "path": "docs/superpowers/peer-reviews/spec/2026-10-16-2026-10-15-190-repair-wave11-review-1a8a872f54baab9ed9aabc4a99fd9b5a/review-1a8a872f54baab9ed9aabc4a99fd9b5a-author-response-1.md"
      },
      "commit": "00b670ecf5a17aa6bfd95997dfb9d60f95096328",
      "decision": "revisions-requested",
      "finding_ids": [],
      "reviewer_response": {
        "digest": "sha256:3711d9e921894ecaec7cceab6bac6c852e52e7e492faa5c55fd4bab914aba303",
        "path": "docs/superpowers/peer-reviews/spec/2026-10-16-2026-10-15-190-repair-wave11-review-1a8a872f54baab9ed9aabc4a99fd9b5a/review-1a8a872f54baab9ed9aabc4a99fd9b5a-reviewer-response-1.md"
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
        "digest": "sha256:4e9f92449f26584c79c2be74f5560f74dcdd6e3b95c8f18e6c69fc27cb66fdcb",
        "path": "docs/superpowers/peer-reviews/spec/2026-10-16-2026-10-15-190-repair-wave11-review-1a8a872f54baab9ed9aabc4a99fd9b5a/review-1a8a872f54baab9ed9aabc4a99fd9b5a-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    }
  ]
}
```
