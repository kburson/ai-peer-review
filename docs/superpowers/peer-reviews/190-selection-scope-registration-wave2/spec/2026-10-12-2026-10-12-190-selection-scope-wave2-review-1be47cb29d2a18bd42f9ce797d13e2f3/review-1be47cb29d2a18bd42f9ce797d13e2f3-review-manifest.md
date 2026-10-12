<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "f1279b9f2c27538e1b5b6d072cf47a3d3b8d8069",
      "commit": "fdf6dfd7e647fe73a061c5d2d1a8d3e7d6f30883",
      "digest": "sha256:44c4797e8c7c764dced8dca94e23d9800ae6099650dfeaa852d44b1cf1720e3b",
      "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-selection-scope-wave2.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "41f5d31c368a3e767ccf34ad4f4d1f1cd89e3b73",
      "commit": "ca1ffbc0367c50bcc0d9e98de878a816f75707b0",
      "digest": "sha256:f0163f2f663d0dda000ccb2f4042a9437c0898d821fd3833d2524df14ad97b23",
      "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-selection-scope-wave2.md",
      "snapshot": null,
      "turn": 1
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-selection-scope-wave2.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-ae375c1f-7f8a-43e2-aabe-2bf73269957e",
      "claimed_at": "2026-10-12T05:37:34.913Z",
      "expires_at": "2026-10-12T13:37:34.913Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-12T05:37:34.913Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:13ea9d1330ae1a36ff9c1d4739b5b21856cff839c721cbb21e2bd5f76a652fe4"
    },
    {
      "claim_id": "claim-8353c4df-98cd-41fe-9af1-6c57e6729fdf",
      "claimed_at": "2026-10-12T05:40:02.430Z",
      "expires_at": "2026-10-12T13:40:02.430Z",
      "host": "codex",
      "last_activity_at": "2026-10-12T05:40:02.430Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "ca1ffbc0367c50bcc0d9e98de878a816f75707b0",
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
        "joined_at": "2026-10-12T05:34:01.539Z",
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
        "event_log_digest": "sha256:4957e169b9830da62dc3e4fa5496aeaef66e93bb6ae2da293e799f4efe8db333",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-1be47cb29d2a18bd42f9ce797d13e2f3",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-1be47cb29d2a18bd42f9ce797d13e2f3",
        "root_review_id": "review-1be47cb29d2a18bd42f9ce797d13e2f3",
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
      "joined_at": "2026-10-12T05:34:01.539Z",
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
          "fingerprint": "sha256:13ea9d1330ae1a36ff9c1d4739b5b21856cff839c721cbb21e2bd5f76a652fe4",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-12T05:37:34.877Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:13ea9d1330ae1a36ff9c1d4739b5b21856cff839c721cbb21e2bd5f76a652fe4"
    }
  },
  "record_id": "review-1be47cb29d2a18bd42f9ce797d13e2f3",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-1be47cb29d2a18bd42f9ce797d13e2f3",
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
  "startup_commit": "fdf6dfd7e647fe73a061c5d2d1a8d3e7d6f30883",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "41f5d31c368a3e767ccf34ad4f4d1f1cd89e3b73",
        "digest": "sha256:f0163f2f663d0dda000ccb2f4042a9437c0898d821fd3833d2524df14ad97b23",
        "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-selection-scope-wave2.md"
      },
      "author_response": {
        "digest": "sha256:d38dbb3570c0fb446ef5df593c5300eb5d4eed24ff989b32a615dfcefa47a3a2",
        "path": "docs/superpowers/peer-reviews/190-selection-scope-registration-wave2/spec/2026-10-12-2026-10-12-190-selection-scope-wave2-review-1be47cb29d2a18bd42f9ce797d13e2f3/review-1be47cb29d2a18bd42f9ce797d13e2f3-author-response-1.md"
      },
      "commit": "ca1ffbc0367c50bcc0d9e98de878a816f75707b0",
      "decision": "revisions-requested",
      "finding_ids": [],
      "reviewer_response": {
        "digest": "sha256:f22e09da49622456e65b1dd179babc47f3dcf937fa79da039ef6540d9a4b60ff",
        "path": "docs/superpowers/peer-reviews/190-selection-scope-registration-wave2/spec/2026-10-12-2026-10-12-190-selection-scope-wave2-review-1be47cb29d2a18bd42f9ce797d13e2f3/review-1be47cb29d2a18bd42f9ce797d13e2f3-reviewer-response-1.md"
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
        "digest": "sha256:e492d2f60eeb9c9584c7156792f28d60dcafe3d80e3505092cfdf18b598e9ccd",
        "path": "docs/superpowers/peer-reviews/190-selection-scope-registration-wave2/spec/2026-10-12-2026-10-12-190-selection-scope-wave2-review-1be47cb29d2a18bd42f9ce797d13e2f3/review-1be47cb29d2a18bd42f9ce797d13e2f3-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    }
  ]
}
```
