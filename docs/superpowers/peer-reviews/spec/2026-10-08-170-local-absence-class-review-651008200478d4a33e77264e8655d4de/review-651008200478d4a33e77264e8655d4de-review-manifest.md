<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "2468d12f525ca672672883fa419fc4b8df1f4628",
      "commit": "f6ebcbf88bbdddfa1e6c3f621c415013027eeffa",
      "digest": "sha256:7ee4b82bacbd3ca1b3748b34a7bf0db675a058155baa0209390ef20b31f967ea",
      "path": "evidence/portable-runtime/process-source/class-reviews/170-local-absence-class.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/class-reviews/170-local-absence-class.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-8ecb0dfb-6af0-4a5d-9b8e-8e6503a8c15a",
      "claimed_at": "2026-10-08T05:32:06.632Z",
      "expires_at": "2026-10-08T13:32:06.632Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-08T05:32:06.632Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:5b2642567cabaa2d1d76ee29b61565d7e0d71d7a30efa8a4a88711e60913fbee"
    },
    {
      "claim_id": "claim-4db90a76-b1ac-4a8d-b9b7-fe8c1e3488a3",
      "claimed_at": "2026-10-08T05:37:16.833Z",
      "expires_at": "2026-10-08T13:37:16.833Z",
      "host": "codex",
      "last_activity_at": "2026-10-08T05:37:16.833Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "f6ebcbf88bbdddfa1e6c3f621c415013027eeffa",
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
            "requested_id": "gpt-6-astra",
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
        "joined_at": "2026-10-08T05:30:59.739Z",
        "model_display": "gpt-6-astra",
        "model_id": "gpt-6-astra",
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
        "event_log_digest": "sha256:17ba77e51804403adb5f18c8dde89c7b6c9f4a75d2169b04adc0eb790be27e16",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-651008200478d4a33e77264e8655d4de",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-651008200478d4a33e77264e8655d4de",
        "root_review_id": "review-651008200478d4a33e77264e8655d4de",
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
          "requested_id": "gpt-6-astra",
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
      "joined_at": "2026-10-08T05:30:59.739Z",
      "model_display": "gpt-6-astra",
      "model_id": "gpt-6-astra",
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
          "fingerprint": "sha256:5b2642567cabaa2d1d76ee29b61565d7e0d71d7a30efa8a4a88711e60913fbee",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-08T05:32:06.603Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:5b2642567cabaa2d1d76ee29b61565d7e0d71d7a30efa8a4a88711e60913fbee"
    }
  },
  "record_id": "review-651008200478d4a33e77264e8655d4de",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-651008200478d4a33e77264e8655d4de",
  "runtime": {
    "adapter_version": "1.0.0",
    "author": {
      "effort": "high",
      "host": "codex",
      "model_display": "gpt-6-astra",
      "model_id": "gpt-6-astra",
      "provider": "openai"
    },
    "classification": "XPR",
    "ownership": "broker",
    "project_root_digest": "c6bad9501e1e00130d154a23b8b6f6ea258175510ec252669b13d90bb35ab798",
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
  "startup_commit": "f6ebcbf88bbdddfa1e6c3f621c415013027eeffa",
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
        "digest": "sha256:e1ab9559c4be421458a307116e59b2b516b721c29849b14a57d772d18aa91076",
        "path": "docs/superpowers/peer-reviews/spec/2026-10-08-170-local-absence-class-review-651008200478d4a33e77264e8655d4de/review-651008200478d4a33e77264e8655d4de-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
