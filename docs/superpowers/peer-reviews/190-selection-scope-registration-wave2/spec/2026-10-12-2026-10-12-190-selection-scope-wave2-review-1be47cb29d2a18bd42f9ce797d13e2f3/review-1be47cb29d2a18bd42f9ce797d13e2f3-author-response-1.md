<!-- ai-peer-review-template version="1" digest="sha256:f81da1894a46ceb20866070833b4e99ef536ef633542b418783d29e6a981dbd8" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-1be47cb29d2a18bd42f9ce797d13e2f3"
role: "author"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-selection-scope-wave2.md"
artifact_commit: "fdf6dfd7e647fe73a061c5d2d1a8d3e7d6f30883"
artifact_blob: "f1279b9f2c27538e1b5b6d072cf47a3d3b8d8069"
artifact_digest: "sha256:44c4797e8c7c764dced8dca94e23d9800ae6099650dfeaa852d44b1cf1720e3b"
agent:
  host: "codex"
  provider: "openai"
  model_id: "gpt-6.1-sol"
  model_display: "gpt-6.1-sol"
  session_fingerprint: "sha256:3360e116e28ffcee773a4e3ea34dd0578d5ef69a6b6d7df268f0693489c2d4be"
  identity_source: "runtime"
started_at: "2026-10-12T05:34:01.539Z"
submitted_at: "2026-10-12T05:42:51.870Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

Corrected the preserved wave-1 scope to name all five registrations, including Linux Node 26 creation and absence. Clarified that macOS and Linux share the exact tarball digest while Windows differs.

## Finding dispositions

Required change 1: addressed. The prose now lists Linux Node 24/26 creation and absence plus Windows Node 24 absence, pinned by the existing approved index revision c2b1bf8. These are the actual five wave-1 registrations; the wording no longer omits Linux Node 26 or its separately authorized clock controls.

Optional suggestion 1: addressed. The record's exact tarball is identified as identical to Linux, with only Windows differing. This explains the observed equal digest without implying a host or signing-key identity is shared.

## Changes made

Only the two prose phrases above and this exact author response changed. The scope table, JSON block, current index and registration bytes at eb3f510 remain unchanged. No source, driver, workflow, package policy, capture tuple or authority condition changed.

## Declined changes and rationale

None.

## Verification

Read all five wave-1 records and their approved index references to verify the preserved finite scopes. Compared actual macOS/Linux/Windows package digests and checked that the source/contract/inventory agree. Verified the full subject JSON block is byte-identical before and after. Markdown format/lint pass. Actual signatures and the complete unchanged producer tree remain independently checked by the immutable reader at use time; no class, adoption, Windows performance or #190/#107 delivery claim follows.
