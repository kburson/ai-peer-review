<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-651008200478d4a33e77264e8655d4de"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/class-reviews/170-local-absence-class.md"
artifact_commit: "f6ebcbf88bbdddfa1e6c3f621c415013027eeffa"
artifact_blob: "2468d12f525ca672672883fa419fc4b8df1f4628"
artifact_digest: "sha256:7ee4b82bacbd3ca1b3748b34a7bf0db675a058155baa0209390ef20b31f967ea"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:5b2642567cabaa2d1d76ee29b61565d7e0d71d7a30efa8a4a88711e60913fbee"
  identity_source: "runtime"
started_at: "2026-10-08T05:32:06.603Z"
submitted_at: "2026-10-08T05:34:55.192Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I independently reviewed the class-admission subject `evidence/portable-runtime/process-source/class-reviews/170-local-absence-class.md` (blob `2468d12f…`, commit `f6ebcbf`). I read the working-tree copies of the referenced proposal bundle, signed receipt, registration record, registration index and registration-review subject, plus the admission implementation: `test/live/process-source/{records,classes,authority,class-review}.mjs`, `src/protocol/process-source-assurance.mjs`, `src/protocol/process-identity.mjs`, the current empty `src/protocol/process-source-contracts.json` ledger, and the runtime consumers in `src/broker/portable-ownership*.mjs` and `ownership-election.mjs`. I also checked Task 2 of `docs/superpowers/plans/2026-10-03-107-agent-first-portable-runtime.md` (lines 215–220 and 265).

What I verified by reading:

- **Proposal matches the receipt and registration field by field.** It has one absence proposal. Its platform is `darwin`, builds `["25.6.0"]`, architectures `["arm64"]` and nodeMajors `[26]`. Those are the receipt's single observed tuple and the registration's scope. The probe object (`/bin/ps`, `same-user-full-selection`, `exact-ps-selection-v1`, version `sha256:3489ed38…`) is identical in all three records. `contractDigest` `sha256:9a9c7b78…` matches the receipt package, the producer controls and the registration package. Semantics and precision (`darwin-ps-selection-v1` / `not-applicable`) match the fixed semantics table in both `classes.mjs` and `validClass`. `registrationRevision` `6eaa572e…` and `registrationIndexDigest` `sha256:a0b2d497…` match the receipt, the class-review `registrationApproval`, and the index reference in the registration-review subject. The single `packageProvenance` entry equals the receipt/registration package byte for byte (commit Q `992bf7f7…`, tarball `0babd2ec…`, inventory `5dcaa029…`).
- **The proposal is not widened.** `proposeProcessSourceClassCore` builds builds/architectures/nodeMajors only as sets of observed receipt values. It refuses any cross-product tuple not actually observed (`proposal-untested-scope`), refuses mixed kind/platform/probe/contract, and derives semantics and precision from a fixed table. It cannot express a range or a wildcard. With one receipt, the scope is exactly that one tuple.
- **Receipt controls fit the absence contract.** The live child's pid, nonce and creation interval are present. The interval is `utc-nanoseconds`, 1 s wide (lower 1791437015 s ≈ 2026-10-08T05:23:35Z, consistent with today's session). The child exited with code 0 and no signal under the same pid. Absence is `absent` for that pid. The error control is `unknown/probe-query-error`. Cleanup is `childExited: true, restoration: not-required`. Transitions are empty and boot is null/null, as `validateAbsenceControls` requires for Darwin absence. The registration's `kinds` is `["absence"]` and its `transitions` is `[]`, so no creation or clock authority is implied. The signature `keyId` equals the registration `keyId`, and the receipt `registrationDigest` equals the index entry digest `sha256:b42fa694…`.
- **The probe version covers both binaries.** `observeProcessSourceContext` hashes `/bin/ps` concatenated with `/usr/sbin/ioreg` on Darwin. The class's `probe.version` therefore pins both stock binaries, as the subject claims. A change to either binary makes the class inapplicable, which fails closed.
- **The admission reader is independent and exact (`readReviewedProcessSourceClasses`).** It requires a normal-mode collateral-complete review of a `class-reviews/*.md` subject via `checkNormalRuntimeReview`, with finalization an ancestor of HEAD. It re-reads every subject, proposal and receipt reference from Git and checks blob OID and raw sha256. It requires the proposal and receipt revisions to be ancestors of the subject revision. It re-runs the full registration-approval reader on the embedded `registrationApproval`, so the original registration review is replayed rather than trusted. It re-verifies each receipt's Ed25519 signature and all controls against the approved registration. It refuses duplicate captures, a receipt path that doesn't match its `captureId`, and duplicate `classId`s. It requires every indexed capture to be consumed exactly once (`class-review-evidence-coverage-invalid`). It recomputes each proposal from its selected receipts and requires digest equality. It then derives the ledger class with `acceptance.evidenceDigest`/`reviewDigest` and `approvalDigest`, and checks it structurally with the production `verifyProcessSourceClass` at the receipt's own tuple. I confirmed that `canonicalProcessSourceBytes` and `encodeRequestCanonical` produce identical bytes for this record (sorted keys, JSON-string scalars, positive safe integers only). The derived `approvalDigest` will therefore satisfy `validClass` and is not an accidental fail-closed.
- **Admission is not over-claimed at this stage.** `verifyProposedSourceClass` returns `classAdmitted: false` without an accepted class ref. With one, it requires matching registration approval, matching proposal bundle, and an exactly-once digest-equal entry in the installed ledger. `operationalAuthority` stays `unavailable`. The shipped ledger is currently `classes: []`, so the runtime currently grants nothing.
- **What a shipped class permits at runtime.** `verifyProcessSourceClass` matches by capability, exact `contractDigest`, platform, build, architecture and Node major list membership, and exact probe path/version/visibility/errorContract. An absence-only class makes `absence` available and leaves `creation` `creation-stamp-unavailable`. In that state `assessOriginalProcess` can only yield `absent` for a probe-observed absent PID. It cannot yield `different-process` (that needs a creation class and sealed `creationSource`), so PID reuse is not discharged. `reconcileOriginalProcess` reports `dead` with `scope: 'original-process-only'`. The legacy `observeProcessIdentity` path without `original` still returns `creation-stamp-unavailable`. The legacy election calls that pass `clock` are refused by its key allowlist and remain unknown. Descendant/provider discharge, creation stamps and other platforms stay unavailable. This matches the subject's finite claim. Absence discharge of an original process is the capability under review, not an unrelated one.

