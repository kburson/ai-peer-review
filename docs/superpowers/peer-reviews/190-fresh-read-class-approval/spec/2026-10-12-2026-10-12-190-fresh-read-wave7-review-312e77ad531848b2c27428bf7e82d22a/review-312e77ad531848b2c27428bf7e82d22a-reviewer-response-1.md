<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-312e77ad531848b2c27428bf7e82d22a"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/class-reviews/2026-10-12-190-fresh-read-wave7.md"
artifact_commit: "81a24de3f2739a32ec11dcc1f8612b4c36b9ec37"
artifact_blob: "63439bf2d1c6ccdc4c7b2b8e5b5c0efa9dc4c4fc"
artifact_digest: "sha256:d52cb85ad6539b023e72d3c407cf13f9515ecabb539a445049bf96defe6d750d"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:bc933ae0d5b236bbc403c2c3d921cc0065c2d3711edf5b6d9b1cc4242c19eb23"
  identity_source: "runtime"
started_at: "2026-10-12T17:31:16.718Z"
submitted_at: "2026-10-12T17:33:31.317Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I reviewed the wave-7 finite class approval request. It asks for exactly two absence-only classes under contract `sha256:a3c54de6…8f22`: macOS 25.6.0/arm64/Node 26 (`source-9e13379a…`) and Windows 10.0.26100/x64/Node 26 (`source-f72360e8…`). They come from two signed receipts in hosted run 38278337597, attempt 1, at executing source `89a2d7d`. These are the two Node 26 workers that the accepted wave-7 registration review (`review-4cb86a3b…`) covered.

The public records are mutually consistent and match the prose and the class reader's checks as far as file reads can establish. The scope is not widened: each class has one platform, one build, one architecture and one Node major, binds exactly one receipt, and has no creation or transition coverage. It also does not overlap the wave-6 fresh-read classes, which cover only Node 24 for darwin and win32. I found nothing synthetic, widened, inconsistent or self-approving, so I accept, subject to the verification limits stated below.

What I checked using only file reads (Read/Grep/Glob):

1. **Proposals match receipts and registrations.** For each class, the proposal's platform, build, architecture, `nodeMajors`, probe tuple (path, visibility, errorContract, version), `contractDigest`, `sourceCommit`, `tarballDigest` and `inventoryDigest` equal the corresponding receipt and the wave-7 registration record:
   - darwin: `/bin/ps` / `same-user-full-selection` / `exact-ps-selection-v1` / `62c342e1…`, tarball `06f2a3d8…6b35`.
   - win32: PowerShell CIM / `local-cim-query` / `completed-cim-query-v1` / `54b68d39…`, tarball `a06c5e57…332f`.

   Both use the common inventory `05994552…3aa3`. Each receipt's `hostId` and `keyId` equal its registration's values. `semantics` (`darwin-ps-selection-v1`, `windows-cim-completed-v1`) and `precision: not-applicable` match the accepted wave-6 fresh-read classes for the same platforms.
