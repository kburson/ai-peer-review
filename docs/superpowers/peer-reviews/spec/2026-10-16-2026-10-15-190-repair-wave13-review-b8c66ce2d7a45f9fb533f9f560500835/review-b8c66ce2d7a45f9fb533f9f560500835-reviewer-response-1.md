<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-b8c66ce2d7a45f9fb533f9f560500835"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/2026-10-15-190-repair-wave13.md"
artifact_commit: "451015b03d8bd6c748f95832762e31827b7c1a3b"
artifact_blob: "3949a50a6468238d28a231f1c26b55a1ae7db5ff"
artifact_digest: "sha256:b06778f9d23f13dfa080a5c76e5ef9c6b48efb81c9d98c69592da77984c40ab7"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:c3364bbd60b691a802884d89ad390da13a5624a0da75cd038b60ab3e6b85a4bc"
  identity_source: "runtime"
started_at: "2026-10-16T01:25:23.265Z"
submitted_at: "2026-10-16T01:26:31.387Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the wave-13 registration index (`evidence/portable-runtime/process-source/registration-reviews/2026-10-15-190-repair-wave13.md`). It covers exactly two absence registrations, darwin Node 26 and win32 Node 26, from hosted run 38832691552 attempt 1 at source `91fa4acdfdd5f3a16930cdbc4ad1a735ef440443`. I checked it against the working-tree copies of both registration records, the current `registration-index.json` and the sibling wave-12 index.

Verified by direct inspection of the working-tree files:

- **Table matches records.** `source-321bef39e75cc5b1ff5b7af9ed2ec67b` is darwin / 25.6.0 / arm64 / nodeMajor 26 / kinds `["absence"]`. `source-e7af404e080b0f2665ee05bff241a5c5` is win32 / 10.0.26100 / x64 / nodeMajor 26 / kinds `["absence"]`. Both have `transitions: []`.
- **Package tuples match the prose.** darwin tarball is `sha256:8d42ec62…9ebe3`. win32 tarball is `sha256:0ac59445…deab21`. Both records have inventory `sha256:671b62eb…5ac6`, contract `sha256:e9793b09…2c66e` and sourceCommit `91fa4acd…0443`. These are identical to the wave-12 values for the same platforms.
- **Two host hashes and two keys, all distinct.** Host IDs are `sha256:11783a04…` and `sha256:157bd82f…`. Key IDs are `sha256:99f1ac7b…` and `sha256:6e4192d8…`. The public keys also differ. None of these collide with the wave-12 darwin/win32 Node 24 registrations (`4cebaecf…`, `2df36702…`). This is consistent with "separate hosted workers and distinct keys".
- **Probe bindings are finite and consistent with the Node 24 counterparts.** darwin uses `/bin/ps`, `same-user-full-selection`, `exact-ps-selection-v1`, version `sha256:62c342e1…940f`. win32 uses the system PowerShell path, `local-cim-query`, `completed-cim-query-v1`, version `sha256:54b68d39…4366`.
- **No excluded material.** Neither record contains private keys, raw host identifiers, SIDs, user-profile paths, credentials or provider handles. The probe paths are fixed system paths.
- **Index contents.** The working-tree `registration-index.json` lists exactly these two captureIds and paths, with canonical-record digests. That matches the claim that the index covers only these two registrations and excludes the six wave-12 registrations.
- **Scope is not widened.** The prose permits absence only, with empty transitions. It authorizes no clock, timezone, DST or privilege change, and it adds no creation registration. It explicitly disclaims aggregate success, completed signed capture, class admission, and any approval carried over from run 38826982156. The other incomplete items are listed and remain incomplete.

Verification limits (stated as the artifact requires):

- Shell execution was denied in this reviewer session, and the invitation forbids Git. So I could not recompute the raw-blob SHA-1 or SHA-256 for the three referenced objects, and I could not confirm that revision `65f008a1…` contains these exact blobs. My checks used the working-tree copies only.
- I could not verify Ed25519 signatures, hosted run/job/attempt identity, producer-tree freeze, the 117-file closure count, or the claim that `91fa4acd…` only advances Markdown/JSON over `edc0585a…`. I also did not re-run the cited test or lint results. The artifact already assigns these checks to the separate class review before ledger adoption, so they do not block registration acceptance.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. Wave 13 adds a sentence that wave 12 lacks: "Source 91fa4acd… advances only ordinary authority/review Markdown and JSON from edc0585a…". The class review could record the exact diff command or output that supports it, so the claim does not rest on prose alone.

## Decision

accepted
