<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "a9a871e211ef46290dfad927579d8694dc230c0f",
      "commit": "52564f941101ca21f91e86922ea95d0e9ee5f06a",
      "digest": "sha256:c33b321d2bff0bdcaa3f93dd8f0650802d6d4d3d5930c3e99db5ae07d6d20e0f",
      "path": "evidence/portable-runtime/process-source/class-reviews/2026-10-15-190-repair-wave13.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/class-reviews/2026-10-15-190-repair-wave13.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-49e716be-094d-4d40-a7a9-72bf6a207a68",
      "claimed_at": "2026-10-16T01:40:53.280Z",
      "expires_at": "2026-10-16T09:40:53.280Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-16T01:40:53.280Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:2fb8a3e599f8482552d1310d3f29af1bbaf647ac80c9374917e66ecec0c7dd2a"
    },
    {
      "claim_id": "claim-01418dbd-707e-4390-a8bc-e389cda55cf2",
      "claimed_at": "2026-10-16T01:43:51.369Z",
      "expires_at": "2026-10-16T09:43:51.369Z",
      "host": "codex",
      "last_activity_at": "2026-10-16T01:43:51.369Z",
      "role": "author",
      "session_fingerprint": "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "52564f941101ca21f91e86922ea95d0e9ee5f06a",
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
        "joined_at": "2026-10-16T01:38:25.386Z",
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
        "event_log_digest": "sha256:8972afea28ae53ca3bd052a67247bb20ec226923a5753554b6c5add56254e794",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-f63ed2ecbde3c6716bc90220742c8eb0",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-f63ed2ecbde3c6716bc90220742c8eb0",
        "root_review_id": "review-f63ed2ecbde3c6716bc90220742c8eb0",
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
      "joined_at": "2026-10-16T01:38:25.386Z",
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
          "fingerprint": "sha256:2fb8a3e599f8482552d1310d3f29af1bbaf647ac80c9374917e66ecec0c7dd2a",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-16T01:40:53.252Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:2fb8a3e599f8482552d1310d3f29af1bbaf647ac80c9374917e66ecec0c7dd2a"
    }
  },
  "record_id": "review-f63ed2ecbde3c6716bc90220742c8eb0",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-f63ed2ecbde3c6716bc90220742c8eb0",
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
  "startup_commit": "52564f941101ca21f91e86922ea95d0e9ee5f06a",
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
        "digest": "sha256:8e250bc2d5c457c4f19a783e3ba0ae636cf6a8ebd31f5ccf249a220d06693cf6",
        "path": "docs/superpowers/peer-reviews/spec/2026-10-16-2026-10-15-190-repair-wave13-review-f63ed2ecbde3c6716bc90220742c8eb0/review-f63ed2ecbde3c6716bc90220742c8eb0-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