Verification limitations (stated independently):

- **No hashing, Git or crypto in this session.** Shell access was denied, so I could not run Git, hash anything, verify the signature, or run tests. I did not compute the sha256 of any referenced file. I did not resolve any `revision:path` to its blob OID. I did not cryptographically verify the Ed25519 signature. I did not recompute `classId` or the receipt's evidence digest `sha256:fb44e06a…`. I did not hash the local `/bin/ps` and `/usr/sbin/ioreg`. I did not re-run `verify-class` or the 34-test Node 24 set. Those facts rest on the author's report plus the fail-closed mechanical reader described above. That reader recomputes every one of them from Git at admission time and refuses on any mismatch, so this acceptance cannot launder a wrong digest, blob or signature into the ledger.
- **Working-tree reads are not Git reads.** I read evidence files from the working tree at `f6ebcbf`, not from the pinned revisions `6444da8`/`6eaa572`. The reader's Git-pinned checks are the authority for immutability.
- **No independent capture.** I did not observe the capture itself (live child, owned exit, real `ps` absence and overflow error). The receipt and signature are the evidence, and real-capture authenticity rests on the protected key and on the registration review that bound it.
- **Positive admission path is untested so far.** It cannot run until this review is finalized. Current unit coverage of `readReviewedProcessSourceClasses` exercises only ref-shape and subject-path refusals.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. **Make installed-ledger validation detect unreviewed extra classes.** `verifyProposedSourceClass` sets `classAdmitted` when every accepted class appears exactly once in the installed ledger. It does not report ledger entries that no reviewed class ref accounts for. The runtime loader trusts any self-consistent `validClass` record in the shipped ledger. So the "actual installed probe/ledger validation" gate would still report admitted if an unreviewed class (for example a creation class) were also committed. Consider accepting a set of approved class refs and reporting (or refusing) any installed ledger class not derived from one of them. This would make "permits no unrelated runtime capability" mechanically checked at the shipping step, not just a review convention.
2. **Add unit coverage for the reader's refusal and derivation branches.** Use synthetic Git fixtures to cover `class-review-evidence-coverage-invalid`, `class-review-duplicate-capture`, `class-review-proposal-mismatch` and `class-review-finite-scope-invalid`. Also cover a positive derivation whose `approvalDigest` round-trips through `validClass`, so the post-acceptance path is exercised before it is first used for real.
3. **Re-check the absence-only broker reclaim path in the shipping change.** That change should state, and ideally test, that portable broker owner reclaim (`acquirePortableOwner`/`observeAuthenticatedOwner` → `assessOwnerEvidenceCore` `dead`) stays outside production entry points until #141/#107 activation is separately reviewed. Once this class is in the ledger, an absent original PID on this exact tuple yields `dead (original-process-only)`, and those flows would act on it.

## Decision

accepted
