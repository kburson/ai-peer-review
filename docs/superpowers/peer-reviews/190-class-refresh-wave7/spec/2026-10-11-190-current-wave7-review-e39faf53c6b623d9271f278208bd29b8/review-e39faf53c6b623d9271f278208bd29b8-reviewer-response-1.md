<!-- ai-peer-review-template version="1" digest="sha256:78e9a634af9d540baaf6790db82952eaf39cf7ab59a6cdc7938319ae07a4cbed" -->

<!-- protected-frontmatter -->

---
schema: "ai-peer-review.response/v1"
review_id: "review-e39faf53c6b623d9271f278208bd29b8"
role: "reviewer"
turn: 1
commit_mode: "normal"
authority_assurance: "unavailable"
artifact_path: "evidence/portable-runtime/process-source/class-reviews/190-current-wave7.md"
artifact_commit: "f32e63389c1dae7e42c9ec98f400573c7605040b"
artifact_blob: "77b3e3c6ff6a69900d29d67a8609b15b9f674bfb"
artifact_digest: "sha256:6958aa89746e18b3f7fe97159bb06cba954b4d1e65dda672c1596dd1efe99e4b"
agent:
  host: "claude-code"
  provider: "anthropic"
  model_id: "claude-opus-5-5"
  model_display: "claude-opus-5-5"
  session_fingerprint: "sha256:da639e372c742b5bf73accb80ef89f47b3e608f548efaa63c2661a82d14b1f7b"
  identity_source: "runtime"
started_at: "2026-10-11T03:30:19.356Z"
submitted_at: "2026-10-11T03:33:47.567Z"
finding_ids: []
answered_finding_ids: []
acknowledged_supplement_ids: []
---

Mode: `normal`

## Summary

I independently reviewed `evidence/portable-runtime/process-source/class-reviews/190-current-wave7.md`, a finite class review. It proposes 2 absence-only classes for contract `sha256:424f35d0…`:

- `source-0a24e71f…`: win32 / 10.0.26100 / x64 / Node 26;
- `source-28b79f6d…`: darwin / 25.6.0 / arm64 / Node 26.

They rest on 2 signed receipts, 2 host controls, the shared CI provenance projection for run 38106108578 attempt 1, and the accepted registration review `review-18fa95001c762770bd15f1d1e0312776`. I read every referenced public file from the working tree. I did not read any other class-review response for this wave. I also read:

- the registration subject `registration-reviews/190-current-wave7.md`, both registrations, its review manifest, and its final reviewer response;
- the class-review reader `readReviewedProcessSourceClassReview` in `test/live/process-source/authority.mjs` (L180–389);
- the CI control/provenance validator `verifyCiCaptureControlsCore` in `test/live/process-source/records.mjs` (L415–515);
- `assertProducers` and the `captureProducerCommit` emission in `test/helpers/process-source-ci-capture.mjs`, and `max-parallel: 4` in `.github/workflows/process-source-capture.yml`;
- the preserved authenticated GitHub API responses `.scratch/190-delivery/capture-38106108578-successful-run.json` and `…-successful-jobs.json`;
- the covered source files `src/broker/storage-protection.mjs` and `src/startup/runtime-inventory.mjs`, for the specific claims below;
- the accepted wave6 class-review subject, for comparison.

What I verified:

