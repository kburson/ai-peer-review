<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

> **NO-COMMIT TEST MODE** — authority assurance: `cryptographic-local`

```json
{
  "acceptance_basis": "human-override",
  "authority_assurance": "cryptographic-local",
  "commit_mode": "no-commit",
  "final_commit": null,
  "human_decision": {
    "decision": "accepted-over-objections",
    "unresolved_finding_ids": [
      "R1-F001"
    ]
  },
  "lineage_receipt": {
    "attempts": [
      {
        "consumed_grant_digest": null,
        "event_log_digest": "sha256:2222222222222222222222222222222222222222222222222222222222222222",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "golden-review",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "golden-review",
        "root_review_id": "golden-review",
        "successor_review_id": null
      }
    ],
    "complete": true,
    "schema": "ai-peer-review.lineage-receipt/v1"
  },
  "residual_risk": [
    "uncommitted-test-evidence",
    "detection-grade-authority"
  ],
  "review_id": "golden-review",
  "schema": "ai-peer-review.manifest/v1",
  "startup_commit": "1111111111111111111111111111111111111111",
  "status": "accepted-over-objections-uncommitted"
}
```
