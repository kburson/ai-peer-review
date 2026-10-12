<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-1be47cb29d2a18bd42f9ce797d13e2f3"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-selection-scope-wave2.md"
artifact_commit: "fdf6dfd7e647fe73a061c5d2d1a8d3e7d6f30883"
artifact_blob: "f1279b9f2c27538e1b5b6d072cf47a3d3b8d8069"
artifact_digest: "sha256:44c4797e8c7c764dced8dca94e23d9800ae6099650dfeaa852d44b1cf1720e3b"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:13ea9d1330ae1a36ff9c1d4739b5b21856cff839c721cbb21e2bd5f76a652fe4"
  identity_source: "runtime"
started_at: "2026-10-12T05:37:34.877Z"
submitted_at: "2026-10-12T05:40:02.430Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the subject `evidence/portable-runtime/process-source/registration-reviews/2026-10-12-190-selection-scope-wave2.md` (artifact commit fdf6dfd, blob f1279b9f). I also read:

- the working-tree copies of the declared one-member index (`registration-index.json`) and the registration `registrations/source-2ee00e1c52f7a510fa0acde71e41d314.json`;
- the record validators in `test/live/process-source/records.mjs` (`validateScope`, `validateProcessSourceRegistration`, `verifyProcessSourceIndexCore`, `canonicalProcessSourceBytes`);
- the approval reader `test/live/process-source/authority.mjs` (`reference`, `ancestor`, `readApprovedIndex`) and the class-review consumer `test/live/process-source/class-review.mjs` (`evidence`);
- the accepted wave-1 subject `2026-10-12-190-selection-scope-wave1.md`, its two reviewer responses, and the wave-1 approved-ref `approved-refs/source-32a383ae93be438850d29b005c867191.json`;
- the plan ledger `.superpowers/sdd/2026-10-11-190-selection-read-scope/progress.md` (lines 47–57), for corroboration of the run, C1 and freeze claims.

What I checked and found consistent:

- **Table against record.** The table row (darwin / 25.6.0 / arm64 / Node 24 / absence) matches the record's `scope` and `kinds` exactly. `transitions` is `[]`, as `validateProcessSourceRegistration` requires for an absence-only record.
- **Probe constants.** The probe is `/bin/ps` / `same-user-full-selection` / `exact-ps-selection-v1` with a `sha256:` version. These are exactly the darwin constants in `validateScope` (records.mjs:90). The probe hash `62c342e1…` is the same value carried by every earlier hosted darwin 25.6.0 arm64 registration, such as `source-74e94707…`. That fits an unchanged stock `/bin/ps`, and the subject correctly calls it a finite stock-binary hash.
- **Package pinning.** sourceCommit `07835545…`, contractDigest `sha256:340ece55…` and inventoryDigest `sha256:dae2c976…` all match the subject's prose and the wave-1 records. The tarball digest `21331c1d…` equals the Linux tarball in wave 1 (for example `source-7bd5…`). Only Windows (`785b254e…`) differs. See optional suggestion 1.
- **Distinct identity.** I searched every file under `evidence/portable-runtime/process-source`. The hostId `2683c3ab…`, publicKey `…3dcBVEwX…` and keyId `170fd916…` each appear only in this record. No host or signing identity is shared with any earlier capture.
- **Index shape.** The index has one entry. Its captureId matches the record, and its path is `registrations/<captureId>.json` as `verifyProcessSourceIndexCore` requires. The JSON block lists one capture at the same path, which satisfies the count and order checks in `readApprovedIndex`.
- **Different digests are expected.** The index `digest` (`231eaef4…`) differs from the JSON `sha256` (`2b7670ff…`). This is expected: the subject correctly says the index uses canonical-record digests (`processSourceRecordDigest`), while the review reference uses raw blob bytes (`reference()`).
- **Revision chain.** The index/capture revision `eb3f510` is the parent of the subject commit `fdf6dfd`, according to the session's recent-commit context. So `ancestor(a.revision, p.subject.revision)` can hold.
- **Replacing the current index does not orphan history.** All five wave-1 registrations (`32a3…`, `75eb…`, `7bd5…`, `7fd3…`, `8069…`) are still present in the working tree, and each has an approved-ref. Those approved-refs pin index revision `c2b1bf8` and its index digest `bc00b0e2…`. `readApprovedIndex` reads the index and records from the pinned revision, not the working tree, so replacing the working-tree index leaves the wave-1 approval verifiable. `class-review.mjs` groups captures by kind, platform, probe and contract, so a darwin-only approval can still feed its own later class review.
- **C1 and run claims.** The ledger (progress.md:47) records C1 run 38205749683 with Linux and macOS Node 24/26 PASS and Windows Node 24/26 FAIL at the original 30-second budget (30014 ms and 30012 ms). That supports the subject's "passed Linux/macOS Node 24/26 but failed Windows Node 24/26". It also explains why wave 1, which mentions only macOS Node 24 C1 success, was written before that run completed. Lines 56–57 record capture run 38205882840, the macOS Node 24 publication, the 894-input freeze check, and Windows Node 26 / macOS Node 26 still queued. All of this matches the subject.
- **Authority scope.** The subject keeps the authority bounded. It permits absence only and authorizes no clock or privilege change. It grants no class acceptance or scope adoption. The Windows resident worker stays unadmitted, and the remaining #190/#107 gates are listed as incomplete. Capture cannot approve itself.

