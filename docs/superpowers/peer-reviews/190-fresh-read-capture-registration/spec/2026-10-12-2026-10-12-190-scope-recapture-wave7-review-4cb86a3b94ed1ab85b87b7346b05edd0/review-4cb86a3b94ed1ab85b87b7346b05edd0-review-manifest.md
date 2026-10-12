<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "505971518d25446a19b766beb07fd412cb3dae17",
      "commit": "cb2e657d5c63ce7db06c38d6579f68173a2010fc",
      "digest": "sha256:70ae96bd15a98bf258fcf2e90e86663c3fb36f4899e5f3d98a6b9a7e903acacd",
      "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave7.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave7.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-204e4536-8874-41f1-8109-7f916e26c450",
      "claimed_at": "2026-10-12T16:59:49.108Z",
      "expires_at": "2026-10-13T00:59:49.108Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-12T16:59:49.108Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:2d970840e834207dd0dd90312789a4de6850e750c228dff16cd0c2647b752c27"
    },
    {
      "claim_id": "claim-dec6790d-5876-4ccd-935a-fba6b011e4fb",
      "claimed_at": "2026-10-12T17:02:51.491Z",
      "expires_at": "2026-10-13T01:02:51.491Z",
      "host": "codex",
      "last_activity_at": "2026-10-12T17:02:51.491Z",
      "role": "author",
      "session_fingerprint": "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "cb2e657d5c63ce7db06c38d6579f68173a2010fc",
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
        "joined_at": "2026-10-12T16:56:43.619Z",
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
        "event_log_digest": "sha256:f98fd1310e635b92d9888adc5432f7d5d77a3d6cde74a803c28d632d4f9902dc",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-4cb86a3b94ed1ab85b87b7346b05edd0",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-4cb86a3b94ed1ab85b87b7346b05edd0",
        "root_review_id": "review-4cb86a3b94ed1ab85b87b7346b05edd0",
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
      "joined_at": "2026-10-12T16:56:43.619Z",
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
          "fingerprint": "sha256:2d970840e834207dd0dd90312789a4de6850e750c228dff16cd0c2647b752c27",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-12T16:59:49.080Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:2d970840e834207dd0dd90312789a4de6850e750c228dff16cd0c2647b752c27"
    }
  },
  "record_id": "review-4cb86a3b94ed1ab85b87b7346b05edd0",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-4cb86a3b94ed1ab85b87b7346b05edd0",
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
  "startup_commit": "cb2e657d5c63ce7db06c38d6579f68173a2010fc",
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
        "digest": "sha256:8b4cad8a615711bf22240d488806118d9d289fecc5153c8f9250989ce45cfe89",
        "path": "docs/superpowers/peer-reviews/190-fresh-read-capture-registration/spec/2026-10-12-2026-10-12-190-scope-recapture-wave7-review-4cb86a3b94ed1ab85b87b7346b05edd0/review-4cb86a3b94ed1ab85b87b7346b05edd0-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
