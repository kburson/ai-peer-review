<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-1d46e84069a533817a7d5123ff1e38a7"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-scope-recapture-wave3.md"
artifact_commit: "601090daf35b53b7b7611546ae9f03bd5b0d4d5b"
artifact_blob: "229eb255dc7dd0e993f087ae38660a4ddb843531"
artifact_digest: "sha256:3b0dbeb7a3597fd90704122f4d8247219016bcf0f10b20fc7b04392af770a173"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:8123ddb4d4b670c5795c6518c0a61763ff50e9e23ec70ceb5c3263f990a2559f"
  identity_source: "runtime"
started_at: "2026-10-12T08:41:32.049Z"
submitted_at: "2026-10-12T08:44:08.948Z"
finding_ids: ["R1-F001","R1-F002","R1-F003","R1-F004"]
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

The proposed single Windows Node 24 absence registration is conservative and matches the table, the index and the workflow. I found no widening of capability: `kinds` is `["absence"]`, `transitions` is empty, and the probe tuple is identical to the earlier accepted Windows Node 24 record.

Two defects block acceptance because accepted text becomes pinned immutable authority for the capture step:

- The record's package tarball and inventory digests differ from every earlier accepted Windows record, and the artifact never says so. Earlier waves stated package byte-identity explicitly.
- Several identifiers are fused to the preceding word ("source2a6adf5", "capture38211666754", "and38211337118", "reviews0"). One of these ("running/reviews0") is ambiguous as written.

What I checked against the working tree at the reviewed artifact commit (read-only file inspection):

- `registration-index.json` lists exactly one capture, `source-69a9352ab6feaa4429330696565157e0`, at the path named in the artifact JSON, and no others. This satisfies the `index.captures.length === declared.captures.length` rule in `test/live/process-source/authority.mjs:134`.
- The registration's `scope` matches its table row: `win32`, `10.0.26100`, `x64`, Node `24`, `kinds: ["absence"]`, `transitions: []`.
- `package.sourceCommit` is `2a6adf5b057084ada54ca0708e0a0f02482ce85a`, matching the stated executing source. `contractDigest` is `sha256:340ece55…dedb25`, matching the stated current production contract and all earlier 9fe6817 records.
- The probe is stock `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`, `local-cim-query`, `completed-cim-query-v1`, version `sha256:54b68d39…`. This is byte-identical to the earlier accepted Windows Node 24 record `source-498739cb…`.
- `hostId` `sha256:06b7f215…` and `keyId` `sha256:c99473d8…` each occur once across `evidence/`. Both are distinct from the earlier Windows Node 24 host `sha256:d1c0d600…` and key `sha256:9e20ed1b…`.
- The record contains no private key, binding, raw host UUID, SID, user path, credential or provider handle. The only path is the stock system PowerShell path.
- Earlier registrations are still present: the six wave-1 records at 9fe6817 and the two unreviewed wave-2 records `source-184fd40e…` and `source-c9b4d0b5…`.
- No `docs/superpowers/peer-reviews/190-scope-recapture-registration-wave2/` directory exists. This is consistent with "approval timed out before any reviewer launch for that wave".
- `.github/workflows/process-source-capture.yml`:
  - It declares `workflow_dispatch`, which is consistent with "event workflow_dispatch".
  - `max-parallel: 4` over a six-entry matrix is consistent with only some workers having published at authoring time.
  - Only the `prepare` step loads `--import ./test/helpers/windows-stock-timing.mjs`. The capture step does not load it, which is consistent with "runs only during preparation, never capture".
  - The diagnostic log goes to ignored `.scratch/peer-review/`, and it is uploaded only in `source-controls-*`.
- `test/live/process-source/authority.mjs:63-66,132-147` mechanically re-verifies, at capture time, each reference's Git blob OID and SHA-256, the index/registration correspondence, the canonical index core, and revision ancestry (index revision ≤ subject ≤ finalization ≤ HEAD). The hashes I could not compute are therefore still enforced downstream before any capture.

Verification limits:

- Bash was denied in this session beyond the two prescribed peer-review commands, and Git use was prohibited. I could not compute SHA-256 or Git blob hashes. I did **not** verify the `blob` or `sha256` values in the artifact JSON, the index's canonical-record digest `sha256:b6eccd18…`, or that revision `6f736f9` contains these exact bytes. These are accepted only on the strength of the mechanical check above.
- I did not access GitHub run 38224061596, or earlier runs 38211666754, 38205882840 and 38211337118. I could not verify:
  - job, attempt or event metadata, or which other workers are queued, preparing, failed or complete;
  - the published producer-freeze list or its stated count of 899;
  - signatures, host-hash derivations or any private evidence.