Verification limits: I was told not to use Git, and shell hashing was denied in this session. So I did not recompute the git blob OIDs or the raw SHA-256 values of the two referenced objects at `eb3f510`. I also did not recompute the canonical digest `231eaef4…`, did not confirm ancestry with `merge-base`, and did not replay the 894-input producer freeze. `reference()` and `ancestor()` re-check these at use time and fail closed, so a wrong reference cannot be silently accepted. The macOS preflight claim ("no clock change, restoration not-required") is supported only by the subject and the ledger. No public receipt or host-control exists yet for `source-2ee00e1c…`, which is expected before capture approval. The later class review (`validateAbsenceControls`, which requires `restoration === 'not-required'` for absence) is where that claim gets enforced.

## Findings

1. **Low–Medium (misstated preserved history).** Line 3 says: "the previously approved Linux/Windows Node 24 registrations remain immutable separately referenced history." Wave 1 (review-7ab030012…, accepted) approved five registrations: Linux Node 26 creation and absence (`32a3…`, `75eb…`), Linux Node 24 absence and creation (`7bd5…`, `7fd3…`), and Windows Node 24 absence (`8069…`). The natural reading of "Linux/Windows Node 24" is "Linux Node 24 and Windows Node 24", which leaves out the two Linux Node 26 registrations. One of those is the Linux Node 26 creation registration, which is the one that carries clock/timezone authority. This subject becomes an immutable accepted authority reference, and the sentence defines which earlier approvals stay in force alongside it. Leaving out Linux Node 26 is therefore a factual inconsistency with the accepted wave-1 record. The machine-checked JSON block and the reader are unaffected; the error is in the human-readable statement of preserved scope.

## Required changes

1. In line 3, replace "the previously approved Linux/Windows Node 24 registrations" with wording that lists exactly what wave 1 approved. For example: "the five previously approved wave-1 registrations (Linux Node 24/26 creation and absence, Windows Node 24 absence; approved index revision c2b1bf8) remain immutable separately referenced history." Do not change the table or the JSON reference block. The index and registration references at `eb3f510` should stay byte-identical.

## Optional suggestions

1. Line 9 says the record binds an "exact per-platform tarball". The macOS tarball digest `21331c1d…` is identical to the Linux tarball, and only Windows differs (wave 1, line 15). A short note such as "(identical to the Linux tarball; only Windows differs)" would stop a later reader from expecting a distinct macOS digest and treating the match as a copy error.

## Decision

revisions-requested
