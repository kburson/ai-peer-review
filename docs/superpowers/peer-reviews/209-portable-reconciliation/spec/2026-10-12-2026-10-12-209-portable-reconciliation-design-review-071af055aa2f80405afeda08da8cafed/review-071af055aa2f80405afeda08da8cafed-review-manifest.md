<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "cf0a1a77a71fbd28d8727f4ffca4050da0e9f93a",
      "commit": "32904e0d573987455dac7916293ce1dc50bd6d6c",
      "digest": "sha256:3add0088ef898106cb97c1b932b51f984f75a60f47349a50d487ac6311e1961c",
      "path": "docs/superpowers/specs/2026-10-12-209-portable-reconciliation-design.md",
      "snapshot": null,
      "turn": 0
    },
    {
      "blob": "48a818ad320cad6229388ac7e3d22885609c1790",
      "commit": "425e675f2774013551e8a0d355900f193bf448b2",
      "digest": "sha256:6e5cede02c93c0598bfeca553cb8dbfcdc7129ffe5792785fbae8171ada88b19",
      "path": "docs/superpowers/specs/2026-10-12-209-portable-reconciliation-design.md",
      "snapshot": null,
      "turn": 1
    },
    {
      "blob": "88a22293444722aff2856e935912c502eb322a16",
      "commit": "696e8d3df86e8996e3dba848defc1072ea773d07",
      "digest": "sha256:5c7920d29cb06d52984c7cd5e5d80c3b8db28ad0bfcf59875a0f47e95b4fd243",
      "path": "docs/superpowers/specs/2026-10-12-209-portable-reconciliation-design.md",
      "snapshot": null,
      "turn": 2
    },
    {
      "blob": "1e6dd764cbbbb02d19fc8f08418ebc5c9fe05a20",
      "commit": "f013b488547d0408a7c301d4f9dbb3c18e450d86",
      "digest": "sha256:053f48c867ca40506be15a29db513ac28dd81b982b99552a499e8e97c06b91c2",
      "path": "docs/superpowers/specs/2026-10-12-209-portable-reconciliation-design.md",
      "snapshot": null,
      "turn": 3
    },
    {
      "blob": "b5aa896a5783923bd38ea0ad0436746c95efe402",
      "commit": "ecca467107458a7d443d81750a6766bbb0efce29",
      "digest": "sha256:c9f6a44fbb45a477503a6b54675f5253afd567e96206f8075210a09eb72a75a8",
      "path": "docs/superpowers/plans/2026-10-12-209-portable-reconciliation.md",
      "snapshot": null,
      "turn": 5
    }
  ],
  "artifact_path": "docs/superpowers/plans/2026-10-12-209-portable-reconciliation.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-5ec45945-30a4-4458-ac58-963242ebe015",
      "claimed_at": "2026-10-12T19:21:54.052Z",
      "expires_at": "2026-10-13T03:21:54.052Z",
      "host": "claude-code",
      "last_activity_at": "2026-10-12T19:21:54.052Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:bb08761a852bbd80b75a86caf1b80d91ada22393fa0b77ab36d3c9e1b3c243a7"
    },
    {
      "claim_id": "claim-0ad4522c-fa32-4e96-bf0d-5b9df40acfc1",
      "claimed_at": "2026-10-12T19:25:49.956Z",
      "expires_at": "2026-10-13T03:25:49.956Z",
      "host": "codex",
      "last_activity_at": "2026-10-12T19:25:49.956Z",
      "role": "author",
      "session_fingerprint": "sha256:49863c1adf7739b218afe693008fc5de335f50b5fdaed3624eae7dc56df0e096"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "ecca467107458a7d443d81750a6766bbb0efce29",
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
        "joined_at": "2026-10-12T19:19:04.279Z",
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
        "event_log_digest": "sha256:67890e5ae9e013a0b97890c4922c843b79ea0e8f4582d6644e45413b06bc9bf2",
        "predecessor_review_id": null,
        "reciprocal_receipt_digest": null,
        "record_id": "review-071af055aa2f80405afeda08da8cafed",
        "recovery_claim_digest": null,
        "recovery_id": null,
        "recovery_ordinal": 0,
        "review_id": "review-071af055aa2f80405afeda08da8cafed",
        "root_review_id": "review-071af055aa2f80405afeda08da8cafed",
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
      "joined_at": "2026-10-12T19:19:04.279Z",
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
          "fingerprint": "sha256:bb08761a852bbd80b75a86caf1b80d91ada22393fa0b77ab36d3c9e1b3c243a7",
          "source": "environment-declaration"
        }
      },
      "host": "claude-code",
      "identity_source": "runtime",
      "joined_at": "2026-10-12T19:21:54.010Z",
      "model_display": "claude-opus-5-5",
      "model_id": "claude-opus-5-5",
      "provider": "anthropic",
      "role": "reviewer",
      "session_fingerprint": "sha256:bb08761a852bbd80b75a86caf1b80d91ada22393fa0b77ab36d3c9e1b3c243a7"
    }
  },
  "record_id": "review-071af055aa2f80405afeda08da8cafed",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-071af055aa2f80405afeda08da8cafed",
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
  "startup_commit": "32904e0d573987455dac7916293ce1dc50bd6d6c",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": {
        "blob": "48a818ad320cad6229388ac7e3d22885609c1790",
        "digest": "sha256:6e5cede02c93c0598bfeca553cb8dbfcdc7129ffe5792785fbae8171ada88b19",
        "path": "docs/superpowers/specs/2026-10-12-209-portable-reconciliation-design.md"
      },
      "author_response": {
        "digest": "sha256:75daf5a80bb095952d747794521e3cbc261f86efe2e23c58fcfead32d9674d20",
        "path": "docs/superpowers/peer-reviews/209-portable-reconciliation/spec/2026-10-12-2026-10-12-209-portable-reconciliation-design-review-071af055aa2f80405afeda08da8cafed/review-071af055aa2f80405afeda08da8cafed-author-response-1.md"
      },
      "commit": "425e675f2774013551e8a0d355900f193bf448b2",
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
        "digest": "sha256:50ee917e080320362f81aabda41b4d636517459a6d6ebbe5c4ef0734ecb6de58",
        "path": "docs/superpowers/peer-reviews/209-portable-reconciliation/spec/2026-10-12-2026-10-12-209-portable-reconciliation-design-review-071af055aa2f80405afeda08da8cafed/review-071af055aa2f80405afeda08da8cafed-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    },
    {
      "artifact": {
        "blob": "88a22293444722aff2856e935912c502eb322a16",
        "digest": "sha256:5c7920d29cb06d52984c7cd5e5d80c3b8db28ad0bfcf59875a0f47e95b4fd243",
        "path": "docs/superpowers/specs/2026-10-12-209-portable-reconciliation-design.md"
      },
      "author_response": {
        "digest": "sha256:6c8f209241185a4c1bb313a7e5a15da000c92f85ea67c9cec2df8fd1fbc1de27",
        "path": "docs/superpowers/peer-reviews/209-portable-reconciliation/spec/2026-10-12-2026-10-12-209-portable-reconciliation-design-review-071af055aa2f80405afeda08da8cafed/review-071af055aa2f80405afeda08da8cafed-author-response-2.md"
      },
      "commit": "696e8d3df86e8996e3dba848defc1072ea773d07",
      "decision": "revisions-requested",
      "finding_ids": [
        "R2-F001",
        "R2-F002",
        "R2-F003",
        "R2-F004",
        "R2-F005"
      ],
      "reviewer_response": {
        "digest": "sha256:d6aecc7fcdaa235eca537ce7c73b946c0f81b126ee8dae6dd29263040b2e60b8",
        "path": "docs/superpowers/peer-reviews/209-portable-reconciliation/spec/2026-10-12-2026-10-12-209-portable-reconciliation-design-review-071af055aa2f80405afeda08da8cafed/review-071af055aa2f80405afeda08da8cafed-reviewer-response-2.md"
      },
      "snapshot": null,
      "turn": 2
    },
    {
      "artifact": {
        "blob": "1e6dd764cbbbb02d19fc8f08418ebc5c9fe05a20",
        "digest": "sha256:053f48c867ca40506be15a29db513ac28dd81b982b99552a499e8e97c06b91c2",
        "path": "docs/superpowers/specs/2026-10-12-209-portable-reconciliation-design.md"
      },
      "author_response": {
        "digest": "sha256:a59b74cbb97a8cdd2a314b919cfcee6c25cecd6191e861aafbd615c470f09162",
        "path": "docs/superpowers/peer-reviews/209-portable-reconciliation/spec/2026-10-12-2026-10-12-209-portable-reconciliation-design-review-071af055aa2f80405afeda08da8cafed/review-071af055aa2f80405afeda08da8cafed-author-response-3.md"
      },
      "commit": "f013b488547d0408a7c301d4f9dbb3c18e450d86",
      "decision": "revisions-requested",
      "finding_ids": [
        "R3-F001",
        "R3-F002",
        "R3-F003",
        "R3-F004"
      ],
      "reviewer_response": {
        "digest": "sha256:c96d0c330a91e35516db2592fae8ada1092ce4f7db082540bec2049cc95f4a28",
        "path": "docs/superpowers/peer-reviews/209-portable-reconciliation/spec/2026-10-12-2026-10-12-209-portable-reconciliation-design-review-071af055aa2f80405afeda08da8cafed/review-071af055aa2f80405afeda08da8cafed-reviewer-response-3.md"
      },
      "snapshot": null,
      "turn": 3
    },
    {
      "artifact": null,
      "author_response": null,
      "commit": null,
      "decision": "accepted",
      "finding_ids": [
        "R4-F001",
        "R4-F002",
        "R4-F003"
      ],
      "reviewer_response": {
        "digest": "sha256:fc09654c6081e1a55b2e00f96536fd1bc2695da6b5a5ececb4dfa912b524ef0e",
        "path": "docs/superpowers/peer-reviews/209-portable-reconciliation/spec/2026-10-12-2026-10-12-209-portable-reconciliation-design-review-071af055aa2f80405afeda08da8cafed/review-071af055aa2f80405afeda08da8cafed-reviewer-response-4.md"
      },
      "snapshot": null,
      "turn": 4
    },
    {
      "artifact": {
        "blob": "b5aa896a5783923bd38ea0ad0436746c95efe402",
        "digest": "sha256:c9f6a44fbb45a477503a6b54675f5253afd567e96206f8075210a09eb72a75a8",
        "path": "docs/superpowers/plans/2026-10-12-209-portable-reconciliation.md"
      },
      "author_response": {
        "digest": "sha256:7e0eedd876fab377807d56518891d528c8f8755b0eec3ebd72569c2c23815f57",
        "path": "docs/superpowers/peer-reviews/209-portable-reconciliation/spec/2026-10-12-2026-10-12-209-portable-reconciliation-design-review-071af055aa2f80405afeda08da8cafed/review-071af055aa2f80405afeda08da8cafed-author-response-5.md"
      },
      "commit": "ecca467107458a7d443d81750a6766bbb0efce29",
      "decision": "revisions-requested",
      "finding_ids": [
        "R5-F001",
        "R5-F002",
        "R5-F003",
        "R5-F004",
        "R5-F005"
      ],
      "reviewer_response": {
        "digest": "sha256:1f7dadfda8d5cce24d0b7d95a4d95f64a835ccd548fa04e86b73db1688f1f029",
        "path": "docs/superpowers/peer-reviews/209-portable-reconciliation/spec/2026-10-12-2026-10-12-209-portable-reconciliation-design-review-071af055aa2f80405afeda08da8cafed/review-071af055aa2f80405afeda08da8cafed-reviewer-response-5.md"
      },
      "snapshot": null,
      "turn": 5
    },
    {
      "artifact": null,
      "author_response": null,
      "commit": null,
      "decision": "accepted",
      "finding_ids": [
        "R6-F001",
        "R6-F002"
      ],
      "reviewer_response": {
        "digest": "sha256:df9993840ca7792a493cc924f5b0936c2895b082c5bede4220e7510ed0f7167f",
        "path": "docs/superpowers/peer-reviews/209-portable-reconciliation/spec/2026-10-12-2026-10-12-209-portable-reconciliation-design-review-071af055aa2f80405afeda08da8cafed/review-071af055aa2f80405afeda08da8cafed-reviewer-response-6.md"
      },
      "snapshot": null,
      "turn": 6
    }
  ]
}
```