- I did not verify the "authenticated running/reviews0" startup reproduction, the #202/#207 trunk delivery, or the C1 feasibility results.
- All of these are accepted only as stated by the author. The later ordinary finite class review must verify them mechanically, as the artifact itself requires.

## Findings

### R1-F001 — The package tarball and inventory changed from every earlier accepted Windows record, and the artifact does not disclose it

Location: paragraph 2 (the "current 29-file production closure" paragraph), paragraph 3 (#202/#207 integration) and paragraph 6 (the "Index digests hash canonical records" paragraph).

The new record's package fields are:

- `tarballDigest` `sha256:5d96830e…59c9a9`
- `inventoryDigest` `sha256:4cf3ce90…d4a0f2`
- `contractDigest` `sha256:340ece55…dedb25`

The earlier accepted Windows Node 24 record at 9fe6817 (`source-498739cb…`) has:

- `tarballDigest` `sha256:785b254e…d2fc62`
- `inventoryDigest` `sha256:dae2c976…6a51a5`
- the same `contractDigest`

So the contract is unchanged, but the packaged archive's member inventory changed. `inventoryDigest` is `archiveInventory(bytes)` of the packed tarball (`test/live/process-source/package.mjs:327`). An inventory change therefore means the set or bytes of packaged files changed between 9fe6817 and 2a6adf5. The most likely cause is the #202/#207 integration that paragraph 3 describes.

Both earlier recapture waves stated this comparison explicitly. Wave 1 said "Tarball, inventory and contract digest fields are byte-identical to accepted source 0783554 registrations…". Wave 2 said "inventory/contract agree". This wave is silent. Paragraph 2 also repeats the wave-1/2 closure language verbatim. A reader could infer the same package-equality story holds, but it does not.

This matters for the later class review. That review must decide whether this capture can be combined with, or compared against, the six accepted 9fe6817 controls. That decision depends on knowing the installed package differs while the 29-file contract is unchanged. As written, the fact is discoverable only by diffing records. The artifact's own instruction asks reviewers to reject inconsistent or unproved material. Silently omitting a changed package identity, when prior authority stated identity, falls under that instruction.

### R1-F002 — Identifiers are fused to adjacent words, and "running/reviews0" is ambiguous

The following tokens lack a separating space:

- paragraph 3: "at source2a6adf5"
- paragraph 3: "authenticated running/reviews0"
- paragraph 4: "Earlier capture38211666754"
- paragraph 4: "Capture38205882840"
- paragraph 4: "and38211337118"
- paragraph 7: "at source2a6adf5"

Also, paragraph 1 says "covers 1 actual published workers".

Most of these are cosmetic. "running/reviews0" is not: it could mean a status `running` with `reviews: 0`, or a literal `reviews0` field. Because accepted prose is pinned authority and the artifact asks reviewers to reject inconsistent material, the startup-reproduction claim should be stated unambiguously. Earlier waves consistently wrote "run 38205882840" and "at 9fe6817".

## Required changes

1. (R1-F001) Add an explicit package-identity statement. For example: "This record's tarball `sha256:5d96830e…` and inventory `sha256:4cf3ce90…` differ from the accepted 9fe6817 Windows Node 24 record (`785b254e…`, `dae2c976…`). The contract digest `sha256:340ece55…` is unchanged. The packaged-file change comes from <state the actual cause, e.g. the #202/#207 integration at 2a6adf5>, outside the 29-file production contract closure. Earlier 9fe6817 controls are a different package and are not combined with this capture." If the cause has not been established, say so rather than asserting one.
2. (R1-F002) Insert the missing spaces ("source 2a6adf5", "capture 38211666754", "Capture 38205882840", "and 38211337118"). Rewrite "authenticated running/reviews0" in unambiguous form, for example "authenticated `running` status with zero active reviews". Correct "1 actual published workers" to "1 actual published worker".

## Optional suggestions

### R1-F003 — Name the unreviewed wave-2 registrations explicitly

Paragraph 4 says "registration proposals and accepted proofs remain preserved". The wave-2 proposal (`2026-10-12-190-scope-recapture-wave2.md`) and its two records remain in the tree and in history: Windows Node 26 `source-184fd40e…` and macOS Node 26 `source-c9b4d0b5…`. They were never reviewed or accepted. Consider naming them and stating that they hold no approval and grant no coverage, so that a later reader cannot treat a preserved "proposal" as accepted authority.

### R1-F004 — State the producer-freeze delta

The count rose from 898 at 9fe6817 to 899 at 2a6adf5. Consider stating that delta and naming the added tracked input, as wave 2 did ("898 … (894 at 0783554)"). This would make the frozen-tree claim checkable by number and tie it to the package change in R1-F001.

## Decision

revisions-requested
