<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "5d6b824c0d9f78de308edbd991ba16f325d64e7d",
      "commit": "d940f64d30648161ac0b91c71b7c63c66910d823",
      "digest": "sha256:3000832b456e42d534eb45d3347a3c54a536237bdf3e866077f0fcb2f77224e8",
      "path": "docs/superpowers/plans/2026-10-11-190-selection-read-scope.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "ff3e37c9bdf4c2149cbe169e5eabb354e05ae044",
      "commit": "90b720ce641c3566d8a870eb8940929ee3a2fbfa",
      "digest": "sha256:ab5ea6e6bacca77763b49042c14f2e5ef8b966e08ab2f4a4aa7eb8f281802ce1",
      "path": "docs/superpowers/plans/2026-10-11-190-selection-read-scope.md",
      "snapshot": null,
      "turn": 1
    }
  ],
  "artifact_path": "docs/superpowers/plans/2026-10-11-190-selection-read-scope.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-05f321b4-5fb6-4fe0-934d-1db11547d1d3",
      "claimed_at": "2026-10-12T03:18:02.274Z",
      "expires_at": "2026-10-12T11:18:02.274Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-12T03:18:02.274Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:85adb2d848d9ea60a54d199ebc5c0b1ed30c31c66c4e9498eda226806afe2d20"
    },
    {
      "claim_id": "claim-aa9bf205-ece1-4caa-be98-ff677fcf55e4",
      "claimed_at": "2026-10-12T03:21:22.825Z",
      "expires_at": "2026-10-12T11:21:22.825Z",
      "host": "codex",
      "last_activity_at": "2026-10-12T03:21:22.825Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "90b720ce641c3566d8a870eb8940929ee3a2fbfa",
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
            "fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be",
            "source": "environment-declaration"
          }
        },
        "host": "codex",
        "identity_source": "runtime",
        "joined_at": "2026-10-12T03:14:55.595Z",
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
        "event_log_digest": "sha256:bd03208b92840cdd9b981e9c71c3464dc931290d49849bd4694d660e9aca600f",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-d6f023926c73861846a0874adc640aae",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-d6f023926c73861846a0874adc640aae",
        "root_review_id": "review-d6f023926c73861846a0874adc640aae",
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
          "fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be",
          "source": "environment-declaration"
        }
      },
      "host": "codex",
      "identity_source": "runtime",
      "joined_at": "2026-10-12T03:14:55.595Z",
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
          "fingerprint": "sha256:85adb2d848d9ea60a54d199ebc5c0b1ed30c31c66c4e9498eda226806afe2d20",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-12T03:18:02.243Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:85adb2d848d9ea60a54d199ebc5c0b1ed30c31c66c4e9498eda226806afe2d20"
    }
  },
  "record_id": "review-d6f023926c73861846a0874adc640aae",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-d6f023926c73861846a0874adc640aae",
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
  "startup_commit": "d940f64d30648161ac0b91c71b7c63c66910d823",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "ff3e37c9bdf4c2149cbe169e5eabb354e05ae044",
        "digest": "sha256:ab5ea6e6bacca77763b49042c14f2e5ef8b966e08ab2f4a4aa7eb8f281802ce1",
        "path": "docs/superpowers/plans/2026-10-11-190-selection-read-scope.md"
      },
      "author_response": {
        "digest": "sha256:7d18ea710cf4022675c7b0c03e3199bcb625312585e4963a48253135600bb21f",
        "path": "docs/superpowers/peer-reviews/190-selection-read-scope-plan/plan/2026-10-12-2026-10-11-190-selection-read-scope-review-d6f023926c73861846a0874adc640aae/review-d6f023926c73861846a0874adc640aae-author-response-1.md"
      },
      "commit": "90b720ce641c3566d8a870eb8940929ee3a2fbfa",
      "decision": "revisions-requested",
      "finding_ids": [],
      "reviewer_response": {
        "digest": "sha256:64d9a66a3f9ab880cbf954607ef923e95c9c3806c490e956f2bbf117cde5a5b4",
        "path": "docs/superpowers/peer-reviews/190-selection-read-scope-plan/plan/2026-10-12-2026-10-11-190-selection-read-scope-review-d6f023926c73861846a0874adc640aae/review-d6f023926c73861846a0874adc640aae-reviewer-response-1.md"
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
        "digest": "sha256:89f476054393bf258d1836ed290413ea8bc3b9253777b9ac10284757e081ecbe",
        "path": "docs/superpowers/peer-reviews/190-selection-read-scope-plan/plan/2026-10-12-2026-10-11-190-selection-read-scope-review-d6f023926c73861846a0874adc640aae/review-d6f023926c73861846a0874adc640aae-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    }
  ]
}
```
