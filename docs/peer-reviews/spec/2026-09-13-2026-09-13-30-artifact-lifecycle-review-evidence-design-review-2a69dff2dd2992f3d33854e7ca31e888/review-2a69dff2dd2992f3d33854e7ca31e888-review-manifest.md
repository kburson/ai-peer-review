<!-- ai-peer-review-template version="1" digest="sha256:e53bf4d9991ae94a699fede1d62fd90324e45923de951babcb8d9ad237900bd9" -->

# Review manifest

Mode: `normal`

```json
{
  "acceptance_basis": "reviewer-consensus",
  "artifact_history": [
    {
      "blob": "d68b68a8052c3ad275a03044953270039fa24514",
      "commit": "1860a95c4ab6ebf859a2fe57146c720220c62480",
      "digest": "sha256:7323748682db6b92f8f6d7014b9acb16ffab09f65c73846a211f12873a42a0bb",
      "path": "docs/design/2026-09-13-30-artifact-lifecycle-review-evidence-design.md",
      "snapshot": null,
      "turn": 0
    }
  ],
  "artifact_path": "docs/design/2026-09-13-30-artifact-lifecycle-review-evidence-design.md",
  "authority": {
    "acceptance_attestation": null,
    "policy": "unavailable",
    "verifier": null
  },
  "authority_assurance": "unavailable",
  "claims": [
    {
      "claim_id": "claim-bb9a3b76-64e6-4e55-9375-28ff60efb6e7",
      "claimed_at": "2026-09-13T19:38:37.767Z",
      "expires_at": "2026-09-14T03:38:37.767Z",
      "host": "codex",
      "last_activity_at": "2026-09-13T19:38:37.767Z",
      "role": "reviewer",
      "session_fingerprint": "sha256:3202884546d6286efbfa995069c994c465265c68bfe7d00073d4bc60e341eca9"
    },
    {
      "claim_id": "claim-6401a98a-5be8-43ba-af1e-5d0f6c8438a2",
      "claimed_at": "2026-09-13T19:41:44.084Z",
      "expires_at": "2026-09-14T03:41:44.084Z",
      "host": "codex",
      "last_activity_at": "2026-09-13T19:41:44.084Z",
      "role": "author",
      "session_fingerprint": "sha256:8ad2fdc9024b73a08576fdf4bf2a1011ead688ea8f0399fc32e1312d5d052d5f"
    }
  ],
  "commit_mode": "normal",
  "final_commit": "1860a95c4ab6ebf859a2fe57146c720220c62480",
  "human_decision": null,
  "identity_changes": [],
  "participants": {
    "author": {
      "host": "codex",
      "identity_source": "runtime",
      "joined_at": "2026-09-13T19:37:18.030Z",
      "model_display": "GPT-5",
      "model_id": "gpt-5",
      "provider": "openai",
      "role": "author",
      "session_fingerprint": "sha256:8ad2fdc9024b73a08576fdf4bf2a1011ead688ea8f0399fc32e1312d5d052d5f"
    },
    "reviewer": {
      "host": "codex",
      "identity_source": "runtime",
      "joined_at": "2026-09-13T19:38:37.766Z",
      "model_display": "GPT-6 Astra",
      "model_id": "gpt-6-astra",
      "provider": "openai",
      "role": "reviewer",
      "session_fingerprint": "sha256:3202884546d6286efbfa995069c994c465265c68bfe7d00073d4bc60e341eca9"
    }
  },
  "record_id": "review-2a69dff2dd2992f3d33854e7ca31e888",
  "recoveries": [],
  "residual_risk": [
    "human-authority-unavailable"
  ],
  "review_id": "review-2a69dff2dd2992f3d33854e7ca31e888",
  "schema": "ai-peer-review.manifest/v1",
  "startup_commit": "1860a95c4ab6ebf859a2fe57146c720220c62480",
  "status": "accepted",
  "supplements": [],
  "turns": [
    {
      "artifact": null,
      "author_response": null,
      "commit": null,
      "decision": "accepted",
      "finding_ids": [],
      "reviewer_response": {
        "digest": "sha256:6b3f662294752c083221afebe2a5ad33f08e2cee8f16ea25dc5fc0ace734a446",
        "path": "docs/peer-reviews/spec/2026-09-13-2026-09-13-30-artifact-lifecycle-review-evidence-design-review-2a69dff2dd2992f3d33854e7ca31e888/review-2a69dff2dd2992f3d33854e7ca31e888-reviewer-response-1.md"
      },
      "snapshot": null,
      "turn": 1
    }
  ]
}
```
