<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "3628c87b8569b4384e76733603ebd3d62b11aced",
      "commit": "86e3bd766cca35bf5aa72134bc67d0b7cf9acf18",
      "digest": "sha256:ff734fee9a8e672a6cdd4323bd6485a28a2f9f4c080e7638390c4bfe8c98c7da",
      "path": "docs/superpowers/specs/2026-10-12-190-posix-read-pair-design.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "7e2929c1505cffaac33ad47bbfa7879d51079c26",
      "commit": "edd2413ea4f40659824199c5c1cdc8c691249e29",
      "digest": "sha256:3a4fae814b85411f7dd7d86559da35d14ae2f5e8cbfcc87c1bbe538df620668f",
      "path": "docs/superpowers/specs/2026-10-12-190-posix-read-pair-design.md",
      "snapshot": null,
      "turn": 1
    }
  ],
  "artifact_path": "docs/superpowers/specs/2026-10-12-190-posix-read-pair-design.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-3a81a360-64fe-40fa-b6ac-bc44b4f2aa7d",
      "claimed_at": "2026-10-12T15:27:20.443Z",
      "expires_at": "2026-10-12T23:27:20.443Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-12T15:27:20.443Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:aba3939cb10852e81c08dd53b270d2a597b6729050bfdc0e4c11ee476461d0cf"
    },
    {
      "claim_id": "claim-eceaed06-07a9-4626-a5aa-c4a0e7e9783f",
      "claimed_at": "2026-10-12T15:31:38.768Z",
      "expires_at": "2026-10-12T23:31:38.768Z",
      "host": "codex",
      "last_activity_at": "2026-10-12T15:31:38.768Z",
      "role": "author",
      "session_fingerprint": "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "edd2413ea4f40659824199c5c1cdc8c691249e29",
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
        "joined_at": "2026-10-12T15:23:57.307Z",
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
        "event_log_digest": "sha256:66ca0691be2725d643733b256230c66f25e1cc58286c0752632208be6dba1509",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-d78eaced00dc6bc0f0dcff9c21885a27",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-d78eaced00dc6bc0f0dcff9c21885a27",
        "root_review_id": "review-d78eaced00dc6bc0f0dcff9c21885a27",
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
      "joined_at": "2026-10-12T15:23:57.307Z",
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
          "fingerprint": "sha256:aba3939cb10852e81c08dd53b270d2a597b6729050bfdc0e4c11ee476461d0cf",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-12T15:27:20.340Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:aba3939cb10852e81c08dd53b270d2a597b6729050bfdc0e4c11ee476461d0cf"
    }
  },
  "record_id": "review-d78eaced00dc6bc0f0dcff9c21885a27",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-d78eaced00dc6bc0f0dcff9c21885a27",
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
  "startup_commit": "86e3bd766cca35bf5aa72134bc67d0b7cf9acf18",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "7e2929c1505cffaac33ad47bbfa7879d51079c26",
        "digest": "sha256:3a4fae814b85411f7dd7d86559da35d14ae2f5e8cbfcc87c1bbe538df620668f",
        "path": "docs/superpowers/specs/2026-10-12-190-posix-read-pair-design.md"
      },
      "author_response": {
        "digest": "sha256:668b8811488d2fd74b77a6d2cbfc11864a1faa94b45a7c0785b1e9712118c6da",
        "path": "docs/superpowers/peer-reviews/190-final-read-performance/spec/2026-10-12-2026-10-12-190-posix-read-pair-design-review-d78eaced00dc6bc0f0dcff9c21885a27/review-d78eaced00dc6bc0f0dcff9c21885a27-author-response-1.md"
      },
      "commit": "edd2413ea4f40659824199c5c1cdc8c691249e29",
      "decision": "revisions-requested",
      "finding_ids": [],
      "reviewer_response": {
        "digest": "sha256:e03eb7fbf3f639f092f13dd3480b8e71280e86bf7f9705661cfff33a0a28a677",
        "path": "docs/superpowers/peer-reviews/190-final-read-performance/spec/2026-10-12-2026-10-12-190-posix-read-pair-design-review-d78eaced00dc6bc0f0dcff9c21885a27/review-d78eaced00dc6bc0f0dcff9c21885a27-reviewer-response-1.md"
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
        "digest": "sha256:f16663c165169f05b4a3f14585ecd57054740f2fa8d943dd289aa4b4e2b3da41",
        "path": "docs/superpowers/peer-reviews/190-final-read-performance/spec/2026-10-12-2026-10-12-190-posix-read-pair-design-review-d78eaced00dc6bc0f0dcff9c21885a27/review-d78eaced00dc6bc0f0dcff9c21885a27-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    }
  ]
}
```
