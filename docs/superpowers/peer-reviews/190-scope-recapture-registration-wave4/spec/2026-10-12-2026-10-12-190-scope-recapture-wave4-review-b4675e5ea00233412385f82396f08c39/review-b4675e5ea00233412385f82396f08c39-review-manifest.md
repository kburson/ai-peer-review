<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "539a5e39449e3bfb85a2c4414b0c728eb593977d",
      "commit": "faa376da2103cb2dec2c1560c94ee07aba4a898b",
      "digest": "sha256:46d36a77a168ba8d64bdef4246db26b7da405e9184a633a55ba1fad8625ee629",
      "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave4.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave4.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-45704568-0c62-4e16-910b-fc66546db0e4",
      "claimed_at": "2026-10-12T09:05:19.804Z",
      "expires_at": "2026-10-12T17:05:19.804Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-12T09:05:19.804Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:e4633a1bc573e9176f1ffe94824cb2b1b2543b40524a9deee8f6f2ac32a00b64"
    },
    {
      "claim_id": "claim-a388bd41-f4b7-4839-99e7-e47aa4c14138",
      "claimed_at": "2026-10-12T09:09:53.717Z",
      "expires_at": "2026-10-12T17:09:53.717Z",
      "host": "codex",
      "last_activity_at": "2026-10-12T09:09:53.717Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "faa376da2103cb2dec2c1560c94ee07aba4a898b",
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
        "joined_at": "2026-10-12T09:03:34.429Z",
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
        "event_log_digest": "sha256:e2f3bf9b20a592f761620ef944c6d1502b5c425d822e465a5ebfc4f3268eca8a",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-b4675e5ea00233412385f82396f08c39",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-b4675e5ea00233412385f82396f08c39",
        "root_review_id": "review-b4675e5ea00233412385f82396f08c39",
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
      "joined_at": "2026-10-12T09:03:34.429Z",
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
          "fingerprint": "sha256:e4633a1bc573e9176f1ffe94824cb2b1b2543b40524a9deee8f6f2ac32a00b64",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-12T09:05:19.776Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:e4633a1bc573e9176f1ffe94824cb2b1b2543b40524a9deee8f6f2ac32a00b64"
    }
  },
  "record_id": "review-b4675e5ea00233412385f82396f08c39",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-b4675e5ea00233412385f82396f08c39",
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
  "startup_commit": "faa376da2103cb2dec2c1560c94ee07aba4a898b",
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
        "digest": "sha256:27e2b400f6ee7271e692a85988bd1a4c6a4df965468fe1fc641e9f25be020b3e",
        "path": "docs/superpowers/peer-reviews/190-scope-recapture-registration-wave4/spec/2026-10-12-2026-10-12-190-scope-recapture-wave4-review-b4675e5ea00233412385f82396f08c39/review-b4675e5ea00233412385f82396f08c39-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
