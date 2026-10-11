<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "4b2e5ac9166560badbbd059b120ce9c8c768bd3a",
      "commit": "09912e94a3eaf2376738cf90a8471ec2a7e55464",
      "digest": "sha256:29b5a7e9d05dd5ca1ea6fb77bff596c99999c93b430f43db740433da8f39a2a4",
      "path": "docs/superpowers/specs/2026-10-10-190-stock-probe-lifetime-design.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "b098b06f598a35f7e69e738eb588efb3812af5bb",
      "commit": "326db5436e59df93c3d62b438cfdc3635504b92a",
      "digest": "sha256:0f004721b61517ef7a18813b52881c2a705b6e3d6ab7e7cb8786b8f3577673e1",
      "path": "docs/superpowers/specs/2026-10-10-190-stock-probe-lifetime-design.md",
      "snapshot": null,
      "turn": 1
    }
  ],
  "artifact_path": "docs/superpowers/specs/2026-10-10-190-stock-probe-lifetime-design.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-17e39d13-cf5f-4d1e-b496-c0ef599094c0",
      "claimed_at": "2026-10-11T03:59:30.867Z",
      "expires_at": "2026-10-11T11:59:30.867Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-11T03:59:30.867Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:e06758fc422edd565e535b2e083d57a5c2fd3df3c44cd3195b89ee1ecbb34cac"
    },
    {
      "claim_id": "claim-44abede9-0a6b-4333-b0be-0a5ac142b14f",
      "claimed_at": "2026-10-11T04:02:10.818Z",
      "expires_at": "2026-10-11T12:02:10.818Z",
      "host": "codex",
      "last_activity_at": "2026-10-11T04:02:10.818Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "326db5436e59df93c3d62b438cfdc3635504b92a",
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
        "joined_at": "2026-10-11T03:58:39.910Z",
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
        "event_log_digest": "sha256:d5c56b0a1915a5740405947051a0e4acb11c56e8c3bff2532dfb5e3f46bb32ea",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-18225a2e8455cf57b8a4f7ca4b662f70",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-18225a2e8455cf57b8a4f7ca4b662f70",
        "root_review_id": "review-18225a2e8455cf57b8a4f7ca4b662f70",
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
      "joined_at": "2026-10-11T03:58:39.910Z",
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
          "fingerprint": "sha256:e06758fc422edd565e535b2e083d57a5c2fd3df3c44cd3195b89ee1ecbb34cac",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-11T03:59:30.838Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:e06758fc422edd565e535b2e083d57a5c2fd3df3c44cd3195b89ee1ecbb34cac"
    }
  },
  "record_id": "review-18225a2e8455cf57b8a4f7ca4b662f70",
  "recoveries": [
    {
      "attestation": null,
      "incoming_session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be",
      "outgoing_session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be",
      "role": "author",
      "sequence": 10,
      "type": "same-session-reclaim"
    },
    {
      "attestation": null,
      "incoming_session_fingerprint": "sha256:e06758fc422edd565e535b2e083d57a5c2fd3df3c44cd3195b89ee1ecbb34cac",
      "outgoing_session_fingerprint": "sha256:e06758fc422edd565e535b2e083d57a5c2fd3df3c44cd3195b89ee1ecbb34cac",
      "role": "reviewer",
      "sequence": 14,
      "type": "same-session-reclaim"
    },
    {
      "attestation": null,
      "incoming_session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be",
      "outgoing_session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be",
      "role": "author",
      "sequence": 18,
      "type": "same-session-reclaim"
    }
  ],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-18225a2e8455cf57b8a4f7ca4b662f70",
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
  "startup_commit": "09912e94a3eaf2376738cf90a8471ec2a7e55464",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "b098b06f598a35f7e69e738eb588efb3812af5bb",
        "digest": "sha256:0f004721b61517ef7a18813b52881c2a705b6e3d6ab7e7cb8786b8f3577673e1",
        "path": "docs/superpowers/specs/2026-10-10-190-stock-probe-lifetime-design.md"
      },
      "author_response": {
        "digest": "sha256:2bc252e49295182e2a44f5fbea60b2628fbcf0448a38bcb4fee2fee2773ff157",
        "path": "docs/superpowers/peer-reviews/190-stock-worker-design/spec/2026-10-11-2026-10-10-190-stock-probe-lifetime-design-review-18225a2e8455cf57b8a4f7ca4b662f70/review-18225a2e8455cf57b8a4f7ca4b662f70-author-response-1.md"
      },
      "commit": "326db5436e59df93c3d62b438cfdc3635504b92a",
      "decision": "revisions-requested",
      "finding_ids": [],
      "reviewer_response": {
        "digest": "sha256:c82f2087996e0fe55033f7449133ac86bf72734e87cd7336bceaedd0da16ba45",
        "path": "docs/superpowers/peer-reviews/190-stock-worker-design/spec/2026-10-11-2026-10-10-190-stock-probe-lifetime-design-review-18225a2e8455cf57b8a4f7ca4b662f70/review-18225a2e8455cf57b8a4f7ca4b662f70-reviewer-response-1.md"
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
        "digest": "sha256:ef9eb7b3e08cfe29a18d3113252d902299c8b685a897a0c9714de6e93a556ddb",
        "path": "docs/superpowers/peer-reviews/190-stock-worker-design/spec/2026-10-11-2026-10-10-190-stock-probe-lifetime-design-review-18225a2e8455cf57b8a4f7ca4b662f70/review-18225a2e8455cf57b8a4f7ca4b662f70-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    }
  ]
}
```
