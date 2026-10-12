<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "63439bf2d1c6ccdc4c7b2b8e5b5c0efa9dc4c4fc",
      "commit": "81a24de3f2739a32ec11dcc1f8612b4c36b9ec37",
      "digest": "sha256:d52cb85ad6539b023e72d3c407cf13f9515ecabb539a445049bf96defe6d750d",
      "path": "evidence/portable-runtime/process-source/class-reviews/2026-10-12-190-fresh-read-wave7.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/class-reviews/2026-10-12-190-fresh-read-wave7.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-9cec0a0c-3bf8-450a-ad92-a90a0ac4649e",
      "claimed_at": "2026-10-12T17:31:16.751Z",
      "expires_at": "2026-10-13T01:31:16.751Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-12T17:31:16.751Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:bc933ae0d5b236bbc403c2c3d921cc0065c2d3711edf5b6d9b1cc4242c19eb23"
    },
    {
      "claim_id": "claim-af227b77-95a2-4381-96e5-1cc0139db03d",
      "claimed_at": "2026-10-12T17:34:07.380Z",
      "expires_at": "2026-10-13T01:34:07.380Z",
      "host": "codex",
      "last_activity_at": "2026-10-12T17:34:07.380Z",
      "role": "author",
      "session_fingerprint": "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "81a24de3f2739a32ec11dcc1f8612b4c36b9ec37",
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
        "joined_at": "2026-10-12T17:26:31.277Z",
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
        "event_log_digest": "sha256:d9946a7378b877be6015c5ca4f49408539dc263781b5a66fe0e4757a616df982",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-312e77ad531848b2c27428bf7e82d22a",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-312e77ad531848b2c27428bf7e82d22a",
        "root_review_id": "review-312e77ad531848b2c27428bf7e82d22a",
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
      "joined_at": "2026-10-12T17:26:31.277Z",
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
          "fingerprint": "sha256:bc933ae0d5b236bbc403c2c3d921cc0065c2d3711edf5b6d9b1cc4242c19eb23",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-12T17:31:16.718Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:bc933ae0d5b236bbc403c2c3d921cc0065c2d3711edf5b6d9b1cc4242c19eb23"
    }
  },
  "record_id": "review-312e77ad531848b2c27428bf7e82d22a",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-312e77ad531848b2c27428bf7e82d22a",
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
  "startup_commit": "81a24de3f2739a32ec11dcc1f8612b4c36b9ec37",
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
        "digest": "sha256:1d9160ff553a9a64881a44ccb269b4dc2375e4ea13e3f66536b7bc5efabb0e4b",
        "path": "docs/superpowers/peer-reviews/190-fresh-read-class-approval/spec/2026-10-12-2026-10-12-190-fresh-read-wave7-review-312e77ad531848b2c27428bf7e82d22a/review-312e77ad531848b2c27428bf7e82d22a-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
