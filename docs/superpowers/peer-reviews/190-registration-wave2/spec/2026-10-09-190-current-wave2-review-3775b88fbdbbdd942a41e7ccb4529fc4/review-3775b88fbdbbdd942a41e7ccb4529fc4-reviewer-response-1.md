<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-3775b88fbdbbdd942a41e7ccb4529fc4"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/190-current-wave2.md"
artifact_commit: "c460fed20ba0fb6bbe02302ee9340aa6956e4aef"
artifact_blob: "2761fec3fbfeeaa268d60fc7543508feb6171d31"
artifact_digest: "sha256:d43992ea840b4fd58244747770af0e905d68a8548f8212279323042dad36b23e"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-sonnet-5-5"
  model_display: "claude-sonnet-5-5"
  session_fingerprint: "sha256:fbeeba44cfab26dc42425271b7b15aaa1f7b11a56d6b125edc84fc51da00a5a5"
  identity_source: "runtime"
started_at: "2026-10-09T13:17:55.190Z"
submitted_at: "2026-10-09T13:18:21.173Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I read the artifact, `registration-index.json`, and the two registration records it pins (`source-a0e99c48...` win32 and `source-aa907980...` darwin) at their working-tree contents. Checked against the artifact's claims:

- The index lists exactly the two pinned captures, with paths matching the artifact.
- Both records use schema `ai-peer-review.process-source-registration/v1`.
- Both pin the same sourceCommit (`17c64188...`), inventoryDigest (`sha256:f53f4cbf...`) and contractDigest (`sha256:bf401a6e...`). The contract digest is the current contract named in the artifact.
- Tarball digests differ per platform, as expected for separate packages.
- `kinds` is `["absence"]` and `transitions` is `[]` in both. That matches the stated absence-only scope and the absence of any clock, timezone or DST authorization.
- Scope is finite and matches the artifact table:
  - win32 / 10.0.26100 / x64 / Node 26, probe `powershell.exe` with `local-cim-query` and `completed-cim-query-v1`.
  - darwin / 25.6.0 / arm64 / Node 26, probe `/bin/ps` with `same-user-full-selection` and `exact-ps-selection-v1`.
- The records contain only public keys, key IDs, host IDs and digests. I found no private bindings, credentials or provider handles.
- No Linux capture, native-free, activation or provider/reboot claim appears in the records.

Limits of this review:

- I could not run hashing commands in this session, so I did not independently recompute the blob and sha256 pins in the artifact. I also did not recompute the digests in the index.
- I did not inspect the GitHub Actions run, the frozen producer manifests, or the immutable authority readers.
- Those items are covered by the artifact's mechanical pre-capture checks and by the later class review.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. The registrations directory holds 21 records but the index lists only these 2. The artifact says first-wave records are excluded, so this looks intended. The artifact could still state explicitly that the index is wave-scoped, so a later reader does not read it as incomplete.
2. State in the artifact that the index `digest` values are canonical digests rather than raw file sha256. They differ from the artifact's `sha256` pins for the same files, and this is easy to misread.

## Decision

accepted
