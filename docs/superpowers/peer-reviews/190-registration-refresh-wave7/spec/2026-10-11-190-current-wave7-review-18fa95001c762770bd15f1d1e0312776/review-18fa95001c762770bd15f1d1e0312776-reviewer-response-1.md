<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-18fa95001c762770bd15f1d1e0312776"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/registration-reviews/190-current-wave7.md"
artifact_commit: "a049cd90faf2e4db186521a878fbc1d68eeb23bd"
artifact_blob: "26224eebd9582be6a5f78ee01358d0a3cb5f4022"
artifact_digest: "sha256:7998c0860dd17d6a793319a2be2cc87c007bc4bdc65e3d8cf76aec5718d14c1f"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:2eae9c72d1cf8d3a09d6ef140efeedf26fd75b6c7500bfc3a85c3c883f84a1e8"
  identity_source: "runtime"
started_at: "2026-10-11T03:09:32.559Z"
submitted_at: "2026-10-11T03:11:07.285Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed `190-current-wave7.md`. It is a capture-only registration review covering 2 absence registrations from 2 hosted workers: win32 Node 26 (`source-4658749c…`) and darwin Node 26 (`source-d1a6dd1e…`). Both come from run 38106108578, attempt 1, source `7d4223f`. The registration index the subject pins is at revision `2a31da1`.

I read both registrations and the index from the working tree. I checked them against:

- the registration validator in `test/live/process-source/records.mjs` (`validateProcessSourceRegistration`, `validateScope`, `verifyProcessSourceIndexCore`);
- the approved-index reader and class-review consumer in `test/live/process-source/authority.mjs` and `class-review.mjs`;
- the current ledger `src/protocol/process-source-contracts.json`;
- the wave6 subject and its accepted reviewer response (`review-63524a58…`), which used the same run and source.

What I verified:

- **The table matches the files.** Both registrations agree with the subject table on captureId, platform, build (`10.0.26100` / `25.6.0`), architecture (`x64` / `arm64`), `nodeMajor` 26, and capability. Each has `kinds: ["absence"]` and empty `transitions`, as the validator requires for absence-only records. Each has exactly the nine top-level keys the validator expects.
- **The worker count is right.** The two registrations have different hostIds (`e90193cb…`, `9512c31f…`), so they come from two workers, matching "2 genuine GitHub hosted workers". Neither hostId, publicKey, nor keyId appears in any other file under `evidence/`, so no host or key is reused from wave6 or earlier waves.
- **Package pins match wave6.** Both pin `sourceCommit` `7d4223faf123716406c78b4fa9d0ffa553f4c73c`, contract `sha256:424f35d0…`, and inventory `sha256:262ecbb6…`. The win32 tarball `030619…` equals the wave6 win32/Node 24 tarball, and the darwin tarball `ebfb15c0…` equals the wave6 darwin/Node 24 tarball. Each platform therefore built the same package under both Node majors. The Windows tarball differing from the others while the inventory is shared follows the precedent noted in the wave6 review.
- **The probe scope is fixed, not widened.** On each platform, the probe path, visibility, and errorContract equal the fixed triples in `validateScope`. The win32 probe version `sha256:54b68d39…` and the darwin probe version `sha256:62c342e1…` equal the versions already in the ledger for `10.0.26100`/x64/Node 26 and `25.6.0`/arm64/Node 26. Build, architecture, and Node major all fall inside scopes the project has used before. Nothing is widened.
- **The index covers exactly the subject.** `registration-index.json` lists exactly these two captureIds, in ascending order, with the paths `verifyProcessSourceIndexCore` requires. The JSON block lists the captures in the same order, which `readApprovedIndex` enforces by position. The index `digest` values are canonical-record digests (`processSourceRecordDigest`), not raw-file sha256, so they are not expected to equal the subject's `sha256` fields. The wave7 registration files are pretty-printed with multi-line `kinds`, while wave6 files used compact arrays. That difference does not matter, because the index digest is computed over canonical bytes and the subject pins the raw blobs separately.
- **Replacing the index is consistent with the consumer.** The index at `2a31da1` holds only the two wave7 captures. `readReviewedProcessSourceClasses` requires `captures.size === registration.index.captures.length`, so each wave needs its own index revision and approval. Wave6 approval stays pinned to `d8ee605` and is unaffected. In `readReviewedProcessSourceClassSet`, the future win32/darwin Node 26 classes cannot overlap the wave6 Node 24 classes on the same platform and probe, because their `nodeMajors` are disjoint.
- **Contracts stay separate.** `424f35d0…` appears nowhere in the ledger, so no existing 524b, bf401a6e, or 505bc7fe class can admit these bytes. This matches the subject's claim.
- **The wave6 coverage gap is closed.** The wave6 review noted that darwin and win32 lacked Node 26 coverage under `424f35d0…`. This wave registers exactly those two scopes, and the commit "Import six signed controls and pin final Node 26 registrations" fits that purpose.
- **The covered-change text and controls are unchanged.** The covered-change paragraph and the clock-control authorization are word-for-word the same as in the accepted wave6 subject. Both registrations here are absence-only, and the subject says Windows and macOS permit absence only. The Linux clock authorization therefore applies to no registration in this wave, and nothing in this wave relies on it.
- **There are no secrets.** The registrations contain only public SPKI keys, key ids, host-id hashes, and digests.

Limits on what I could verify: this reviewer session was not permitted to run any command beyond the two prescribed peer-review commands; a hashing command was refused. I therefore did not recompute the git blob ids or raw sha256 values in the JSON block, the canonical index digests, or the keyId derivation from each public key. `readApprovedIndex` (`reference()` plus `verifyProcessSourceIndexCore`, which re-derives the keyId and checks Ed25519 SPKI) does enforce all of these before any capture uses this approval, so a mismatch fails closed. I also had no access to the hosted run, worker logs, or producer freeze lists. The claims about worker provenance and frozen producers therefore depend on the mechanical import checks and the final class review the subject describes. I found no textual or structural inconsistency that contradicts the pinned values.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. This repeats wave6 suggestion 1, which was not adopted. The first paragraph still says only that the "Historical 524b and bf401a6e classes" cannot admit the changed bytes. The ledger classes that matter most for these exact scopes (win32/Node 26 and darwin/Node 26) are on the 505bc7fe family. Paragraph 2 does name all three families, but adding `505bc7fe` to the first-paragraph sentence would keep the summary from understating the exclusion.
2. Paragraphs 3 and 5 repeat the Linux preflight requirement and the Linux clock-control authorization from wave6, but this wave contains no Linux registration. A sentence saying these clauses apply to no registration in this wave would stop a reader from inferring that this approval authorizes any clock or privilege procedure.

## Decision

accepted
