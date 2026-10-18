<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

> **LOCAL JOURNAL MODE** — authority assurance: `unavailable`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "e76bfc15addd465689e80e788a9e5fae6b0cf101",
      "commit": "3a5293b9093fbf56288427f701356b5e2b7b6dc3",
      "digest": "sha256:139414a3851a2edc04d429805cc1c0cc656635745ee287409089e3acb1f3cee8",
      "path": "docs/superpowers/plans/2026-10-18-222-review-journal-refactoring.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "219939e315d1238967adf15f775480f9ed93ce5b",
      "commit": null,
      "digest": "sha256:40f42a01820509ed7d24afe13291fdceabe0f1bd565da0548191da065951afb7",
      "path": "docs/superpowers/plans/2026-10-18-222-review-journal-refactoring.md",
      "snapshot": {
        "digest": "sha256:40f42a01820509ed7d24afe13291fdceabe0f1bd565da0548191da065951afb7",
        "path": "artifacts/turn-1.md"
      },
      "turn": 1
    }
  ],
  "artifact_path": "docs/superpowers/plans/2026-10-18-222-review-journal-refactoring.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-ec1bc3f6-e4ac-4bf0-b6f6-fe80b2005910",
      "claimed_at": "2026-10-18T16:36:06.691Z",
      "expires_at": "2026-10-19T00:36:06.691Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-18T16:36:06.691Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:2747565d67cc695469ddbcc259a7b78ad2e7cb7ec3f0bb6a76318a646cba5782"
    },
    {
      "claim_id": "claim-fbc78042-c5f3-4c33-bd4c-da4080f8eb78",
      "claimed_at": "2026-10-18T16:42:22.420Z",
      "expires_at": "2026-10-19T00:42:22.420Z",
      "host": "codex",
      "last_activity_at": "2026-10-18T16:42:22.420Z",
      "role": "author",
      "session_fingerprint": "sha256:c461b2e059f05b969535032dbbde30bce35139b36410e0f988636e55f78c75ba"
    }
  ],
  "commit_mode": "no-commit",
  "final_commit": null,
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
            "fingerprint": "sha256:c461b2e059f05b969535032dbbde30bce35139b36410e0f988636e55f78c75ba",
            "source": "environment-declaration"
          }
        },
        "host": "codex",
        "identity_source": "runtime",
        "joined_at": "2026-10-18T16:35:08.430Z",
        "model_display": "gpt-6-astra",
        "model_id": "gpt-6-astra",
        "provider": "openai",
        "role": "author",
        "session_fingerprint": "sha256:c461b2e059f05b969535032dbbde30bce35139b36410e0f988636e55f78c75ba"
      },
      "role": "author",
      "sequence": 3
    }
  ],
  "lineage_receipt": {
    "attempts": [
      {
        "consumed_grant_digest": null,
        "event_log_digest": "sha256:3a4f7d107cd9c54f0637103fb0ba7ce65373409df441b0e9ecdc91b825ee3e1e",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-ae67aea5b6c2c817e8cd1162ee9af02e",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-ae67aea5b6c2c817e8cd1162ee9af02e",
        "root_review_id": "review-ae67aea5b6c2c817e8cd1162ee9af02e",
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
          "fingerprint": "sha256:c461b2e059f05b969535032dbbde30bce35139b36410e0f988636e55f78c75ba",
          "source": "environment-declaration"
        }
      },
      "host": "codex",
      "identity_source": "runtime",
      "joined_at": "2026-10-18T16:35:08.430Z",
      "model_display": "gpt-6-astra",
      "model_id": "gpt-6-astra",
      "provider": "openai",
      "role": "author",
      "session_fingerprint": "sha256:c461b2e059f05b969535032dbbde30bce35139b36410e0f988636e55f78c75ba"
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
          "fingerprint": "sha256:2747565d67cc695469ddbcc259a7b78ad2e7cb7ec3f0bb6a76318a646cba5782",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-18T16:36:06.655Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:2747565d67cc695469ddbcc259a7b78ad2e7cb7ec3f0bb6a76318a646cba5782"
    }
  },
  "record_id": "review-ae67aea5b6c2c817e8cd1162ee9af02e",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-ae67aea5b6c2c817e8cd1162ee9af02e",
  "runtime": {
    "adapter_version": "1.0.0",
    "classification": "XPR",
    "ownership": "broker",
    "project_root_digest": "27454cb2265e8f459e70ff0e93fda9a0bf75aecf32dcfeed3dd80422593badd8",
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
  "startup_commit": "3a5293b9093fbf56288427f701356b5e2b7b6dc3",
  "status": "accepted-uncommitted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "219939e315d1238967adf15f775480f9ed93ce5b",
        "digest": "sha256:40f42a01820509ed7d24afe13291fdceabe0f1bd565da0548191da065951afb7",
        "path": "docs/superpowers/plans/2026-10-18-222-review-journal-refactoring.md"
      },
      "author_response": {
        "digest": "sha256:3e6531f5807f416179309b71fc349b4bed1764b3216848443e4041d8555a2095",
        "path": "docs/superpowers/peer-reviews/plan/222-plan-xpr/plan/2026-10-18-2026-10-18-222-review-journal-refactoring-review-ae67aea5b6c2c817e8cd1162ee9af02e/review-ae67aea5b6c2c817e8cd1162ee9af02e-author-response-1.md"
      },
      "commit": null,
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
        "digest": "sha256:9a3daf4db1a9046f0e3ba21b0d57a4541ffd3b2909a3750fdd04175897fb3444",
        "path": "docs/superpowers/peer-reviews/plan/222-plan-xpr/plan/2026-10-18-2026-10-18-222-review-journal-refactoring-review-ae67aea5b6c2c817e8cd1162ee9af02e/review-ae67aea5b6c2c817e8cd1162ee9af02e-reviewer-response-1.md"
      },
      "snapshot": {
        "digest": "sha256:40f42a01820509ed7d24afe13291fdceabe0f1bd565da0548191da065951afb7",
        "path": "artifacts/turn-1.md"
      },
      "turn": 1
    },
    {
      "artifact": null,
      "author_response": null,
      "commit": null,
      "decision": "accepted",
      "finding_ids": [
        "R2-F001",
        "R2-F002"
      ],
      "reviewer_response": {
        "digest": "sha256:eaa0ba1027d9e22dbd7e202365fb181d9fac79792abc9978ca0798badd21e8c0",
        "path": "docs/superpowers/peer-reviews/plan/222-plan-xpr/plan/2026-10-18-2026-10-18-222-review-journal-refactoring-review-ae67aea5b6c2c817e8cd1162ee9af02e/review-ae67aea5b6c2c817e8cd1162ee9af02e-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    }
  ]
}
```