2. **Registration binding is consistent.** Both receipts and both proposals carry `registrationRevision` `b074e1c` and `registrationIndexDigest` `c65732bb…`. These match `registrationApproval.revision`/`indexDigest` in the artifact and the index reference pinned by the wave-7 registration review subject. Each receipt's `registrationDigest` (`dcf8bbca…`, `5191393a…`) equals that capture's digest in `registration-index.json`.
3. **Coverage is complete and finite.** `registration-index.json` lists exactly these two captures. The artifact pins exactly two receipts and two host controls, and the proposals consume one evidence digest each. This satisfies the reader's `used.size === captures.size === index.captures.length` and `hostControls.length === captures.size` checks structurally. Receipt and host-control paths follow the required `…/<captureId>/receipt.json` and `…/host-control.json` shape.
4. **Receipts are absence-only and clean.** Both have `kind: absence`, the `installed-source` producer with the stated contract and inventory, exit code 0 with no signal, absence `absent` for the same PID, `cleanup.childExited: true`, `restoration: not-required`, empty `transitions`, and null boot identities. The creation bounds reflect platform granularity: 100 ns on Windows and a 1 s window on macOS. They are used only to identify the live child and support no creation capability.
5. **Host controls match CI provenance, mirroring `verifyCiCaptureControlsCore`.** Both controls have `runId` 38278337597, `runAttempt` "1", `codeCommit` `89a2d7d` (equal to provenance `sourceCommit` and each receipt's `package.sourceCommit`), matching `captureId` and `kind`, and `clockChanges: none` / `restoration: not-required`.

   The provenance projection has `verified: false`, repository `kburson/ai-peer-review`, workflow `.github/workflows/process-source-capture.yml`, event `workflow_dispatch`, and `completed`/`success`. It lists six distinct, successful jobs. Exactly one is macOS Node 26 (`114909201198`) and exactly one is Windows Node 26 (`114909201275`), which satisfies the single-worker-match rule. The provenance file is the same one pinned by the accepted wave-6 class request (same blob and sha256 references).
6. **Producer-commit chain is plausible.** Both controls name `captureProducerCommit` `aecb0d7` ("Publish approval for remaining Node26 capture workers"). In the session's commit listing it comes after the registration finalization `3339b9b` and before the pinned receipt/control revision `ebbc20f`, which is an ancestor of the subject commit. This differs from wave 6's `a4cf59e`, which fits a separate, later approval publication for the two queued workers.
7. **Post-capture changes are outside the run window.** The CI concurrency block (`group: ci-…`, `cancel-in-progress: true`) exists only in `.github/workflows/ci.yml`. The capture workflow named in the provenance is `process-source-capture.yml`. `.prettierignore` excludes exactly the six wave-6 registration JSON files (`0f9002ed`, `496ca510`, `576323d2`, `bcdbc785`, `c39a8d6d`, `c9490e17`) and neither wave-7 record, which matches the claim that the wave-7 records were formatted before approval. Both changes are described as landing at `ebbc20f`, after `aecb0d7`. They therefore cannot fall inside the `89a2d7d → aecb0d7` freeze range that the reader inspects.
8. **No overlap or self-admission.** The current `classes/review-index.json` does not yet contain the wave-6 or wave-7 fresh-read approvals, so adoption is still separate. The new classes differ from all wave-6 fresh-read classes on Node major for darwin and win32, and from the 26 historical classes on contract digest. The reader's `class-review-set-overlap` rule would therefore not trigger. The prior registration reviewer confirmed that no file under `src/` contains the new contract digest.
9. **Non-claims are properly bounded.** The artifact preserves all of the following:
   - It makes no claim about Windows C1 performance, the resident Windows observation worker forecast, installed recovery or production activation.
   - The Windows Node 26 C1 refusal at `2b2970a` is retained.
   - The 30/15/5/800 s budgets are unchanged, and no cache or waiver is introduced.
   - The Linux manual-review exclusion is kept.
   - Installed journeys, exact-head hosted receipts, whole-child review and #190 delivery are stated as incomplete.

   The Linux clock paragraph is conditioned on "only when declared above", and no Linux class is declared.

Verification limits (stated as required):

- Shell execution was denied in this session, and per instructions I did not use Git. As a result:
  - I did not recompute any raw SHA-256 or Git blob hash for the pinned proposals, receipts, host controls, CI provenance, registration subject, manifest or final response.
  - I did not compute the finalization digest.
  - I did not confirm that working-tree bytes equal the pinned revisions (`ebbc20f`, `b074e1c`, `cb2e657`, `3339b9b`).
- I did not recompute the following:
  - the canonical `processSourceRecordDigest` evidence digests (`a37398be…`, `02678322…`), or check that each one maps to the intended receipt;
  - the class IDs;
  - the `proposeProcessSourceClassCore` recomputation;
  - the registration digests;
  - the contract digest over the 29-file closure.
- I did not verify the Ed25519 receipt signatures against the registered public keys.
- I did not check ancestry, and I did not run `inspectProcessSourceProducerFreeze` over `89a2d7d → aecb0d7`. The "unchanged complete producer-input partition" claim is therefore unverified by me.
- I did not authenticate GitHub run 38278337597, its jobs or its attempt. The provenance file is self-declared `verified: false` data, and I checked it only for internal consistency.
- I did not verify that the CI YAML job definitions equal those of the prior workflow.

These mechanical checks remain the class reader's responsibility at ledger adoption.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. Future single-platform-family waves could replace the conditional Linux clock paragraph with an explicit "This wave declares no Linux creation class" sentence, as the wave-7 registration review did. This would remove any reader doubt about whether clock coverage applies.

## Decision

accepted
