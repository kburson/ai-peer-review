<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "2761fec3fbfeeaa268d60fc7543508feb6171d31",
      "commit": "c460fed20ba0fb6bbe02302ee9340aa6956e4aef",
      "digest": "sha256:d43992ea840b4fd58244747770af0e905d68a8548f8212279323042dad36b23e",
      "path": "evidence/portable-runtime/process-source/registration-reviews/190-current-wave2.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/registration-reviews/190-current-wave2.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-0a1a121f-39ef-406e-9304-2af5dbc2d277",
      "claimed_at": "2026-10-09T13:17:55.220Z",
      "expires_at": "2026-10-09T21:17:55.220Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-09T13:17:55.220Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:fbeeba44cfab26dc42425271b7b15aaa1f7b11a56d6b125edc84fc51da00a5a5"
    },
    {
      "claim_id": "claim-890e7f97-9522-407e-b30f-cf904ce38714",
      "claimed_at": "2026-10-09T13:20:26.578Z",
      "expires_at": "2026-10-09T21:20:26.578Z",
      "host": "codex",
      "last_activity_at": "2026-10-09T13:20:26.578Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "c460fed20ba0fb6bbe02302ee9340aa6956e4aef",
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
        "joined_at": "2026-10-09T13:16:41.301Z",
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
        "event_log_digest": "sha256:cd218da451b205a37825ce129723255695dccc5d071c9797862785944de0beaf",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-3775b88fbdbbdd942a41e7ccb4529fc4",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-3775b88fbdbbdd942a41e7ccb4529fc4",
        "root_review_id": "review-3775b88fbdbbdd942a41e7ccb4529fc4",
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
      "joined_at": "2026-10-09T13:16:41.301Z",
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
          "declared_id": "claude-sonnet-5-5",
          "observed_id": null,
          "requested_id": null,
          "source": "environment-declaration"
        },
        "session": {
          "assurance": "declared",
          "fingerprint": "sha256:fbeeba44cfab26dc42425271b7b15aaa1f7b11a56d6b125edc84fc51da00a5a5",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-09T13:17:55.190Z",
      "model_display": "claude-sonnet-5-5",
      "model_id": "claude-sonnet-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:fbeeba44cfab26dc42425271b7b15aaa1f7b11a56d6b125edc84fc51da00a5a5"
    }
  },
  "record_id": "review-3775b88fbdbbdd942a41e7ccb4529fc4",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-3775b88fbdbbdd942a41e7ccb4529fc4",
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
      "effort": "medium",
      "host": "claude-code",
      "model_display": "claude-sonnet-5-5",
      "model_id": "claude-sonnet-5-5",
      "provider": "anthropic",
      "selector": "claude"
    },
    "schema": "ai-peer-review.runtime/v1",
    "transport_mode": "manual"
  },
  "schema": "ai-peer-review.manifest/v1",
  "startup_commit": "c460fed20ba0fb6bbe02302ee9340aa6956e4aef",
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
        "digest": "sha256:bfceb7b4b7198aa2f7436b07f781d6ffe36cd20a81a200b5a4e15827c08850cd",
        "path": "docs/superpowers/peer-reviews/190-registration-wave2/spec/2026-10-09-190-current-wave2-review-3775b88fbdbbdd942a41e7ccb4529fc4/review-3775b88fbdbbdd942a41e7ccb4529fc4-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
