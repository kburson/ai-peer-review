<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "a8f36d69ff5b9626aefcbfa795194fa65c87ee83",
      "commit": "6a3f934757133b22fea1d6bd403dbc8f3fd8db3f",
      "digest": "sha256:a5a0a5cecbfab83cd39dc1191b533143351f032b03f935dc919bfad8bbd3e2b5",
      "path": "evidence/portable-runtime/process-source/class-reviews/2026-10-12-190-fresh-read-wave6.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/class-reviews/2026-10-12-190-fresh-read-wave6.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-165a0965-f0bb-48a1-a930-5b412195005e",
      "claimed_at": "2026-10-12T17:10:40.165Z",
      "expires_at": "2026-10-13T01:10:40.165Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-12T17:10:40.165Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:059bae93510bcac2d818e5402b70efda1d954e71c6d862f4a5986a0dcaf40407"
    },
    {
      "claim_id": "claim-00f82815-1881-478c-b8da-1bf23a62e269",
      "claimed_at": "2026-10-12T17:14:52.968Z",
      "expires_at": "2026-10-13T01:14:52.968Z",
      "host": "codex",
      "last_activity_at": "2026-10-12T17:14:52.968Z",
      "role": "author",
      "session_fingerprint": "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "6a3f934757133b22fea1d6bd403dbc8f3fd8db3f",
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
        "joined_at": "2026-10-12T17:07:35.869Z",
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
        "event_log_digest": "sha256:ec6b5b43137804e0fcc17c36738789b322020dba9d1b532c8f4e597814c05687",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-4d62b25a01aa5d4505ae995846347002",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-4d62b25a01aa5d4505ae995846347002",
        "root_review_id": "review-4d62b25a01aa5d4505ae995846347002",
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
      "joined_at": "2026-10-12T17:07:35.869Z",
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
          "fingerprint": "sha256:059bae93510bcac2d818e5402b70efda1d954e71c6d862f4a5986a0dcaf40407",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-12T17:10:40.133Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:059bae93510bcac2d818e5402b70efda1d954e71c6d862f4a5986a0dcaf40407"
    }
  },
  "record_id": "review-4d62b25a01aa5d4505ae995846347002",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-4d62b25a01aa5d4505ae995846347002",
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
  "startup_commit": "6a3f934757133b22fea1d6bd403dbc8f3fd8db3f",
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
        "digest": "sha256:ae51e62334abfcdd4ffc6b3bc1a05f4e186e9758cad5ce9b850944dba1c0f71c",
        "path": "docs/superpowers/peer-reviews/190-fresh-read-class-approval/spec/2026-10-12-2026-10-12-190-fresh-read-wave6-review-4d62b25a01aa5d4505ae995846347002/review-4d62b25a01aa5d4505ae995846347002-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
