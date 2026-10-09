<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "b4906bb95766a79a3e565b7f9dc9cdff2e0ed550",
      "commit": "cbc51d0008ab82f38602b8c58f3e3c5141482ba2",
      "digest": "sha256:46b31420fefcb70d1be6b493c0ba0df25122ae80bc3517643f1be06ed4b3b573",
      "path": "evidence/portable-runtime/contracts/runtime-contract-adoption.json",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "c4ff0df400d83b8e5a8f71f6216fc47679f1c598",
      "commit": "9414ec7cf317ed8f147d34116104b5418323dcaf",
      "digest": "sha256:cf697a60ad618ceac7caf2a6f46327cd57842f1582d890edcdd41d300d75c104",
      "path": "evidence/portable-runtime/contracts/runtime-contract-adoption.json",
      "snapshot": null,
      "turn": 1
    }
  ],
  "artifact_path": "evidence/portable-runtime/contracts/runtime-contract-adoption.json",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-5bd56913-dd7a-45b1-abdd-d18a14a805d8",
      "claimed_at": "2026-10-05T19:13:20.378Z",
      "expires_at": "2026-10-06T03:13:20.378Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-05T19:13:20.378Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:8759da882a138165c9a3fb63a94fafe5d4d7aafbf8bf9183362af2aaec278977"
    },
    {
      "claim_id": "claim-ffa6ac5c-5f52-4fdd-ad38-6c4e994d7338",
      "claimed_at": "2026-10-05T19:17:01.276Z",
      "expires_at": "2026-10-06T03:17:01.276Z",
      "host": "codex",
      "last_activity_at": "2026-10-05T19:17:01.276Z",
      "role": "author",
      "session_fingerprint": "sha256:e82e25e503f9341ba7bbc701cbc3ffb449d00fc799e793a05a7ad151171a82c5"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "9414ec7cf317ed8f147d34116104b5418323dcaf",
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
            "fingerprint": "sha256:e82e25e503f9341ba7bbc701cbc3ffb449d00fc799e793a05a7ad151171a82c5",
            "source": "official-runtime"
          }
        },
        "host": "codex",
        "identity_source": "runtime",
        "joined_at": "2026-10-05T19:10:53.490Z",
        "model_display": "gpt-6.1-sol",
        "model_id": "gpt-6.1-sol",
        "provider": "openai",
        "role": "author",
        "session_fingerprint": "sha256:e82e25e503f9341ba7bbc701cbc3ffb449d00fc799e793a05a7ad151171a82c5"
      },
      "role": "author",
      "sequence": 3
    }
  ],
  "lineage_receipt": {
    "attempts": [
      {
        "consumed_grant_digest": null,
        "event_log_digest": "sha256:29440f2d04b675f60f5596ddaf250602ccfca116e2fe023d939063612b72faff",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-6db86bd73e10967f9393c0a8403f9c12",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-6db86bd73e10967f9393c0a8403f9c12",
        "root_review_id": "review-6db86bd73e10967f9393c0a8403f9c12",
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
          "fingerprint": "sha256:e82e25e503f9341ba7bbc701cbc3ffb449d00fc799e793a05a7ad151171a82c5",
          "source": "official-runtime"
        }
      },
      "host": "codex",
      "identity_source": "runtime",
      "joined_at": "2026-10-05T19:10:53.490Z",
      "model_display": "gpt-6.1-sol",
      "model_id": "gpt-6.1-sol",
      "provider": "openai",
      "role": "author",
      "session_fingerprint": "sha256:e82e25e503f9341ba7bbc701cbc3ffb449d00fc799e793a05a7ad151171a82c5"
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
          "fingerprint": "sha256:8759da882a138165c9a3fb63a94fafe5d4d7aafbf8bf9183362af2aaec278977",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-05T19:13:20.340Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:8759da882a138165c9a3fb63a94fafe5d4d7aafbf8bf9183362af2aaec278977"
    }
  },
  "record_id": "review-6db86bd73e10967f9393c0a8403f9c12",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-6db86bd73e10967f9393c0a8403f9c12",
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
    "project_root_digest": "d660344c5c5d1c54352f8c7647efc28e3e7a1c2fe9d73d339736e03af45cf22e",
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
  "startup_commit": "cbc51d0008ab82f38602b8c58f3e3c5141482ba2",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "c4ff0df400d83b8e5a8f71f6216fc47679f1c598",
        "digest": "sha256:cf697a60ad618ceac7caf2a6f46327cd57842f1582d890edcdd41d300d75c104",
        "path": "evidence/portable-runtime/contracts/runtime-contract-adoption.json"
      },
      "author_response": {
        "digest": "sha256:8fe10238bb0c87fc44c1d1d55b44dce487c1cb5bbb240f128c4d98613b3c51be",
        "path": "docs/superpowers/peer-reviews/plan/2026-10-05-runtime-contract-adoption-review-6db86bd73e10967f9393c0a8403f9c12/review-6db86bd73e10967f9393c0a8403f9c12-author-response-1.md"
      },
      "commit": "9414ec7cf317ed8f147d34116104b5418323dcaf",
      "decision": "revisions-requested",
      "finding_ids": [
        "R1-F001",
        "R1-F002",
        "R1-F003",
        "R1-F004",
        "R1-F005"
      ],
      "reviewer_response": {
        "digest": "sha256:0152f5a3be1bb831589dbe37ed5906f6fc48988623c378c6b5ce7a2e636e1bae",
        "path": "docs/superpowers/peer-reviews/plan/2026-10-05-runtime-contract-adoption-review-6db86bd73e10967f9393c0a8403f9c12/review-6db86bd73e10967f9393c0a8403f9c12-reviewer-response-1.md"
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
        "digest": "sha256:3bac2a635050c898009347623019d08df93be833265548b6cc8fe378a80cd8e7",
        "path": "docs/superpowers/peer-reviews/plan/2026-10-05-runtime-contract-adoption-review-6db86bd73e10967f9393c0a8403f9c12/review-6db86bd73e10967f9393c0a8403f9c12-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    }
  ]
}
```
