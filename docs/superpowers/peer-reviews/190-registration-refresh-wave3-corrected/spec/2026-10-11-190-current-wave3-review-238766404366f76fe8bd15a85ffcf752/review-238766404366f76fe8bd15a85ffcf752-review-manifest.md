<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "42567aed089e8b13b1525a796d8e8d337b0270c3",
      "commit": "f08fed2d7099c5180059c4bac3064aaa7e92a70b",
      "digest": "sha256:15aedea0c76f5a37d314e88864ec79099db5fb229f73e1dd6107b7b94be2b069",
      "path": "evidence/portable-runtime/process-source/registration-reviews/190-current-wave3.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/registration-reviews/190-current-wave3.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-20874dd8-0cb6-402a-aafe-21660f6478b0",
      "claimed_at": "2026-10-11T00:54:13.809Z",
      "expires_at": "2026-10-11T08:54:13.809Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-11T00:54:13.809Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:8f5e6e6e2f4b79db5f2397e0e29c5325986fb9315b099831ef7dd220c53b324d"
    },
    {
      "claim_id": "claim-8412db3d-3786-4aa4-aa80-11bb98227174",
      "claimed_at": "2026-10-11T00:57:36.201Z",
      "expires_at": "2026-10-11T08:57:36.201Z",
      "host": "codex",
      "last_activity_at": "2026-10-11T00:57:36.201Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "f08fed2d7099c5180059c4bac3064aaa7e92a70b",
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
        "joined_at": "2026-10-11T00:53:10.966Z",
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
        "event_log_digest": "sha256:97a4fe1c14847f5309c656cda7a4544cd5b628620e406ef917e9ea1982c389a4",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-238766404366f76fe8bd15a85ffcf752",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-238766404366f76fe8bd15a85ffcf752",
        "root_review_id": "review-238766404366f76fe8bd15a85ffcf752",
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
      "joined_at": "2026-10-11T00:53:10.966Z",
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
          "fingerprint": "sha256:8f5e6e6e2f4b79db5f2397e0e29c5325986fb9315b099831ef7dd220c53b324d",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-11T00:54:13.782Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:8f5e6e6e2f4b79db5f2397e0e29c5325986fb9315b099831ef7dd220c53b324d"
    }
  },
  "record_id": "review-238766404366f76fe8bd15a85ffcf752",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-238766404366f76fe8bd15a85ffcf752",
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
  "startup_commit": "f08fed2d7099c5180059c4bac3064aaa7e92a70b",
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
        "digest": "sha256:b78eeb5e42357a40877fa48d5cedb58424bc7e7284d2c464fd5d066084cfa15b",
        "path": "docs/superpowers/peer-reviews/190-registration-refresh-wave3-corrected/spec/2026-10-11-190-current-wave3-review-238766404366f76fe8bd15a85ffcf752/review-238766404366f76fe8bd15a85ffcf752-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
