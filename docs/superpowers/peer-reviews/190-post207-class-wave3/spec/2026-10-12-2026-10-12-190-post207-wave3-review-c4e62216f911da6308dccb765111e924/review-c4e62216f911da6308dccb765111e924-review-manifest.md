<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "c6d46a82150cd6c6ea88fb16a2d4577c28aa028d",
      "commit": "e47e1e534131b1dd8a9c4a19694e259583af1b7d",
      "digest": "sha256:118cba64c7572806c37456a189dce16e6d77d7cb89385e03d9517220ba82aabe",
      "path": "evidence/portable-runtime/process-source/class-reviews/2026-10-12-190-post207-wave3.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/class-reviews/2026-10-12-190-post207-wave3.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-d7166622-f1b0-4893-9582-9d44d97930d3",
      "claimed_at": "2026-10-12T12:24:02.785Z",
      "expires_at": "2026-10-12T20:24:02.785Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-12T12:24:02.785Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:52d89e3e051e1d6ca544bc3e55cc74a3cb5c26edd086756c879f2b9698aae6ab"
    },
    {
      "claim_id": "claim-fb743765-3bfb-461e-9140-98a6a4925c78",
      "claimed_at": "2026-10-12T12:27:05.034Z",
      "expires_at": "2026-10-12T20:27:05.034Z",
      "host": "codex",
      "last_activity_at": "2026-10-12T12:27:05.034Z",
      "role": "author",
      "session_fingerprint": "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "e47e1e534131b1dd8a9c4a19694e259583af1b7d",
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
        "joined_at": "2026-10-12T12:22:13.630Z",
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
        "event_log_digest": "sha256:32d750174371377e2766312106dca47bff8768e5f9eb2a6c500bd65d7b5d4e65",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-c4e62216f911da6308dccb765111e924",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-c4e62216f911da6308dccb765111e924",
        "root_review_id": "review-c4e62216f911da6308dccb765111e924",
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
      "joined_at": "2026-10-12T12:22:13.630Z",
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
          "fingerprint": "sha256:52d89e3e051e1d6ca544bc3e55cc74a3cb5c26edd086756c879f2b9698aae6ab",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-12T12:24:02.750Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:52d89e3e051e1d6ca544bc3e55cc74a3cb5c26edd086756c879f2b9698aae6ab"
    }
  },
  "record_id": "review-c4e62216f911da6308dccb765111e924",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-c4e62216f911da6308dccb765111e924",
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
  "startup_commit": "e47e1e534131b1dd8a9c4a19694e259583af1b7d",
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
        "digest": "sha256:f5e3cc81fa952e74c0cbb1805a3144d1796b35c76ac6a0ca83eeda57d8b932e1",
        "path": "docs/superpowers/peer-reviews/190-post207-class-wave3/spec/2026-10-12-2026-10-12-190-post207-wave3-review-c4e62216f911da6308dccb765111e924/review-c4e62216f911da6308dccb765111e924-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
