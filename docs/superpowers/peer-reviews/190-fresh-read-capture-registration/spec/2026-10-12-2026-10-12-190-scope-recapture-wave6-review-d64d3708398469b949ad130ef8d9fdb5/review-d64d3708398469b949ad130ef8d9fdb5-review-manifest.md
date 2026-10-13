<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "49ce80d582a95a2db70bcbdf5c0abdcccbc7880b",
      "commit": "86a703595ced7c806c31eee65eb5ab30f36f8bc9",
      "digest": "sha256:69e2fc556a4c432a2d19a7a4bba3d152629cd4a5e670bdf33df1131977a38fd5",
      "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave6.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "e003d6066f99c46ea64f7a825f0e78a9a9568202",
      "commit": "5444fd01db7722936c468ed66eb8507d06654a16",
      "digest": "sha256:8abd6294a9bf1ffd8c83bf4db0c96accac5edb2908ce97335695e59f4f1b5b77",
      "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave6.md",
      "snapshot": null,
      "turn": 1
    }
  ],
  "artifact_path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave6.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-e387665b-a984-4140-8f1c-bf0d13a6cb1c",
      "claimed_at": "2026-10-12T16:41:37.433Z",
      "expires_at": "2026-10-13T00:41:37.433Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-12T16:41:37.433Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:1c665df6f34ae10b6ddad0bb12ebc73f09190c69c39b3a04643cf96055aa6894"
    },
    {
      "claim_id": "claim-c0013ece-7d46-4390-9a7f-eb96648c3f0b",
      "claimed_at": "2026-10-12T16:44:14.790Z",
      "expires_at": "2026-10-13T00:44:14.790Z",
      "host": "codex",
      "last_activity_at": "2026-10-12T16:44:14.790Z",
      "role": "author",
      "session_fingerprint": "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "5444fd01db7722936c468ed66eb8507d06654a16",
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
        "joined_at": "2026-10-12T16:38:32.178Z",
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
        "event_log_digest": "sha256:44e10a55bb5e0dfd852b27c351e03a05096fa4193675178c645440e85a317be1",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-d64d3708398469b949ad130ef8d9fdb5",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-d64d3708398469b949ad130ef8d9fdb5",
        "root_review_id": "review-d64d3708398469b949ad130ef8d9fdb5",
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
      "joined_at": "2026-10-12T16:38:32.178Z",
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
          "fingerprint": "sha256:1c665df6f34ae10b6ddad0bb12ebc73f09190c69c39b3a04643cf96055aa6894",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-12T16:41:37.402Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:1c665df6f34ae10b6ddad0bb12ebc73f09190c69c39b3a04643cf96055aa6894"
    }
  },
  "record_id": "review-d64d3708398469b949ad130ef8d9fdb5",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-d64d3708398469b949ad130ef8d9fdb5",
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
  "startup_commit": "86a703595ced7c806c31eee65eb5ab30f36f8bc9",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "e003d6066f99c46ea64f7a825f0e78a9a9568202",
        "digest": "sha256:8abd6294a9bf1ffd8c83bf4db0c96accac5edb2908ce97335695e59f4f1b5b77",
        "path": "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave6.md"
      },
      "author_response": {
        "digest": "sha256:0ad28e6b8dbc0653d95a6d655486a3f6522470a30c8f2a46b53aba315419ab97",
        "path": "docs/superpowers/peer-reviews/190-fresh-read-capture-registration/spec/2026-10-12-2026-10-12-190-scope-recapture-wave6-review-d64d3708398469b949ad130ef8d9fdb5/review-d64d3708398469b949ad130ef8d9fdb5-author-response-1.md"
      },
      "commit": "5444fd01db7722936c468ed66eb8507d06654a16",
      "decision": "revisions-requested",
      "finding_ids": [
        "R1-F001",
        "R1-F002",
        "R1-F003",
        "R1-F004"
      ],
      "reviewer_response": {
        "digest": "sha256:12915a18924da94e201d07b724869c0f0e7add4d6df7293235935ae8aca1d8ac",
        "path": "docs/superpowers/peer-reviews/190-fresh-read-capture-registration/spec/2026-10-12-2026-10-12-190-scope-recapture-wave6-review-d64d3708398469b949ad130ef8d9fdb5/review-d64d3708398469b949ad130ef8d9fdb5-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    },
    {
      "artifact": null,
      "author_response": null,
      "commit": null,
      "decision": "accepted",
      "finding_ids": [
        "R2-F001"
      ],
      "reviewer_response": {
        "digest": "sha256:2060a50f0d9dd448adef30e48a9a1a7a0f70bcea7ea199cedd22fcbc8ebc93d5",
        "path": "docs/superpowers/peer-reviews/190-fresh-read-capture-registration/spec/2026-10-12-2026-10-12-190-scope-recapture-wave6-review-d64d3708398469b949ad130ef8d9fdb5/review-d64d3708398469b949ad130ef8d9fdb5-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    }
  ]
}
```
