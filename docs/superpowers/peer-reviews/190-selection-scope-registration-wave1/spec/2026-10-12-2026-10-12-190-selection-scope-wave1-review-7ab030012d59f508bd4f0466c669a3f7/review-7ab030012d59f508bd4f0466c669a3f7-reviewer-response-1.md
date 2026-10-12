<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-7ab030012d59f508bd4f0466c669a3f7"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-selection-scope-wave1.md"
artifact_commit: "8d1f8ee35df5714bbea11e06bf671e4018b4c2fb"
artifact_blob: "812ecd0c983caa593340b7c145d682ccf3157fca"
artifact_digest: "sha256:e5328fc79fb4f119822719d0de70a943175ef2516a5410b09f02f4d6c3a73643"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:e38d2b20734d8cfd976665a9c74c332106d3b338b9d9404c255f0eaacef27aed"
  identity_source: "runtime"
started_at: "2026-10-12T05:13:04.377Z"
submitted_at: "2026-10-12T05:15:56.646Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the subject `evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-selection-scope-wave1.md` (artifact commit 8d1f8ee, blob 812ecd0c). I also read the working-tree copies of the declared index (`registration-index.json`) and all five referenced registration records. To check the reader rules, I read the approval reader `test/live/process-source/authority.mjs` (`reference`, `readApprovedIndex`) and the record validators in `test/live/process-source/records.mjs` (`validateProcessSourceRegistration`, `validateScope`, `verifyProcessSourceIndexCore`, `processSourceRecordDigest`). For comparison I read the previous subject `190-current-wave7.md`. I also skimmed the new `src/config/selection-read-scope.mjs` to confirm it exists.

What I checked and found consistent:

- **Table against records.** For each of the five captures, the platform, build, architecture, Node major and kind in the subject table match the registration record exactly. The two Linux Node 26 records share hostId `88b178f6…` and the two Linux Node 24 records share hostId `0c074655…`, which fits one hosted worker per Node major. Every record has its own distinct publicKey/keyId, so no signing identity is shared across captures or hosts.
- **Package pinning.** All five records pin sourceCommit `07835545b0cd518a9e48667ed6fc4b9d13bdb6bc`, contractDigest `sha256:340ece55…` (matching the subject), and inventoryDigest `sha256:dae2c976…`. The Linux tarball is `21331c1d…` and the Windows tarball is `785b254e…`. The subject states and explains this per-platform difference.
- **Validator shape.** Creation records carry exactly the four transitions `clock-forward`, `clock-backward`, `timezone` and `dst`. Absence records carry an empty transitions array. The Linux probes are `/proc` / `full-pid-namespace` / `exact-pid-directory-v1` / `procfs-v1`. The Windows probe is the fixed stock PowerShell path / `local-cim-query` / `completed-cim-query-v1` with a hash version. All of this matches `validateScope`. The Windows path is the validator's own constant system path, not a user path or SID, so it does not conflict with the subject's exclusion of raw paths.
- **Index ordering and paths.** The index captureIds are strictly ascending (`32a3… < 75eb… < 7bd5… < 7fd3… < 8069…`), and each path is `registrations/<captureId>.json`, as `verifyProcessSourceIndexCore` requires. The JSON block lists captures in the same order as the index, as `readApprovedIndex` requires (`ref.path !== index.captures[i].path`).
- **Different digests are expected.** The index `digest` values (for example `f802303b…` for `source-32a3…`) differ from the subject's per-capture `sha256` values (for example `6ce5ed11…`). This is expected: the index uses `processSourceRecordDigest` (canonical JSON), while the review reference uses the raw blob SHA-256. It is not an inconsistency.
- **Revision chain and history.** The index/capture revision `c2b1bf8` is the parent of the subject commit `8d1f8ee`, so the `ancestor(a.revision, p.subject.revision)` requirement can hold. All registration files from earlier waves are still present in the working tree, which supports "without … deleting earlier public registrations".
- **Scope of authority.** The authority claims are bounded and match prior waves. Registration permits signed capture only. It does not grant class acceptance, adoption, supported Windows operation or release. Windows is absence-only. Clock manipulation is limited to the disposable hosted Linux creation procedure, with restoration on failure. Missing Windows 26 and macOS workers are excluded, not inferred. The subject states the open C1 Windows feasibility failure and the remaining #190/#107 gates instead of masking them.

Verification limits: I was told not to use Git, and shell hashing was unavailable in this session. So I did not recompute the git blob OIDs or the raw SHA-256 values of the six referenced objects at `c2b1bf8`, and I did not replay the 894-input producer freeze. The reader re-checks blob and SHA-256 at use time (`reference()` fails closed with `registration-review-reference-mismatch`), so a wrong reference cannot be silently accepted. Even so, my acceptance of the reference values rests on that mechanical check, not on my own recomputation.

## Findings

1. **Medium (authority-record legibility).** Throughout the prose, the space between numbers and the words around them is missing. Several of the resulting tokens are ambiguous in a document that becomes an immutable accepted authority reference. Examples: "run38205882840, attempt1", "Executing source is07835545…", "contains29mechanically", "all20existing classes", "lists894tracked inputs", "against0783554after", "plus/minus90-second", "January/July12:00 UTC", "Actual16-read C1", "unchanged30-second budget", "requires16actualmatching admissions,16unscoped versus1scoped genuine acquisitions,32fresh snapshots", "Original40a3candidate", and "Final3OS". Some of these cannot be read reliably. For example, "Original40a3candidate" may mean "original 40a3 candidate" with 40a3 as an identifier prefix, or a count. The previous subject (`190-current-wave7.md`) is spaced normally ("run 38106108578, attempt 1"), so this looks like a generation or formatting regression, not intent. The machine-checked JSON block is unaffected, but the human-readable bounds of what this registration authorizes are exactly the numeric claims that are garbled.

## Required changes

1. Restore normal spacing around every numeral and short commit or identifier token in the prose paragraphs (lines 3, 13, 15, 17, 19 and 21 of the subject). Make sure identifiers stay recognizable. For example, write "original 40a3 candidate" if 40a3 is an identifier prefix, and "against 0783554 after". Do not change the table or the JSON reference block. The registration and index references at `c2b1bf8` should stay byte-identical.

## Optional suggestions

1. One sentence in line 19 could resolve an apparent tension. It says "The stock Windows worker is still unadmitted", yet the subject asks to register a Windows 24 absence capture. Stating that "unadmitted" refers to operational/C1 admission, not to capture registration, would prevent a later reader from treating these as contradictory.
2. A short note that index `digest` values are canonical-record digests, while the JSON block `sha256` values are raw-blob digests, would save future reviewers from re-deriving why they differ.

## Decision

revisions-requested
