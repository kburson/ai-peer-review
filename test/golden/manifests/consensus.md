<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "authority_assurance": "unavailable",
  "commit_mode": "normal",
  "final_commit": "1111111111111111111111111111111111111111",
  "human_decision": null,
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
    "human-authority-unavailable"
  ],
  "review_id": "golden-review",
  "schema": "ai-peer-review.manifest/v1",
  "startup_commit": "1111111111111111111111111111111111111111",
  "status": "accepted"
}
```