- **The table matches the proposals, receipts and registrations.** The two proposals in `190-current-wave7-proposals.json` match the subject table on classId, capability, platform, build, architecture and Node major. Each proposal lists exactly one evidence digest, so 2 evidence digests cover 2 receipts. Receipt `source-4658749c…` is win32/Node 26 and receipt `source-d1a6dd1e…` is darwin/Node 26. Each receipt's captureId, hostId, keyId, package (sourceCommit Q `7d4223f…`, contract `424f35d0…`, inventory `262ecbb6…`, tarball) and full scope including the probe tuple equal its registration file exactly. Both are `kind: absence`, have empty `transitions`, `boot: null/null`, and `cleanup: {childExited: true, restoration: "not-required"}`.
- **The registration approval is consistent.** Both receipts and both proposals pin `registrationRevision` `2a31da12…` and `registrationIndexDigest` `sha256:c738948c…`. These match `registrationApproval.revision` and `indexDigest` in the subject and the index pinned by the registration subject. The registration index holds exactly these two captures, so the reader's `captures.size === registration.index.captures.length` coverage check can pass, and it would fail if either receipt were missing.
- **The registration review was a genuine cross-provider ordinary review.** The manifest records a codex/openai author (`gpt-6.1-sol`) and a claude-code/anthropic reviewer, classification XPR, `status: accepted`, and decision `accepted` on turn 1. The reviewer-response digest in the manifest turn (`f97770ca…`) equals `finalResponse.sha256` in the subject. The subject artifact commit/blob/digest (`a049cd9…`, `26224eeb…`, `7998c086…`) equal the manifest's `artifact_history` entry. That review authorized capture only. This subject is a separate ordinary class review, and the reader requires its own completed normal review (`checkNormalRuntimeReview`, `collateralComplete`).
- **The probe scope is not widened.** For each proposal, the probe path, visibility, errorContract and version equal the receipt and registration scope. win32 uses the PowerShell `local-cim-query` / `completed-cim-query-v1` tuple, and darwin uses the `/bin/ps` `same-user-full-selection` / `exact-ps-selection-v1` tuple. Semantics are `windows-cim-completed-v1` and `darwin-ps-selection-v1`, and precision is `not-applicable`. No creation, clock or precision claim is made for either platform.
- **The two classes do not overlap other current-contract classes.** The wave6 class review proposes darwin and win32 absence on the same builds and probes, but only for Node 24. These proposals are Node 26 only, so their `nodeMajors` are disjoint. No file under `src/` references `424f35d0…`, so no existing ledger class (524b, bf401a6e or 505bc7fe families) can admit these bytes.
- **Host controls are consistent.** Both controls pin run `38106108578`, attempt `1`, codeCommit Q, their own captureId and `kind: absence`, and `control: {verified: false, clockChanges: "none", restoration: "not-required"}`. That is exactly the absence shape `verifyCiCaptureControlsCore` requires. Both keep `verified: false`, so they stay unverified data. Both name captureProducerCommit `e3da13dc…` ("Publish normal approval for final current-source registrations"). In the recent history this follows the registration finalization `783d15b` and precedes the receipts/proposals revision `ec97b50` and the subject commits. That is the order the reader requires: `codeCommit ⊑ captureProducerCommit ⊑ subject.revision`. The wave6 controls use a different captureProducerCommit (`9211d10a…`), which fits a separate approval publication for this wave.
- **The CI provenance is genuine, and these captures belong to the Node 26 jobs.** The projection (same blob as wave6, `7cf2e25b…`) agrees with the preserved authenticated API responses: run 38106108578, attempt 1, `workflow_dispatch`, completed/success, head_sha Q, head_branch `codex/190-installed-journeys`, path `.github/workflows/process-source-capture.yml`, repository `ai-peer-review`, and all six job IDs with OS, Node major and success. I also checked the timing myself:
  - The win32 receipt's live-child creation bound is 1791688299.519782 s, which is 2026-10-11T03:11:39.52Z. The darwin bound is 03:11:40–03:11:41Z.
  - Windows/Node 26 job `114371881599` ran its "Await immutable ordinary approval, capture real controls" step from 03:04:41 to 03:11:50Z. macOS/Node 26 job `114371881544` ran the same step from 03:03:35 to 03:11:41Z. Both captures fall inside those windows.
  - The Windows/Node 24 and macOS/Node 24 jobs had already completed by 03:02:24Z, so they could not have produced these captures.
  - The wave7 registration reviewer submitted at 03:11:07Z and the author claimed at 03:11:29Z. So both captures happened after the registration approval, not before it.
  - The reader's `ci-control-worker-mismatch` check requires exactly one OS+Node-major job per receipt. win32/Node 26 and darwin/Node 26 each match exactly one job. The other four jobs belong to the accepted wave6 subject and grant no coverage here.
