<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "45f10c1ee7b67648349da2c4b337577a5531c44e",
      "commit": "cc0634a5d9c77445b3dc9d02e4f68475b165b4f3",
      "digest": "sha256:1f899ac9d79f20224efa12c07943eeef5aaf8b48206706efbfe58e50eb0a31ac",
      "path": "docs/superpowers/plans/2026-10-08-171-portable-consumer-decomposition.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "02464ee655266b8cacc0f40b7d5a78e67f36ede6",
      "commit": "ff6215232a73d96250f8d3b6f55ee2996f5f8ce7",
      "digest": "sha256:542ede0b72fb482ff873a3eb7446cc75e8cb49c321deb0bbd7261fa3dee9f3f9",
      "path": "docs/superpowers/plans/2026-10-08-171-portable-consumer-decomposition.md",
      "snapshot": null,
      "turn": 1
    },
    {
      "blob": "dd4d331c3fc20bbe60bf2b80d57d5423ce743e25",
      "commit": "d146eec71bf636ed93d5ad7aae7773f9a7e4f148",
      "digest": "sha256:94724c40f140e8cb2be97d6099e2241fcd8f1ed5293a85cdae799fd8a21b9d80",
      "path": "docs/superpowers/plans/2026-10-08-171-portable-consumer-decomposition.md",
      "snapshot": null,
      "turn": 2
    }
  ],
  "artifact_path": "docs/superpowers/plans/2026-10-08-171-portable-consumer-decomposition.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-0c4aa223-f1be-4552-8408-823d6f3db42a",
      "claimed_at": "2026-10-08T10:17:10.906Z",
      "expires_at": "2026-10-08T18:17:10.906Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-08T10:17:10.906Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:30bcadcebf970eea4d15c3089f78752c74407a7bb1cc034923c1733bbfe93baf"
    },
    {
      "claim_id": "claim-9b9ec79c-1693-4a30-bb78-d20951983cfa",
      "claimed_at": "2026-10-08T10:20:49.500Z",
      "expires_at": "2026-10-08T18:20:49.500Z",
      "host": "codex",
      "last_activity_at": "2026-10-08T10:20:49.500Z",
      "role": "author",
      "session_fingerprint": "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "d146eec71bf636ed93d5ad7aae7773f9a7e4f148",
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
        "joined_at": "2026-10-08T10:15:20.587Z",
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
        "event_log_digest": "sha256:dd927e6b61a8d1f78e30c8e31fc2a638bcd124f54554ba1f0f611cd02929852e",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-1fd31c736787ff0000e504880749a698",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-1fd31c736787ff0000e504880749a698",
        "root_review_id": "review-1fd31c736787ff0000e504880749a698",
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
      "joined_at": "2026-10-08T10:15:20.587Z",
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
          "fingerprint": "sha256:30bcadcebf970eea4d15c3089f78752c74407a7bb1cc034923c1733bbfe93baf",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-08T10:17:10.872Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:30bcadcebf970eea4d15c3089f78752c74407a7bb1cc034923c1733bbfe93baf"
    }
  },
  "record_id": "review-1fd31c736787ff0000e504880749a698",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-1fd31c736787ff0000e504880749a698",
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
    "project_root_digest": "bc4d102788d1930afb88917b017cb9a092e250061d21d8e578ac658b769bb47a",
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
  "startup_commit": "cc0634a5d9c77445b3dc9d02e4f68475b165b4f3",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "02464ee655266b8cacc0f40b7d5a78e67f36ede6",
        "digest": "sha256:542ede0b72fb482ff873a3eb7446cc75e8cb49c321deb0bbd7261fa3dee9f3f9",
        "path": "docs/superpowers/plans/2026-10-08-171-portable-consumer-decomposition.md"
      },
      "author_response": {
        "digest": "sha256:2fe288ef76a6903d6c58953e55197cba7607565b19d14d16442fd13d27cd6b92",
        "path": "docs/superpowers/peer-reviews/plan/2026-10-08-2026-10-08-171-portable-consumer-decomposition-review-1fd31c736787ff0000e504880749a698/review-1fd31c736787ff0000e504880749a698-author-response-1.md"
      },
      "commit": "ff6215232a73d96250f8d3b6f55ee2996f5f8ce7",
      "decision": "revisions-requested",
      "finding_ids": [
        "R1-F001",
        "R1-F002",
        "R1-F003",
        "R1-F004",
        "R1-F005",
        "R1-F006"
      ],
      "reviewer_response": {
        "digest": "sha256:8eb39789c94c9b5a7f5e3eaa4033de010da88779abe20cb2fe94a86e2fe53e15",
        "path": "docs/superpowers/peer-reviews/plan/2026-10-08-2026-10-08-171-portable-consumer-decomposition-review-1fd31c736787ff0000e504880749a698/review-1fd31c736787ff0000e504880749a698-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    },
    {
      "artifact": {
        "blob": "dd4d331c3fc20bbe60bf2b80d57d5423ce743e25",
        "digest": "sha256:94724c40f140e8cb2be97d6099e2241fcd8f1ed5293a85cdae799fd8a21b9d80",
        "path": "docs/superpowers/plans/2026-10-08-171-portable-consumer-decomposition.md"
      },
      "author_response": {
        "digest": "sha256:41500655453793698cc22564e5e1668f4ce8f0be3f81e563dcd3aaa4b38ffb25",
        "path": "docs/superpowers/peer-reviews/plan/2026-10-08-2026-10-08-171-portable-consumer-decomposition-review-1fd31c736787ff0000e504880749a698/review-1fd31c736787ff0000e504880749a698-author-response-2.md"
      },
      "commit": "d146eec71bf636ed93d5ad7aae7773f9a7e4f148",
      "decision": "revisions-requested",
      "finding_ids": [
        "R2-F001",
        "R2-F002",
        "R2-F003"
      ],
      "reviewer_response": {
        "digest": "sha256:f9ad0df69dcfd1b12b5683ed347b49ec4d7f7247e5edb2c9b6d8e1467b7fe225",
        "path": "docs/superpowers/peer-reviews/plan/2026-10-08-2026-10-08-171-portable-consumer-decomposition-review-1fd31c736787ff0000e504880749a698/review-1fd31c736787ff0000e504880749a698-reviewer-response-2.md"
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
        "digest": "sha256:1f327fe51ae39e9e92485a16182676628e7bf8550fe9c40417393397a9434248",
        "path": "docs/superpowers/peer-reviews/plan/2026-10-08-2026-10-08-171-portable-consumer-decomposition-review-1fd31c736787ff0000e504880749a698/review-1fd31c736787ff0000e504880749a698-reviewer-response-3.md"
      },
      "snapshot": null,
      "turn": 3
    }
  ]
}
```
