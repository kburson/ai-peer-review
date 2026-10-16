<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "39cea5f79aaea91b2a1ad884ca5de076c840e7fb",
      "commit": "d2e029dc1ef4583aaa5718445fd7fad1bb794609",
      "digest": "sha256:cd8d08e2d985e86d5b1014cb02261ca102f2749228568b62729038c4735ad547",
      "path": "docs/superpowers/specs/2026-10-16-190-trusted-local-storage-design.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "27626a5680b297a5438944accbda908d4ab6db60",
      "commit": "8cfaed68c8983ce4b468c5a40a5f304d0d335eb1",
      "digest": "sha256:a2e6ed5f38a3efcd11b9112fedcfa812f71a698780b921ad80cf92eed5d0c735",
      "path": "docs/superpowers/specs/2026-10-16-190-trusted-local-storage-design.md",
      "snapshot": null,
      "turn": 1
    },
    {
      "blob": "16a16ac203f5710fe06d74df1425f9c030a86047",
      "commit": "2abbb37bb31c0c2e647af00d222a4b94a1ceb753",
      "digest": "sha256:14f24a8b64153f1a3d5877affb042b734829cb891fd62626888b84f7e1880291",
      "path": "docs/superpowers/plans/2026-10-16-190-trusted-local-storage.md",
      "snapshot": null,
      "turn": 3
    },
    {
      "blob": "54a0b07127ff21bceba0f4aebdc1935664b7fca4",
      "commit": "45d13462bb589af57bbaf94cd72585bbc686c717",
      "digest": "sha256:3877d9f738179099a14a5f75d18624c9bfd14aa71ad2991a8fd2bbd017b0acf0",
      "path": "docs/superpowers/plans/2026-10-16-190-trusted-local-storage.md",
      "snapshot": null,
      "turn": 4
    }
  ],
  "artifact_path": "docs/superpowers/plans/2026-10-16-190-trusted-local-storage.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-05eee2da-7008-48df-af9c-9938292f030f",
      "claimed_at": "2026-10-16T08:51:36.302Z",
      "expires_at": "2026-10-16T16:51:36.302Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-16T08:51:36.302Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:aa81aacd4ed7e02a555cd16840ba7caa1794f3ee25ee6bae1cd34a3c02ce8382"
    },
    {
      "claim_id": "claim-17b0fd3b-c828-4759-b8de-dab6d91f71ac",
      "claimed_at": "2026-10-16T08:53:42.675Z",
      "expires_at": "2026-10-16T16:53:42.675Z",
      "host": "codex",
      "last_activity_at": "2026-10-16T08:53:42.675Z",
      "role": "author",
      "session_fingerprint": "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "45d13462bb589af57bbaf94cd72585bbc686c717",
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
        "joined_at": "2026-10-16T08:49:05.605Z",
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
        "event_log_digest": "sha256:9effff3c799a7defdc24128a159d39432810db61046781a68bf523299fe279eb",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-c115d400865c99d3f2883d3a80d70007",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-c115d400865c99d3f2883d3a80d70007",
        "root_review_id": "review-c115d400865c99d3f2883d3a80d70007",
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
      "joined_at": "2026-10-16T08:49:05.605Z",
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
          "fingerprint": "sha256:aa81aacd4ed7e02a555cd16840ba7caa1794f3ee25ee6bae1cd34a3c02ce8382",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-16T08:51:36.263Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:aa81aacd4ed7e02a555cd16840ba7caa1794f3ee25ee6bae1cd34a3c02ce8382"
    }
  },
  "record_id": "review-c115d400865c99d3f2883d3a80d70007",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-c115d400865c99d3f2883d3a80d70007",
  "runtime": {
    "adapter_version": "1.0.0",
    "classification": "XPR",
    "ownership": "broker",
    "project_root_digest": "daa2d9b192cbfa47259ddb731215d23519fd9f7f3f059f6371f65f8220608698",
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
  "startup_commit": "d2e029dc1ef4583aaa5718445fd7fad1bb794609",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "27626a5680b297a5438944accbda908d4ab6db60",
        "digest": "sha256:a2e6ed5f38a3efcd11b9112fedcfa812f71a698780b921ad80cf92eed5d0c735",
        "path": "docs/superpowers/specs/2026-10-16-190-trusted-local-storage-design.md"
      },
      "author_response": {
        "digest": "sha256:4decefac13b00c93e241e83b8dabb5ac26f1df37b231a80dd511a69083050b64",
        "path": "docs/superpowers/peer-reviews/190-simple-local-handoff/spec/2026-10-16-2026-10-16-190-trusted-local-storage-design-review-c115d400865c99d3f2883d3a80d70007/review-c115d400865c99d3f2883d3a80d70007-author-response-1.md"
      },
      "commit": "8cfaed68c8983ce4b468c5a40a5f304d0d335eb1",
      "decision": "revisions-requested",
      "finding_ids": [],
      "reviewer_response": {
        "digest": "sha256:ecbf5b2d32b3ff439841663b7f3836255d59fcbabbfdb39ce3fb48e555263ced",
        "path": "docs/superpowers/peer-reviews/190-simple-local-handoff/spec/2026-10-16-2026-10-16-190-trusted-local-storage-design-review-c115d400865c99d3f2883d3a80d70007/review-c115d400865c99d3f2883d3a80d70007-reviewer-response-1.md"
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
        "digest": "sha256:7579825fc48d74a526460a879f31c2e6bfbbda97dc1889243c945e0c816cfe35",
        "path": "docs/superpowers/peer-reviews/190-simple-local-handoff/spec/2026-10-16-2026-10-16-190-trusted-local-storage-design-review-c115d400865c99d3f2883d3a80d70007/review-c115d400865c99d3f2883d3a80d70007-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    },
    {
      "artifact": {
        "blob": "16a16ac203f5710fe06d74df1425f9c030a86047",
        "digest": "sha256:14f24a8b64153f1a3d5877affb042b734829cb891fd62626888b84f7e1880291",
        "path": "docs/superpowers/plans/2026-10-16-190-trusted-local-storage.md"
      },
      "author_response": {
        "digest": "sha256:795345c389c0f7ed6e6742677ac13a93b1ddfcba88d2172bb0ad91daedbe5b72",
        "path": "docs/superpowers/peer-reviews/190-simple-local-handoff/spec/2026-10-16-2026-10-16-190-trusted-local-storage-design-review-c115d400865c99d3f2883d3a80d70007/review-c115d400865c99d3f2883d3a80d70007-author-response-3.md"
      },
      "commit": "2abbb37bb31c0c2e647af00d222a4b94a1ceb753",
      "decision": "revisions-requested",
      "finding_ids": [],
      "reviewer_response": {
        "digest": "sha256:e8bc7e2f0ce4d11b6fbd7961b6837a1659138bb1434dea9baded3eec315ac722",
        "path": "docs/superpowers/peer-reviews/190-simple-local-handoff/spec/2026-10-16-2026-10-16-190-trusted-local-storage-design-review-c115d400865c99d3f2883d3a80d70007/review-c115d400865c99d3f2883d3a80d70007-reviewer-response-3.md"
      },
      "snapshot": null,
      "turn": 3
    },
    {
      "artifact": {
        "blob": "54a0b07127ff21bceba0f4aebdc1935664b7fca4",
        "digest": "sha256:3877d9f738179099a14a5f75d18624c9bfd14aa71ad2991a8fd2bbd017b0acf0",
        "path": "docs/superpowers/plans/2026-10-16-190-trusted-local-storage.md"
      },
      "author_response": {
        "digest": "sha256:6ce119ce1d6e9a01f5541f506df637fa8496e98c7b76b72a7eae8798e89504d7",
        "path": "docs/superpowers/peer-reviews/190-simple-local-handoff/spec/2026-10-16-2026-10-16-190-trusted-local-storage-design-review-c115d400865c99d3f2883d3a80d70007/review-c115d400865c99d3f2883d3a80d70007-author-response-4.md"
      },
      "commit": "45d13462bb589af57bbaf94cd72585bbc686c717",
      "decision": "revisions-requested",
      "finding_ids": [],
      "reviewer_response": {
        "digest": "sha256:817757ac995ccf19c86cd90497041ac934625fcccb3051a3eec6ce53e73809de",
        "path": "docs/superpowers/peer-reviews/190-simple-local-handoff/spec/2026-10-16-2026-10-16-190-trusted-local-storage-design-review-c115d400865c99d3f2883d3a80d70007/review-c115d400865c99d3f2883d3a80d70007-reviewer-response-4.md"
      },
      "snapshot": null,
      "turn": 4
    },
    {
      "artifact": null,
      "author_response": null,
      "commit": null,
      "decision": "accepted",
      "finding_ids": [],
      "reviewer_response": {
        "digest": "sha256:8dc3fe2ec08c23fb35be84ecbeef155e27db119cbb433c2059cb882aef3dc61e",
        "path": "docs/superpowers/peer-reviews/190-simple-local-handoff/spec/2026-10-16-2026-10-16-190-trusted-local-storage-design-review-c115d400865c99d3f2883d3a80d70007/review-c115d400865c99d3f2883d3a80d70007-reviewer-response-5.md"
      },
      "snapshot": null,
      "turn": 5
    }
  ]
}
```