- **The producer freeze is enforced twice.** On the hosted worker, `assertProducers` re-checks the frozen producer state before approval and before capture. The worker records `captureProducerCommit` as `git rev-parse HEAD` at capture time. For each host control, the reader then replays `inspectProcessSourceProducerFreeze(before=codeCommit, after=captureProducerCommit)` and fails closed with `class-review-transitive-producer-changed`. It also recomputes every proposal from its selected receipts (`proposeProcessSourceClassCore`), requires every receipt to be used exactly once, and checks each class structurally against its own scope (`verifyProcessSourceClass`).
- **The covered-change claims match the source.** In `storage-protection.mjs`, the Windows ACL observation script loads the strongly named `System.Web.Extensions, Version=4.0.0.0, … PublicKeyToken=31bf3856ad364e35` and uses `JavaScriptSerializer` for input (L212–214). The only remaining `ConvertFrom-Json` (L349) is in the separate owner-replacement script, not the ACL observation path, which fits the subject's narrower "ACL observation input/output" wording. In `runtime-inventory.mjs`, membership uses a `Set` built from declared entries inside each verification call (L75, L158, L223). It is not a cached module-level observation. The covered-change paragraph is word-for-word the same as in the accepted wave6 class subject.
- **The claims are bounded and contain no secrets.** The subject makes no production-activation, native-free, provider, reboot or descendant claim. It says the 505b Windows reads and the JSON-serializer comparison are diagnostics only, that Linux manual review is excluded by user direction, and that all installed/journey/whole-child/hosted-suite/AITM gates remain open. The public files contain only SPKI public keys, key ids, host-id hashes, nonces and digests.

Verification limits: this session could run only the two prescribed peer-review commands and could not use git. A hashing command was refused. So I did not recompute:

- the git blob ids or raw sha256 values in the subject's JSON block;
- the `processSourceRecordDigest` evidence digests in the proposals;
- the Ed25519 receipt signatures or keyId derivation;
- the commit ancestry (`783d15b`, `e3da13d`, `ec97b50`, `f32e633`), beyond reading the recent-commit order;
- the producer-freeze diff from Q to `e3da13dc…`.

I read `src/` from the working tree, not at Q, and I did not open the raw CI artifact zip. Those properties rest on the mechanical reader described above, which I inspected and found to enforce each of them. It must still pass when the class set is read. I found no textual, structural, cross-file or timing inconsistency that contradicts any pinned value.

## Findings

None.

## Required changes

None.

## Optional suggestions

1. **Say plainly that this wave has no Linux class.** Paragraph 6 ("Linux creation, if declared in the table…") is carried over from wave6, but this table declares no Linux class. The paragraph's last sentence already limits Darwin and Windows to absence. Adding "This wave declares no Linux class; the Linux clauses apply to nothing here" would stop a reader from inferring any clock or privilege coverage from this approval.
2. **Name the excluded jobs in the shared provenance.** The projection lists six successful jobs, and this subject covers two. One sentence would let a reader see the split without cross-referencing: the four Node 24 and Linux Node 26 jobs belong to the separate wave6 class review and grant no coverage here. This is the mirror of wave6 independent-review suggestion 2.
3. **Bind controls to job IDs (reader hardening, later work).** `verifyCiCaptureControlsCore` ties a receipt to the provenance only by runner OS plus Node major. The host control does not record the producing job ID. Here, two class reviews share one provenance file, and the receipt timestamps do place each capture in the correct job's capture window, so the evidence is sound. Recording the producing `jobId` in each host control and checking it against `provenance.jobs` would make that binding mechanical rather than inferential.

## Decision

accepted
