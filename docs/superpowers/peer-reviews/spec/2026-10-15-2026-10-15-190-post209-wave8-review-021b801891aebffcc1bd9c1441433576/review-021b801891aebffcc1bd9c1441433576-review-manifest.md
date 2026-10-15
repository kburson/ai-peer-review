<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "43bf4c91af81c29fd049f533744edd9957cd0ce6",
      "commit": "ca5f2d034897bdf58468afda2160d02196e40dd1",
      "digest": "sha256:ec0e036f9dad63b4cfecc9c2348a05938238f59b70d655b26c6aa2ab5991cf18",
      "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-15-190-post209-wave8.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-15-190-post209-wave8.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-3b0f3881-06ad-4a22-b5c0-33bb3fdf0d01",
      "claimed_at": "2026-10-15T22:34:29.547Z",
      "expires_at": "2026-10-16T06:34:29.547Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-15T22:34:29.547Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:931bc5d8baa2db04705876c93098345a2bb246946bd6445c983ec086463abc77"
    },
    {
      "claim_id": "claim-972198f2-980f-4a2b-a5de-b1cfed571785",
      "claimed_at": "2026-10-15T22:37:52.712Z",
      "expires_at": "2026-10-16T06:37:52.712Z",
      "host": "codex",
      "last_activity_at": "2026-10-15T22:37:52.712Z",
      "role": "author",
      "session_fingerprint": "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "ca5f2d034897bdf58468afda2160d02196e40dd1",
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
        "joined_at": "2026-10-15T22:31:14.539Z",
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
        "event_log_digest": "sha256:e8845f9bfc4dfbb2fc5b82deab4ac36437d78574c0bbe0df4239b26ada2b917a",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-021b801891aebffcc1bd9c1441433576",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-021b801891aebffcc1bd9c1441433576",
        "root_review_id": "review-021b801891aebffcc1bd9c1441433576",
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
      "joined_at": "2026-10-15T22:31:14.539Z",
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
          "fingerprint": "sha256:931bc5d8baa2db04705876c93098345a2bb246946bd6445c983ec086463abc77",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-15T22:34:29.518Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:931bc5d8baa2db04705876c93098345a2bb246946bd6445c983ec086463abc77"
    }
  },
  "record_id": "review-021b801891aebffcc1bd9c1441433576",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-021b801891aebffcc1bd9c1441433576",
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
  "startup_commit": "ca5f2d034897bdf58468afda2160d02196e40dd1",
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
        "digest": "sha256:6b71a960a230a1381c9941daa6f97e6009e9248b362416c736af24dca4dc1e3c",
        "path": "docs/superpowers/peer-reviews/spec/2026-10-15-2026-10-15-190-post209-wave8-review-021b801891aebffcc1bd9c1441433576/review-021b801891aebffcc1bd9c1441433576-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
