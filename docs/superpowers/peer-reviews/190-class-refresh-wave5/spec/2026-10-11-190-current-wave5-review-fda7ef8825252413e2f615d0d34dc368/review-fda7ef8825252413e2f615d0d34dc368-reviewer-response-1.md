<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-fda7ef8825252413e2f615d0d34dc368"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/class-reviews/190-current-wave5.md"
artifact_commit: "6f0eabf87c0fb9ebee546cf8154ce8b0d77778cb"
artifact_blob: "94f4e0925a60ef2e4e2fe31937638e43d0c5cfde"
artifact_digest: "sha256:a2696c8331cfb97a14e1fcf2814b994c39fbf94894675e7e2882128a05bba614"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:3862993889f11895ee8dcfab91684e0be2e9aca60e9d00c0af8a5b1d8e5a0fef"
  identity_source: "runtime"
started_at: "2026-10-11T01:34:42.795Z"
submitted_at: "2026-10-11T01:36:35.185Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

This is an independent review of the 190-current-wave5 finite class subject. It covers two Node 26 absence-only proposals: win32 10.0.26100 x64 `source-0fe6b0ffa6058ac126ac15fbd7f30eb8` and darwin 25.6.0 arm64 `source-5a7996032934554b09b5d2104208d3b2`. Each proposal is backed by one signed receipt and one host control from capture run 38099441145 attempt 1, source Q `11c83fa0c1b01448719bbbb336d41296fd17ec91`, contract `sha256:505bc7fe…`. Registration authority comes from the accepted review `review-b3bc9f9920912492ddbd5c939a069104` (index revision `663b7ff6…`, index digest `sha256:6cbb6d92…`).

I checked the following by reading the working-tree files and the reader/validator code in `test/live/process-source/{authority,classes,records,producer-freeze}.mjs`:

- **Proposal ↔ receipt ↔ registration binding.**
  - The darwin proposal's `packageProvenance` (tarball `7a5417fb…`) equals receipt `source-374f07b7…` and registration `source-374f07b7…`. The win32 proposal (tarball `55d4c05b…`) equals receipt and registration `source-f8bd19ba…`.
  - Inventory `e3c4c6c1…` and contract `505bc7fe…` are the same across both proposals, both receipts, both registrations and the receipts' `controls.producer`.
  - Each receipt's `registrationDigest` equals the matching `registration-index.json` entry digest (`d0ab99e8…`, `77fd4e59…`).
  - Each receipt's `registrationRevision`/`registrationIndexDigest` equals the declared `registrationApproval` (`663b7ff6…`/`6cbb6d92…`) and both proposals' fields.
  - Receipt `signature.keyId` values equal the registrations' `keyId`s.
  - The class-to-capture mapping is consistent with `proposeProcessSourceClassCore`. Class IDs are canonical-digest derivations of the proposal content, so they differ from capture IDs as expected. I could not recompute them (see limits).
- **Finite scope.**
  - Each proposal has exactly one build, one architecture and Node major 26. That matches its single receipt, so the `proposal-untested-scope` cross-product rule is satisfied.
  - The semantics/precision pairs (`windows-cim-completed-v1`/`not-applicable`, `darwin-ps-selection-v1`/`not-applicable`) match the fixed absence table in `classes.mjs`.
  - Probe path, visibility, errorContract and version equal the registrations exactly, and equal the probe values that the registration reviewer cross-checked against Node 24 siblings.
  - The table in the subject matches the proposals.
- **No overlap with other current-contract classes.** `readReviewedProcessSourceClassSet` refuses overlapping capability/platform/probe/build/arch/node. Wave 4 holds darwin/win32 absence at Node 24 and wave 3 holds Linux at Node 26, so the wave 5 darwin/win32 Node 26 classes do not overlap either one.
- **Receipt controls.**
  - Both receipts are `kind: absence` with `transitions: []` and `boot.before/after: null`.
  - The live PID, exit (code 0, no signal) and absence PID agree within each receipt.
  - The error control is `unknown/probe-query-error`, which is the expected fail-closed control.
  - Cleanup shows `childExited: true`, `restoration: not-required`.
  - The darwin creation window is a 1-second bound and the win32 window is a 100 ns bound. Both fall at 2026-10-11T01:18:45–55Z, consistent with the capture run timing.
- **Host controls vs `verifyCiCaptureControlsCore`.**
  - Both controls carry exactly the required keys, `verified: false`, run `38099441145`/attempt `1`, `codeCommit` = Q, the matching `captureId`, and `kind: absence`.
  - `control` is `{verified:false, clockChanges:"none", restoration:"not-required"}`, the only shape accepted for absence.
  - Both name the same `captureProducerCommit` `780478fd47b1e33372c20bdec1ce1a33055b5c9f`.
- **CI provenance vs validator.**
  - Repository, workflow path, `workflow_dispatch` event, completed/success status and source = Q are all present.
  - There are six unique successful jobs. Exactly one macOS/Node 26 job (`114352133078`) and exactly one Windows/Node 26 job (`114352133145`) exist, so the `ci-control-worker-mismatch` single-job rule holds for both receipts.
- **Separation and scope claims.**
  - The subject declares no Linux, creation or clock-change class, and says Linux restoration in other bundles grants no coverage here. This also resolves the registration reviewer's optional note about carried-over Linux clock prose.
  - The covered-change paragraph matches `src/broker/storage-protection.mjs`:
    - `inspect()` calls `macAclBatch` over the full chain plus leaf in a single `/bin/ls -ldne` call.
    - `inspectWindowsReadPair` issues one `windowsProbe([...chain, root, target])` per call.
    - The Windows script uses `AccessControlSections 'Access,Owner,Group'`, `GetAccessControl` and `File.GetAttributes`.
  - The named driver `test/live/process-source-conformance.mjs` exists.
  - The subject contains no private keys, credentials or provider handles. Receipts carry only public key IDs and signatures.

**Verification limits.**
- This session could not run shell commands, and Git use was prohibited. So I did not:
  - recompute any Git blob ID or raw sha256 for the referenced revisions;
  - recompute canonical record digests, class IDs or `evidenceDigests`;
  - verify the Ed25519 signatures;
  - run `readReviewedProcessSourceClasses`.
- I also did not inspect the Q → `780478fd…` producer-freeze diff myself; `inspectProcessSourceProducerFreeze` enforces it in the reader.
- I did not see the original authenticated GitHub API responses (they are kept in ignored scratch).
- I compared working-tree content against the declared values. Those byte-level bindings rest on the immutable reader, which fails closed on any mismatch.

Within what I could inspect, I found no synthetic, widened, self-approved, inconsistent or unsupported evidence.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. The covered-change sentence says "fresh stock macOS observations query exact complete ancestor/leaf paths in one fixed ls invocation". That is accurate for the observation path (`inspect` → `macAclBatch`). However, the per-path `macAcl` helper is still used by `inspectAncestors(..., deferWindowsAcl=false)` during provisioning (`prepareParent`, `provisionProtectedRoot`). Scoping the sentence to "protected-root observations" would keep a reader from expecting batching everywhere. Coverage is bound by the contract digest either way.
2. Typo: "run38099198335" should read "run 38099198335".
3. You could state the `captureProducerCommit` (`780478fd…`) in the prose next to Q. The reader then knows which freeze range the class reader replays without opening the host controls.

## Decision

accepted
