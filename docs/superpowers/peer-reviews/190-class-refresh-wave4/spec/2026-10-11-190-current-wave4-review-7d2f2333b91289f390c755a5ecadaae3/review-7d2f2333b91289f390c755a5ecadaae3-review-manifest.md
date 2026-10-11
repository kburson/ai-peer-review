<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "cf71194cd7f01e9894726bdffd7bc14a1deb72f8",
      "commit": "24614f1689659109b62bf4df1bec61f563b4d4d4",
      "digest": "sha256:605e129c9df7bf4a14115816e86d8a2ca85866ee8d3ff17b00654d1d33ffd3a9",
      "path": "evidence/portable-runtime/process-source/class-reviews/190-current-wave4.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/class-reviews/190-current-wave4.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-25a07a9e-3896-44ae-9918-dac33b68bf37",
      "claimed_at": "2026-10-11T01:28:35.724Z",
      "expires_at": "2026-10-11T09:28:35.724Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-11T01:28:35.724Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:1df7b7acfa938bdfd5d2f5968f9cf7b9ecf869788fa50991be3119048307f823"
    },
    {
      "claim_id": "claim-125baded-a7d9-4df3-8d79-e635410d49ff",
      "claimed_at": "2026-10-11T01:32:51.466Z",
      "expires_at": "2026-10-11T09:32:51.466Z",
      "host": "codex",
      "last_activity_at": "2026-10-11T01:32:51.466Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "24614f1689659109b62bf4df1bec61f563b4d4d4",
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
            "requested_id": "gpt-6.1-sol",
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
        "joined_at": "2026-10-11T01:27:18.803Z",
        "model_display": "gpt-6.1-sol",
        "model_id": "gpt-6.1-sol",
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
        "event_log_digest": "sha256:a80e3f8282bee0866125cc5235ed68d829dfabdb504c2b19a70661bd04b7e14a",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-7d2f2333b91289f390c755a5ecadaae3",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-7d2f2333b91289f390c755a5ecadaae3",
        "root_review_id": "review-7d2f2333b91289f390c755a5ecadaae3",
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
          "requested_id": "gpt-6.1-sol",
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
      "joined_at": "2026-10-11T01:27:18.803Z",
      "model_display": "gpt-6.1-sol",
      "model_id": "gpt-6.1-sol",
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
          "fingerprint": "sha256:1df7b7acfa938bdfd5d2f5968f9cf7b9ecf869788fa50991be3119048307f823",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-11T01:28:35.698Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:1df7b7acfa938bdfd5d2f5968f9cf7b9ecf869788fa50991be3119048307f823"
    }
  },
  "record_id": "review-7d2f2333b91289f390c755a5ecadaae3",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-7d2f2333b91289f390c755a5ecadaae3",
  "runtime": {
    "adapter_version": "1.0.0",
    "author": {
      "effort": "high",
      "host": "codex",
      "model_display": "gpt-6.1-sol",
      "model_id": "gpt-6.1-sol",
      "provider": "openai"
    },
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
  "startup_commit": "24614f1689659109b62bf4df1bec61f563b4d4d4",
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
        "digest": "sha256:54d98ce1548e01c8d6dcf1d4900b8844e401f4d9efe633ee384cb65b6fee6095",
        "path": "docs/superpowers/peer-reviews/190-class-refresh-wave4/spec/2026-10-11-190-current-wave4-review-7d2f2333b91289f390c755a5ecadaae3/review-7d2f2333b91289f390c755a5ecadaae3-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
