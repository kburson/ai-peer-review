<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "e7d759eff5c9b52684e0c5a21ff34c9e3ee76830",
      "commit": "15d12a98929b7f9e9323fff64e092d5adbfe789e",
      "digest": "sha256:d0f97497c5c943cc91ba98ecf5567d94302a16dbd34eb42929c712b88560da01",
      "path": "docs/superpowers/specs/2026-09-29-117-broker-recovery-design.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "7ce62fbdcf33252525da6011dd65a8a3354b37b9",
      "commit": "90c52cf4283247df813e25af81a847d6ed4c03a9",
      "digest": "sha256:e1913f494b40f3ab219b7f701c25bd3f7f4c840d9c1db2da9d8345015566eee4",
      "path": "docs/superpowers/specs/2026-09-29-117-broker-recovery-design.md",
      "snapshot": null,
      "turn": 1
    },
    {
      "blob": "72dcf3cfbe01a601c2257a319263ca2a37f7d8ab",
      "commit": "f7a3e768d48e0268047533983ef7d6f3c82aad47",
      "digest": "sha256:26925c81f8f25a8cf32036d045f50bcac0bd50abc6aad09f94fa2cc6d3f126c4",
      "path": "docs/superpowers/specs/2026-09-29-117-broker-recovery-design.md",
      "snapshot": null,
      "turn": 2
    }
  ],
  "artifact_path": "docs/superpowers/specs/2026-09-29-117-broker-recovery-design.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-076e0c06-eaaa-41dc-b7ba-c6cd171de536",
      "claimed_at": "2026-09-29T07:42:09.739Z",
      "expires_at": "2026-09-29T15:42:09.739Z",
      "host": "claude-code",
      "last_activity_at": "2026-09-29T07:42:09.739Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:66d3485fe57e23ef8c01f33654561eae3e84297dd36d887c3243dd6a227da51c"
    },
    {
      "claim_id": "claim-70255f97-5375-48d8-b9b3-13a25aff4969",
      "claimed_at": "2026-09-29T07:46:12.310Z",
      "expires_at": "2026-09-29T15:46:12.310Z",
      "host": "codex",
      "last_activity_at": "2026-09-29T07:46:12.310Z",
      "role": "author",
      "session_fingerprint": "sha256:5c30856b9b2027f149ff8df91c0ea36bc764abd58e76541ba4f224c95e438d62"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "f7a3e768d48e0268047533983ef7d6f3c82aad47",
  "human_decision": null,
  "identity_changes": [
    {
      "identity": {
        "evidence": {
          "model": {
            "assurance": "declared",
            "conflict": false,
            "declared_id": "gpt-6-astra",
            "observed_id": null,
            "requested_id": null,
            "source": "environment-declaration"
          },
          "session": {
            "assurance": "declared",
            "fingerprint": "sha256:5c30856b9b2027f149ff8df91c0ea36bc764abd58e76541ba4f224c95e438d62",
            "source": "environment-declaration"
          }
        },
        "host": "codex",
        "identity_source": "runtime",
        "joined_at": "2026-09-29T07:40:30.944Z",
        "model_display": "GPT-6 Astra",
        "model_id": "gpt-6-astra",
        "provider": "openai",
        "role": "author",
        "session_fingerprint": "sha256:5c30856b9b2027f149ff8df91c0ea36bc764abd58e76541ba4f224c95e438d62"
      },
      "role": "author",
      "sequence": 3
    }
  ],
  "lineage_receipt": {
    "attempts": [
      {
        "consumed_grant_digest": null,
        "event_log_digest": "sha256:bdd34e6f96045f1b17c21dcd3cd1a61f4bc63707f6267eba1c41125a77f391f7",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-05b472f0d8ed4866d16288adb821eaf2",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-05b472f0d8ed4866d16288adb821eaf2",
        "root_review_id": "review-05b472f0d8ed4866d16288adb821eaf2",
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
          "declared_id": "gpt-6-astra",
          "observed_id": null,
          "requested_id": null,
          "source": "environment-declaration"
        },
        "session": {
          "assurance": "declared",
          "fingerprint": "sha256:5c30856b9b2027f149ff8df91c0ea36bc764abd58e76541ba4f224c95e438d62",
          "source": "environment-declaration"
        }
      },
      "host": "codex",
      "identity_source": "runtime",
      "joined_at": "2026-09-29T07:40:30.944Z",
      "model_display": "GPT-6 Astra",
      "model_id": "gpt-6-astra",
      "provider": "openai",
      "role": "author",
      "session_fingerprint": "sha256:5c30856b9b2027f149ff8df91c0ea36bc764abd58e76541ba4f224c95e438d62"
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
          "fingerprint": "sha256:66d3485fe57e23ef8c01f33654561eae3e84297dd36d887c3243dd6a227da51c",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-09-29T07:42:09.710Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:66d3485fe57e23ef8c01f33654561eae3e84297dd36d887c3243dd6a227da51c"
    }
  },
  "record_id": "review-05b472f0d8ed4866d16288adb821eaf2",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-05b472f0d8ed4866d16288adb821eaf2",
  "runtime": {
    "adapter_version": "1.0.0",
    "classification": "XPR",
    "ownership": "broker",
    "project_root_digest": "797f8e2263f0741c249ec8d94b10e99f3fdbc57b4a20465c87cece16f36f9090",
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
  "startup_commit": "15d12a98929b7f9e9323fff64e092d5adbfe789e",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "7ce62fbdcf33252525da6011dd65a8a3354b37b9",
        "digest": "sha256:e1913f494b40f3ab219b7f701c25bd3f7f4c840d9c1db2da9d8345015566eee4",
        "path": "docs/superpowers/specs/2026-09-29-117-broker-recovery-design.md"
      },
      "author_response": {
        "digest": "sha256:6585835c332e7b46560c560619a6aaa75fe72456d37f02cf150afde856fe90e4",
        "path": "docs/superpowers/peer-reviews/verified/spec/2026-09-29-2026-09-29-117-broker-recovery-design-review-05b472f0d8ed4866d16288adb821eaf2/review-05b472f0d8ed4866d16288adb821eaf2-author-response-1.md"
      },
      "commit": "90c52cf4283247df813e25af81a847d6ed4c03a9",
      "decision": "revisions-requested",
      "finding_ids": [
        "R1-F001",
        "R1-F002",
        "R1-F003",
        "R1-F004",
        "R1-F005",
        "R1-F006",
        "R1-F007",
        "R1-F008",
        "R1-F009"
      ],
      "reviewer_response": {
        "digest": "sha256:234308b4c7e5eb71310083efc80fe1342d842eb5a73f9fe2f954427894879428",
        "path": "docs/superpowers/peer-reviews/verified/spec/2026-09-29-2026-09-29-117-broker-recovery-design-review-05b472f0d8ed4866d16288adb821eaf2/review-05b472f0d8ed4866d16288adb821eaf2-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    },
    {
      "artifact": {
        "blob": "72dcf3cfbe01a601c2257a319263ca2a37f7d8ab",
        "digest": "sha256:26925c81f8f25a8cf32036d045f50bcac0bd50abc6aad09f94fa2cc6d3f126c4",
        "path": "docs/superpowers/specs/2026-09-29-117-broker-recovery-design.md"
      },
      "author_response": {
        "digest": "sha256:8b68aebade87a6ba422bdc7fb956eca736940371c11af524038f7a350a7e7701",
        "path": "docs/superpowers/peer-reviews/verified/spec/2026-09-29-2026-09-29-117-broker-recovery-design-review-05b472f0d8ed4866d16288adb821eaf2/review-05b472f0d8ed4866d16288adb821eaf2-author-response-2.md"
      },
      "commit": "f7a3e768d48e0268047533983ef7d6f3c82aad47",
      "decision": "revisions-requested",
      "finding_ids": [
        "R2-F001",
        "R2-F002"
      ],
      "reviewer_response": {
        "digest": "sha256:74749da3d19811ecb521872204896ffa1660643f2255644ca0bbd7d69828d1e6",
        "path": "docs/superpowers/peer-reviews/verified/spec/2026-09-29-2026-09-29-117-broker-recovery-design-review-05b472f0d8ed4866d16288adb821eaf2/review-05b472f0d8ed4866d16288adb821eaf2-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    },
    {
      "artifact": null,
      "author_response": null,
      "commit": null,
      "decision": "accepted",
      "finding_ids": [
        "R3-F001"
      ],
      "reviewer_response": {
        "digest": "sha256:af3a30a731a4ed850d581bedb9616e6e9b28ab9095b5ee56253587d50a99d4f3",
        "path": "docs/superpowers/peer-reviews/verified/spec/2026-09-29-2026-09-29-117-broker-recovery-design-review-05b472f0d8ed4866d16288adb821eaf2/review-05b472f0d8ed4866d16288adb821eaf2-reviewer-response-3.md"
      },
      "snapshot": null,
      "turn": 3
    }
  ]
}
```
